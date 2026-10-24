import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';

import { FALLBACK_EXPENSE_ID } from '@/constants/categories';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionsContext';
import { toDateKey } from '@/utils/dates';
import type { Iou, IouDirection, IouRepeat } from '@/utils/ious';
import { usePersistedState } from '@/hooks/use-persisted-state';
import {
  applyPayModePlan,
  applyPayment,
  buildSchedule,
  markHistoricPaid,
  planPayMode,
  remainingPrincipal,
  round2,
  splitPayment,
  undoPayment as undoPaymentOn,
  type Debt,
  type RateType,
} from '@/utils/debts';

export type InstalmentInput = {
  name: string;
  provider: string;
  principal: number;
  months: number;
  /** Interest/fee over the whole plan (0 for interest-free plans). */
  totalFee: number;
  /** The day you bought it. */
  startDate: string;
  firstDue: string;
  payFromAccountId: string;
  categoryId?: string;
  subcategory?: string;
  /** Payments already made before you added this to WaKira. */
  paidCount: number;
};

export type LoanInput = {
  name: string;
  provider: string;
  principal: number;
  months: number;
  ratePct: number;
  rateType: RateType;
  /** The lender's monthly payment, if you want it exact. */
  monthlyPayment?: number;
  startDate: string;
  firstDue: string;
  /** Where the money landed. */
  receiveAccountId: string;
  payFromAccountId: string;
  /** Admin / processing fee taken at the start (an expense). */
  upfrontFee: number;
  paidCount: number;
};

export type CreditInput = {
  name: string;
  provider: string;
  limit: number;
  /** 1-28, optional. */
  dueDay?: number;
  /** How much of the limit is already used. */
  used: number;
  payFromAccountId: string;
};

export type IouInput = {
  person: string;
  direction: IouDirection;
  amount: number;
  dueDate?: string;
  repeat: IouRepeat;
  note?: string;
};

type DebtsContextValue = {
  ready: boolean;
  debts: Debt[];
  /** Money between you and people. A payment recorded with an account moves that account's balance; without one it is only a note. */
  ious: Iou[];
  addIou: (input: IouInput) => void;
  updateIou: (id: string, patch: Partial<IouInput>) => void;
  addIouPayment: (id: string, amount: number, date?: string, accountId?: string) => void;
  removeIouPayment: (id: string, index: number) => void;
  deleteIou: (id: string) => void;
  createInstalment: (input: InstalmentInput) => void;
  createLoan: (input: LoanInput) => void;
  createCredit: (input: CreditInput) => void;
  payInstalment: (debtId: string, n: number, pay: { date: string; amount: number; fromAccountId: string }) => void;
  undoPayment: (debtId: string, n: number) => void;
  /** Pay off the whole remaining principal at once (plus any extra fee) and close the debt. */
  settle: (debtId: string, pay: { date: string; extra: number; fromAccountId: string }) => void;
  repayCredit: (debtId: string, pay: { date: string; amount: number; fromAccountId: string }) => void;
  updateDebt: (id: string, patch: DebtPatch) => void;
  /** Re-enter an instalment plan or loan that was keyed in wrong. Only while no payment was recorded in WaKira. */
  reviseInstalment: (id: string, input: InstalmentInput) => void;
  reviseLoan: (id: string, input: LoanInput) => void;
  deleteDebt: (id: string) => void;
};

export type DebtPatch = { name?: string; provider?: string; dueDay?: number; creditLimit?: number; payFromAccountId?: string; categoryId?: string };

/**
 * The amounts and months of a plan can be changed only while nothing was paid inside WaKira:
 * a recorded payment moved real money, and re-planning under it would leave the books wrong.
 * Payments marked "paid before WaKira" are fine, they are simply counted again.
 */
export function canRevisePlan(debt: Debt) {
  return debt.kind !== 'credit' && !debt.settled && !debt.schedule.some((s) => s.paid && !s.paid.historic);
}

const DebtsContext = createContext<DebtsContextValue | undefined>(undefined);

const FINANCIAL_ID = 'financial';

