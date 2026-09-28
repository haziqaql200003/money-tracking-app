import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { ChartPeriod, ChartPoint } from '@/context/TransactionsContext';
import { formatCompact, formatMoney } from '@/utils/currency';

const GUTTER = 34; // room on the left for the Y-axis labels
const PADDING_TOP = 46; // room above the plot so the tooltip never gets clipped
const PLOT_HEIGHT = 112;
const PADDING_BOTTOM = 8;
const CHART_HEIGHT = PADDING_TOP + PLOT_HEIGHT + PADDING_BOTTOM;
const TOOLTIP_WIDTH = 104;

export const PERIOD_COLOR: Record<ChartPeriod, { light: string; dark: string }> = {
  week: { light: '#3654A6', dark: '#7C93D8' }, // blue
  month: { light: '#8A4FBF', dark: '#B98CE0' }, // purple
  year: { light: '#1F8A70', dark: '#57C9A6' }, // green
};

type Coord = { x: number; y: number };

// Catmull-Rom -> cubic Bezier conversion, so the line curves smoothly through
// every point instead of joining them with straight segments.
function smoothLinePath(coords: Coord[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  if (coords.length === 2) {
    return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  }

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// Rounds up to 1 / 2 / 5 / 10 x a power of ten, so the grid lines land on clean numbers.
function niceCeil(value: number) {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

// "Mon, 21 Sep" for week points, "Sep 2026" for month points, "2026" for year points.
function tooltipTitle(point: ChartPoint, period: ChartPeriod) {
  if (period === 'week') {
    const [y, m, d] = point.key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  if (period === 'month') return `${point.label} ${point.key.split('-')[0]}`;
  return point.label;
}

export function SpendingChart({ data, period }: { data: ChartPoint[]; period: ChartPeriod }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const accent = PERIOD_COLOR[period][isDark ? 'dark' : 'light'];
  const gradientId = `spendingArea-${period}`;

  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const n = data.length;
  const niceMax = niceCeil(Math.max(...data.map((d) => d.value), 0));
  const hasData = data.some((d) => d.value > 0);

  const plotWidth = Math.max(width - GUTTER, 0);
  const colWidth = n > 0 ? plotWidth / n : 0;
  const baselineY = PADDING_TOP + PLOT_HEIGHT;

  // Points sit in the middle of their column, so they line up with the labels underneath.
  const coords = data.map((point, i) => ({
    x: GUTTER + colWidth * (i + 0.5),
    y: PADDING_TOP + PLOT_HEIGHT * (1 - point.value / niceMax),
    point,
    i,
  }));
  const drawn = coords.filter((c) => !c.point.isFuture);

  const linePath = smoothLinePath(drawn);
  const areaPath =
    drawn.length > 1
      ? `${linePath} L ${drawn[drawn.length - 1].x} ${baselineY} L ${drawn[0].x} ${baselineY} Z`
      : '';

  const gridLines = [0, 0.5, 1].map((f) => ({
    y: PADDING_TOP + PLOT_HEIGHT * (1 - f),
    value: niceMax * f,
    baseline: f === 0,
  }));

  const active = selected !== null ? coords[selected] : undefined;
  const tooltipLeft = active ? Math.min(Math.max(active.x - TOOLTIP_WIDTH / 2, GUTTER - 6), width - TOOLTIP_WIDTH) : 0;
  const tooltipTop = active ? Math.max(active.y - 52, 0) : 0;

  return (
    <View>
      <View style={styles.chartArea} onLayout={onLayout}>
        {width > 0 && (
          <>
            <Svg width={width} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={accent} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {gridLines.map((g) => (
                <Line
                  key={g.y}
                  x1={GUTTER}
                  x2={width}
                  y1={g.y}
                  y2={g.y}
                  stroke={colors.divider}
                  strokeWidth={1}
                  strokeDasharray={g.baseline ? undefined : '4 5'}
                />
              ))}
              {gridLines.map((g) => (
                <SvgText
                  key={`t-${g.y}`}
                  x={GUTTER - 8}
                  y={g.y + 3.5}
                  fontSize={10}
                  fill={colors.textSecondary}
                  textAnchor="end"
                >
                  {formatCompact(g.value)}
                </SvgText>
              ))}

              {active && !active.point.isFuture && (
                <Line
                  x1={active.x}
                  x2={active.x}
                  y1={active.y}
                  y2={baselineY}
                  stroke={accent}
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                  strokeDasharray="3 4"
                />
              )}

              {hasData && areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} stroke="none" /> : null}
              {hasData && drawn.length > 1 ? (
                <Path
                  d={linePath}
                  fill="none"
                  stroke={accent}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}

              {hasData &&
                drawn.map((c) => {
                  const isSelected = c.i === selected;
                  const isToday = !!c.point.isToday;
                  return (
                    <G key={c.point.key}>
                      {isSelected && <Circle cx={c.x} cy={c.y} r={10} fill={accent} fillOpacity={0.18} />}
                      <Circle
                        cx={c.x}
                        cy={c.y}
                        r={isSelected ? 5.5 : isToday ? 5 : 3}
                        fill={isSelected || isToday ? accent : colors.background}
                        stroke={accent}
                        strokeWidth={isSelected || isToday ? 0 : 2}
                      />
                    </G>
                  );
                })}
            </Svg>

            {!hasData && (
              <View style={styles.emptyOverlay} pointerEvents="none">
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  No spending in this period
                </ThemedText>
              </View>
            )}

            {/* Tap targets: one full-height column per point. */}
            <View style={[styles.tapRow, { left: GUTTER }]}>
              {data.map((point, i) => (
                <Pressable
                  key={point.key}
                  style={styles.tapColumn}
                  disabled={point.isFuture}
                  onPress={() => setSelected((prev) => (prev === i ? null : i))}
                  accessibilityRole="button"
                  accessibilityLabel={`${tooltipTitle(point, period)}, ${formatMoney(point.value)}`}
                />
              ))}
            </View>

            {active && !active.point.isFuture && (
              <View
                pointerEvents="none"
                style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop, backgroundColor: colors.text }]}
              >
                <ThemedText type="small" style={[styles.tooltipTitle, { color: colors.background }]} numberOfLines={1}>
                  {tooltipTitle(active.point, period)}
                </ThemedText>
                <ThemedText style={[styles.tooltipValue, { color: colors.background }]} numberOfLines={1}>
                  {formatMoney(active.point.value)}
                </ThemedText>
              </View>
            )}
          </>
        )}
      </View>

      <View style={[styles.labelRow, { marginLeft: GUTTER }]}>
        {data.map((point, i) => {
          const highlighted = i === selected || (selected === null && point.isToday);
          return (
            <View key={point.key} style={styles.labelColumn}>
              <ThemedText
                type="small"
                style={[
                  styles.label,
                  { color: highlighted ? accent : colors.textSecondary },
                  highlighted && styles.labelActive,
                  point.isFuture && styles.labelFuture,
                  n > 7 && styles.labelDense,
                ]}
                numberOfLines={1}
              >
                {point.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartArea: { width: '100%', height: CHART_HEIGHT },
  emptyOverlay: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    top: PADDING_TOP,
    height: PLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapRow: { position: 'absolute', top: 0, right: 0, height: CHART_HEIGHT, flexDirection: 'row' },
  tapColumn: { flex: 1 },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tooltipTitle: { fontSize: 11, lineHeight: 14, opacity: 0.7 },
  tooltipValue: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  labelRow: { flexDirection: 'row', marginTop: 4 },
  labelColumn: { flex: 1, alignItems: 'center' },
  label: {},
  labelActive: { fontWeight: '700' },
  labelFuture: { opacity: 0.4 },
  labelDense: { fontSize: 11 },
});