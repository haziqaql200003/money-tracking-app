import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useScrub } from '@/components/charts/use-scrub';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatMonthYear, monthShort } from '@/i18n/format';
import { formatCompact, formatMoney } from '@/utils/currency';
import type { MonthTotals } from '@/utils/insights';
import { p1, r1 } from '@/utils/percent';

const PLOT = 140;
const MASK = 'RM ••••';

const monthLabel = (key: string, variant: 'long' | 'short' = 'long') => {
  const [y, m] = key.split('-').map(Number);
  return variant === 'long' ? formatMonthYear(new Date(y, m - 1, 1)) : monthShort(m - 1);
};
const rateOf = (d: MonthTotals) => (d.income > 0 ? r1(((d.income - d.spending) / d.income) * 100) : null);

type Props = {
  data: MonthTotals[];
  hideAmounts?: boolean;
  /** Short label under each bar. Default: the month ("Okt"). */
  labelOf?: (d: MonthTotals, i: number) => string;
  /** Heading of the readout for the picked bar. Default: month and year. */
  titleOf?: (d: MonthTotals) => string;
  /** The "share kept" line. Only meaningful per month (salary comes once a month), so weeks turn it off. */
  showRate?: boolean;
};

/**
 * Clustered columns (income and spending each month) with a line on top for the share of income kept.
 * Tap a month, or press and drag along the chart, to read its numbers. The line uses its own 0-100% scale on the right.
 */
