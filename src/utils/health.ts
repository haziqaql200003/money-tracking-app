import type { Transaction, Transfer } from '@/context/TransactionsContext';
import { cycleOf } from '@/utils/cycle';
import { isFixedExpense } from '@/utils/deep-insights';
import { savingFlows } from '@/utils/forecast';
import { clampTarget, monthRows, trimmed, type BudgetLimit, type MonthRow, type Score } from '@/utils/insight-feed';
import { monthKeysEnding } from '@/utils/insights';

/**
 * Financial health: five areas, each scored 0-100 from the user's own records, with its method, the numbers used,
 * and what is missing. NOT a credit score: it says nothing about creditworthiness and is not financial advice.
 *
 * Data window: the last 3 complete financial months that have records (up to 6 are looked at for "has records").
 * An area that cannot be measured gets `score: null` and a `missing` reason; it is left out of the overall score
 * instead of counting as zero. The overall score is the plain average of the measured areas, and is only given
 * when at least 3 of the 5 areas can be measured.
 *
 *   cashflow      0.7 × (kept share of income ÷ target) + 0.3 × (share of months not overspent)
 *   savings       0.7 × (money really moved to savings ÷ income ÷ target) + 0.3 × (share of months with saving)
 *   debt          debt payments ÷ income: 10% or less = 100, 40% or more = 0; with credit lines, also
 *                 credit used ÷ limit: 30% or less = 100, 90% or more = 0 (60/40 mix when both apply)
 *   budget        share of budgeted category-months that stayed within their limit
 *   preparedness  months of ESSENTIAL spending the savings cover: 6 months = 100
 *
 * Essential spending = commitments (see isFixedExpense) plus Housing & Utilities, Food & Drinks, Transport,
 * Health & Medical, Education and Family & Personal. That is an assumption, stated in the app.
 */

export type DimensionId = 'cashflow' | 'savings' | 'debt' | 'budget' | 'preparedness';
export const DIMENSIONS: readonly DimensionId[] = ['cashflow', 'savings', 'debt', 'budget', 'preparedness'];
export type DimStatus = 'strong' | 'fair' | 'weak';
export type MissingReason = 'months' | 'noIncome' | 'noSavingsPlace' | 'noDebts' | 'noBudgets';
export type IndicatorUnit = 'rm' | 'pct' | 'months' | 'count';
export type Indicator = { id: string; value: number; unit: IndicatorUnit; of?: number };

export type Dimension = {
  id: DimensionId;
  score: number | null;
  status: DimStatus | null;
  indicators: Indicator[];
  missing?: MissingReason;
};

export type Health = {
  dimensions: Dimension[];
  /** Average of the measured areas; null when fewer than MIN_MEASURED can be measured. */
  overall: number | null;
  measured: number;
  grade: Score['grade'] | null;
  weakest: DimensionId | null;
  /** Complete months the assessment rests on. */
  months: string[];
};

export const MIN_MEASURED = 3;
export const ESSENTIAL_CATEGORIES: ReadonlySet<string> = new Set(['bills', 'food', 'transport', 'health', 'education', 'family']);
export const PREPARED_MONTHS = 6;
const SAVING_SUBS = new Set(['savings', 'emergency fund', 'investment']);

const clamp = (v: number) => Math.min(100, Math.max(0, v));
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
export const statusOf = (score: number): DimStatus => (score >= 70 ? 'strong' : score >= 40 ? 'fair' : 'weak');
export const gradeOf = (score: number): Score['grade'] => (score >= 80 ? 'great' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'low');

export type HealthInput = {
  /** Ledger entries (utils/ledger.ts). */
  entries: Transaction[];
  /** Ledger `moved` records (card, loan, savings and investment payments). */
  moved: Transaction[];
  transfers: Transfer[];
  isSavingsAccount: (accountId: string) => boolean;
  todayKey: string;
  /** Savings target in percent (Profile). */
  savingsTarget: number;
  savingsBalance: number;
  /** True when there is a savings account or a goal, so saving can be measured at all. */
  hasSavingsPlace: boolean;
  /** Monthly instalment and loan payments of the recorded debts. */
  debtMonthly: number;
  debtCount: number;
  /** Credit lines (PayLater, cards): money used and total limit. */
  creditUsed: number;
  creditLimit: number;
  budgets: BudgetLimit[];
};

