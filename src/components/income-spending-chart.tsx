import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCompact, formatMoney } from '@/utils/currency';
import { monthLabel } from '@/utils/dates';
import type { MonthTotals } from '@/utils/insights';

const PLOT_HEIGHT = 130;
const MASK = 'RM ••••';

type Props = {
  data: MonthTotals[];
  hideAmounts?: boolean;
};

/**
 * Income (green) and spending (red) side by side for every month. Tap a month to read its exact numbers.
 * The parent gives it a `key` per range so the selection starts on the latest month after switching 3 / 6 / 12.
 */
export function IncomeSpendingChart({ data, hideAmounts = false }: Props) {
  const colors = useTheme();
  const [selected, setSelected] = useState(data.length - 1);

  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.spending]));
  const active = data[Math.min(selected, data.length - 1)];
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const dense = data.length > 6;

  return (
    <View>
      <View style={styles.plot}>
        {!hideAmounts ? (
          <View style={styles.axis} pointerEvents="none">
            <ThemedText type="small" style={[styles.axisLabel, { color: colors.textSecondary }]}>
              {formatCompact(max)}
            </ThemedText>
          </View>
        ) : null}
        <View style={[styles.baseline, { backgroundColor: colors.divider }]} />
        {data.map((d, i) => {
          const isActive = i === selected;
          return (
            <Pressable
              key={d.key}
              style={[styles.column, isActive && { backgroundColor: colors.backgroundSelected }]}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityLabel={`${monthLabel(d.key)}. Income ${money(d.income)}. Spending ${money(d.spending)}.`}
            >
              <View style={styles.bars}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(d.income > 0 ? 3 : 0, (d.income / max) * PLOT_HEIGHT), backgroundColor: colors.positive },
                    dense && styles.barThin,
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(d.spending > 0 ? 3 : 0, (d.spending / max) * PLOT_HEIGHT), backgroundColor: colors.negative },
                    dense && styles.barThin,
                  ]}
                />
              </View>
              <ThemedText
                type="small"
                style={[styles.month, { color: isActive ? colors.text : colors.textSecondary, fontWeight: isActive ? '700' : '400' }]}
                numberOfLines={1}
              >
                {monthLabel(d.key, 'short')}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.positive }]} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            Income
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.negative }]} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            Spending
          </ThemedText>
        </View>
      </View>

      {active ? (
        <View style={[styles.detail, { borderTopColor: colors.divider }]}>
          <ThemedText type="smallBold">{monthLabel(active.key)}</ThemedText>
          <View style={styles.detailRow}>
            <View style={styles.detailCell}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                Income
              </ThemedText>
              <ThemedText style={[styles.detailValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit>
                {money(active.income)}
              </ThemedText>
            </View>
            <View style={styles.detailCell}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                Spending
              </ThemedText>
              <ThemedText style={[styles.detailValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit>
                {money(active.spending)}
              </ThemedText>
            </View>
            <View style={styles.detailCell}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                Net
              </ThemedText>
              <ThemedText
                style={[styles.detailValue, { color: active.net < 0 ? colors.negative : colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {hideAmounts ? MASK : `${active.net < 0 ? '-' : ''}${formatMoney(active.net)}`}
              </ThemedText>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingTop: 16 },
  axis: { position: 'absolute', top: 0, left: 0 },
  axisLabel: { fontSize: 11, lineHeight: 14 },
  baseline: { position: 'absolute', left: 0, right: 0, bottom: 22, height: StyleSheet.hairlineWidth },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', borderRadius: 10, paddingTop: 4, paddingBottom: 2 },
  bars: { height: PLOT_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barThin: { width: 6 },
  month: { fontSize: 11, lineHeight: 16, marginTop: 4 },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.three, marginTop: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  detail: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  detailRow: { flexDirection: 'row', gap: Spacing.two },
  detailCell: { flex: 1 },
  detailValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
});
