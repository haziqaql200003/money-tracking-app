import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { PIN_LENGTH } from '@/services/app-lock';

const DIGITS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];

/** Dots plus a number pad. The parent owns the digits and decides what happens when they are all in. */
export function PinPad({
  value,
  onChange,
  disabled,
  corner,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** shown bottom-left, e.g. the fingerprint button */
  corner?: ReactNode;
  error?: boolean;
}) {
  const colors = useTheme();
  const { t } = useT();
  const press = (d: string) => {
    if (!disabled && value.length < PIN_LENGTH) onChange(value + d);
  };
  const key = (d: string) => (
    <Pressable
      key={d}
      disabled={disabled}
      onPress={() => press(d)}
      style={({ pressed }) => [styles.key, { backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.55 }, disabled && { opacity: 0.35 }]}
      accessibilityRole="button"
      accessibilityLabel={d}
    >
      <ThemedText style={styles.keyText}>{d}</ThemedText>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessibilityLabel={t('more.security.pinDots', { n: value.length, total: PIN_LENGTH })}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: error ? colors.negative : colors.textSecondary },
              i < value.length && { backgroundColor: error ? colors.negative : colors.accent, borderColor: error ? colors.negative : colors.accent },
            ]}
          />
        ))}
      </View>
      {DIGITS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map(key)}
        </View>
      ))}
      <View style={styles.row}>
        <View style={styles.slot}>{corner}</View>
        {key('0')}
        <Pressable
          disabled={disabled || value.length === 0}
          onPress={() => onChange(value.slice(0, -1))}
          style={[styles.slot, { opacity: value.length === 0 ? 0.3 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t('more.security.pinDelete')}
        >
          <Ionicons name="backspace-outline" size={26} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 18, height: 18, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  row: { flexDirection: 'row', gap: 22 },
  key: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 28, lineHeight: 34, fontWeight: '500' },
  slot: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center' },
});
