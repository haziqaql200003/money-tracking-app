import { createContext, useContext, useState, ReactNode } from 'react';

import type { CardDesign } from '@/constants/card-styles';
import type { IconName } from '@/constants/categories';
import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';


export type TransactionType = 'debit' | 'credit';

export type AccountType = 'bank' | 'cash' | 'other';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  icon: IconName;
  initialBalance: number; // starting balance before any tracked transactions
  // Card look + optional details (all optional so older accounts keep working)
  color?: string; // hex, e.g. '#2563EB'
  design?: CardDesign;
  provider?: string; // e.g. 'Maybank', 'TNG eWallet'
  last4?: string; // last 4 digits only, never a full number
};

export type TransactionItem = { id: string; label: string; amount: number };

export type Transaction = {
  id: string;
  title: string;
  date: string;
  categoryId: string;
  subcategory: string;
  amount: number;
  type: TransactionType;
  accountId: string;
  /** Optional line items, e.g. Nasi Lemak RM5, Service Charge RM0.50. */
  items?: TransactionItem[];
};

export type ChartPeriod = 'week' | 'month' | 'year';

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
  /** true when this point represents "today" (only ever set for week points) */
  isToday?: boolean;
  isFuture?: boolean;
};

type TransactionsContextValue = {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  reassignCategory: (fromId: string, toId: string) => void;
  balance: number;
  spentThisMonth: (categoryId: string) => number;
  totalIncomeThisMonth: () => number;
  totalSpendingThisMonth: () => number;
  categoryBreakdownThisMonth: () => { categoryId: string; value: number; percent: number }[];
  /** Pass `accountId` to limit the list to one account (omit for all accounts). */
  recentTransactions: (count?: number, accountId?: string) => Transaction[];
  /** weekOffset: 0 = the week containing today, -1 = the week before that, etc. `accountId` limits to one account. */
  getWeekChartData: (weekOffset: number, accountId?: string) => ChartPoint[];
  /** Jan -> Dec of the current year */
  getMonthChartData: (accountId?: string) => ChartPoint[];
  /** one point per calendar year that has data (current year always included) */
  getYearChartData: (accountId?: string) => ChartPoint[];

  // Accounts (bank, cash, etc.)
  accounts: Account[];
  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, patch: Partial<Omit<Account, 'id'>>) => void;
  /** Deletes the account and any transactions tied to it. */
  deleteAccount: (id: string) => void;
  accountBalance: (accountId: string) => number;
  /** Every account paired with its current computed balance — handy for the Assets tab. */
  accountBalances: () => (Account & { balance: number })[];

  resetAllData: () => void;
};

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

const initialAccounts: Account[] = [
  { id: 'bank', name: 'Bank', type: 'bank', icon: 'business', initialBalance: 0 },
  { id: 'cash', name: 'Cash', type: 'cash', icon: 'cash', initialBalance: 0 },
];

const initialTransactions: Transaction[] = [];

