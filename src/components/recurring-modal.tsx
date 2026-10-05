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
import { useT } from '@/i18n';
import { accountName, categoryName, subcategoryName } from '@/i18n/data';
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
  const { t } = useT();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

        <ThemedView
          style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title={editing ? t('tx.rec.editTitle') : t('tx.rec.newTitle')}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.cancel')}
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
  const { t, tp } = useT();
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
      title: title.trim() || (subcategory ? subcategoryName(subcategory) : categoryName(selectedCategory)),
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
    Alert.alert(t('tx.rec.deleteTitle'), t('tx.rec.deleteMessage', { title: editing.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
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
            { key: 'debit', label: t('common.expense'), color: colors.negative },
            { key: 'credit', label: t('common.income'), color: colors.positive },
          ]}
          value={type}
          onChange={changeType}
        />
      </View>

      {/* Fixed / Confirm each time */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('common.amount')}
      </ThemedText>
      <View style={{ marginBottom: Spacing.one }}>
        <GlassSegmented
          options={[
            { key: 'fixed', label: t('tx.rec.modeFixed') },
            { key: 'ask', label: t('tx.rec.modeAsk') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>
      <ThemedText type="small" style={[styles.hint, { color: colors.textSecondary }]}>
        {asking
          ? t('tx.rec.hintAsk')
          : t('tx.rec.hintFixed')}
      </ThemedText>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {asking ? t('tx.rec.expectedAmount') : t('tx.add.amountRm')}
      </ThemedText>
      <TextInput
        style={[styles.amountInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder={asking ? t('tx.rec.expectedPlaceholder') : '0.00'}
        placeholderTextColor={colors.textSecondary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        accessibilityLabel={t('tx.add.amountA11y')}
      />

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('common.title')}
      </ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder={t('tx.rec.titlePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
      />

      {/* Frequency */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('tx.rec.repeats')}
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
                {t(f.labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {editing ? t('tx.rec.nextDate') : t('tx.rec.startsOn')}
      </ThemedText>
      <DateField value={date} onChange={setDate} accent={typeAccent} />
      {backfill > 0 ? (
        <ThemedText type="small" style={{ color: backfill > 12 ? colors.negative : colors.textSecondary, marginTop: Spacing.one }}>
          {asking ? tp('tx.rec.backfillAsk', backfill) : tp('tx.rec.backfillRecord', backfill)}
        </ThemedText>
      ) : null}

      {/* End date */}
      <View style={[styles.switchCard, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{t('tx.rec.endsOn')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('tx.rec.endsOnHint')}
          </ThemedText>
        </View>
        <Switch value={hasEnd} onValueChange={toggleEnd} trackColor={{ true: colors.accent }} />
      </View>
      {hasEnd ? (
        <View style={styles.endField}>
          <DateField value={endDate} onChange={setEndDate} accent={typeAccent} />
          {!endValid ? (
            <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
              {t('tx.rec.endInvalid')}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {/* Account */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('common.account')}
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
                  {accountName(acc)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Category */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('common.category')}
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
                  {categoryName(cat)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedCategory && selectedCategory.subcategories.length > 0 ? (
        <>
          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('tx.add.subcategory')}
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
                    {subcategoryName(sub)}
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
            <ThemedText type="smallBold">{t('tx.rec.active')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('tx.rec.activeHint')}
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
          {editing ? t('tx.add.saveChanges') : t('tx.rec.save')}
        </ThemedText>
      </Pressable>

      {editing ? (
        <Pressable style={styles.removeButton} onPress={remove}>
          <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('tx.rec.delete')}</ThemedText>
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
