import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/text';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { BrandAvatar } from '@/components/ui/brand-avatar';
import { useT } from '@/i18n';
import { fitFontSize } from '@/utils/fit-font';

export type CardSide = 'front' | 'back';

/**
 * Details every card design prints the same way (3.7.0): the provider's logo and the holder's name.
 * Set once by AccountCard, so the premium designs do not each need new props.
 */
export const CardExtras = createContext<{ provider?: string; holder?: string }>({});

export type WakiraCardProps = {
  bank: string;
  /** Small icon drawn to the left of the account name (the account's own icon). */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  balance: number;
  last4?: string;
  hidden?: boolean;
  /** Shows a small eye button next to the label when provided. */
  onToggleHidden?: () => void;
  /** This month's totals, shown on the back of the card. */
  income?: number;
  spending?: number;
  /** Which face to draw. The back shows income and spending. */
  side?: CardSide;
  /** Shows a small flip button next to the eye when provided. */
  onFlip?: () => void;
  /** Main colour of the design (hex). Each design has its own default. */
  accent?: string;
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

type GlowOrbProps = {
  color: string; // hex only
  size: number;
  position: ViewStyle;
  duration: number;
  dx: number;
  dy: number;
  peak?: number;
};

// Soft glowing light that drifts slowly (radial gradient, no hard edge)
export function GlowOrb({ color, size, position, duration, dx, dy, peak = 0.9 }: GlowOrbProps) {
  const t = useLoop(duration);
  const id = `orb-${color.replace('#', '')}-${Math.round(peak * 100)}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: size, height: size },
        position,
        {
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dy, -dy] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.18] }) },
          ],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={peak} />
            <Stop offset="0.5" stopColor={color} stopOpacity={peak * 0.45} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const MASK_BALANCE = 'RM ••••••';
const MASK_SPLIT = 'RM ••••';

type StatProps = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  color: string;
  subColor: string;
  textStyle: StyleProp<TextStyle>;
  /** Width the value can use, so the size is worked out rather than left to the native shrink. */
  maxWidth: number;
};

function Stat({ label, icon, value, color, subColor, textStyle, maxWidth }: StatProps) {
  return (
    <View style={styles.stat}>
      <View style={styles.statLabelRow}>
        <Ionicons name={icon} size={12} color={subColor} />
        <Text allowFontScaling={false} style={[styles.statLabel, textStyle, { color: subColor }]}>{label}</Text>
      </View>
      <Text allowFontScaling={false} style={[styles.statValue, textStyle, { color, fontSize: fitFontSize(value, maxWidth, 20, 0.6) }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

type ContentProps = Pick<
  WakiraCardProps,
  'bank' | 'icon' | 'balance' | 'last4' | 'hidden' | 'onToggleHidden' | 'income' | 'spending' | 'side' | 'onFlip'
> & {
  color: string;
  subColor: string;
  bottomInset?: number;
  /** Small label at the bottom right. */
  tier?: string;
  /** Engraved-into-metal text instead of a soft drop shadow. */
  engraved?: boolean;
};

export function CardContent({
  bank,
  icon,
  balance,
  last4,
  hidden,
  onToggleHidden,
  income = 0,
  spending = 0,
  side = 'front',
  onFlip,
  color,
  subColor,
  bottomInset = 0,
  tier = 'PRO', // i18n-ignore: tier name
  engraved = false,
}: ContentProps) {
  const { t } = useT();
  const { provider, holder } = useContext(CardExtras);
  const back = side === 'back';
  const ts = engraved ? styles.engrave : styles.shadow;
  const [boxWidth, setBoxWidth] = useState(0);
  const inner = boxWidth - 40; // content has 20 padding each side
  const balanceText = hidden ? MASK_BALANCE : formatMoney(balance);
  return (
    <View
      style={[styles.content, { paddingBottom: 18 + bottomInset }]}
      pointerEvents="box-none"
      onLayout={(e) => setBoxWidth(Math.round(e.nativeEvent.layout.width))}
    >
      <View style={styles.row} pointerEvents="none">
        <View style={styles.bankRow}>
          {provider ? (
            <BrandAvatar name={provider} size={26} style={styles.logo} />
          ) : icon ? (
            <View style={[styles.iconChip, { borderColor: subColor }]}>
              <Ionicons name={icon} size={13} color={color} />
            </View>
          ) : null}
          <Text allowFontScaling={false} style={[styles.bank, ts, { color }]} numberOfLines={1}>
            {bank}
          </Text>
        </View>
        <View style={styles.brandRow}>
          <Ionicons name="wifi" size={14} color={subColor} style={styles.contactless} />
          {/* i18n-ignore: wordmark */}
          <Text allowFontScaling={false} style={[styles.brand, ts, { color: subColor }]}>WAKIRA</Text>
        </View>
      </View>
      <View>
        <View style={styles.labelRow}>
          <Text allowFontScaling={false} style={[styles.label, ts, { color: subColor }]}>{back ? t('acct.card.thisMonth') : t('acct.card.balance')}</Text>
          {onToggleHidden ? (
            <Pressable
              onPress={onToggleHidden}
              hitSlop={12}
              style={[styles.round, { borderColor: subColor }]}
              accessibilityRole="button"
              accessibilityLabel={hidden ? t('acct.card.showAmounts') : t('acct.card.hideAmounts')}
            >
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={14} color={color} />
            </Pressable>
          ) : null}
          {onFlip ? (
            <Pressable
              onPress={onFlip}
              hitSlop={12}
              style={[styles.round, { borderColor: subColor }]}
              accessibilityRole="button"
              accessibilityLabel={back ? t('acct.card.flipToBalance') : t('acct.card.flipToSplit')}
            >
              <Ionicons name="swap-horizontal-outline" size={14} color={color} />
            </Pressable>
          ) : null}
        </View>
        {back ? (
          <View style={styles.split} pointerEvents="none">
            <Stat
              label={t('acct.card.income')}
              icon="arrow-down"
              value={hidden ? MASK_SPLIT : formatMoney(income)}
              color={color}
              subColor={subColor}
              textStyle={ts}
              maxWidth={(inner - 15) / 2}
            />
            <View style={[styles.divider, { backgroundColor: subColor }]} />
            <Stat
              label={t('acct.card.spending')}
              icon="arrow-up"
              value={hidden ? MASK_SPLIT : formatMoney(spending)}
              color={color}
              subColor={subColor}
              textStyle={ts}
              maxWidth={(inner - 15) / 2}
            />
          </View>
        ) : (
          <Text allowFontScaling={false} style={[styles.balance, ts, { color, fontSize: fitFontSize(balanceText, inner, 28, 0.6) }]} numberOfLines={1} pointerEvents="none">
            {balanceText}
          </Text>
        )}
      </View>
      <View style={styles.rowBottom} pointerEvents="none">
        <View style={styles.holderBox}>
          {holder ? (
            <Text allowFontScaling={false} style={[styles.holder, ts, { color }]} numberOfLines={1}>
              {holder.toUpperCase()}
            </Text>
          ) : null}
          <Text allowFontScaling={false} style={[styles.meta, ts, { color: subColor }]}>{last4 ? `•••• ${last4}` : ' '}</Text>
        </View>
        <Text allowFontScaling={false} style={[styles.meta, ts, { color: subColor }]}>{tier}</Text>
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
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  shadow: {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  engrave: {
    textShadowColor: 'rgba(255,255,255,0.16)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0.5,
  },
  bankRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 },
  iconChip: { width: 24, height: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: 'center', justifyContent: 'center' },
  bank: { flexShrink: 1, fontSize: 15, fontWeight: '600', letterSpacing: 0.4 },
  brand: { fontSize: 11, fontWeight: '600', letterSpacing: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  label: { fontSize: 12 },
  round: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: { fontSize: 28, fontWeight: '600', letterSpacing: 0.5 },
  split: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 34, opacity: 0.5 },
  stat: { flex: 1 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: '600', marginTop: 2 },
  meta: { fontSize: 12, letterSpacing: 1.5 },
  holderBox: { flexShrink: 1, marginRight: 12 },
  holder: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 1 },
  logo: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactless: { transform: [{ rotate: '90deg' }] },
});
