import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { DateField } from '@/components/date-field';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import type { RecurringAmountMode, RecurringFrequency, RecurringRule, TransactionType } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { toDateKey } from '@/utils/dates';
import { FREQUENCIES, materializeRecurring } from '@/utils/recurring';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass an existing rule to edit it. */
  editing?: RecurringRule | null;
};

export function RecurringModal({ visible, onClose, editing }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <ThemedView
          style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title={editing ? 'Edit recurring' : 'New recurring'}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  Cancel
                </ThemedText>
              </Pressable>
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Mounted only while open, so the form always starts from a fresh state. */}
            {visible ? <RecurringForm key={editing?.id ?? 'new'} editing={editing} onDone={onClose} /> : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RecurringForm({ editing, onDone }: { editing?: RecurringRule | null; onDone: () => void }) {
  const colors = useTheme();
  const { accounts, addRecurring, updateRecurring, deleteRecurring, setRecurringActive } = useTransactions();
  const { expenseCategories, incomeCategories, getCategory } = useCategories();

  const initialType: TransactionType = editing?.type ?? 'debit';
  const firstCategory = (initialType === 'credit' ? incomeCategories : expenseCategories)[0];

  const [type, setType] = useState<TransactionType>(initialType);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [amount, setAmount] = useState(editing && editing.amount > 0 ? String(editing.amount) : '');
  const [mode, setMode] = useState<RecurringAmountMode>(editing?.amountMode ?? 'fixed');
  const [accountId, setAccountId] = useState(editing?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? firstCategory?.id ?? '');
  const [subcategory, setSubcategory] = useState(editing?.subcategory ?? firstCategory?.subcategories[0] ?? '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(editing?.frequency ?? 'monthly');
  // For an existing rule this is its NEXT occurrence; for a new one it is the first.
  const [date, setDate] = useState(editing?.nextDate ?? toDateKey(new Date()));
  const [hasEnd, setHasEnd] = useState(!!editing?.endDate);
  const [endDate, setEndDate] = useState(editing?.endDate ?? editing?.nextDate ?? toDateKey(new Date()));
  const [active, setActive] = useState(editing?.active ?? true);

  const visibleCategories = type === 'credit' ? incomeCategories : expenseCategories;
  const selectedCategory = getCategory(categoryId) ?? visibleCategories[0];
  const typeAccent = type === 'debit' ? colors.negative : colors.positive;

  const asking = mode === 'ask';
  const parsed = parseFloat(amount.replace(',', '.'));
  // 'ask' rules only need an EXPECTED amount, and it may be left empty (the real amount comes later).
  const amountValid = asking ? amount.trim() === '' || (Number.isFinite(parsed) && parsed > 0) : Number.isFinite(parsed) && parsed > 0;
  const endValid = !hasEnd || endDate >= date;
  const canSave = amountValid && endValid && !!accountId && !!selectedCategory;

  // How many entries would appear straight away (a start date in the past back-fills up to today):
  // recorded transactions for fixed rules, or entries waiting for confirmation for 'ask' rules.
  const backfill = useMemo(() => {
    const preview: RecurringRule = {
      id: 'preview',
      title: '',
      amount: 1,
      amountMode: mode,
      type,
      categoryId,
      subcategory,
      accountId,
      frequency,
      startDate: date,
      nextDate: date,
      endDate: hasEnd ? endDate : undefined,
      active: true,
    };
    const result = materializeRecurring([preview], [], toDateKey(new Date()));
    return mode === 'ask' ? result.pending.length : result.created.length;
  }, [mode, type, categoryId, subcategory, accountId, frequency, date, hasEnd, endDate]);

  function changeType(next: TransactionType) {
    setType(next);
    const first = (next === 'credit' ? incomeCategories : expenseCategories)[0];
    if (first) {
      setCategoryId(first.id);
      setSubcategory(first.subcategories[0] ?? '');
    }
  }

  function pickCategory(id: string) {
    const cat = getCategory(id);
    if (!cat) return;
    setCategoryId(id);
    setSubcategory(cat.subcategories[0] ?? '');
  }

  function toggleEnd(next: boolean) {
    setHasEnd(next);
    if (next && endDate < date) setEndDate(date);
  }

  function save() {
    if (!canSave || !selectedCategory) return;
    const rounded = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
    const base = {
      title: title.trim() || subcategory || selectedCategory.name,
      amount: rounded,
      amountMode: mode,
      type,
      categoryId: selectedCategory.id,
      subcategory,
      accountId,
      frequency,
      endDate: hasEnd ? endDate : undefined,
    };

    if (editing) {
      // The "day of month" anchor only changes when the schedule itself is moved.
      const scheduleMoved = date !== editing.nextDate || frequency !== editing.frequency;
      updateRecurring(editing.id, { ...base, nextDate: date, startDate: scheduleMoved ? date : editing.startDate });
      if (active !== editing.active) setRecurringActive(editing.id, active);
    } else {
      addRecurring({ ...base, startDate: date, nextDate: date, active: true });
    }
    onDone();
  }

  function remove() {
    if (!editing) return;
    Alert.alert('Delete recurring?', `"${editing.title}" will stop repeating. Transactions it already created stay in your history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteRecurring(editing.id);
          onDone();
        },
      },
    ]);
  }

  return (
    <View>
      {/* Expense / Income */}
      <View style={{ marginBottom: Spacing.two }}>
        <GlassSegmented
          options={[
            { key: 'debit', label: 'Expense', color: colors.negative },
            { key: 'credit', label: 'Income', color: colors.positive },
          ]}
          value={type}
          onChange={changeType}
        />
      </View>

      {/* Fixed / Confirm each time */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        Amount
      </ThemedText>
      <View style={{ marginBottom: Spacing.one }}>
        <GlassSegmented
          options={[
            { key: 'fixed', label: 'Fixed' },
            { key: 'ask', label: 'Confirm each time' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>
      <ThemedText type="small" style={[styles.hint, { color: colors.textSecondary }]}>
        {asking
          ? 'Nothing is recorded on its own. On each date you are asked for the real amount, then it is recorded. Good for pay that changes or bills like electricity.'
          : 'The same amount is recorded automatically on each date.'}
      </ThemedText>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {asking ? 'Expected amount (RM), optional' : 'Amount (RM)'}
      </ThemedText>
      <TextInput
        style={[styles.amountInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder={asking ? 'Leave empty if it varies' : '0.00'}
        placeholderTextColor={colors.textSecondary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        accessibilityLabel="Amount in Malaysian Ringgit"
      />

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        Title
      </ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder={`Optional, e.g. Rent, Salary, Netflix`}
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
      />

      {/* Frequency */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        Repeats
      </ThemedText>
      <View style={styles.freqRow}>
        {FREQUENCIES.map((f) => {
          const on = frequency === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFrequency(f.key)}
              style={[
                styles.freqChip,
                { backgroundColor: on ? colors.backgroundSelected : colors.backgroundElement, borderColor: on ? typeAccent : colors.divider },
              ]}
            >
              <ThemedText type="small" style={on ? { fontWeight: '700' } : { color: colors.textSecondary }}>
                {f.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {editing ? 'Next date' : 'Starts on'}
      </ThemedText>
      <DateField value={date} onChange={setDate} accent={typeAccent} />
      {backfill > 0 ? (
        <ThemedText type="small" style={{ color: backfill > 12 ? colors.negative : colors.textSecondary, marginTop: Spacing.one }}>
          {asking
            ? backfill === 1
              ? '1 entry will be waiting for your confirmation right away.'
              : `${backfill} entries will be waiting for your confirmation right away, one for each date up to today.`
            : backfill === 1
              ? '1 entry will be recorded right away (today or earlier).'
              : `${backfill} entries will be recorded right away, one for each date up to today.`}
        </ThemedText>
      ) : null}

      {/* End date */}
      <View style={[styles.switchCard, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Ends on a date</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            e.g. the last instalment of a loan
          </ThemedText>
        </View>
        <Switch value={hasEnd} onValueChange={toggleEnd} trackColor={{ true: colors.accent }} />
      </View>
      {hasEnd ? (
        <View style={styles.endField}>
          <DateField value={endDate} onChange={setEndDate} accent={typeAccent} />
          {!endValid ? (
            <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
              The end date must not be before the start.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {/* Account */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        Account
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {accounts.map((acc) => {
          const on = accountId === acc.id;
          return (
            <Pressable
              key={acc.id}
              style={[styles.chip, { backgroundColor: on ? typeAccent : colors.backgroundElement, borderColor: on ? typeAccent : colors.divider }]}
              onPress={() => setAccountId(acc.id)}
            >
              <View style={styles.chipInner}>
                <Ionicons name={acc.icon} size={15} color={on ? '#fff' : colors.text} />
                <ThemedText type="small" style={on ? styles.chipTextActive : { color: colors.text }}>
                  {acc.name}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Category */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        Category
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {visibleCategories.map((cat) => {
          const on = categoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[styles.chip, { backgroundColor: on ? typeAccent : colors.backgroundElement, borderColor: on ? typeAccent : colors.divider }]}
              onPress={() => pickCategory(cat.id)}
            >
              <View style={styles.chipInner}>
                <Ionicons name={cat.icon} size={15} color={on ? '#fff' : cat.color} />
                <ThemedText type="small" style={on ? styles.chipTextActive : { color: colors.text }}>
                  {cat.name}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedCategory && selectedCategory.subcategories.length > 0 ? (
        <>
          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            Subcategory
          </ThemedText>
          <View style={styles.subGrid}>
            {selectedCategory.subcategories.map((sub) => {
              const on = subcategory === sub;
              return (
                <Pressable
                  key={sub}
                  style={[styles.subChip, { backgroundColor: on ? colors.backgroundSelected : colors.backgroundElement, borderColor: on ? typeAccent : colors.divider }]}
                  onPress={() => setSubcategory(sub)}
                >
                  <ThemedText type="small" style={on ? { fontWeight: '600', color: colors.text } : { color: colors.textSecondary }}>
                    {sub}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Pause */}
      {editing ? (
        <View style={[styles.switchCard, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.flex}>
            <ThemedText type="smallBold">Active</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Turn off to pause. Resuming skips the paused dates.
            </ThemedText>
          </View>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.accent }} />
        </View>
      ) : null}

      <Pressable
        style={[styles.saveButton, { backgroundColor: canSave ? colors.accent : colors.backgroundSelected }]}
        onPress={save}
        disabled={!canSave}
      >
        <ThemedText style={[styles.saveText, !canSave && { color: colors.textSecondary }]}>
          {editing ? 'Save changes' : 'Save recurring'}
        </ThemedText>
      </Pressable>

      {editing ? (
        <Pressable style={styles.removeButton} onPress={remove}>
          <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>Delete recurring</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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


  label: { marginBottom: Spacing.one, marginTop: Spacing.three },
  hint: { fontSize: 12, lineHeight: 16 },
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

  freqRow: { flexDirection: 'row', gap: Spacing.two },
  freqChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },

  switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: Spacing.three, marginTop: Spacing.three },
  endField: { marginTop: Spacing.two },

  chipScroll: { flexDirection: 'row', marginBottom: Spacing.one },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, marginRight: Spacing.two },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  subChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, width: '31.5%', alignItems: 'center' },

  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.four, marginBottom: Spacing.two },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  removeButton: { padding: 14, alignItems: 'center' },
});
