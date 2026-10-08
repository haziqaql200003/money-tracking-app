import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Glass } from '@/components/glass/glass';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Shown on Home while recurring entries are waiting for the user to enter the real amount. Renders nothing otherwise. */
export function PendingBanner() {
  const { t, tp } = useT();
  const colors = useTheme();
  const router = useRouter();
  const { pendingEntries } = useTransactions();

  const count = pendingEntries.length;
  if (count === 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/more/recurring')}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={t('home.pending.a11y')}
    >
      <Glass radius={20} tint={colors.accent} style={styles.card}>
        <View style={[styles.icon, { backgroundColor: `${colors.accent}26` }]}>
          <Ionicons name="time-outline" size={18} color={colors.accent} />
        </View>
        <View style={styles.text}>
          <ThemedText style={{ fontWeight: '700' }}>
            {tp('home.pending.title', count)}
          </ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {tp('home.pending.hint', count)}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three },
  icon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
});
