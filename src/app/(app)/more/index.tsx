import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isLightColor } from '@/constants/card-styles';
import { Row, Section } from '@/components/settings/settings-ui';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import type { IconName } from '@/constants/categories';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { useProfile } from '@/context/ProfileContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { budgetStatus, spentByCategory } from '@/utils/budget';
import { formatMoney } from '@/utils/currency';
import { daysToPayday } from '@/utils/cycle';
import { monthKeyFromOffset, toDateKey } from '@/utils/dates';
import { useT } from '@/i18n';
import { refreshFeedback, useFeedback } from '@/services/feedback';
import { useNewReportCount, useStaffRole } from '@/services/staff';
import { CURRENT_VERSION } from '@/constants/changelog';
import { useUpdates } from '@/context/UpdatesContext';

const MASK = 'RM ••••'; // i18n-ignore
const WARN_COLOR = '#D97706';

type MenuItem = { icon: IconName; label: string; subtitle: string; tint: string; href: '/more/rancang' | '/more/assets' | '/more/budgets' | '/more/recurring' | '/more/debts' | '/more/categories' | '/more/settings' | '/more/security' | '/more/data' | '/more/about' | '/more/whats-new' | '/more/tax' | '/more/cashflow' | '/more/planner' | '/more/report' | '/more/feedback' | '/more/inbox'; badge?: boolean };

