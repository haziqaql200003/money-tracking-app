import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import type { ReactNode, RefObject } from 'react';
import { Platform, StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';

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
  /**
   * Android only: the BlurTargetView holding whatever sits behind this surface. Without it Android shows a plain
   * translucent surface (a blur needs to know what to blur). iOS older than 26 blurs on its own.
   */
  blurTarget?: RefObject<View | null>;
};

/**
 * The single glass surface for the whole app. On iOS 26+ it is real Liquid Glass.
 * Everywhere else (older iOS, Android, web) it falls back to a translucent frosted surface, so screens
 * never need to know which platform they are on. (1.0.8b upgrades the fallback with a real blur.)
 */
export function Glass({ children, style, radius = Radius.lg, variant = 'regular', tint, interactive, blurTarget, ...rest }: Props) {
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
  // Real blur: always on iOS < 26; on Android only with a target, and only from Android 12 (older phones are too slow).
  const blurred = Platform.OS === 'ios' || (Platform.OS === 'android' && !!blurTarget && Number(Platform.Version) >= 31);
  return (
    <View
      style={[
        styles.fallback,
        {
          borderRadius: radius,
          backgroundColor: blurred
            ? dark
              ? 'rgba(28,36,62,0.38)'
              : 'rgba(255,255,255,0.46)'
            : dark
              ? 'rgba(34,43,70,0.62)'
              : 'rgba(255,255,255,0.72)',
          borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)',
        },
        style,
      ]}
      {...rest}
    >
      {blurred ? (
        <BlurView
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          tint={dark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
          intensity={variant === 'clear' ? 35 : 70}
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
        />
      ) : null}
      {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.12 }]} /> : null}
      {blurred ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rim, { borderRadius: radius }]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  // A thin bright inner edge, like light catching the rim of real glass.
  rim: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.28)' },
});
