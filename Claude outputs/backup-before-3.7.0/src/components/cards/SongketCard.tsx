import React, { useMemo, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { DEFAULT_ACCENT, setSL, tone, withAlpha } from './palette';
import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useSweep } from './shared';

// Pucuk rebung (tumpal) triangles along the bottom edge
const TUMPAL = Array.from({ length: 16 }, (_, i) => i * 20);
// Tiny diamonds along the top edge
const TOP_DIAMONDS = Array.from({ length: 32 }, (_, i) => i * 10 + 5);

export function SongketCard({
  bank,
  icon,
  balance,
  last4,
  hidden,
  onToggleHidden,
  income,
  spending,
  side = 'front',
  onFlip,
  accent = DEFAULT_ACCENT.songket,
  style,
}: WakiraCardProps) {
  const back = side === 'back';
  const [width, setWidth] = useState(340);
  const sweep = useSweep(1700, 3500);
  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, width + 60],
  });
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const key = accent.replace('#', '');
  const c = useMemo(() => {
    const dark = setSL(accent, 35, 3);
    return {
      gold: accent,
      light: tone(accent, 0, -8, 20),
      deep: tone(accent, 0, -6, -22),
      dark,
      bg: [setSL(accent, 35, 4), setSL(accent, 40, 8), dark] as [string, string, string],
    };
  }, [accent]);

  return (
    <View style={[styles.card, { backgroundColor: c.dark }, style]} onLayout={onLayout}>
      <LinearGradient
        colors={c.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <Pattern id={`sk-tile-${key}`} patternUnits="userSpaceOnUse" width="28" height="28">
            <Path d="M14 1 L27 14 L14 27 L1 14 Z" stroke={c.gold} strokeWidth="0.8" fill="none" />
            <Path d="M14 7 L21 14 L14 21 L7 14 Z" stroke={c.gold} strokeWidth="0.6" fill="none" />
            <Circle cx="14" cy="14" r="1.6" fill={c.light} />
            <Circle cx="0" cy="0" r="1.2" fill={c.gold} />
            <Circle cx="28" cy="0" r="1.2" fill={c.gold} />
            <Circle cx="0" cy="28" r="1.2" fill={c.gold} />
            <Circle cx="28" cy="28" r="1.2" fill={c.gold} />
          </Pattern>
          <RadialGradient
            id={`sk-glow-${key}`}
            cx="270"
            cy="30"
            r="170"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={c.light} stopOpacity="0.3" />
            <Stop offset="1" stopColor={c.light} stopOpacity="0" />
          </RadialGradient>
          <SvgLinearGradient id={`sk-band-${key}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c.deep} />
            <Stop offset="0.5" stopColor={c.light} />
            <Stop offset="1" stopColor={c.deep} />
          </SvgLinearGradient>
        </Defs>

        <Rect width="320" height="200" fill={`url(#sk-tile-${key})`} opacity="0.5" />
        <Rect width="320" height="200" fill={`url(#sk-glow-${key})`} />

        {TOP_DIAMONDS.map((x) => (
          <Path
            key={`d${x}`}
            d={`M${x} 7 L${x + 3} 10 L${x} 13 L${x - 3} 10 Z`}
            fill={`url(#sk-band-${key})`}
            opacity="0.85"
          />
        ))}
        <Rect x="0" y="17" width="320" height="0.8" fill={`url(#sk-band-${key})`} opacity="0.8" />

        <Rect x="0" y="176" width="320" height="1" fill={`url(#sk-band-${key})`} />
        {TUMPAL.map((x) => (
          <React.Fragment key={`t${x}`}>
            <Path
              d={`M${x} 200 L${x + 10} 178 L${x + 20} 200 Z`}
              fill={`url(#sk-band-${key})`}
            />
            <Path d={`M${x + 5} 200 L${x + 10} 188 L${x + 15} 200 Z`} fill={c.dark} />
          </React.Fragment>
        ))}
      </Svg>

      {/* Fade the pattern behind the text so the numbers stay readable (a bit stronger on the back) */}
      <LinearGradient
        colors={
          back
            ? [withAlpha(c.dark, 0.9), withAlpha(c.dark, 0.78), withAlpha(c.dark, 0.5)]
            : [withAlpha(c.dark, 0.92), withAlpha(c.dark, 0.6), withAlpha(c.dark, 0)]
        }
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { top: '10%', bottom: '12%' }]}
      />

      {/* Shimmer sweep */}
      <Animated.View
        pointerEvents="none"
        style={[styles.sweep, { transform: [{ translateX }, { rotate: '18deg' }] }]}
      >
        <LinearGradient
          colors={[withAlpha(c.light, 0), withAlpha(c.light, 0.28), withAlpha(c.light, 0)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <CardContent
        bank={bank}
        icon={icon}
        balance={balance}
        last4={last4}
        hidden={hidden}
        onToggleHidden={onToggleHidden}
        income={income}
        spending={spending}
        side={side}
        onFlip={onFlip}
        color={c.light}
        subColor={withAlpha(c.light, 0.65)}
        bottomInset={26}
      />

      <View
        pointerEvents="none"
        style={[styles.border, { borderColor: withAlpha(c.gold, 0.55) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  sweep: { position: 'absolute', top: -40, bottom: -40, width: 70 },
  border: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
  },
});
