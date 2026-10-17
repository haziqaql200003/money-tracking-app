/**
 * The salary planner: give every ringgit of a pay cycle a purpose before spending it.
 * Pure functions: the screen gathers the inputs.
 */
import type { Debt } from '@/utils/debts';
import { instalmentAmount } from '@/utils/debts';
import type { RecurringRule, Transaction } from '@/context/TransactionsContext';
import { upcomingOccurrences } from '@/utils/bills';

export type AllocKind = 'goal' | 'category' | 'custom';

export type AllocLine = {
  id: string;
  kind: AllocKind;
  /** The goal or category this line is for. */
  refId?: string;
  /** Custom lines: what you call it. */
  label?: string;
  amount: number;
};

export type AllocPlan = { income: number; lines: AllocLine[] };
/** One plan per pay cycle, keyed like the cycle ('2026-10'). */
export type AllocStore = Record<string, AllocPlan>;

export type Commitment = { id: string; title: string; amount: number; date: string; kind: 'bill' | 'debt'; varies: boolean; done: boolean };

const r2 = (n: number) => Math.round(n * 100) / 100;
let counter = 0;
export const newLineId = () => `al_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export type AllocState = 'empty' | 'open' | 'zero' | 'over';

export type AllocSummary = {
  income: number;
  commitments: number;
  assigned: number;
  /** Commitments plus everything assigned. */
  total: number;
  /** What is still without a purpose (negative = more assigned than income). */
  left: number;
  state: AllocState;
};

export function allocSummary(plan: AllocPlan | undefined, commitments: number): AllocSummary {
  const income = r2(plan?.income ?? 0);
  const assigned = r2((plan?.lines ?? []).reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0));
  const total = r2(commitments + assigned);
  const left = r2(income - total);
  const state: AllocState = income <= 0 ? 'empty' : left === 0 ? 'zero' : left < 0 ? 'over' : 'open';
  return { income, commitments: r2(commitments), assigned, total, left, state };
}

/**
 * What is already promised in a cycle: bills from your recurring rules (those already recorded and those still to
 * come) and every instalment that falls due in it, paid or not, so the plan covers the whole cycle.
 */
export function commitmentsOf(
  range: { from: string; to: string },
  inp: { todayKey: string; rules: RecurringRule[]; transactions: Transaction[]; debts: Debt[] },
): Commitment[] {
  const out: Commitment[] = [];
  for (const t of inp.transactions) {
    if (!t.recurringId || t.type !== 'debit' || t.date < range.from || t.date > range.to) continue;
    out.push({ id: t.id, title: t.title, amount: t.amount, date: t.date, kind: 'bill', varies: false, done: true });
  }
  const horizonStart = inp.todayKey > range.from ? inp.todayKey : range.from;
  const days = Math.max(0, Math.round((Date.UTC(+range.to.slice(0, 4), +range.to.slice(5, 7) - 1, +range.to.slice(8, 10)) - Date.UTC(+horizonStart.slice(0, 4), +horizonStart.slice(5, 7) - 1, +horizonStart.slice(8, 10))) / 86400000));
  for (const b of upcomingOccurrences(inp.rules, horizonStart, days)) {
    if (b.type !== 'debit' || b.date > range.to || b.date < range.from) continue;
    // A bill on a day that is already recorded is not counted twice.
    if (out.some((o) => o.done && o.title === b.title && o.date === b.date)) continue;
    out.push({ id: b.id, title: b.title, amount: b.amount, date: b.date, kind: 'bill', varies: b.varies, done: false });
  }
  for (const d of inp.debts) {
    if (d.kind === 'credit') continue;
    for (const s of d.schedule) {
      if (s.dueDate < range.from || s.dueDate > range.to) continue;
      out.push({ id: `${d.id}_${s.n}`, title: d.name, amount: instalmentAmount(s), date: s.dueDate, kind: 'debt', varies: false, done: !!s.paid });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.title.localeCompare(b.title)));
}

export const commitmentsTotal = (list: Commitment[]) => r2(list.reduce((s, c) => s + c.amount, 0));

/** One line for each budget and each running goal that does not have one yet, at the amount you already planned for it. */
export function suggestLines(inp: {
  categories: { id: string; limit: number }[];
  goals: { id: string; monthly: number }[];
  existing: AllocLine[];
}): AllocLine[] {
  const has = (kind: AllocKind, refId: string) => inp.existing.some((l) => l.kind === kind && l.refId === refId);
  const add: AllocLine[] = [];
  for (const c of inp.categories) if (c.limit > 0 && !has('category', c.id)) add.push({ id: newLineId(), kind: 'category', refId: c.id, amount: r2(c.limit) });
  for (const g of inp.goals) if (g.monthly > 0 && !has('goal', g.id)) add.push({ id: newLineId(), kind: 'goal', refId: g.id, amount: r2(g.monthly) });
  return add;
}

/** The 50/30/20 split of the income: commitments come out of the 50% for needs, the rest is wants and saving. */
export function rule503020(income: number, commitments: number, labels: { needs: string; wants: string; save: string }): AllocLine[] {
  if (!(income > 0)) return [];
  const needs = Math.max(0, r2(income * 0.5 - commitments));
  const wants = r2(income * 0.3);
  const save = r2(income - commitments - needs - wants);
  return [
    { id: newLineId(), kind: 'custom', label: labels.needs, amount: needs },
    { id: newLineId(), kind: 'custom', label: labels.wants, amount: wants },
    { id: newLineId(), kind: 'custom', label: labels.save, amount: Math.max(0, save) },
  ];
}

/** A copy of an earlier plan for a new cycle (new ids, same amounts). */
export function copyPlan(plan: AllocPlan): AllocPlan {
  return { income: plan.income, lines: plan.lines.map((l) => ({ ...l, id: newLineId() })) };
}
