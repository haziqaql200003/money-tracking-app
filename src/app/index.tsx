import { useMemo, useState } from 'react';
import { StyleSheet, FlatList, Pressable, View, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { BalanceCarousel } from '@/components/balance-carousel';
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
  const { recentTransactions, getWeekChartData, getMonthChartData, getYearChartData } = useTransactions();
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
                  <Text style={[styles.greeting, { color: colors.textSecondary }]} numberOfLines={1}>
                    Hi, <Text style={[styles.greetingName, { color: colors.text }]}>{displayName}</Text>
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.bellButton, { backgroundColor: colors.backgroundElement }]}
                  onPress={showComingSoon}
                >
                  <ThemedText style={styles.bellIcon}>🔔</ThemedText>
                </Pressable>
              </View>

              <BalanceCarousel />

              <View style={[styles.segmentTrack, { backgroundColor: colors.backgroundElement }]}>
                {PERIODS.map((p) => (
                  <Pressable
                    key={p.key}
                    style={[styles.segmentButton, period === p.key && { backgroundColor: colors.background }]}
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

        <AccountModal visible={accountModalVisible} onClose={() => setAccountModalVisible(false)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: 130 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontWeight: '700' },
  greeting: { fontSize: 28, lineHeight: 34, fontWeight: '400', flexShrink: 1 },
  greetingName: { fontWeight: '700' },
  bellButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bellIcon: { fontSize: 18 },
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
});