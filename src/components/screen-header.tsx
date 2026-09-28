import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const colors = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        style={[styles.button, { backgroundColor: colors.backgroundElement }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <ThemedText type="title" style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: Spacing.three },
  button: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 28, lineHeight: 34 },
  right: { minWidth: 36, alignItems: 'flex-end' },
});