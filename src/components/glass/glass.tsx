import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';

let nativeGlass: boolean | null = null;
/** True only on iOS 26+ where the real Liquid Glass API exists. Checked once, because it cannot change at runtime. */
export function hasNativeGlass() {
  if (nativeGlass === null) {
    try {
      nativeGlass = isGlassEffectAPIAvailable();
    } catch {
      nativeGlass = false;
    }
  }
  return nativeGlass;
}

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Corner radius; the glass shape follows it. */
  radius?: number;
  /** 'regular' is frosted and readable (use for anything holding text). 'clear' is see-through (use over rich imagery). */
  variant?: 'regular' | 'clear';
  /** Optional colour wash, e.g. the accent for an attention banner. */
  tint?: string;
  /** Glass reacts to touch (press shimmer). Use on buttons, not on large cards. */
  interactive?: boolean;
};

/**
 * The single glass surface for the whole app. On iOS 26+ it is real Liquid Glass.
 * Everywhere else (older iOS, Android, web) it falls back to a translucent frosted surface, so screens
 * never need to know which platform they are on. (1.0.8b upgrades the fallback with a real blur.)
 */
export function Glass({ children, style, radius = Radius.lg, variant = 'regular', tint, interactive, ...rest }: Props) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  if (hasNativeGlass()) {
    return (
      <GlassView
        glassEffectStyle={variant}
        tintColor={tint}
        isInteractive={interactive}
        colorScheme={scheme}
        style={[{ borderRadius: radius }, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  const dark = scheme === 'dark';
  return (
    <View
      style={[
        styles.fallback,
        {
          borderRadius: radius,
          backgroundColor: dark ? 'rgba(34,43,70,0.62)' : 'rgba(255,255,255,0.72)',
          borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)',
        },
        style,
      ]}
      {...rest}
    >
      {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.12 }]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
