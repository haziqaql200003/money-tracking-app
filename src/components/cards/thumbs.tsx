import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { ProCardDesign } from '@/constants/card-styles';

/**
 * Small, static previews for the design picker. The real cards animate (and Glass uses a blur),
 * which is too heavy to run three more times inside a bottom sheet, so these only hint at the look.
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
      <LinearGradient colors={['#4F46E5', '#06B6D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
        <View style={[styles.blob, { backgroundColor: 'rgba(255,255,255,0.28)', top: '-30%', right: '-10%' }]} />
        <View style={[styles.pane, { borderColor: 'rgba(255,255,255,0.5)' }]} />
      </LinearGradient>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B1020' }]}>
      <View style={[styles.blob, { backgroundColor: 'rgba(52,211,153,0.55)', top: '-35%', left: '-10%' }]} />
      <View style={[styles.blob, { backgroundColor: 'rgba(129,140,248,0.55)', bottom: '-40%', right: '-10%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', left: '12%', right: '12%', height: 1.5, opacity: 0.7 },
  blob: { position: 'absolute', width: '70%', aspectRatio: 1, borderRadius: 999 },
  pane: { position: 'absolute', left: '12%', right: '12%', top: '22%', bottom: '22%', borderRadius: 8, borderWidth: 1 },
});
