import type { RecurringRule, Transaction } from '@/context/TransactionsContext';
import { addDays, dueText, upcomingOccurrences } from '@/utils/bills';
import { budgetStatus } from '@/utils/budget';

export type ReminderPrefs = {
  enabled: boolean;
  /** How many days before a bill is due to remind (0 = on the day). */
  daysBefore: number;
  /** Notify when a category reaches its warning level or goes over budget. */
  budgetAlerts: boolean;
};

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { enabled: false, daysBefore: 1, budgetAlerts: true };
export const DAYS_BEFORE_OPTIONS = [
  { value: 0, label: 'On the day' },
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '1 week' },
] as const;

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
}): PlannedReminder[] {
  const { rules, now, todayKey, daysBefore, money } = args;
  const out: PlannedReminder[] = [];

  for (const o of upcomingOccurrences(rules, todayKey, HORIZON_DAYS + daysBefore)) {
    const isBill = o.type === 'debit';
    if (!isBill && !o.varies) continue;

    const fireAt = at9(addDays(o.date, isBill ? -daysBefore : 0));
    if (fireAt.getTime() <= now.getTime()) continue;

    const amountText = o.varies ? (o.amount > 0 ? `about ${money(o.amount)}` : 'amount varies') : money(o.amount);
    const leadDays = isBill ? daysBefore : 0;
    const when = leadDays === 0 ? 'today' : dueText(leadDays).toLowerCase();

    out.push({
      id: `rem_${o.ruleId}_${o.date}`,
      fireAt,
      title: isBill ? `${o.title} is due ${when}` : `Time to record ${o.title}`,
      body: isBill
        ? o.varies
          ? `Expected ${amountText}. Enter the real amount once you have the bill.`
          : `${amountText} will be recorded on the due date.`
        : 'Open WaKira and enter the real amount you received.',
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
    if (t.type !== 'debit' || !t.date.startsWith(monthKey)) continue;
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
        ? { key, level: 'over', title: `${b.name} is over budget`, body: `You have spent ${money(s)} of ${money(b.limit)} this month.` }
        : { key, level: 'warn', title: `${b.name} is nearly used up`, body: `${money(s)} of ${money(b.limit)} spent this month.` },
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
