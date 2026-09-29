import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Pressable, View, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { BalanceCarousel } from '@/components/balance-carousel';
import { RecentTransactions } from '@/components/recent-transactions';
import { SpendingOverview } from '@/components/spending-overview';
import { useTransactions } from '@/context/TransactionsContext';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/hooks/use-theme';
import { AccountModal } from '@/components/account-modal';
import { useProfile } from '@/context/ProfileContext';

const WHATS_NEW_BODY = `• Budgets with daily pacing and warnings
- Custom categories and icons
- New account card designs
- Hide amounts everywhere
- Bug fixes and improvements`;

export default function HomeScreen() {
  const { accounts } = useTransactions();
  const colors = useTheme();
  const { isReady, showWhatsNew, dismissWhatsNew } = useSettings();

  // null = "All accounts". Set by swiping the card carousel; drives the chart and the list below it.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const { displayName } = useProfile();
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  function showComingSoon() {
    Alert.alert('Notifications', 'Coming soon — this will show reminders and budget alerts.');
  }

  useEffect(() => {
    if (isReady && showWhatsNew) {
      Alert.alert("What's New", WHATS_NEW_BODY, [{ text: 'Got it', onPress: dismissWhatsNew }]);
    }
  }, [isReady, showWhatsNew, dismissWhatsNew]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          <View style={styles.headerRow}>
            <Pressable style={styles.headerLeft} onPress={() => setAccountModalVisible(true)}>
              <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</ThemedText>
              </View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]} numberOfLines={1}>
                Hi, <Text style={[styles.greetingName, { color: colors.text }]}>{displayName}</Text>
              </Text>
            </Pressable>

            <Pressable
              style={[styles.bellButton, { backgroundColor: colors.backgroundElement }]}
              onPress={showComingSoon}
            >
              <ThemedText style={styles.bellIcon}>🔔</ThemedText>
            </Pressable>
          </View>

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
  bellIcon: { fontSize: 18 },
  chartBlock: { marginBottom: Spacing.five },
});