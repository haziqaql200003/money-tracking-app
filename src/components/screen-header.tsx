import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Header for sub-screens: round back button, title, optional action on the right. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { t } = useT();
  const colors = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      <IconButton icon="chevron-back" onPress={() => router.back()} label={t('common.back')} />
      <Text style={[Type.title, styles.title, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: Spacing.two, paddingBottom: Spacing.three },
  title: { flex: 1 },
  right: { minWidth: 40, alignItems: 'flex-end' },
});
