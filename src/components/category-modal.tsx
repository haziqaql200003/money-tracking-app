import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { CategoryIcon } from '@/components/category-icon';
import { EvenGrid } from '@/components/even-grid';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  FALLBACK_EXPENSE_ID,
  FALLBACK_INCOME_ID,
  PROTECTED_CATEGORY_IDS,
  type Category,
  type CategoryKind,
  type IconName,
} from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName, subcategoryName } from '@/i18n/data';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass a category to edit/delete it. Omit (or null) to create one. */
  editingCategory?: Category | null;
  /** Kind preselected when creating. */
  defaultKind?: CategoryKind;
};

export function CategoryModal({ visible, onClose, editingCategory, defaultKind = 'expense' }: Props) {
  const { t, tp } = useT();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { transactions, reassignCategory } = useTransactions();
  const isEditing = !!editingCategory;

  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [icon, setIcon] = useState<IconName>('pricetag');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [subs, setSubs] = useState<string[]>([]);
  const [newSub, setNewSub] = useState('');
  const [limit, setLimit] = useState('');
  const [iconQuery, setIconQuery] = useState('');

  // Reset/populate the form whenever the modal opens.
  useEffect(() => {
    if (!visible) return;
    if (editingCategory) {
      setName(categoryName(editingCategory));
      setKind(editingCategory.kind);
      setIcon(editingCategory.icon);
      setColor(editingCategory.color);
      setSubs(editingCategory.subcategories);
      setLimit(editingCategory.monthlyLimit > 0 ? String(editingCategory.monthlyLimit) : '');
    } else {
      setName('');
      setKind(defaultKind);
      setIcon(defaultKind === 'income' ? 'cash' : 'pricetag');
      setColor(CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]);
      setSubs([]);
      setLimit('');
    }
    setNewSub('');
    setIconQuery('');
  }, [visible, editingCategory, defaultKind, categories.length]);

  const trimmed = name.trim();
  const duplicate = categories.some(
    (c) => c.id !== editingCategory?.id && c.kind === kind && categoryName(c).toLowerCase() === trimmed.toLowerCase(),
  );
  const limitNum = parseFloat(limit.replace(',', '.'));
  const limitValid = limit.trim() === '' || (Number.isFinite(limitNum) && limitNum >= 0);
  const canSave = trimmed.length > 0 && !duplicate && limitValid;

  const isProtected = !!editingCategory && PROTECTED_CATEGORY_IDS.includes(editingCategory.id);
  const usedBy = editingCategory ? transactions.filter((tx) => tx.categoryId === editingCategory.id).length : 0;

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    return q ? CATEGORY_ICONS.filter((n) => n.includes(q)) : CATEGORY_ICONS;
  }, [iconQuery]);

  function addSub() {
    const v = newSub.trim();
    if (!v) return;
    if (!subs.some((s) => s.toLowerCase() === v.toLowerCase())) setSubs([...subs, v]);
    setNewSub('');
  }

  function handleSave() {
    if (!canSave) return;
    const payload = {
      // An untouched default name keeps its stored English form so it follows the language.
      name: editingCategory && trimmed === categoryName(editingCategory) ? editingCategory.name : trimmed,
      icon,
      color,
      kind,
      // A category always keeps at least one subcategory so the app never shows an empty label.
      subcategories: subs.length > 0 ? subs : ['General'],
      monthlyLimit: kind === 'expense' && Number.isFinite(limitNum) ? Math.max(limitNum, 0) : 0,
    };
    if (editingCategory) updateCategory(editingCategory.id, payload);
    else addCategory(payload);
    onClose();
  }

  function handleDelete() {
    if (!editingCategory || isProtected) return;
    const fallbackId = editingCategory.kind === 'income' ? FALLBACK_INCOME_ID : FALLBACK_EXPENSE_ID;
    const fallbackCategory = categories.find((c) => c.id === fallbackId);
    const fallbackName = fallbackCategory ? categoryName(fallbackCategory) : t('cat.other');
    const shownName = categoryName(editingCategory);
    Alert.alert(
      t('acct.catModal.deleteTitle'),
      usedBy > 0
        ? tp('acct.catModal.deleteUsed', usedBy, { name: shownName, fallback: fallbackName })
        : t('acct.catModal.deleteUnused', { name: shownName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            reassignCategory(editingCategory.id, fallbackId);
            deleteCategory(editingCategory.id);
            onClose();
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

        <ThemedView
          style={[
            styles.modalBox,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <SheetHeader
            title={isEditing ? t('acct.catModal.titleEdit') : t('acct.catModal.titleNew')}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
            }
          />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Preview */}
            <View style={[styles.preview, { backgroundColor: colors.backgroundElement }]}>
              <CategoryIcon icon={icon} color={color} size={56} />
              <View style={styles.flex}>
                <ThemedText style={styles.previewName} numberOfLines={1}>
                  {trimmed || t('acct.catModal.previewName')}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {kind === 'income' ? t('common.income') : t('common.expense')} ·{' '}
                  {tp('acct.catModal.subCount', Math.max(subs.length, 1))}
                </ThemedText>
              </View>
            </View>

            {/* Name */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('common.name')}
            </ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
              placeholder={t('acct.catModal.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={20}
            />
            {duplicate ? (
              <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                {kind === 'income' ? t('acct.catModal.duplicateIncome') : t('acct.catModal.duplicateExpense')}
              </ThemedText>
            ) : null}

            {/* Kind */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.catModal.type')}
            </ThemedText>
            <GlassSegmented
              disabled={isEditing}
              options={[
                { key: 'expense', label: t('common.expense') },
                { key: 'income', label: t('common.income') },
              ]}
              value={kind}
              onChange={(k) => {
                setKind(k);
                if (k === 'income') setLimit('');
              }}
            />
            {isEditing ? (
              <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
                {t('acct.catModal.typeLocked')}
              </ThemedText>
            ) : null}

            {/* Icon */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.catModal.icon')}
            </ThemedText>
            <View style={[styles.search, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('acct.catModal.searchIcons')}
                placeholderTextColor={colors.textSecondary}
                value={iconQuery}
                onChangeText={setIconQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={[styles.iconBox, { backgroundColor: colors.backgroundElement }]}>
              <ScrollView
                nestedScrollEnabled
                style={styles.iconScroll}
                contentContainerStyle={styles.iconGrid}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <EvenGrid columns={6} rowGap={8}>
                {filteredIcons.map((n) => {
                  const active = n === icon;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setIcon(n)}
                      style={[
                        styles.iconCell,
                        active && { backgroundColor: `${color}26`, borderColor: color },
                      ]}
                      accessibilityLabel={t('acct.add.iconA11y', { name: n })}
                    >
                      <Ionicons name={n} size={22} color={active ? color : colors.textSecondary} />
                    </Pressable>
                  );
                })}
                </EvenGrid>
                {filteredIcons.length === 0 ? (
                  <ThemedText type="small" style={{ color: colors.textSecondary, padding: 8 }}>
                    {t('acct.catModal.noIcons', { query: iconQuery })}
                  </ThemedText>
                ) : null}
              </ScrollView>
            </View>

            {/* Colour */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.catModal.colour')}
            </ThemedText>
            <EvenGrid columns={7} rowGap={12}>
              {CATEGORY_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, color === c && { borderColor: colors.text }]}
                  accessibilityLabel={t('acct.add.colourA11y', { color: c })}
                />
              ))}
            </EvenGrid>

            {/* Subcategories */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.catModal.subcategories')}
            </ThemedText>
            {subs.length > 0 ? (
              <View style={styles.subWrap}>
                {subs.map((s) => (
                  <View key={s} style={[styles.subChip, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    <ThemedText type="small">{subcategoryName(s)}</ThemedText>
                    <Pressable
                      onPress={() => setSubs(subs.filter((x) => x !== s))}
                      hitSlop={8}
                      accessibilityLabel={t('acct.catModal.removeSubA11y', { name: subcategoryName(s) })}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.addSubRow}>
              <TextInput
                style={[styles.input, styles.flex, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                placeholder={t('acct.catModal.addSubPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={newSub}
                onChangeText={setNewSub}
                onSubmitEditing={addSub}
                returnKeyType="done"
                maxLength={24}
                blurOnSubmit={false}
              />
              <Pressable
                onPress={addSub}
                style={[styles.addSubButton, { backgroundColor: newSub.trim() ? colors.accent : colors.backgroundSelected }]}
                accessibilityLabel={t('acct.catModal.addSubA11y')}
              >
                <Ionicons name="add" size={22} color={newSub.trim() ? '#fff' : colors.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
              {t('acct.catModal.subNote')}
            </ThemedText>

            {/* Budget */}
            {kind === 'expense' ? (
              <>
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('acct.catModal.budget')}
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                  placeholder={t('acct.catModal.budgetPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={limit}
                  onChangeText={setLimit}
                  keyboardType="decimal-pad"
                />
                {!limitValid ? (
                  <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                    {t('acct.catModal.invalidAmount')}
                  </ThemedText>
                ) : null}
              </>
            ) : null}

            <Pressable
              style={[styles.saveButton, { backgroundColor: canSave ? colors.accent : colors.backgroundSelected }]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <ThemedText style={[styles.saveButtonText, !canSave && { color: colors.textSecondary }]}>
                {isEditing ? t('acct.catModal.saveChanges') : t('acct.catModal.submit')}
              </ThemedText>
            </Pressable>

            {isEditing && !isProtected ? (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('acct.catModal.delete')}</ThemedText>
              </Pressable>
            ) : null}
            {isProtected ? (
              <ThemedText type="small" style={[styles.helper, styles.protectedNote, { color: colors.textSecondary }]}>
                {t('acct.catModal.protectedNote')}
              </ThemedText>
            ) : null}
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
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  sheetTitle: { fontSize: 18 },

  preview: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: Spacing.three },
  previewName: { fontSize: 18, fontWeight: '700' },

  fieldLabel: { marginBottom: Spacing.one, marginTop: Spacing.three },
  helper: { marginTop: Spacing.one, fontSize: 12, lineHeight: 16 },
  protectedNote: { textAlign: 'center', marginBottom: Spacing.three },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
  },


  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    marginBottom: Spacing.two,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  iconBox: { borderRadius: 14, padding: 6 },
  iconScroll: { maxHeight: 216 },
  iconGrid: { paddingVertical: 4 },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },

  subWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.two },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addSubButton: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.four, marginBottom: Spacing.two },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteButton: { padding: 14, alignItems: 'center', marginBottom: Spacing.three },
});
