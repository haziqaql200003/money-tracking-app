import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Both side slots share one width, so the title is always dead-centre
// no matter what (or whether) the left/right actions are.
const SLOT_WIDTH = 72;

type Props = { title: string; left?: ReactNode; right?: ReactNode };

export function SheetHeader({ title, left, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.slot, styles.slotLeft]}>{left}</View>
      <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>
      <View style={[styles.slot, styles.slotRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.three },
  slot: { width: SLOT_WIDTH, justifyContent: 'center' },
  slotLeft: { alignItems: 'flex-start' },
  slotRight: { alignItems: 'flex-end' },
  title: { flex: 1, fontSize: 18, textAlign: 'center' },
});
