import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';

import { useScrub } from '@/components/charts/use-scrub';
import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatCompact } from '@/utils/currency';

export type LineSeries = { values: (number | null)[]; color: string; dashed?: boolean; width?: number; dots?: boolean };

/** What to show above the chart while a point is picked. */
export type Readout = { title: string; rows: { label: string; value: string; color?: string }[] };

type Props = {
  labels: string[];
  series: LineSeries[];
  /** A flat reference line, such as a goal's target. */
  hline?: { value: number; color: string };
  /** Index where the forecast starts; a faint divider is drawn there. */
  splitAt?: number;
  height?: number;
  hide?: boolean;
  /** Makes the chart scrubbable: press and drag along it and this is shown for the point under the finger. */
  readout?: (index: number) => Readout | null;
  /** Point picked before the user touches anything (for example "now"). */
  initialIndex?: number | null;
};

const PAD = { l: 44, r: 12, t: 10, b: 22 };
const READOUT_HEIGHT = 46;

/** A small multi-line chart (react-native-svg). Null values break the line. With `readout` it can be scrubbed. */
export function LineChart({ labels, series, hline, splitAt, height = 180, hide, readout, initialIndex = null }: Props) {
  const colors = useTheme();
  const { t } = useT();

  const n = Math.max(1, labels.length - 1);
  const scrub = useScrub(labels.length, (px, _py, width) => Math.round(((px - PAD.l) / Math.max(1, width - PAD.l - PAD.r)) * n), initialIndex);
  const w = scrub.width;

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (hline) all.push(hline.value);
  const lo = Math.min(0, ...all);
  const hi = Math.max(1, ...all) * 1.08;
  const iw = Math.max(1, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / n) * iw;
  const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const step = Math.max(1, Math.ceil(labels.length / 6));
  const ticks = [lo, lo + (hi - lo) / 2, hi];

  const pick = readout && scrub.index !== null ? Math.min(scrub.index, labels.length - 1) : null;
  const info = pick !== null && readout ? readout(pick) : null;

  const path = (vals: (number | null)[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  return (
    <View>
      {readout ? (
        <View style={[styles.readout, { backgroundColor: colors.backgroundSelected }]} accessibilityLiveRegion="polite">
          {info ? (
            <>
              <ThemedText type="smallBold" style={styles.readTitle} numberOfLines={1}>
                {info.title}
              </ThemedText>
              <View style={styles.readRows}>
                {info.rows.map((r) => (
                  <View key={r.label} style={styles.readCell}>
                    <View style={[styles.readDot, { backgroundColor: r.color ?? colors.textSecondary }]} />
                    <ThemedText type="small" style={[styles.readValue, { color: colors.text }]} numberOfLines={1}>
                      <ThemedText type="small" style={{ color: colors.textSecondary, fontWeight: '400' }}>{`${r.label} `}</ThemedText>
                      {r.value}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.deep.scrubHint')}
            </ThemedText>
          )}
        </View>
      ) : null}
      <View {...(readout ? scrub.bind : { onLayout: scrub.bind.onLayout })} style={{ height, userSelect: 'none' }}>
        {w > 0 ? (
          <Svg width={w} height={height} pointerEvents="none">
            {ticks.map((tk) => (
              <Line key={`g${tk}`} x1={PAD.l} x2={w - PAD.r} y1={y(tk)} y2={y(tk)} stroke={colors.divider} strokeWidth={1} />
            ))}
            {ticks.map((tk) => (
              <SvgText key={`t${tk}`} x={PAD.l - 6} y={y(tk) + 4} fontSize={10} fill={colors.textSecondary} textAnchor="end">
                {hide ? '••' : formatCompact(tk)}
              </SvgText>
            ))}
            {splitAt !== undefined && splitAt > 0 && splitAt < labels.length ? (
              <Line x1={x(splitAt)} x2={x(splitAt)} y1={PAD.t} y2={PAD.t + ih} stroke={colors.textSecondary} strokeWidth={1} strokeDasharray="2 4" />
            ) : null}
            {hline ? <Line x1={PAD.l} x2={w - PAD.r} y1={y(hline.value)} y2={y(hline.value)} stroke={hline.color} strokeWidth={1.5} strokeDasharray="6 4" /> : null}
            {series.map((s, si) => (
              <Path key={si} d={path(s.values)} stroke={s.color} strokeWidth={s.width ?? 2.5} fill="none" strokeDasharray={s.dashed ? '7 5' : undefined} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {series.map((s, si) =>
              s.dots
                ? s.values.map((v, i) => (v === null ? null : <Circle key={`${si}-${i}`} cx={x(i)} cy={y(v)} r={3} fill={s.color} />))
                : null,
            )}
            {pick !== null ? (
              <>
                <Line x1={x(pick)} x2={x(pick)} y1={PAD.t} y2={PAD.t + ih} stroke={colors.text} strokeWidth={1} opacity={0.5} />
                {series.map((s, si) => {
                  const v = s.values[pick];
                  return v === null || v === undefined || (s.width !== undefined && s.width < 2) ? null : (
                    <Circle key={`c${si}`} cx={x(pick)} cy={y(v)} r={scrub.dragging ? 6 : 5} fill={s.color} stroke={colors.backgroundElement} strokeWidth={2} />
                  );
                })}
              </>
            ) : null}
            {labels.map((l, i) =>
              i % step === 0 || i === labels.length - 1 ? (
                <SvgText key={`l${i}`} x={x(i)} y={height - 6} fontSize={10} fill={pick === i ? colors.text : colors.textSecondary} fontWeight={pick === i ? '700' : '400'} textAnchor="middle">
                  {l}
                </SvgText>
              ) : null,
            )}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { minHeight: READOUT_HEIGHT, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 6, justifyContent: 'center', marginBottom: Spacing.two },
  readTitle: { fontSize: FontSize.caption },
  readRows: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three },
  readCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  readDot: { width: 8, height: 8, borderRadius: Radius.pill },
  readValue: { fontWeight: '700', ...tabularNums },
});
