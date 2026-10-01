import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import type { IconName } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** An empty screen is an invitation: say what is missing and offer the one next step. */
export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  const colors = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>
      <Text style={[Type.heading, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[Type.body, { color: colors.textSecondary, textAlign: 'center' }]}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} size="sm" style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five, paddingHorizontal: Spacing.four },
  badge: { width: 56, height: 56, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  action: { marginTop: Spacing.two, alignSelf: 'center' },
});
