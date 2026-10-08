import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/category-icon';
import { ConfirmPendingModal } from '@/components/confirm-pending-modal';
import { RecurringModal } from '@/components/recurring-modal';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import type { PendingEntry, RecurringRule } from '@/context/TransactionsContext';
import { usePlan } from '@/context/PlanContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { dayLabel, toDateKey } from '@/utils/dates';
import { activeGoals, goalMonthSaved } from '@/utils/goals';
import { frequencyLabel, isAsk, isEnded, isTransfer, monthlyEquivalent, relativeDay } from '@/utils/recurring';
import { cycleOf } from '@/utils/cycle';

const MASK = 'RM ••••';

export default function RecurringScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { recurringRules, accounts, pendingEntries, ready } = useTransactions();
  const { getCategory } = useCategories();
  const { hideAmounts } = usePrivacy();
  const router = useRouter();
  const { goals, goalEntries } = usePlan();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [confirming, setConfirming] = useState<PendingEntry | null>(null);

  const today = toDateKey(new Date());
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  const running = recurringRules.filter((r) => r.active && !isEnded(r)).sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1));
  const stopped = recurringRules.filter((r) => !r.active || isEnded(r));

  const waiting = [...pendingEntries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Transfers only move money between your own accounts, so they are not part of what you owe or earn.
  const monthlyOut = running.filter((r) => !isTransfer(r) && r.type === 'debit').reduce((sum, r) => sum + monthlyEquivalent(r), 0);
  const monthlyIn = running.filter((r) => !isTransfer(r) && r.type === 'credit').reduce((sum, r) => sum + monthlyEquivalent(r), 0);
  const hasTransfers = running.some(isTransfer);

  // Goals with a monthly plan are a commitment too: money you have promised to put aside.
  const goalPlans = activeGoals(goals, goalEntries).filter((g) => (g.monthly ?? 0) > 0);
  const goalSaving = goalPlans.reduce((sum, g) => sum + (g.monthly ?? 0), 0);
  const monthKeyNow = cycleOf(toDateKey(new Date()));
  // A goal that saves automatically already has its own row below; the others are listed here.
  const manualGoalPlans = goalPlans.filter((g) => !(g.recurringId && recurringRules.some((r) => r.id === g.recurringId)));

  const accountLabel = (id?: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? accountName(a) : '?';
  };

  function openAdd() {
    setEditing(null);
    setModalVisible(true);
  }

  function openEdit(rule: RecurringRule) {
    setEditing(rule);
    setModalVisible(true);
  }

  function renderRow(rule: RecurringRule, i: number, dimmed: boolean) {
    const category = getCategory(rule.categoryId);
    const account = accounts.find((a) => a.id === rule.accountId);
    const ended = isEnded(rule);
    const status = ended
      ? t('tx.recurring.ended')
      : !rule.active
        ? t('tx.recurring.paused')
        : t('tx.recurring.next', { when: relativeDay(rule.nextDate, today) });
    const transfer = isTransfer(rule);
    const amountColor = transfer ? colors.accent : rule.type === 'debit' ? colors.negative : colors.positive;
    const ask = isAsk(rule);

    return (
      <Pressable
        key={rule.id}
        onPress={() => openEdit(rule)}
        style={({ pressed }) => [
          styles.row,
          i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
          { opacity: pressed ? 0.6 : dimmed ? 0.55 : 1 },
        ]}
      >
        {transfer ? (
          <CategoryIcon icon="swap-horizontal" color={colors.accent} size={42} />
        ) : (
          <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? '#8E8E93'} size={42} />
        )}
        <View style={styles.flex}>
          <ThemedText numberOfLines={1}>{rule.title}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {frequencyLabel(rule.frequency)} · {status}
            {transfer ? ` · ${accountLabel(rule.accountId)} → ${accountLabel(rule.toAccountId)}` : account ? ` · ${accountName(account)}` : ''}
            {ask ? ` · ${t('tx.rec.modeAsk')}` : ''}
          </ThemedText>
        </View>
        <ThemedText style={{ color: amountColor, fontWeight: '700' }}>
          {hideAmounts
            ? MASK
            : ask
              ? rule.amount > 0
                ? `~${formatMoney(rule.amount)}`
                : t('tx.recurring.varies')
              : transfer
                ? formatMoney(rule.amount)
                : formatMoney(rule.amount, { signed: true, type: rule.type })}
        </ThemedText>
      </Pressable>
    );
  }

  function renderPending(entry: PendingEntry, i: number) {
    const rule = recurringRules.find((r) => r.id === entry.ruleId);
    if (!rule) return null;
    const category = getCategory(rule.categoryId);
    const transfer = isTransfer(rule);
    return (
      <Pressable
        key={entry.id}
        onPress={() => setConfirming(entry)}
        style={({ pressed }) => [
          styles.row,
          i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
          pressed && { opacity: 0.6 },
        ]}
      >
        {transfer ? (
          <CategoryIcon icon="swap-horizontal" color={colors.accent} size={42} />
        ) : (
          <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? '#8E8E93'} size={42} />
        )}
        <View style={styles.flex}>
          <ThemedText numberOfLines={1}>{rule.title}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {t('tx.confirm.due', { date: dayLabel(entry.date) })} ·{' '}
            {rule.amount > 0 ? t('tx.confirm.expected', { amount: money(rule.amount) }) : t('tx.recurring.enterAmount')}
          </ThemedText>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.accent }]}>
          <ThemedText type="small" style={styles.pillText}>
            {t('common.confirm')}
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader
            title={t('tx.recurring.title')}
            right={
              <Pressable
                onPress={openAdd}
                hitSlop={8}
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel={t('tx.recurring.addA11y')}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            }
          />
          {!(ready) ? <ScreenSkeleton variant="list" /> : (
          <>

          {waiting.length > 0 ? (
            <>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {t('tx.recurring.toConfirm', { count: waiting.length })}
              </ThemedText>
              <View style={[styles.listCard, { backgroundColor: colors.backgroundElement, borderColor: colors.accent, borderWidth: 1.5 }]}>
                {waiting.map((entry, i) => renderPending(entry, i))}
              </View>
            </>
          ) : null}

          {recurringRules.length === 0 ? (
            <View style={[styles.card, styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="repeat" size={32} color={colors.textSecondary} />
              <ThemedText style={styles.emptyTitle}>{t('tx.recurring.emptyTitle')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {t('tx.recurring.emptyBody')}
              </ThemedText>
              <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={openAdd}>
                <ThemedText style={styles.emptyButtonText}>{t('tx.recurring.add')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('tx.recurring.committed')}
                </ThemedText>
                <ThemedText style={styles.big} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {money(monthlyOut)}
                </ThemedText>
                <View style={[styles.tiles, { borderTopColor: colors.divider }]}>
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('tx.recurring.income')}
                    </ThemedText>
                    <ThemedText style={[styles.tileValue, { color: colors.positive }]}>{money(monthlyIn)}</ThemedText>
                  </View>
                  <View style={[styles.tileDivider, { backgroundColor: colors.divider }]} />
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('tx.recurring.leftAfter')}
                    </ThemedText>
                    <ThemedText style={[styles.tileValue, monthlyIn - monthlyOut - goalSaving < 0 && { color: colors.negative }]}>
                      {hideAmounts ? MASK : `${monthlyIn - monthlyOut - goalSaving < 0 ? '-' : ''}${formatMoney(monthlyIn - monthlyOut - goalSaving)}`}
                    </ThemedText>
                  </View>
                </View>
                {goalSaving > 0 ? (
                  <View style={[styles.goalLine, { borderTopColor: colors.divider }]}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('tx.recurring.goalSaving')}
                    </ThemedText>
                    <ThemedText type="smallBold">{money(goalSaving)}</ThemedText>
                  </View>
                ) : null}
                <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary }]}>
                  {t('tx.recurring.estimate')}
                  {hasTransfers ? ` ${t('tx.recurring.transfersNote')}` : ''}
                </ThemedText>
              </View>

              {running.length > 0 ? (
                <>
                  <View style={styles.rowBetween}>
                    <ThemedText type="smallBold" style={styles.sectionTitle}>
                      {t('tx.recurring.comingUp', { count: running.length })}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('tx.recurring.tapToEdit')}
                    </ThemedText>
                  </View>
                  <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                    {running.map((r, i) => renderRow(r, i, false))}
                  </View>
                </>
              ) : null}

              {manualGoalPlans.length > 0 ? (
                <>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    {t('tx.recurring.goalsTitle')}
                  </ThemedText>
                  <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                    {manualGoalPlans.map((g, i) => (
                      <Pressable
                        key={g.id}
                        onPress={() => router.push('/more/rancang')}
                        style={[styles.goalRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
                      >
                        <View style={styles.goalText}>
                          <ThemedText numberOfLines={1}>{g.name}</ThemedText>
                          <ThemedText type="small" style={{ color: colors.textSecondary }}>
                            {t('tx.recurring.goalMonth', { saved: money(goalMonthSaved(goalEntries, g.id, monthKeyNow)), plan: money(g.monthly ?? 0) })}
                          </ThemedText>
                        </View>
                        <ThemedText type="smallBold">{money(g.monthly ?? 0)}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              {stopped.length > 0 ? (
                <>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    {t('tx.recurring.stopped', { count: stopped.length })}
                  </ThemedText>
                  <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                    {stopped.map((r, i) => renderRow(r, i, true))}
                  </View>
                </>
              ) : null}
            </>
          )}

          <ThemedText type="small" style={[styles.footnote, styles.center, { color: colors.textSecondary }]}>
            {t('tx.recurring.footer')}
          </ThemedText>
          </>
          )}
        </ScrollView>

        <RecurringModal visible={modalVisible} onClose={() => setModalVisible(false)} editing={editing} />
        <ConfirmPendingModal entry={confirming} onClose={() => setConfirming(null)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  goalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  goalText: { flex: 1 },
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  addButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: Radius.lg, padding: 20, marginBottom: Spacing.three },
  big: { fontSize: FontSize.display, lineHeight: 42, fontWeight: '700', marginTop: 4 },
  tiles: { flexDirection: 'row', marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  tile: { flex: 1, alignItems: 'center' },
  tileValue: { fontSize: FontSize.body, fontWeight: '700', marginTop: 2 },
  tileDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  footnote: { fontSize: FontSize.caption, lineHeight: 16, marginTop: Spacing.three },
  center: { textAlign: 'center' },

  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md },
  pillText: { color: '#fff', fontWeight: '700' },

  empty: { alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '700' },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.lg, marginTop: Spacing.two },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});
