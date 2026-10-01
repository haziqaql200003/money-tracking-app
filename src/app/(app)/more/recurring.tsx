import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/category-icon';
import { ConfirmPendingModal } from '@/components/confirm-pending-modal';
import { RecurringModal } from '@/components/recurring-modal';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import type { PendingEntry, RecurringRule } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';
import { dayLabel, toDateKey } from '@/utils/dates';
import { frequencyLabel, isAsk, isEnded, monthlyEquivalent, relativeDay } from '@/utils/recurring';

const MASK = 'RM ••••';

export default function RecurringScreen() {
  const colors = useTheme();
  const { recurringRules, accounts, pendingEntries } = useTransactions();
  const { getCategory } = useCategories();
  const { hideAmounts } = usePrivacy();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [confirming, setConfirming] = useState<PendingEntry | null>(null);

  const today = toDateKey(new Date());
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  const running = recurringRules.filter((r) => r.active && !isEnded(r)).sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1));
  const stopped = recurringRules.filter((r) => !r.active || isEnded(r));

  const waiting = [...pendingEntries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const monthlyOut = running.filter((r) => r.type === 'debit').reduce((sum, r) => sum + monthlyEquivalent(r), 0);
  const monthlyIn = running.filter((r) => r.type === 'credit').reduce((sum, r) => sum + monthlyEquivalent(r), 0);

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
    const status = ended ? 'Ended' : !rule.active ? 'Paused' : `Next: ${relativeDay(rule.nextDate, today)}`;
    const amountColor = rule.type === 'debit' ? colors.negative : colors.positive;
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
        <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? '#8E8E93'} size={42} />
        <View style={styles.flex}>
          <ThemedText numberOfLines={1}>{rule.title}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {frequencyLabel(rule.frequency)} · {status}
            {account ? ` · ${account.name}` : ''}
            {ask ? ' · Confirm each time' : ''}
          </ThemedText>
        </View>
        <ThemedText style={{ color: amountColor, fontWeight: '700' }}>
          {hideAmounts
            ? MASK
            : ask
              ? rule.amount > 0
                ? `~${formatMoney(rule.amount)}`
                : 'Varies'
              : formatMoney(rule.amount, { signed: true, type: rule.type })}
        </ThemedText>
      </Pressable>
    );
  }

  function renderPending(entry: PendingEntry, i: number) {
    const rule = recurringRules.find((r) => r.id === entry.ruleId);
    if (!rule) return null;
    const category = getCategory(rule.categoryId);
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
        <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? '#8E8E93'} size={42} />
        <View style={styles.flex}>
          <ThemedText numberOfLines={1}>{rule.title}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
            Due {dayLabel(entry.date)} · {rule.amount > 0 ? `Expected ${money(rule.amount)}` : 'Enter the amount'}
          </ThemedText>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.accent }]}>
          <ThemedText type="small" style={styles.pillText}>
            Confirm
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
            title="Recurring"
            right={
              <Pressable
                onPress={openAdd}
                hitSlop={8}
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel="Add recurring transaction"
              >
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            }
          />

          {waiting.length > 0 ? (
            <>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                To confirm · {waiting.length}
              </ThemedText>
              <View style={[styles.listCard, { backgroundColor: colors.backgroundElement, borderColor: colors.accent, borderWidth: 1.5 }]}>
                {waiting.map((entry, i) => renderPending(entry, i))}
              </View>
            </>
          ) : null}

          {recurringRules.length === 0 ? (
            <View style={[styles.card, styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="repeat" size={32} color={colors.textSecondary} />
              <ThemedText style={styles.emptyTitle}>Nothing repeating yet</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                Add things that happen on a schedule, like rent, salary, insurance or a subscription. They are recorded for you
                on the day.
              </ThemedText>
              <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={openAdd}>
                <ThemedText style={styles.emptyButtonText}>Add recurring</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Committed each month
                </ThemedText>
                <ThemedText style={styles.big} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {money(monthlyOut)}
                </ThemedText>
                <View style={[styles.tiles, { borderTopColor: colors.divider }]}>
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Recurring income
                    </ThemedText>
                    <ThemedText style={[styles.tileValue, { color: colors.positive }]}>{money(monthlyIn)}</ThemedText>
                  </View>
                  <View style={[styles.tileDivider, { backgroundColor: colors.divider }]} />
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Left after
                    </ThemedText>
                    <ThemedText style={[styles.tileValue, monthlyIn - monthlyOut < 0 && { color: colors.negative }]}>
                      {hideAmounts ? MASK : `${monthlyIn - monthlyOut < 0 ? '-' : ''}${formatMoney(monthlyIn - monthlyOut)}`}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary }]}>
                  Weekly and daily items are averaged to a month, so this is an estimate.
                </ThemedText>
              </View>

              {running.length > 0 ? (
                <>
                  <View style={styles.rowBetween}>
                    <ThemedText type="smallBold" style={styles.sectionTitle}>
                      Coming up · {running.length}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Tap to edit
                    </ThemedText>
                  </View>
                  <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                    {running.map((r, i) => renderRow(r, i, false))}
                  </View>
                </>
              ) : null}

              {stopped.length > 0 ? (
                <>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    Paused or ended · {stopped.length}
                  </ThemedText>
                  <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                    {stopped.map((r, i) => renderRow(r, i, true))}
                  </View>
                </>
              ) : null}
            </>
          )}

          <ThemedText type="small" style={[styles.footnote, styles.center, { color: colors.textSecondary }]}>
            A transaction is created automatically when its date arrives. If the app was closed, it catches up next time you open it.
          </ThemedText>
        </ScrollView>

        <RecurringModal visible={modalVisible} onClose={() => setModalVisible(false)} editing={editing} />
        <ConfirmPendingModal entry={confirming} onClose={() => setConfirming(null)} />
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
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three },
  big: { fontSize: 34, lineHeight: 42, fontWeight: '700', marginTop: 4 },
  tiles: { flexDirection: 'row', marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  tile: { flex: 1, alignItems: 'center' },
  tileValue: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  tileDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  footnote: { fontSize: 12, lineHeight: 16, marginTop: Spacing.three },
  center: { textAlign: 'center' },

  sectionTitle: { fontSize: 16, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: 20, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  pillText: { color: '#fff', fontWeight: '700' },

  empty: { alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: Spacing.two },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});
