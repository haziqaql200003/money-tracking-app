import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export type DonutSlice = { id: string; label: string; value: number; color: string };

const SIZE = 196;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 5; // visual gap between segments (px along the ring)

type Props = {
  slices: DonutSlice[];
  /** Highlights one slice and dims the rest. */
  selectedId: string | null;
  /** Content shown in the middle of the ring. */
  children?: ReactNode;
};

export function AccountDonutChart({ slices, selectedId, children }: Props) {
  const colors = useTheme();
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  const arcs = useMemo(() => {
    const result: { id: string; color: string; visible: number; offset: number }[] = [];
    let offset = 0;
    slices.forEach((s) => {
      const length = total > 0 ? (s.value / total) * CIRCUMFERENCE : 0;
      const visible = slices.length > 1 ? Math.max(length - GAP, 0.5) : length;
      result.push({ id: s.id, color: s.color, visible, offset });
      offset += length;
    });
    return result;
  }, [slices, total]);

  return (
    <View style={styles.wrap}>
      {/* Rotated so the first arc starts at 12 o'clock (rotating the circles themselves trips react-native-svg on web). */}
      <Svg width={SIZE} height={SIZE} style={styles.rotate}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.backgroundSelected}
          strokeWidth={STROKE}
          fill="none"
        />
        {arcs.map((arc) => (
          <Circle
            key={arc.id}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.visible} ${CIRCUMFERENCE - arc.visible}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
            fill="none"
            opacity={selectedId && selectedId !== arc.id ? 0.25 : 1}
          />
        ))}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', maxWidth: SIZE - STROKE * 2 - 16 },
});