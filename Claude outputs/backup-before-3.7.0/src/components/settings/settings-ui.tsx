import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Grouped list pieces shared by More, Settings, Profile, Security, Data & Privacy and About. */
export function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.section}>
      {title ? <Text style={[Type.overline, styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text> : null}
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>{children}</View>
      {footer ? <Text style={[Type.caption, styles.footer, { color: colors.textSecondary }]}>{footer}</Text> : null}
    </View>
  );
}

export type RowProps = {
  icon: IconName;
  label: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  first?: boolean;
  /** Icon tile colour; defaults to the accent (or red for danger rows). */
  tint?: string;
  /** Small red dot on the icon (something needs attention). */
  badge?: boolean;
};

export function Row({ icon, label, subtitle, value, right, onPress, danger, first, tint: tintProp, badge }: RowProps) {
  const colors = useTheme();
  const tint = danger ? colors.negative : (tintProp ?? colors.accent);
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}
    >
      <View>
        <View style={[styles.rowIcon, { backgroundColor: `${tint}1F` }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        {badge ? <View style={[styles.dot, { backgroundColor: colors.negative, borderColor: colors.backgroundElement }]} /> : null}
      </View>
      <View style={[styles.body, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
        <View style={styles.flex}>
          <Text style={[Type.body, { color: danger ? colors.negative : colors.text }]}>{label}</Text>
          {subtitle ? <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{subtitle}</Text> : null}
        </View>
        {value ? (
          <Text style={[Type.label, styles.value, { color: colors.textSecondary, fontWeight: '500' }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {right}
        {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginBottom: Spacing.four },
  sectionTitle: { marginBottom: Spacing.two, marginLeft: Spacing.one },
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  footer: { marginTop: Spacing.two, marginHorizontal: Spacing.one },
  // The divider starts after the icon, like iOS grouped lists.
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: Spacing.three },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 13, paddingRight: Spacing.three, minHeight: 56 },
  rowIcon: { width: 32, height: 32, borderRadius: Radius.sm + 1, alignItems: 'center', justifyContent: 'center' },
  value: { maxWidth: '50%' },
  dot: { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: Radius.pill, borderWidth: 2 },
});
