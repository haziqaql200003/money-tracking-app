import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { ProCardDesign } from '@/constants/card-styles';

/**
 * Small, static previews for the design picker. The real cards animate, which is too heavy to
 * run several more times inside a bottom sheet, so these only hint at the look.
 */
export function ProCardThumb({ design }: { design: ProCardDesign }) {
  if (design === 'pro-songket') {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0B0F' }]}>
        <LinearGradient
          colors={['rgba(243,220,149,0.0)', 'rgba(243,220,149,0.35)', 'rgba(243,220,149,0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.line, { top: '30%', backgroundColor: '#D4AF37' }]} />
        <View style={[styles.line, { top: '50%', backgroundColor: '#D4AF37' }]} />
        <View style={[styles.line, { top: '70%', backgroundColor: '#D4AF37' }]} />
      </View>
    );
  }

  if (design === 'pro-glass') {
    return (
      <LinearGradient colors={['#7B5CFF', '#3B2A7A', '#C2549A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
          locations={[0, 0.3, 0.32, 0.5, 0.52]}
          start={{ x: 0, y: 0.15 }}
          end={{ x: 1, y: 0.85 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.glassRim} />
      </LinearGradient>
    );
  }

  if (design === 'pro-titanium') {
    return (
      <LinearGradient colors={['#2E2E33', '#17171A', '#0C0C0E']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill}>
        {[18, 30, 42, 54, 66, 78].map((t) => (
          <View key={t} style={[styles.grain, { top: `${t}%` }]} />
        ))}
        <LinearGradient colors={['#DCDCE1', '#8D8D94', '#C4C4CA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip} />
      </LinearGradient>
    );
  }

  if (design === 'pro-diraja') {
    return (
      <LinearGradient colors={['#7A1426', '#5A0D1B', '#3A0812']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
        {[22, 50, 78].map((t) =>
          [14, 34, 54].map((l) => <View key={`${t}-${l}`} style={[styles.dot, { top: `${t}%`, left: `${l}%` }]} />)
        )}
        <View style={styles.kepala} />
        <View style={[styles.goldLine, { top: '8%' }]} />
        <View style={[styles.goldLine, { bottom: '8%' }]} />
      </LinearGradient>
    );
  }

  if (design === 'pro-batik') {
    return (
      <LinearGradient colors={['#0B4F55', '#0A3348', '#140F3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
        <View style={[styles.leaf, { right: '30%', top: '24%', transform: [{ rotate: '-25deg' }] }]} />
        {[0, 72, 144, 216, 288].map((r) => (
          <View key={r} style={[styles.petal, { transform: [{ rotate: `${r}deg` }, { translateY: -9 }] }]} />
        ))}
        <View style={styles.eye} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#030816', '#0B2A3A', '#0C3540']} style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(196,107,255,0)', 'rgba(196,107,255,0.25)', 'rgba(47,212,164,0.85)', 'rgba(47,212,164,0)']}
        locations={[0, 0.3, 0.55, 0.62]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.mountain} />
      <View style={styles.lake} />
      <View style={styles.window} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', left: '12%', right: '12%', height: 1.5, opacity: 0.7 },
  blob: { position: 'absolute', width: '70%', aspectRatio: 1, borderRadius: 999 },
  mountain: {
    position: 'absolute',
    left: '-10%',
    right: '-10%',
    top: '58%',
    height: '30%',
    backgroundColor: '#13283A',
    transform: [{ skewY: '-6deg' }],
  },
  lake: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '26%', backgroundColor: '#06202A' },
  window: { position: 'absolute', right: '20%', bottom: '28%', width: 4, height: 3, backgroundColor: '#FFD27A' },
  glassRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderTopColor: 'rgba(255,255,255,0.7)',
  },
  grain: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' },
  chip: { position: 'absolute', right: '12%', top: '30%', width: '22%', aspectRatio: 38 / 28, borderRadius: 3 },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#D9B25F', opacity: 0.8 },
  kepala: {
    position: 'absolute',
    right: 0,
    top: '22%',
    bottom: '22%',
    width: '26%',
    backgroundColor: 'rgba(217,178,95,0.35)',
    borderLeftWidth: 1.5,
    borderColor: '#D9B25F',
  },
  goldLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#D9B25F' },
  petal: {
    position: 'absolute',
    right: '14%',
    top: '32%',
    width: 12,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#E0336A',
    borderWidth: 0.8,
    borderColor: '#F7E9CC',
  },
  eye: { position: 'absolute', right: '14%', top: '32%', width: 12, height: 12, marginTop: 3, borderRadius: 6, backgroundColor: '#5B0D1A' },
  leaf: { position: 'absolute', width: 22, height: 9, borderRadius: 9, backgroundColor: '#3E9A5A', borderWidth: 0.8, borderColor: '#F7E9CC' },
});
