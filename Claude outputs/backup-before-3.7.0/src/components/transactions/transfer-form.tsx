import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { BrandAvatar } from '@/components/ui/brand-avatar';
import { DateField } from '@/components/ui/date-field';
import { ThemedText } from '@/components/ui/themed-text';
import { Chip } from '@/components/ui/chip';
import { FontSize, Radius, Spacing } from '@/constants/theme';
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
import { Alert } from '@/services/dialog';

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

/** One side of a transfer: the chosen account as a card; tap it to open the list of accounts. */
function AccountCardSelect({
  label,
  accounts,
  selectedId,
  balanceOf,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  accounts: Account[];
  selectedId: string;
  balanceOf: (id: string) => number;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  const colors = useTheme();
  const { t } = useT();
  const acc = accounts.find((a) => a.id === selectedId);
  const avatar = (a: Account, size: number) =>
    a.provider ? (
      <BrandAvatar name={a.provider} size={size} />
    ) : (
      <View style={[styles.accIcon, { width: size, height: size, backgroundColor: `${a.color ?? colors.accent}22` }]}>
        <Ionicons name={a.icon} size={size * 0.48} color={a.color ?? colors.accent} />
      </View>
    );
  return (
    <View>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.side, { backgroundColor: colors.backgroundElement, borderColor: open ? colors.accent : colors.divider }, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}: ${acc ? accountName(acc) : ''}`}
      >
        {acc ? avatar(acc, 42) : null}
        <View style={styles.sideText}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{label}</ThemedText>
          <ThemedText style={{ fontWeight: '800' }} numberOfLines={1}>{acc ? accountName(acc) : ''}</ThemedText>
        </View>
        <View style={styles.sideRight}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('tx.transfer.balanceShort')}</ThemedText>
          <ThemedText type="smallBold">{acc ? formatMoney(balanceOf(acc.id)) : ''}</ThemedText>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.accent} />
      </Pressable>
      {open ? (
        <View style={[styles.menu, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
          {accounts.map((a) => {
            const on = a.id === selectedId;
            return (
              <Pressable
                key={a.id}
                onPress={() => onSelect(a.id)}
                style={({ pressed }) => [styles.menuItem, on && { backgroundColor: colors.backgroundSelected }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                {avatar(a, 30)}
                <ThemedText style={[styles.sideText, { fontWeight: on ? '700' : '500' }]} numberOfLines={1}>{accountName(a)}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{formatMoney(balanceOf(a.id))}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
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
  const [openSide, setOpenSide] = useState<'from' | 'to' | null>(null);

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
  const toAccount = accounts.find((a) => a.id === toId);
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
      {/* From and To as two cards, the swap button between them. Tap a card to choose its account. */}
      <View>
        <AccountCardSelect
          label={t('tx.transfer.from')}
          accounts={accounts}
          selectedId={fromId}
          balanceOf={(id) => (editing && editing.fromAccountId === id ? accountBalance(id) + editing.amount : accountBalance(id))}
          open={openSide === 'from'}
          onToggle={() => setOpenSide(openSide === 'from' ? null : 'from')}
          onSelect={(id) => {
            pickFrom(id);
            setOpenSide(null);
          }}
        />
        <View style={styles.swapRow}>
          <Pressable
            onPress={swap}
            hitSlop={8}
            style={[styles.swapButton, { backgroundColor: colors.accent, borderColor: colors.background }]}
            accessibilityRole="button"
            accessibilityLabel={t('tx.transfer.swapA11y')}
          >
            <Ionicons name="swap-vertical" size={18} color={colors.onAccent} />
          </Pressable>
        </View>
        <AccountCardSelect
          label={t('tx.transfer.to')}
          accounts={accounts}
          selectedId={toId}
          balanceOf={(id) => accountBalance(id)}
          open={openSide === 'to'}
          onToggle={() => setOpenSide(openSide === 'to' ? null : 'to')}
          onSelect={(id) => {
            pickTo(id);
            setOpenSide(null);
          }}
        />
      </View>

      <ThemedText type="small" style={[styles.label, styles.center, { color: colors.textSecondary }]}>
        {t('tx.add.amountRm')}
      </ThemedText>
      <AmountInput
        style={[styles.amountInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
        value={amount}
        onChange={setAmount}
        textAlign="center"
        accessibilityLabel={t('tx.transfer.amountA11y')}
      />
      <View style={styles.quickRow}>
        {[50, 100, 200].map((n) => (
          <Chip key={n} label={`RM ${n}`} active={value === n} onPress={() => setAmount(n.toFixed(2))} />
        ))}
        {availableBefore > 0 ? (
          <Chip label={t('tx.transfer.all')} active={value === Math.round(availableBefore * 100) / 100} onPress={() => setAmount((Math.round(availableBefore * 100) / 100).toFixed(2))} />
        ) : null}
      </View>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineChips}>
            {expenseCategories.map((c) => (
              <Chip key={c.id} label={categoryName(c)} active={c.id === chosenCat?.id} onPress={() => setBudgetCat(c.id)} />
            ))}
          </ScrollView>
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

      {value > 0 && fromAccount && toAccount ? (
        <View style={[styles.after, { backgroundColor: `${colors.positive}14` }]}>
          <ThemedText type="small" style={{ color: colors.positive, fontWeight: '600' }}>
            {t('tx.transfer.after', {
              from: accountName(fromAccount),
              fromAmount: formatMoney(availableBefore - value),
              to: accountName(toAccount),
              toAmount: formatMoney(accountBalance(toId) - (editing && editing.toAccountId === toId ? editing.amount : 0) + value),
            })}
          </ThemedText>
        </View>
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
          {editing ? t('tx.add.saveChanges') : value > 0 ? t('tx.transfer.saveAmount', { amount: formatMoney(value) }) : t('tx.transfer.save')}
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderRadius: Radius.md, marginTop: Spacing.three },
  switchText: { flex: 1 },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  label: { marginBottom: Spacing.one, marginTop: Spacing.three },
  labelTight: { marginBottom: Spacing.one },
  chipScroll: { flexDirection: 'row', marginBottom: Spacing.one },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, marginRight: Spacing.two },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  swapRow: { height: 8, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  swapButton: { width: 38, height: 38, borderRadius: Radius.pill, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  side: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1.5 },
  sideText: { flex: 1, minWidth: 0 },
  sideRight: { alignItems: 'flex-end' },
  accIcon: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  menu: { borderWidth: 1, borderRadius: Radius.md, marginTop: Spacing.two, padding: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 10, borderRadius: Radius.sm },
  center: { textAlign: 'center' },
  lineChips: { gap: Spacing.two },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.two },
  after: { borderRadius: Radius.md, padding: 12, marginTop: Spacing.three },

  amountInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 46,
    textAlign: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: FontSize.body,
  },
  note: { marginTop: Spacing.three, fontSize: FontSize.caption, lineHeight: 16 },
  saveButton: { padding: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.two },
  saveText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
  removeButton: { padding: 14, alignItems: 'center' },

  info: { borderRadius: Radius.lg, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  infoTitle: { fontSize: FontSize.body, fontWeight: '700' },
});
