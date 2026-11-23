import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/category-icon';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing, tabularNums } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategories } from '@/context/CategoriesContext';
import type { Transaction } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { formatMoney } from '@/utils/currency';
import { useT } from '@/i18n';
import { accountName, categoryName, subcategoryName } from '@/i18n/data';
import { isAdjustmentEntry, isDebtEntry, isLinkedEntry, isPlainTransferEntry, savedTransferId, transferDirection } from '@/utils/saved';

type Props = {
  item: Transaction;
  showAccount?: boolean;
  hidden?: boolean;
  onPress?: () => void;
  /** Last row of a card: no divider underneath. */
  last?: boolean;
  /**
   * The account the list is showing, if one is picked. A transfer then reads from that account's side:
   * "+RM 100 · From Maybank" when the money arrives, "−RM 100 · To Ryt" when it leaves (3.9.0).
   */
  viewAccountId?: string | null;
};

export function TransactionRow({ item, showAccount = true, hidden = false, onPress, last, viewAccountId }: Props) {
  const { t, tp } = useT();
  const colors = useTheme();
  const { getCategory } = useCategories();
  const category = getCategory(item.categoryId);
  const { accounts, transfers } = useTransactions();
  const account = accounts.find((a) => a.id === item.accountId);
  const adjustment = isAdjustmentEntry(item);
  const transfer = isLinkedEntry(item);
  const plain = isPlainTransferEntry(item);
  const transferRec = transfer ? transfers.find((tr) => tr.id === savedTransferId(item)) : undefined;
  const fromAccount = accounts.find((a) => a.id === transferRec?.fromAccountId);
  const toAccount = accounts.find((a) => a.id === transferRec?.toAccountId);
  const direction = transfer ? transferDirection(transferRec, viewAccountId) : 'between';

  // Transfers are never income or spending: green "+" only for money arriving in the account you are looking at,
  // a plain "−" for money leaving it, and no sign at all when looking at every account together.
  const amountColor = adjustment
    ? item.type === 'debit'
      ? colors.negative
      : colors.positive
    : transfer
      ? direction === 'in'
        ? colors.positive
        : direction === 'out'
          ? colors.text
          : isDebtEntry(item)
            ? colors.textSecondary
            : colors.accent
      : item.type === 'debit'
        ? colors.negative
        : colors.positive;
  const amountText = hidden
    ? 'RM ••••'
    : transfer
      ? direction === 'in'
        ? `+${formatMoney(item.amount)}`
        : direction === 'out'
          ? `−${formatMoney(item.amount)}`
          : formatMoney(item.amount)
      : formatMoney(item.amount, { signed: true, type: item.type });

  const transferSub =
    fromAccount && toAccount
      ? direction === 'in'
        ? t('tx.transfer.rowFrom', { account: accountName(fromAccount) })
        : direction === 'out'
          ? t('tx.transfer.rowTo', { account: accountName(toAccount) })
          : t('tx.transfer.between', { from: accountName(fromAccount), to: accountName(toAccount) })
      : '';

  const subtitle = adjustment
    ? [item.title ? t('acct.adj.rowTitle') : '', account ? accountName(account) : ''].filter(Boolean).join(' · ')
    : plain
      ? transferSub
      : (item.subcategory ? subcategoryName(item.subcategory) : '') || (category ? categoryName(category) : '') || t('home.row.uncategorized');

  const title =
    item.title ||
    (adjustment ? t('acct.adj.rowTitle') : plain ? t('tx.transfer.rowTitle') : transfer ? t(isDebtEntry(item) ? 'tx.saved.debtTitle' : 'tx.saved.rowTitle') : '');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}
    >
      {adjustment ? (
        <CategoryIcon icon="swap-vertical" color={colors.accent} />
      ) : plain ? (
        <CategoryIcon icon={direction === 'in' ? 'arrow-down' : direction === 'out' ? 'arrow-up' : 'swap-horizontal'} color={colors.accent} />
      ) : (
        <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? colors.textSecondary} />
      )}

      <View style={[styles.body, !last && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={styles.details}>
          <ThemedText numberOfLines={1}>{title}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={2}>
            {subtitle}
            {adjustment || plain ? '' : transfer && transferSub ? ` · ${transferSub}` : showAccount && account ? ` · ${accountName(account)}` : ''}
            {item.items && item.items.length > 0 ? ` · ${tp('home.row.items', item.items.length)}` : ''}
            {item.recurringId ? ` · ${t('home.row.recurring')}` : ''}
            {item.taxReliefId ? ` · ${t('tax.row.tag')}` : ''}
          </ThemedText>
        </View>

        <ThemedText style={[styles.amount, { color: amountColor }]} numberOfLines={1}>
          {amountText}
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
