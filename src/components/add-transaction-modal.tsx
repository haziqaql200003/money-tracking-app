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
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransferForm } from '@/components/transfer-form';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import type { Transaction, TransactionItem, TransactionType } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useT, type TKey } from '@/i18n';
import { categoryName, subcategoryName, accountName } from '@/i18n/data';
import { formatDate, mondayIndex, weekdayShort } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Add mode: called on save. */
  onSave?: (t: Omit<Transaction, 'id'>) => void;
  /** Pass an existing transaction for Edit mode (shows a Delete button in the header). */
  editingTransaction?: Transaction | null;
};

type DraftItem = { id: string; label: string; amountText: string };

let itemCounter = 0;
function newItemId() {
  itemCounter += 1;
  return `item_${Date.now()}_${itemCounter}`;
}

const QUICK_ITEMS: TKey[] = [
  'tx.add.quickServiceCharge',
  'tx.add.quickTax',
  'tx.add.quickTip',
  'tx.add.quickDelivery',
  'tx.add.quickDiscount',
];

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
  const d = parseDateString(iso);
  return `${weekdayShort(mondayIndex(d))}, ${formatDate(d)}`;
}

function isValidAmount(raw: string) {
  if (!raw.trim()) return false;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0;
}

export function AddTransactionModal({ visible, onClose, onSave, editingTransaction }: Props) {
  const colors = useTheme();
  const { t, tp } = useT();
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

  const [breakdownOn, setBreakdownOn] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  // true = the sheet shows the Transfer form instead of the expense/income form.
  const [transferMode, setTransferMode] = useState(false);

  const visibleCategories = type === 'credit' ? incomeCategories : expenseCategories;
  const selectedCategory = getCategory(categoryId) ?? visibleCategories[0];

  const itemsTotal = items.reduce((sum, it) => {
    const n = parseFloat(it.amountText.replace(',', '.'));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const amountValid = breakdownOn ? itemsTotal > 0 : isValidAmount(amount);
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
    setBreakdownOn(!!editingTransaction.items && editingTransaction.items.length > 0);
    setItems(
      editingTransaction.items?.map((it) => ({
        id: it.id,
        label: it.label,
        amountText: it.amount ? String(it.amount) : '',
      })) ?? [],
    );
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
    setBreakdownOn(false);
    setItems([]);
    setTransferMode(false);
  }

  function setTransactionType(next: TransactionType) {
    setTransferMode(false);
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

  // --- Breakdown ---

  function toggleBreakdown(next: boolean) {
    setBreakdownOn(next);
    if (next && items.length === 0) {
      const seed = isValidAmount(amount) ? parseFloat(amount.replace(',', '.')) : 0;
      setItems([{ id: newItemId(), label: '', amountText: seed > 0 ? String(seed) : '' }]);
    }
  }

  function addItem(label = '') {
    setItems((prev) => [...prev, { id: newItemId(), label, amountText: '' }]);
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  // --- Save / delete ---

  function handleSave() {
    if (!canSave) return;

    const finalItems: TransactionItem[] = breakdownOn
      ? items
          .map((it, idx) => ({
            id: it.id,
            label: it.label.trim() || t('tx.add.itemN', { n: idx + 1 }),
            amount: Math.round((parseFloat(it.amountText.replace(',', '.')) || 0) * 100) / 100,
          }))
          .filter((it) => it.label.trim().length > 0 || it.amount !== 0)
      : [];

    const finalAmount = breakdownOn ? itemsTotal : Math.abs(parseFloat(amount.replace(',', '.')));

    const payload: Omit<Transaction, 'id'> = {
      title: title.trim() || (subcategory ? subcategoryName(subcategory) : categoryName(selectedCategory)),
      amount: Math.round(finalAmount * 100) / 100,
      type,
      date,
      categoryId: selectedCategory.id,
      subcategory,
      accountId,
      ...(finalItems.length > 0 ? { items: finalItems } : {}),
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
    Alert.alert(
      t('tx.add.deleteTitle'),
      t('tx.add.deleteMessage', { title: editingTransaction.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteTransaction(editingTransaction.id);
            reset();
            onClose();
          },
        },
      ],
    );
  }

  function handleClose() {
    reset();
    onClose();
  }

  const typeAccent = type === 'debit' ? colors.negative : colors.positive;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel={t('common.close')} />

        <ThemedView
          style={[
            styles.modalBox,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <SheetHeader
            title={isEditing ? t('tx.add.editTitle') : transferMode ? t('common.transfer') : t('tx.add.newTitle')}
            left={
              <Pressable onPress={handleClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
            }
            right={
              isEditing ? (
                <Pressable onPress={handleDelete} hitSlop={12} accessibilityLabel={t('tx.add.deleteA11y')}>
                  <Ionicons name="trash-outline" size={20} color={colors.negative} />
                </Pressable>
              ) : null
            }
          />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Expense / Income / Transfer */}
            <View style={{ marginBottom: Spacing.four }}>
              <GlassSegmented
                options={[
                  { key: 'debit', label: t('common.expense'), color: colors.negative },
                  { key: 'credit', label: t('common.income'), color: colors.positive },
                  ...(isEditing ? [] : [{ key: 'transfer' as const, label: t('common.transfer'), color: colors.accent }]),
                ]}
                value={transferMode ? 'transfer' : type === 'debit' ? 'debit' : 'credit'}
                onChange={(k) => (k === 'transfer' ? setTransferMode(true) : setTransactionType(k))}
              />
            </View>

            {transferMode ? (
              <TransferForm onDone={handleClose} />
            ) : (
              <>
                {/* Amount */}
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('tx.add.amountRm')}
                </ThemedText>
                {breakdownOn ? (
                  <View style={[styles.amountInput, styles.amountReadout, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    <ThemedText style={styles.amountReadoutValue} numberOfLines={1} adjustsFontSizeToFit>
                      {formatMoney(itemsTotal)}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {tp('tx.add.autoTotal', items.length)}
                    </ThemedText>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={[styles.amountInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={amount}
                      onChangeText={setAmount}
                      onBlur={() => setTouchedAmount(true)}
                      keyboardType="decimal-pad"
                      accessibilityLabel={t('tx.add.amountA11y')}
                    />
                    {touchedAmount && !amountValid ? (
                      <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                        {t('tx.add.amountInvalid')}
                      </ThemedText>
                    ) : null}
                  </>
                )}

                {/* Breakdown */}
                <View style={[styles.breakdownCard, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.breakdownHeader}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{t('tx.add.breakdown')}</ThemedText>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        {t('tx.add.breakdownHint')}
                      </ThemedText>
                    </View>
                    <Switch value={breakdownOn} onValueChange={toggleBreakdown} trackColor={{ true: colors.accent }} />
                  </View>

                  {breakdownOn ? (
                    <View style={styles.breakdownBody}>
                      {items.map((it, idx) => (
                        <View key={it.id} style={styles.itemRow}>
                          <View style={[styles.itemBullet, { backgroundColor: colors.background }]}>
                            <ThemedText type="small" style={{ color: colors.textSecondary }}>
                              {idx + 1}
                            </ThemedText>
                          </View>
                          <TextInput
                            style={[styles.itemLabelInput, { color: colors.text }]}
                            placeholder={t('tx.add.itemN', { n: idx + 1 })}
                            placeholderTextColor={colors.textSecondary}
                            value={it.label}
                            onChangeText={(v) => updateItem(it.id, { label: v })}
                          />
                          <View style={[styles.itemAmountWrap, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                            <ThemedText type="small" style={{ color: colors.textSecondary }}>
                              {/* i18n-ignore: currency */}
                              RM
                            </ThemedText>
                            <TextInput
                              style={[styles.itemAmountInput, { color: colors.text }]}
                              placeholder="0.00"
                              placeholderTextColor={colors.textSecondary}
                              value={it.amountText}
                              onChangeText={(v) => updateItem(it.id, { amountText: v })}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <Pressable onPress={() => removeItem(it.id)} hitSlop={8} accessibilityLabel={t('tx.add.removeItemA11y')}>
                            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                          </Pressable>
                        </View>
                      ))}

                      <Pressable onPress={() => addItem()} style={[styles.addItemRow, { borderColor: colors.divider }]}>
                        <Ionicons name="add" size={18} color={colors.accent} />
                        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                          {t('tx.add.addItem')}
                        </ThemedText>
                      </Pressable>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
                        {QUICK_ITEMS.map((labelKey) => (
                          <Pressable
                            key={labelKey}
                            onPress={() => addItem(t(labelKey))}
                            style={[styles.quickChip, { backgroundColor: colors.background, borderColor: colors.divider }]}
                          >
                            <ThemedText type="small" style={{ color: colors.textSecondary }}>
                              + {t(labelKey)}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </ScrollView>

                      <View style={[styles.itemsTotalRow, { borderTopColor: colors.divider }]}>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>
                          {t('tx.add.itemsTotal')}
                        </ThemedText>
                        <ThemedText type="smallBold">{formatMoney(itemsTotal)}</ThemedText>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Title */}
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('common.title')}
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                  placeholder={t('tx.add.titlePlaceholder', {
                    name: subcategory
                      ? subcategoryName(subcategory)
                      : selectedCategory
                        ? categoryName(selectedCategory)
                        : t('tx.add.theCategory'),
                  })}
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />

                {/* Account */}
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('common.account')}
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

                {/* Category */}
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('common.category')}
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
                          <ThemedText type="small" style={active ? styles.chipTextActive : { color: colors.text }}>
                            {categoryName(cat)}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Subcategory */}
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('tx.add.subcategory')}
                </ThemedText>
                <View style={styles.subGrid}>
                  {selectedCategory?.subcategories.map((sub) => {
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
                          {subcategoryName(sub)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Date */}
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('common.date')}
                </ThemedText>
                <View style={styles.dateQuickRow}>
                  {([
                    { key: 'today', label: t('common.today'), offset: 0 },
                    { key: 'yesterday', label: t('common.yesterday'), offset: -1 },
                  ] as const).map(({ key, label, offset }) => {
                    const iso = toDateString(new Date(Date.now() + offset * 86400000));
                    const active = date === iso;
                    return (
                      <Pressable
                        key={key}
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
                  style={[styles.dateRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                  onPress={openDatePicker}
                >
                  <View style={styles.chipInner}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <ThemedText>{formatDisplayDate(date)}</ThemedText>
                  </View>
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                    {t('tx.add.pickDate')}
                  </ThemedText>
                </Pressable>

                {showDatePicker && Platform.OS === 'ios' ? (
                  <View style={[styles.iosPickerCard, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    <View style={styles.iosPickerToolbar}>
                      <Pressable onPress={cancelDatePicker} hitSlop={8}>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>
                          {t('common.cancel')}
                        </ThemedText>
                      </Pressable>
                      <ThemedText type="smallBold">{t('tx.add.selectDate')}</ThemedText>
                      <Pressable onPress={confirmDatePicker} hitSlop={8}>
                        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                          {t('common.done')}
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
                  style={[styles.saveButton, { backgroundColor: canSave ? colors.accent : colors.backgroundSelected }]}
                  onPress={handleSave}
                  disabled={!canSave}
                >
                  <ThemedText style={[styles.saveButtonText, !canSave && { color: colors.textSecondary }]}>
                    {isEditing ? t('tx.add.saveChanges') : t('tx.add.saveTransaction')}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalBox: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },


  fieldLabel: { marginBottom: Spacing.one, marginTop: Spacing.three },
  amountInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    fontSize: FontSize.largeTitle,
    fontWeight: '600',
    lineHeight: 34,
    textAlign: 'center',
  },
  amountReadout: { alignItems: 'center', gap: 2 },
  amountReadoutValue: { fontSize: FontSize.largeTitle, fontWeight: '700', lineHeight: 34 },

  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: FontSize.body,
  },
  chipScroll: { flexDirection: 'row', marginBottom: Spacing.one },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: Spacing.two,
  },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  subChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    width: '31.5%',
    alignItems: 'center',
  },
  dateQuickRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  dateQuick: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.two,
  },
  iosPickerCard: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: Spacing.three },
  iosPickerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  saveButton: { padding: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.two },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },

  breakdownCard: { borderRadius: Radius.lg, padding: Spacing.three, marginTop: Spacing.three },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownBody: { marginTop: Spacing.three, gap: Spacing.two },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemBullet: { width: 24, height: 24, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  itemLabelInput: { flex: 1, fontSize: FontSize.label, paddingVertical: 8 },
  itemAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    width: 92,
  },
  itemAmountInput: { flex: 1, fontSize: FontSize.label, paddingVertical: 8, textAlign: 'right' },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  quickScroll: { marginTop: Spacing.one },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, marginRight: 8 },
  itemsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