// Monday-first, matching how the week chart is laid out.
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Local-date key (avoids the UTC-shift you get from toISOString() near midnight).
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Monday of the week containing `d`.
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = usePersistedState<Transaction[]>('transactions', initialTransactions, user?.id ?? null);
  const [accounts, setAccounts] = usePersistedState<Account[]>('accounts', initialAccounts, user?.id ?? null);

  function addTransaction(t: Omit<Transaction, 'id'>) {
    setTransactions((prev) => [{ ...t, id: Date.now().toString() }, ...prev]);
  }

  function updateTransaction(id: string, patch: Partial<Omit<Transaction, 'id'>>) {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function deleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  function reassignCategory(fromId: string, toId: string) {
    setTransactions((prev) => prev.map((t) => (t.categoryId === fromId ? { ...t, categoryId: toId } : t)));
  }

  function addAccount(a: Omit<Account, 'id'>) {
    setAccounts((prev) => [...prev, { ...a, id: Date.now().toString() }]);
  }

  function updateAccount(id: string, patch: Partial<Omit<Account, 'id'>>) {
    setAccounts((prev) => prev.map((acc) => (acc.id === id ? { ...acc, ...patch } : acc)));
  }

  function deleteAccount(id: string) {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    setTransactions((prev) => prev.filter((t) => t.accountId !== id));
  }

  function accountBalance(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    const base = account?.initialBalance ?? 0;
    return transactions
      .filter((t) => t.accountId === accountId)
      .reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), base);
  }

  function accountBalances() {
    return accounts.map((a) => ({ ...a, balance: accountBalance(a.id) }));
  }

  const balance = accounts.reduce((sum, a) => sum + accountBalance(a.id), 0);

  function spentThisMonth(categoryId: string) {
    const now = new Date();
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return (
          t.categoryId === categoryId &&
          t.type === 'debit' &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function totalIncomeThisMonth() {
    const now = new Date();
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return t.type === 'credit' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function totalSpendingThisMonth() {
    const now = new Date();
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return t.type === 'debit' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }

  // Most recent transactions first, for the Home screen's short list.
  function recentTransactions(count = 10, accountId?: string) {
    return transactions
      .filter((t) => !accountId || t.accountId === accountId)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, count);
  }

  function categoryBreakdownThisMonth() {
    const now = new Date();
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return t.type === 'debit' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totals = new Map<string, number>();
    monthTxns.forEach((t) => {
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    });
    const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);

    return Array.from(totals.entries())
      .map(([categoryId, value]) => ({ categoryId, value, percent: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }

  // Monday -> Sunday for the week `weekOffset` weeks away from the current one.
  // weekOffset 0 = this week, -1 = last week, -2 = the week before that, ...
  function getWeekChartData(weekOffset: number, accountId?: string): ChartPoint[] {
    const now = new Date();
    const todayKey = toDateKey(now);
    const monday = startOfWeek(now);
    monday.setDate(monday.getDate() + weekOffset * 7);

    const points: ChartPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = toDateKey(d);
      const value = transactions
        .filter((t) => t.type === 'debit' && t.date === key && (!accountId || t.accountId === accountId))
        .reduce((sum, t) => sum + t.amount, 0);
      points.push({ key, label: WEEKDAY_LABELS[i], value, isToday: key === todayKey, isFuture: key > todayKey });
    }
    return points;
  }

  // Jan -> Dec of the current year (each point is one month's total spend).
  function getMonthChartData(accountId?: string): ChartPoint[] {
    const now = new Date();
    const year = now.getFullYear();
    const points: ChartPoint[] = MONTH_LABELS.map((label, i) => ({
      key: `${year}-${i}`,
      label,
      value: 0,
      isFuture: i > now.getMonth(),
    }));

    transactions.forEach((t) => {
      if (accountId && t.accountId !== accountId) return;
      const d = new Date(t.date);
      if (t.type === 'debit' && d.getFullYear() === year) {
        points[d.getMonth()].value += t.amount;
      }
    });
    return points;
  }

  // One point per calendar year that has transactions, plus the current year
  // even if it's still empty, sorted oldest -> newest (e.g. 2025, 2026).
  function getYearChartData(accountId?: string): ChartPoint[] {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear]);
    transactions.forEach((t) => years.add(new Date(t.date).getFullYear()));

    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => {
        const value = transactions
          .filter(
            (t) =>
              t.type === 'debit' &&
              new Date(t.date).getFullYear() === year &&
              (!accountId || t.accountId === accountId),
          )
          .reduce((sum, t) => sum + t.amount, 0);
        return { key: String(year), label: String(year), value };
      });
  }

  function resetAllData() {
    setTransactions(initialTransactions);
    setAccounts(initialAccounts);
  }

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        reassignCategory,
        balance,
        spentThisMonth,
        categoryBreakdownThisMonth,
        totalIncomeThisMonth,
        totalSpendingThisMonth,
        recentTransactions,
        getWeekChartData,
        getMonthChartData,
        getYearChartData,
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        accountBalance,
        accountBalances,
        resetAllData,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}