import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountBarChart } from '@/components/account-bar-chart';
import { AddAccountModal } from '@/components/add-account-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Account } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';

export default function AssetsScreen() {
  const { accountBalances, balance } = useTransactions();
  const colors = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const accounts = accountBalances();

  function openAdd() {
    setEditingAccount(null);
    setModalVisible(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setModalVisible(true);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.heading}>
            Assets
          </ThemedText>
        </View>

        <View style={[styles.totalCard, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            Total across all accounts
          </ThemedText>
          <ThemedText style={styles.totalAmount}>{formatMoney(balance)}</ThemedText>
        </View>

        <View style={styles.chartBlock}>
          <AccountBarChart data={accounts} />
        </View>

        <ThemedText type="smallBold" style={styles.listHeading}>
          Accounts
        </ThemedText>

        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.accountRow, { borderBottomColor: colors.divider }]}
              onPress={() => openEdit(item)}
            >
              <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText style={styles.avatarIcon}>{item.icon}</ThemedText>
              </View>
              <View style={styles.details}>
                <ThemedText>{item.name}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {item.type === 'bank' ? 'Bank' : item.type === 'cash' ? 'Cash' : 'Other'}
                </ThemedText>
              </View>
              <ThemedText style={{ fontWeight: '600', color: item.balance < 0 ? colors.negative : colors.text }}>
                {formatMoney(item.balance)}
              </ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              No accounts yet — tap + to add Bank or Cash.
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
        />

        <Pressable
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={openAdd}
          accessibilityRole="button"
          accessibilityLabel="Add account"
        >
          <ThemedText style={styles.fabText}>+</ThemedText>
        </Pressable>

        <AddAccountModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          editingAccount={editingAccount}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  header: { paddingVertical: Spacing.three },
  heading: { fontSize: 34, lineHeight: 40 },
  totalCard: { borderRadius: 16, padding: Spacing.four, marginBottom: Spacing.four },
  totalAmount: { fontSize: 30, lineHeight: 36, fontWeight: '700', marginTop: Spacing.one },
  chartBlock: { marginBottom: Spacing.five },
  listHeading: { fontSize: 16, marginBottom: Spacing.two },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: 20 },
  details: { flex: 1 },
  listContent: { paddingBottom: 100 },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.five,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '500', marginTop: -2 },
});