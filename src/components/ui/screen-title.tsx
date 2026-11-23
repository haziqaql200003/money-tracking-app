import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { FitTitle } from '@/components/ui/fit-title';
import { Text } from '@/components/ui/text';

import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Large title at the top of a tab screen (Transaksi, Faham, Lagi). Sub-screens use ScreenHeader instead. */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <FitTitle title={title} fontSize={Type.largeTitle.fontSize} lineHeight={Type.largeTitle.lineHeight} style={[Type.largeTitle, { color: colors.text }]} />
        {right}
      </View>
      {subtitle ? <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: Spacing.three, paddingBottom: Spacing.three, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
