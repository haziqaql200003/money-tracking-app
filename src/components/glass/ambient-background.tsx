import { StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Soft pools of colour behind a screen. Glass needs something to refract; a flat background gives it
 * nothing to show. Static on purpose (no animation, one SVG), so it costs almost nothing.
 */
export function AmbientBackground() {
  const colors = useTheme();
  const dark = useColorScheme() === 'dark';
  const { width, height } = useWindowDimensions();
  const a = dark ? 0.5 : 0.34; // strength of the main pool

  const blobs = [
    { id: 'indigo', cx: width * 0.9, cy: height * 0.08, r: width * 0.85, color: colors.accent, alpha: a },
    { id: 'pandan', cx: width * 0.05, cy: height * 0.42, r: width * 0.75, color: colors.positive, alpha: a * 0.55 },
    { id: 'gold', cx: width * 0.85, cy: height * 0.78, r: width * 0.7, color: colors.gold, alpha: a * 0.5 },
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          {blobs.map((b) => (
            <RadialGradient key={b.id} id={b.id} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={b.color} stopOpacity={b.alpha} />
              <Stop offset="100%" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {blobs.map((b) => (
          <Circle key={b.id} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${b.id})`} />
        ))}
      </Svg>
    </View>
  );
}
