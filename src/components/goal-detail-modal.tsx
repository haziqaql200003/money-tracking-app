import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/category-icon';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { IconName } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { formatMoney } from '@/utils/currency';
import { dayLabel, toDateKey } from '@/utils/dates';
import { useTransactions } from '@/context/TransactionsContext';
import { monthShort } from '@/i18n/format';
import { depositCalendar, goalMonthSaved, goalOutlook, goalProgress, goalProjection, milestoneState, MILESTONES, type DepositState, type GoalStatus } from '@/utils/goals';
import { cycleOf } from '@/utils/cycle';

const MASK = 'RM ••••';
const HISTORY_LIMIT = 8;

export const STATUS_KEY: Record<GoalStatus, TKey> = {
  done: 'plan.goal.status.done',
  overdue: 'plan.goal.status.overdue',
  behind: 'plan.goal.status.behind',
  on_track: 'plan.goal.status.on_track',
  open: 'plan.goal.status.open',
};

type Props = {
  /** The goal being viewed. null = closed. */
  goalId: string | null;
  onClose: () => void;
  onEdit: (goalId: string) => void;
};

export function GoalDetailModal({ goalId, onClose, onEdit }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!goalId} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <ThemedView
          style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title={t('plan.goalDetail.title')}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.close')}
                </ThemedText>
              </Pressable>
            }
            right={
              goalId ? (
                <Pressable onPress={() => onEdit(goalId)} hitSlop={12}>
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                    {t('common.edit')}
                  </ThemedText>
                </Pressable>
              ) : undefined
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {goalId ? <Detail key={goalId} goalId={goalId} onEdit={onEdit} /> : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Detail({ goalId, onEdit }: { goalId: string; onEdit: (goalId: string) => void }) {
  const colors = useTheme();
  const { t, tp } = useT();
  const { goals, goalEntries, addGoalEntry, deleteGoalEntry, updateGoal, moveGoal } = usePlan();
  const { hideAmounts } = usePrivacy();
  const { recurringRules } = useTransactions();
  const [amount, setAmount] = useState('');

  const goal = goals.find((g) => g.id === goalId);
  if (!goal) {
    return (
      <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.four }}>
        {t('plan.goalDetail.missing')}
      </ThemedText>
    );
  }

  const today = toDateKey(new Date());
  const p = goalProgress(goal, goalEntries, today);
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const parsed = parseFloat(amount.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const history = goalEntries
    .filter((e) => e.goalId === goal.id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
  const monthSaved = goalMonthSaved(goalEntries, goal.id, cycleOf(today));
  const monthlyPlan = goal.monthly && goal.monthly > 0 ? goal.monthly : 0;
  const monthPercent = monthlyPlan > 0 ? Math.min(100, Math.round((monthSaved / monthlyPlan) * 100)) : 0;
  const ms = milestoneState(p.percent);
  const proj = goalProjection(goal, goalEntries, today);
  const index = goals.findIndex((g) => g.id === goal.id);
  const outlook = goalOutlook(goal, p.status, proj);
  const outlookColor = outlook === 'on' || outlook === 'done' ? colors.positive : outlook === 'late' ? colors.warning : colors.negative;
  const cal = depositCalendar(goal, goalEntries, today, Number(today.slice(0, 4)));
  const rule = goal.recurringId ? recurringRules.find((r) => r.id === goal.recurringId) : undefined;
  const autoActive = !!rule && rule.active;
  const suggested = goal.monthly && goal.monthly > 0 ? goal.monthly : (p.perMonth ?? 0);
  const stateColor: Record<DepositState, string> = {
    deposited: colors.positive,
    missed: colors.negative,
    current: colors.warning,
    upcoming: colors.divider,
    before: colors.divider,
  };
  const statusColor = p.status === 'done' || p.status === 'on_track' ? colors.positive : p.status === 'open' ? colors.textSecondary : colors.negative;

  function submit(sign: 1 | -1) {
    if (!valid) return;
    if (sign === -1 && parsed > p.saved) {
      Alert.alert(t('plan.goalDetail.tooMuchTitle'), t('plan.goalDetail.tooMuchBody', { amount: money(p.saved) }));
      return;
    }
    addGoalEntry(goal!.id, sign * parsed, today);
    setAmount('');
  }

  function removeEntry(id: string) {
    if (id.startsWith('tr:') || id.startsWith('st:') || id.startsWith('bal:')) {
      Alert.alert(t('plan.goalDetail.fromTransferTitle'), t('plan.goalDetail.fromTransferBody'));
      return;
    }
    Alert.alert(t('plan.goalDetail.removeTitle'), t('plan.goalDetail.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.remove'), style: 'destructive', onPress: () => deleteGoalEntry(id) },
    ]);
  }

  return (
    <View>
      <View style={styles.summary}>
        <CategoryIcon icon={goal.icon as IconName} color={goal.color} size={56} />
        <ThemedText style={styles.title}>{goal.name}</ThemedText>
        <ThemedText type="small" style={{ color: statusColor, fontWeight: '700' }}>
          {t(STATUS_KEY[p.status])}
        </ThemedText>
      </View>

      {outlook !== 'none' && outlook !== 'done' ? (
        <View style={[styles.card, styles.gap, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('plan.goalDetail.outlook.label')}</ThemedText>
          <ThemedText style={{ fontSize: 22, fontWeight: '700', color: outlookColor }}>{t(`plan.goalDetail.outlook.${outlook}` as TKey)}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t(`plan.goalDetail.outlook.${outlook}Body` as TKey)}</ThemedText>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.rowBetween}>
          <ThemedText style={styles.saved}>{money(p.saved)}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('plan.goalDetail.ofTarget', { amount: money(goal.target) })}
          </ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
          <View style={[styles.fill, { width: `${Math.max(p.percent, p.saved > 0 ? 2 : 0)}%`, backgroundColor: goal.color }]} />
        </View>
        <View style={styles.rowBetween}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('plan.goalDetail.percentSaved', { percent: p.percent })}
          </ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {p.status === 'done' ? t('plan.goalDetail.allDone') : t('plan.goalDetail.toGo', { amount: money(p.remaining) })}
          </ThemedText>
        </View>
        {goal.deadline ? (
          <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
            {t('plan.goalDetail.deadline', { date: dayLabel(goal.deadline) })}
            {p.daysLeft !== null && p.daysLeft >= 0 ? ` · ${tp('plan.goalDetail.daysLeft', p.daysLeft)}` : ''}
            {p.perMonth !== null ? ` · ${t('plan.goalDetail.perMonth', { amount: money(p.perMonth) })}` : ''}
          </ThemedText>
        ) : null}
      </View>

      {goal.paused ? (
        <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
          {t('plan.goalDetail.pausedNote')}
        </ThemedText>
      ) : null}
      {goal.note ? (
        <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
          {goal.note}
        </ThemedText>
      ) : null}

      {monthlyPlan > 0 && !goal.paused ? (
        <View style={[styles.card, styles.gap, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">{t('plan.goalDetail.thisMonth')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.goalDetail.monthOf', { saved: money(monthSaved), plan: money(monthlyPlan) })}
            </ThemedText>
          </View>
          <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
            <View style={[styles.fill, { width: `${monthPercent}%`, backgroundColor: monthSaved >= monthlyPlan ? colors.positive : goal.color }]} />
          </View>
          <ThemedText type="small" style={{ color: monthSaved >= monthlyPlan ? colors.positive : colors.textSecondary }}>
            {monthSaved >= monthlyPlan ? t('plan.goalDetail.monthDone') : t('plan.goalDetail.monthLeft', { amount: money(monthlyPlan - monthSaved) })}
          </ThemedText>
          {goal.recurringId ? (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.goalDetail.autoOn', { amount: money(monthlyPlan) })}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.card, styles.gap, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.rowBetween}>
          <ThemedText type="smallBold">{t('plan.goalDetail.milestones')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {ms.next ? t('plan.goalDetail.nextMilestone', { percent: ms.next }) : t('plan.goalDetail.allMilestones')}
          </ThemedText>
        </View>
        <View style={styles.milestones}>
          {MILESTONES.map((m) => {
            const hit = p.percent >= m;
            return (
              <View key={m} style={[styles.milestone, { backgroundColor: hit ? goal.color : colors.backgroundSelected }]}>
                <ThemedText type="small" style={{ color: hit ? '#fff' : colors.textSecondary, fontWeight: '700' }}>
                  {m}%
                </ThemedText>
              </View>
            );
          })}
        </View>
        {p.status !== 'done' ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {proj.finishDate
              ? t('plan.goalDetail.projection', { perMonth: money(proj.perMonth), date: dayLabel(proj.finishDate) })
              : t('plan.goalDetail.projectionNone')}
            {proj.daysVsDeadline !== null
              ? ` · ${proj.daysVsDeadline > 0 ? tp('plan.goalDetail.lateBy', proj.daysVsDeadline) : tp('plan.goalDetail.earlyBy', -proj.daysVsDeadline)}`
              : ''}
          </ThemedText>
        ) : null}
      </View>

      <View style={[styles.card, styles.gap, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.rowBetween}>
          <ThemedText type="smallBold">{t('plan.goalDetail.depositsTitle')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{today.slice(0, 4)}</ThemedText>
        </View>
        <View style={styles.calGrid}>
          {cal.map((c, i) => (
            <View key={i} style={styles.calCell}>
              <View style={[styles.calDot, { borderColor: stateColor[c.state], backgroundColor: c.state === 'deposited' ? stateColor.deposited : 'transparent' }]}>
                {c.state === 'deposited' ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: 11 }}>{monthShort(i)}</ThemedText>
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          {([['missed', 'plan.goalDetail.legendMissed'], ['current', 'plan.goalDetail.legendCurrent'], ['deposited', 'plan.goalDetail.legendDone']] as const).map(([k, label]) => (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.legendDot, { borderColor: stateColor[k] }]} />
              <ThemedText type="small" style={{ color: colors.textSecondary }}>{t(label)}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      {p.status !== 'done' ? (
        <View style={[styles.card, styles.gap, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">{t('plan.goalDetail.autoTitle')}</ThemedText>
            <View style={[styles.pill, { backgroundColor: autoActive ? colors.positive : colors.negative }]}>
              <ThemedText type="small" style={{ color: '#fff', fontWeight: '700' }}>{autoActive ? t('plan.goalDetail.autoActive') : t('plan.goalDetail.autoInactive')}</ThemedText>
            </View>
          </View>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {autoActive && rule
              ? t('plan.goalDetail.autoBodyOn', { amount: money(rule.amount), day: Number(rule.nextDate.slice(8, 10)) })
              : suggested > 0
                ? t('plan.goalDetail.autoBodyOff', { amount: money(suggested) })
                : t('plan.goalDetail.autoBodyNone')}
          </ThemedText>
          <Pressable style={[styles.reviewButton, { backgroundColor: colors.accent }]} onPress={() => onEdit(goal.id)}>
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{autoActive ? t('plan.goalDetail.autoChange') : t('plan.goalDetail.autoSetup')}</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.card, styles.reviewRow, { backgroundColor: colors.backgroundSelected }]}>
        <ThemedText style={styles.flex}>{t('plan.goalDetail.reviewText')}</ThemedText>
        <Pressable style={[styles.reviewButton, { backgroundColor: colors.accent }]} onPress={() => onEdit(goal.id)}>
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{t('plan.goalDetail.reviewButton')}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.buttons}>
        <Pressable style={[styles.button, { backgroundColor: colors.backgroundElement }]} onPress={() => updateGoal(goal.id, { paused: !goal.paused })}>
          <Ionicons name={goal.paused ? 'play' : 'pause'} size={16} color={colors.text} />
          <ThemedText style={[styles.buttonText, { color: colors.text }]}>{goal.paused ? t('plan.goalDetail.resume') : t('plan.goalDetail.pause')}</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.button, styles.small, { backgroundColor: colors.backgroundElement, opacity: index > 0 ? 1 : 0.4 }]}
          disabled={index <= 0}
          onPress={() => moveGoal(goal.id, -1)}
          accessibilityLabel={t('plan.goalDetail.moveUp')}
        >
          <Ionicons name="arrow-up" size={18} color={colors.text} />
        </Pressable>
        <Pressable
          style={[styles.button, styles.small, { backgroundColor: colors.backgroundElement, opacity: index < goals.length - 1 ? 1 : 0.4 }]}
          disabled={index >= goals.length - 1}
          onPress={() => moveGoal(goal.id, 1)}
          accessibilityLabel={t('plan.goalDetail.moveDown')}
        >
          <Ionicons name="arrow-down" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.goalDetail.amountRm')}
      </ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, { backgroundColor: valid ? colors.accent : colors.backgroundSelected }]}
          onPress={() => submit(1)}
          disabled={!valid}
        >
          <Ionicons name="add" size={18} color={valid ? '#fff' : colors.textSecondary} />
          <ThemedText style={[styles.buttonText, !valid && { color: colors.textSecondary }]}>{t('plan.goalDetail.addMoney')}</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.button, { backgroundColor: colors.backgroundElement }]}
          onPress={() => submit(-1)}
          disabled={!valid || p.saved <= 0}
        >
          <Ionicons name="remove" size={18} color={valid && p.saved > 0 ? colors.text : colors.textSecondary} />
          <ThemedText style={[styles.buttonText, { color: valid && p.saved > 0 ? colors.text : colors.textSecondary }]}>{t('plan.goalDetail.takeOut')}</ThemedText>
        </Pressable>
      </View>
      <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
        {t('plan.goalDetail.trackNote')}
      </ThemedText>

      {history.length > 0 ? (
        <>
          <ThemedText type="smallBold" style={styles.historyTitle}>
            {t('plan.goalDetail.history')}
          </ThemedText>
          <View style={[styles.card, styles.historyCard, { backgroundColor: colors.backgroundElement }]}>
            {history.slice(0, HISTORY_LIMIT).map((e, i) => (
              <Pressable
                key={e.id}
                onLongPress={() => removeEntry(e.id)}
                onPress={() => removeEntry(e.id)}
                style={[styles.historyRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
                accessibilityHint={t('plan.goalDetail.removeHint')}
              >
                <View style={styles.flex}>
                  <ThemedText>{e.id.startsWith('st:') ? t('plan.goalDetail.viaStart') : e.id.startsWith('bal:') ? t('plan.goalDetail.viaBalance') : e.fromTransfer ? t('plan.goalDetail.viaTransfer') : e.amount > 0 ? t('plan.goalDetail.added') : t('plan.goalDetail.takenOut')}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {dayLabel(e.date)}
                    {e.note ? ` · ${e.note}` : ''}
                  </ThemedText>
                </View>
                <ThemedText style={{ fontWeight: '700', color: e.amount > 0 ? colors.positive : colors.negative }}>
                  {hideAmounts ? MASK : `${e.amount > 0 ? '+' : '-'}${formatMoney(Math.abs(e.amount))}`}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {history.length > HISTORY_LIMIT ? (
            <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
              {t('plan.goalDetail.showingLatest', { shown: HISTORY_LIMIT, total: history.length })}
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  calCell: { width: '16.66%', alignItems: 'center', gap: 4 },
  calDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  reviewButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, alignItems: 'center' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  box: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },

  summary: { alignItems: 'center', gap: 4, marginBottom: Spacing.three },
  title: { fontSize: 20, fontWeight: '700' },
  card: { borderRadius: 20, padding: 20 },
  saved: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', marginVertical: Spacing.two },
  fill: { height: 10, borderRadius: 5 },
  note: { fontSize: 12, lineHeight: 16, marginTop: Spacing.two },
  gap: { marginTop: Spacing.three, gap: 6, padding: Spacing.three },
  milestones: { flexDirection: 'row', gap: Spacing.two },
  milestone: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10 },
  small: { flex: 0, paddingHorizontal: 16 },

  label: { marginBottom: Spacing.one, marginTop: Spacing.three },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 14, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 14, borderRadius: 14 },
  buttonText: { color: '#fff', fontWeight: '700' },

  historyTitle: { fontSize: 16, marginTop: Spacing.four, marginBottom: Spacing.two },
  historyCard: { paddingVertical: 4, paddingHorizontal: Spacing.three },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
