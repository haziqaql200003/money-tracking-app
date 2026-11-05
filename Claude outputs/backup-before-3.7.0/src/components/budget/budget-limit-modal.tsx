import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountInput } from '@/components/ui/amount-input';
import { CategoryIcon } from '@/components/ui/category-icon';
import { SheetHeader } from '@/components/ui/sheet-header';
import { DragSheet } from '@/components/ui/drag-sheet';
import { ThemedText } from '@/components/ui/themed-text';
import type { Category } from '@/constants/categories';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { spentByCategory } from '@/utils/budget';
import { formatMoney } from '@/utils/currency';
import { monthKeyFromOffset } from '@/utils/dates';

type Props = {
  /** The category being edited. null = closed. */
  category: Category | null;
  /** What was spent in this category in the month being viewed. */
  spent: number;
  monthName: string;
  onClose: () => void;
};

const QUICK = [100, 300, 500, 1000, 2000];

export function BudgetLimitModal({ category, spent, monthName, onClose }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!category} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

        <DragSheet visible={!!category} onClose={onClose}
          style={[
            styles.modalBox,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          {/* Mounted only while a category is open, so the field starts from its limit with no effect. */}
          {category ? <LimitForm key={category.id} category={category} spent={spent} monthName={monthName} onClose={onClose} /> : null}
        </DragSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LimitForm({ category, spent, monthName, onClose }: { category: Category; spent: number; monthName: string; onClose: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { updateCategory } = useCategories();
  const { budgetEntries } = useTransactions();
  const [value, setValue] = useState(category.monthlyLimit > 0 ? String(category.monthlyLimit) : '');

  // What the last three months looked like for this category, to suggest a limit that fits.
  const history = useMemo(() => {
    const months = [-1, -2, -3].map((o) => spentByCategory(budgetEntries, monthKeyFromOffset(o)).get(category.id) ?? 0).filter((v) => v > 0);
    if (months.length === 0) return null;
    const avg = months.reduce((a, b) => a + b, 0) / months.length;
    return { avg, max: Math.max(...months), count: months.length, suggest: Math.ceil(avg / 10) * 10 };
  }, [budgetEntries, category.id]);

  const parsed = parseFloat(value.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const hasBudget = category.monthlyLimit > 0;
  const matchAmount = Math.ceil(spent / 10) * 10;

  function save() {
    if (!valid) return;
    updateCategory(category.id, { monthlyLimit: parsed });
    onClose();
  }

  function remove() {
    updateCategory(category.id, { monthlyLimit: 0 });
    onClose();
  }

  return (
    <>
      <SheetHeader
        title={t('plan.budgetLimit.title')}
        left={
      <Pressable onPress={onClose} hitSlop={12}>
        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
          {t('common.cancel')}
        </ThemedText>
      </Pressable>
        }
      />
      <View style={styles.summary}>
        <CategoryIcon icon={category.icon} color={category.color} size={52} />
        <View style={styles.flex}>
          <ThemedText style={styles.title} numberOfLines={2}>{categoryName(category)}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('plan.budgetLimit.spentIn', { amount: formatMoney(spent), month: monthName })}
          </ThemedText>
        </View>
      </View>

      {/* The amount itself is a field: tap it and type any limit. The chips are shortcuts. */}
      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.budgetLimit.monthlyRm')}
      </ThemedText>
      <AmountInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.accent }]}
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChange={setValue}
        textAlign="center"
        autoFocus
        accessibilityLabel={t('plan.budgetLimit.monthlyRm')}
      />
      <ThemedText type="small" style={[styles.typeHint, { color: colors.textSecondary }]}>
        {t('plan.budgetLimit.typeHint')}
      </ThemedText>

      <View style={styles.quickRow}>
        {QUICK.map((q) => {
          const on = valid && parsed === q;
          return (
            <Pressable
              key={q}
              onPress={() => setValue(String(q))}
              style={[styles.quick, { backgroundColor: on ? colors.accentSoft : colors.backgroundElement, borderColor: on ? colors.accent : colors.divider }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <ThemedText type="small" style={{ fontWeight: '700', color: on ? colors.accent : colors.text }}>{q.toLocaleString('en-US')}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {history ? (
        <View style={[styles.suggest, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={{ color: colors.textSecondary, fontWeight: '700' }}>
            {t('plan.budgetLimit.historyTitle', { count: history.count })}
          </ThemedText>
          <View style={styles.suggestRow}>
            <ThemedText type="small">{t('plan.budgetLimit.avg')}</ThemedText>
            <ThemedText type="smallBold">{formatMoney(history.avg)}</ThemedText>
          </View>
          <View style={styles.suggestRow}>
            <ThemedText type="small">{t('plan.budgetLimit.highest')}</ThemedText>
            <ThemedText type="smallBold">{formatMoney(history.max)}</ThemedText>
          </View>
          <Pressable onPress={() => setValue(String(history.suggest))} hitSlop={8} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '800', marginTop: 4 }}>
              {t('plan.budgetLimit.useAmount', { amount: formatMoney(history.suggest) })}
            </ThemedText>
          </Pressable>
        </View>
      ) : matchAmount > 0 ? (
        <Pressable
          onPress={() => setValue(String(matchAmount))}
          style={[styles.suggest, { backgroundColor: colors.backgroundElement }]}
          accessibilityRole="button"
        >
          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
            {t('plan.budgetLimit.match', { amount: matchAmount })}
          </ThemedText>
        </Pressable>
      ) : null}

      {valid && spent > parsed ? (
        <View style={[styles.warn, { backgroundColor: '#D9770622' }]}>
          <ThemedText type="small" style={{ color: colors.warning, fontWeight: '600' }}>
            {t('plan.budgetLimit.alreadyOver', { amount: formatMoney(spent - parsed) })}
          </ThemedText>
        </View>
      ) : null}

      <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>
        {t('plan.budgetLimit.repeats')}
      </ThemedText>

      <Pressable
        style={[styles.saveButton, { backgroundColor: valid ? colors.accent : colors.backgroundSelected }]}
        onPress={save}
        disabled={!valid}
      >
        <ThemedText style={[styles.saveText, !valid && { color: colors.textSecondary }]}>
          {hasBudget ? t('plan.budgetLimit.save') : t('plan.budgetLimit.set')}
        </ThemedText>
      </Pressable>

      {hasBudget ? (
        <Pressable style={styles.removeButton} onPress={remove}>
          <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('plan.budgetLimit.remove')}</ThemedText>
        </Pressable>
      ) : null}
    </>
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
  },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: Spacing.two },
  title: { fontSize: FontSize.heading, fontWeight: '700' },
  label: { marginTop: Spacing.four, marginBottom: Spacing.one },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 46,
    textAlign: 'center',
    borderWidth: 1.5,
  },
  typeHint: { textAlign: 'center', marginTop: 6 },
  suggest: { borderRadius: Radius.md, padding: Spacing.three, marginTop: Spacing.three, gap: 4 },
  suggestRow: { flexDirection: 'row', justifyContent: 'space-between' },
  warn: { borderRadius: Radius.md, padding: 12, marginTop: Spacing.three },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.three },
  quick: { flexGrow: 1, flexShrink: 1, flexBasis: 0, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1.5 },
  note: { marginTop: Spacing.three, fontSize: FontSize.caption, lineHeight: 16 },
  saveButton: { padding: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.two },
  saveText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
  removeButton: { padding: 14, alignItems: 'center' },
});
