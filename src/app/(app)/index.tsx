import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, ScrollView, Pressable, View, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/glass/ambient-background';
import { Glass } from '@/components/glass/glass';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { BalanceCarousel } from '@/components/balance-carousel';
import { PendingBanner } from '@/components/pending-banner';
import { RecentTransactions } from '@/components/recent-transactions';
import { SpendingOverview } from '@/components/spending-overview';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { AccountModal } from '@/components/account-modal';
import { isLightColor } from '@/constants/card-styles';
import { useProfile } from '@/context/ProfileContext';

export default function HomeScreen() {
  const { accounts } = useTransactions();
  const colors = useTheme();

  // null = "All accounts". Set by swiping the card carousel; drives the chart and the list below it.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const { displayName, avatarColor } = useProfile();
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  function showComingSoon() {
    Alert.alert('Notifications', 'Coming soon — this will show reminders and budget alerts.');
  }

  return (
    <ThemedView style={styles.container}>
      <AmbientBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          <View style={styles.headerRow}>
            <Pressable style={styles.headerLeft} onPress={() => setAccountModalVisible(true)}>
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <ThemedText style={[styles.avatarLetter, { color: isLightColor(avatarColor) ? '#111827' : '#FFFFFF' }]}>{displayName.charAt(0).toUpperCase()}</ThemedText>
              </View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]} numberOfLines={1}>
                Hi, <Text style={[styles.greetingName, { color: colors.text }]}>{displayName}</Text>
              </Text>
            </Pressable>

            <Pressable onPress={showComingSoon} accessibilityRole="button" accessibilityLabel="Notifications">
              <Glass radius={20} interactive style={styles.bellButton}>
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
              </Glass>
            </Pressable>
          </View>

          <PendingBanner />

          <BalanceCarousel onSelectAccount={setSelectedAccountId} />

          <View style={styles.chartBlock}>
            <SpendingOverview accountId={selectedAccount?.id} accountName={selectedAccount?.name} />
          </View>

          <RecentTransactions accountId={selectedAccount?.id} accountName={selectedAccount?.name} />
        </ScrollView>

        <AccountModal visible={accountModalVisible} onClose={() => setAccountModalVisible(false)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: 130 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontWeight: '700' },
  greeting: { fontSize: 28, lineHeight: 34, fontWeight: '400', flexShrink: 1 },
  greetingName: { fontWeight: '700' },
  bellButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chartBlock: { marginBottom: Spacing.four },
});
