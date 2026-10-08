import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Title that sits above a card or list on the page (never inside it), with an optional action on the right. */
export function SectionHeader({ title, subtitle, actionLabel, onAction, style }: Props) {
  const colors = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        <Text style={[Type.heading, styles.flex, { color: colors.text }]} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
            <Text style={[Type.label, { color: colors.accent }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {subtitle ? <Text style={[Type.caption, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.two, marginBottom: Spacing.two + 2, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
