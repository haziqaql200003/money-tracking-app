import { createContext, ReactNode, useContext } from 'react';

import { FALLBACK_EXPENSE_ID } from '@/constants/categories';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionsContext';
import { toDateKey } from '@/utils/dates';
import { usePersistedState } from '@/hooks/use-persisted-state';
import {
  applyPayment,
  buildSchedule,
  markHistoricPaid,
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

type DebtsContextValue = {
  ready: boolean;
  debts: Debt[];
  createInstalment: (input: InstalmentInput) => void;
  createLoan: (input: LoanInput) => void;
  createCredit: (input: CreditInput) => void;
  payInstalment: (debtId: string, n: number, pay: { date: string; amount: number; fromAccountId: string }) => void;
  undoPayment: (debtId: string, n: number) => void;
  /** Pay off the whole remaining principal at once (plus any extra fee) and close the debt. */
  settle: (debtId: string, pay: { date: string; extra: number; fromAccountId: string }) => void;
  repayCredit: (debtId: string, pay: { date: string; amount: number; fromAccountId: string }) => void;
  updateDebt: (id: string, patch: { name?: string; provider?: string; dueDay?: number; creditLimit?: number; payFromAccountId?: string }) => void;
  deleteDebt: (id: string) => void;
};

const DebtsContext = createContext<DebtsContextValue | undefined>(undefined);

const FINANCIAL_ID = 'financial';

export function DebtsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [debts, setDebts, ready] = usePersistedState<Debt[]>('debts', [], user?.id ?? null);
  const tx = useTransactions();

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
      categoryId: input.categoryId, subcategory: input.subcategory, schedule, status: 'active',
    };
    if (input.paidCount > 0) {
      // Already running: only what is still owed goes on the books; the purchase was before WaKira.
      tx.updateAccount(accountId, { initialBalance: -remainingPrincipal(debt) });
    } else {
      tx.addTransaction({
        title: input.name, date: input.startDate, categoryId: input.categoryId ?? FALLBACK_EXPENSE_ID, subcategory: input.subcategory ?? '',
        amount: input.principal, type: 'debit', accountId, debtId: id,
      });
    }
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
    const transferId = principal > 0
      ? tx.addTransfer({ fromAccountId: pay.fromAccountId, toAccountId: debt.accountId, amount: principal, date: pay.date, note: debt.name, debtId })
      : undefined;
    const expenseId = extra > 0
      ? tx.addTransaction({
          title: debt.name, date: pay.date, ...feeCategory('Interest'), amount: extra, type: 'debit',
          accountId: pay.fromAccountId, debtId,
        })
      : undefined;
    setDebts((prev) => prev.map((d) => (d.id === debtId ? applyPayment(d, n, { date: pay.date, amount: round2(pay.amount), accountId: pay.fromAccountId, transferId, expenseId }) : d)));
  }

  function undoPayment(debtId: string, n: number) {
    const paid = debts.find((d) => d.id === debtId)?.schedule.find((s) => s.n === n)?.paid;
    if (!paid) return;
    if (paid.transferId) tx.deleteTransfer(paid.transferId);
    if (paid.expenseId) tx.deleteTransaction(paid.expenseId);
    setDebts((prev) => prev.map((d) => (d.id === debtId ? undoPaymentOn(d, n) : d)));
  }

  function settle(debtId: string, pay: { date: string; extra: number; fromAccountId: string }) {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt || debt.kind === 'credit') return;
    const remaining = remainingPrincipal(debt);
    const transferId = remaining > 0
      ? tx.addTransfer({ fromAccountId: pay.fromAccountId, toAccountId: debt.accountId, amount: remaining, date: pay.date, note: debt.name, debtId })
      : undefined;
    const expenseId = pay.extra > 0
      ? tx.addTransaction({ title: debt.name, date: pay.date, ...feeCategory('Interest'), amount: pay.extra, type: 'debit', accountId: pay.fromAccountId, debtId })
      : undefined;
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, status: 'done', settled: { date: pay.date, amount: round2(remaining + pay.extra), accountId: pay.fromAccountId, transferId, expenseId } } : d)),
    );
  }

  function repayCredit(debtId: string, pay: { date: string; amount: number; fromAccountId: string }) {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt || debt.kind !== 'credit' || !(pay.amount > 0)) return;
    tx.addTransfer({ fromAccountId: pay.fromAccountId, toAccountId: debt.accountId, amount: round2(pay.amount), date: pay.date, note: debt.name, debtId });
  }

  function updateDebt(id: string, patch: { name?: string; provider?: string; dueDay?: number; creditLimit?: number; payFromAccountId?: string }) {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    if (debt.kind === 'credit') {
      tx.updateAccount(debt.accountId, {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.creditLimit !== undefined ? { creditLimit: patch.creditLimit } : {}),
      });
    }
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

  return (
    <DebtsContext.Provider value={{ ready, debts, createInstalment, createLoan, createCredit, payInstalment, undoPayment, settle, repayCredit, updateDebt, deleteDebt }}>
      {children}
    </DebtsContext.Provider>
  );
}

export function useDebts() {
  const ctx = useContext(DebtsContext);
  if (!ctx) throw new Error('useDebts must be used within a DebtsProvider');
  return ctx;
}