export default function MoreScreen() {
  const colors = useTheme();
  const { t, tp } = useT();
  const router = useRouter();
  const { displayName, avatarColor } = useProfile();
  const { budgetEntries, recurringRules, pendingEntries, accountBalances } = useTransactions();
  const { goals } = usePlan();
  const { debts } = useDebts();
  const { categories, expenseCategories } = useCategories();
  const { warnPercent, calendarMonths } = useSettings();
  const { hideAmounts } = usePrivacy();
  const { hasUnseenUpdate } = useUpdates();
  const { user } = useAuth();
  const { unseen: feedbackUnseen } = useFeedback(user?.id ?? null);
  const staffRole = useStaffRole(user?.id ?? null);
  const newReports = useNewReportCount(staffRole);
  useFocusEffect(
    useCallback(() => {
      void refreshFeedback();
    }, []),
  );

  const spent = spentByCategory(budgetEntries, monthKeyFromOffset(0));
  const budgeted = expenseCategories.filter((c) => c.monthlyLimit > 0);
  const totalLimit = budgeted.reduce((sum, c) => sum + c.monthlyLimit, 0);
  const totalSpent = budgeted.reduce((sum, c) => sum + (spent.get(c.id) ?? 0), 0);
  const remaining = totalLimit - totalSpent;
  const status = budgetStatus(totalSpent, totalLimit, warnPercent);
  const statusColor = status === 'over' ? colors.negative : status === 'warn' ? WARN_COLOR : colors.positive;
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  const activeRecurring = recurringRules.filter((r) => r.active).length;

  const accountList = accountBalances();
  const netWorth = accountList.reduce((sum, a) => sum + a.balance, 0);

  const features: MenuItem[] = [
    {
      icon: 'wallet-outline',
      label: t('more.index.menu.assets'),
      subtitle: tp('more.index.assets.sub', accountList.length, { amount: money(netWorth) }),
      tint: '#0EA5E9',
      href: '/more/assets',
    },
    {
      icon: 'pie-chart-outline',
      label: t('more.index.menu.budgets'),
      subtitle: t('more.index.budgets.sub', { budgeted: budgeted.length, total: expenseCategories.length }),
      tint: colors.accent,
      href: '/more/budgets',
    },
    {
      icon: 'flag-outline',
      label: t('more.index.menu.rancang'),
      subtitle: goals.length > 0 ? tp('more.index.rancang.withGoals', goals.length) : t('more.index.rancang.empty'),
      tint: '#22C55E',
      href: '/more/rancang',
    },
    {
      icon: 'cash-outline',
      label: t('alloc.title'),
      subtitle: t('alloc.menu.sub'),
      tint: '#10B981',
      href: '/more/planner',
    },
    {
      icon: 'calendar-outline',
      label: t('cal.title'),
      subtitle: t('cal.menu.sub'),
      tint: '#3B82F6',
      href: '/more/cashflow',
    },
    {
      icon: 'document-text-outline',
      label: t('mrep.title'),
      subtitle: t('mrep.menu.sub'),
      tint: '#EC4899',
      href: '/more/report',
    },
    {
      icon: 'receipt-outline',
      label: t('tax.title'),
      subtitle: t('tax.menu.sub'),
      tint: '#EAB308',
      href: '/more/tax',
    },
    {
      icon: 'repeat',
      label: t('more.index.menu.recurring'),
      subtitle:
        pendingEntries.length > 0
          ? t('more.index.recurring.pending', { count: pendingEntries.length })
          : activeRecurring > 0
            ? t('more.index.recurring.active', { count: activeRecurring })
            : t('more.index.recurring.empty'),
      tint: '#8B5CF6',
      href: '/more/recurring',
      badge: pendingEntries.length > 0,
    },
    {
      icon: 'card-outline',
      label: t('more.index.menu.debts'),
      subtitle: debts.length > 0 ? tp('more.index.debts.sub', debts.length) : t('more.index.debts.empty'),
      tint: '#F97316',
      href: '/more/debts',
    },
    {
      icon: 'pricetags-outline',
      label: t('more.index.menu.categories'),
      subtitle: tp('more.index.categories.sub', categories.length),
      tint: '#F0529C',
      href: '/more/categories',
    },
  ];
  const settingsItems: MenuItem[] = [
    {
      icon: 'settings-outline',
      label: t('more.index.menu.settings'),
      subtitle: t('more.index.settings.sub'),
      tint: '#14B8A6',
      href: '/more/settings',
    },
    {
      icon: 'lock-closed-outline',
      label: t('more.security.title'),
      subtitle: t('more.index.security.sub'),
      tint: '#6366F1',
      href: '/more/security',
    },
    {
      icon: 'shield-checkmark-outline',
      label: t('more.data.title'),
      subtitle: t('more.settings.dataSub'),
      tint: '#0EA5E9',
      href: '/more/data',
    },
  ];
  const aboutItems: MenuItem[] = [
    {
      icon: 'megaphone-outline',
      label: t('more.index.menu.whatsNew'),
      subtitle: hasUnseenUpdate ? t('more.index.whatsNew.unseen', { version: CURRENT_VERSION }) : t('more.index.whatsNew.seen', { version: CURRENT_VERSION }),
      tint: '#F59E0B',
      href: '/more/whats-new',
      badge: hasUnseenUpdate,
    },
    {
      icon: 'chatbubble-ellipses-outline',
      label: t('fb.title'),
      subtitle: t('fb.menu.sub'),
      tint: '#06B6D4',
      href: '/more/feedback',
      badge: feedbackUnseen > 0,
    },
    ...(staffRole
      ? [{
          icon: 'file-tray-full-outline' as IconName,
          label: t('inbox.title'),
          subtitle: newReports > 0 ? t('inbox.menu.subNew', { count: newReports }) : t('inbox.menu.sub'),
          tint: '#8B5CF6',
          href: '/more/inbox' as const,
          badge: newReports > 0,
        }]
      : []),
    {
      icon: 'information-circle-outline',
      label: t('more.about.title'),
      subtitle: t('more.settings.aboutSub'),
      tint: '#64748B',
      href: '/more/about',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.heading}>
              {t('more.index.title')}
            </ThemedText>
          </View>

          {/* Profile */}
          <Pressable
            style={[styles.card, styles.profileRow, { backgroundColor: colors.backgroundElement }]}
            onPress={() => router.push('/more/profile')}
          >
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <ThemedText style={[styles.avatarLetter, { color: isLightColor(avatarColor) ? '#111827' : '#FFFFFF' }]}>{displayName.charAt(0).toUpperCase()}</ThemedText>
            </View>
            <View style={styles.flex}>
              <ThemedText style={styles.profileName}>{displayName}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t('more.index.editProfile')}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          {hasUnseenUpdate ? (
            <Pressable
              style={[styles.card, styles.banner, { backgroundColor: colors.backgroundElement, borderColor: colors.accent }]}
              onPress={() => router.push('/more/whats-new')}
            >
              <View style={[styles.bannerIcon, { backgroundColor: `${colors.accent}26` }]}>
                <Ionicons name="sparkles" size={18} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <ThemedText style={{ fontWeight: '700' }}>{t('more.index.banner.title', { version: CURRENT_VERSION })}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('more.index.banner.text')}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}

          {/* Budget snapshot */}
          <Pressable
            style={[styles.card, styles.budgetCard, { backgroundColor: colors.backgroundElement }]}
            onPress={() => router.push('/more/budgets')}
          >
            {totalLimit > 0 ? (
              <>
                <View style={styles.rowBetween}>
                  <ThemedText type="smallBold">{t('more.index.budget.title')}</ThemedText>
                  <ThemedText type="small" style={{ color: statusColor, fontWeight: '700' }}>
                    {status === 'over' ? t('more.index.budget.over') : status === 'warn' ? t('more.index.budget.warn') : t('more.index.budget.ok')}
                  </ThemedText>
                </View>
                <ThemedText style={styles.budgetAmount}>
                  {remaining >= 0 ? t('more.index.budget.left', { amount: money(remaining) }) : t('more.index.budget.overBy', { amount: money(-remaining) })}
                </ThemedText>
                <View style={[styles.track, { backgroundColor: colors.background }]}>
                  <View
                    style={[
                      styles.fill,
                      { backgroundColor: statusColor, width: `${Math.min(totalSpent / totalLimit, 1) * 100}%` },
                    ]}
                  />
                </View>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('more.index.budget.spentOf', { spent: money(totalSpent), total: money(totalLimit) })}
                  {!calendarMonths ? ` · ${tp('more.index.budget.payday', daysToPayday(toDateKey(new Date())))}` : ''}
                </ThemedText>
              </>
            ) : (
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{t('more.index.budget.setupTitle')}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {t('more.index.budget.setupText')}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            )}
          </Pressable>

          {/* Features, settings and about, each under its own heading */}
          {[
            { title: t('more.index.section.features'), items: features },
            { title: t('more.index.section.settings'), items: settingsItems },
            { title: t('more.index.section.about'), items: aboutItems },
          ].map((group) => (
            <Section key={group.title} title={group.title}>
              {group.items.map((item, i) => (
                <Row key={item.label} first={i === 0} icon={item.icon} label={item.label} subtitle={item.subtitle} tint={item.tint} badge={item.badge} onPress={() => router.push(item.href)} />
              ))}
            </Section>
          ))}

          <ThemedText type="small" style={[styles.about, { color: colors.textSecondary }]}>
            {t('more.index.about', { version: CURRENT_VERSION })}
          </ThemedText>
        </ScrollView>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  header: { paddingVertical: Spacing.three },
  heading: { fontSize: FontSize.display, lineHeight: 40 },
  card: { borderRadius: Radius.lg, marginBottom: Spacing.three },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: FontSize.heading, fontWeight: '700' },
  profileName: { fontSize: FontSize.heading, fontWeight: '700' },

  budgetCard: { padding: 20, gap: 8 },
  budgetAmount: { fontSize: FontSize.largeTitle, lineHeight: 34, fontWeight: '700' },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: Radius.pill },

  about: { textAlign: 'center', marginTop: Spacing.two },
  dot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: Radius.pill, borderWidth: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderWidth: 1.5 },
  bannerIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});