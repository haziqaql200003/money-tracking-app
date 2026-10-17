import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { recordError } from '@/services/error-log';

/** Shown instead of a blank screen when a screen fails to draw. The error goes to the on-device error log. */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const colors = useTheme();
  const { t } = useT();
  useEffect(() => {
    void recordError(error, true);
  }, [error]);
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('common.crashTitle')}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{t('common.crashBody')}</Text>
      <Pressable onPress={() => void retry()} accessibilityRole="button" style={[styles.button, { backgroundColor: colors.accent }]}>
        <Text style={[styles.buttonText, { color: colors.onAccent }]}>{t('common.crashRetry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { fontSize: FontSize.title, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: FontSize.body, textAlign: 'center', maxWidth: 420, lineHeight: 22 },
  button: { paddingVertical: 12, paddingHorizontal: Spacing.four, borderRadius: Radius.md },
  buttonText: { fontSize: FontSize.body, fontWeight: '700' },
});
