import { useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { Card } from '@/components/ui/card';
import { SpendingChart, PERIOD_COLOR, pointLabel } from '@/components/spending-chart';
import { ThemedText } from '@/components/themed-text';
import { WeekChartPager } from '@/components/week-chart-pager';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { ChartPeriod, ChartPoint } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';
import { formatPct, MIN_COMPARE_BASE } from '@/utils/insights';
import { useSettings } from '@/context/SettingsContext';
import { useT, type TKey } from '@/i18n';

const PERIODS: { key: ChartPeriod; labelKey: TKey }[] = [
  { key: 'week', labelKey: 'home.overview.period.week' },
  { key: 'month', labelKey: 'home.overview.period.month' },
  { key: 'year', labelKey: 'home.overview.period.year' },
];

const STAT_LABELS: Record<ChartPeriod, { average: TKey; peak: TKey }> = {
  week: { average: 'home.overview.stat.week.average', peak: 'home.overview.stat.week.peak' },
  month: { average: 'home.overview.stat.month.average', peak: 'home.overview.stat.month.peak' },
  year: { average: 'home.overview.stat.year.average', peak: 'home.overview.stat.year.peak' },
};

const sum = (points: ChartPoint[]) => points.reduce((total, p) => total + p.value, 0);

type Props = {
  /** Limit everything to one account (omit for all accounts). */
  accountId?: string;
  /** Shown next to the caption so it's clear whose spending this is. */
  accountName?: string;
};

export function SpendingOverview({ accountId, accountName }: Props) {
  const { t, tp } = useT();
  const colors = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { getWeekChartData, getMonthChartData, getYearChartData } = useTransactions();
  const { dailyLimit } = useSettings();

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
    if (previousTotal >= MIN_COMPARE_BASE) deltaPercent = ((total - previousTotal) / previousTotal) * 100;
  }

  const currentYear = new Date().getFullYear();
  const weekLabel =
    weekOffset === 0
      ? t('home.overview.thisWeek')
      : weekOffset === -1
        ? t('home.overview.lastWeek')
        : tp('home.overview.weeksAgo', Math.abs(weekOffset));
  const baseCaption =
    period === 'week'
      ? weekLabel
      : period === 'month'
        ? t('home.overview.spentIn', { year: currentYear })
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
      <View style={{ marginBottom: Spacing.three }}>
        <GlassSegmented
          options={PERIODS.map((p) => ({ key: p.key, label: t(p.labelKey) }))}
          value={period}
          onChange={selectPeriod}
        />
      </View>

      <Card style={styles.card}>
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
                {up ? '▲' : deltaPercent < 0 ? '▼' : '•'} {formatPct(deltaPercent)}
              </ThemedText>
              <ThemedText type="small" style={[styles.deltaCaption, { color: colors.textSecondary }]}>
                {t('home.overview.vsPriorWeek')}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.chartSpacing}>
          {period === 'week' ? (
            <WeekChartPager onWeekChange={setWeekOffset} accountId={accountId} dailyLimit={dailyLimit} />
          ) : (
            <SpendingChart key={period} data={chartData} period={period} dailyLimit={dailyLimit} />
          )}
        </View>

        <View style={[styles.statsRow, { borderTopColor: colors.divider }]}>
          <View style={styles.stat}>
            <ThemedText type="small" style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t(STAT_LABELS[period].average)}
            </ThemedText>
            <ThemedText type="smallBold">{total > 0 ? formatMoney(average) : '—'}</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.stat}>
            <ThemedText type="small" style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t(STAT_LABELS[period].peak)}
            </ThemedText>
            <ThemedText type="smallBold" style={peak ? { color: accent } : undefined}>
              {peak ? `${formatMoney(peak.value)} · ${pointLabel(peak, period)}` : '—'}
            </ThemedText>
          </View>
        </View>
      </Card>

      <ThemedText type="small" style={[styles.hint, { color: colors.textSecondary }]}>
        {period === 'week' ? t('home.overview.hintWeek') : t('home.overview.hintPoint')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingBottom: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flexShrink: 1 },
  total: { fontSize: FontSize.largeTitle, lineHeight: 36, fontWeight: '700' },
  deltaPill: { borderRadius: Radius.md, paddingVertical: 4, paddingHorizontal: 10, alignItems: 'center' },
  deltaText: { fontWeight: '700', lineHeight: 18 },
  deltaCaption: { fontSize: FontSize.micro, lineHeight: 14 },
  chartSpacing: { marginTop: Spacing.two },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: FontSize.caption, lineHeight: 16 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  hint: { textAlign: 'center', marginTop: 8, opacity: 0.7, fontSize: FontSize.caption, lineHeight: 16 },
});
