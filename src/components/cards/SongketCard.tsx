import React, { useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useSweep } from './shared';

const GOLD = '#D4AF55';
const GOLD_LIGHT = '#F3DC95';
const GOLD_DEEP = '#9C7A2A';

// Pucuk rebung (tumpal) triangles along the bottom edge
const TUMPAL = Array.from({ length: 16 }, (_, i) => i * 20);
// Tiny diamonds along the top edge
const TOP_DIAMONDS = Array.from({ length: 32 }, (_, i) => i * 10 + 5);

export function SongketCard({ bank, balance, last4, hidden, onToggleHidden, style }: WakiraCardProps) {
  const [width, setWidth] = useState(340);
  const sweep = useSweep(1700, 3500);
  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, width + 60],
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={[styles.card, style]} onLayout={onLayout}>
      <LinearGradient
        colors={['#0d0a05', '#1c150a', '#080603']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <Pattern id="songketTile" patternUnits="userSpaceOnUse" width="28" height="28">
            <Path d="M14 1 L27 14 L14 27 L1 14 Z" stroke={GOLD} strokeWidth="0.8" fill="none" />
            <Path d="M14 7 L21 14 L14 21 L7 14 Z" stroke={GOLD} strokeWidth="0.6" fill="none" />
            <Circle cx="14" cy="14" r="1.6" fill={GOLD_LIGHT} />
            <Circle cx="0" cy="0" r="1.2" fill={GOLD} />
            <Circle cx="28" cy="0" r="1.2" fill={GOLD} />
            <Circle cx="0" cy="28" r="1.2" fill={GOLD} />
            <Circle cx="28" cy="28" r="1.2" fill={GOLD} />
          </Pattern>
          <RadialGradient
            id="songketGlow"
            cx="270"
            cy="30"
            r="170"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={GOLD_LIGHT} stopOpacity="0.3" />
            <Stop offset="1" stopColor={GOLD_LIGHT} stopOpacity="0" />
          </RadialGradient>
          <SvgLinearGradient id="songketBand" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={GOLD_DEEP} />
            <Stop offset="0.5" stopColor={GOLD_LIGHT} />
            <Stop offset="1" stopColor={GOLD_DEEP} />
          </SvgLinearGradient>
        </Defs>

        <Rect width="320" height="200" fill="url(#songketTile)" opacity="0.5" />
        <Rect width="320" height="200" fill="url(#songketGlow)" />

        {TOP_DIAMONDS.map((x) => (
          <Path
            key={`d${x}`}
            d={`M${x} 7 L${x + 3} 10 L${x} 13 L${x - 3} 10 Z`}
            fill="url(#songketBand)"
            opacity="0.85"
          />
        ))}
        <Rect x="0" y="17" width="320" height="0.8" fill="url(#songketBand)" opacity="0.8" />

        <Rect x="0" y="176" width="320" height="1" fill="url(#songketBand)" />
        {TUMPAL.map((x) => (
          <React.Fragment key={`t${x}`}>
            <Path d={`M${x} 200 L${x + 10} 178 L${x + 20} 200 Z`} fill="url(#songketBand)" />
            <Path d={`M${x + 5} 200 L${x + 10} 188 L${x + 15} 200 Z`} fill="#0a0703" />
          </React.Fragment>
        ))}
      </Svg>

      {/* Fade the pattern behind the text so the balance stays readable */}
      <LinearGradient
        colors={['rgba(8,6,3,0.92)', 'rgba(8,6,3,0.6)', 'rgba(8,6,3,0)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { top: '10%', bottom: '12%' }]}
      />

      {/* Gold shimmer sweep */}
      <Animated.View
        pointerEvents="none"
        style={[styles.sweep, { transform: [{ translateX }, { rotate: '18deg' }] }]}
      >
        <LinearGradient
          colors={['rgba(255,236,170,0)', 'rgba(255,236,170,0.28)', 'rgba(255,236,170,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <CardContent
        bank={bank}
        balance={balance}
        last4={last4}
        hidden={hidden}
        onToggleHidden={onToggleHidden}
        color={GOLD_LIGHT}
        subColor="rgba(243,220,149,0.65)"
        bottomInset={26}
      />

      <View pointerEvents="none" style={styles.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase, backgroundColor: '#0d0a05' },
  sweep: { position: 'absolute', top: -40, bottom: -40, width: 70 },
  border: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(212,175,85,0.55)',
  },
});
