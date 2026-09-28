import type { Transaction } from '@/context/TransactionsContext';

export type BudgetStatus = 'ok' | 'warn' | 'over';

/** Total spending (debits) per category for a 'YYYY-MM' month. */
export function spentByCategory(transactions: Transaction[], monthKey: string) {
  const map = new Map<string, number>();
  transactions.forEach((t) => {
    if (t.type !== 'debit' || !t.date.startsWith(monthKey)) return;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  });
  return map;
}

export function budgetStatus(spent: number, limit: number, warnPercent: number): BudgetStatus {
  if (limit <= 0) return 'ok';
  if (spent > limit) return 'over';
  if (spent / limit >= warnPercent / 100) return 'warn';
  return 'ok';
}