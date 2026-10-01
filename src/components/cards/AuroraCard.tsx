import React from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useLoop } from './shared';

type BlobProps = {
  color: string;
  size: number;
  position: ViewStyle;
  duration: number;
  dx: number;
  dy: number;
};

function AuroraBlob({ color, size, position, duration, dx, dy }: BlobProps) {
  const t = useLoop(duration);
  const id = `aurora-${color.replace('#', '')}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: size, height: size },
        position,
        {
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dy, -dy] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.2] }) },
          ],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity="0.95" />
            <Stop offset="0.5" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function AuroraCard({ bank, balance, last4, hidden, onToggleHidden, style }: WakiraCardProps) {
  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={['#050b1a', '#0a1630', '#060d1c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <AuroraBlob color="#2DE2B0" size={260} position={{ left: -70, top: -90 }} duration={9000} dx={40} dy={20} />
      <AuroraBlob color="#8B7BFF" size={240} position={{ right: -60, top: -60 }} duration={11000} dx={-35} dy={25} />
      <AuroraBlob color="#FF5FA2" size={220} position={{ left: 60, bottom: -120 }} duration={13000} dx={30} dy={-15} />
      <AuroraBlob color="#3AA0FF" size={200} position={{ right: -50, bottom: -90 }} duration={10000} dx={-30} dy={-20} />

      {/* Darken the bottom a little so text stays sharp */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.38)']}
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
  card: { ...cardBase, backgroundColor: '#050b1a' },
  border: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
});
