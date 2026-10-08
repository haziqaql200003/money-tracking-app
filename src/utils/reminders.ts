import { t, tp, type TKey } from '@/i18n';
import type { RecurringRule, Transaction } from '@/context/TransactionsContext';
import { addDays, upcomingOccurrences } from '@/utils/bills';
import { budgetStatus } from '@/utils/budget';
import { instalmentAmount, nextCreditDue, unpaid, type Debt } from '@/utils/debts';
import { activeGoals, goalMonthSaved, type GoalEntry, type SavingsGoal } from '@/utils/goals';
import { addDays as addDateDays, cycleOf, cycleRange, usesCalendarMonths } from '@/utils/cycle';

export type ReminderPrefs = {
  enabled: boolean;
  /** How many days before a bill is due to remind (0 = on the day). */
  daysBefore: number;
  /** Notify when a category reaches its warning level or goes over budget. */
  budgetAlerts: boolean;
};

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { enabled: false, daysBefore: 1, budgetAlerts: true };
/** Show `t(labelKey)`: the language can change while the app is open. */
export const DAYS_BEFORE_OPTIONS: readonly { value: number; labelKey: TKey }[] = [
  { value: 0, labelKey: 'plan.remind.day0' },
  { value: 1, labelKey: 'plan.remind.day1' },
  { value: 3, labelKey: 'plan.remind.day3' },
  { value: 7, labelKey: 'plan.remind.day7' },
];

export type PlannedReminder = { id: string; fireAt: Date; title: string; body: string };

/** iOS keeps at most 64 pending local notifications, so stay comfortably under it. */
export const MAX_SCHEDULED = 50;
const HORIZON_DAYS = 45;
const REMINDER_HOUR = 9;

function at9(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, REMINDER_HOUR, 0, 0, 0);
}

/**
 * The local notifications to schedule.
 *  - bills going out: `daysBefore` days ahead, 9:00 local time
 *  - income you confirm each time (e.g. salary): on the day, so you remember to enter the real amount
 * Fixed-amount income is recorded automatically, so it needs no reminder. Anything whose time has passed is skipped.
 */
