import type { PendingEntry, RecurringFrequency, RecurringRule, Transaction } from '@/context/TransactionsContext';
import { t, tp, type TKey } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { toDateKey } from '@/utils/dates';

export const FREQUENCIES: { key: RecurringFrequency; labelKey: TKey; adverbKey: TKey }[] = [
  { key: 'daily', labelKey: 'tx.freq.daily', adverbKey: 'tx.freq.everyDay' },
  { key: 'weekly', labelKey: 'tx.freq.weekly', adverbKey: 'tx.freq.everyWeek' },
  { key: 'monthly', labelKey: 'tx.freq.monthly', adverbKey: 'tx.freq.everyMonth' },
  { key: 'yearly', labelKey: 'tx.freq.yearly', adverbKey: 'tx.freq.everyYear' },
];

/** Hard stop so a very old start date can never generate an endless run in one go. */
const MAX_PER_RUN = 400;

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * The occurrence after `current`.
 * `anchor` is the original start date: it keeps "the 31st" meaning the 31st
 * after a short month (Jan 31 -> Feb 28 -> Mar 31) instead of drifting to the 28th.
 */
export function nextOccurrence(anchor: string, current: string, frequency: RecurringFrequency): string {
  const cur = parseKey(current);
  const anc = parseKey(anchor);

  if (frequency === 'daily') {
    cur.setDate(cur.getDate() + 1);
    return toDateKey(cur);
  }
  if (frequency === 'weekly') {
    cur.setDate(cur.getDate() + 7);
    return toDateKey(cur);
  }
  if (frequency === 'monthly') {
    const y = cur.getFullYear() + (cur.getMonth() === 11 ? 1 : 0);
    const m = (cur.getMonth() + 1) % 12;
    return toDateKey(new Date(y, m, Math.min(anc.getDate(), daysInMonth(y, m))));
  }
  const y = cur.getFullYear() + 1;
  const m = anc.getMonth();
  return toDateKey(new Date(y, m, Math.min(anc.getDate(), daysInMonth(y, m))));
}

/** True once a rule has an end date and its next occurrence would fall after it. */
export function isEnded(rule: RecurringRule) {
  return !!rule.endDate && rule.nextDate > rule.endDate;
}

/** Move `nextDate` forward to the first occurrence on or after `todayKey` (used when resuming a paused rule). */
export function skipToUpcoming(rule: RecurringRule, todayKey: string): RecurringRule {
  let next = rule.nextDate;
  let guard = 0;
  while (next < todayKey && guard < MAX_PER_RUN * 4) {
    next = nextOccurrence(rule.startDate, next, rule.frequency);
    guard += 1;
  }
  return next === rule.nextDate ? rule : { ...rule, nextDate: next };
}

/** True for rules whose amount is entered by the user each time (salary that changes, utility bills). */
export function isAsk(rule: Pick<RecurringRule, 'amountMode'>) {
  return rule.amountMode === 'ask';
}

export const transactionIdFor = (ruleId: string, date: string) => `rec_${ruleId}_${date}`;
export const pendingIdFor = (ruleId: string, date: string) => `pend_${ruleId}_${date}`;

/**
 * The real transaction created when the user confirms a pending entry.
 * The id comes from the SCHEDULED date (not the date the user picks), so confirming can never duplicate.
 */
export function confirmedTransaction(rule: RecurringRule, entry: PendingEntry, amount: number, date: string): Transaction {
  return {
    id: transactionIdFor(rule.id, entry.date),
    title: rule.title,
    date,
    categoryId: rule.categoryId,
    subcategory: rule.subcategory,
    amount: Math.round(amount * 100) / 100,
    type: rule.type,
    accountId: rule.accountId,
    recurringId: rule.id,
  };
}

/**
 * Turn every occurrence that is due (nextDate <= today) into either
 *  - a real transaction (fixed-amount rules), or
 *  - a PENDING entry waiting for the user to enter the real amount ('ask' rules).
 *
 * - Pure: returns the new rules plus what to add; nothing is mutated.
 * - Idempotent: ids are deterministic, so an occurrence that already exists (as a transaction OR a pending
 *   entry) is never created twice.
 * - Returns the SAME `rules` array when nothing changed, so it is safe to use inside an effect.
 */
export function materializeRecurring(
  rules: RecurringRule[],
  transactions: Transaction[],
  todayKey: string,
  pendingEntries: PendingEntry[] = [],
): { rules: RecurringRule[]; created: Transaction[]; pending: PendingEntry[] } {
  const existing = new Set(transactions.map((t) => t.id));
  const existingPending = new Set(pendingEntries.map((p) => p.id));
  const created: Transaction[] = [];
  const pending: PendingEntry[] = [];
  let changed = false;

  const nextRules = rules.map((rule) => {
    if (!rule.active) return rule;

    let next = rule.nextDate;
    let count = 0;
    while (next <= todayKey && (!rule.endDate || next <= rule.endDate) && count < MAX_PER_RUN) {
      const id = transactionIdFor(rule.id, next);
      if (isAsk(rule)) {
        // Already confirmed (a transaction exists) or already waiting => nothing to add.
        const pid = pendingIdFor(rule.id, next);
        if (!existing.has(id) && !existingPending.has(pid)) {
          existingPending.add(pid);
          pending.push({ id: pid, ruleId: rule.id, date: next });
        }
      } else if (!existing.has(id)) {
        existing.add(id);
        created.push({
          id,
          title: rule.title,
          date: next,
          categoryId: rule.categoryId,
          subcategory: rule.subcategory,
          amount: rule.amount,
          type: rule.type,
          accountId: rule.accountId,
          recurringId: rule.id,
        });
      }
      next = nextOccurrence(rule.startDate, next, rule.frequency);
      count += 1;
    }

    if (next === rule.nextDate) return rule;
    changed = true;
    return { ...rule, nextDate: next };
  });

  return { rules: changed ? nextRules : rules, created, pending };
}

/** Approximate monthly amount of a rule, for the "per month" summary. */
export function monthlyEquivalent(rule: Pick<RecurringRule, 'amount' | 'frequency'>) {
  switch (rule.frequency) {
    case 'daily':
      return (rule.amount * 365) / 12;
    case 'weekly':
      return (rule.amount * 52) / 12;
    case 'monthly':
      return rule.amount;
    case 'yearly':
      return rule.amount / 12;
  }
}

export function frequencyLabel(frequency: RecurringFrequency) {
  const found = FREQUENCIES.find((f) => f.key === frequency);
  return found ? t(found.labelKey) : frequency;
}

/** "Today", "Tomorrow", "in 5 days" or a short date. */
export function relativeDay(iso: string, todayKey: string) {
  const diff = Math.round((parseKey(iso).getTime() - parseKey(todayKey).getTime()) / 86400000);
  if (diff === 0) return t('common.today');
  if (diff === 1) return t('tx.bills.dueTomorrow');
  if (diff > 1 && diff <= 14) return tp('tx.bills.dueInDays', diff);
  return formatDate(parseKey(iso));
}
