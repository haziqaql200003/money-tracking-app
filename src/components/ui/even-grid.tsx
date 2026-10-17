import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = { columns: number; rowGap?: number; children: ReactNode };

/**
 * Lays items out in equal-width columns and centres each item in its column,
 * so the left and right margins of every row are identical.
 */
export function EvenGrid({ columns, rowGap = 8, children }: Props) {
  const width = `${100 / columns}%` as const;
  return (
    <View style={[styles.grid, { rowGap }]}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={[styles.cell, { width }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center' },
});
