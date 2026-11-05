import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalDetailModal, STATUS_KEY } from '@/components/goals/goal-detail-modal';
import { GoalFormModal } from '@/components/goals/goal-form-modal';
import { TabungAllocation } from '@/components/goals/tabung-allocation';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { SwipeRow } from '@/components/ui/swipe-row';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import type { IconName } from '@/constants/categories';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { Alert } from '@/services/dialog';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { goalProgress, type GoalStatus } from '@/utils/goals';

const MASK = 'RM ••••'; // i18n-ignore
const WARN = '#D97706';

/** Savings goals on their own page: what is saved in total, what to put aside this month, and each goal as a card. */
export default function GoalsScreen() {
  const colors = useTheme();
  const { t, tp } = useT();
  const { hideAmounts } = usePrivacy();
  const { goals, goalEntries, deleteGoal, ready } = usePlan();
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const today = toDateKey(new Date());
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const rows = goals.map((g) => ({ goal: g, progress: goalProgress(g, goalEntries, today) }));
  const active = rows.filter((r) => r.progress.status !== 'done');
  const done = rows.filter((r) => r.progress.status === 'done');
  const totalSaved = rows.reduce((s, r) => s + r.progress.saved, 0);
  const totalTarget = rows.reduce((s, r) => s + r.goal.target, 0);
  // This month's share: the monthly plan when one was set, otherwise what the deadline needs.
  const needThisMonth = active
    .filter((r) => !r.goal.paused)
    .reduce((s, r) => s + ((r.goal.monthly ?? 0) > 0 ? (r.goal.monthly as number) : (r.progress.perMonth ?? 0)), 0);

  const statusColor = (st: GoalStatus) =>
    st === 'done' || st === 'on_track' ? colors.positive : st === 'behind' ? WARN : st === 'overdue' ? colors.negative : colors.textSecondary;
  const dateLabel = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };

  function openAdd() {
    setEditingId(null);
    setFormVisible(true);
  }
  function openEdit(id: string) {
    setViewingId(null);
    setEditingId(id);
    setFormVisible(true);
  }
  function confirmDelete(id: string, name: string) {
    Alert.alert(t('plan.goalForm.deleteTitle'), t('plan.goalForm.deleteBody', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  }

  const card = ({ goal, progress }: (typeof rows)[number]) => {
    const st = progress.status;
    const color = statusColor(st);
    const perMonth = (goal.monthly ?? 0) > 0 ? goal.monthly : progress.perMonth;
    return (
      <SwipeRow
        key={goal.id}
        background={colors.background}
        rightActions={[
          { key: 'edit', label: t('common.edit'), icon: 'create-outline', color: colors.accent, onPress: () => openEdit(goal.id) },
          { key: 'delete', label: t('common.delete'), icon: 'trash-outline', color: colors.negative, onPress: () => confirmDelete(goal.id, goal.name) },
        ]}
        onFullSwipe={() => confirmDelete(goal.id, goal.name)}
      >
        <Pressable
          onPress={() => setViewingId(goal.id)}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.backgroundElement }, (pressed || goal.paused) && { opacity: 0.65 }]}
          accessibilityRole="button"
        >
          <View style={styles.row}>
            <CategoryIcon icon={goal.icon as IconName} color={goal.color} size={46} />
            <View style={styles.flex}>
              <ThemedText style={styles.name} numberOfLines={2}>{goal.name}</ThemedText>
              <View style={styles.metaRow}>
                <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                  {goal.deadline ? t('plan.goals.by', { date: dateLabel(goal.deadline) }) : t('plan.goals.noDeadline')}
                </ThemedText>
                <View style={[styles.pill, { backgroundColor: `${color}1F` }]}>
                  <ThemedText type="small" style={{ color, fontWeight: '800' }} numberOfLines={1}>
                    {goal.paused ? t('plan.goalDetail.pauseBadge') : t(STATUS_KEY[st])}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
          <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
            <View style={[styles.fill, { width: `${Math.max(progress.percent, progress.saved > 0 ? 2 : 0)}%`, backgroundColor: goal.color }]} />
          </View>
          <View style={styles.footRow}>
            <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }, tabularNums]}>
              {t('plan.goals.savedOf', { saved: money(progress.saved), target: money(goal.target) })}
            </ThemedText>
            {perMonth && st !== 'done' ? (
              <ThemedText type="smallBold" style={tabularNums}>{t('plan.goals.perMonth', { amount: money(perMonth) })}</ThemedText>
            ) : null}
          </View>
        </Pressable>
      </SwipeRow>
    );
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader
            title={t('plan.goals.title')}
            right={
              <Pressable onPress={openAdd} hitSlop={8} style={[styles.add, { backgroundColor: colors.accent }]} accessibilityRole="button" accessibilityLabel={t('plan.rancang.addGoal')}>
                <Ionicons name="add" size={22} color={colors.onAccent} />
              </Pressable>
            }
          />
          {!ready ? (
            <ScreenSkeleton variant="cards" />
          ) : (
            <>
              <View style={[styles.hero, { backgroundColor: colors.accent }]}>
                <ThemedText type="small" style={styles.heroDim}>{t('plan.rancang.savedForGoals')}</ThemedText>
                <ThemedText style={styles.heroBig} numberOfLines={1}>{money(totalSaved)}</ThemedText>
                <View style={styles.row}>
                  <ThemedText type="small" style={[styles.flex, styles.heroDim]}>
                    {totalTarget > 0 ? t('plan.goals.ofTotal', { amount: money(totalTarget) }) : ''}
                  </ThemedText>
                  <ThemedText type="small" style={styles.heroDim}>{tp('plan.rancang.goalCount', goals.length)}</ThemedText>
                </View>
                {needThisMonth > 0 ? (
                  <View style={styles.heroNote}>
                    <ThemedText type="small" style={styles.heroText}>
                      {t('plan.goals.thisMonth', { amount: money(needThisMonth) })}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {rows.length === 0 ? (
                <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
                  <Ionicons name="flag-outline" size={32} color={colors.textSecondary} />
                  <ThemedText style={styles.emptyTitle}>{t('plan.rancang.goalsEmptyTitle')}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('plan.rancang.goalsEmptyBody')}</ThemedText>
                  <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={openAdd}>
                    <ThemedText style={{ color: colors.onAccent, fontWeight: '700' }}>{t('plan.rancang.createGoal')}</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  {active.length > 0 ? (
                    <>
                      <ThemedText type="small" style={[styles.sec, { color: colors.textSecondary }]}>{t('plan.goals.secActive', { count: active.length })}</ThemedText>
                      <View style={styles.list}>{active.map(card)}</View>
                    </>
                  ) : null}
                  {done.length > 0 ? (
                    <>
                      <ThemedText type="small" style={[styles.sec, { color: colors.textSecondary }]}>{t('plan.goals.secDone', { count: done.length })}</ThemedText>
                      <View style={styles.list}>{done.map(card)}</View>
                    </>
                  ) : null}
                  <Pressable onPress={openAdd} style={[styles.addRow, { borderColor: colors.divider }]} accessibilityRole="button">
                    <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                    <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('plan.rancang.addGoal')}</ThemedText>
                  </Pressable>
                  <View style={styles.tabung}>
                    <TabungAllocation />
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
        <GoalDetailModal goalId={viewingId} onClose={() => setViewingId(null)} onEdit={openEdit} />
        <GoalFormModal visible={formVisible} onClose={() => setFormVisible(false)} editing={editingId ? (goals.find((g) => g.id === editingId) ?? null) : null} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: 130 },
  add: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hero: { borderRadius: Radius.xl, padding: Spacing.three + 4, gap: 4 },
  heroText: { color: '#FFFFFF' },
  heroDim: { color: 'rgba(255,255,255,0.78)' },
  heroBig: { color: '#FFFFFF', fontSize: FontSize.display, lineHeight: 42, fontWeight: '800' },
  heroNote: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, marginTop: Spacing.two },
  sec: { fontWeight: '700', letterSpacing: 0.8, marginTop: Spacing.four, marginBottom: Spacing.two },
  list: { gap: Spacing.two },
  card: { borderRadius: Radius.xl, padding: Spacing.three, gap: 12 },
  name: { fontSize: FontSize.body, fontWeight: '800' },
  pill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3, flexShrink: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  footRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  track: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 10, borderRadius: Radius.pill },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1.5, borderStyle: 'dashed', marginTop: Spacing.three },
  tabung: { marginTop: Spacing.three },
  empty: { borderRadius: Radius.lg, padding: Spacing.four, alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '700' },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.pill, marginTop: Spacing.two },
});
