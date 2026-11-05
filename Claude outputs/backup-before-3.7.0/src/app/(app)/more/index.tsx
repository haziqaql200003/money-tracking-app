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

type MenuItem = { icon: IconName; label: string; subtitle: string; tint: string; href: '/more/goals' | '/more/rancang' | '/more/assets' | '/more/budgets' | '/more/recurring' | '/more/debts' | '/more/categories' | '/more/settings' | '/more/security' | '/more/data' | '/more/about' | '/more/whats-new' | '/more/tax' | '/more/cashflow' | '/more/planner' | '/more/report' | '/more/feedback' | '/more/inbox'; badge?: boolean };

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

  // Money: the four places people open most, as tiles.
  const debtsOwed = debts.filter((d) => d.status !== 'done').length;
  const tiles: MenuItem[] = [
    {
      icon: 'wallet-outline',
      label: t('more.index.menu.assets'),
      subtitle: tp('more.index.assets.sub', accountList.length, { amount: money(netWorth) }),
      tint: '#0B84B8',
      href: '/more/assets',
    },
    {
      icon: 'card-outline',
      label: t('more.index.menu.debts'),
      subtitle: debts.length > 0 ? tp('more.index.debts.sub', debtsOwed) : t('more.index.debts.empty'),
      tint: '#C2410C',
      href: '/more/debts',
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
      label: t('plan.goals.title'),
      subtitle: goals.length > 0 ? tp('plan.rancang.goalCount', goals.length) : t('more.index.goals.empty'),
      tint: '#15803D',
      href: '/more/goals',
    },
  ];
  const planning: MenuItem[] = [
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
      icon: 'notifications-outline',
      label: t('more.index.menu.rancang'),
      subtitle: t('more.index.rancang.billsSub'),
      tint: '#22C55E',
      href: '/more/rancang',
    },
  ];
  const reports: MenuItem[] = [
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
      tint: '#CA8A04',
      href: '/more/tax',
    },
    {
      icon: 'pricetags-outline',
      label: t('more.index.menu.categories'),
      subtitle: tp('more.index.categories.sub', categories.length),
      tint: '#F0529C',
      href: '/more/categories',
    },
  ];
  // Settings opens one hub (display, privacy, sign-in, data); help and app info follow.
  const helpItems: MenuItem[] = [
    {
      icon: 'settings-outline',
      label: t('more.index.menu.settings'),
      subtitle: t('more.index.settingsHub.sub'),
      tint: '#14B8A6',
      href: '/more/settings',
    },
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
          <View style={[styles.header, styles.rowBetween]}>
            <ThemedText type="title" style={styles.heading}>
              {t('more.index.title')}
            </ThemedText>
            {/* Profile: the avatar opens it */}
            <Pressable
              onPress={() => router.push('/more/profile')}
              style={({ pressed }) => [styles.profileChip, { backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('more.index.editProfile')}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <ThemedText style={[styles.avatarLetter, { color: isLightColor(avatarColor) ? '#111827' : '#FFFFFF' }]}>{displayName.charAt(0).toUpperCase()}</ThemedText>
              </View>
              <ThemedText type="small" style={{ fontWeight: '700', maxWidth: 110 }} numberOfLines={1}>
                {displayName}
              </ThemedText>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>

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

          {/* My money: tiles */}
          <ThemedText type="small" style={[styles.secLabel, { color: colors.textSecondary }]}>
            {t('more.index.section.money')}
          </ThemedText>
          <View style={styles.grid}>
            {tiles.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [styles.tile, { backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}, ${item.subtitle}`}
              >
                <View style={[styles.tileIcon, { backgroundColor: `${item.tint}1F` }]}>
                  <Ionicons name={item.icon} size={22} color={item.tint} />
                </View>
                <View>
                  <ThemedText style={styles.tileLabel} numberOfLines={1}>{item.label}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={2}>{item.subtitle}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Planning, reports and help, each under its own heading */}
          {[
            { title: t('more.index.section.planning'), items: planning },
            { title: t('more.index.section.reports'), items: reports },
            { title: t('more.index.section.help'), items: helpItems },
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
  profileChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, borderRadius: Radius.pill },
  secLabel: { fontWeight: '700', letterSpacing: 0.8, marginBottom: Spacing.two, marginLeft: Spacing.one, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.four },
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: Radius.lg, padding: 14, gap: 10, minHeight: 124 },
  tileIcon: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontWeight: '700' },
  heading: { fontSize: FontSize.display, lineHeight: 40 },
  card: { borderRadius: Radius.lg, marginBottom: Spacing.three },

  avatar: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: FontSize.body, fontWeight: '800' },

  budgetCard: { padding: 20, gap: 8 },
  budgetAmount: { fontSize: FontSize.largeTitle, lineHeight: 34, fontWeight: '700' },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: Radius.pill },

  about: { textAlign: 'center', marginTop: Spacing.two },
  dot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: Radius.pill, borderWidth: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderWidth: 1.5 },
  bannerIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});