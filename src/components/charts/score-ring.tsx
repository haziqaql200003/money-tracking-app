import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = { value: number; color: string; size?: number; stroke?: number; caption?: string };

/** A 0-100 gauge: a ring that fills clockwise from 12 o'clock, with the number in the middle. */
export function ScoreRing({ value, color, size = 128, stroke = 12, caption }: Props) {
  const colors = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value)) / 100;
  return (
    <View style={{ width: size, height: size }}>
      {/* The svg is rotated as a whole: rotating the circle itself trips react-native-svg on web. */}
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.backgroundSelected} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <ThemedText style={[styles.value, { color, fontSize: size * 0.3, lineHeight: size * 0.36 }]}>{Math.round(value)}</ThemedText>
        {caption ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {caption}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontWeight: '800' },
});
