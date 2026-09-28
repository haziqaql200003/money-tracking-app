import { StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import type { Transaction } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { formatMoney } from '@/utils/currency';

export function TransactionRow({ item }: { item: Transaction }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const category = CATEGORIES.find((c) => c.id === item.categoryId);
  const { accounts } = useTransactions();
  const account = accounts.find((a) => a.id === item.accountId);

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText style={styles.avatarIcon}>{category?.icon ?? '💳'}</ThemedText>
      </View>

      <View style={styles.details}>
        <ThemedText numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
          {item.subcategory} · {formatDate(item.date)}
          {account ? ` · ${account.name}` : ''}
        </ThemedText>
      </View>

      <ThemedText
        style={{ color: item.type === 'debit' ? colors.negative : colors.positive, fontWeight: '700' }}
      >
        {formatMoney(item.amount, { signed: true, type: item.type })}
      </ThemedText>
    </View>
  );
}

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: 20 },
  details: { flex: 1 },
});