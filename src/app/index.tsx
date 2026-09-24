import { useMemo, useState } from 'react';
import { StyleSheet, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SpendingChart } from '@/components/spending-chart';
import { WeekChartPager } from '@/components/week-chart-pager';
import { TransactionRow } from '@/components/transaction-row';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import { useTransactions } from '@/context/TransactionsContext';
import type { ChartPeriod } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';

const PERIODS: { key: ChartPeriod; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function HomeScreen() {
  const { balance, recentTransactions, getWeekChartData, getMonthChartData, getYearChartData, addTransaction } =
    useTransactions();
  const colors = useTheme();

  const [period, setPeriod] = useState<ChartPeriod>('week');
  const [modalVisible, setModalVisible] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekData = useMemo(() => getWeekChartData(weekOffset), [getWeekChartData, weekOffset]);
  const monthData = useMemo(() => getMonthChartData(), [getMonthChartData]);
  const yearData = useMemo(() => getYearChartData(), [getYearChartData]);

  const chartData = period === 'week' ? weekData : period === 'month' ? monthData : yearData;
  const periodTotal = chartData.reduce((sum, p) => sum + p.value, 0);
  const recent = recentTransactions(10);

  const weekRangeLabel =
    weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`;

  const currentYear = new Date().getFullYear();
  const captionLabel =
    period === 'week'
      ? weekRangeLabel
      : period === 'month'
        ? `Spent in ${currentYear}`
        : yearData.length > 1
          ? `Total, ${yearData[0].label}–${yearData[yearData.length - 1].label}`
          : `Total, ${yearData[0]?.label ?? currentYear}`;

  function selectPeriod(key: ChartPeriod) {
    setPeriod(key);
    if (key === 'week') setWeekOffset(0);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={recent}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Overview
                  </ThemedText>
                  <ThemedText style={styles.appTitle}>Money Tracker</ThemedText>
                </View>
              </View>

              <View style={[styles.balanceCard, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Current balance
                </ThemedText>
                <ThemedText
                  style={styles.balanceAmount}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {formatMoney(balance)}
                </ThemedText>
              </View>

              <View style={[styles.segmentTrack, { backgroundColor: colors.backgroundElement }]}>
                {PERIODS.map((p) => (
                  <Pressable
                    key={p.key}
                    style={[
                      styles.segmentButton,
                      period === p.key && { backgroundColor: colors.background },
                    ]}
                    onPress={() => selectPeriod(p.key)}
                  >
                    <ThemedText
                      type="small"
                      style={period === p.key ? styles.segmentActiveText : { color: colors.textSecondary }}
                    >
                      {p.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <View style={styles.chartBlock}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {captionLabel} · {formatMoney(periodTotal)}
                </ThemedText>
                <View style={styles.chartSpacing}>
                  {period === 'week' ? (
                    <WeekChartPager onWeekChange={setWeekOffset} />
                  ) : (
                    <SpendingChart data={chartData} period={period} />
                  )}
                </View>
                {period === 'week' && (
                  <ThemedText type="small" style={[styles.swipeHint, { color: colors.textSecondary }]}>
                    Swipe left to see previous weeks
                  </ThemedText>
                )}
              </View>

              <ThemedText type="smallBold" style={styles.recentHeading}>
                Recent transactions
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              No transactions yet — tap Record to add your first one.
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
        />

        <Pressable
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Record transaction"
        >
          <ThemedText style={styles.fabText}>Record</ThemedText>
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
  header: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  appTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    marginTop: 2,
  },
  balanceCard: {
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  balanceAmount: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    marginTop: Spacing.one,
    includeFontPadding: false,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: Spacing.four,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActiveText: { fontWeight: '600' },
  chartBlock: { marginBottom: Spacing.five },
  chartSpacing: { marginTop: Spacing.two },
  swipeHint: { textAlign: 'center', marginTop: 6, opacity: 0.7 },
  recentHeading: { fontSize: 16, marginBottom: Spacing.two },
  listContent: { paddingBottom: 100 },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
