import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import type { Account, Transfer } from '@/context/TransactionsContext';
import { useCategories } from '@/context/CategoriesContext';
import { usePlan } from '@/context/PlanContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName, categoryName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { looksLikeSavings } from '@/utils/saved';

type Props = {
  /** Pass an existing transfer to edit it (shows a Delete button). */
  editing?: Transfer | null;
  /** Called after save / delete so the parent sheet can close. */
  onDone: () => void;
};

function parseAmount(raw: string) {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function AccountChips({
  accounts,
  selectedId,
  onSelect,
}: {
  accounts: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const colors = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {accounts.map((acc) => {
        const active = selectedId === acc.id;
        return (
          <Pressable
            key={acc.id}
            onPress={() => onSelect(acc.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.accent : colors.backgroundElement,
                borderColor: active ? colors.accent : colors.divider,
              },
            ]}
          >
            <View style={styles.chipInner}>
              <Ionicons name={acc.icon} size={15} color={active ? '#fff' : colors.text} />
              <ThemedText type="small" style={active ? styles.chipTextActive : { color: colors.text }}>
                {accountName(acc)}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function TransferForm({ editing, onDone }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { selectableAccounts: accounts, accountBalance, addTransfer, updateTransfer, deleteTransfer } = useTransactions();

  const [fromId, setFromId] = useState(editing?.fromAccountId ?? accounts[0]?.id ?? '');
  const [toId, setToId] = useState(editing?.toAccountId ?? accounts[1]?.id ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [date, setDate] = useState(editing?.date ?? toDateKey(new Date()));
  const [note, setNote] = useState(editing?.note ?? '');
  const { expenseCategories } = useCategories();
  const { goals } = usePlan();
  const [goalId, setGoalId] = useState<string | null>(editing?.goalId ?? null);
  // "Count in budget": on by default when the money goes into something that looks like a savings account, until the user decides.
  const [countChoice, setCountChoice] = useState<boolean | null>(editing ? !!editing.budgetCategoryId : null);
  const [budgetCat, setBudgetCat] = useState(editing?.budgetCategoryId ?? 'financial');

  if (accounts.length < 2) {
    return (
      <View style={[styles.info, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="swap-horizontal" size={28} color={colors.textSecondary} />
        <ThemedText style={styles.infoTitle}>{t('tx.transfer.needAccountTitle')}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {t('tx.transfer.needAccountBody')}
        </ThemedText>
      </View>
    );
  }

  const countInBudget = countChoice ?? looksLikeSavings(accounts.find((a) => a.id === toId));
  const goalChoices = goals.filter((g) => !g.paused || g.id === goalId);
  const showGoals = goalChoices.length > 0 && (countInBudget || !!goalId || looksLikeSavings(accounts.find((a) => a.id === toId)));
  const chosenCat = expenseCategories.find((c) => c.id === budgetCat) ?? expenseCategories[0];
  const value = Math.round(parseAmount(amount) * 100) / 100;
  const canSave = value > 0 && !!fromId && !!toId && fromId !== toId;
  const fromAccount = accounts.find((a) => a.id === fromId);
  const fromBalance = fromId ? accountBalance(fromId) : 0;
  // When editing, this transfer's own amount is already taken out of the balance.
  const availableBefore = editing && editing.fromAccountId === fromId ? fromBalance + editing.amount : fromBalance;
  const overdraws = value > 0 && value > availableBefore;

  // Picking the account that is already on the other side swaps them, so the form can never be invalid.
  function pickFrom(id: string) {
    if (id === toId) setToId(fromId);
    setFromId(id);
  }
  function pickTo(id: string) {
    if (id === fromId) setFromId(toId);
    setToId(id);
  }
  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  function save() {
    if (!canSave) return;
    const payload = {
      fromAccountId: fromId,
      toAccountId: toId,
      amount: value,
      date,
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    const budget =
      countInBudget && chosenCat
        ? { budgetCategoryId: chosenCat.id, budgetSub: chosenCat.id === 'financial' ? 'Savings' : (chosenCat.subcategories[0] ?? '') }
        : { budgetCategoryId: undefined, budgetSub: undefined };
    const goalPatch = { goalId: showGoals && goalId ? goalId : undefined };
    if (editing) {
      // `note` must be cleared explicitly when the user emptied the field.
      updateTransfer(editing.id, { ...payload, ...budget, ...goalPatch, note: note.trim() || undefined });
    } else {
      addTransfer({ ...payload, ...(budget.budgetCategoryId ? budget : {}), ...(goalPatch.goalId ? goalPatch : {}) });
    }
    onDone();
  }

  function remove() {
    if (!editing) return;
    Alert.alert(t('tx.transfer.deleteTitle'), t('tx.transfer.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteTransfer(editing.id);
          onDone();
        },
      },
    ]);
  }

  return (
    <View>
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('tx.transfer.from')}
      </ThemedText>
      <AccountChips accounts={accounts} selectedId={fromId} onSelect={pickFrom} />
      {fromAccount ? (
        <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
          {t('tx.transfer.balance', { amount: formatMoney(availableBefore) })}
        </ThemedText>
      ) : null}

      <View style={styles.swapRow}>
        <View style={[styles.swapLine, { backgroundColor: colors.divider }]} />
        <Pressable
          onPress={swap}
          hitSlop={8}
          style={[styles.swapButton, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
          accessibilityRole="button"
          accessibilityLabel={t('tx.transfer.swapA11y')}
        >
          <Ionicons name="swap-vertical" size={18} color={colors.accent} />
        </Pressable>
        <View style={[styles.swapLine, { backgroundColor: colors.divider }]} />
      </View>

      <ThemedText type="small" style={[styles.labelTight, { color: colors.textSecondary }]}>
        {t('tx.transfer.to')}
      </ThemedText>
      <AccountChips accounts={accounts} selectedId={toId} onSelect={pickTo} />

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('tx.add.amountRm')}
      </ThemedText>
      <TextInput
        style={[styles.amountInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        accessibilityLabel={t('tx.transfer.amountA11y')}
      />
      {overdraws ? (
        <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
          {t('tx.transfer.overdraw', { name: fromAccount ? accountName(fromAccount) : '' })}
        </ThemedText>
      ) : null}

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('common.date')}
      </ThemedText>
      <DateField value={date} onChange={setDate} showQuick maxToday />

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('common.note')}
      </ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder={t('tx.transfer.notePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={note}
        onChangeText={setNote}
      />

      <View style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.switchText}>
          <ThemedText>{t('tx.transfer.countInBudget')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('tx.transfer.countInBudgetSub')}
          </ThemedText>
        </View>
        <Switch value={countInBudget} onValueChange={setCountChoice} trackColor={{ true: colors.accent }} />
      </View>
      {countInBudget ? (
        <>
          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('tx.transfer.budgetCategory')}
          </ThemedText>
          <View style={styles.catChips}>
            {expenseCategories.map((c) => (
              <Chip key={c.id} label={categoryName(c)} active={c.id === chosenCat?.id} onPress={() => setBudgetCat(c.id)} />
            ))}
          </View>
        </>
      ) : null}

      {showGoals ? (
        <>
          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('tx.transfer.forGoal')}
          </ThemedText>
          <View style={styles.catChips}>
            <Chip label={t('tx.transfer.noGoal')} active={!goalId} onPress={() => setGoalId(null)} />
            {goalChoices.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                active={g.id === goalId}
                onPress={() => {
                  setGoalId(g.id);
                  if (g.accountId && g.accountId !== toId && accounts.some((a) => a.id === g.accountId)) pickTo(g.accountId);
                }}
              />
            ))}
          </View>
        </>
      ) : null}

      <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
        {t('tx.transfer.explain')}
      </ThemedText>

      <Pressable
        style={[styles.saveButton, { backgroundColor: canSave ? colors.accent : colors.backgroundSelected }]}
        onPress={save}
        disabled={!canSave}
      >
        <ThemedText style={[styles.saveText, !canSave && { color: colors.textSecondary }]}>
          {editing ? t('tx.add.saveChanges') : t('tx.transfer.save')}
        </ThemedText>
      </Pressable>

      {editing ? (
        <Pressable style={styles.removeButton} onPress={remove}>
          <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('tx.transfer.delete')}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderRadius: 14, marginTop: Spacing.three },
  switchText: { flex: 1 },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  label: { marginBottom: Spacing.one, marginTop: Spacing.three },
  labelTight: { marginBottom: Spacing.one },
  chipScroll: { flexDirection: 'row', marginBottom: Spacing.one },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, marginRight: Spacing.two },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  swapRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.two },
  swapLine: { flex: 1, height: StyleSheet.hairlineWidth },
  swapButton: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },

  amountInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
    textAlign: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
  },
  note: { marginTop: Spacing.three, fontSize: 12, lineHeight: 16 },
  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.two },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  removeButton: { padding: 14, alignItems: 'center' },

  info: { borderRadius: 16, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  infoTitle: { fontSize: 17, fontWeight: '700' },
});