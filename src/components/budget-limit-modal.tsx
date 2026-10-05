import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/category-icon';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Category } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
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
  const { updateCategory } = useCategories();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (category) setValue(category.monthlyLimit > 0 ? String(category.monthlyLimit) : '');
  }, [category]);

  const parsed = parseFloat(value.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const hasBudget = !!category && category.monthlyLimit > 0;
  const matchAmount = Math.ceil(spent / 10) * 10;

  function save() {
    if (!category || !valid) return;
    updateCategory(category.id, { monthlyLimit: parsed });
    onClose();
  }

  function remove() {
    if (!category) return;
    updateCategory(category.id, { monthlyLimit: 0 });
    onClose();
  }

  return (
    <Modal visible={!!category} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

        <ThemedView
          style={[
            styles.modalBox,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          {category ? (
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
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
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
          ) : null}
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
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  summary: { alignItems: 'center', gap: 4, marginTop: Spacing.two },
  title: { fontSize: 18, fontWeight: '700' },
  label: { marginTop: Spacing.four, marginBottom: Spacing.one },
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
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.three },
  quick: { flexGrow: 1, flexShrink: 1, flexBasis: 0, alignItems: 'center', paddingVertical: 8, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  quickWide: { flexGrow: 0, flexShrink: 0, flexBasis: '100%' },
  note: { marginTop: Spacing.three, fontSize: 12, lineHeight: 16 },
  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.two },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  removeButton: { padding: 14, alignItems: 'center' },
});