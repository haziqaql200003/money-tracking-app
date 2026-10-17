/**
 * The cash flow calendar: what already happened and what is expected, day by day, for the money you can use.
 * Pure functions: the screen gathers the inputs.
 */
import type { RecurringRule } from '@/context/TransactionsContext';
import { upcomingOccurrences } from '@/utils/bills';
import { addDays, daysBetween } from '@/utils/cycle';
import type { Debt } from '@/utils/debts';
import { instalmentAmount } from '@/utils/debts';
import type { Iou } from '@/utils/ious';
import { iouLeft } from '@/utils/ious';

export type Flow = { id: string; date: string; amount: number; title: string };

export type PlannedKind = 'bill' | 'income' | 'debt' | 'iou' | 'salary';

export type PlannedItem = {
  id: string;
  date: string;
  title: string;
  amount: number;
  direction: 'in' | 'out';
  kind: PlannedKind;
  /** The real amount is not known yet (a bill that varies, or salary without an amount). */
  varies?: boolean;
  /** Was due before today and is still unpaid; shown on today. */
  overdue?: boolean;
};

export type CashDay = {
  date: string;
  isPast: boolean;
  isToday: boolean;
  /** What already happened. */
  actualIn: number;
  actualOut: number;
  actual: Flow[];
  /** What is still expected (never on a past day). */
  planned: PlannedItem[];
  plannedIn: number;
  plannedOut: number;
  /** Money you can use at the end of the day (counting what is expected). */
  balance: number;
};

export type Cashflow = {
  days: CashDay[];
  actualIn: number;
  actualOut: number;
  plannedIn: number;
  plannedOut: number;
  /** Lowest balance from today on. */
  lowest: { date: string; balance: number } | null;
  /** First day from today on when the balance goes below zero. */
  firstNegative: string | null;
  endBalance: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Changes to the money you can use, as signed amounts: income and spending on those accounts, plus money crossing
 * in or out of them to anywhere else (savings, a loan paid out, a loan repaid). Money moved between two of the
 * accounts you can use is left out: it nets to nothing.
 */
export function spendableFlows(
  transactions: { id: string; date: string; amount: number; type: 'debit' | 'credit'; accountId: string; title: string }[],
  transfers: { id: string; date: string; amount: number; fromAccountId: string; toAccountId: string; note?: string }[],
  spendableIds: ReadonlySet<string>,
): Flow[] {
  const out: Flow[] = [];
  for (const t of transactions) {
    if (!spendableIds.has(t.accountId)) continue;
    out.push({ id: t.id, date: t.date, amount: t.type === 'credit' ? t.amount : -t.amount, title: t.title });
  }
  for (const tr of transfers) {
    const from = spendableIds.has(tr.fromAccountId);
    const to = spendableIds.has(tr.toAccountId);
    if (from === to) continue;
    out.push({ id: tr.id, date: tr.date, amount: to ? tr.amount : -tr.amount, title: tr.note ?? '' });
  }
  return out;
}

export function buildCashflow(input: {
  from: string;
  to: string;
  todayKey: string;
  /** Balance of the money you can use, at the end of today. */
  balanceNow: number;
  flows: Flow[];
  planned: PlannedItem[];
}): Cashflow {
  const { from, to, todayKey, balanceNow } = input;
  const start = from < todayKey ? from : todayKey;
  const end = to > todayKey ? to : todayKey;

  // Expected items: anything due before today and unpaid sits on today.
  const plannedByDay = new Map<string, PlannedItem[]>();
  for (const p of input.planned) {
    const date = p.date < todayKey ? todayKey : p.date;
    if (date > end) continue;
    const item = p.date < todayKey ? { ...p, date, overdue: true } : p;
    plannedByDay.set(date, [...(plannedByDay.get(date) ?? []), item]);
  }
  const flowsByDay = new Map<string, Flow[]>();
  for (const f of input.flows) {
    if (f.date > todayKey) continue;
    flowsByDay.set(f.date, [...(flowsByDay.get(f.date) ?? []), f]);
  }

  // Walk from the start. Past days: work back from today's balance. Today and after: carry forward.
  const dates: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) dates.push(d);
  const net = (d: string) => (flowsByDay.get(d) ?? []).reduce((s, f) => s + f.amount, 0);
  const plannedNet = (d: string) => (plannedByDay.get(d) ?? []).reduce((s, p) => s + (p.direction === 'in' ? p.amount : -p.amount), 0);

  const balanceOf = new Map<string, number>();
  // after today
  let carry = r2(balanceNow + plannedNet(todayKey));
  balanceOf.set(todayKey, carry);
  for (let d = addDays(todayKey, 1); d <= end; d = addDays(d, 1)) {
    carry = r2(carry + plannedNet(d));
    balanceOf.set(d, carry);
  }
  // before today
  let back = balanceNow;
  for (let d = todayKey; d > start; d = addDays(d, -1)) {
    back = r2(back - net(d));
    balanceOf.set(addDays(d, -1), back);
  }

  const days: CashDay[] = dates
    .filter((d) => d >= from && d <= to)
    .map((date) => {
      const actual = (flowsByDay.get(date) ?? []).slice().sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      const planned = (plannedByDay.get(date) ?? []).slice().sort((a, b) => b.amount - a.amount);
      return {
        date,
        isPast: date < todayKey,
        isToday: date === todayKey,
        actualIn: r2(actual.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0)),
        actualOut: r2(-actual.filter((f) => f.amount < 0).reduce((s, f) => s + f.amount, 0)),
        actual,
        planned,
        plannedIn: r2(planned.filter((p) => p.direction === 'in').reduce((s, p) => s + p.amount, 0)),
        plannedOut: r2(planned.filter((p) => p.direction === 'out').reduce((s, p) => s + p.amount, 0)),
        balance: balanceOf.get(date) ?? balanceNow,
      };
    });

  const future = days.filter((d) => d.date >= todayKey);
  const lowestDay = future.reduce<CashDay | null>((m, d) => (m === null || d.balance < m.balance ? d : m), null);
  return {
    days,
    actualIn: r2(days.reduce((s, d) => s + d.actualIn, 0)),
    actualOut: r2(days.reduce((s, d) => s + d.actualOut, 0)),
    plannedIn: r2(days.reduce((s, d) => s + d.plannedIn, 0)),
    plannedOut: r2(days.reduce((s, d) => s + d.plannedOut, 0)),
    lowest: lowestDay ? { date: lowestDay.date, balance: lowestDay.balance } : null,
    firstNegative: future.find((d) => d.balance < 0)?.date ?? null,
    endBalance: days.length ? days[days.length - 1].balance : balanceNow,
  };
}

