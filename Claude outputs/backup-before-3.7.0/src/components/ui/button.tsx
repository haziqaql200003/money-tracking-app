import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/constants/categories';
import { FontSize, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the full width of the parent (default for md). */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** One button, four jobs: primary action, secondary action, quiet action, destructive action. */
export function Button({ label, onPress, variant = 'primary', size = 'md', icon, disabled, loading, fullWidth, style }: Props) {
  const colors = useTheme();
  const off = disabled || loading;

  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: 'transparent' },
    secondary: { bg: colors.backgroundElement, fg: colors.text, border: colors.divider },
    ghost: { bg: 'transparent', fg: colors.accent, border: 'transparent' },
    danger: { bg: 'transparent', fg: colors.negative, border: colors.negative },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'md' ? styles.md : styles.sm,
        (fullWidth ?? size === 'md') && styles.full,
        { backgroundColor: off && variant === 'primary' ? colors.backgroundSelected : palette.bg, borderColor: palette.border },
        pressed && !off && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={off ? colors.textSecondary : palette.fg} /> : null}
          <Text style={[size === 'md' ? Type.heading : Type.label, styles.label, { color: off ? colors.textSecondary : palette.fg }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  md: { minHeight: 52, paddingHorizontal: Spacing.four },
  sm: { minHeight: 44, paddingHorizontal: Spacing.three },
  full: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85 },
  label: { fontSize: FontSize.body },
});
