import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { formatCompact } from '@/utils/currency';

export type LineSeries = { values: (number | null)[]; color: string; dashed?: boolean; width?: number; dots?: boolean };

type Props = {
  labels: string[];
  series: LineSeries[];
  /** A flat reference line, such as a goal's target. */
  hline?: { value: number; color: string };
  /** Index where the forecast starts; a faint divider is drawn there. */
  splitAt?: number;
  height?: number;
  hide?: boolean;
};

const PAD = { l: 44, r: 12, t: 10, b: 22 };

/** A small multi-line chart (react-native-svg). Null values break the line. */
export function LineChart({ labels, series, hline, splitAt, height = 180, hide }: Props) {
  const colors = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (hline) all.push(hline.value);
  const lo = Math.min(0, ...all);
  const hi = Math.max(1, ...all) * 1.08;
  const n = Math.max(1, labels.length - 1);
  const iw = Math.max(1, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / n) * iw;
  const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const step = Math.max(1, Math.ceil(labels.length / 6));
  const ticks = [lo, lo + (hi - lo) / 2, hi];

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
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 ? (
        <Svg width={w} height={height}>
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
          {labels.map((l, i) =>
            i % step === 0 || i === labels.length - 1 ? (
              <SvgText key={`l${i}`} x={x(i)} y={height - 6} fontSize={10} fill={colors.textSecondary} textAnchor="middle">
                {l}
              </SvgText>
            ) : null,
          )}
        </Svg>
      ) : null}
    </View>
  );
}
