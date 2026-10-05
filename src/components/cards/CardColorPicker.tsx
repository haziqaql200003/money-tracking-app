import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useT } from '@/i18n';
import { ACCENT_PRESETS, hexToHsl, hslToHex } from './palette';

type Props = {
  accent: string;
  onChange: (hex: string) => void;
  labelColor?: string;
};

const HUE_STOPS = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'] as const;
const THUMB = 26;

// Colour picker for Pro cards: ready-made swatches + a hue strip for any colour.
export function CardColorPicker({ accent, onChange, labelColor = '#bbbbbb' }: Props) {
  const { t } = useT();
  // Values the touch handlers need. The handlers outlive the render that made them, so they read this
  // object (kept current in an effect) instead of the props.
  const [live] = useState(() => ({ width: 0, startX: 0, onChange }));
  useEffect(() => {
    Object.assign(live, { onChange });
  });
  const [width, setWidth] = useState(0);

  const hue = hexToHsl(accent).h;

  const [pan] = useState(() => {
    const setFromX = (x: number) => {
      const w = live.width;
      if (!w) return;
      const clamped = Math.max(0, Math.min(w, x));
      live.onChange(hslToHex((clamped / w) * 360, 72, 56));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        live.startX = e.nativeEvent.locationX;
        setFromX(live.startX);
      },
      onPanResponderMove: (_e, g) => setFromX(live.startX + g.dx),
    });
  });

  const onLayout = (e: LayoutChangeEvent) => {
    Object.assign(live, { width: e.nativeEvent.layout.width });
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View>
      <Text style={[styles.label, { color: labelColor }]}>{t('acct.picker.cardColour')}</Text>
      <View style={styles.swatches}>
        {ACCENT_PRESETS.map((p) => {
          const selected = accent.toLowerCase() === p.color.toLowerCase();
          return (
            <Pressable
              key={p.id}
              onPress={() => onChange(p.color)}
              accessibilityLabel={t(p.nameKey)}
              style={[styles.swatchRing, selected && styles.swatchRingOn]}
            >
              <View style={[styles.swatch, { backgroundColor: p.color }]} />
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: labelColor, marginTop: 14 }]}>{t('acct.picker.ownColour')}</Text>
      <View style={styles.strip} onLayout={onLayout} {...pan.panHandlers}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LinearGradient
            colors={HUE_STOPS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          />
          <View
            style={[
              styles.thumb,
              { left: (hue / 360) * width - THUMB / 2, backgroundColor: accent },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRingOn: { borderColor: '#ffffff' },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  strip: { height: 34, justifyContent: 'center' },
  gradient: { position: 'absolute', left: 0, right: 0, top: 4, bottom: 4, borderRadius: 13 },
  thumb: {
    position: 'absolute',
    top: (34 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});