/**
 * Everything expected from today up to `to`: bills and income from recurring rules, instalments not paid yet,
 * money owed to or by you with a due date, and salary day when no income rule already shows it. Items already
 * past due are kept (the cash flow moves them to today).
 */
export function plannedItems(inp: {
  to: string;
  todayKey: string;
  rules: RecurringRule[];
  debts: Debt[];
  ious: Iou[];
  /** Pay days with the salary expected on each (0 = not known). */
  paydays: { date: string; amount: number }[];
}): PlannedItem[] {
  const out: PlannedItem[] = [];
  const horizon = daysBetween(inp.todayKey, inp.to);

  const occ = horizon >= 0 ? upcomingOccurrences(inp.rules, inp.todayKey, horizon) : [];
  for (const o of occ) {
    out.push({ id: o.id, date: o.date, title: o.title, amount: o.amount, direction: o.type === 'credit' ? 'in' : 'out', kind: o.type === 'credit' ? 'income' : 'bill', varies: o.varies && o.amount <= 0 });
  }

  for (const d of inp.debts) {
    if (d.kind === 'credit') continue;
    for (const s of d.schedule) {
      if (s.paid || s.dueDate > inp.to) continue;
      out.push({ id: `${d.id}_${s.n}`, date: s.dueDate, title: d.name, amount: instalmentAmount(s), direction: 'out', kind: 'debt' });
    }
  }

  for (const i of inp.ious) {
    const left = iouLeft(i);
    if (left <= 0 || !i.dueDate || i.dueDate > inp.to) continue;
    out.push({ id: `iou_${i.id}`, date: i.dueDate, title: i.person, amount: left, direction: i.direction === 'owed' ? 'in' : 'out', kind: 'iou' });
  }

  const hasIncomeRule = occ.some((o) => o.type === 'credit');
  if (!hasIncomeRule) {
    for (const p of inp.paydays) {
      if (p.date < inp.todayKey || p.date > inp.to) continue;
      out.push({ id: `salary_${p.date}`, date: p.date, title: '', amount: p.amount, direction: 'in', kind: 'salary', varies: p.amount <= 0 });
    }
  }
  return out;
}
