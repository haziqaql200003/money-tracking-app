import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export type DonutPart = { id: string; value: number; color: string };

type Props = {
  parts: DonutPart[];
  size?: number;
  stroke?: number;
  /** Highlights one part and dims the rest. */
  selectedId?: string | null;
  children?: ReactNode;
};

/** A ring split into parts by value, with a small gap between them and free space in the middle for a label. */
export function Donut({ parts, size = 160, stroke = 22, selectedId = null, children }: Props) {
  const colors = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);

  const arcs = useMemo(() => {
    const out: { id: string; color: string; visible: number; offset: number }[] = [];
    let offset = 0;
    const shown = parts.filter((p) => p.value > 0);
    for (const p of shown) {
      const len = total > 0 ? (p.value / total) * c : 0;
      out.push({ id: p.id, color: p.color, visible: shown.length > 1 ? Math.max(len - 4, 0.5) : len, offset });
      offset += len;
    }
    return out;
  }, [parts, total, c]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.backgroundSelected} strokeWidth={stroke} fill="none" />
        {arcs.map((a) => (
          <Circle
            key={a.id}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={a.color}
            strokeWidth={stroke}
            strokeDasharray={`${a.visible} ${c - a.visible}`}
            strokeDashoffset={-a.offset}
            fill="none"
            opacity={selectedId && selectedId !== a.id ? 0.25 : 1}
          />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <View style={{ maxWidth: size - stroke * 2 - 8, alignItems: 'center' }}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { alignItems: 'center', justifyContent: 'center' },
});
