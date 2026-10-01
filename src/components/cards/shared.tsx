import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export type WakiraCardProps = {
  bank: string;
  balance: number;
  last4?: string;
  hidden?: boolean;
  /** Shows a small eye button next to the balance label when provided. */
  onToggleHidden?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const CARD_ASPECT = 1.6;
export const CARD_RADIUS = 24;

export function formatMoney(value: number): string {
  const negative = value < 0;
  const [whole, decimals] = Math.abs(value).toFixed(2).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}RM ${withCommas}.${decimals}`;
}

// Smooth 0 -> 1 -> 0 loop. Use different durations per element so they drift apart.
export function useLoop(duration: number) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [value, duration]);
  return value;
}

// One-way 0 -> 1 sweep, then waits (pause) before repeating. Good for shimmer.
export function useSweep(duration: number, pause: number) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(pause),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [value, duration, pause]);
  return value;
}

type ContentProps = {
  bank: string;
  balance: number;
  last4?: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
  color: string;
  subColor: string;
  bottomInset?: number;
};

export function CardContent({
  bank,
  balance,
  last4,
  hidden,
  onToggleHidden,
  color,
  subColor,
  bottomInset = 0,
}: ContentProps) {
  return (
    <View style={[styles.content, { paddingBottom: 18 + bottomInset }]} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="none">
        <Text style={[styles.bank, { color }]}>{bank}</Text>
        <Text style={[styles.brand, { color: subColor }]}>WAKIRA</Text>
      </View>
      <View>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: subColor }]}>Baki</Text>
          {onToggleHidden ? (
            <Pressable
              onPress={onToggleHidden}
              hitSlop={12}
              style={[styles.eye, { borderColor: subColor }]}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
            >
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={14} color={color} />
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.balance, { color }]} numberOfLines={1} adjustsFontSizeToFit pointerEvents="none">
          {hidden ? 'RM ••••••' : formatMoney(balance)}
        </Text>
      </View>
      <View style={styles.row} pointerEvents="none">
        <Text style={[styles.meta, { color: subColor }]}>{last4 ? `•••• ${last4}` : ' '}</Text>
        <Text style={[styles.meta, { color: subColor }]}>PRO</Text>
      </View>
    </View>
  );
}

export const cardBase = {
  width: '100%' as const,
  aspectRatio: CARD_ASPECT,
  borderRadius: CARD_RADIUS,
  overflow: 'hidden' as const,
};

const styles = StyleSheet.create({
  content: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 20,
    paddingTop: 18,
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bank: { fontSize: 15, fontWeight: '600', letterSpacing: 0.4 },
  brand: { fontSize: 11, fontWeight: '600', letterSpacing: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  label: { fontSize: 12 },
  eye: { width: 24, height: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  balance: { fontSize: 28, fontWeight: '600', letterSpacing: 0.5 },
  meta: { fontSize: 12, letterSpacing: 1.5 },
});