export function buildReminders(args: {
  rules: RecurringRule[];
  now: Date;
  todayKey: string;
  daysBefore: number;
  money: (n: number) => string;
  /** Instalments, loans and credit lines (see Debts). */
  debts?: Debt[];
  /** Amount used on each credit line, by debt id. */
  creditUsed?: Record<string, number>;
  /** Savings goals with a monthly plan, and everything saved so far. */
  goals?: SavingsGoal[];
  goalEntries?: GoalEntry[];
}): PlannedReminder[] {
  const { rules, now, todayKey, daysBefore, money, debts = [], creditUsed = {}, goals = [], goalEntries = [] } = args;
  const out: PlannedReminder[] = [];

  for (const o of upcomingOccurrences(rules, todayKey, HORIZON_DAYS + daysBefore)) {
    const isBill = o.type === 'debit';
    if (!isBill && !o.varies) continue;

    const fireAt = at9(addDays(o.date, isBill ? -daysBefore : 0));
    if (fireAt.getTime() <= now.getTime()) continue;

    const amountText = o.varies
      ? o.amount > 0
        ? t('plan.reminder.about', { amount: money(o.amount) })
        : t('plan.reminder.amountVaries')
      : money(o.amount);
    const leadDays = isBill ? daysBefore : 0;
    const dueTitle =
      leadDays === 0
        ? t('plan.reminder.billDueToday', { title: o.title })
        : leadDays === 1
          ? t('plan.reminder.billDueTomorrow', { title: o.title })
          : tp('plan.reminder.billDueInDays', leadDays, { title: o.title });

    out.push({
      id: `rem_${o.ruleId}_${o.date}`,
      fireAt,
      title: isBill ? dueTitle : t('plan.reminder.incomeTitle', { title: o.title }),
      body: isBill
        ? o.varies
          ? t('plan.reminder.billBodyVaries', { amount: amountText })
          : t('plan.reminder.billBodyFixed', { amount: amountText })
        : t('plan.reminder.incomeBody'),
    });
  }

  const horizon = addDays(todayKey, HORIZON_DAYS + daysBefore);
  for (const d of debts) {
    if (d.status === 'done') continue;
    const dues: { key: string; date: string; title: string; body: string; today: boolean }[] = [];
    if (d.kind === 'credit') {
      const used = creditUsed[d.id] ?? 0;
      if (d.dueDay && used > 0) {
        const date = nextCreditDue(d.dueDay, todayKey);
        dues.push({ key: date, date, title: t('debt.reminder.creditTitle', { name: d.name }), body: t('debt.reminder.creditBody', { used: money(used), date }), today: false });
      }
    } else {
      // Only the next few unpaid instalments: reminders for the far future are replanned as they get close.
      for (const s of unpaid(d).slice(0, 3)) {
        if (s.dueDate > horizon) continue;
        dues.push({
          key: String(s.n),
          date: s.dueDate,
          title: t(daysBefore === 0 ? 'debt.reminder.titleToday' : 'debt.reminder.title', { name: d.name }),
          body: t('debt.reminder.body', { amount: money(instalmentAmount(s)), name: d.name }),
          today: daysBefore === 0,
        });
      }
    }
    for (const due of dues) {
      const fireAt = at9(addDays(due.date, -daysBefore));
      if (fireAt.getTime() <= now.getTime()) continue;
      out.push({ id: `rem_debt_${d.id}_${due.key}`, fireAt, title: due.title, body: due.body });
    }
  }

  // A nudge on the 25th when this month's saving for a goal is still short. Goals that save automatically are left alone.
  const monthKey = cycleOf(todayKey);
  for (const g of activeGoals(goals, goalEntries)) {
    if (!g.monthly || g.monthly <= 0 || g.recurringId) continue;
    const short = Math.round((g.monthly - goalMonthSaved(goalEntries, g.id, monthKey)) * 100) / 100;
    if (short <= 0) continue;
    // Six days before the financial month ends (the 25th of a calendar month, as before, when payday is 1).
    const fireAt = at9(usesCalendarMonths() ? `${monthKey}-25` : addDateDays(cycleRange(monthKey).to, -6));
    if (fireAt.getTime() <= now.getTime()) continue;
    out.push({
      id: `rem_goal_${g.id}_${monthKey}`,
      fireAt,
      title: t('plan.reminder.goalTitle', { name: g.name }),
      body: t('plan.reminder.goalBody', { amount: money(short) }),
    });
  }

  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_SCHEDULED);
}

export type BudgetAlert = { key: string; level: 'warn' | 'over'; title: string; body: string };

/**
 * Categories that crossed their budget this month and have not been announced yet.
 * `sent` holds keys like "2026-10:food:warn"; a category that is over also counts as having passed "warn".
 */
export function budgetAlertsToSend(args: {
  transactions: Transaction[];
  monthKey: string;
  warnPercent: number;
  budgets: { id: string; name: string; limit: number }[];
  sent: ReadonlySet<string>;
  money: (n: number) => string;
}): BudgetAlert[] {
  const { transactions, monthKey, warnPercent, budgets, sent, money } = args;
  const spent = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'debit' || cycleOf(t.date) !== monthKey) continue;
    spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amount);
  }

  const out: BudgetAlert[] = [];
  for (const b of budgets) {
    if (b.limit <= 0) continue;
    const s = spent.get(b.id) ?? 0;
    const status = budgetStatus(s, b.limit, warnPercent);
    if (status === 'ok') continue;
    const key = `${monthKey}:${b.id}:${status}`;
    if (sent.has(key)) continue;
    out.push(
      status === 'over'
        ? {
            key,
            level: 'over',
            title: t('plan.reminder.overTitle', { name: b.name }),
            body: t('plan.reminder.overBody', { spent: money(s), limit: money(b.limit) }),
          }
        : {
            key,
            level: 'warn',
            title: t('plan.reminder.warnTitle', { name: b.name }),
            body: t('plan.reminder.warnBody', { spent: money(s), limit: money(b.limit) }),
          },
    );
  }
  return out;
}

/** Every alert key that is already true right now, so turning alerts on does not announce old news. */
export function currentAlertKeys(args: Parameters<typeof budgetAlertsToSend>[0]) {
  const all = budgetAlertsToSend({ ...args, sent: new Set() });
  const keys = new Set(all.map((a) => a.key));
  // "over" implies "warn" was passed too.
  for (const a of all) if (a.level === 'over') keys.add(a.key.replace(/:over$/, ':warn'));
  return keys;
}
