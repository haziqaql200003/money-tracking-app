import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { FitTitle } from '@/components/ui/fit-title';
import { Text } from '@/components/ui/text';

import { useIsDesktop } from '@/components/desktop/use-desktop';
import { MENU_PAGES } from '@/components/shell/nav-model';
import { IconButton } from '@/components/ui/icon-button';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';


/** Header for sub-screens: round back button, title, optional action on the right. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { t } = useT();
  const colors = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const desktop = useIsDesktop();
  // Pages the desktop side menu opens directly are places of their own there: no back button (same list as the menu).
  const showBack = !(desktop && MENU_PAGES.has(pathname));

  return (
    <View style={[styles.row, desktop && styles.desktopRow]}>
      {showBack ? <IconButton icon="chevron-back" onPress={() => router.back()} label={t('common.back')} /> : null}
      {desktop && !showBack ? (
        <Text style={[Type.title, styles.title, { color: colors.text }, styles.desktopTitle]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        <FitTitle title={title} fontSize={Type.title.fontSize} lineHeight={Type.title.lineHeight} style={[Type.title, { color: colors.text }]} />
      )}
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
