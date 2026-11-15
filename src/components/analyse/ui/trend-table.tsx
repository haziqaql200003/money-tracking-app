import type { ComponentProps } from 'react';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

import { soft } from '@/components/analyse/ui/status-chip';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { rowAverage, trendTint, type Tint } from '@/utils/deep-trends';
import type { ScrollViewRef } from '@/utils/rn-refs';

export type TrendRow = {
  id: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  values: number[];
};

type Props = {
  columns: string[];
  rows: TrendRow[];
  /** The last column is the running month: shown, but never tinted or counted in the average. */
  partialLast: boolean;
  /** First column with any records at all; earlier columns are left out of each row's average. */
  firstIndex: number;
  /** Short money for cells, e.g. "1.2k". */
  format: (n: number) => string;
  onPressRow?: (id: string) => void;
};

const NAME_W = 118;
const CELL_W = 60;

/**
 * Categories × months. Each cell is tinted against that category's OWN usual month:
 * deeper red for 10%+ above, light red for 5–10% above, green for 5%+ below. A legend says so, so colour is never the only signal
 * (screen readers hear "above usual" / "below usual" with each cell).
 */
export function TrendTable({ columns, rows, partialLast, firstIndex, format, onPressRow }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const scroll = useRef<ScrollViewRef>(null);

  const tone = (x: Tint) =>
    x === 'up2' ? soft(colors, colors.negative, 0.3) : x === 'up1' ? soft(colors, colors.negative, 0.13) : x === 'down' ? soft(colors, colors.positive, 0.18) : 'transparent';
  const word = (x: Tint) => (x === 'up2' ? t('plan.deep.table.up2') : x === 'up1' ? t('plan.deep.table.up1') : x === 'down' ? t('plan.deep.table.down') : '');
  const lastCol = columns.length - 1;
  const hair = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider };

  return (
    <View>
      <View style={styles.table}>
        {/* Fixed name column */}
        <View style={{ width: NAME_W }}>
          <View style={styles.head} />
          {rows.map((r, i) => (
            <Pressable
              key={r.id}
              disabled={!onPressRow}
              onPress={() => onPressRow?.(r.id)}
              style={({ pressed }) => [styles.nameCell, i > 0 && hair, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={r.label}
            >
              <CategoryIcon icon={r.icon} color={r.color} size={26} />
              <ThemedText type="small" numberOfLines={1} style={styles.flex}>
                {r.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        {/* Months, newest on the right; opens scrolled to the newest */}
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
          style={styles.flex}
        >
          <View>
            <View style={[styles.head, styles.rowFlex]}>
              {columns.map((c, ci) => (
                <ThemedText key={c + ci} type="small" style={[styles.cellText, styles.headText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {partialLast && ci === lastCol ? `${c}*` : c}
                </ThemedText>
              ))}
            </View>
            {rows.map((r, i) => {
              const avg = rowAverage(r.values, firstIndex, partialLast);
              return (
                <View key={r.id} style={[styles.rowFlex, i > 0 && hair]}>
                  {r.values.map((v, ci) => {
                    const tint = (partialLast && ci === lastCol) || ci < firstIndex ? null : trendTint(v, avg);
                    return (
                      <View
                        key={ci}
                        style={[styles.cell, { backgroundColor: tone(tint) }]}
                        accessible
                        accessibilityLabel={`${r.label}, ${columns[ci]}: ${format(v)}${tint ? `, ${word(tint)}` : ''}`}
                      >
                        <ThemedText type="small" style={[styles.cellText, { color: v > 0 ? colors.text : colors.textSecondary, fontWeight: tint === 'up2' ? '700' : '400' }]} numberOfLines={1}>
                          {v > 0 ? format(v) : '–'}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        {(['up2', 'up1', 'down'] as const).map((x) => (
          <View key={x} style={styles.key}>
            <View style={[styles.swatch, { backgroundColor: tone(x), borderColor: colors.divider }]} />
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{word(x)}</ThemedText>
          </View>
        ))}
        {partialLast ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('plan.deep.table.soFar')}</ThemedText> : null}
      </View>
    </View>
  );
}

const ROW_H = 44;
const styles = StyleSheet.create({
  flex: { flex: 1 },
  table: { flexDirection: 'row' },
  head: { height: 26 },
  headText: { fontSize: FontSize.micro, fontWeight: '700' },
  rowFlex: { flexDirection: 'row' },
  nameCell: { height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
  cell: { width: CELL_W, height: ROW_H - 6, marginVertical: 3, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  cellText: { width: CELL_W, textAlign: 'center', fontSize: FontSize.caption, ...tabularNums },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.three },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
});
