import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, useColorScheme } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { Account } from '@/context/TransactionsContext';
import { formatMoney } from '@/utils/currency';

const CHART_HEIGHT = 140;
const BAR_GAP = 20;

type AccountBalance = Account & { balance: number };

export function AccountBarChart({ data }: { data: AccountBalance[] }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [width, setWidth] = useState(0);
  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  if (data.length === 0) return null;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.balance)), 1);
  const n = data.length;
  const barWidth = width > 0 ? Math.max((width - BAR_GAP * (n - 1)) / n, 8) : 0;

  return (
    <View>
      <View style={styles.chartArea} onLayout={onLayout}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            {data.map((item, i) => {
              const barHeight = Math.max((Math.abs(item.balance) / maxAbs) * CHART_HEIGHT, 2);
              const x = i * (barWidth + BAR_GAP);
              const y = CHART_HEIGHT - barHeight;
              const fill = item.balance < 0 ? colors.negative : colors.accent;
              return <Rect key={item.id} x={x} y={y} width={barWidth} height={barHeight} rx={8} fill={fill} />;
            })}
          </Svg>
        )}
      </View>

      <View style={styles.labelRow}>
        {data.map((item) => (
          <View key={item.id} style={styles.labelColumn}>
            <ThemedText type="small" style={{ fontWeight: '600' }} numberOfLines={1}>
              {formatMoney(item.balance)}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {item.icon} {item.name}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartArea: { width: '100%', height: CHART_HEIGHT },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  labelColumn: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
});