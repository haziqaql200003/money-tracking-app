import { useState } from 'react';
import { StyleSheet, FlatList, Pressable, View, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { BalanceCarousel } from '@/components/balance-carousel';
import { SpendingOverview } from '@/components/spending-overview';
import { TransactionRow } from '@/components/transaction-row';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { AccountModal } from '@/components/account-modal';
import { useProfile } from '@/context/ProfileContext';

export default function HomeScreen() {
  const { recentTransactions, accounts } = useTransactions();
  const colors = useTheme();
  const router = useRouter();

  // null = "All accounts". Set by swiping the card carousel; drives the chart and the list below it.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const { displayName } = useProfile();
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  function showComingSoon() {
    Alert.alert('Notifications', 'Coming soon — this will show reminders and budget alerts.');
  }

  const recent = recentTransactions(6, selectedAccount?.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={recent}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
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

              <View style={styles.recentHeaderRow}>
                <ThemedText type="smallBold" style={styles.recentHeading} numberOfLines={1}>
                  {selectedAccount ? `Recent · ${selectedAccount.name}` : 'Recent transactions'}
                </ThemedText>
                <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                    See all
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {selectedAccount
                ? `No transactions in ${selectedAccount.name} yet — tap + below to add one.`
                : 'No transactions yet — tap + below to add your first one.'}
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
        />

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
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  recentHeading: { fontSize: 16 },
});