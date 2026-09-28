import { View, StyleSheet, useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import { formatMoney } from '@/utils/currency';

const SIZE = 140;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const OTHER_COLOR = '#8E8E93';

type Slice = { categoryId: string; value: number; percent: number };

export function CategoryDonutChart({ slices, total }: { slices: Slice[]; total: number }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // Keep the ring/legend readable: show the top 3 categories, bucket the rest as "Other".
  const top = slices.slice(0, 3);
  const rest = slices.slice(3);
  const otherValue = rest.reduce((sum, s) => sum + s.value, 0);

  const legendItems = [
    ...top.map((s) => {
      const cat = CATEGORIES.find((c) => c.id === s.categoryId);
      return { key: s.categoryId, label: cat?.name ?? s.categoryId, color: cat?.color ?? OTHER_COLOR, percent: s.percent };
    }),
    ...(otherValue > 0
      ? [{ key: 'other', label: 'Other', color: OTHER_COLOR, percent: total > 0 ? (otherValue / total) * 100 : 0 }]
      : []),
  ];

  let cumulative = 0;

  return (
    <View style={styles.row}>
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.backgroundElement} strokeWidth={STROKE} fill="none" />
          {legendItems.map((item) => {
            const length = (item.percent / 100) * CIRCUMFERENCE;
            const dashArray = `${length} ${CIRCUMFERENCE - length}`;
            const dashOffset = -cumulative;
            cumulative += length;
            return (
              <Circle
                key={item.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={item.color}
                strokeWidth={STROKE}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                fill="none"
                rotation={-90}
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
            );
          })}
        </Svg>
        <View style={styles.ringCenter} pointerEvents="none">
          <ThemedText type="small" style={{ color: colors.textSecondary }}>SPENT</ThemedText>
          <ThemedText style={styles.centerAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(total)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.legend}>
        {legendItems.map((item) => (
          <View key={item.key} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <ThemedText style={styles.legendLabel} numberOfLines={1}>{item.label}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{Math.round(item.percent)}%</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  centerAmount: { fontSize: 18, fontWeight: '700', marginTop: 2, maxWidth: SIZE - 30 },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1 },
});