export function IncomeSpendingCombo({ data, hideAmounts = false, labelOf = (d) => monthLabel(d.key, 'short'), titleOf = (d) => monthLabel(d.key), showRate = true }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const scrub = useScrub(data.length, (x, _y, w) => Math.floor((x / Math.max(1, w)) * data.length), data.length - 1);
  const selected = Math.min(scrub.index ?? data.length - 1, data.length - 1);
  const width = scrub.width;

  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.spending]));
  const active = data[Math.min(selected, data.length - 1)];
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const dense = data.length > 6;
  const veryDense = data.length > 10;
  // With many bars, label every 2nd or 3rd so the labels never run into each other.
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const rates = showRate ? data.map(rateOf) : data.map(() => null);
  const lineColor = colors.gold;

  const step = data.length > 0 ? width / data.length : 0;
  const yOf = (rate: number) => PLOT - (Math.min(100, Math.max(0, rate)) / 100) * PLOT;
  // Break the line where a month had no income.
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  rates.forEach((r, i) => {
    if (r === null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push({ x: step * (i + 0.5), y: yOf(r) });
  });
  if (current.length) segments.push(current);
  const activeRate = active && showRate ? rateOf(active) : null;

  return (
    <View>
      <View style={styles.axisRow}>
        <ThemedText type="small" style={[styles.axis, { color: colors.textSecondary }]}>
          {hideAmounts ? '' : formatCompact(max)}
        </ThemedText>
        {showRate ? (
          <ThemedText type="small" style={[styles.axis, { color: lineColor }]}>
            100%
          </ThemedText>
        ) : null}
      </View>

      <View
        style={[styles.plot, { userSelect: 'none' }]}
        {...scrub.bind}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('home.chart.a11yMonth', { month: active ? titleOf(active) : '', income: money(active?.income ?? 0), spending: money(active?.spending ?? 0) })}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} // i18n-ignore
        onAccessibilityAction={(e) => scrub.setIndex(Math.min(data.length - 1, Math.max(0, selected + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      >
        <View style={[styles.baseline, { backgroundColor: colors.divider }]} />
        <View style={[styles.midline, { borderColor: colors.divider }]} />
        {data.map((d, i) => {
          const isActive = i === selected;
          return (
            <View key={d.key} style={[styles.column, veryDense && styles.columnTight, isActive && { backgroundColor: colors.backgroundSelected }]} pointerEvents="none">
              <View style={[styles.bar, dense && styles.barThin, veryDense && styles.barHair, { height: Math.max(d.income > 0 ? 3 : 0, (d.income / max) * PLOT), backgroundColor: colors.positive }]} />
              <View style={[styles.bar, dense && styles.barThin, veryDense && styles.barHair, { height: Math.max(d.spending > 0 ? 3 : 0, (d.spending / max) * PLOT), backgroundColor: colors.negative }]} />
            </View>
          );
        })}
        {width > 0 ? (
          <Svg width={width} height={PLOT} style={StyleSheet.absoluteFill} pointerEvents="none">
            {segments.map((seg, i) =>
              seg.length > 1 ? (
                <Polyline key={`l${i}`} points={seg.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" />
              ) : null,
            )}
            {rates.map((r, i) =>
              r === null ? null : (
                <Circle
                  key={`d${i}`}
                  cx={step * (i + 0.5)}
                  cy={yOf(r)}
                  r={i === selected ? 5 : 3.5}
                  fill={r < 0 ? colors.negative : lineColor}
                  stroke={colors.backgroundElement}
                  strokeWidth={1.5}
                />
              ),
            )}
          </Svg>
        ) : null}
      </View>

      <View style={styles.months}>
        {data.map((d, i) => (
          <ThemedText
            key={d.key}
            type="small"
            numberOfLines={1}
            style={[
              styles.month,
              // Many bars: each label is centred under its bar and may be wider than the bar, so it is never cut short.
              veryDense && [styles.monthFloating, { left: `${((i + 0.5) / data.length) * 100}%` }],
              { color: i === selected ? colors.text : colors.textSecondary, fontWeight: i === selected ? '700' : '400' },
            ]}
          >
            {i % labelEvery === 0 ? labelOf(d, i) : ''}
          </ThemedText>
        ))}
      </View>

      <View style={styles.legend}>
        {[
          { label: t('common.income'), color: colors.positive, line: false },
          { label: t('home.chart.spending'), color: colors.negative, line: false },
          ...(showRate ? [{ label: t('plan.analyse.rateLine'), color: lineColor, line: true }] : []),
        ].map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[l.line ? styles.legendLine : styles.dot, { backgroundColor: l.color }]} />
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {l.label}
            </ThemedText>
          </View>
        ))}
      </View>

      {active ? (
        <View style={[styles.detail, { borderTopColor: colors.divider }]}>
          <View style={styles.detailHead}>
            <ThemedText type="smallBold">{titleOf(active)}</ThemedText>
            {activeRate !== null ? (
              <ThemedText type="small" style={{ color: activeRate < 0 ? colors.negative : lineColor, fontWeight: '700' }}>
                {t('plan.analyse.rateValue', { rate: p1(activeRate) })}
              </ThemedText>
            ) : null}
          </View>
          {[
            { label: t('common.income'), value: money(active.income), color: colors.positive },
            { label: t('home.chart.spending'), value: money(active.spending), color: colors.negative },
            { label: t('home.chart.net'), value: hideAmounts ? MASK : `${active.net < 0 ? '-' : ''}${formatMoney(active.net)}`, color: active.net < 0 ? colors.negative : colors.text },
          ].map((c) => (
            <View key={c.label} style={styles.detailLine}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {c.label}
              </ThemedText>
              <ThemedText style={[styles.detailValue, { color: c.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {c.value}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  axis: { fontSize: FontSize.micro, lineHeight: 14 },
  plot: { height: PLOT, flexDirection: 'row', alignItems: 'flex-end' },
  baseline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  midline: { position: 'absolute', left: 0, right: 0, top: PLOT / 2, borderTopWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  column: { flex: 1, height: PLOT, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, borderTopLeftRadius: Radius.sm, borderTopRightRadius: Radius.sm },
  bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barThin: { width: 6 },
  barHair: { width: 4 },
  columnTight: { gap: 2 },
  months: { flexDirection: 'row', marginTop: 4, minHeight: 16 },
  monthFloating: { position: 'absolute', width: 48, marginLeft: -24, flex: undefined },
  month: { flex: 1, textAlign: 'center', fontSize: FontSize.micro, lineHeight: 16 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: Radius.pill },
  legendLine: { width: 14, height: 3, borderRadius: Radius.pill },
  detail: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  detailHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // One line per figure (label left, amount right) so even a large amount has the full width and is never cut off.
  detailLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  // flex: 1 gives the amount a real width; with only flexShrink, iPhone shrinks "fit to width" text to its smallest.
  detailValue: { flex: 1, fontSize: FontSize.heading, lineHeight: 24, fontWeight: '700', textAlign: 'right', ...tabularNums },
});
