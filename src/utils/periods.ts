import type { Transaction } from '@/context/TransactionsContext';
import { addDays, cycleRange } from '@/utils/cycle';
import { monthKeysEnding, type MonthTotals } from '@/utils/insights';

/**
 * How Analyse slices a range into bars: 1 month by week, 3 to 12 months by month.
 * ('day' is kept for charts that want it; Analyse no longer offers it.)
 */
export type Grain = 'day' | 'week' | 'month';

export function grainsFor(months: number): Grain[] {
  return months <= 1 ? ['week'] : ['month'];
}

/** One bar: `key` is the month key ('YYYY-MM') for months, or the first day ('YYYY-MM-DD') for weeks and days. */
export type Period = { key: string; from: string; to: string };
export type PeriodTotals = MonthTotals & { from: string; to: string; future: boolean };

const dateOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * The bars for the last `months` financial months (the current one included, to its last day).
 * Weeks are counted from the first day of the range, 7 days each; a short tail (under 4 days) joins the week before,
 * so a 30-day month is 4 bars, not 4 and a stub.
 */
export function periodsFor(todayKey: string, months: number, grain: Grain): Period[] {
  const keys = monthKeysEnding(todayKey, months);
  return periodsForRange({ from: cycleRange(keys[0]).from, to: todayKey }, keys, grain, true);
}

/**
 * The bars for any window. `keys` are the financial months it touches (see utils/faham-period.ts).
 * A `live` window (one that runs up to today) keeps its last bar open to the end of the running month, so the chart
 * shows the month's full width; a window in the past is cut exactly at its own first and last day.
 */
export function periodsForRange(w: { from: string; to: string }, keys: string[], grain: Grain, live: boolean): Period[] {
  if (keys.length === 0) return [];
  const end = live ? cycleRange(keys[keys.length - 1]).to : w.to;
  if (grain === 'month') {
    return keys.map((k) => {
      const r = cycleRange(k);
      return { key: k, from: r.from < w.from ? w.from : r.from, to: r.to > end ? end : r.to };
    });
  }
  const from = w.from;
  const to = end;
  const out: Period[] = [];
  if (grain === 'day') {
    for (let d = from; d <= to; d = addDays(d, 1)) out.push({ key: d, from: d, to: d });
    return out;
  }
  for (let start = from; start <= to; start = addDays(start, 7)) {
    const stop = addDays(start, 6);
    out.push({ key: start, from: start, to: stop < to ? stop : to });
  }
  const last = out[out.length - 1];
  if (out.length > 1 && dateOf(last.to).getTime() - dateOf(last.from).getTime() < 3 * 86400000) {
    out.pop();
    out[out.length - 1].to = last.to;
  }
  return out;
}

/** Income and spending in each bar. Bars that start after today are marked `future` (drawn empty). */
export function periodTotals(transactions: Transaction[], periods: Period[], todayKey: string): PeriodTotals[] {
  const rows: PeriodTotals[] = periods.map((p) => ({ key: p.key, from: p.from, to: p.to, income: 0, spending: 0, net: 0, future: p.from > todayKey }));
  if (rows.length === 0) return rows;
  const first = rows[0].from;
  const last = rows[rows.length - 1].to;
  for (const t of transactions) {
    if (t.date < first || t.date > last) continue;
    // Bars are sorted and do not overlap: a binary search finds the one holding the date.
    let lo = 0;
    let hi = rows.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (rows[mid].from <= t.date) lo = mid;
      else hi = mid - 1;
    }
    const row = rows[lo];
    if (t.type === 'credit') row.income += t.amount;
    else row.spending += t.amount;
  }
  for (const r of rows) {
    r.income = Math.round(r.income * 100) / 100;
    r.spending = Math.round(r.spending * 100) / 100;
    r.net = Math.round((r.income - r.spending) * 100) / 100;
  }
  return rows;
}
