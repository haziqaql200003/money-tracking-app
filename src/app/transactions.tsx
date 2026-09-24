import { useState } from 'react';
import { StyleSheet, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddTransactionModal } from '@/components/add-transaction-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TransactionRow } from '@/components/transaction-row';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';

export default function TransactionsScreen() {
  const { transactions, addTransaction } = useTransactions();
  const colors = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.heading}>
            Transactions
          </ThemedText>
        </View>
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} />}
          ListEmptyComponent={
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              No transactions yet — tap + to add one.
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
        />

        <Pressable
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
        >
          <ThemedText style={styles.fabText}>+</ThemedText>
        </Pressable>

        <AddTransactionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={addTransaction}
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
