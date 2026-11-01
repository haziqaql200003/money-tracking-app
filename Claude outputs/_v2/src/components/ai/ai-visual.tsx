import { StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/analyse/line-chart';
import { Donut } from '@/components/charts/donut';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing, tabularNums } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Visual } from '@/services/ai/brain';
import { formatCompact, formatMoney } from '@/utils/currency';

/**
 * Draws a chart the brain asked for. The brain only sends data (src/services/ai/brain/types.ts); the drawing is done
 * here with the app's own chart components, so it looks like the rest of WaKira and works in Expo Go.
 */
export function AiVisual({ visual }: { visual: Visual }) {
  const colors = useTheme();
  const muted = { color: colors.textSecondary };
  const box = [styles.box, { backgroundColor: colors.backgroundElement, borderColor: colors.border }];

  switch (visual.kind) {
    case 'donut': {
      const total = visual.parts.reduce((s, p) => s + Math.max(0, p.value), 0);
      return (
        <View style={box}>
          <ThemedText type="smallBold">{visual.title}</ThemedText>
          <View style={styles.donutRow}>
            <Donut parts={visual.parts.map((p) => ({ id: p.label, value: p.value, color: p.color }))} size={120} stroke={16}>
              <ThemedText type="smallBold" style={tabularNums} numberOfLines={1}>{visual.center}</ThemedText>
              {visual.centerSub ? <ThemedText type="small" style={[muted, styles.tiny]} numberOfLines={1}>{visual.centerSub}</ThemedText> : null}
            </Donut>
            <View style={styles.legend}>
              {visual.parts.map((p) => (
                <View key={p.label} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <ThemedText type="small" style={styles.flex} numberOfLines={1}>{p.label}</ThemedText>
                  <ThemedText type="small" style={[muted, tabularNums]}>{total > 0 ? `${Math.round((p.value / total) * 100)}%` : ''}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    }

    case 'bars': {
      const max = Math.max(1, ...visual.rows.map((r) => Math.abs(r.value)));
      return (
        <View style={box}>
          <ThemedText type="smallBold">{visual.title}</ThemedText>
          {visual.rows.map((r) => (
            <View key={r.label} style={styles.barRow}>
              <View style={styles.barHead}>
                <ThemedText type="small" style={styles.flex} numberOfLines={1}>{r.label}</ThemedText>
                <ThemedText type="small" style={[tabularNums, r.value < 0 && { color: colors.negative }]}>
                  {formatMoney(r.value, r.value < 0 ? { signed: true, type: 'debit' } : undefined)}
                  {r.note ? <ThemedText type="small" style={muted}>{`  ${r.note}`}</ThemedText> : null}
                </ThemedText>
              </View>
              <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                <View style={[styles.fill, { width: `${(Math.abs(r.value) / max) * 100}%`, backgroundColor: r.value < 0 ? colors.negative : (r.color ?? colors.accent) }]} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    case 'compare': {
      const max = Math.max(1, ...visual.rows.flatMap((r) => [r.a, r.b]));
      return (
        <View style={box}>
          <ThemedText type="smallBold">{visual.title}</ThemedText>
          <View style={styles.keyRow}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            <ThemedText type="small" style={muted}>{visual.aLabel}</ThemedText>
            <View style={[styles.dot, styles.keyGap, { backgroundColor: colors.textSecondary, opacity: 0.45 }]} />
            <ThemedText type="small" style={muted}>{visual.bLabel}</ThemedText>
          </View>
          {visual.rows.map((r) => {
            const up = r.a > r.b;
            return (
              <View key={r.label} style={styles.barRow}>
                <View style={styles.barHead}>
                  <ThemedText type="small" style={styles.flex} numberOfLines={1}>{r.label}</ThemedText>
                  <ThemedText type="small" style={[tabularNums, { color: Math.abs(r.a - r.b) < 1 ? colors.textSecondary : up ? colors.negative : colors.positive }]}>
                    {`${up ? '+' : r.a < r.b ? '-' : ''}${formatCompact(Math.abs(r.a - r.b))}`}
                  </ThemedText>
                </View>
                <View style={[styles.track, styles.thin, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.fill, { width: `${(r.a / max) * 100}%`, backgroundColor: colors.accent }]} />
                </View>
                <View style={[styles.track, styles.thin, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.fill, { width: `${(r.b / max) * 100}%`, backgroundColor: colors.textSecondary, opacity: 0.45 }]} />
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    case 'trend': {
      const toneColor = (tone: 'expense' | 'income' | 'accent') => (tone === 'income' ? colors.positive : tone === 'expense' ? colors.accent : colors.gold);
      return (
        <View style={box}>
          <ThemedText type="smallBold">{visual.title}</ThemedText>
          <LineChart
            labels={visual.labels}
            splitAt={visual.splitAt}
            height={170}
            series={visual.series.map((s) => ({ values: s.values, color: toneColor(s.tone), dashed: s.dashed, dots: !s.dashed }))}
            readout={(i) => ({
              title: visual.labels[i] ?? '',
              rows: visual.series.filter((s) => s.values[i] !== null && s.values[i] !== undefined).map((s) => ({ label: s.name, value: formatMoney(s.values[i] ?? 0), color: toneColor(s.tone) })),
            })}
          />
        </View>
      );
    }

    case 'stats':
      return (
        <View style={styles.statsRow}>
          {visual.items.map((s) => (
            <View key={s.label} style={[styles.stat, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <ThemedText type="small" style={[muted, styles.tiny]} numberOfLines={1}>{s.label}</ThemedText>
              <ThemedText type="smallBold" style={[tabularNums, s.tone === 'good' && { color: colors.positive }, s.tone === 'bad' && { color: colors.negative }]} numberOfLines={1}>
                {s.value}
              </ThemedText>
            </View>
          ))}
        </View>
      );

    case 'meter':
      return (
        <View style={box}>
          <ThemedText type="smallBold">{visual.title}</ThemedText>
          {visual.rows.map((r) => {
            const tone = r.status === 'over' ? colors.negative : r.status === 'warn' ? colors.warning : colors.positive;
            return (
              <View key={r.label} style={styles.barRow}>
                <View style={styles.barHead}>
                  <ThemedText type="small" style={styles.flex} numberOfLines={1}>{r.label}</ThemedText>
                  <ThemedText type="small" style={tabularNums}>
                    {`${formatCompact(r.used)} / ${formatCompact(r.limit)}`}
                  </ThemedText>
                </View>
                <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.fill, { width: `${Math.min(100, (r.used / Math.max(1, r.limit)) * 100)}%`, backgroundColor: tone }]} />
                </View>
              </View>
            );
          })}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  flex: { flex: 1 },
  tiny: { fontSize: 11 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  legend: { flex: 1, gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyGap: { marginLeft: Spacing.two },
  barRow: { gap: 4 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  track: { height: 8, borderRadius: Radius.xs, overflow: 'hidden' },
  thin: { height: 5 },
  fill: { height: '100%', borderRadius: Radius.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 10, gap: 2 },
});
