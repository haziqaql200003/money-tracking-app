import React, { useMemo, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
  Use,
} from 'react-native-svg';
import { DEFAULT_ACCENT, tone, withAlpha } from './palette';
import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useLoop, useSweep } from './shared';

const GOLD = '#D9B25F';
const GOLD_LIGHT = '#F3DC95';
const GOLD_DEEP = '#9C7A2A';

// Woven texture: weft (across) and warp (down) threads
const WEFT = Array.from({ length: 98 }, (_, i) => i * 2);
const WARP = Array.from({ length: 83 }, (_, i) => i * 4);

// Bunga tabur: small eight-petal gold flowers scattered over the body of the cloth
const BUNGA = (() => {
  const out: { x: number; y: number }[] = [];
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 8; i++) {
      const x = 16 + i * 30 + (j % 2 ? 15 : 0);
      const y = 40 + j * 29;
      if (x <= 222) out.push({ x, y });
    }
  }
  return out;
})();
const PETALS = Array.from({ length: 8 }, (_, i) => i * 45);

// Pucuk rebung teeth along the edge of the kepala kain (head panel)
const TEETH = Array.from({ length: 6 }, (_, i) => 44 + i * 18);

// Gold threads catching the light
const GLINTS_A: [number, number][] = [[60, 60], [290, 80], [120, 150]];
const GLINTS_B: [number, number][] = [[180, 120], [300, 140], [30, 110]];

const star = (x: number, y: number) =>
  `M${x} ${y - 6}L${x + 1.3} ${y - 1.3}L${x + 6} ${y}L${x + 1.3} ${y + 1.3}L${x} ${y + 6}L${x - 1.3} ${y + 1.3}L${x - 6} ${y}L${x - 1.3} ${y - 1.3}Z`;

function Glints({ points, duration, from, to }: { points: [number, number][]; duration: number; from: number; to: number }) {
  const t = useLoop(duration);
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%" viewBox="0 0 330 196" preserveAspectRatio="xMidYMid slice">
        {points.map(([x, y]) => (
          <Path key={`${x}-${y}`} d={star(x, y)} fill="#FFF8E0" />
        ))}
      </Svg>
    </Animated.View>
  );
}

/**
 * Songket Diraja: a royal songket cloth in merah hati, woven with gold. Bunga tabur over the body,
 * a kepala kain panel edged with pucuk rebung, gold threads that glint, and a gold shimmer.
 */
