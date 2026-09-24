import { StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import type { Transaction } from '@/context/TransactionsContext';
import { formatMoney } from '@/utils/currency';

export function TransactionRow({ item }: { item: Transaction }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const category = CATEGORIES.find((c) => c.id === item.categoryId);

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText style={styles.avatarLetter}>
          {(category?.name ?? item.subcategory).charAt(0).toUpperCase()}
        </ThemedText>
      </View>

      <View style={styles.details}>
        <ThemedText numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {formatDate(item.date)} · {item.subcategory}
        </ThemedText>
      </View>

      <ThemedText
        style={{ color: item.type === 'debit' ? colors.negative : colors.positive, fontWeight: '600' }}
      >
        {formatMoney(item.amount, { signed: true, type: item.type })}
      </ThemedText>
    </View>
  );
}

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontWeight: '600' },
  details: { flex: 1 },
});