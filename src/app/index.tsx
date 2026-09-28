import { useMemo, useState } from 'react';
import { StyleSheet, FlatList, Pressable, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SpendingChart } from '@/components/spending-chart';
import { WeekChartPager } from '@/components/week-chart-pager';
import { TransactionRow } from '@/components/transaction-row';
import { useTransactions } from '@/context/TransactionsContext';
import type { ChartPeriod } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';
import { AccountModal } from '@/components/account-modal';
import { useProfile } from '@/context/ProfileContext';

const PERIODS: { key: ChartPeriod; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function HomeScreen() {
  const {
    balance,
    recentTransactions,
    getWeekChartData,
    getMonthChartData,
    getYearChartData,
    totalIncomeThisMonth,
    totalSpendingThisMonth,
  } = useTransactions();
  const colors = useTheme();
  const router = useRouter();

  const [period, setPeriod] = useState<ChartPeriod>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  const { displayName } = useProfile();
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  function showComingSoon() {
    Alert.alert('Notifications', 'Coming soon — this will show reminders and budget alerts.');
  }

  const weekData = useMemo(() => getWeekChartData(weekOffset), [getWeekChartData, weekOffset]);
  const monthData = useMemo(() => getMonthChartData(), [getMonthChartData]);
  const yearData = useMemo(() => getYearChartData(), [getYearChartData]);

  const chartData = period === 'week' ? weekData : period === 'month' ? monthData : yearData;
  const periodTotal = chartData.reduce((sum, p) => sum + p.value, 0);
  const recent = recentTransactions(6);

  const income = totalIncomeThisMonth();
  const spending = totalSpendingThisMonth();

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
              <View style={styles.headerRow}>
                <Pressable style={styles.headerLeft} onPress={() => setAccountModalVisible(true)}>
                  <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
                    <ThemedText style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</ThemedText>
                  </View>
                  <View>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Hi,
                    </ThemedText>
                    <ThemedText style={styles.appTitle}>{displayName}</ThemedText>
                  </View>
                </Pressable>

                <Pressable style={[styles.bellButton, { backgroundColor: colors.backgroundElement }]} onPress={showComingSoon}>
                  <ThemedText style={styles.bellIcon}>🔔</ThemedText>
                </Pressable>
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

                <View style={[styles.balanceSplitRow, { borderTopColor: colors.divider }]}>
                  <View style={styles.balanceSplitColumn}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Income this month
                    </ThemedText>
                    <ThemedText style={[styles.balanceSplitValue, { color: colors.positive }]}>
                      {formatMoney(income)}
                    </ThemedText>
                  </View>
                  <View style={[styles.balanceSplitColumn, styles.balanceSplitColumnRight]}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Spending this month
                    </ThemedText>
                    <ThemedText style={[styles.balanceSplitValue, { color: colors.negative }]}>
                      {formatMoney(spending)}
                    </ThemedText>
                  </View>
                </View>
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

              <View style={styles.recentHeaderRow}>
                <ThemedText type="smallBold" style={styles.recentHeading}>
                  Recent transactions
                </ThemedText>
                <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                    See all
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              No transactions yet — tap + below to add your first one.
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
        />

        <AccountModal
          visible={accountModalVisible}
          onClose={() => setAccountModalVisible(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  header: { paddingTop: Spacing.two, paddingBottom: Spacing.three },
  appTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', marginTop: 2 },
  balanceCard: { borderRadius: 16, padding: Spacing.four, marginBottom: Spacing.four },
  balanceAmount: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    marginTop: Spacing.one,
    includeFontPadding: false,
  },
  balanceSplitRow: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  balanceSplitColumn: { flex: 1 },
  balanceSplitColumnRight: { alignItems: 'flex-end' },
  balanceSplitValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  segmentTrack: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: Spacing.four },
  segmentButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentActiveText: { fontWeight: '600' },
  chartBlock: { marginBottom: Spacing.five },
  chartSpacing: { marginTop: Spacing.two },
  swipeHint: { textAlign: 'center', marginTop: 6, opacity: 0.7 },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  recentHeading: { fontSize: 16 },
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontWeight: '700' },
  bellButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bellIcon: { fontSize: 18 },
});