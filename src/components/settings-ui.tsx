import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Grouped list pieces shared by Settings, Profile, Data & Privacy and About. */
export function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="small" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>{children}</View>
      {footer ? (
        <ThemedText type="small" style={[styles.footer, { color: colors.textSecondary }]}>
          {footer}
        </ThemedText>
      ) : null}
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
};

export function Row({ icon, label, subtitle, value, right, onPress, danger, first }: RowProps) {
  const colors = useTheme();
  const tint = danger ? colors.negative : colors.accent;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${tint}26` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.flex}>
        <ThemedText style={danger ? { color: colors.negative } : undefined}>{label}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {value}
        </ThemedText>
      ) : null}
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginBottom: Spacing.four },
  sectionTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, marginBottom: 6, marginLeft: 4 },
  card: { borderRadius: 20, overflow: 'hidden' },
  footer: { fontSize: 12, lineHeight: 16, marginTop: 6, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
