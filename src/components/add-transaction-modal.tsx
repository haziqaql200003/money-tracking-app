import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import type { TransactionType, Transaction } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Add mode: called on save. */
  onSave?: (t: Omit<Transaction, 'id'>) => void;
  /** Pass an existing transaction for Edit mode (shows a Delete button). */
  editingTransaction?: Transaction | null;
};

function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateString(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(iso: string) {
  return parseDateString(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isValidAmount(raw: string) {
  if (!raw.trim()) return false;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0;
}

export function AddTransactionModal({ visible, onClose, onSave, editingTransaction }: Props) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const { accounts, updateTransaction, deleteTransaction } = useTransactions();
  const { expenseCategories, incomeCategories, getCategory } = useCategories();
  const isEditing = !!editingTransaction;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('debit');
  const [date, setDate] = useState(toDateString(new Date()));
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? '');
  const [subcategory, setSubcategory] = useState(expenseCategories[0]?.subcategories[0] ?? '');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [touchedAmount, setTouchedAmount] = useState(false);

  const visibleCategories = type === 'credit' ? incomeCategories : expenseCategories;
  const selectedCategory = getCategory(categoryId) ?? visibleCategories[0];
  const amountValid = isValidAmount(amount);
  const canSave = amountValid && !!accountId && !!selectedCategory;

  // Keep the selected category valid when the type changes or categories are edited/deleted.
  useEffect(() => {
    if (!visibleCategories.some((c) => c.id === categoryId)) {
      const first = visibleCategories[0];
      if (first) {
        setCategoryId(first.id);
        setSubcategory(first.subcategories[0] ?? '');
      }
    }
  }, [visibleCategories, categoryId]);

  // Keep the selected account valid if the account list changes (e.g. one gets deleted).
  useEffect(() => {
    if (!accounts.some((a) => a.id === accountId)) {
      setAccountId(accounts[0]?.id ?? '');
    }
  }, [accounts, accountId]);

  // Fill the form when Edit mode opens.
  useEffect(() => {
    if (!visible || !editingTransaction) return;
    setTitle(editingTransaction.title);
    setAmount(String(editingTransaction.amount));
    setType(editingTransaction.type);
    setDate(editingTransaction.date);
    setCategoryId(editingTransaction.categoryId);
    setSubcategory(editingTransaction.subcategory);
    setAccountId(editingTransaction.accountId);
    setShowDatePicker(false);
    setTouchedAmount(false);
  }, [visible, editingTransaction]);

  function reset() {
    const first = expenseCategories[0];
    setTitle('');
    setAmount('');
    setType('debit');
    setDate(toDateString(new Date()));
    setCategoryId(first?.id ?? '');
    setSubcategory(first?.subcategories[0] ?? '');
    setAccountId(accounts[0]?.id ?? '');
    setShowDatePicker(false);
    setTouchedAmount(false);
  }

  function setTransactionType(next: TransactionType) {
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

  function setQuickDate(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(toDateString(d));
    setShowDatePicker(false);
  }

  function openDatePicker() {
    setPickerDate(parseDateString(date));
    setShowDatePicker(true);
  }

  function confirmDatePicker() {
    setDate(toDateString(pickerDate));
    setShowDatePicker(false);
  }

  function cancelDatePicker() {
    setShowDatePicker(false);
  }

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selected) {
        setDate(toDateString(selected));
      }
      return;
    }
    if (selected) setPickerDate(selected);
  }

  function handleSave() {
    if (!canSave) return;
    const parsed = parseFloat(amount.replace(',', '.'));
    const payload = {
      title: title.trim() || subcategory || selectedCategory.name,
      amount: Math.abs(parsed),
      type,
      date,
      categoryId: selectedCategory.id,
      subcategory,
      accountId,
    };
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, payload);
    } else {
      onSave?.(payload);
    }
    reset();
    onClose();
  }

  function handleDelete() {
    if (!editingTransaction) return;
    Alert.alert('Delete transaction?', `"${editingTransaction.title}" akan dipadam. Tindakan ini tak boleh dibatalkan.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(editingTransaction.id);
          reset();
          onClose();
        },
      },
    ]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const typeAccent = type === 'debit' ? colors.negative : colors.positive;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Close" />

        <ThemedView
          style={[
            styles.modalBox,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <View style={styles.sheetHeader}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {isEditing ? 'Edit transaction' : 'Record transaction'}
            </ThemedText>
            <Pressable onPress={handleClose} hitSlop={12}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                Cancel
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.segmentTrack, { backgroundColor: colors.backgroundElement }]}>
              <Pressable
                style={[styles.segmentButton, type === 'debit' && { backgroundColor: colors.background }]}
                onPress={() => setTransactionType('debit')}
              >
                <ThemedText
                  type="small"
                  style={
                    type === 'debit'
                      ? { fontWeight: '600', color: colors.negative }
                      : { color: colors.textSecondary }
                  }
                >
                  Expense
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, type === 'credit' && { backgroundColor: colors.background }]}
                onPress={() => setTransactionType('credit')}
              >
                <ThemedText
                  type="small"
                  style={
                    type === 'credit'
                      ? { fontWeight: '600', color: colors.positive }
                      : { color: colors.textSecondary }
                  }
                >
                  Income
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Amount (RM)
            </ThemedText>
            <TextInput
              style={[
                styles.amountInput,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.divider,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              onBlur={() => setTouchedAmount(true)}
              keyboardType="decimal-pad"
              accessibilityLabel="Amount in Malaysian Ringgit"
            />
            {touchedAmount && !amountValid ? (
              <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                Enter a valid amount greater than zero
              </ThemedText>
            ) : null}

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Title
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.divider,
                },
              ]}
              placeholder={`Optional — defaults to ${subcategory || selectedCategory?.name || 'the category'}`}
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Account
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {accounts.map((acc) => {
                const active = accountId === acc.id;
                return (
                  <Pressable
                    key={acc.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? typeAccent : colors.backgroundElement,
                        borderColor: active ? typeAccent : colors.divider,
                      },
                    ]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <ThemedText
                      type="small"
                      style={active ? styles.chipTextActive : { color: colors.text }}
                    >
                      {acc.icon} {acc.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Category
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {visibleCategories.map((cat) => {
                const active = categoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active ? typeAccent : colors.backgroundElement,
                        borderColor: active ? typeAccent : colors.divider,
                      },
                    ]}
                    onPress={() => pickCategory(cat.id)}
                  >
                    <View style={styles.chipInner}>
                      <Ionicons name={cat.icon} size={15} color={active ? '#fff' : cat.color} />
                      <ThemedText
                        type="small"
                        style={active ? styles.chipTextActive : { color: colors.text }}
                      >
                        {cat.name}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Subcategory
            </ThemedText>
            <View style={styles.subGrid}>
              {selectedCategory.subcategories.map((sub) => {
                const active = subcategory === sub;
                return (
                  <Pressable
                    key={sub}
                    style={[
                      styles.subChip,
                      {
                        backgroundColor: active ? colors.backgroundSelected : colors.backgroundElement,
                        borderColor: active ? typeAccent : colors.divider,
                      },
                    ]}
                    onPress={() => setSubcategory(sub)}
                  >
                    <ThemedText
                      type="small"
                      style={active ? { fontWeight: '600', color: colors.text } : { color: colors.textSecondary }}
                    >
                      {sub}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Date
            </ThemedText>
            <View style={styles.dateQuickRow}>
              {([
                { label: 'Today', offset: 0 },
                { label: 'Yesterday', offset: -1 },
              ] as const).map(({ label, offset }) => {
                const iso = toDateString(new Date(Date.now() + offset * 86400000));
                const active = date === iso;
                return (
                  <Pressable
                    key={label}
                    style={[
                      styles.dateQuick,
                      {
                        borderColor: active ? typeAccent : colors.divider,
                        backgroundColor: active ? colors.backgroundSelected : colors.backgroundElement,
                      },
                    ]}
                    onPress={() => setQuickDate(offset)}
                  >
                    <ThemedText type="small" style={active ? { fontWeight: '600' } : undefined}>
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={[
                styles.dateRow,
                { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
              ]}
              onPress={openDatePicker}
            >
              <ThemedText>{formatDisplayDate(date)}</ThemedText>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                Pick date
              </ThemedText>
            </Pressable>

            {showDatePicker && Platform.OS === 'ios' ? (
              <View
                style={[
                  styles.iosPickerCard,
                  { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
                ]}
              >
                <View style={styles.iosPickerToolbar}>
                  <Pressable onPress={cancelDatePicker} hitSlop={8}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Cancel
                    </ThemedText>
                  </Pressable>
                  <ThemedText type="smallBold">Select date</ThemedText>
                  <Pressable onPress={confirmDatePicker} hitSlop={8}>
                    <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                      Done
                    </ThemedText>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                  maximumDate={new Date()}
                />
              </View>
            ) : null}

            {showDatePicker && Platform.OS === 'android' ? (
              <DateTimePicker
                value={parseDateString(date)}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            ) : null}

            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: canSave ? colors.accent : colors.backgroundSelected },
              ]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <ThemedText style={[styles.saveButtonText, !canSave && { color: colors.textSecondary }]}>
                {isEditing ? 'Save changes' : 'Save transaction'}
              </ThemedText>
            </Pressable>

            {isEditing ? (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>Delete transaction</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalBox: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sheetTitle: { fontSize: 18 },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: Spacing.four,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  fieldLabel: { marginBottom: Spacing.one, marginTop: Spacing.three },
  amountInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
  },
  chipScroll: { flexDirection: 'row', marginBottom: Spacing.one },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: Spacing.two,
  },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  subChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
  },
  dateQuickRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  dateQuick: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two,
  },
  iosPickerCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  iosPickerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  saveButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteButton: { padding: 14, alignItems: 'center', marginBottom: Spacing.three },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});