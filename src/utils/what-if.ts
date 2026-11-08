import type { Transaction, Transfer } from '@/context/TransactionsContext';
import { comparePayoff, type DebtLine } from '@/utils/debt-burden';
import { cycleOf } from '@/utils/cycle';
import { savingFlows } from '@/utils/forecast';

/**
 * What-If: a calculation, not a guess. It starts from the user's own averages (last 3 complete months), applies the
 * levers, and shows base and simulated side by side. It never writes anything: no record, budget or plan changes.
 *
 *   cash flow a month       = income − spending − extra debt payment
 *   left after saving       = cash flow − money moved to savings a month
 *   available in 6 months   = available now + 6 × left after saving
 *   savings in 12 months    = savings now + 12 × money moved to savings a month
 *   runway in 12 months     = savings in 12 months ÷ spending a month
 *   goal finish             = what the goal still needs ÷ (its recent pace + extra saving)
 *   debt-free               = the avalanche plan with the extra debt payment (see utils/debt-burden.ts)
 */

const r2 = (n: number) => Math.round(n * 100) / 100;
const SAVING_SUBS = new Set(['savings', 'emergency fund', 'investment']);

export type WhatIfGoal = { id: string; name: string; remaining: number; pace: number };
export type WhatIfBase = {
  income: number;
  spending: number;
  /** Average monthly spending per category (purchases only). */
  categories: { categoryId: string; amount: number }[];
  /** Money really moved to savings a month. */
  saving: number;
  savingsBalance: number;
  available: number;
  goals: WhatIfGoal[];
  debts: DebtLine[];
  months: number;
};

export type Levers = {
  /** −50..+50 percent. */
  incomePct: number;
  cutCategoryId: string | null;
  /** RM a month, never more than that category's spending. */
  cutAmount: number;
  extraSaving: number;
  newCommitment: number;
  extraDebt: number;
  /** The goal that extra saving goes to. */
  goalId: string | null;
};
export const NO_CHANGE: Levers = { incomePct: 0, cutCategoryId: null, cutAmount: 0, extraSaving: 0, newCommitment: 0, extraDebt: 0, goalId: null };

export type WhatIfResult = {
  income: number;
  spending: number;
  cashFlow: number;
  leftAfterSaving: number;
  available6: number;
  savings12: number;
  runway12: number | null;
  /** Months to finish the chosen goal; null when it never finishes at this pace. */
  goalMonths: number | null;
  debtMonths: number | null;
};

/** Average money moved to savings a month over `keys`: transfers into savings/goals plus Savings-type records. */
export function averageSaving(transfers: Transfer[], moved: Transaction[], isSavingsAccount: (id: string) => boolean, keys: string[]): number {
  if (keys.length === 0) return 0;
  const set = new Set(keys);
  let total = 0;
  for (const f of savingFlows(transfers, isSavingsAccount)) if (set.has(cycleOf(f.date))) total += f.amount;
  for (const x of moved) if (x.categoryId === 'financial' && SAVING_SUBS.has((x.subcategory ?? '').trim().toLowerCase()) && set.has(cycleOf(x.date))) total += x.amount;
  return r2(Math.max(0, total) / keys.length);
}

export function simulate(base: WhatIfBase, lv: Levers, todayKey: string): WhatIfResult {
  const income = base.income * (1 + lv.incomePct / 100);
  const catAmount = lv.cutCategoryId ? base.categories.find((c) => c.categoryId === lv.cutCategoryId)?.amount ?? 0 : 0;
  const cut = Math.min(Math.max(0, lv.cutAmount), catAmount);
  const spending = base.spending - cut + Math.max(0, lv.newCommitment);
  const cashFlow = income - spending - Math.max(0, lv.extraDebt);
  const saving = base.saving + Math.max(0, lv.extraSaving);
  const left = cashFlow - saving;
  const savings12 = base.savingsBalance + saving * 12;
  const goal = base.goals.find((g) => g.id === lv.goalId) ?? base.goals[0];
  let goalMonths: number | null = null;
  if (goal) {
    // All extra saving goes to the chosen goal (the first one when none is chosen).
    const pace = goal.pace + Math.max(0, lv.extraSaving);
    goalMonths = goal.remaining <= 0 ? 0 : pace > 0 ? Math.ceil(goal.remaining / pace) : null;
  }
  const payoff = comparePayoff(base.debts, Math.max(0, lv.extraDebt), todayKey);
  return {
    income: r2(income),
    spending: r2(spending),
    cashFlow: r2(cashFlow),
    leftAfterSaving: r2(left),
    available6: r2(base.available + left * 6),
    savings12: r2(savings12),
    runway12: spending > 0 ? Math.round((savings12 / spending) * 10) / 10 : null,
    goalMonths,
    debtMonths: payoff ? (lv.extraDebt > 0 ? payoff.avalanche.months : payoff.scheduled.months) : null,
  };
}