export function DirajaCard({
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
  accent = DEFAULT_ACCENT.diraja,
  style,
}: WakiraCardProps) {
  const [width, setWidth] = useState(330);
  const sweep = useSweep(1800, 4200);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-140, width + 60] });

  const k = accent.replace('#', '');
  const c = useMemo(
    () => ({
      cloth: [accent, tone(accent, 0, 0, -8), tone(accent, 0, 0, -15)] as [string, string, string],
      deep: tone(accent, 0, 0, -15),
      panel: tone(accent, 0, 0, -19),
      notch: tone(accent, 0, 0, -12),
    }),
    [accent]
  );

  return (
    <View style={[styles.card, { backgroundColor: c.cloth[1] }, style]} onLayout={onLayout}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgLinearGradient id={`dj-cloth-${k}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.cloth[0]} />
            <Stop offset="0.5" stopColor={c.cloth[1]} />
            <Stop offset="1" stopColor={c.cloth[2]} />
          </SvgLinearGradient>
          <SvgLinearGradient id={`dj-gold-${k}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GOLD_DEEP} />
            <Stop offset="0.5" stopColor={GOLD_LIGHT} />
            <Stop offset="1" stopColor={GOLD_DEEP} />
          </SvgLinearGradient>
          <Pattern id={`dj-lat-${k}`} patternUnits="userSpaceOnUse" width="16" height="16">
            <Path d="M8 0L16 8L8 16L0 8Z" fill="none" stroke={GOLD} strokeWidth="0.8" />
            <Path d="M8 4L12 8L8 12L4 8Z" fill={GOLD} opacity="0.8" />
          </Pattern>
          <G id={`dj-bunga-${k}`}>
            {PETALS.map((a) => (
              <Ellipse key={a} cx="3.85" cy="0" rx="3.15" ry="1.26" transform={`rotate(${a})`} fill={`url(#dj-gold-${k})`} />
            ))}
            <Circle r="1.26" fill={GOLD_LIGHT} />
          </G>
        </Defs>

        <Rect width="330" height="196" fill={`url(#dj-cloth-${k})`} />
        {WEFT.map((y) => (
          <Rect key={`w${y}`} y={y} width="330" height="1" fill="#000000" opacity={0.09} />
        ))}
        {WARP.map((x) => (
          <Rect key={`p${x}`} x={x} width="1" height="196" fill="#FFFFFF" opacity={0.025} />
        ))}

        {BUNGA.map(({ x, y }) => (
          <React.Fragment key={`${x}-${y}`}>
            <Use href={`#dj-bunga-${k}`} x={x} y={y} opacity={0.55} />
            <Path d={`M${x + 15} ${y + 14.5}l2.5 2.5-2.5 2.5-2.5-2.5z`} fill={GOLD} opacity={0.5} />
          </React.Fragment>
        ))}

        {/* Selvedge lines near the edges */}
        <Rect y="7" width="330" height="1.2" fill={`url(#dj-gold-${k})`} />
        <Rect y="10" width="330" height="0.6" fill={`url(#dj-gold-${k})`} />
        <Rect y="188" width="330" height="1.2" fill={`url(#dj-gold-${k})`} />
        <Rect y="185.4" width="330" height="0.6" fill={`url(#dj-gold-${k})`} />

        {/* Kepala kain */}
        <Rect x="240" y="44" width="90" height="108" fill={c.panel} opacity={0.55} />
        <Rect x="240" y="44" width="90" height="108" fill={`url(#dj-lat-${k})`} opacity={0.75} />
        <Rect x="236" y="42" width="94" height="1.2" fill={`url(#dj-gold-${k})`} />
        <Rect x="236" y="153" width="94" height="1.2" fill={`url(#dj-gold-${k})`} />
        <Rect x="236" y="42" width="1.5" height="112" fill={`url(#dj-gold-${k})`} />
        <Rect x="240" y="44" width="0.7" height="108" fill={`url(#dj-gold-${k})`} />
        {TEETH.map((y) => (
          <React.Fragment key={`t${y}`}>
            <Path d={`M236 ${y} L214 ${y + 9} L236 ${y + 18}Z`} fill={`url(#dj-gold-${k})`} />
            <Path d={`M236 ${y + 4} L224 ${y + 9} L236 ${y + 14}Z`} fill={c.notch} />
          </React.Fragment>
        ))}
      </Svg>

      {/* Darken behind the text */}
      <LinearGradient
        colors={[withAlpha(c.deep, 0.85), withAlpha(c.deep, 0.35), withAlpha(c.deep, 0)]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <Glints points={GLINTS_A} duration={2600} from={0.1} to={0.95} />
      <Glints points={GLINTS_B} duration={3400} from={0.95} to={0.1} />

      {/* Gold shimmer */}
      <Animated.View pointerEvents="none" style={[styles.sweep, { transform: [{ translateX }, { rotate: '18deg' }] }]}>
        <LinearGradient
          colors={['rgba(255,236,170,0)', 'rgba(255,236,170,0.26)', 'rgba(255,236,170,0)']}
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
        color={GOLD_LIGHT}
        subColor="rgba(243,220,149,0.72)"
        tier="DIRAJA"
      />

      <View pointerEvents="none" style={styles.rim} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  sweep: { position: 'absolute', top: -40, bottom: -40, width: 70 },
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(217,178,95,0.6)',
  },
});
