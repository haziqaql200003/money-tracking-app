import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountModal } from '@/components/account-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/context/ProfileContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';

const COMING_SOON = [
  { icon: '🔔', label: 'Notifications' },
  { icon: '⚙️', label: 'Preferences' },
  { icon: '📤', label: 'Export data' },
];

export default function MoreScreen() {
  const colors = useTheme();
  const { displayName } = useProfile();
  const { spentThisMonth } = useTransactions();
  const [profileVisible, setProfileVisible] = useState(false);

  const budgets = CATEGORIES.filter((c) => c.monthlyLimit > 0);

  function comingSoon(label: string) {
    Alert.alert(label, 'Coming soon.');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.heading}>
              More
            </ThemedText>
          </View>

          <Pressable
            style={[styles.card, styles.profileRow, { backgroundColor: colors.backgroundElement }]}
            onPress={() => setProfileVisible(true)}
          >
            <View style={[styles.avatar, { backgroundColor: colors.background }]}>
              <ThemedText style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</ThemedText>
            </View>
            <View style={styles.flex}>
              <ThemedText style={styles.profileName}>{displayName}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                Profile & reset data
              </ThemedText>
            </View>
            <ThemedText style={{ color: colors.textSecondary }}>›</ThemedText>
          </Pressable>

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Budgets this month
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            {budgets.map((cat, i) => {
              const spent = spentThisMonth(cat.id);
              const ratio = spent / cat.monthlyLimit;
              const over = spent > cat.monthlyLimit;
              const barColor = over ? colors.negative : cat.color;
              return (
                <View
                  key={cat.id}
                  style={[
                    styles.budgetRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                  ]}
                >
                  <View style={styles.budgetTop}>
                    <ThemedText>
                      {cat.icon} {cat.name}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: over ? colors.negative : colors.textSecondary, fontWeight: over ? '600' : '400' }}
                    >
                      {over
                        ? `${formatMoney(spent - cat.monthlyLimit)} over`
                        : `${formatMoney(cat.monthlyLimit - spent)} left`}
                    </ThemedText>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.background }]}>
                    <View
                      style={[styles.fill, { backgroundColor: barColor, width: `${Math.min(ratio, 1) * 100}%` }]}
                    />
                  </View>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {formatMoney(spent)} of {formatMoney(cat.monthlyLimit)}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Settings
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            {COMING_SOON.map((item, i) => (
              <Pressable
                key={item.label}
                style={[
                  styles.menuRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                ]}
                onPress={() => comingSoon(item.label)}
              >
                <ThemedText style={styles.menuIcon}>{item.icon}</ThemedText>
                <ThemedText style={styles.flex}>{item.label}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Soon
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" style={[styles.about, { color: colors.textSecondary }]}>
            Money Tracker · MVP build
          </ThemedText>
        </ScrollView>

        <AccountModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 40 },
  header: { paddingVertical: Spacing.three },
  heading: { fontSize: 34, lineHeight: 40 },
  flex: { flex: 1 },
  card: { borderRadius: 16, paddingHorizontal: Spacing.three, marginBottom: Spacing.four },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.two },
  budgetRow: { paddingVertical: Spacing.three, gap: 8 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuIcon: { fontSize: 18 },
  about: { textAlign: 'center', marginTop: Spacing.two },
});