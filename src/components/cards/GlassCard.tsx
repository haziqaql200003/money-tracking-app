import React from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useLoop } from './shared';

type BlobProps = {
  color: string;
  size: number;
  position: ViewStyle;
  duration: number;
  dx: number;
  dy: number;
};

function Blob({ color, size, position, duration, dx, dy }: BlobProps) {
  const t = useLoop(duration);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        position,
        {
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dy, -dy] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.15] }) },
          ],
        },
      ]}
    />
  );
}

export function GlassCard({ bank, balance, last4, hidden, onToggleHidden, style }: WakiraCardProps) {
  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={['#1b1740', '#0f2a3a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Colourful shapes behind the glass */}
      <Blob color="#D4537E" size={170} position={{ left: -40, top: -50 }} duration={7000} dx={22} dy={16} />
      <Blob color="#1D9E75" size={160} position={{ right: -40, bottom: -60 }} duration={9000} dx={-20} dy={-14} />
      <Blob color="#EF9F27" size={110} position={{ right: 50, top: -30 }} duration={8000} dx={18} dy={20} />
      <Blob color="#7F77DD" size={120} position={{ left: 70, bottom: -50 }} duration={10000} dx={-16} dy={14} />

      {/* Frosted layer */}
      <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Light catching the glass */}
      <LinearGradient
        colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <CardContent
        bank={bank}
        balance={balance}
        last4={last4}
        hidden={hidden}
        onToggleHidden={onToggleHidden}
        color="#FFFFFF"
        subColor="rgba(255,255,255,0.72)"
      />

      <View pointerEvents="none" style={styles.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase, backgroundColor: '#14142b' },
  border: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
