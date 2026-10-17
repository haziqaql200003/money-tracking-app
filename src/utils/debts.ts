import { r1 } from '@/utils/percent';
/**
 * Debts: instalment purchases (SPayLater, Atome, TikTok PayLater...), loans (SLoan, TikTok Financing...) and
 * PayLater-style credit lines. Pure functions: no React, no storage, so the arithmetic can be tested alone.
 *
 * How a debt maps onto WaKira's money model:
 *  - Every debt gets its own account that holds what is owed as a NEGATIVE balance.
 *  - Buying on instalment (spendOn 'pay', every debt since 3.1.3): nothing is spent yet. Each payment you make is
 *    spending then, in the category of what you bought (the principal part) plus the interest / fee part. What is
 *    owed is the unpaid principal, and the debt account's balance is kept equal to it.
 *  - Older instalment debts (no spendOn) booked the whole price as spending on the day of purchase and paid with
 *    transfers. `planPayMode` converts them.
 *  - Receiving a loan = a transfer from the debt account into your bank. It is not income.
 *  - Paying a loan instalment = a transfer from your bank to the debt account for the principal part (not spending),
 *    plus an expense only for the interest / fee part.
 */

export type DebtKind = 'installment' | 'loan' | 'credit';
export type RateType = 'flat' | 'reducing';

export type PaidInfo = {
  date: string;
  /** Total taken out of the paying account (principal + interest/fee). */
  amount: number;
  accountId: string;
  /** Records WaKira made for this payment, so it can be undone. Empty for instalments paid before you used WaKira. */
  transferId?: string;
  expenseId?: string;
  /** Instalment purchases paid under 'pay' spending: the expense for the principal part of this payment. */
  purchaseExpenseId?: string;
  /** Paid before the debt was added to WaKira: nothing was recorded. */
  historic?: boolean;
};

export type Instalment = {
  /** 1-based position in the original plan. */
  n: number;
  dueDate: string;
  principal: number;
  /** Interest (loan) or fee (instalment purchase) in this payment. */
  interest: number;
  paid?: PaidInfo;
};

export type Debt = {
  id: string;
  kind: DebtKind;
  /** What you call it, e.g. "iPhone case". */
  name: string;
  /** SPayLater, Atome, SLoan... free text. */
  provider: string;
  /** The account that holds the amount owed (negative balance). */
  accountId: string;
  /** Account instalments are normally paid from. */
  payFromAccountId: string;
  /** Instalment purchase: amount bought. Loan: amount borrowed. Credit line: unused. */
  principal: number;
  months: number;
  ratePct: number;
  rateType: RateType;
  startDate: string;
  categoryId?: string;
  subcategory?: string;
  schedule: Instalment[];
  /** Credit line only. */
  creditLimit?: number;
  /** Credit line only: day of the month the bill is due (1-28). */
  dueDay?: number;
  status: 'active' | 'done';
  /** Set when the debt was paid off in one go. */
  settled?: { date: string; amount: number; accountId: string; transferId?: string; expenseId?: string; purchaseExpenseId?: string };
  /** 'pay': an instalment purchase counts as spending when each payment is made, not on the day of purchase. */
  spendOn?: 'pay';
};

/* ---------------- money helpers ---------------- */

const cents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Split `total` into `parts` amounts that are whole cents and add up exactly; the last absorbs the rounding. */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(cents(total) / parts);
  const out = Array<number>(parts).fill(base);
  out[parts - 1] = cents(total) - base * (parts - 1);
  return out.map(fromCents);
}

/* ---------------- dates ---------------- */

const pad = (n: number) => String(n).padStart(2, '0');

/** `dateKey` moved by whole months, the day clamped to the month's length (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const last = new Date(ny, nm + 1, 0).getDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, last))}`;
}

/* ---------------- schedule ---------------- */

/** How the user states the interest on an instalment plan. */
export type FeeMode = 'pctMonth' | 'pctTotal' | 'rmMonth';

/** Total interest/fee over the whole plan from what the user typed. */
export function installmentTotalFee(principal: number, months: number, mode: FeeMode, value: number): number {
  if (!(principal > 0) || !(months >= 1) || !(value > 0)) return 0;
  if (mode === 'pctMonth') return round2((principal * value * months) / 100);
  if (mode === 'pctTotal') return round2((principal * value) / 100);
  return round2(value * months);
}

