import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BudgetLimitModal } from '@/components/budget-limit-modal';
import { CategoryIcon } from '@/components/category-icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Category } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { budgetStatus, spentByCategory, type BudgetStatus } from '@/utils/budget';
import { formatMoney } from '@/utils/currency';
import { monthKeyFromOffset, monthLabel } from '@/utils/dates';

const MASK = 'RM ••••';
const WARN_COLOR = '#D97706';
const STATUS_TEXT: Record<BudgetStatus, string> = { ok: 'On track', warn: 'Nearing limit', over: 'Over budget' };

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
  const { transactions } = useTransactions();
  const { expenseCategories, updateCategory } = useCategories();
  const { warnPercent } = useSettings();
  const { hideAmounts } = usePrivacy();

  const [monthOffset, setMonthOffset] = useState(0);
  const [editing, setEditing] = useState<Category | null>(null);

  const currentKey = monthKeyFromOffset(0);
  const monthKey = monthKeyFromOffset(monthOffset);
  const isCurrent = monthOffset === 0;

  const earliestKey = useMemo(
    () => transactions.reduce((min, t) => (t.date.slice(0, 7) < min ? t.date.slice(0, 7) : min), currentKey),
    [transactions, currentKey],
  );
  const canPrev = monthKey > earliestKey;

  const spent = useMemo(() => spentByCategory(transactions, monthKey), [transactions, monthKey]);

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
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const daysLeft = daysInMonth - today + 1;
  const daily = isCurrent && remaining > 0 ? remaining / daysLeft : 0;
  const projected = isCurrent && today >= 3 ? (totalSpent / today) * daysInMonth : 0;
  const projectedOver = totalLimit > 0 && projected > totalLimit && totalSpent <= totalLimit;

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const statusColor = (s: BudgetStatus) => (s === 'over' ? colors.negative : s === 'warn' ? WARN_COLOR : colors.positive);

  function suggest() {
    const past = [-1, -2, -3].map((o) => spentByCategory(transactions, monthKeyFromOffset(o)));
    const suggestions = unbudgeted
      .map((cat) => {
        const months = past.map((m) => m.get(cat.id) ?? 0).filter((v) => v > 0);
        const avg = months.length > 0 ? months.reduce((s, v) => s + v, 0) / months.length : 0;
        return { cat, amount: Math.ceil(avg / 10) * 10 };
      })
      .filter((s) => s.amount > 0);

    if (suggestions.length === 0) {
      Alert.alert('Not enough history', 'Suggestions need spending from the previous 3 months in categories without a budget.');
      return;
    }
    Alert.alert(
      'Suggest budgets',
      `Set budgets from your average monthly spending (last 3 months)?\n\n${suggestions
        .map((s) => `${s.cat.name}: ${formatMoney(s.amount)}`)
        .join('\n')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
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
            title="Budgets"
            right={
              unbudgeted.length > 0 ? (
                <Pressable
                  onPress={suggest}
                  hitSlop={8}
                  style={[styles.iconButton, { backgroundColor: colors.backgroundElement }]}
                  accessibilityRole="button"
                  accessibilityLabel="Suggest budgets"
                >
                  <Ionicons name="sparkles" size={18} color={colors.accent} />
                </Pressable>
              ) : null
            }
          />

          {/* Month switcher */}
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => setMonthOffset(monthOffset - 1)}
              disabled={!canPrev}
              hitSlop={8}
              style={[styles.iconButton, { backgroundColor: colors.backgroundElement, opacity: canPrev ? 1 : 0.35 }]}
              accessibilityLabel="Previous month"
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Pressable style={styles.monthCenter} onPress={() => setMonthOffset(0)} disabled={isCurrent}>
              <ThemedText style={styles.monthLabel}>{monthLabel(monthKey)}</ThemedText>
              {!isCurrent ? (
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  Back to this month
                </ThemedText>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => setMonthOffset(monthOffset + 1)}
              disabled={isCurrent}
              hitSlop={8}
              style={[styles.iconButton, { backgroundColor: colors.backgroundElement, opacity: isCurrent ? 0.35 : 1 }]}
              accessibilityLabel="Next month"
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Overall */}
          {budgeted.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.rowBetween}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Total budget
                </ThemedText>
                <View style={[styles.pill, { backgroundColor: `${statusColor(totalStatus)}26` }]}>
                  <ThemedText type="small" style={{ color: statusColor(totalStatus), fontWeight: '700' }}>
                    {STATUS_TEXT[totalStatus]}
                  </ThemedText>
                </View>
              </View>

              <ThemedText
                style={[styles.bigAmount, remaining < 0 && { color: colors.negative }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {remaining >= 0 ? `${money(remaining)} left` : `${money(-remaining)} over`}
              </ThemedText>

              <Bar ratio={totalRatio} color={statusColor(totalStatus)} track={colors.background} height={10} />
              <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 8 }}>
                {money(totalSpent)} of {money(totalLimit)} spent · {Math.round(totalRatio * 100)}%
              </ThemedText>

              {isCurrent ? (
                <View style={[styles.tiles, { borderTopColor: colors.divider }]}>
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Safe to spend / day
                    </ThemedText>
                    <ThemedText style={styles.tileValue}>{remaining > 0 ? money(daily) : '—'}</ThemedText>
                    <ThemedText type="small" style={styles.tileHint}>
                      {daysLeft} day{daysLeft === 1 ? '' : 's'} left
                    </ThemedText>
                  </View>
                  <View style={[styles.tileDivider, { backgroundColor: colors.divider }]} />
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      On pace for
                    </ThemedText>
                    <ThemedText style={[styles.tileValue, projectedOver && { color: colors.negative }]}>
                      {today >= 3 ? money(projected) : '—'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.tileHint}>
                      {today < 3 ? 'Needs a few days of data' : projectedOver ? 'Above your budget' : 'by month end'}
                    </ThemedText>
                  </View>
                </View>
              ) : null}

              {unbudgetedSpent > 0 ? (
                <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary }]}>
                  + {money(unbudgetedSpent)} spent in categories without a budget (not counted above)
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <View style={[styles.card, styles.intro, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="pie-chart-outline" size={32} color={colors.textSecondary} />
              <ThemedText style={styles.introTitle}>No budgets yet</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                Tap a category below to give it a monthly limit. Or let the app suggest limits from your past spending.
              </ThemedText>
              {unbudgeted.length > 0 ? (
                <Pressable style={[styles.introButton, { backgroundColor: colors.accent }]} onPress={suggest}>
                  <ThemedText style={styles.introButtonText}>Suggest budgets</ThemedText>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Budgeted categories */}
          {budgeted.length > 0 ? (
            <>
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  Categories · {budgeted.length}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Tap to edit
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
                          <ThemedText numberOfLines={1} style={styles.flex}>
                            {cat.name}
                          </ThemedText>
                          <ThemedText type="small" style={{ fontWeight: '700' }}>
                            {money(s)}
                            <ThemedText type="small" style={{ color: colors.textSecondary }}>
                              {` / ${money(cat.monthlyLimit)}`}
                            </ThemedText>
                          </ThemedText>
                        </View>
                        <View style={styles.barGap}>
                          <Bar ratio={ratio} color={color} track={colors.background} />
                        </View>
                        <ThemedText
                          type="small"
                          style={{ color: st === 'ok' ? colors.textSecondary : color, fontWeight: st === 'ok' ? '500' : '600' }}
                        >
                          {left >= 0 ? `${money(left)} left` : `${money(-left)} over`} · {Math.round(ratio * 100)}%
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
                No budget yet
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
                        <ThemedText numberOfLines={1}>{cat.name}</ThemedText>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>
                          {s > 0 ? `${money(s)} spent` : 'Nothing spent'}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                        Set budget
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary, textAlign: 'center' }]}>
            Budgets repeat every month. You can add or rename categories under More → Categories.
          </ThemedText>
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
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  monthCenter: { alignItems: 'center' },
  monthLabel: { fontSize: 17, fontWeight: '700' },

  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bigAmount: { fontSize: 34, lineHeight: 42, fontWeight: '700', marginTop: 4, marginBottom: Spacing.two },

  tiles: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tile: { flex: 1, alignItems: 'center' },
  tileValue: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  tileHint: { fontSize: 11, lineHeight: 14, opacity: 0.7 },
  tileDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  footnote: { fontSize: 12, lineHeight: 16, marginTop: Spacing.three },

  intro: { alignItems: 'center', gap: Spacing.two },
  introTitle: { fontSize: 17, fontWeight: '700' },
  introButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: Spacing.two },
  introButtonText: { color: '#fff', fontWeight: '700' },

  sectionTitle: { fontSize: 16, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: 20, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  barGap: { marginVertical: 6 },
});