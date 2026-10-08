import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inner padding. Default 16; pass 0 for edge-to-edge lists inside the card. */
  padding?: number;
  /** Makes the whole card tappable. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Highlight with an accent outline (e.g. a "new" banner). */
  highlight?: boolean;
};

/** The one card surface: white (or night blue) on the grey page, 20 radius, no outline, no shadow. */
export function Card({ children, style, padding = Spacing.three, onPress, accessibilityLabel, highlight }: Props) {
  const colors = useTheme();
  const surface: ViewStyle = {
    backgroundColor: colors.backgroundElement,
    borderColor: colors.accent,
    borderWidth: highlight ? 1.5 : 0,
    padding,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, surface, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
});
