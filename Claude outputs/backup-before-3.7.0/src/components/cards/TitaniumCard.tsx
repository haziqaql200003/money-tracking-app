import React, { useMemo, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { DEFAULT_ACCENT, hexToHsl, setSL, withAlpha } from './palette';
import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useSweep } from './shared';

// Brushed-metal grain: fine horizontal lines, each with a fixed pseudo-random brightness.
const GRAIN = Array.from({ length: 163 }, (_, i) => {
  const n = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  return { y: i * 1.2, light: n > 0.5, o: n * 0.07 };
});

// Guilloché: fine engraved wave lines, like the security pattern on a banknote.
const GUILLOCHE = Array.from({ length: 14 }, (_, k) => {
  let d = '';
  for (let x = 0; x <= 330; x += 6) {
    const y = 148 + k * 3 + Math.sin(x / 22 + k * 0.45) * 14 + Math.sin(x / 9 + k) * 2;
    d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
  }
  return d;
});

/**
 * A black titanium card: dark brushed metal, an engraved wave pattern, a metal chip, a chamfered
 * edge and a soft band of light that glides across now and then.
 */
export function TitaniumCard({
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
  accent = DEFAULT_ACCENT.titanium,
  style,
}: WakiraCardProps) {
  const back = side === 'back';
  const [width, setWidth] = useState(330);
  const sweep = useSweep(2600, 5200);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const key = accent.replace('#', '');
  const c = useMemo(() => {
    // Keep it metal: only a hint of the chosen colour comes through.
    const sat = Math.min(hexToHsl(accent).s, 30) * 0.5;
    return {
      base: [setSL(accent, sat, 18), setSL(accent, sat, 9), setSL(accent, sat, 5)] as [string, string, string],
      text: setSL(accent, sat * 0.6, 92),
      sub: withAlpha(setSL(accent, sat * 0.6, 78), 0.75),
      chip: [setSL(accent, sat, 86), setSL(accent, sat, 55), setSL(accent, sat, 78)] as [string, string, string],
    };
  }, [accent]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-180, width + 40] });

  return (
    <View style={[styles.card, { backgroundColor: c.base[1] }, style]} onLayout={onLayout}>
      <LinearGradient
        colors={c.base}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Brushed grain and engraved waves */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <RadialGradient id={`ti-top-${key}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.14" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {GRAIN.map((g) => (
          <Rect key={g.y} x="0" y={g.y} width="330" height="0.6" fill={g.light ? '#FFFFFF' : '#000000'} opacity={g.o} />
        ))}
        {GUILLOCHE.map((d, i) => (
          <Path key={i} d={d} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={0.7} fill="none" />
        ))}
        <Ellipse cx="100" cy="-24" rx="300" ry="110" fill={`url(#ti-top-${key})`} />
      </Svg>

      {/* Static reflection, like light on polished metal */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']}
        locations={[0, 0.35, 0.48, 0.56, 0.62]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 0.6 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      {/* Band of light gliding across */}
      <Animated.View pointerEvents="none" style={[styles.sweep, { transform: [{ translateX }, { rotate: '12deg' }] }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.13)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Metal chip (front only) */}
      {back ? null : (
        <View style={styles.chip} pointerEvents="none">
          <LinearGradient colors={c.chip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Svg style={StyleSheet.absoluteFill} viewBox="0 0 38 28">
            <Path
              d="M0 9h12M0 19h12M26 9h12M26 19h12M12 0v28M26 0v28M12 14h14"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.8}
              fill="none"
            />
            <Rect x="12" y="7" width="14" height="14" rx="2" stroke="rgba(0,0,0,0.35)" strokeWidth={0.8} fill="none" />
          </Svg>
        </View>
      )}

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
        color={c.text}
        subColor={c.sub}
        tier="TITANIUM"
        engraved
      />

      {/* Chamfered edge: a bright cut along the rim and a dark groove just inside */}
      <View pointerEvents="none" style={styles.rim} />
      <View pointerEvents="none" style={styles.groove} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  sweep: { position: 'absolute', top: -40, bottom: -40, width: 110 },
  chip: {
    position: 'absolute',
    right: 20,
    top: 46,
    width: 38,
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.45)',
  },
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  groove: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: CARD_RADIUS - 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
  },
});