export function DebtsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [debts, setDebts, ready] = usePersistedState<Debt[]>('debts', [], user?.id ?? null);
  const tx = useTransactions();
  const [ious, setIous] = usePersistedState<Iou[]>('ious', [], user?.id ?? null);

  const addIou = (input: IouInput) =>
    setIous((prev) => [
      ...prev,
      { id: `iou_${Date.now()}_${Math.floor(Math.random() * 1000)}`, payments: [], createdAt: toDateKey(new Date()), ...input },
    ]);
  const updateIou = (id: string, patch: Partial<IouInput>) => setIous((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  function addIouPayment(id: string, amount: number, date?: string, accountId?: string) {
    const iou = ious.find((i) => i.id === id);
    if (!iou) return;
    const when = date ?? toDateKey(new Date());
    const value = round2(amount);
    // With an account, the payment is a real record: money you pay back leaves it, money paid to you lands in it.
    const txId = accountId
      ? tx.addTransaction(
          iou.direction === 'owe'
            ? { title: iou.person, date: when, categoryId: FINANCIAL_ID, subcategory: 'Loan Payment', amount: value, type: 'debit', accountId, iouId: id }
            : { title: iou.person, date: when, categoryId: 'otherincome', subcategory: 'Reimbursement', amount: value, type: 'credit', accountId, iouId: id },
        )
      : undefined;
    const payment = { date: when, amount: value, ...(accountId ? { accountId, txId } : {}) };
    setIous((prev) => prev.map((i) => (i.id === id ? { ...i, payments: [...i.payments, payment] } : i)));
  }
  function removeIouPayment(id: string, index: number) {
    const txId = ious.find((i) => i.id === id)?.payments[index]?.txId;
    if (txId) tx.deleteTransaction(txId);
    setIous((prev) => prev.map((i) => (i.id === id ? { ...i, payments: i.payments.filter((_, n) => n !== index) } : i)));
  }
  function deleteIou(id: string) {
    // The records made for its payments go with it, so the accounts change back.
    const txIds = (ious.find((i) => i.id === id)?.payments ?? []).flatMap((p) => (p.txId ? [p.txId] : []));
    if (txIds.length > 0) tx.deleteTransactions(txIds);
    setIous((prev) => prev.filter((i) => i.id !== id));
  }

  const newDebtId = () => `debt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const feeCategory = (sub: 'Interest' | 'Bank Fees') => ({ categoryId: FINANCIAL_ID, subcategory: sub });

  function createInstalment(input: InstalmentInput) {
    const id = newDebtId();
    const schedule0 = buildSchedule({ kind: 'installment', principal: input.principal, months: input.months, firstDue: input.firstDue, totalFee: input.totalFee });
    const [accountId] = tx.addAccounts([{ name: input.name, type: 'other', icon: 'card', initialBalance: 0, debtId: id, hidden: true }]);
    const schedule = markHistoricPaid(schedule0, input.paidCount, input.payFromAccountId);
    const debt: Debt = {
      id, kind: 'installment', name: input.name, provider: input.provider, accountId, payFromAccountId: input.payFromAccountId,
      principal: input.principal, months: input.months, ratePct: 0, rateType: 'flat', startDate: input.startDate,
      categoryId: input.categoryId, subcategory: input.subcategory, schedule, status: 'active', spendOn: 'pay',
    };
    // Nothing is spent yet: each payment counts as spending when it is made. The account only holds what is owed.
    tx.updateAccount(accountId, { initialBalance: -remainingPrincipal(debt) });
    setDebts((prev) => [debt, ...prev]);
  }

  function createLoan(input: LoanInput) {
    const id = newDebtId();
    const schedule0 = buildSchedule({
      kind: 'loan', principal: input.principal, months: input.months, firstDue: input.firstDue,
      ratePct: input.ratePct, rateType: input.rateType, monthlyPayment: input.monthlyPayment,
    });
    const [accountId] = tx.addAccounts([{ name: input.name, type: 'other', icon: 'cash', initialBalance: 0, debtId: id, hidden: true }]);
    const schedule = markHistoricPaid(schedule0, input.paidCount, input.payFromAccountId);
    const debt: Debt = {
      id, kind: 'loan', name: input.name, provider: input.provider, accountId, payFromAccountId: input.payFromAccountId,
      principal: input.principal, months: input.months, ratePct: input.ratePct, rateType: input.rateType, startDate: input.startDate,
      schedule, status: 'active',
    };
    if (input.paidCount > 0) {
      tx.updateAccount(accountId, { initialBalance: -remainingPrincipal(debt) });
    } else {
      // The money you receive is borrowed, not earned: a transfer from the loan into your bank.
      tx.addTransfer({ fromAccountId: accountId, toAccountId: input.receiveAccountId, amount: input.principal, date: input.startDate, note: input.name, debtId: id });
      if (input.upfrontFee > 0) {
        tx.addTransaction({
          title: input.name, date: input.startDate, ...feeCategory('Bank Fees'), amount: input.upfrontFee, type: 'debit',
          accountId: input.receiveAccountId, debtId: id,
        });
      }
    }
    setDebts((prev) => [debt, ...prev]);
  }

  function createCredit(input: CreditInput) {
    const id = newDebtId();
    const [accountId] = tx.addAccounts([
      { name: input.name, type: 'other', icon: 'card', initialBalance: -Math.max(0, input.used), debtId: id, creditLimit: input.limit, provider: input.provider || undefined },
    ]);
    const debt: Debt = {
      id, kind: 'credit', name: input.name, provider: input.provider, accountId, payFromAccountId: input.payFromAccountId,
      principal: 0, months: 0, ratePct: 0, rateType: 'flat', startDate: toDateKey(new Date()), schedule: [],
      creditLimit: input.limit, dueDay: input.dueDay, status: 'active',
    };
    setDebts((prev) => [debt, ...prev]);
  }

  function payInstalment(debtId: string, n: number, pay: { date: string; amount: number; fromAccountId: string }) {
    const debt = debts.find((d) => d.id === debtId);
    const inst = debt?.schedule.find((s) => s.n === n);
    if (!debt || !inst || inst.paid) return;
    const { principal, extra } = splitPayment(inst, pay.amount);
    const spendNow = debt.spendOn === 'pay';
    const transferId = !spendNow && principal > 0
      ? tx.addTransfer({ fromAccountId: pay.fromAccountId, toAccountId: debt.accountId, amount: principal, date: pay.date, note: debt.name, debtId })
      : undefined;
    const purchaseExpenseId = spendNow && principal > 0 ? addPurchaseExpense(debt, principal, pay.date, pay.fromAccountId) : undefined;
    const expenseId = extra > 0
      ? tx.addTransaction({
          title: debt.name, date: pay.date, ...feeCategory('Interest'), amount: extra, type: 'debit',
          accountId: pay.fromAccountId, debtId,
        })
      : undefined;
    const info = { date: pay.date, amount: round2(pay.amount), accountId: pay.fromAccountId, transferId, expenseId, purchaseExpenseId };
    if (spendNow) tx.updateAccount(debt.accountId, { initialBalance: -remainingPrincipal(applyPayment(debt, n, info)) });
    setDebts((prev) => prev.map((d) => (d.id === debtId ? applyPayment(d, n, info) : d)));
  }

  /** The principal part of a payment on an instalment purchase: spending in the category of what was bought. */
  function addPurchaseExpense(debt: Debt, amount: number, date: string, accountId: string) {
    return tx.addTransaction({
      title: debt.name, date, categoryId: debt.categoryId ?? FALLBACK_EXPENSE_ID, subcategory: debt.subcategory ?? '',
      amount, type: 'debit', accountId, debtId: debt.id,
    });
  }

  function undoPayment(debtId: string, n: number) {
    const debt = debts.find((d) => d.id === debtId);
    const paid = debt?.schedule.find((s) => s.n === n)?.paid;
    if (!debt || !paid) return;
    if (paid.transferId) tx.deleteTransfer(paid.transferId);
    if (paid.expenseId) tx.deleteTransaction(paid.expenseId);
    if (paid.purchaseExpenseId) tx.deleteTransaction(paid.purchaseExpenseId);
    if (debt.spendOn === 'pay') tx.updateAccount(debt.accountId, { initialBalance: -remainingPrincipal(undoPaymentOn(debt, n)) });
    setDebts((prev) => prev.map((d) => (d.id === debtId ? undoPaymentOn(d, n) : d)));
  }

  function settle(debtId: string, pay: { date: string; extra: number; fromAccountId: string }) {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt || debt.kind === 'credit') return;
    const remaining = remainingPrincipal(debt);
    const spendNow = debt.spendOn === 'pay';
    const transferId = !spendNow && remaining > 0
      ? tx.addTransfer({ fromAccountId: pay.fromAccountId, toAccountId: debt.accountId, amount: remaining, date: pay.date, note: debt.name, debtId })
      : undefined;
    const purchaseExpenseId = spendNow && remaining > 0 ? addPurchaseExpense(debt, remaining, pay.date, pay.fromAccountId) : undefined;
    const expenseId = pay.extra > 0
      ? tx.addTransaction({ title: debt.name, date: pay.date, ...feeCategory('Interest'), amount: pay.extra, type: 'debit', accountId: pay.fromAccountId, debtId })
      : undefined;
    if (spendNow) tx.updateAccount(debt.accountId, { initialBalance: 0 });
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, status: 'done', settled: { date: pay.date, amount: round2(remaining + pay.extra), accountId: pay.fromAccountId, transferId, expenseId, purchaseExpenseId } } : d)),
    );
  }

  function repayCredit(debtId: string, pay: { date: string; amount: number; fromAccountId: string }) {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt || debt.kind !== 'credit' || !(pay.amount > 0)) return;
    tx.addTransfer({ fromAccountId: pay.fromAccountId, toAccountId: debt.accountId, amount: round2(pay.amount), date: pay.date, note: debt.name, debtId });
  }

  function updateDebt(id: string, patch: DebtPatch) {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    // The debt's own (hidden) account carries its name, so records and transfers show the new one too.
    tx.updateAccount(debt.accountId, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(debt.kind === 'credit' && patch.creditLimit !== undefined ? { creditLimit: patch.creditLimit } : {}),
      ...(debt.kind === 'credit' && patch.provider !== undefined ? { provider: patch.provider || undefined } : {}),
    });
  }

  /** Everything the debt wrote when it was created (the purchase, the loan money, the upfront fee). */
  function removeCreationRecords(debt: Debt) {
    tx.deleteTransactions(tx.transactions.filter((x) => x.debtId === debt.id).map((x) => x.id));
    tx.transfers.filter((x) => x.debtId === debt.id).forEach((x) => tx.deleteTransfer(x.id));
  }

  function reviseInstalment(id: string, input: InstalmentInput) {
    const old = debts.find((d) => d.id === id);
    if (!old || old.kind !== 'installment' || !canRevisePlan(old)) return;
    removeCreationRecords(old);
    const schedule0 = buildSchedule({ kind: 'installment', principal: input.principal, months: input.months, firstDue: input.firstDue, totalFee: input.totalFee });
    const debt: Debt = {
      ...old, name: input.name, provider: input.provider, payFromAccountId: input.payFromAccountId,
      principal: input.principal, months: input.months, startDate: input.startDate,
      categoryId: input.categoryId, subcategory: input.subcategory,
      schedule: markHistoricPaid(schedule0, input.paidCount, input.payFromAccountId), status: 'active', spendOn: 'pay',
    };
    tx.updateAccount(old.accountId, { name: input.name, initialBalance: -remainingPrincipal(debt) });
    setDebts((prev) => prev.map((d) => (d.id === id ? debt : d)));
  }

  function reviseLoan(id: string, input: LoanInput) {
    const old = debts.find((d) => d.id === id);
    if (!old || old.kind !== 'loan' || !canRevisePlan(old)) return;
    removeCreationRecords(old);
    const schedule0 = buildSchedule({
      kind: 'loan', principal: input.principal, months: input.months, firstDue: input.firstDue,
      ratePct: input.ratePct, rateType: input.rateType, monthlyPayment: input.monthlyPayment,
    });
    const debt: Debt = {
      ...old, name: input.name, provider: input.provider, payFromAccountId: input.payFromAccountId,
      principal: input.principal, months: input.months, ratePct: input.ratePct, rateType: input.rateType, startDate: input.startDate,
      schedule: markHistoricPaid(schedule0, input.paidCount, input.payFromAccountId), status: 'active',
    };
    tx.updateAccount(old.accountId, { name: input.name, initialBalance: input.paidCount > 0 ? -remainingPrincipal(debt) : 0 });
    if (input.paidCount === 0) {
      tx.addTransfer({ fromAccountId: old.accountId, toAccountId: input.receiveAccountId, amount: input.principal, date: input.startDate, note: input.name, debtId: id });
      if (input.upfrontFee > 0) {
        tx.addTransaction({
          title: input.name, date: input.startDate, ...feeCategory('Bank Fees'), amount: input.upfrontFee, type: 'debit',
          accountId: input.receiveAccountId, debtId: id,
        });
      }
    }
    setDebts((prev) => prev.map((d) => (d.id === id ? debt : d)));
  }

  function deleteDebt(id: string) {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    if (debt.kind === 'credit') {
      // The account (and its history) stays; it just stops being a credit line.
      tx.updateAccount(debt.accountId, { debtId: undefined, creditLimit: undefined });
      tx.transfers.filter((t) => t.debtId === id).forEach((t) => tx.updateTransfer(t.id, { debtId: undefined }));
    } else {
      tx.transfers.filter((t) => t.debtId === id).forEach((t) => tx.deleteTransfer(t.id));
      tx.deleteTransactions(tx.transactions.filter((t) => t.debtId === id).map((t) => t.id));
      tx.deleteAccount(debt.accountId);
    }
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }

  /**
   * Instalment debts made before 3.1.3 booked the whole price as spending on the day of purchase. Move them to
   * spending-on-payment once, here, as soon as everything is loaded (a debt that arrives later from another device is
   * handled the same way).
   */
  const converted = useRef(new Set<string>());
  useEffect(() => {
    if (!ready || !tx.ready) return;
    const todo = debts.filter((d) => d.kind === 'installment' && d.spendOn !== 'pay' && !converted.current.has(d.id));
    if (todo.length === 0) return;
    const next = new Map<string, Debt>();
    for (const d of todo) {
      converted.current.add(d.id);
      const plan = planPayMode(d, tx.transactions, tx.transfers);
      tx.deleteTransactions(plan.removeTransactionIds);
      plan.removeTransferIds.forEach((tid) => tx.deleteTransfer(tid));
      for (const e of plan.expenses) {
        if (tx.transactions.some((x) => x.id === e.id)) continue; // another device already made it
        tx.addTransaction({
          id: e.id, title: d.name, date: e.date, categoryId: d.categoryId ?? FALLBACK_EXPENSE_ID, subcategory: d.subcategory ?? '',
          amount: e.amount, type: 'debit', accountId: e.accountId, debtId: d.id,
        });
      }
      tx.updateAccount(d.accountId, { initialBalance: plan.balance });
      next.set(d.id, applyPayModePlan(d, plan));
    }
    setDebts((prev) => prev.map((d) => next.get(d.id) ?? d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tx.ready, debts]);

  return (
    <DebtsContext.Provider value={{ ready, debts, ious, addIou, updateIou, addIouPayment, removeIouPayment, deleteIou, createInstalment, createLoan, createCredit, payInstalment, undoPayment, settle, repayCredit, updateDebt, reviseInstalment, reviseLoan, deleteDebt }}>
      {children}
    </DebtsContext.Provider>
  );
}

export function useDebts() {
  const ctx = useContext(DebtsContext);
  if (!ctx) throw new Error('useDebts must be used within a DebtsProvider');
  return ctx;
}