function dim(id: DimensionId, score: number | null, indicators: Indicator[], missing?: MissingReason): Dimension {
  if (score === null) return { id, score: null, status: null, indicators, missing };
  const s = Math.round(clamp(score));
  return { id, score: s, status: statusOf(s), indicators };
}

/** Average monthly essential spending over `keys` (financial months). Refunds in those categories lower it. */
export function essentialAverage(entries: Transaction[], keys: string[]): number {
  if (keys.length === 0) return 0;
  const set = new Set(keys);
  let total = 0;
  for (const x of entries) {
    if (x.type !== 'debit' || !(ESSENTIAL_CATEGORIES.has(x.categoryId) || (x.amount > 0 && isFixedExpense(x)))) continue;
    if (set.has(cycleOf(x.date))) total += x.amount;
  }
  return total / keys.length;
}

export function computeHealth(inp: HealthInput): Health {
  const { entries, moved, transfers, isSavingsAccount, todayKey, savingsBalance, hasSavingsPlace, debtMonthly, debtCount, creditUsed, creditLimit, budgets } = inp;
  const target = clampTarget(inp.savingsTarget) / 100;
  const rows: MonthRow[] = trimmed(monthRows(entries, monthKeysEnding(todayKey, 7).slice(0, -1)));
  const recent = rows.slice(-3);
  const keys = recent.map((r) => r.key);
  const withIncome = recent.filter((r) => r.income > 0);
  const income = recent.reduce((s, r) => s + r.income, 0);
  const avgIncome = withIncome.length ? income / recent.length : 0;
  const enoughMonths = withIncome.length >= 2;
  const out: Dimension[] = [];

  // 1. Cash flow
  if (!enoughMonths) out.push(dim('cashflow', null, [], recent.length < 2 ? 'months' : 'noIncome'));
  else {
    const spent = recent.reduce((s, r) => s + r.spending, 0);
    const rate = (income - spent) / income;
    const okMonths = recent.filter((r) => r.income - r.spending >= 0).length;
    const score = 0.7 * clamp((Math.max(0, rate) / target) * 100) + 0.3 * ((okMonths / recent.length) * 100);
    out.push(
      dim('cashflow', score, [
        { id: 'avgRate', value: r1(rate * 100), unit: 'pct' },
        { id: 'positiveMonths', value: okMonths, unit: 'count', of: recent.length },
        { id: 'avgNet', value: r2((income - spent) / recent.length), unit: 'rm' },
      ]),
    );
  }

  // 2. Savings: only money that really went to savings, never "income minus spending".
  const savedBy = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const f of savingFlows(transfers, isSavingsAccount)) {
    const k = cycleOf(f.date);
    if (savedBy.has(k) && f.date <= todayKey) savedBy.set(k, (savedBy.get(k) ?? 0) + f.amount);
  }
  for (const x of moved) {
    if (x.categoryId !== 'financial' || !SAVING_SUBS.has((x.subcategory ?? '').trim().toLowerCase())) continue;
    const k = cycleOf(x.date);
    if (savedBy.has(k)) savedBy.set(k, (savedBy.get(k) ?? 0) + x.amount);
  }
  const savedTotal = [...savedBy.values()].reduce((s, v) => s + v, 0);
  const anySaving = [...savedBy.values()].some((v) => v !== 0);
  if (!enoughMonths) out.push(dim('savings', null, [], recent.length < 2 ? 'months' : 'noIncome'));
  else if (!hasSavingsPlace && !anySaving) out.push(dim('savings', null, [], 'noSavingsPlace'));
  else {
    const rate = Math.max(0, savedTotal) / income;
    const monthsSaving = [...savedBy.values()].filter((v) => v > 0).length;
    const score = 0.7 * clamp((rate / target) * 100) + 0.3 * ((monthsSaving / recent.length) * 100);
    out.push(
      dim('savings', score, [
        { id: 'savedRate', value: r1(rate * 100), unit: 'pct' },
        { id: 'avgSaved', value: r2(savedTotal / recent.length), unit: 'rm' },
        { id: 'monthsSaving', value: monthsSaving, unit: 'count', of: recent.length },
      ]),
    );
  }

  // 3. Debt: monthly payments against income, and how much of any credit line is used.
  if (debtCount === 0 && creditLimit <= 0) out.push(dim('debt', null, [], 'noDebts'));
  else if (avgIncome <= 0) out.push(dim('debt', null, [], 'noIncome'));
  else {
    const dti = debtMonthly / avgIncome;
    const dtiScore = clamp(100 - ((dti - 0.1) / 0.3) * 100);
    const util = creditLimit > 0 ? Math.max(0, creditUsed) / creditLimit : null;
    const utilScore = util === null ? null : clamp(100 - ((util - 0.3) / 0.6) * 100);
    const score = debtCount > 0 && utilScore !== null ? 0.6 * dtiScore + 0.4 * utilScore : utilScore ?? dtiScore;
    const ind: Indicator[] = [];
    if (debtCount > 0) ind.push({ id: 'dti', value: r1(dti * 100), unit: 'pct' }, { id: 'debtMonthly', value: r2(debtMonthly), unit: 'rm' });
    if (util !== null) ind.push({ id: 'util', value: r1(util * 100), unit: 'pct' });
    out.push(dim('debt', score, ind));
  }

  // 4. Budget discipline: each budgeted category in each month, within its own limit or not.
  if (budgets.length === 0) out.push(dim('budget', null, [], 'noBudgets'));
  else if (recent.length === 0) out.push(dim('budget', null, [], 'months'));
  else {
    const spent = new Map<string, number>();
    const ids = new Set(budgets.map((b) => b.categoryId));
    for (const x of entries) {
      if (x.type !== 'debit' || !ids.has(x.categoryId)) continue;
      const k = cycleOf(x.date);
      if (!keys.includes(k)) continue;
      spent.set(`${k}|${x.categoryId}`, (spent.get(`${k}|${x.categoryId}`) ?? 0) + x.amount);
    }
    let within = 0;
    let total = 0;
    for (const k of keys) {
      for (const b of budgets) {
        total++;
        if ((spent.get(`${k}|${b.categoryId}`) ?? 0) <= b.limit) within++;
      }
    }
    out.push(dim('budget', (within / total) * 100, [{ id: 'within', value: within, unit: 'count', of: total }]));
  }

  // 5. Preparedness: how many months of essential spending the savings would cover.
  const essentialAvg = essentialAverage(entries, keys);
  if (recent.length < 2 || essentialAvg <= 0) out.push(dim('preparedness', null, [], 'months'));
  else if (!hasSavingsPlace && savingsBalance <= 0) out.push(dim('preparedness', null, [], 'noSavingsPlace'));
  else {
    const coverage = Math.max(0, savingsBalance) / essentialAvg;
    const goal = essentialAvg * PREPARED_MONTHS;
    out.push(
      dim('preparedness', (coverage / PREPARED_MONTHS) * 100, [
        { id: 'coverage', value: r1(coverage), unit: 'months' },
        { id: 'essentialAvg', value: r2(essentialAvg), unit: 'rm' },
        { id: 'savingsBalance', value: r2(savingsBalance), unit: 'rm' },
        { id: 'target6', value: r2(goal), unit: 'rm' },
        { id: 'gap', value: r2(Math.max(0, goal - savingsBalance)), unit: 'rm' },
      ]),
    );
  }

  const measured = out.filter((d) => d.score !== null);
  const overall = measured.length >= MIN_MEASURED ? Math.round(measured.reduce((s, d) => s + (d.score ?? 0), 0) / measured.length) : null;
  const weakest = measured.length ? [...measured].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0].id : null;
  return { dimensions: out, overall, measured: measured.length, grade: overall === null ? null : gradeOf(overall), weakest, months: keys };
}

/** The legacy Score shape (Ringkasan link, Ask WaKira), made from the health assessment. Null without an overall. */
export function scoreOf(h: Health): Score | null {
  if (h.overall === null || h.grade === null) return null;
  return {
    total: h.overall,
    grade: h.grade,
    weakest: h.weakest,
    factors: h.dimensions.filter((d) => d.score !== null).map((d) => ({ id: d.id, points: r2((d.score ?? 0) / 5), max: 20 as const })),
  };
}
