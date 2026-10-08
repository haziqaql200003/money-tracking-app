import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetLimitModal } from '@/components/budget-limit-modal';
import { CategoryIcon } from '@/components/category-icon';
import { MonthSwitcher } from '@/components/month-switcher';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Category } from '@/constants/categories';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { budgetStatus, spentByCategory, type BudgetStatus } from '@/utils/budget';
import { formatMoney } from '@/utils/currency';
import { cycleInfo, cycleOf } from '@/utils/cycle';
import { cycleRangeLabel, monthKeyFromOffset, monthLabel, toDateKey } from '@/utils/dates';

const MASK = 'RM ••••';
const WARN_COLOR = '#D97706';
const STATUS_KEY: Record<BudgetStatus, TKey> = {
  ok: 'plan.budget.status.ok',
  warn: 'plan.budget.status.warn',
  over: 'plan.budget.status.over',
};

function Bar({ ratio, color, track, height = 8 }: { ratio: number; color: string; track: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: track }}>
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`,
        }}
      />
    </View>
  );
}

export default function BudgetsScreen() {
  const colors = useTheme();
  const { t, tp } = useT();
  const { transactions, budgetEntries, ready } = useTransactions();
  const { expenseCategories, updateCategory } = useCategories();
  const { warnPercent } = useSettings();
  const { hideAmounts } = usePrivacy();

  const [monthOffset, setMonthOffset] = useState(0);
  const [editing, setEditing] = useState<Category | null>(null);

  const currentKey = monthKeyFromOffset(0);
  const monthKey = monthKeyFromOffset(monthOffset);
  const isCurrent = monthOffset === 0;

  const earliestKey = useMemo(
    () => transactions.reduce((min, t) => (cycleOf(t.date) < min ? cycleOf(t.date) : min), currentKey),
    [transactions, currentKey],
  );
  const canPrev = monthKey > earliestKey;

  const spent = useMemo(() => spentByCategory(budgetEntries, monthKey), [budgetEntries, monthKey]);

  const budgeted = expenseCategories
    .filter((c) => c.monthlyLimit > 0)
    .map((cat) => ({ cat, spent: spent.get(cat.id) ?? 0 }))
    .sort((a, b) => b.spent / b.cat.monthlyLimit - a.spent / a.cat.monthlyLimit);
  const unbudgeted = expenseCategories.filter((c) => c.monthlyLimit <= 0);

  const totalLimit = budgeted.reduce((sum, b) => sum + b.cat.monthlyLimit, 0);
  const totalSpent = budgeted.reduce((sum, b) => sum + b.spent, 0);
  const unbudgetedSpent = unbudgeted.reduce((sum, c) => sum + (spent.get(c.id) ?? 0), 0);
  const remaining = totalLimit - totalSpent;
  const totalRatio = totalLimit > 0 ? totalSpent / totalLimit : 0;
  const totalStatus = budgetStatus(totalSpent, totalLimit, warnPercent);

  // Pacing (current month only)
  const cycle = cycleInfo(toDateKey(new Date()));
  const daysInMonth = cycle.length;
  const today = cycle.dayIndex;
  const daysLeft = cycle.daysAfterToday + 1;
  const daily = isCurrent && remaining > 0 ? remaining / daysLeft : 0;
  const projected = isCurrent && today >= 3 ? (totalSpent / today) * daysInMonth : 0;
  const projectedOver = totalLimit > 0 && projected > totalLimit && totalSpent <= totalLimit;

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const statusColor = (s: BudgetStatus) => (s === 'over' ? colors.negative : s === 'warn' ? WARN_COLOR : colors.positive);

  function suggest() {
    const past = [-1, -2, -3].map((o) => spentByCategory(budgetEntries, monthKeyFromOffset(o)));
    const suggestions = unbudgeted
      .map((cat) => {
        const months = past.map((m) => m.get(cat.id) ?? 0).filter((v) => v > 0);
        const avg = months.length > 0 ? months.reduce((s, v) => s + v, 0) / months.length : 0;
        return { cat, amount: Math.ceil(avg / 10) * 10 };
      })
      .filter((s) => s.amount > 0);

    if (suggestions.length === 0) {
      Alert.alert(t('plan.budget.notEnoughTitle'), t('plan.budget.notEnoughBody'));
      return;
    }
    Alert.alert(
      t('plan.budget.suggest'),
      t('plan.budget.suggestBody', {
        list: suggestions.map((s) => `${categoryName(s.cat)}: ${formatMoney(s.amount)}`).join('\n'),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.apply'),
          onPress: () => suggestions.forEach((s) => updateCategory(s.cat.id, { monthlyLimit: s.amount })),
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader
            title={t('plan.budget.title')}
            right={
              unbudgeted.length > 0 ? (
                <Pressable
                  onPress={suggest}
                  hitSlop={8}
                  style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('plan.budget.suggest')}
                >
                  <Ionicons name="sparkles" size={18} color={colors.accent} />
                </Pressable>
              ) : null
            }
          />
          {!(ready) ? <ScreenSkeleton variant="cards" /> : (
          <>

          {/* Month switcher */}
          <MonthSwitcher
            label={monthLabel(monthKey)}
            range={cycleRangeLabel(monthKey)}
            isCurrent={isCurrent}
            canPrev={canPrev}
            canNext={!isCurrent}
            onPrev={() => setMonthOffset(monthOffset - 1)}
            onNext={() => setMonthOffset(monthOffset + 1)}
            onReset={() => setMonthOffset(0)}
          />

          {/* Overall */}
          {budgeted.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.rowBetween}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('plan.budget.total')}
                </ThemedText>
                <View style={[styles.pill, { backgroundColor: `${statusColor(totalStatus)}26` }]}>
                  <ThemedText type="small" style={{ color: statusColor(totalStatus), fontWeight: '700' }}>
                    {t(STATUS_KEY[totalStatus])}
                  </ThemedText>
                </View>
              </View>

              <ThemedText
                style={[styles.bigAmount, remaining < 0 && { color: colors.negative }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {remaining >= 0 ? t('plan.budget.left', { amount: money(remaining) }) : t('plan.budget.over', { amount: money(-remaining) })}
              </ThemedText>

              <Bar ratio={totalRatio} color={statusColor(totalStatus)} track={colors.background} height={10} />
              <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 8 }}>
                {t('plan.budget.spentOfPct', { spent: money(totalSpent), limit: money(totalLimit), percent: Math.round(totalRatio * 100) })}
              </ThemedText>

              {isCurrent ? (
                <View style={[styles.tiles, { borderTopColor: colors.divider }]}>
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('plan.budget.safePerDay')}
                    </ThemedText>
                    <ThemedText style={styles.tileValue}>{remaining > 0 ? money(daily) : '—'}</ThemedText>
                    <ThemedText type="small" style={styles.tileHint}>
                      {tp('plan.budget.daysLeft', daysLeft)}
                    </ThemedText>
                  </View>
                  <View style={[styles.tileDivider, { backgroundColor: colors.divider }]} />
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('plan.budget.onPace')}
                    </ThemedText>
                    <ThemedText style={[styles.tileValue, projectedOver && { color: colors.negative }]}>
                      {today >= 3 ? money(projected) : '—'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.tileHint}>
                      {today < 3 ? t('plan.budget.needsData') : projectedOver ? t('plan.budget.aboveBudget') : t('plan.budget.byMonthEnd')}
                    </ThemedText>
                  </View>
                </View>
              ) : null}

              {unbudgetedSpent > 0 ? (
                <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary }]}>
                  {t('plan.budget.unbudgetedNote', { amount: money(unbudgetedSpent) })}
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <View style={[styles.card, styles.intro, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="pie-chart-outline" size={32} color={colors.textSecondary} />
              <ThemedText style={styles.introTitle}>{t('plan.budget.emptyTitle')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {t('plan.budget.emptyBody')}
              </ThemedText>
              {unbudgeted.length > 0 ? (
                <Pressable style={[styles.introButton, { backgroundColor: colors.accent }]} onPress={suggest}>
                  <ThemedText style={styles.introButtonText}>{t('plan.budget.suggest')}</ThemedText>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Budgeted categories */}
          {budgeted.length > 0 ? (
            <>
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  {t('plan.budget.categoriesCount', { count: budgeted.length })}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('plan.budget.tapToEdit')}
                </ThemedText>
              </View>
              <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                {budgeted.map(({ cat, spent: s }, i) => {
                  const st = budgetStatus(s, cat.monthlyLimit, warnPercent);
                  const color = statusColor(st);
                  const ratio = s / cat.monthlyLimit;
                  const left = cat.monthlyLimit - s;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setEditing(cat)}
                      style={({ pressed }) => [
                        styles.catRow,
                        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <CategoryIcon icon={cat.icon} color={cat.color} size={40} />
                      <View style={styles.flex}>
                        <View style={styles.rowBetween}>
                          <ThemedText numberOfLines={2} style={styles.flex}>
                            {categoryName(cat)}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: st === 'ok' ? colors.textSecondary : color, fontWeight: '700', ...tabularNums }}>
                            {Math.round(ratio * 100)}%
                          </ThemedText>
                        </View>
                        <View style={styles.barGap}>
                          <Bar ratio={ratio} color={color} track={colors.background} />
                        </View>
                        <ThemedText type="small" style={tabularNums}>
                          <ThemedText type="small" style={{ fontWeight: '700' }}>{money(s)}</ThemedText>
                          <ThemedText type="small" style={{ color: colors.textSecondary }}>{` / ${money(cat.monthlyLimit)} · `}</ThemedText>
                          <ThemedText type="small" style={{ color: st === 'ok' ? colors.textSecondary : color, fontWeight: st === 'ok' ? '500' : '600' }}>
                            {left >= 0 ? t('plan.budget.left', { amount: money(left) }) : t('plan.budget.over', { amount: money(-left) })}
                          </ThemedText>
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* No budget yet */}
          {unbudgeted.length > 0 ? (
            <>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {t('plan.budget.noBudgetYet')}
              </ThemedText>
              <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                {unbudgeted.map((cat, i) => {
                  const s = spent.get(cat.id) ?? 0;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setEditing(cat)}
                      style={({ pressed }) => [
                        styles.catRow,
                        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <CategoryIcon icon={cat.icon} color={cat.color} size={40} />
                      <View style={styles.flex}>
                        <ThemedText numberOfLines={2}>{categoryName(cat)}</ThemedText>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>
                          {s > 0 ? t('plan.budget.spent', { amount: money(s) }) : t('plan.budget.nothingSpent')}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                        {t('plan.budget.setBudget')}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('plan.budget.footnote')}
          </ThemedText>
          </>
          )}
        </ScrollView>

        <BudgetLimitModal
          category={editing}
          spent={editing ? (spent.get(editing.id) ?? 0) : 0}
          monthName={monthLabel(monthKey)}
          onClose={() => setEditing(null)}
        />
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
  iconButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  monthCenter: { alignItems: 'center' },
  monthLabel: { fontSize: FontSize.body, fontWeight: '700' },

  card: { borderRadius: Radius.lg, padding: 20, marginBottom: Spacing.three },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
  bigAmount: { fontSize: FontSize.display, lineHeight: 42, fontWeight: '700', marginTop: 4, marginBottom: Spacing.two },

  tiles: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tile: { flex: 1, alignItems: 'center' },
  tileValue: { fontSize: FontSize.body, fontWeight: '700', marginTop: 2 },
  tileHint: { fontSize: FontSize.micro, lineHeight: 14, opacity: 0.7 },
  tileDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  footnote: { fontSize: FontSize.caption, lineHeight: 16, marginTop: Spacing.three },

  intro: { alignItems: 'center', gap: Spacing.two },
  introTitle: { fontSize: FontSize.body, fontWeight: '700' },
  introButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.lg, marginTop: Spacing.two },
  introButtonText: { color: '#fff', fontWeight: '700' },

  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  barGap: { marginVertical: 6 },
});