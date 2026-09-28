import { useState } from 'react';
import { StyleSheet, View, useColorScheme, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { ChartPoint, ChartPeriod } from '@/context/TransactionsContext';

const CHART_HEIGHT = 130;
const PADDING_X = 10;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 10;

const PERIOD_COLOR: Record<ChartPeriod, { light: string; dark: string }> = {
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

export function SpendingChart({ data, period }: { data: ChartPoint[]; period: ChartPeriod }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const accent = PERIOD_COLOR[period][isDark ? 'dark' : 'light'];
  const gradientId = `spendingArea-${period}`;

  const [width, setWidth] = useState(0);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const usableWidth = Math.max(width - PADDING_X * 2, 0);
  const usableHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const stepX = n > 1 ? usableWidth / (n - 1) : 0;

  const coords = data.map((point, i) => ({
    x: PADDING_X + stepX * i,
    y: PADDING_TOP + (usableHeight - (point.value / max) * usableHeight),
    point,
  }));

  const linePath = smoothLinePath(coords);
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${CHART_HEIGHT - PADDING_BOTTOM} L ${coords[0].x} ${CHART_HEIGHT - PADDING_BOTTOM} Z`
      : '';

  return (
    <View>
      <View style={styles.chartArea} onLayout={onLayout}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={accent} stopOpacity={0.32} />
                <Stop offset="1" stopColor={accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {coords.length > 1 && <Path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
            {coords.length > 1 && (
              <Path
                d={linePath}
                fill="none"
                stroke={accent}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {coords.map((c, i) => (
              <Circle
                key={c.point.key ?? i}
                cx={c.x}
                cy={c.y}
                r={c.point.isToday ? 5 : 3}
                fill={c.point.isToday ? accent : colors.background}
                stroke={accent}
                strokeWidth={c.point.isToday ? 0 : 2}
              />
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.labelRow}>
        {data.map((point) => (
          <View key={point.key} style={styles.labelColumn}>
            <ThemedText
              type="small"
              style={[
                styles.label,
                { color: point.isToday ? accent : colors.textSecondary },
                point.isToday && styles.labelToday,
              ]}
            >
              {point.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartArea: { width: '100%', height: CHART_HEIGHT },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  labelColumn: { flex: 1, alignItems: 'center' },
  label: {},
  labelToday: { fontWeight: '700' },
});