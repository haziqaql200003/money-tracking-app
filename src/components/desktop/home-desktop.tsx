import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { HomeUpcoming } from '@/components/home/home-upcoming';
import { PendingBanner } from '@/components/transactions/pending-banner';
import { RecentTransactions } from '@/components/transactions/recent-transactions';
import { SpendingOverview } from '@/components/home/spending-overview';
import { HomeStoryCard } from '@/components/story/report-stories';
import { SyncPill } from '@/components/home/sync-pill';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useProfile } from '@/context/ProfileContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { budgetStatus, spentByCategory } from '@/utils/budget';
import { formatMoney } from '@/utils/currency';
import { cycleOf, daysToPayday } from '@/utils/cycle';
import { cycleRangeLabel, monthKeyFromOffset, monthLabel, toDateKey } from '@/utils/dates';
import { creditStatus, overview } from '@/utils/debts';
import { looksLikeSavings } from '@/utils/saved';

const MASK = 'RM ••••'; // i18n-ignore

function greetingKey(hour: number): TKey {
  if (hour < 12) return 'home.index.greetMorning';
  if (hour < 15) return 'home.index.greetAfternoon';
  if (hour < 19) return 'home.index.greetEvening';
  return 'home.index.greetNight';
}

/**
 * Home on a wide web screen: the month at a glance in four figures, then the chart beside what is coming up, and
 * budgets beside the latest records. Same data and components as the phone Home, arranged for a desktop.
 */
