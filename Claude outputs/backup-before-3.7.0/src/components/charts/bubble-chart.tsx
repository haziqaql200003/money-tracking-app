import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { FontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Bubble = { id: string; x: number; y: number; size: number; color: string };

type Props = {
  bubbles: Bubble[];
  height?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  xLabel: string;
  yLabel: string;
  formatY: (n: number) => string;
};

const PAD_LEFT = 36;
const PAD_TOP = 18;
const PAD_BOTTOM = 20;
const MIN_R = 7;
const MAX_R = 24;

/**
 * A scatter of bubbles: x and y place each one, `size` sets its area. Built from plain views so it
 * renders the same on iOS, Android and web, and every bubble is tappable.
 */
export function BubbleChart({ bubbles, height = 210, selectedId, onSelect, xLabel, yLabel, formatY }: Props) {
  const colors = useTheme();
  const [width, setWidth] = useState(0);
  const plotW = Math.max(0, width - PAD_LEFT - MAX_R);
  const TOP = PAD_TOP + MAX_R;
  const plotH = height - PAD_BOTTOM - MAX_R - PAD_TOP;
  const maxX = Math.max(1, ...bubbles.map((b) => b.x));
  const maxY = Math.max(1, ...bubbles.map((b) => b.y));
  const maxS = Math.max(1, ...bubbles.map((b) => b.size));
  const radius = (s: number) => MIN_R + (MAX_R - MIN_R) * Math.sqrt(s / maxS);
  // Biggest first so small bubbles stay on top and can still be tapped.
  const ordered = [...bubbles].sort((a, b) => b.size - a.size);

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ThemedText type="small" style={[styles.yTop, { color: colors.textSecondary }]} numberOfLines={1}>
        {formatY(maxY)}
      </ThemedText>
      <ThemedText type="small" style={[styles.yLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        ↑ {yLabel}
      </ThemedText>
      <View style={[styles.yAxis, { left: PAD_LEFT, top: PAD_TOP + MAX_R / 2, height: plotH + MAX_R / 2, backgroundColor: colors.divider }]} />
      <View style={[styles.xAxis, { left: PAD_LEFT, right: 0, top: TOP + plotH, backgroundColor: colors.divider }]} />
      <ThemedText type="small" style={[styles.xLabel, { color: colors.textSecondary, left: PAD_LEFT, top: TOP + plotH + 4 }]}>
        0
      </ThemedText>
      <ThemedText type="small" style={[styles.xLabel, { color: colors.textSecondary, right: 0, top: TOP + plotH + 4 }]}>
        {maxX} {xLabel}
      </ThemedText>
      {width > 0
        ? ordered.map((b) => {
            const r = radius(b.size);
            const cx = PAD_LEFT + (b.x / maxX) * plotW;
            const cy = TOP + plotH - (b.y / maxY) * plotH;
            const active = b.id === selectedId;
            return (
              <Pressable
                key={b.id}
                onPress={() => onSelect(b.id)}
                hitSlop={4}
                accessibilityRole="button"
                style={[
                  styles.bubble,
                  {
                    left: cx - r,
                    top: cy - r,
                    width: r * 2,
                    height: r * 2,
                    borderRadius: r,
                    backgroundColor: `${b.color}${active || !selectedId ? 'CC' : '55'}`,
                    borderColor: active ? colors.text : b.color,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  yTop: { position: 'absolute', left: 0, top: PAD_TOP + MAX_R - 7, width: PAD_LEFT - 6, fontSize: FontSize.micro, textAlign: 'right' },
  yLabel: { position: 'absolute', left: PAD_LEFT + 6, top: 0, fontSize: FontSize.micro },
  yAxis: { position: 'absolute', width: StyleSheet.hairlineWidth },
  xAxis: { position: 'absolute', height: StyleSheet.hairlineWidth },
  xLabel: { position: 'absolute', fontSize: FontSize.micro },
  bubble: { position: 'absolute' },
});
