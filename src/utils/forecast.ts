import type { Transfer } from '@/context/TransactionsContext';
import { cycleOf } from '@/utils/cycle';

/**
 * Forecasting helpers for the Ramalan tab of Faham. Pure: no React, no storage, no time zone.
 *
 * The method is deliberately simple so it can be explained: a smoothed recent level, nudged by the recent
 * trend (halved, because trends rarely last), with a band of one typical swing either side. With fewer than
 * three months of history the result is flagged as a rough guess.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type Band = { value: number; low: number; high: number };
export type SeriesForecast = {
  points: Band[];
  /** Typical month over the history used. */
  average: number;
  /** Change per month the history is drifting by. */
  slopePerMonth: number;
  /** Months of history that went into it (leading empty months are ignored). */
  monthsUsed: number;
  /** false with fewer than 3 months of history. */
  reliable: boolean;
};

const DAMPING = 0.5;
const ALPHA = 0.5;

function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    num += (i - meanX) * (v - meanY);
    den += (i - meanX) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

/** Forecast the next `horizon` months from monthly totals, oldest first. */
export function forecastSeries(history: number[], horizon: number): SeriesForecast {
  const firstReal = history.findIndex((v) => v > 0);
  const used = firstReal === -1 ? [] : history.slice(firstReal);
  const n = used.length;
  if (n === 0) {
    return { points: Array.from({ length: horizon }, () => ({ value: 0, low: 0, high: 0 })), average: 0, slopePerMonth: 0, monthsUsed: 0, reliable: false };
  }

  // Smoothed level, remembering how far each month was from what the smoothing expected (the "swing").
  let level = used[0];
  const misses: number[] = [];
  for (let i = 1; i < n; i++) {
    misses.push(used[i] - level);
    level = ALPHA * used[i] + (1 - ALPHA) * level;
  }
  const avg = used.reduce((s, v) => s + v, 0) / n;
  const sd =
    n >= 3
      ? Math.sqrt(misses.reduce((s, v) => s + v * v, 0) / misses.length)
      : n === 2
        ? Math.abs(used[1] - used[0]) / 2
        : level * 0.25;
  const drift = n >= 3 ? slope(used) : 0;

  const points: Band[] = [];
  for (let k = 1; k <= horizon; k++) {
    const value = Math.max(0, level + drift * DAMPING * k);
    points.push({ value: round2(value), low: round2(Math.max(0, value - sd)), high: round2(value + sd) });
  }
  return { points, average: round2(avg), slopePerMonth: round2(drift), monthsUsed: n, reliable: n >= 3 };
}

/** Sum `amount` per month key. */
export function monthlySums(items: { date: string; amount: number }[], keys: string[]): number[] {
  const map = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const it of items) {
    const k = cycleOf(it.date);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + it.amount);
  }
  return keys.map((k) => round2(map.get(k) ?? 0));
}

/**
 * Money put aside (+) or taken back out of savings (-), from transfers.
 * A transfer counts as saving when it goes into a savings account, or is tied to a goal or to a budget category.
 * Moving money between two savings accounts changes nothing.
 */
export function savingFlows(transfers: Transfer[], isSavingsAccount: (accountId: string) => boolean): { date: string; amount: number }[] {
  const out: { date: string; amount: number }[] = [];
  for (const tr of transfers) {
    const toSave = isSavingsAccount(tr.toAccountId) || !!tr.goalId || !!tr.budgetCategoryId;
    const fromSave = isSavingsAccount(tr.fromAccountId);
    if (toSave && !fromSave) out.push({ date: tr.date, amount: tr.amount });
    else if (fromSave && !toSave) out.push({ date: tr.date, amount: -tr.amount });
  }
  return out;
}

/** Share of income that was put aside, in whole percent; null without income. */
export function savingsRate(saved: number, income: number): number | null {
  if (!(income > 0)) return null;
  return Math.round((saved / income) * 100);
}

/** How many months of average spending the savings would cover; null without spending to compare. */
export function runwayMonths(savingsBalance: number, avgMonthlySpending: number): number | null {
  if (!(avgMonthlySpending > 0)) return null;
  return Math.round((Math.max(0, savingsBalance) / avgMonthlySpending) * 10) / 10;
}

export type Outlook3 = {
  expense: SeriesForecast;
  income: SeriesForecast;
  saving: SeriesForecast;
  /** Income minus spending minus saving: what is left to use. */
  left: Band[];
};

/**
 * Next months for spending, income and saving, plus what is left.
 * Spending = the recurring bills you already have + a forecast of the everyday spending.
 */
export function buildOutlook(args: {
  everydayHistory: number[];
  incomeHistory: number[];
  savingHistory: number[];
  /** Monthly total of recurring bills right now. */
  fixedMonthly: number;
  horizon: number;
}): Outlook3 {
  const { everydayHistory, incomeHistory, savingHistory, fixedMonthly, horizon } = args;
  const everyday = forecastSeries(everydayHistory, horizon);
  const fixed = Math.max(0, fixedMonthly);
  const expense: SeriesForecast = {
    ...everyday,
    average: round2(everyday.average + fixed),
    points: everyday.points.map((p) => ({ value: round2(p.value + fixed), low: round2(p.low + fixed), high: round2(p.high + fixed) })),
  };
  const income = forecastSeries(incomeHistory, horizon);
  const saving = forecastSeries(savingHistory.map((v) => Math.max(0, v)), horizon);
  const left: Band[] = Array.from({ length: horizon }, (_, i) => {
    const e = expense.points[i];
    const inc = income.points[i];
    const s = saving.points[i];
    return {
      value: round2(inc.value - e.value - s.value),
      low: round2(inc.low - e.high - s.high),
      high: round2(inc.high - e.low - s.low),
    };
  });
  return { expense, income, saving, left };
}
