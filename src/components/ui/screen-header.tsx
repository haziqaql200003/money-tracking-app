import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useIsDesktop } from '@/components/desktop/use-desktop';
import { IconButton } from '@/components/ui/icon-button';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Pages the desktop side menu opens directly: there they are a place of their own, so no back button. */
const SIDEBAR_PAGES = new Set(['/more/rancang', '/more/budgets', '/more/debts', '/more/recurring', '/more/assets', '/more/categories', '/more/planner', '/more/cashflow', '/more/report', '/more/tax', '/more/feedback']);

/** Header for sub-screens: round back button, title, optional action on the right. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { t } = useT();
  const colors = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const desktop = useIsDesktop();
  const showBack = !(desktop && SIDEBAR_PAGES.has(pathname));

  return (
    <View style={[styles.row, desktop && styles.desktopRow]}>
      {showBack ? <IconButton icon="chevron-back" onPress={() => router.back()} label={t('common.back')} /> : null}
      <Text style={[Type.title, styles.title, { color: colors.text }, desktop && !showBack && styles.desktopTitle]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: Spacing.two, paddingBottom: Spacing.three },
  title: { flex: 1 },
  desktopRow: { paddingTop: Spacing.four },
  desktopTitle: { fontSize: 30, fontWeight: '800' },
  right: { minWidth: 40, alignItems: 'flex-end' },
});
