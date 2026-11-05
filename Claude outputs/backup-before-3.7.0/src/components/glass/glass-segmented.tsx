import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SlidingGlassTrack } from '@/components/glass/sliding-glass-track';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentOption<K extends string> = {
  key: K;
  label: string;
  /** Label colour while selected (e.g. red for Expense). Defaults to the normal text colour. */
  color?: string;
};

type Props<K extends string> = {
  options: SegmentOption<K>[];
  value: K | null;
  onChange: (key: K) => void;
  /** Track fill. Use `background` when the control sits directly on the screen, `backgroundElement` inside a card. */
  trackColor?: string;
  height?: number;
  disabled?: boolean;
};

/** Segmented control with the sliding glass lens: tap to glide, or hold and drag to scrub. */
export function GlassSegmented<K extends string>({ options, value, onChange, trackColor, height = 44, disabled }: Props<K>) {
  const colors = useTheme();
  const selected = Math.max(0, options.findIndex((o) => o.key === value));
  const radius = height / 2;

  return (
    <View style={disabled ? styles.disabled : undefined} pointerEvents={disabled ? 'none' : 'auto'}>
      <SlidingGlassTrack
        height={height}
        radius={radius}
        inset={3}
        index={selected}
        onSelect={(i) => onChange(options[i].key)}
        background={<View style={[styles.track, { borderRadius: radius, backgroundColor: trackColor ?? colors.backgroundElement }]} />}
        slots={options.map((o, i) => {
          const active = i === selected && value !== null;
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(o.key)}
              style={styles.slot}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
            >
              <Text
                numberOfLines={1}
                style={[Type.label, { color: active ? (o.color ?? colors.text) : colors.textSecondary, fontWeight: active ? '700' : '500' }]}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
});