export type PlanInput =
  | { kind: 'installment'; principal: number; months: number; firstDue: string; monthlyFee?: number; /** Total interest/fee over the whole plan; wins over monthlyFee. */ totalFee?: number }
  | { kind: 'loan'; principal: number; months: number; firstDue: string; ratePct: number; rateType: RateType; monthlyPayment?: number };

/** Standard loan payment for a monthly rate `r` (0.01 = 1%). */
export function annuityPayment(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0) return 0;
  if (monthlyRate <= 0) return round2(principal / months);
  const f = Math.pow(1 + monthlyRate, months);
  return round2((principal * monthlyRate * f) / (f - 1));
}

/** The payment the schedule needs each month for a loan when the lender's figure is not entered. */
export function suggestedLoanPayment(principal: number, months: number, ratePct: number, rateType: RateType): number {
  if (months <= 0 || principal <= 0) return 0;
  if (rateType === 'flat') return round2((principal + (principal * ratePct * months) / 1200) / months);
  return annuityPayment(principal, ratePct / 1200, months);
}

export function buildSchedule(input: PlanInput): Instalment[] {
  const { principal, months, firstDue } = input;
  if (!(principal > 0) || !(months >= 1)) return [];
  const parts = splitEvenly(principal, months);

  if (input.kind === 'installment') {
    if (input.totalFee !== undefined) {
      const fees = splitEvenly(Math.max(0, round2(input.totalFee)), months);
      return parts.map((p, i) => ({ n: i + 1, dueDate: addMonths(firstDue, i), principal: p, interest: fees[i] }));
    }
    const fee = Math.max(0, round2(input.monthlyFee ?? 0));
    return parts.map((p, i) => ({ n: i + 1, dueDate: addMonths(firstDue, i), principal: p, interest: fee }));
  }

  const monthlyRate = input.ratePct / 1200;
  const override = input.monthlyPayment && input.monthlyPayment > 0 ? round2(input.monthlyPayment) : 0;

  // Reducing balance: interest each month is charged on what is still owed.
  if (input.rateType === 'reducing' && monthlyRate > 0) {
    const pay = override || annuityPayment(principal, monthlyRate, months);
    const out: Instalment[] = [];
    let balance = cents(principal);
    let ok = true;
    for (let i = 0; i < months; i++) {
      const interest = Math.round(balance * monthlyRate);
      let princ = i === months - 1 ? balance : cents(pay) - interest;
      if (princ <= 0) ok = false; // the payment does not even cover the interest
      princ = Math.min(princ, balance);
      balance -= princ;
      out.push({ n: i + 1, dueDate: addMonths(firstDue, i), principal: fromCents(princ), interest: fromCents(interest) });
    }
    if (ok) return out;
  }

  // Flat rate (or a payment entered without a usable rate): the interest is spread evenly.
  const total = override ? Math.max(0, override * months - principal) : (principal * input.ratePct * months) / 1200;
  const interests = splitEvenly(round2(total), months);
  return parts.map((p, i) => ({ n: i + 1, dueDate: addMonths(firstDue, i), principal: p, interest: interests[i] }));
}

/** Marks the first `count` instalments as paid before WaKira: they change nothing in the records. */
export function markHistoricPaid(schedule: Instalment[], count: number, accountId: string): Instalment[] {
  return schedule.map((s, i) =>
    i < count ? { ...s, paid: { date: s.dueDate, amount: round2(s.principal + s.interest), accountId, historic: true } } : s,
  );
}

/* ---------------- reading a debt ---------------- */

export const isPaid = (s: Instalment) => !!s.paid;
export const unpaid = (debt: Debt) => debt.schedule.filter((s) => !s.paid);

/** What is still owed on the principal (instalment purchase / loan). */
export function remainingPrincipal(debt: Debt): number {
  if (debt.status === 'done') return 0;
  return round2(unpaid(debt).reduce((sum, s) => sum + s.principal, 0));
}

export function nextInstalment(debt: Debt): Instalment | null {
  if (debt.status === 'done') return null;
  return unpaid(debt)[0] ?? null;
}

