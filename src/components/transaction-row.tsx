import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import type { Transaction } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { formatMoney } from '@/utils/currency';
import { useT } from '@/i18n';
import { accountName, categoryName, subcategoryName } from '@/i18n/data';

type Props = {
  item: Transaction;
  showAccount?: boolean;
  hidden?: boolean;
  onPress?: () => void;
};

export function TransactionRow({ item, showAccount = true, hidden = false, onPress }: Props) {
  const { t, tp } = useT();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { getCategory } = useCategories();
  const category = getCategory(item.categoryId);
  const { accounts } = useTransactions();
  const account = accounts.find((a) => a.id === item.accountId);

  const amountColor = item.type === 'debit' ? colors.negative : colors.positive;
  const subtitle = (item.subcategory ? subcategoryName(item.subcategory) : '') ||
    (category ? categoryName(category) : '') ||
    t('home.row.uncategorized');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.divider }, pressed && { opacity: 0.6 }]}
    >
      <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? '#8E8E93'} />

      <View style={styles.details}>
        <ThemedText numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
          {subtitle}
          {showAccount && account ? ` · ${accountName(account)}` : ''}
          {item.items && item.items.length > 0 ? ` · ${tp('home.row.items', item.items.length)}` : ''}
          {item.recurringId ? ` · ${t('home.row.recurring')}` : ''}
        </ThemedText>
      </View>

      <ThemedText style={{ color: amountColor, fontWeight: '700' }}>
        {hidden ? 'RM ••••' : formatMoney(item.amount, { signed: true, type: item.type })}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  details: { flex: 1 },
});