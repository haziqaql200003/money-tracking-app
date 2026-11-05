import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import type { ViewRef } from '@/utils/rn-refs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalanceCarousel } from '@/components/accounts/balance-carousel';
import { useMotionAllowed } from '@/components/cards/motion';
import { HomeDesktop } from '@/components/desktop/home-desktop';
import { useIsDesktop } from '@/components/desktop/use-desktop';
import { HomeGuide } from '@/components/home/home-guide';
import { useHomeLayout, type HomeWidget } from '@/components/home/home-layout';
import { HomeLayoutSheet } from '@/components/home/home-layout-sheet';
import { HomeBento, SafeToSpend } from '@/components/home/home-today';
import { QuickLinks } from '@/components/home/quick-links';
import { PendingBanner } from '@/components/transactions/pending-banner';
import { HomeStoryCard } from '@/components/story/report-stories';
import { RecentTransactions } from '@/components/transactions/recent-transactions';
import { SpendingOverview } from '@/components/home/spending-overview';
import { SyncPill } from '@/components/home/sync-pill';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { isLightColor } from '@/constants/card-styles';
import { Radius, Spacing, Type } from '@/constants/theme';
import { setHomeCard } from '@/context/home-card-store';
import { usePrivacy } from '@/context/PrivacyContext';
import { useProfile } from '@/context/ProfileContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { accountName } from '@/i18n/data';
import { Alert } from '@/services/dialog';

function greetingKey(hour: number): TKey {
  if (hour < 12) return 'home.index.greetMorning';
  if (hour < 15) return 'home.index.greetAfternoon';
  if (hour < 19) return 'home.index.greetEvening';
  return 'home.index.greetNight';
}

/** Each section rises in, one after another, when Home opens and whenever another card is swiped into view. */
function Rise({ trigger, delay, children }: { trigger: string; delay: number; children: ReactNode }) {
  const allowed = useMotionAllowed();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!allowed) {
      v.setValue(1);
      return;
    }
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [trigger, delay, allowed, v]);
  const style = {
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Home, concept A5 (3.7.0): the account cards on top (physical cards that tilt and flip, A5b), then the sections the
 * pengguna arranged: safe to spend today, quick links, a bento of coming up / spending / budget, the spending chart
 * and recent transactions. Swiping a card filters the sections below and, when "Follow the card on Home" is on,
 * a premium card lends its theme to the whole app.
 */
export default function HomeScreen() {
  const { t } = useT();
  const { accounts, ready } = useTransactions();
  const colors = useTheme();
  const router = useRouter();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();
  const { visible } = useHomeLayout();
  const [layoutOpen, setLayoutOpen] = useState(false);

  // null = "All accounts". Set by swiping the card carousel; drives the sections below it.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const cardsRef = useRef<ViewRef>(null);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const selectedName = selectedAccount ? accountName(selectedAccount) : undefined;

  const onSelectAccount = useCallback((id: string | null) => {
    setSelectedAccountId(id);
    setHomeCard(id);
  }, []);

  const { displayName, avatarColor } = useProfile();
  const greeting = t(greetingKey(new Date().getHours()));

  const desktop = useIsDesktop();

  function showComingSoon() {
    Alert.alert(t('home.index.notifications'), t('home.index.comingSoon'));
  }

  if (desktop) {
    return (
      <ThemedView style={styles.container}>
        <HomeDesktop />
      </ThemedView>
    );
  }

  const section = (id: HomeWidget): ReactNode => {
    switch (id) {
      case 'today':
        return <SafeToSpend />;
      case 'quick':
        return <QuickLinks />;
      case 'bento':
        return <HomeBento accountId={selectedAccount?.id} />;
      case 'chart':
        return <SpendingOverview accountId={selectedAccount?.id} accountName={selectedName} />;
      case 'recent':
        return <RecentTransactions accountId={selectedAccount?.id} accountName={selectedName} />;
    }
  };

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
                <Text style={[Type.heading, { color: isLightColor(avatarColor) ? '#141A2E' : '#FFFFFF' }]}>
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
            <IconButton
              icon={hideAmounts ? 'eye-off-outline' : 'eye-outline'}
              onPress={toggleHideAmounts}
              label={hideAmounts ? t('acct.card.showAmounts') : t('acct.card.hideAmounts')}
            />
            <IconButton icon="options-outline" onPress={() => setLayoutOpen(true)} label={t('home.layout.title')} />
            <IconButton icon="notifications-outline" onPress={showComingSoon} label={t('home.index.notifications')} />
          </View>

          <SyncPill />
          <PendingBanner />

          {!ready ? (
            <ScreenSkeleton variant="home" rows={4} />
          ) : (
            <>
              <HomeGuide cardsRef={cardsRef} />
              <HomeStoryCard />
              <View ref={cardsRef} collapsable={false}>
                <BalanceCarousel onSelectAccount={onSelectAccount} />
              </View>
              <View style={styles.sections}>
                {visible.map((id, i) => (
                  <Rise key={id} trigger={selectedAccountId ?? 'all'} delay={i * 70}>
                    {section(id)}
                  </Rise>
                ))}
                <Pressable
                  onPress={() => setLayoutOpen(true)}
                  style={({ pressed }) => [styles.arrange, { borderColor: colors.divider }, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="options-outline" size={16} color={colors.accent} />
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                    {t('home.layout.open')}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <HomeLayoutSheet visible={layoutOpen} onClose={() => setLayoutOpen(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: 130 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two, marginBottom: Spacing.three },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  sections: { gap: Spacing.three },
  arrange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: 12,
  },
});
