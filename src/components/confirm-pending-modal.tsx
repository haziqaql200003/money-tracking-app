import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { CategoryIcon } from '@/components/category-icon';
import { DateField } from '@/components/date-field';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import type { PendingEntry } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';
import { dayLabel } from '@/utils/dates';

type Props = {
  /** The entry being confirmed. null = closed. */
  entry: PendingEntry | null;
  onClose: () => void;
};

export function ConfirmPendingModal({ entry, onClose }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!entry} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <ThemedView
          style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title="Confirm amount"
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  Cancel
                </ThemedText>
              </Pressable>
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Mounted only for one entry at a time, so the form always starts from a fresh state. */}
            {entry ? <ConfirmForm key={entry.id} entry={entry} onDone={onClose} /> : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ConfirmForm({ entry, onDone }: { entry: PendingEntry; onDone: () => void }) {
  const colors = useTheme();
  const { recurringRules, accounts, confirmPending, dismissPending } = useTransactions();
  const { getCategory } = useCategories();

  const rule = recurringRules.find((r) => r.id === entry.ruleId);
  const [amount, setAmount] = useState(rule && rule.amount > 0 ? String(rule.amount) : '');
  const [date, setDate] = useState(entry.date);

  if (!rule) {
    return (
      <View style={styles.missing}>
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          This recurring item no longer exists.
        </ThemedText>
        <Pressable style={styles.textButton} onPress={() => { dismissPending(entry.id); onDone(); }}>
          <ThemedText style={{ color: colors.accent, fontWeight: '600' }}>Remove</ThemedText>
        </Pressable>
      </View>
    );
  }

  const category = getCategory(rule.categoryId);
  const account = accounts.find((a) => a.id === rule.accountId);
  const income = rule.type === 'credit';
  const parsed = parseFloat(amount.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0;

  function record() {
    if (!valid) return;
    confirmPending(entry.id, parsed, date);
    onDone();
  }

  function skip() {
    Alert.alert('Skip this one?', `Nothing will be recorded for ${dayLabel(entry.date)}. Future dates are not affected.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: () => {
          dismissPending(entry.id);
          onDone();
        },
      },
    ]);
  }

  return (
    <View>
      <View style={styles.summary}>
        <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? '#8E8E93'} size={56} />
        <ThemedText style={styles.title}>{rule.title}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Due {dayLabel(entry.date)}
          {account ? ` · ${account.name}` : ''}
        </ThemedText>
      </View>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {income ? 'Amount received (RM)' : 'Amount paid (RM)'}
      </ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        autoFocus
        accessibilityLabel="Real amount in Malaysian Ringgit"
      />
      <ThemedText type="small" style={[styles.hint, { color: colors.textSecondary }]}>
        {income
          ? 'Enter what actually reached your account (your net pay, after deductions).'
          : 'Enter the amount on the bill.'}
        {rule.amount > 0 ? ` Expected ${formatMoney(rule.amount)}.` : ''}
      </ThemedText>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {income ? 'Date received' : 'Date paid'}
      </ThemedText>
      <DateField value={date} onChange={setDate} showQuick maxToday />

      <Pressable
        style={[styles.saveButton, { backgroundColor: valid ? colors.accent : colors.backgroundSelected }]}
        onPress={record}
        disabled={!valid}
      >
        <ThemedText style={[styles.saveText, !valid && { color: colors.textSecondary }]}>Record</ThemedText>
      </Pressable>

      <Pressable style={styles.textButton} onPress={skip}>
        <ThemedText style={{ color: colors.textSecondary, fontWeight: '600' }}>Skip this one</ThemedText>
      </Pressable>
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

  summary: { alignItems: 'center', gap: 4, marginTop: Spacing.one },
  title: { fontSize: 18, fontWeight: '700' },
  label: { marginBottom: Spacing.one, marginTop: Spacing.three },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
    textAlign: 'center',
  },
  hint: { fontSize: 12, lineHeight: 16, marginTop: Spacing.one },
  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.four },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  textButton: { padding: 14, alignItems: 'center' },
  missing: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
});