export const instalmentAmount = (s: Instalment) => round2(s.principal + s.interest);
export const totalToRepayOf = (schedule: Instalment[]) => round2(schedule.reduce((sum, s) => sum + s.principal + s.interest, 0));
export const totalInterest = (debt: Debt) => round2(debt.schedule.reduce((sum, s) => sum + s.interest, 0));
export const totalToRepay = (debt: Debt) => round2(debt.schedule.reduce((sum, s) => sum + s.principal + s.interest, 0));
export const lastDueDate = (debt: Debt): string | null => (debt.schedule.length ? debt.schedule[debt.schedule.length - 1].dueDate : null);

/** 0-100: share of the principal already repaid. */
export function progressPercent(debt: Debt): number {
  const total = debt.schedule.reduce((sum, s) => sum + s.principal, 0);
  if (total <= 0) return debt.status === 'done' ? 100 : 0;
  if (debt.status === 'done') return 100;
  return Math.floor(((total - remainingPrincipal(debt)) / total) * 1000) / 10;
}

/** Done when every instalment is paid or the debt was settled. */
export function isFinished(debt: Debt): boolean {
  return debt.status === 'done' || (debt.schedule.length > 0 && debt.schedule.every(isPaid));
}

/* ---------------- recording a payment ---------------- */

export type PaymentRecords = {
  principal: number;
  /** Interest / fee actually paid (may be more than scheduled if the lender charged extra). */
  extra: number;
};

/**
 * Splits what was paid into principal and interest/fee. The principal part is always what the schedule says
 * (capped at what was paid); anything above it is interest or a fee.
 */
export function splitPayment(instalment: Instalment, amountPaid: number): PaymentRecords {
  const paid = round2(amountPaid);
  const principal = Math.min(instalment.principal, paid);
  return { principal: round2(principal), extra: round2(Math.max(0, paid - principal)) };
}

export function applyPayment(debt: Debt, n: number, paid: PaidInfo): Debt {
  const schedule = debt.schedule.map((s) => (s.n === n ? { ...s, paid } : s));
  const next: Debt = { ...debt, schedule };
  return isFinished(next) ? { ...next, status: 'done' } : next;
}

export function undoPayment(debt: Debt, n: number): Debt {
  return { ...debt, status: 'active', schedule: debt.schedule.map((s) => (s.n === n ? { ...s, paid: undefined } : s)) };
}

/* ---------------- converting old instalment debts ---------------- */

export type PayModePlan = {
  /** The purchase that was booked as spending on the debt account. */
  removeTransactionIds: string[];
  /** Principal transfers of payments already made. */
  removeTransferIds: string[];
  /** Spending to add instead, one per payment already made (slot = instalment number, or 'settled'). */
  expenses: { id: string; slot: number | 'settled'; accountId: string; date: string; amount: number }[];
  /** What the debt account's opening balance becomes: minus the unpaid principal. */
  balance: number;
};

/**
 * Works out how to move an old instalment debt (whole price spent on the day of purchase) to spending-on-payment.
 * Ids of the new expenses are fixed (from the debt id and the slot), so converting the same debt on two devices
 * that later sync ends with one record, not two.
 */
export function planPayMode(
  debt: Debt,
  transactions: { id: string; debtId?: string; accountId: string }[],
  transfers: { id: string; amount: number }[],
): PayModePlan {
  const amountOf = (id: string) => transfers.find((t) => t.id === id)?.amount;
  const plan: PayModePlan = {
    removeTransactionIds: transactions.filter((t) => t.debtId === debt.id && t.accountId === debt.accountId).map((t) => t.id),
    removeTransferIds: [],
    expenses: [],
    balance: -remainingPrincipal(debt),
  };
  for (const s of debt.schedule) {
    const p = s.paid;
    if (!p || p.historic || !p.transferId) continue;
    plan.removeTransferIds.push(p.transferId);
    const amount = amountOf(p.transferId) ?? splitPayment(s, p.amount).principal;
    if (amount > 0) plan.expenses.push({ id: `dpm_${debt.id}_${s.n}`, slot: s.n, accountId: p.accountId, date: p.date, amount });
  }
  const st = debt.settled;
  if (st?.transferId) {
    plan.removeTransferIds.push(st.transferId);
    const amount = amountOf(st.transferId);
    if (amount && amount > 0) plan.expenses.push({ id: `dpm_${debt.id}_settled`, slot: 'settled', accountId: st.accountId, date: st.date, amount });
  }
  return plan;
}

