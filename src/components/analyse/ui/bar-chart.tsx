import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { soft } from '@/components/analyse/ui/status-chip';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Bar = {
  key: string;
  /** Short label under the bar. */
  label: string;
  /** Longer name for the readout and screen readers. */
  title?: string;
  value: number;
  /** Overrides the chart colour for this bar (e.g. a month that lost savings). */
  color?: string;
};

type Props = {
  items: Bar[];
  color: string;
  /** Bars drawn at full colour; the others are muted. Omit to draw every bar at full colour. */
  highlight?: number[];
  /** A dashed line across the chart: an average or a target. */
  refLine?: { value: number; label: string; color?: string };
  height?: number;
  format: (n: number) => string;
  /** An extra line in the readout for the tapped bar. */
  extra?: (i: number) => string | null;
};

/**
 * Plain columns with an optional dashed average or target line. Tap a column to read it; tap again to clear.
 * Handles negative values with a zero line. The shared bar chart of Terperinci.
 */
export function BarChart({ items, color, highlight, refLine, height = 120, format, extra }: Props) {
  const colors = useTheme();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const values = items.map((b) => b.value);
  const top = Math.max(0, refLine?.value ?? 0, ...values);
  const bottom = Math.min(0, ...values);
  const span = top - bottom || 1;
  const pad = 4;
  const y = (v: number) => pad + (1 - (v - bottom) / span) * (height - pad * 2);
  const slot = items.length ? width / items.length : 0;
  const barW = Math.max(4, Math.min(28, slot * 0.6));
  const sel = picked !== null && picked < items.length ? picked : null;
  // Bars that are not highlighted: a pale tint of the chart colour, which stays visible on dark cards too.
  const muted = soft(colors, color, 0.32);

  return (
    <View>
      <View style={styles.readout}>
        {sel !== null ? (
          <>
            <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {items[sel].title ?? items[sel].label}
            </ThemedText>
            <ThemedText type="smallBold" numberOfLines={1}>
              {format(items[sel].value)}
              {extra?.(sel) ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{`  ·  ${extra(sel)}`}</ThemedText> : null}
            </ThemedText>
          </>
        ) : null}
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {bottom < 0 ? <Line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke={colors.divider} strokeWidth={1} /> : null}
            {items.map((b, i) => {
              const y0 = y(0);
              const y1 = y(b.value);
              const on = highlight ? highlight.includes(i) : true;
              const fill = b.color ?? color;
              return (
                <Rect
                  key={b.key}
                  x={i * slot + (slot - barW) / 2}
                  y={Math.min(y0, y1)}
                  width={barW}
                  height={Math.max(b.value !== 0 ? 2 : 0, Math.abs(y1 - y0))}
                  rx={Math.min(5, barW / 3)}
                  fill={sel === i ? colors.text : on ? fill : muted}
                />
              );
            })}
            {refLine && refLine.value > 0 ? (
              <Line x1={0} x2={width} y1={y(refLine.value)} y2={y(refLine.value)} stroke={refLine.color ?? colors.textSecondary} strokeWidth={1.5} strokeDasharray="5 4" />
            ) : null}
          </Svg>
        ) : null}
        <View style={styles.cover}>
          <View style={styles.hits}>
            {items.map((b, i) => (
              <Pressable
                key={b.key}
                style={styles.hit}
                onPress={() => setPicked(sel === i ? null : i)}
                accessibilityRole="button"
                accessibilityLabel={`${b.title ?? b.label}: ${format(b.value)}`}
              />
            ))}
          </View>
        </View>
      </View>
      <View style={styles.labels}>
        {items.map((b, i) => (
          <ThemedText
            key={b.key}
            type="small"
            numberOfLines={1}
            style={[styles.label, { color: sel === i || highlight?.includes(i) ? colors.text : colors.textSecondary, fontWeight: sel === i ? '700' : '400' }]}
          >
            {b.label}
          </ThemedText>
        ))}
      </View>
      {refLine && refLine.value > 0 ? (
        <View style={styles.legend}>
          <View style={[styles.dash, { borderTopColor: refLine.color ?? colors.textSecondary }]} />
          <ThemedText type="small" style={{ color: colors.textSecondary, flexShrink: 1 }}>
            {refLine.label}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { minHeight: 38, justifyContent: 'flex-end', marginBottom: Spacing.one },
  cover: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  hits: { flex: 1, flexDirection: 'row' },
  hit: { flex: 1 },
  labels: { flexDirection: 'row', marginTop: 4 },
  label: { flex: 1, textAlign: 'center', fontSize: FontSize.micro },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.two },
  dash: { width: 16, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
});
