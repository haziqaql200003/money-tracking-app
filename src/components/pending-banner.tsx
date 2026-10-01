import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';

/** Shown on Home while recurring entries are waiting for the user to enter the real amount. Renders nothing otherwise. */
export function PendingBanner() {
  const colors = useTheme();
  const router = useRouter();
  const { pendingEntries } = useTransactions();

  const count = pendingEntries.length;
  if (count === 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/more/recurring')}
      style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.accent }]}
      accessibilityRole="button"
      accessibilityLabel="Review recurring entries that need confirmation"
    >
      <View style={[styles.icon, { backgroundColor: `${colors.accent}26` }]}>
        <Ionicons name="time-outline" size={18} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <ThemedText style={{ fontWeight: '700' }}>
          {count} recurring {count === 1 ? 'entry needs' : 'entries need'} confirming
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Enter the real amount to record {count === 1 ? 'it' : 'them'}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.three,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: Spacing.three,
  },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
});