export function HomeDesktop() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { ready, selectableAccounts, transactions, accountBalance, budgetEntries } = useTransactions();
  const { expenseCategories } = useCategories();
  const { debts } = useDebts();
  const { warnPercent, calendarMonths } = useSettings();
  const { hideAmounts } = usePrivacy();
  const { displayName } = useProfile();

  // Smaller figures on a narrower window, so a long amount still fits its tile.
  const { width } = useWindowDimensions();
  const figure = { fontSize: width >= 1360 ? 26 : width >= 1180 ? 22 : 19 };
  const today = toDateKey(new Date());
  const monthKey = monthKeyFromOffset(0);
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  const spendable = selectableAccounts.filter((a) => !looksLikeSavings(a));
  const spendableIds = new Set(spendable.map((a) => a.id));
  const spendableBalance = spendable.reduce((s, a) => s + accountBalance(a.id), 0);
  const nowCycle = cycleOf(today);
  let income = 0;
  let spending = 0;
  for (const x of transactions) {
    if (!spendableIds.has(x.accountId) || cycleOf(x.date) !== nowCycle) continue;
    if (x.type === 'credit') income += x.amount;
    else spending += x.amount;
  }
  const kept = income - spending;

  const spent = spentByCategory(budgetEntries, monthKey);
  const budgeted = expenseCategories.filter((c) => c.monthlyLimit > 0);
  const totalLimit = budgeted.reduce((s, c) => s + c.monthlyLimit, 0);
  const totalSpent = budgeted.reduce((s, c) => s + (spent.get(c.id) ?? 0), 0);
  const budgetRows = budgeted
    .map((c) => {
      const used = spent.get(c.id) ?? 0;
      return { id: c.id, name: categoryName(c), used, limit: c.monthlyLimit, pct: c.monthlyLimit > 0 ? used / c.monthlyLimit : 0, status: budgetStatus(used, c.monthlyLimit, warnPercent) };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const creditUsed: Record<string, number> = {};
  for (const d of debts) if (d.kind === 'credit') creditUsed[d.id] = creditStatus(d.creditLimit ?? 0, accountBalance(d.accountId)).used;
  const debt = overview(debts, creditUsed, today);

  const statusColor = (s: string) => (s === 'over' ? colors.negative : s === 'warn' ? colors.warning : colors.accent);
  const card = [styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }];

  const tile = (label: string, value: string, sub: string, href: Href, valueColor?: string, dark?: boolean) => (
    <Pressable
      onPress={() => router.navigate(href)}
      accessibilityRole="link"
      style={({ pressed }) => [card, styles.tile, dark && { backgroundColor: colors.text, borderColor: colors.text }, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.tileLabel, { color: dark ? colors.background : colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.tileValue, figure, { color: dark ? colors.background : (valueColor ?? colors.text) }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.tileSub, { color: dark ? colors.background : colors.textSecondary }]} numberOfLines={2}>
        {sub}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={[styles.greet, { color: colors.textSecondary }]}>
            {t(greetingKey(new Date().getHours()))}, {displayName}
          </Text>
          <Text style={[styles.month, { color: colors.text }]}>{monthLabel(monthKey)}</Text>
          <Text style={[styles.greet, { color: colors.textSecondary }]}>{cycleRangeLabel(monthKey)}</Text>
        </View>
        <SyncPill />
      </View>

      <PendingBanner />
      <HomeStoryCard />

      {!ready ? (
        <ScreenSkeleton variant="home" rows={4} />
      ) : (
        <>
          <View style={styles.row}>
            {tile(t('home.carousel.spendable'), money(spendableBalance), t('home.desktop.accountsSub', { count: spendable.length }), '/more/assets', undefined, true)}
            {tile(
              t('home.desktop.spentMonth'),
              money(spending),
              totalLimit > 0
                ? t('home.desktop.ofBudget', { pct: Math.round((totalSpent / totalLimit) * 100), budget: money(totalLimit) })
                : t('home.desktop.noBudget'),
              '/more/budgets',
              colors.negative,
            )}
            {tile(
              t('home.desktop.keptMonth'),
              money(kept),
              income > 0 && kept > 0 ? t('home.desktop.keptSub', { pct: ((kept / income) * 100).toFixed(1) }) : t('home.desktop.incomeSub', { income: money(income) }),
              '/analyse',
              kept >= 0 ? colors.positive : colors.negative,
            )}
            {tile(
              t('home.desktop.owed'),
              money(debt.totalOwed),
              debt.activeCount > 0 ? t('home.desktop.owedSub', { count: debt.activeCount, due: money(debt.dueThisMonth) }) : t('home.desktop.noDebt'),
              '/more/debts',
            )}
          </View>

          {/* The Coming up box is as tall as the chart beside it, also when nothing is due. */}
          <View style={[styles.row, styles.rowStretch]}>
            <View style={styles.wide}>
              <SpendingOverview />
            </View>
            <View style={[styles.narrow, styles.upcomingCol]}>
              <HomeUpcoming variant="list" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[card, styles.narrow, styles.budget]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{t('more.index.budget.title')}</Text>
                <Pressable onPress={() => router.navigate('/more/budgets')} accessibilityRole="link" hitSlop={8}>
                  <Text style={[styles.link, { color: colors.accent }]}>{t('plan.rancang.manage')}</Text>
                </Pressable>
              </View>
              {budgetRows.length === 0 ? (
                <Text style={[styles.tileSub, { color: colors.textSecondary }]}>{t('more.index.budget.setupText')}</Text>
              ) : (
                budgetRows.map((b) => (
                  <View key={b.id} style={styles.budgetRow}>
                    <View style={styles.budgetTop}>
                      <Text style={[styles.budgetName, { color: colors.text }]} numberOfLines={1}>
                        {b.name}
                      </Text>
                      <Text style={[styles.budgetAmt, { color: b.status === 'ok' ? colors.text : statusColor(b.status) }]}>
                        {money(b.used)} / {money(b.limit)}
                      </Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                      <View style={[styles.fill, { width: `${Math.min(100, b.pct * 100)}%`, backgroundColor: statusColor(b.status) }]} />
                    </View>
                  </View>
                ))
              )}
              {!calendarMonths ? (
                <Text style={[styles.tileSub, { color: colors.textSecondary }]}>{t('home.desktop.payday', { days: daysToPayday(today) })}</Text>
              ) : null}
            </View>
            <View style={styles.wide}>
              <RecentTransactions />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: Spacing.five, paddingTop: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  flex: { flex: 1 },
  greet: { fontSize: FontSize.label },
  month: { fontSize: FontSize.largeTitle, fontWeight: '800', letterSpacing: -0.3 },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  // Ends level with the chart card: the swipe hint under the chart is 8px + 16px tall.
  upcomingCol: { marginBottom: 24 },
  rowStretch: { alignItems: 'stretch' },
  wide: { flex: 2, minWidth: 0 },
  narrow: { flex: 1, minWidth: 0 },
  card: { borderRadius: Radius.lg, borderWidth: 1 },
  tile: { flex: 1, minWidth: 0, padding: 20, gap: 6 },
  tileLabel: { fontSize: FontSize.label, fontWeight: '500' },
  tileValue: { fontSize: FontSize.title + 4, fontWeight: '800', ...tabularNums },
  tileSub: { fontSize: FontSize.caption },
  budget: { padding: 20, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardTitle: { fontSize: FontSize.heading, fontWeight: '700' },
  link: { fontSize: FontSize.label, fontWeight: '700' },
  budgetRow: { gap: 6 },
  budgetTop: { flexDirection: 'row', gap: Spacing.two },
  budgetName: { flex: 1, fontSize: FontSize.label },
  budgetAmt: { fontSize: FontSize.label, fontWeight: '600', ...tabularNums },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: Radius.pill },
});
