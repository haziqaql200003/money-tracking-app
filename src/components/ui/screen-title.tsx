import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Large title at the top of a tab screen (Transaksi, Faham, Lagi). Sub-screens use ScreenHeader instead. */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[Type.largeTitle, styles.flex, { color: colors.text }]} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      {subtitle ? <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: Spacing.three, paddingBottom: Spacing.three, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
