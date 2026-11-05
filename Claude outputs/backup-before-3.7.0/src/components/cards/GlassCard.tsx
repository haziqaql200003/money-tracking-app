import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { DEFAULT_ACCENT, setSL, tone } from './palette';
import { CARD_RADIUS, CardContent, GlowOrb, WakiraCardProps, cardBase } from './shared';

const CLEAR = 'rgba(255,255,255,0)';
const PRISM = ['rgba(255,126,179,0)', '#FF7EB3', '#FFD36E', '#8AFFC1', '#6EC8FF', '#B58CFF', 'rgba(181,140,255,0)'] as const;

/**
 * A slab of polished glass with coloured light trapped inside: soft colour drifting under a
 * frosted surface, a bright reflection across it, polished bevelled edges and a rainbow glint
 * where light splits along the bottom edge.
 */
export function GlassCard({
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
  accent = DEFAULT_ACCENT.glass,
  style,
}: WakiraCardProps) {
  const key = accent.replace('#', '');
  const c = useMemo(
    () => ({
      base: [setSL(accent, 55, 13), setSL(tone(accent, -30), 55, 12)] as [string, string],
      orbA: tone(accent, 0, 10, 14),
      orbB: tone(accent, 55, 10, 8),
      orbC: tone(accent, -50, 10, 10),
    }),
    [accent]
  );

  return (
    <View style={[styles.card, { backgroundColor: c.base[0] }, style]}>
      <LinearGradient colors={c.base} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {/* Coloured light inside the glass */}
      <GlowOrb color={c.orbA} size={270} position={{ left: -90, top: -110 }} duration={10000} dx={18} dy={12} peak={0.95} />
      <GlowOrb color={c.orbB} size={270} position={{ right: -90, bottom: -120 }} duration={12000} dx={-16} dy={-12} peak={0.9} />
      <GlowOrb color={c.orbC} size={190} position={{ right: 10, top: -80 }} duration={9000} dx={14} dy={10} peak={0.8} />

      {/* Frosted surface */}
      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      {/* Reflection across the surface */}
      <LinearGradient
        colors={[CLEAR, CLEAR, 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.06)', CLEAR, CLEAR]}
        locations={[0, 0.3, 0.31, 0.47, 0.48, 1]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 1, y: 0.85 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      {/* Soft light catching the top */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <RadialGradient id={`gl-top-${key}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="66" cy="-30" rx="280" ry="80" fill={`url(#gl-top-${key})`} />
      </Svg>

      {/* Polished top edge and a rainbow glint along the bottom edge */}
      <LinearGradient
        colors={[CLEAR, 'rgba(255,255,255,0.85)', CLEAR]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
        style={styles.topEdge}
      />
      <LinearGradient
        colors={PRISM}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
        style={styles.prism}
      />

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
        color="#FFFFFF"
        subColor="rgba(255,255,255,0.78)"
      />

      {/* Bevel: bright outer rim plus a faint inner rim, so the glass looks thick */}
      <View pointerEvents="none" style={styles.rim} />
      <View pointerEvents="none" style={styles.innerRim} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  topEdge: { position: 'absolute', left: 24, right: 24, top: 0, height: 1.5 },
  prism: { position: 'absolute', left: 30, right: 30, bottom: 0, height: 2, opacity: 0.6 },
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderTopColor: 'rgba(255,255,255,0.6)',
    borderLeftColor: 'rgba(255,255,255,0.4)',
  },
  innerRim: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: CARD_RADIUS - 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
});
