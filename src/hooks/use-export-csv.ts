import { Alert, Share } from 'react-native';

import { useCategories } from '@/context/CategoriesContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useT } from '@/i18n';
import { accountName, categoryName } from '@/i18n/data';
import { toCsv } from '@/utils/csv';

/** Every transaction as a CSV file through the share sheet (save to Files or Drive, or send it). */
export function useExportCsv() {
  const { t } = useT();
  const { transactions, accounts } = useTransactions();
  const { getCategory } = useCategories();

  return async function exportCsv() {
    if (transactions.length === 0) {
      Alert.alert(t('more.settings.exportEmptyTitle'), t('more.settings.exportEmptyMsg'));
      return;
    }
    const csv = toCsv(
      [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
      (id) => {
        const a = accounts.find((x) => x.id === id);
        return a ? accountName(a) : id;
      },
      (id) => {
        const c = getCategory(id);
        return c ? categoryName(c) : id;
      },
    );
    try {
      await Share.share({ message: csv, title: 'transactions.csv' /* i18n-ignore */ });
    } catch {
      // sheet dismissed
    }
  };
}
