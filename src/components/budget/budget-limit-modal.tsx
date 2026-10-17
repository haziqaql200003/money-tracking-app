import { useState } from 'react';
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
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';

type Props = {
  /** The category being edited. null = closed. */
  category: Category | null;
  /** What was spent in this category in the month being viewed. */
  spent: number;
  monthName: string;
  onClose: () => void;
};

const QUICK = [100, 200, 300, 500, 1000];

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
  const [value, setValue] = useState(category.monthlyLimit > 0 ? String(category.monthlyLimit) : '');

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
        <CategoryIcon icon={category.icon} color={category.color} size={56} />
        <ThemedText style={styles.title}>{categoryName(category)}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t('plan.budgetLimit.spentIn', { amount: formatMoney(spent), month: monthName })}
        </ThemedText>
      </View>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.budgetLimit.monthlyRm')}
      </ThemedText>
      <AmountInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChange={setValue}
        autoFocus
      />

      <View style={styles.quickRow}>
        {QUICK.map((q) => (
          <Pressable
            key={q}
            onPress={() => setValue(String(q))}
            style={[styles.quick, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
          >
            <ThemedText type="small">{q}</ThemedText>
          </Pressable>
        ))}
        {matchAmount > 0 ? (
          <Pressable
            onPress={() => setValue(String(matchAmount))}
            style={[styles.quick, styles.quickWide, { backgroundColor: colors.backgroundElement, borderColor: colors.accent }]}
          >
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              {t('plan.budgetLimit.match', { amount: matchAmount })}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

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
  summary: { alignItems: 'center', gap: 4, marginTop: Spacing.two },
  title: { fontSize: FontSize.heading, fontWeight: '700' },
  label: { marginTop: Spacing.four, marginBottom: Spacing.one },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    fontSize: FontSize.largeTitle,
    fontWeight: '600',
    lineHeight: 34,
    textAlign: 'center',
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.three },
  quick: { flexGrow: 1, flexShrink: 1, flexBasis: 0, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  quickWide: { flexGrow: 0, flexShrink: 0, flexBasis: '100%' },
  note: { marginTop: Spacing.three, fontSize: FontSize.caption, lineHeight: 16 },
  saveButton: { padding: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.two },
  saveText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
  removeButton: { padding: 14, alignItems: 'center' },
});