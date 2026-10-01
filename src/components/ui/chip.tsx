import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  active?: boolean;
  icon?: IconName;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/** Selectable pill for types, filters and options. Selected = soft indigo fill + indigo outline. */
export function Chip({ label, active, icon, onPress, onLongPress, accessibilityHint, style }: Props) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityHint={accessibilityHint}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.accentSoft : colors.backgroundElement,
          borderColor: active ? colors.accent : colors.divider,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={active ? colors.accent : colors.textSecondary} /> : null}
      <Text style={[Type.label, { color: active ? colors.accent : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
