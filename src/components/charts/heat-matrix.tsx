import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Ionicons } from '@expo/vector-icons';

import { CategoryIcon } from '@/components/category-icon';
import { useScrub } from '@/components/charts/use-scrub';
import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { r1 } from '@/utils/percent';

export type MatrixRow = { id: string; label: string; icon: ComponentProps<typeof Ionicons>['name']; color: string; values: number[]; /** Last month is well above the earlier ones. */ rose: boolean };

type Props = {
  rows: MatrixRow[];
  columns: string[];
  format: (n: number) => string;
  hide?: boolean;
};

const CELL = 24;
const LABEL_W = 108;

/**
 * Categories down the side, months across. Each row is shaded against its own busiest month, so you see when a
 * category rose or fell, not just which one is big. Press and drag over the grid to read any cell.
 */
export function HeatMatrix({ rows, columns, format, hide }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const cols = columns.length;
  const heat = [colors.heat0, colors.heat1, colors.heat2, colors.heat3, colors.heat4];
  const scrub = useScrub(rows.length * cols, (x, y, w, h) => {
    const c = Math.min(cols - 1, Math.max(0, Math.floor((x / Math.max(1, w)) * cols)));
    const r = Math.min(rows.length - 1, Math.max(0, Math.floor((y / Math.max(1, h)) * rows.length)));
    return r * cols + c;
  });
  const pickRow = scrub.index === null ? -1 : Math.floor(scrub.index / cols);
  const pickCol = scrub.index === null ? -1 : scrub.index % cols;
  const picked = pickRow >= 0 ? rows[pickRow] : null;
  const pickedValue = picked ? picked.values[pickCol] : 0;
  const level = (row: MatrixRow, v: number) => {
    const max = Math.max(...row.values, 0);
    if (v <= 0 || max <= 0) return 0;
    const r = v / max;
    return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
  };
  const avg = picked ? picked.values.reduce((s, v) => s + v, 0) / Math.max(1, picked.values.length) : 0;
  const vsAvg = picked && avg > 0 ? r1(((pickedValue - avg) / avg) * 100) : null;

  return (
    <View>
      <View style={[styles.readout, { backgroundColor: colors.backgroundSelected }]}>
        {picked ? (
          <>
            <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
              {picked.label} · {columns[pickCol]}
            </ThemedText>
            <ThemedText type="small" style={{ fontWeight: '700' }} numberOfLines={1}>
              {hide ? 'RM ••••' : format(pickedValue)}
              {vsAvg !== null ? (
                <ThemedText type="small" style={{ color: vsAvg > 15 ? colors.negative : vsAvg < -15 ? colors.positive : colors.textSecondary, fontWeight: '400' }}>
                  {`  ·  ${t('plan.deep.heat.vsAvg', { pct: `${vsAvg > 0 ? '+' : ''}${vsAvg.toFixed(1)}` })}`}
                </ThemedText>
              ) : null}
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('plan.deep.scrubHint')}
          </ThemedText>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.labelCol}>
          {rows.map((r) => (
            <View key={r.id} style={styles.labelRow}>
              <CategoryIcon icon={r.icon} color={r.color} size={18} />
              <ThemedText type="small" style={styles.rowLabel} numberOfLines={1}>
                {r.label}
              </ThemedText>
              {r.rose ? <ThemedText type="small" style={{ color: colors.negative, fontWeight: '700' }}>▲</ThemedText> : null}
            </View>
          ))}
        </View>
        <View style={[styles.grid, { userSelect: 'none' }]} {...scrub.bind}>
          {rows.map((r, ri) => (
            <View key={r.id} style={styles.gridRow} pointerEvents="none">
              {r.values.map((v, ci) => (
                <View
                  key={ci}
                  style={[
                    styles.cell,
                    { backgroundColor: heat[level(r, v)] },
                    ri === pickRow && ci === pickCol && { borderWidth: 2, borderColor: colors.text },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.labelColSpacer} />
        <View style={styles.monthRow} pointerEvents="none">
          {columns.map((c, i) => (
            <ThemedText key={i} type="small" style={[styles.month, { color: i === pickCol ? colors.text : colors.textSecondary, fontWeight: i === pickCol ? '700' : '400' }]} numberOfLines={1}>
              {cols > 8 && i % 2 === 1 && i !== pickCol ? '' : c}
            </ThemedText>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { minHeight: 46, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 6, justifyContent: 'center', marginBottom: Spacing.two },
  title: { fontSize: FontSize.caption },
  body: { flexDirection: 'row', alignItems: 'flex-start' },
  labelCol: { width: LABEL_W },
  labelColSpacer: { width: LABEL_W },
  labelRow: { height: CELL + 3, flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 4 },
  rowLabel: { flex: 1, fontSize: FontSize.caption },
  grid: { flex: 1 },
  gridRow: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  cell: { flex: 1, height: CELL, borderRadius: 5 },
  monthRow: { flex: 1, flexDirection: 'row', gap: 3, marginTop: 2 },
  month: { flex: 1, textAlign: 'center', fontSize: FontSize.micro },
});
