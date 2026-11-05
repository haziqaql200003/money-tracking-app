import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { isSpectrumDesign, isTitaniumSeries, type ProCardDesign, type TitaniumFinish } from '@/constants/card-styles';

import { SpectrumThumbArt, type SpectrumVariant } from './SpectrumCard';
import { FINISHES, TitaniumPattern, type TitaniumKind } from './TitaniumSeriesCard';

/**
 * Small, static previews for the design picker. The real cards animate, which is too heavy to
 * run several more times inside a bottom sheet, so these only hint at the look.
 * (3.6.0: Songket, Glass, Diraja and Batik are no longer offered, so they have no preview here.)
 */
export function ProCardThumb({ design, finish = 'graphite' }: { design: ProCardDesign; finish?: TitaniumFinish }) {
  if (isSpectrumDesign(design)) {
    return <SpectrumThumbArt variant={design.replace('pro-spectrum-', '') as SpectrumVariant} />;
  }

  if (isTitaniumSeries(design)) {
    const f = FINISHES[finish];
    return (
      <LinearGradient colors={f.base} locations={[0, 0.45, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill}>
        <TitaniumPattern kind={design.replace('pro-ti-', '') as TitaniumKind} finish={finish} />
        <View style={[styles.bevel, { borderTopColor: f.edge[0], borderLeftColor: f.edge[0], borderBottomColor: f.edge[1], borderRightColor: f.edge[1] }]} />
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

  // Aurora
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
  grain: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' },
  chip: { position: 'absolute', right: '12%', top: '30%', width: '22%', aspectRatio: 38 / 28, borderRadius: 3 },
  bevel: { ...StyleSheet.absoluteFill, borderRadius: 12, borderWidth: 1, opacity: 0.8 },
});
