import type { Transaction } from '@/context/TransactionsContext';
import { cycleOf, cycleRange, daysBetween, shiftCycle } from '@/utils/cycle';

/**
 * Small pure helpers for Terperinci (Deep dive), 3.8.1: the tinted month table and the forecast range.
 * They read LEDGER entries (utils/ledger.ts), like everything else in Faham.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------------- tinted month table ---------------- */

/** up2 = 10% or more above the row's usual month, up1 = 5-10% above, down = 5% or more below. */
export type Tint = 'up2' | 'up1' | 'down' | null;

export const TINT_UP2 = 0.1;
export const TINT_UP1 = 0.05;
export const TINT_DOWN = -0.05;

/** How one month compares with the row's own average. Null when there is no average to compare with. */
export function trendTint(value: number, avg: number): Tint {
  if (!(avg > 0)) return null;
  const r = (value - avg) / avg;
  if (r >= TINT_UP2) return 'up2';
  if (r >= TINT_UP1) return 'up1';
  if (r <= TINT_DOWN) return 'down';
  return null;
}

/**
 * A row's usual month: the average of the months from `from` (the first month with any records, so months before
 * the pengguna started do not drag it down) up to the last COMPLETE month. Zeros inside that stretch count.
 */
export function rowAverage(values: number[], from: number, partialLast: boolean): number {
  const end = values.length - (partialLast ? 1 : 0);
  const start = Math.max(0, from);
  if (end - start <= 0) return 0;
  let s = 0;
  for (let i = start; i < end; i++) s += values[i];
  return round2(s / (end - start));
}

/* ---------------- forecast range ---------------- */

export type OutlookRange = {
  low: number;
  high: number;
  /** Past cycles that had everyday spending, so could be used. */
  cyclesUsed: number;
};

/**
 * A range for the month-end figure: what is already spent, plus bills still to come, plus the days left at the
 * quietest and at the busiest everyday daily rate of the last `cycles` complete payday months.
 * Null with fewer than two such months, or when the month has no days left. Always contains `projected`.
 */
export function outlookRange(
  transactions: Transaction[],
  todayKey: string,
  o: { spentSoFar: number; billsAhead: number; daysLeft: number; projected: number },
  cycles = 6,
): OutlookRange | null {
  if (o.daysLeft <= 0) return null;
  const now = cycleOf(todayKey);
  const keys = Array.from({ length: cycles }, (_, i) => shiftCycle(now, -(i + 1)));
  const sums = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const t of transactions) {
    if (t.type !== 'debit' || t.recurringId) continue;
    const k = cycleOf(t.date);
    const s = sums.get(k);
    if (s !== undefined) sums.set(k, s + t.amount);
  }
  const daily: number[] = [];
  for (const k of keys) {
    const total = sums.get(k) ?? 0;
    if (total <= 0) continue;
    const r = cycleRange(k);
    daily.push(total / (daysBetween(r.from, r.to) + 1));
  }
  if (daily.length < 2) return null;
  const base = o.spentSoFar + o.billsAhead;
  return {
    low: round2(Math.min(o.projected, base + Math.min(...daily) * o.daysLeft)),
    high: round2(Math.max(o.projected, base + Math.max(...daily) * o.daysLeft)),
    cyclesUsed: daily.length,
  };
}
