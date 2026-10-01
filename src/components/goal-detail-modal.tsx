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
import { formatMoney } from '@/utils/currency';
import { dayLabel, toDateKey } from '@/utils/dates';
import { goalProgress, type GoalStatus } from '@/utils/goals';

const MASK = 'RM ••••';
const HISTORY_LIMIT = 8;

export const STATUS_TEXT: Record<GoalStatus, string> = {
  done: 'Goal reached',
  overdue: 'Deadline passed',
  behind: 'Behind schedule',
  on_track: 'On track',
  open: 'No deadline',
};

type Props = {
  /** The goal being viewed. null = closed. */
  goalId: string | null;
  onClose: () => void;
  onEdit: (goalId: string) => void;
};

export function GoalDetailModal({ goalId, onClose, onEdit }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!goalId} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <ThemedView
          style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title="Savings goal"
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  Close
                </ThemedText>
              </Pressable>
            }
            right={
              goalId ? (
                <Pressable onPress={() => onEdit(goalId)} hitSlop={12}>
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                    Edit
                  </ThemedText>
                </Pressable>
              ) : undefined
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {goalId ? <Detail key={goalId} goalId={goalId} /> : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Detail({ goalId }: { goalId: string }) {
  const colors = useTheme();
  const { goals, goalEntries, addGoalEntry, deleteGoalEntry } = usePlan();
  const { hideAmounts } = usePrivacy();
  const [amount, setAmount] = useState('');

  const goal = goals.find((g) => g.id === goalId);
  if (!goal) {
    return (
      <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.four }}>
        This goal no longer exists.
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
  const statusColor = p.status === 'done' || p.status === 'on_track' ? colors.positive : p.status === 'open' ? colors.textSecondary : colors.negative;

  function submit(sign: 1 | -1) {
    if (!valid) return;
    if (sign === -1 && parsed > p.saved) {
      Alert.alert('Too much', `Only ${money(p.saved)} is saved in this goal.`);
      return;
    }
    addGoalEntry(goal!.id, sign * parsed, today);
    setAmount('');
  }

  function removeEntry(id: string) {
    Alert.alert('Remove this entry?', 'The saved amount will go back to what it was before.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteGoalEntry(id) },
    ]);
  }

  return (
    <View>
      <View style={styles.summary}>
        <CategoryIcon icon={goal.icon as IconName} color={goal.color} size={56} />
        <ThemedText style={styles.title}>{goal.name}</ThemedText>
        <ThemedText type="small" style={{ color: statusColor, fontWeight: '700' }}>
          {STATUS_TEXT[p.status]}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.rowBetween}>
          <ThemedText style={styles.saved}>{money(p.saved)}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            of {money(goal.target)}
          </ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
          <View style={[styles.fill, { width: `${Math.max(p.percent, p.saved > 0 ? 2 : 0)}%`, backgroundColor: goal.color }]} />
        </View>
        <View style={styles.rowBetween}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {p.percent}% saved
          </ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {p.status === 'done' ? 'All done' : `${money(p.remaining)} to go`}
          </ThemedText>
        </View>
        {goal.deadline ? (
          <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
            Deadline {dayLabel(goal.deadline)}
            {p.daysLeft !== null && p.daysLeft >= 0 ? ` · ${p.daysLeft} ${p.daysLeft === 1 ? 'day' : 'days'} left` : ''}
            {p.perMonth !== null ? ` · about ${money(p.perMonth)} a month` : ''}
          </ThemedText>
        ) : null}
      </View>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        Amount (RM)
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
          <ThemedText style={[styles.buttonText, !valid && { color: colors.textSecondary }]}>Add money</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.button, { backgroundColor: colors.backgroundElement }]}
          onPress={() => submit(-1)}
          disabled={!valid || p.saved <= 0}
        >
          <Ionicons name="remove" size={18} color={valid && p.saved > 0 ? colors.text : colors.textSecondary} />
          <ThemedText style={[styles.buttonText, { color: valid && p.saved > 0 ? colors.text : colors.textSecondary }]}>Take out</ThemedText>
        </Pressable>
      </View>
      <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
        This only tracks money you have set aside. It does not move money between accounts or count as spending.
      </ThemedText>

      {history.length > 0 ? (
        <>
          <ThemedText type="smallBold" style={styles.historyTitle}>
            History
          </ThemedText>
          <View style={[styles.card, styles.historyCard, { backgroundColor: colors.backgroundElement }]}>
            {history.slice(0, HISTORY_LIMIT).map((e, i) => (
              <Pressable
                key={e.id}
                onLongPress={() => removeEntry(e.id)}
                onPress={() => removeEntry(e.id)}
                style={[styles.historyRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
                accessibilityHint="Tap to remove this entry"
              >
                <View style={styles.flex}>
                  <ThemedText>{e.amount > 0 ? 'Added' : 'Taken out'}</ThemedText>
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
              Showing the latest {HISTORY_LIMIT} of {history.length}.
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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

  label: { marginBottom: Spacing.one, marginTop: Spacing.three },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 14, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 14, borderRadius: 14 },
  buttonText: { color: '#fff', fontWeight: '700' },

  historyTitle: { fontSize: 16, marginTop: Spacing.four, marginBottom: Spacing.two },
  historyCard: { paddingVertical: 4, paddingHorizontal: Spacing.three },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
