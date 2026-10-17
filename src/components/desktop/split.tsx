import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useIsDesktop } from '@/components/desktop/use-desktop';
import { Spacing } from '@/constants/theme';

type Props = { a: ReactNode; b: ReactNode };

/** Two columns side by side on a wide web screen; on a phone or narrow window the two parts simply follow each other. */
export function Split({ a, b }: Props) {
  const desktop = useIsDesktop();
  if (!desktop) {
    return (
      <>
        {a}
        {b}
      </>
    );
  }
  return (
    <View style={styles.row}>
      <View style={styles.col}>{a}</View>
      <View style={styles.col}>{b}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  col: { flex: 1, minWidth: 0 },
});
