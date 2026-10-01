import type { RecurringRule } from '@/context/TransactionsContext';
import { isAsk, isEnded, nextOccurrence } from '@/utils/recurring';

export type UpcomingBill = {
  /** Unique per rule + date. */
  id: string;
  ruleId: string;
  title: string;
  date: string;
  /** Expected amount. 0 for "Confirm each time" rules without an estimate. */
  amount: number;
  /** The real amount is entered when the day comes. */
  varies: boolean;
  daysUntil: number;
  type: 'debit' | 'credit';
  categoryId: string;
  accountId: string;
};

const DAY = 86400000;
const MAX_STEPS = 120;

export function dayNumber(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}

export function addDays(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Every occurrence of the active recurring rules from today to `horizonDays` ahead, soonest first.
 * Occurrences that are already due are materialised by the recurring engine, so `nextDate` is normally in the
 * future; anything earlier than today is ignored here.
 */
export function upcomingOccurrences(rules: RecurringRule[], todayKey: string, horizonDays: number): UpcomingBill[] {
  const last = addDays(todayKey, horizonDays);
  const out: UpcomingBill[] = [];

  for (const rule of rules) {
    if (!rule.active || isEnded(rule)) continue;
    let date = rule.nextDate;
    let steps = 0;
    while (date <= last && steps < MAX_STEPS) {
      if (rule.endDate && date > rule.endDate) break;
      if (date >= todayKey) {
        out.push({
          id: `${rule.id}_${date}`,
          ruleId: rule.id,
          title: rule.title,
          date,
          amount: rule.amount,
          varies: isAsk(rule),
          daysUntil: dayNumber(date) - dayNumber(todayKey),
          type: rule.type,
          categoryId: rule.categoryId,
          accountId: rule.accountId,
        });
      }
      date = nextOccurrence(rule.startDate, date, rule.frequency);
      steps += 1;
    }
  }

  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.title.localeCompare(b.title)));
}

/** Only money going out: rent, subscriptions, utilities. */
export function upcomingBills(rules: RecurringRule[], todayKey: string, horizonDays: number) {
  return upcomingOccurrences(rules, todayKey, horizonDays).filter((o) => o.type === 'debit');
}

export function billsTotal(bills: UpcomingBill[]) {
  return Math.round(bills.reduce((sum, b) => sum + b.amount, 0) * 100) / 100;
}

/** "Today", "Tomorrow" or "In 5 days". */
export function dueText(daysUntil: number) {
  if (daysUntil <= 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}
