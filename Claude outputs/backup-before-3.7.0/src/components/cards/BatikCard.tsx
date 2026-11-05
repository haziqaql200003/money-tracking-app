import React, { useMemo, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { DEFAULT_ACCENT, hexToHsl, hslToHex, tone, withAlpha } from './palette';
import { CARD_RADIUS, CardContent, GlowOrb, WakiraCardProps, cardBase, useLoop, useSweep } from './shared';

const CREAM = '#F7E9CC'; // the wax (canting) line colour
const PETAL = 'M0 0 C -16 -8, -30 -34, -22 -56 C -15 -70, -6 -64, 0 -70 C 6 -64, 15 -70, 22 -56 C 30 -34, 16 -8, 0 0 Z';
const FIVE = [0, 72, 144, 216, 288];
const POLLEN: [number, number][] = [[22, -48], [27, -50], [24, -54], [19, -53], [26, -45]];

/** Bunga raya drawn the batik way: dyed petals outlined with a wax line. */
function BungaRaya({ fill, eye }: { fill: string; eye: string }) {
  return (
    <>
      {FIVE.map((r) => (
        <G key={r} transform={`rotate(${r})`}>
          <Path d={PETAL} fill={fill} stroke={CREAM} strokeWidth={1.4} />
          <Path d="M0 -10 L0 -55" stroke={CREAM} strokeWidth={0.7} opacity={0.7} />
          <Path d="M0 -30 L-8 -44 M0 -30 L8 -44" stroke={CREAM} strokeWidth={0.5} opacity={0.5} />
        </G>
      ))}
      <Circle r={11} fill={eye} stroke={CREAM} strokeWidth={1} />
      <Path d="M0 0 L22 -48" stroke={CREAM} strokeWidth={2} />
      {POLLEN.map(([x, y]) => (
        <Circle key={`${x}${y}`} cx={x} cy={y} r={2.2} fill="#FFD36E" stroke={CREAM} strokeWidth={0.5} />
      ))}
    </>
  );
}

function Leaf({ fill }: { fill: string }) {
  return (
    <>
      <Path d="M0 0 C 15 -14, 42 -14, 62 0 C 42 14, 15 14, 0 0 Z" fill={fill} stroke={CREAM} strokeWidth={1.3} />
      <Path d="M3 0 L58 0" stroke={CREAM} strokeWidth={0.7} />
      {[14, 26, 38].map((v) => (
        <Path key={v} d={`M${v} 0 L${v + 8} -7 M${v} 0 L${v + 8} 7`} stroke={CREAM} strokeWidth={0.5} opacity={0.7} />
      ))}
    </>
  );
}

/** Awan larat: a curling cloud scroll with canting dots. */
function Awan() {
  return (
    <G fill="none" stroke={CREAM} strokeWidth={1.2}>
      <Path d="M0 0 C 20 -22, 52 -22, 64 0 S 96 26, 108 6 C 113 -4, 104 -12, 97 -5 C 92 0, 97 6, 101 3" />
      <Path d="M0 0 C -6 8, -16 6, -14 -2 C -12 -8, -5 -6, -6 -2" />
      {[12, 28, 44, 74, 88].map((v, i) => (
        <Circle key={v} cx={v} cy={i < 3 ? -13 + Math.abs(v - 32) / 3 : 10} r={1.4} fill={CREAM} stroke="none" />
      ))}
    </G>
  );
}

/**
 * Batik Warisan: a hand-drawn Malaysian batik. A large bunga raya with leaves and awan larat,
 * outlined in wax, colours that bleed and drift like dye, and a silk sheen across the cloth.
 */
export function BatikCard({
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
  accent = DEFAULT_ACCENT.batik,
  style,
}: WakiraCardProps) {
  const [width, setWidth] = useState(330);
  const sweep = useSweep(2600, 5000);
  const sway = useLoop(5200);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const k = accent.replace('#', '');
  const c = useMemo(() => {
    const h = hexToHsl(accent).h;
    const petal = hslToHex(h + 155, 75, 48); // bunga raya: the colour opposite the cloth
    const bloom = hslToHex(h - 140, 85, 55); // small flower: warm gold
    const leafHue = h - 45;
    return {
      cloth: [accent, tone(accent, 22, 0, -6), tone(accent, 70, 0, -6)] as [string, string, string],
      deep: tone(accent, 0, 0, -10),
      bleedA: hslToHex(h + 155, 75, 45),
      bleedB: hslToHex(h - 140, 85, 60),
      petal: [tone(petal, 0, 0, -28), petal, tone(petal, 0, 0, 22)],
      bloom: [tone(bloom, 0, 0, -30), bloom, tone(bloom, 0, 0, 15)],
      leaf: [hslToHex(leafHue, 60, 30), hslToHex(leafHue, 45, 55)],
      eye: tone(petal, 0, 0, -32),
    };
  }, [accent]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-160, width + 40] });
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-2.5deg', '2.5deg'] });
  const scale = sway.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.03] });

  return (
    <View style={[styles.card, { backgroundColor: c.cloth[1] }, style]} onLayout={onLayout}>
      <LinearGradient colors={c.cloth} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {/* Dye bleeding through the cloth */}
      <GlowOrb color={c.bleedA} size={300} position={{ right: -110, top: -110 }} duration={11000} dx={14} dy={10} peak={0.55} />
      <GlowOrb color={c.bleedB} size={300} position={{ left: -90, bottom: -150 }} duration={13000} dx={-14} dy={-8} peak={0.35} />

      {/* Awan larat, leaves, the small flower and crackle lines */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
        <Defs>
          <SvgLinearGradient id={`bt-leaf-${k}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c.leaf[0]} />
            <Stop offset="1" stopColor={c.leaf[1]} />
          </SvgLinearGradient>
          <RadialGradient id={`bt-bloom-${k}`} cx="0" cy="0" r="70" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={c.bloom[0]} />
            <Stop offset="0.4" stopColor={c.bloom[1]} />
            <Stop offset="1" stopColor={c.bloom[2]} />
          </RadialGradient>
        </Defs>
        <G transform="translate(10 150) rotate(-8)" opacity={0.28}>
          <Awan />
        </G>
        <G transform="translate(120 30) rotate(6) scale(0.9)" opacity={0.22}>
          <Awan />
        </G>
        <G transform="translate(150 178) rotate(-4) scale(0.8)" opacity={0.25}>
          <Awan />
        </G>
        <G transform="translate(228 72) rotate(200)">
          <Leaf fill={`url(#bt-leaf-${k})`} />
        </G>
        <G transform="translate(232 128) rotate(155) scale(0.95)">
          <Leaf fill={`url(#bt-leaf-${k})`} />
        </G>
        <G transform="translate(190 180) rotate(-20) scale(0.42)">
          <BungaRaya fill={`url(#bt-bloom-${k})`} eye={c.eye} />
        </G>
        <G stroke="#000000" strokeOpacity={0.18} strokeWidth={0.6} fill="none">
          <Path d="M0 70 L40 74 L62 66 L100 80 L130 72" />
          <Path d="M180 0 L172 30 L184 52 L176 90" />
          <Path d="M90 196 L100 160 L92 140 L110 120" />
        </G>
      </Svg>

      {/* The big bunga raya sways gently */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transformOrigin: '86% 51%', transform: [{ rotate }, { scale }] }]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 330 196" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <RadialGradient id={`bt-petal-${k}`} cx="0" cy="0" r="70" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={c.petal[0]} />
              <Stop offset="0.35" stopColor={c.petal[1]} />
              <Stop offset="1" stopColor={c.petal[2]} />
            </RadialGradient>
          </Defs>
          <G transform="translate(285 100) rotate(10) scale(0.9)">
            <BungaRaya fill={`url(#bt-petal-${k})`} eye={c.eye} />
          </G>
        </Svg>
      </Animated.View>

      {/* Darken behind the text */}
      <LinearGradient
        colors={[withAlpha(c.deep, 0.75), withAlpha(c.deep, 0.25), withAlpha(c.deep, 0)]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      {/* Silk sheen */}
      <Animated.View pointerEvents="none" style={[styles.sweep, { transform: [{ translateX }, { rotate: '16deg' }] }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
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
        color="#FFF7E6"
        subColor="rgba(255,247,230,0.75)"
        tier="WARISAN"
      />

      <View pointerEvents="none" style={styles.rim} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  sweep: { position: 'absolute', top: -40, bottom: -40, width: 90 },
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(247,233,204,0.35)',
  },
});
