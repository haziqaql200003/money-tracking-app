import type { Transaction } from '@/context/TransactionsContext';

export function toCsv(
  rows: Transaction[],
  accountName: (id: string) => string,
  categoryName: (id: string) => string,
) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Date', 'Title', 'Category', 'Subcategory', 'Account', 'Type', 'Amount'];
  const lines = rows.map((t) =>
    [
      t.date,
      t.title,
      categoryName(t.categoryId),
      t.subcategory,
      accountName(t.accountId),
      t.type === 'credit' ? 'Income' : 'Expense',
      t.amount.toFixed(2),
    ]
      .map(esc)
      .join(','),
  );
  return [header.map(esc).join(','), ...lines].join('\n');
}