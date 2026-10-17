import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { TaxReliefPicker } from '@/components/tools/tax-relief-picker';
import { TransferForm } from '@/components/transactions/transfer-form';
import { AmountInput } from '@/components/ui/amount-input';
import { SheetHeader } from '@/components/ui/sheet-header';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import type { Transaction, TransactionItem, TransactionType } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName, subcategoryName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { Alert } from '@/services/dialog';

import { AccountSection } from './account-section';
import { BreakdownSection } from './breakdown-section';
import { CategorySection } from './category-section';
import { DateSection } from './date-section';
import { CHARGES, isValidAmount, newItemId, toDateString } from './helpers';
import { styles } from './styles';
import { useBreakdown } from './use-breakdown';

type Props = {
  onClose: () => void;
  /** Add mode: called on save. */
  onSave?: (t: Omit<Transaction, 'id'>) => void;
  /** Pass an existing transaction for Edit mode (shows a Delete button in the header). */
  editingTransaction?: Transaction | null;
};

/**
 * The add / edit transaction form. It is remounted every time the sheet opens, so each field starts from the
 * transaction being edited (or the defaults) through its useState initialiser; nothing has to be reset by hand.
 */
export function TransactionForm({ onClose, onSave, editingTransaction }: Props) {
  const colors = useTheme();
  const { t, tp } = useT();
  const { accounts, updateTransaction, deleteTransaction } = useTransactions();
  const { expenseCategories, incomeCategories, getCategory } = useCategories();
  const isEditing = !!editingTransaction;

  const [title, setTitle] = useState(editingTransaction?.title ?? '');
  const [amount, setAmount] = useState(editingTransaction ? String(editingTransaction.amount) : '');
  const [type, setType] = useState<TransactionType>(editingTransaction?.type ?? 'debit');
  const [taxRelief, setTaxRelief] = useState<string | undefined>(editingTransaction?.taxReliefId);
  const [date, setDate] = useState(editingTransaction?.date ?? toDateString(new Date()));
  const [categoryId, setCategoryId] = useState(editingTransaction?.categoryId ?? expenseCategories[0]?.id ?? '');
  const [subcategory, setSubcategory] = useState(editingTransaction?.subcategory ?? expenseCategories[0]?.subcategories[0] ?? '');
  const [accountId, setAccountId] = useState(editingTransaction?.accountId ?? accounts[0]?.id ?? '');
  const [touchedAmount, setTouchedAmount] = useState(false);
  // true = the sheet shows the Transfer form instead of the expense/income form.
  const [transferMode, setTransferMode] = useState(false);
  const breakdown = useBreakdown(editingTransaction);
  const { breakdownOn, items, bill, grandTotal } = breakdown;

  const visibleCategories = type === 'credit' ? incomeCategories : expenseCategories;
  const selectedCategory = getCategory(categoryId) ?? visibleCategories[0];

  const amountValid = breakdownOn ? grandTotal > 0 : isValidAmount(amount);
  const canSave = amountValid && !!accountId && !!selectedCategory;

  // Keep the selected category valid when the type changes or categories are edited/deleted,
  // and the selected account valid if one gets deleted (adjusting state while rendering, no effect).
  const firstCategory = visibleCategories[0];
  if (firstCategory && !visibleCategories.some((c) => c.id === categoryId)) {
    setCategoryId(firstCategory.id);
    setSubcategory(firstCategory.subcategories[0] ?? '');
  }
  const fallbackAccountId = accounts[0]?.id ?? '';
  if (accountId !== fallbackAccountId && !accounts.some((a) => a.id === accountId)) {
    setAccountId(fallbackAccountId);
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

  // --- Save / delete ---

  function handleSave() {
    if (!canSave) return;

    const finalItems: TransactionItem[] = breakdownOn
      ? [
          ...items
            .map((it, idx) => ({
              id: it.id,
              label: it.label.trim() || t('tx.add.itemN', { n: idx + 1 }),
              amount: Math.round((parseFloat(it.amountText.replace(',', '.')) || 0) * 100) / 100,
            }))
            .filter((it) => it.label.trim().length > 0 || it.amount !== 0),
          // Extras are saved as their own lines with the amount already worked out (discount is negative).
          ...bill.results
            .filter((r) => r.amount !== 0)
            .map((r) => ({
              id: newItemId(),
              label: t(CHARGES.find((c) => c.kind === r.kind)!.labelKey) + (r.percent ? ` ${r.percent}%` : ''), // i18n-ignore: number suffix
              amount: r.amount,
            })),
        ]
      : [];

    const finalAmount = breakdownOn ? grandTotal : Math.abs(parseFloat(amount.replace(',', '.')));

    const payload: Omit<Transaction, 'id'> = {
      title: title.trim() || (subcategory ? subcategoryName(subcategory) : categoryName(selectedCategory)),
      amount: Math.round(finalAmount * 100) / 100,
      type,
      date,
      categoryId: selectedCategory.id,
      subcategory,
      accountId,
      ...(finalItems.length > 0 ? { items: finalItems } : {}),
      taxReliefId: type === 'debit' ? taxRelief : undefined,
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, payload);
    } else {
      onSave?.(payload);
    }
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
            onClose();
          },
        },
      ],
    );
  }

  const typeAccent = type === 'debit' ? colors.negative : colors.positive;

  return (
    <>
    <SheetHeader
      title={isEditing ? t('tx.add.editTitle') : transferMode ? t('common.transfer') : t('tx.add.newTitle')}
      left={
        <Pressable onPress={onClose} hitSlop={12}>
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
          <TransferForm onDone={onClose} />
        ) : (
          <>
        {/* Amount */}
        <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {t('tx.add.amountRm')}
        </ThemedText>
        {breakdownOn ? (
          <View style={[styles.amountInput, styles.amountReadout, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
            <ThemedText style={styles.amountReadoutValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(grandTotal)}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {tp('tx.add.autoTotal', items.length)}
            </ThemedText>
          </View>
        ) : (
          <>
            <AmountInput
              style={[styles.amountInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
              placeholderTextColor={colors.textSecondary}
              value={amount}
              onChange={setAmount}
              onBlur={() => setTouchedAmount(true)}
              textAlign="center"
              accessibilityLabel={t('tx.add.amountA11y')}
            />
            {touchedAmount && !amountValid ? (
              <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                {t('tx.add.amountInvalid')}
              </ThemedText>
            ) : null}
          </>
        )}

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

            <BreakdownSection breakdown={breakdown} amount={amount} />

            <AccountSection accountId={accountId} setAccountId={setAccountId} typeAccent={typeAccent} />

            <CategorySection
              type={type}
              typeAccent={typeAccent}
              visibleCategories={visibleCategories}
              selectedCategory={selectedCategory}
              categoryId={categoryId}
              subcategory={subcategory}
              setCategoryId={setCategoryId}
              setSubcategory={setSubcategory}
              pickCategory={pickCategory}
            />

            {/* Tax relief (expenses only) */}
          {type === 'debit' ? <TaxReliefPicker value={taxRelief} onChange={setTaxRelief} /> : null}

            <DateSection date={date} setDate={setDate} typeAccent={typeAccent} />
          </>
        )}
      </ScrollView>

      {/* Always visible, so you never scroll to find Save */}
    {!transferMode ? (
      <View style={styles.footer}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: canSave ? colors.accent : colors.backgroundSelected }]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <ThemedText style={[styles.saveButtonText, !canSave && { color: colors.textSecondary }]}>
              {isEditing ? t('tx.add.saveChanges') : t('tx.add.saveTransaction')}
            </ThemedText>
          </Pressable>
      </View>
    ) : null}
    </>
  );
}