/** The debt after `planPayMode`: payments point at their new spending records instead of transfers. */
export function applyPayModePlan(debt: Debt, plan: PayModePlan): Debt {
  const idOf = (slot: number | 'settled') => plan.expenses.find((e) => e.slot === slot)?.id;
  return {
    ...debt,
    spendOn: 'pay',
    schedule: debt.schedule.map((s) =>
      s.paid && !s.paid.historic && s.paid.transferId ? { ...s, paid: { ...s.paid, transferId: undefined, purchaseExpenseId: idOf(s.n) } } : s,
    ),
    settled: debt.settled?.transferId ? { ...debt.settled, transferId: undefined, purchaseExpenseId: idOf('settled') } : debt.settled,
  };
}

/* ---------------- credit lines ---------------- */

export type CreditStatus = { used: number; available: number; limit: number; usedPercent: number };

/** `balance` is the debt account's balance (negative when money is owed). */
export function creditStatus(limit: number, balance: number): CreditStatus {
  const used = round2(Math.max(0, -balance));
  return { used, available: round2(limit - used), limit, usedPercent: limit > 0 ? r1((used / limit) * 100) : 0 };
}

/** The next time the monthly bill of a credit line falls due, today included. */
export function nextCreditDue(dueDay: number, todayKey: string): string {
  const day = Math.min(Math.max(Math.round(dueDay), 1), 28);
  const [y, m, d] = todayKey.split('-').map(Number);
  return d <= day ? `${y}-${pad(m)}-${pad(day)}` : addMonths(`${y}-${pad(m)}-${pad(day)}`, 1);
}

/* ---------------- overview across all debts ---------------- */

export type DebtOverview = {
  /** Instalment + loan principal still owed, plus what is used on credit lines. */
  totalOwed: number;
  /** Unpaid instalments due this calendar month (overdue ones included). */
  dueThisMonth: number;
  dueThisMonthCount: number;
  overdueCount: number;
  /** Date of the last unpaid instalment across all active debts, or null. */
  debtFreeDate: string | null;
  activeCount: number;
};

export function overview(debts: Debt[], creditUsed: Record<string, number>, todayKey: string): DebtOverview {
  const month = todayKey.slice(0, 7);
  let owed = 0;
  let due = 0;
  let dueCount = 0;
  let overdue = 0;
  let last: string | null = null;
  let active = 0;
  for (const d of debts) {
    if (d.kind === 'credit') {
      const used = creditUsed[d.id] ?? 0;
      owed += used;
      if (used > 0) active++;
      continue;
    }
    if (d.status === 'done') continue;
    active++;
    owed += remainingPrincipal(d);
    for (const s of unpaid(d)) {
      if (s.dueDate < todayKey) overdue++;
      if (s.dueDate.slice(0, 7) <= month) {
        due += instalmentAmount(s);
        dueCount++;
      }
      if (!last || s.dueDate > last) last = s.dueDate;
    }
  }
  return { totalOwed: round2(owed), dueThisMonth: round2(due), dueThisMonthCount: dueCount, overdueCount: overdue, debtFreeDate: last, activeCount: active };
}

/** Unpaid instalments across active debts that fall due on or before `untilKey`, soonest first. */
export function upcomingInstalments(debts: Debt[], todayKey: string, untilKey: string): { debt: Debt; instalment: Instalment }[] {
  const out: { debt: Debt; instalment: Instalment }[] = [];
  for (const debt of debts) {
    if (debt.kind === 'credit' || debt.status === 'done') continue;
    for (const instalment of unpaid(debt)) if (instalment.dueDate <= untilKey) out.push({ debt, instalment });
  }
  void todayKey;
  return out.sort((a, b) => (a.instalment.dueDate < b.instalment.dueDate ? -1 : a.instalment.dueDate > b.instalment.dueDate ? 1 : 0));
}
