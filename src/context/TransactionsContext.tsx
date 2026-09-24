import { createContext, useContext, useState, ReactNode } from 'react';

export type TransactionType = 'debit' | 'credit';

export type Transaction = {
  id: string;
  title: string;
  date: string; // 'YYYY-MM-DD'
  categoryId: string;
  subcategory: string;
  amount: number; // always positive; sign comes from `type`
  type: TransactionType;
};

export type ChartPeriod = 'week' | 'month' | 'year';

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
  /** true when this point represents "today" (only ever set for week points) */
  isToday?: boolean;
};

type TransactionsContextValue = {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  balance: number;
  spentThisMonth: (categoryId: string) => number;
  recentTransactions: (count?: number) => Transaction[];
  /** weekOffset: 0 = the week containing today, -1 = the week before that, etc. */
  getWeekChartData: (weekOffset: number) => ChartPoint[];
  /** Jan -> Dec of the current year */
  getMonthChartData: () => ChartPoint[];
  /** one point per calendar year that has data (current year always included) */
  getYearChartData: () => ChartPoint[];
};

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

const initialTransactions: Transaction[] = [
  { id: '1', title: 'Groceries', date: '2026-09-20', categoryId: 'food', subcategory: 'Groceries', amount: 45.2, type: 'debit' },
  { id: '2', title: 'Salary', date: '2026-09-01', categoryId: 'income', subcategory: 'Salary', amount: 2500, type: 'credit' },
  { id: '3', title: 'Coffee', date: '2026-09-21', categoryId: 'food', subcategory: 'Coffee', amount: 4.5, type: 'debit' },
];

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
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  function addTransaction(t: Omit<Transaction, 'id'>) {
    setTransactions((prev) => [{ ...t, id: Date.now().toString() }, ...prev]);
  }

  const balance = transactions.reduce(
    (sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount),
    0
  );

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

  // Most recent transactions first, for the Home screen's short list.
  function recentTransactions(count = 10) {
    return [...transactions]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, count);
  }

  // Monday -> Sunday for the week `weekOffset` weeks away from the current one.
  // weekOffset 0 = this week, -1 = last week, -2 = the week before that, ...
  function getWeekChartData(weekOffset: number): ChartPoint[] {
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
        .filter((t) => t.type === 'debit' && t.date === key)
        .reduce((sum, t) => sum + t.amount, 0);
      points.push({ key, label: WEEKDAY_LABELS[i], value, isToday: key === todayKey });
    }
    return points;
  }

  // Jan -> Dec of the current year (each point is one month's total spend).
  function getMonthChartData(): ChartPoint[] {
    const year = new Date().getFullYear();
    const points: ChartPoint[] = MONTH_LABELS.map((label, i) => ({
      key: `${year}-${i}`,
      label,
      value: 0,
    }));

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (t.type === 'debit' && d.getFullYear() === year) {
        points[d.getMonth()].value += t.amount;
      }
    });
    return points;
  }

  // One point per calendar year that has transactions, plus the current year
  // even if it's still empty, sorted oldest -> newest (e.g. 2025, 2026).
  function getYearChartData(): ChartPoint[] {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear]);
    transactions.forEach((t) => years.add(new Date(t.date).getFullYear()));

    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => {
        const value = transactions
          .filter((t) => t.type === 'debit' && new Date(t.date).getFullYear() === year)
          .reduce((sum, t) => sum + t.amount, 0);
        return { key: String(year), label: String(year), value };
      });
  }

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        addTransaction,
        balance,
        spentThisMonth,
        recentTransactions,
        getWeekChartData,
        getMonthChartData,
        getYearChartData,
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