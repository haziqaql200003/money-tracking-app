import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import type { IconName } from '@/constants/categories';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { icon: IconName; onPress: () => void; label: string; disabled?: boolean; size?: number };

/** Round 40 pt button for header actions (back, export, notifications). */
export function IconButton({ icon, onPress, label, disabled, size = 40 }: Props) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, backgroundColor: colors.backgroundElement, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
