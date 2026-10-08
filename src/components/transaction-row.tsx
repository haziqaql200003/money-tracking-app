import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import type { Transaction } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { formatMoney } from '@/utils/currency';
import { useT } from '@/i18n';
import { accountName, categoryName, subcategoryName } from '@/i18n/data';
import { isDebtEntry, isLinkedEntry, savedTransferId } from '@/utils/saved';

type Props = {
  item: Transaction;
  showAccount?: boolean;
  hidden?: boolean;
  onPress?: () => void;
  /** Last row of a card: no divider underneath. */
  last?: boolean;
};

export function TransactionRow({ item, showAccount = true, hidden = false, onPress, last }: Props) {
  const { t, tp } = useT();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { getCategory } = useCategories();
  const category = getCategory(item.categoryId);
  const { accounts, transfers } = useTransactions();
  const account = accounts.find((a) => a.id === item.accountId);
  const saved = isLinkedEntry(item);
  const savedTransfer = saved ? transfers.find((tr) => tr.id === savedTransferId(item)) : undefined;
  const toAccount = accounts.find((a) => a.id === savedTransfer?.toAccountId);

  const amountColor = saved ? (isDebtEntry(item) ? colors.textSecondary : colors.accent) : item.type === 'debit' ? colors.negative : colors.positive;
  const subtitle = (item.subcategory ? subcategoryName(item.subcategory) : '') ||
    (category ? categoryName(category) : '') ||
    t('home.row.uncategorized');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}
    >
      <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? colors.textSecondary} />

      <View style={[styles.body, !last && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.details}>
        <ThemedText numberOfLines={1}>{item.title || (saved ? t(isDebtEntry(item) ? 'tx.saved.debtTitle' : 'tx.saved.rowTitle') : '')}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
          {subtitle}
          {saved && account && toAccount ? ` · ${t('tx.saved.rowSub', { from: accountName(account), to: accountName(toAccount) })}` : showAccount && account ? ` · ${accountName(account)}` : ''}
          {item.items && item.items.length > 0 ? ` · ${tp('home.row.items', item.items.length)}` : ''}
          {item.recurringId ? ` · ${t('home.row.recurring')}` : ''}
        </ThemedText>
      </View>

      <ThemedText style={[styles.amount, { color: amountColor }]} numberOfLines={1}>
        {hidden ? 'RM ••••' : saved ? formatMoney(item.amount) : formatMoney(item.amount, { signed: true, type: item.type })}
      </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Sits inside a card: the divider starts after the icon, like iOS grouped lists.
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: Spacing.three },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 12, paddingRight: Spacing.three, minHeight: 64 },
  details: { flex: 1 },
  amount: { fontWeight: '700', ...tabularNums },
});