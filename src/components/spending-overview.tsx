import { useState } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { SpendingChart, PERIOD_COLOR } from '@/components/spending-chart';
import { ThemedText } from '@/components/themed-text';
import { WeekChartPager } from '@/components/week-chart-pager';
import { Spacing } from '@/constants/theme';
import type { ChartPeriod, ChartPoint } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';

const PERIODS: { key: ChartPeriod; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const STAT_LABELS: Record<ChartPeriod, { average: string; peak: string }> = {
  week: { average: 'Daily average', peak: 'Highest day' },
  month: { average: 'Monthly average', peak: 'Highest month' },
  year: { average: 'Yearly average', peak: 'Highest year' },
};

const sum = (points: ChartPoint[]) => points.reduce((total, p) => total + p.value, 0);

type Props = {
  /** Limit everything to one account (omit for all accounts). */
  accountId?: string;
  /** Shown next to the caption so it's clear whose spending this is. */
  accountName?: string;
};

export function SpendingOverview({ accountId, accountName }: Props) {
  const colors = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { getWeekChartData, getMonthChartData, getYearChartData } = useTransactions();

  const [period, setPeriod] = useState<ChartPeriod>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  const accent = PERIOD_COLOR[period][isDark ? 'dark' : 'light'];

  const chartData =
    period === 'week'
      ? getWeekChartData(weekOffset, accountId)
      : period === 'month'
        ? getMonthChartData(accountId)
        : getYearChartData(accountId);

  const total = sum(chartData);
  const elapsed = chartData.filter((p) => !p.isFuture);
  const average = elapsed.length > 0 ? total / elapsed.length : 0;
  const peak = chartData.reduce<ChartPoint | null>((best, p) => (p.value > (best?.value ?? 0) ? p : best), null);

  // Week only: compare like-for-like with the week before (same number of days when the week isn't over yet).
  let deltaPercent: number | null = null;
  if (period === 'week') {
    const previous = getWeekChartData(weekOffset - 1, accountId).slice(0, elapsed.length);
    const previousTotal = sum(previous);
    if (previousTotal > 0) deltaPercent = ((total - previousTotal) / previousTotal) * 100;
  }

  const currentYear = new Date().getFullYear();
  const weekLabel =
    weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`;
  const baseCaption =
    period === 'week'
      ? weekLabel
      : period === 'month'
        ? `Spent in ${currentYear}`
        : chartData.length > 1
          ? `${chartData[0].label}–${chartData[chartData.length - 1].label}`
          : `${chartData[0]?.label ?? currentYear}`;
  const caption = accountName ? `${baseCaption} · ${accountName}` : baseCaption;

  function selectPeriod(key: ChartPeriod) {
    setPeriod(key);
    if (key === 'week') setWeekOffset(0);
  }

  const up = deltaPercent !== null && deltaPercent > 0;
  const deltaColor = up ? colors.negative : colors.positive; // spending going up is the "bad" direction

  return (
    <View>
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

      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {caption}
            </ThemedText>
            <ThemedText style={styles.total} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(total)}
            </ThemedText>
          </View>

          {deltaPercent !== null && (
            <View style={[styles.deltaPill, { backgroundColor: colors.background }]}>
              <ThemedText type="small" style={[styles.deltaText, { color: deltaColor }]}>
                {up ? '▲' : deltaPercent < 0 ? '▼' : '•'} {Math.abs(Math.round(deltaPercent))}%
              </ThemedText>
              <ThemedText type="small" style={[styles.deltaCaption, { color: colors.textSecondary }]}>
                vs prior week
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.chartSpacing}>
          {period === 'week' ? (
            <WeekChartPager onWeekChange={setWeekOffset} accountId={accountId} />
          ) : (
            <SpendingChart key={period} data={chartData} period={period} />
          )}
        </View>

        <View style={[styles.statsRow, { borderTopColor: colors.divider }]}>
          <View style={styles.stat}>
            <ThemedText type="small" style={[styles.statLabel, { color: colors.textSecondary }]}>
              {STAT_LABELS[period].average}
            </ThemedText>
            <ThemedText type="smallBold">{total > 0 ? formatMoney(average) : '—'}</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.stat}>
            <ThemedText type="small" style={[styles.statLabel, { color: colors.textSecondary }]}>
              {STAT_LABELS[period].peak}
            </ThemedText>
            <ThemedText type="smallBold" style={peak ? { color: accent } : undefined}>
              {peak ? `${formatMoney(peak.value)} · ${peak.label}` : '—'}
            </ThemedText>
          </View>
        </View>
      </View>

      <ThemedText type="small" style={[styles.hint, { color: colors.textSecondary }]}>
        {period === 'week' ? 'Swipe the chart to see other weeks · tap a day for details' : 'Tap a point for details'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentTrack: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: Spacing.three },
  segmentButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentActiveText: { fontWeight: '600' },
  card: { borderRadius: 20, paddingTop: Spacing.three, paddingBottom: Spacing.three, paddingHorizontal: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flexShrink: 1 },
  total: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  deltaPill: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, alignItems: 'center' },
  deltaText: { fontWeight: '700', lineHeight: 18 },
  deltaCaption: { fontSize: 11, lineHeight: 14 },
  chartSpacing: { marginTop: Spacing.two },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, lineHeight: 16 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  hint: { textAlign: 'center', marginTop: 8, opacity: 0.7, fontSize: 12, lineHeight: 16 },
});