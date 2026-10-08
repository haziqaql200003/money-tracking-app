import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/**
 * Grey placeholder shapes shown while data is still loading from the phone or the server.
 * They pulse gently, or stay still when the phone's "reduce motion" setting is on.
 */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (cancelled || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.55, duration: 800, useNativeDriver: true }),
          ]),
        );
        loop.start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [pulse]);

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.backgroundSelected, opacity: pulse }, style]} />;
}

/** One list row: round icon, two text lines, an amount. */
export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} radius={20} />
      <View style={styles.rowText}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={64} height={14} />
    </View>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return <Skeleton height={height} radius={18} />;
}

type Variant = 'list' | 'cards' | 'home';

/** A whole-screen placeholder. Announces itself once to screen readers instead of every shape. */
export function ScreenSkeleton({ variant = 'list', rows = 6 }: { variant?: Variant; rows?: number }) {
  const { t } = useT();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t('common.loading')} style={styles.wrap}>
      {variant === 'home' ? (
        <>
          <SkeletonCard height={150} />
          <SkeletonCard height={180} />
        </>
      ) : variant === 'cards' ? (
        <>
          <SkeletonCard height={110} />
          <SkeletonCard height={90} />
          <SkeletonCard height={90} />
          <SkeletonCard height={90} />
        </>
      ) : null}
      {variant !== 'cards' ? Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
  rowText: { flex: 1, gap: 8 },
});
