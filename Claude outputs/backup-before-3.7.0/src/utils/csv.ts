import { t } from '@/i18n';
import { subcategoryName } from '@/i18n/data';
import type { Transaction } from '@/context/TransactionsContext';

export function toCsv(
  rows: Transaction[],
  accountName: (id: string) => string,
  categoryName: (id: string) => string,
) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = [
    t('common.date'),
    t('common.title'),
    t('common.category'),
    t('tx.csv.subcategory'),
    t('common.account'),
    t('tx.csv.type'),
    t('common.amount'),
  ];
  const lines = rows.map((row) =>
    [
      row.date,
      row.title,
      categoryName(row.categoryId),
      subcategoryName(row.subcategory),
      accountName(row.accountId),
      row.type === 'credit' ? t('common.income') : t('common.expense'),
      row.amount.toFixed(2),
    ]
      .map(esc)
      .join(','),
  );
  return [header.map(esc).join(','), ...lines].join('\n');
}
