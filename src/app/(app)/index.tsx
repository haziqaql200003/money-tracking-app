import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalanceCarousel } from '@/components/balance-carousel';
import { PendingBanner } from '@/components/pending-banner';
import { RecentTransactions } from '@/components/recent-transactions';
import { SpendingOverview } from '@/components/spending-overview';
import { SyncPill } from '@/components/sync-pill';
import { ThemedView } from '@/components/themed-view';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { isLightColor } from '@/constants/card-styles';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/context/ProfileContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { accountName } from '@/i18n/data';

function greetingKey(hour: number): TKey {
  if (hour < 12) return 'home.index.greetMorning';
  if (hour < 15) return 'home.index.greetAfternoon';
  if (hour < 19) return 'home.index.greetEvening';
  return 'home.index.greetNight';
}

export default function HomeScreen() {
  const { t } = useT();
  const { accounts, ready } = useTransactions();
  const colors = useTheme();
  const router = useRouter();

  // null = "All accounts". Set by swiping the card carousel; drives the chart and the list below it.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const selectedName = selectedAccount ? accountName(selectedAccount) : undefined;

  const { displayName, avatarColor } = useProfile();
  const greeting = t(greetingKey(new Date().getHours()));

  function showComingSoon() {
    Alert.alert(t('home.index.notifications'), t('home.index.comingSoon'));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.headerLeft}
              onPress={() => router.push('/more/profile')}
              accessibilityRole="button"
              accessibilityLabel={t('more.index.editProfile')}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={[Type.heading, { color: isLightColor(avatarColor) ? Colors.light.text : '#FFFFFF' }]}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]} numberOfLines={1}>
                  {greeting}
                </Text>
                <Text style={[Type.title, { color: colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
            </Pressable>
            <IconButton icon="notifications-outline" onPress={showComingSoon} label={t('home.index.notifications')} />
          </View>

          <SyncPill />
          <PendingBanner />

          {!ready ? (
            <ScreenSkeleton variant="home" rows={4} />
          ) : (
            <>
              <BalanceCarousel onSelectAccount={setSelectedAccountId} />
              <View style={styles.block}>
                <SpendingOverview accountId={selectedAccount?.id} accountName={selectedName} />
              </View>
              <RecentTransactions accountId={selectedAccount?.id} accountName={selectedName} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: 130 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.two, marginBottom: Spacing.three },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  block: { marginBottom: Spacing.four },
});
