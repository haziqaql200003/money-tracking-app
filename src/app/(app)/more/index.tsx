import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isLightColor } from '@/constants/card-styles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { IconName } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
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
import { daysToPayday, usesCalendarMonths } from '@/utils/cycle';
import { monthKeyFromOffset, toDateKey } from '@/utils/dates';
import { useT } from '@/i18n';
import { CURRENT_VERSION } from '@/constants/changelog';
import { useUpdates } from '@/context/UpdatesContext';

const MASK = 'RM ••••'; // i18n-ignore
const WARN_COLOR = '#D97706';

type MenuItem = { icon: IconName; label: string; subtitle: string; tint: string; href: '/more/rancang' | '/more/assets' | '/more/budgets' | '/more/recurring' | '/more/debts' | '/more/categories' | '/more/settings' | '/more/whats-new'; badge?: boolean };

export default function MoreScreen() {
  const colors = useTheme();
  const { t, tp } = useT();
  const router = useRouter();
  const { displayName, avatarColor } = useProfile();
  const { budgetEntries, recurringRules, pendingEntries, accountBalances } = useTransactions();
  const { goals } = usePlan();
  const { debts } = useDebts();
  const { categories, expenseCategories } = useCategories();
  const { warnPercent } = useSettings();
  const { hideAmounts } = usePrivacy();
  const { hasUnseenUpdate } = useUpdates();

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

  const menu: MenuItem[] = [
    {
      icon: 'flag-outline',
      label: t('more.index.menu.rancang'),
      subtitle: goals.length > 0 ? tp('more.index.rancang.withGoals', goals.length) : t('more.index.rancang.empty'),
      tint: '#22C55E',
      href: '/more/rancang',
    },
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
    {
      icon: 'settings-outline',
      label: t('more.index.menu.settings'),
      subtitle: t('more.index.settings.sub'),
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
                  {!usesCalendarMonths() ? ` · ${tp('more.index.budget.payday', daysToPayday(toDateKey(new Date())))}` : ''}
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

          {/* Menu */}
          <View style={[styles.card, styles.menuCard, { backgroundColor: colors.backgroundElement }]}>
            {menu.map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [
                  styles.menuRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View>
                  <View style={[styles.menuIcon, { backgroundColor: `${item.tint}26` }]}>
                    <Ionicons name={item.icon} size={20} color={item.tint} />
                  </View>
                  {item.badge ? <View style={[styles.dot, { backgroundColor: colors.negative, borderColor: colors.backgroundElement }]} /> : null}
                </View>
                <View style={styles.flex}>
                  <ThemedText>{item.label}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {item.subtitle}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>

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
  heading: { fontSize: 34, lineHeight: 40 },
  card: { borderRadius: 20, marginBottom: Spacing.three },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 18, fontWeight: '700' },

  budgetCard: { padding: 20, gap: 8 },
  budgetAmount: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },

  menuCard: { paddingHorizontal: Spacing.three },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  about: { textAlign: 'center', marginTop: Spacing.two },
  dot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderWidth: 1.5 },
  bannerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});