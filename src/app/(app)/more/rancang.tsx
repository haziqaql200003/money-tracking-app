import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/category-icon';
import { GoalDetailModal, STATUS_KEY } from '@/components/goal-detail-modal';
import { GoalFormModal } from '@/components/goal-form-modal';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { IconName } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { billsTotal, dueText, upcomingBills } from '@/utils/bills';
import { budgetStatus, spentByCategory } from '@/utils/budget';
import { formatMoney } from '@/utils/currency';
import { dayLabel, monthKeyFromOffset, toDateKey } from '@/utils/dates';
import { goalProgress } from '@/utils/goals';
import { DAYS_BEFORE_OPTIONS } from '@/utils/reminders';

const MASK = 'RM ••••';
const WARN_COLOR = '#D97706';
const BILLS_HORIZON_DAYS = 30;
const BILLS_SHOWN = 6;

export default function RancangScreen() {
  const colors = useTheme();
  const { t, tp } = useT();
  const router = useRouter();
  const { transactions, recurringRules, pendingEntries } = useTransactions();
  const { expenseCategories, getCategory } = useCategories();
  const { warnPercent } = useSettings();
  const { hideAmounts } = usePrivacy();
  const {
    goals,
    goalEntries,
    reminderPrefs,
    permission,
    enableReminders,
    disableReminders,
    setDaysBefore,
    setBudgetAlerts,
  } = usePlan();

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const today = toDateKey(new Date());
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  // Budgets
  const spent = spentByCategory(transactions, monthKeyFromOffset(0));
  const budgeted = expenseCategories.filter((c) => c.monthlyLimit > 0);
  const totalLimit = budgeted.reduce((sum, c) => sum + c.monthlyLimit, 0);
  const totalSpent = budgeted.reduce((sum, c) => sum + (spent.get(c.id) ?? 0), 0);
  const status = budgetStatus(totalSpent, totalLimit, warnPercent);
  const statusColor = status === 'over' ? colors.negative : status === 'warn' ? WARN_COLOR : colors.positive;
  const budgetPercent = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;

  // Goals
  const goalRows = goals.map((g) => ({ goal: g, progress: goalProgress(g, goalEntries, today) }));
  const totalSaved = goalRows.reduce((sum, r) => sum + r.progress.saved, 0);

  // Bills
  const bills = upcomingBills(recurringRules, today, BILLS_HORIZON_DAYS);
  const billsSum = billsTotal(bills);
  const hasUnknownBill = bills.some((b) => b.varies && b.amount === 0);

  const remindersOn = reminderPrefs.enabled && permission === 'granted';
  const blocked = reminderPrefs.enabled && permission === 'denied';

  function openAdd() {
    setEditingId(null);
    setFormVisible(true);
  }

  function openEdit(id: string) {
    setViewingId(null);
    setEditingId(id);
    setFormVisible(true);
  }

  function askOpenSettings() {
    Alert.alert(t('plan.rancang.notifOffTitle'), t('plan.rancang.notifOffBody'), [
      { text: t('plan.rancang.notNow'), style: 'cancel' },
      { text: t('plan.rancang.openSettings'), onPress: () => void Linking.openSettings() },
    ]);
  }

  async function toggleReminders(on: boolean) {
    if (!on) {
      disableReminders();
      return;
    }
    const ok = await enableReminders();
    if (!ok) {
      if (permission === 'unsupported') {
        Alert.alert(t('plan.rancang.unavailableTitle'), t('plan.rancang.unavailableBody'));
      } else {
        askOpenSettings();
      }
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* i18n-ignore: pillar name, same in both languages */}
          <ScreenHeader title="Rancang" />
          <ThemedText type="small" style={[styles.tagline, { color: colors.textSecondary }]}>
            {t('plan.rancang.tagline')}
          </ThemedText>

          {/* Overview */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('plan.rancang.billsIn', { days: BILLS_HORIZON_DAYS })}
                </ThemedText>
                <ThemedText style={[styles.tileValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit>
                  {money(billsSum)}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {tp('plan.rancang.billCount', bills.length)}
                  {hasUnknownBill ? ` · ${t('plan.rancang.someVary')}` : ''}
                </ThemedText>
              </View>
              <View style={[styles.tileDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.tile}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('plan.rancang.savedForGoals')}
                </ThemedText>
                <ThemedText style={[styles.tileValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit>
                  {money(totalSaved)}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {tp('plan.rancang.goalCount', goals.length)}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Budgets */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {t('plan.rancang.budgets')}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/more/budgets')}
            style={({ pressed }) => [styles.card, { backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={t('plan.rancang.openBudgets')}
          >
            {totalLimit > 0 ? (
              <>
                <View style={styles.rowBetween}>
                  <ThemedText style={{ fontWeight: '700' }}>{t('plan.rancang.thisMonth')}</ThemedText>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </View>
                <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.fill, { width: `${Math.max(budgetPercent, totalSpent > 0 ? 2 : 0)}%`, backgroundColor: statusColor }]} />
                </View>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('plan.rancang.spentOf', { spent: money(totalSpent), limit: money(totalLimit) })} ·{' '}
                  <ThemedText type="small" style={{ color: statusColor, fontWeight: '700' }}>
                    {t(`plan.rancang.status.${status}`)}
                  </ThemedText>
                </ThemedText>
              </>
            ) : (
              <View style={styles.rowBetween}>
                <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]}>
                  {t('plan.rancang.noBudgets')}
                </ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            )}
          </Pressable>

          {/* Goals */}
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {t('plan.rancang.goals')}
            </ThemedText>
            <Pressable
              onPress={openAdd}
              hitSlop={8}
              style={[styles.addButton, { backgroundColor: colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel={t('plan.rancang.addGoal')}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
          {goalRows.length === 0 ? (
            <View style={[styles.card, styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="flag-outline" size={30} color={colors.textSecondary} />
              <ThemedText style={styles.emptyTitle}>{t('plan.rancang.goalsEmptyTitle')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {t('plan.rancang.goalsEmptyBody')}
              </ThemedText>
              <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={openAdd}>
                <ThemedText style={styles.emptyButtonText}>{t('plan.rancang.createGoal')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
              {goalRows.map(({ goal, progress }, i) => {
                const tone =
                  progress.status === 'done' || progress.status === 'on_track'
                    ? colors.positive
                    : progress.status === 'open'
                      ? colors.textSecondary
                      : colors.negative;
                return (
                  <Pressable
                    key={goal.id}
                    onPress={() => setViewingId(goal.id)}
                    style={({ pressed }) => [
                      styles.goalRow,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <CategoryIcon icon={goal.icon as IconName} color={goal.color} size={42} />
                    <View style={styles.flex}>
                      <View style={styles.rowBetween}>
                        <ThemedText numberOfLines={1} style={styles.flex}>
                          {goal.name}
                        </ThemedText>
                        <ThemedText type="small" style={{ fontWeight: '700' }}>
                          {progress.percent}%
                        </ThemedText>
                      </View>
                      <View style={[styles.track, styles.trackThin, { backgroundColor: colors.backgroundSelected }]}>
                        <View style={[styles.fill, styles.fillThin, { width: `${Math.max(progress.percent, progress.saved > 0 ? 2 : 0)}%`, backgroundColor: goal.color }]} />
                      </View>
                      <View style={styles.rowBetween}>
                        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                          {t('plan.rancang.spentOf', { spent: money(progress.saved), limit: money(goal.target) })}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: tone, fontWeight: '700' }}>
                          {t(STATUS_KEY[progress.status])}
                        </ThemedText>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Upcoming bills */}
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {t('plan.rancang.upcomingBills')}
            </ThemedText>
            <Pressable onPress={() => router.push('/more/recurring')} hitSlop={8}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                {t('plan.rancang.manage')}
              </ThemedText>
            </Pressable>
          </View>
          {pendingEntries.length > 0 ? (
            <Pressable
              onPress={() => router.push('/more/recurring')}
              style={[styles.notice, { backgroundColor: colors.backgroundElement, borderColor: colors.accent }]}
            >
              <Ionicons name="time-outline" size={18} color={colors.accent} />
              <ThemedText type="small" style={styles.flex}>
                {tp('plan.rancang.pending', pendingEntries.length)}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}
          {bills.length === 0 ? (
            <View style={[styles.listCard, styles.emptyList, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {recurringRules.length === 0
                  ? t('plan.rancang.noRules')
                  : t('plan.rancang.noBillsDue', { days: BILLS_HORIZON_DAYS })}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
              {bills.slice(0, BILLS_SHOWN).map((b, i) => {
                const category = getCategory(b.categoryId);
                return (
                  <View
                    key={b.id}
                    style={[styles.billRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
                  >
                    <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? '#8E8E93'} size={42} />
                    <View style={styles.flex}>
                      <ThemedText numberOfLines={1}>{b.title}</ThemedText>
                      <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                        {dueText(b.daysUntil)} · {dayLabel(b.date)}
                      </ThemedText>
                    </View>
                    <ThemedText style={{ fontWeight: '700', color: colors.negative }}>
                      {hideAmounts ? MASK : b.varies ? (b.amount > 0 ? `~${formatMoney(b.amount)}` : t('plan.rancang.varies')) : formatMoney(b.amount)}
                    </ThemedText>
                  </View>
                );
              })}
              {bills.length > BILLS_SHOWN ? (
                <ThemedText type="small" style={[styles.more, { color: colors.textSecondary }]}>
                  {t('plan.rancang.moreBills', { count: bills.length - BILLS_SHOWN, days: BILLS_HORIZON_DAYS })}
                </ThemedText>
              ) : null}
            </View>
          )}

          {/* Reminders */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {t('plan.rancang.reminders')}
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <ThemedText style={{ fontWeight: '600' }}>{t('plan.rancang.notifications')}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('plan.rancang.notificationsSub')}
                </ThemedText>
              </View>
              <Switch
                value={remindersOn}
                onValueChange={(v) => void toggleReminders(v)}
                trackColor={{ true: colors.accent }}
                disabled={permission === 'unsupported'}
              />
            </View>

            {blocked ? (
              <Pressable onPress={askOpenSettings} style={styles.blocked}>
                <Ionicons name="warning-outline" size={16} color={WARN_COLOR} />
                <ThemedText type="small" style={[styles.flex, { color: WARN_COLOR }]}>
                  {t('plan.rancang.blocked')}
                </ThemedText>
              </Pressable>
            ) : null}

            {remindersOn ? (
              <>
                <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
                  {t('plan.rancang.remindMe')}
                </ThemedText>
                <View style={[styles.segment, { backgroundColor: colors.backgroundSelected }]}>
                  {DAYS_BEFORE_OPTIONS.map((o) => {
                    const active = o.value === reminderPrefs.daysBefore;
                    return (
                      <Pressable
                        key={o.value}
                        onPress={() => setDaysBefore(o.value)}
                        style={[styles.segmentItem, active && { backgroundColor: colors.accent }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <ThemedText type="small" style={{ fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
                          {t(o.labelKey)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[styles.switchRow, { marginTop: Spacing.three }]}>
                  <View style={styles.flex}>
                    <ThemedText style={{ fontWeight: '600' }}>{t('plan.rancang.budgetAlerts')}</ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('plan.rancang.budgetAlertsSub', { percent: warnPercent })}
                    </ThemedText>
                  </View>
                  <Switch value={reminderPrefs.budgetAlerts} onValueChange={setBudgetAlerts} trackColor={{ true: colors.accent }} />
                </View>
                <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary }]}>
                  {t('plan.rancang.footnote')}
                </ThemedText>
              </>
            ) : null}
          </View>
        </ScrollView>

        <GoalDetailModal goalId={viewingId} onClose={() => setViewingId(null)} onEdit={openEdit} />
        <GoalFormModal
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          editing={editingId ? (goals.find((g) => g.id === editingId) ?? null) : null}
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
  tagline: { marginTop: -Spacing.two, marginBottom: Spacing.three },

  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three },
  tiles: { flexDirection: 'row' },
  tile: { flex: 1, alignItems: 'center', gap: 2 },
  tileValue: { fontSize: 20, fontWeight: '700' },
  tileDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },

  sectionTitle: { fontSize: 16, marginBottom: Spacing.two, marginTop: Spacing.two },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: Spacing.two },
  trackThin: { height: 6, borderRadius: 3, marginVertical: 6 },
  fill: { height: 8, borderRadius: 4 },
  fillThin: { height: 6, borderRadius: 3 },

  addButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  listCard: { borderRadius: 20, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  emptyList: { padding: 20 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  more: { textAlign: 'center', paddingBottom: 12 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.three, borderRadius: 16, borderWidth: 1.5, marginBottom: Spacing.two },

  empty: { alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: Spacing.two },
  emptyButtonText: { color: '#fff', fontWeight: '700' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  blocked: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.three },
  label: { marginTop: Spacing.three, marginBottom: Spacing.one },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  footnote: { fontSize: 12, lineHeight: 16, marginTop: Spacing.three },
});
