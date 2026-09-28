import { useMemo } from 'react';
import { StyleSheet, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryDonutChart } from '@/components/category-donut-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TransactionRow } from '@/components/transaction-row';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';

function formatSectionDate(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

export default function TransactionsScreen() {
  const { transactions, categoryBreakdownThisMonth, totalIncomeThisMonth, totalSpendingThisMonth } =
    useTransactions();
  const colors = useTheme();

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions],
  );

  const sections = useMemo(() => {
    const groups = new Map<string, typeof sorted>();
    sorted.forEach((t) => {
      const list = groups.get(t.date) ?? [];
      list.push(t);
      groups.set(t.date, list);
    });
    return Array.from(groups.entries()).map(([date, data]) => ({
      title: date,
      net: data.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0),
      data,
    }));
  }, [sorted]);

  const breakdown = categoryBreakdownThisMonth();
  const income = totalIncomeThisMonth();
  const spending = totalSpendingThisMonth();
  const net = income - spending;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {formatSectionDate(section.title)}
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: section.net < 0 ? colors.negative : colors.positive, fontWeight: '600' }}
              >
                {formatMoney(section.net, { signed: true, type: section.net < 0 ? 'debit' : 'credit' })}
              </ThemedText>
            </View>
          )}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <ThemedText type="title" style={styles.heading}>
                  Transactions
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  This month
                </ThemedText>
              </View>

              {spending > 0 && (
                <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="smallBold" style={{ marginBottom: Spacing.three }}>
                    Where it went
                  </ThemedText>
                  <CategoryDonutChart slices={breakdown} total={spending} />

                  <View style={[styles.summaryRow, { borderTopColor: colors.divider }]}>
                    <View style={styles.summaryColumn}>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>In</ThemedText>
                      <ThemedText style={[styles.summaryValue, { color: colors.positive }]}>{formatMoney(income)}</ThemedText>
                    </View>
                    <View style={styles.summaryColumn}>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>Out</ThemedText>
                      <ThemedText style={[styles.summaryValue, { color: colors.negative }]}>{formatMoney(spending)}</ThemedText>
                    </View>
                    <View style={styles.summaryColumn}>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>Net</ThemedText>
                      <ThemedText style={styles.summaryValue}>
                        {formatMoney(net, { signed: true, type: net < 0 ? 'debit' : 'credit' })}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              No transactions yet — tap + to add one.
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />

        <Pressable
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
        >
          <ThemedText style={styles.fabText}>No transactions yet — tap + below to add one.</ThemedText>
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
  card: { borderRadius: 16, padding: Spacing.four, marginBottom: Spacing.four },
  summaryRow: {
    flexDirection: 'row',
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryColumn: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
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