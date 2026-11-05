import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useScrub } from '@/components/charts/use-scrub';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatCompact } from '@/utils/currency';

export type BarItem = { key: string; label: string; value: number; /** Long name shown in the readout. */ title?: string; color?: string; note?: string };

type Props = {
  items: BarItem[];
  color: string;
  /** Plot height in px. */
  height?: number;
  hide?: boolean;
  /** Formats the value in the readout; the labels above the bars are always compact. */
  format: (n: number) => string;
  /** Line under the readout value, for example "that is 35% above your average". */
  extra?: (item: BarItem, index: number) => string | null;
  /** The small figure above each bar. Off for many thin bars (a month of days), where they would run together. */
  showValues?: boolean;
  /** The bar picked at first. Default: the last one. */
  initialIndex?: number;
  /** Draws the labels under the bars itself, for example only every 7th day. Replaces the label row. */
  labelRow?: ReactNode;
};

/** Plain bars that can be scrubbed: press and drag across them and the readout above follows the finger. */
export function ScrubBars({ items, color, height = 90, hide, format, extra, showValues = true, initialIndex, labelRow }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  const scrub = useScrub(items.length, (x, _y, w) => Math.floor((x / Math.max(1, w)) * items.length), initialIndex ?? items.length - 1);
  const pick = scrub.index === null ? null : Math.min(scrub.index, items.length - 1);
  const item = pick === null ? null : items[pick];
  const note = item && pick !== null && extra ? extra(item, pick) : null;

  return (
    <View>
      <View style={[styles.readout, { backgroundColor: colors.backgroundSelected }]}>
        {item ? (
          <>
            <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
              {item.title ?? item.label}
            </ThemedText>
            <ThemedText type="small" style={[styles.value, { color: item.color ?? color }]} numberOfLines={1}>
              {hide ? 'RM ••••' : format(item.value)}
            </ThemedText>
            {note ? (
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {note}
              </ThemedText>
            ) : null}
          </>
        ) : (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('plan.deep.scrubHint')}
          </ThemedText>
        )}
      </View>
      <View style={[styles.row, { height: height + 18, userSelect: 'none' }]} {...scrub.bind}>
        {items.map((p, i) => {
          const active = i === pick;
          return (
            <View key={p.key} style={[styles.col, active && { backgroundColor: colors.backgroundSelected }]} pointerEvents="none">
              <ThemedText type="small" style={styles.top} numberOfLines={1}>
                {showValues && p.value !== 0 && !hide ? formatCompact(p.value) : ''}
              </ThemedText>
              <View style={[styles.slot, { height }]}>
                <View
                  style={{
                    width: '70%',
                    maxWidth: 26,
                    height: Math.max(p.value !== 0 ? 4 : 0, (Math.abs(p.value) / max) * (height - 4)),
                    borderTopLeftRadius: 5,
                    borderTopRightRadius: 5,
                    backgroundColor: p.color ?? color,
                    opacity: pick === null || active ? 1 : 0.55,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
      {labelRow ?? (
      <View style={styles.labels} pointerEvents="none">
        {items.map((p, i) => (
          <ThemedText key={p.key} type="small" style={[styles.label, { color: i === pick ? colors.text : colors.textSecondary, fontWeight: i === pick ? '700' : '400' }]} numberOfLines={1}>
            {p.label}
          </ThemedText>
        ))}
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { minHeight: 64, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 6, justifyContent: 'center', marginBottom: Spacing.two },
  title: { fontSize: FontSize.caption },
  value: { fontWeight: '700', ...tabularNums },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', borderRadius: Radius.sm, paddingTop: 2 },
  top: { fontSize: FontSize.micro, height: 14 },
  slot: { justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  labels: { flexDirection: 'row', marginTop: 2 },
  label: { flex: 1, textAlign: 'center', fontSize: FontSize.micro },
});
