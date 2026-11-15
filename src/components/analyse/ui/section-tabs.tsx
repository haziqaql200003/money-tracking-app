import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props<K extends string> = {
  items: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
};

/**
 * Underline tabs on the page background. Terperinci pins this bar to the top of the screen
 * (ScrollView stickyHeaderIndices), so it carries its own background and bottom hairline.
 */
export function SectionTabs<K extends string>({ items, value, onChange }: Props<K>) {
  const colors = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, borderBottomColor: colors.divider }]} accessibilityRole="tablist">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((it) => {
          const on = it.key === value;
          return (
            <Pressable
              key={it.key}
              onPress={() => onChange(it.key)}
              style={styles.tab}
              hitSlop={4}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <ThemedText type="smallBold" style={{ color: on ? colors.text : colors.textSecondary }} numberOfLines={1}>
                {it.label}
              </ThemedText>
              <View style={[styles.bar, { backgroundColor: on ? colors.accent : 'transparent' }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.three },
  row: { gap: Spacing.four, paddingRight: Spacing.two },
  tab: { paddingTop: Spacing.two, minHeight: 44, justifyContent: 'flex-end' },
  bar: { height: 3, borderRadius: 2, marginTop: Spacing.two },
});
