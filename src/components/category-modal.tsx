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

import { CategoryIcon } from '@/components/category-icon';
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

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass a category to edit/delete it. Omit (or null) to create one. */
  editingCategory?: Category | null;
  /** Kind preselected when creating. */
  defaultKind?: CategoryKind;
};

export function CategoryModal({ visible, onClose, editingCategory, defaultKind = 'expense' }: Props) {
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
      setName(editingCategory.name);
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
    (c) => c.id !== editingCategory?.id && c.kind === kind && c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const limitNum = parseFloat(limit.replace(',', '.'));
  const limitValid = limit.trim() === '' || (Number.isFinite(limitNum) && limitNum >= 0);
  const canSave = trimmed.length > 0 && !duplicate && limitValid;

  const isProtected = !!editingCategory && PROTECTED_CATEGORY_IDS.includes(editingCategory.id);
  const usedBy = editingCategory ? transactions.filter((t) => t.categoryId === editingCategory.id).length : 0;

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
      name: trimmed,
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
    const fallbackName = categories.find((c) => c.id === fallbackId)?.name ?? 'Other';
    Alert.alert(
      'Delete category?',
      usedBy > 0
        ? `"${editingCategory.name}" will be deleted and its ${usedBy} transaction${usedBy === 1 ? '' : 's'} moved to "${fallbackName}".`
        : `"${editingCategory.name}" will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <ThemedView
          style={[
            styles.modalBox,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <View style={styles.sheetHeader}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {isEditing ? 'Edit category' : 'New category'}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                Cancel
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Preview */}
            <View style={[styles.preview, { backgroundColor: colors.backgroundElement }]}>
              <CategoryIcon icon={icon} color={color} size={56} />
              <View style={styles.flex}>
                <ThemedText style={styles.previewName} numberOfLines={1}>
                  {trimmed || 'Category name'}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {kind === 'income' ? 'Income' : 'Expense'} · {Math.max(subs.length, 1)} subcategor
                  {Math.max(subs.length, 1) === 1 ? 'y' : 'ies'}
                </ThemedText>
              </View>
            </View>

            {/* Name */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Name
            </ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
              placeholder="e.g. Health, Pets, Freelance"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={20}
            />
            {duplicate ? (
              <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                You already have a {kind} category with this name
              </ThemedText>
            ) : null}

            {/* Kind */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Type
            </ThemedText>
            <View style={[styles.segmentTrack, { backgroundColor: colors.backgroundElement }, isEditing && { opacity: 0.6 }]}>
              {(['expense', 'income'] as const).map((k) => (
                <Pressable
                  key={k}
                  disabled={isEditing}
                  style={[styles.segmentButton, kind === k && { backgroundColor: colors.background }]}
                  onPress={() => {
                    setKind(k);
                    if (k === 'income') setLimit('');
                  }}
                >
                  <ThemedText
                    type="small"
                    style={kind === k ? { fontWeight: '600' } : { color: colors.textSecondary }}
                  >
                    {k === 'expense' ? 'Expense' : 'Income'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {isEditing ? (
              <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
                Type can't be changed after creating, because existing transactions depend on it.
              </ThemedText>
            ) : null}

            {/* Icon */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Icon
            </ThemedText>
            <View style={[styles.search, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search icons (e.g. food, car, heart)"
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
                      accessibilityLabel={`Icon ${n}`}
                    >
                      <Ionicons name={n} size={22} color={active ? color : colors.textSecondary} />
                    </Pressable>
                  );
                })}
                {filteredIcons.length === 0 ? (
                  <ThemedText type="small" style={{ color: colors.textSecondary, padding: 8 }}>
                    No icons match "{iconQuery}"
                  </ThemedText>
                ) : null}
              </ScrollView>
            </View>

            {/* Colour */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Colour
            </ThemedText>
            <View style={styles.swatchRow}>
              {CATEGORY_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, color === c && { borderColor: colors.text }]}
                  accessibilityLabel={`Colour ${c}`}
                />
              ))}
            </View>

            {/* Subcategories */}
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Subcategories
            </ThemedText>
            {subs.length > 0 ? (
              <View style={styles.subWrap}>
                {subs.map((s) => (
                  <View key={s} style={[styles.subChip, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
                    <ThemedText type="small">{s}</ThemedText>
                    <Pressable
                      onPress={() => setSubs(subs.filter((x) => x !== s))}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${s}`}
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
                placeholder="Add a subcategory"
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
                accessibilityLabel="Add subcategory"
              >
                <Ionicons name="add" size={22} color={newSub.trim() ? '#fff' : colors.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
              Renaming or removing a subcategory won't change past transactions. They keep the old label.
            </ThemedText>

            {/* Budget */}
            {kind === 'expense' ? (
              <>
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Monthly budget (RM), optional
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                  placeholder="0.00 (no budget)"
                  placeholderTextColor={colors.textSecondary}
                  value={limit}
                  onChangeText={setLimit}
                  keyboardType="decimal-pad"
                />
                {!limitValid ? (
                  <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                    Enter a valid amount
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
                {isEditing ? 'Save changes' : 'Add category'}
              </ThemedText>
            </Pressable>

            {isEditing && !isProtected ? (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>Delete category</ThemedText>
              </Pressable>
            ) : null}
            {isProtected ? (
              <ThemedText type="small" style={[styles.helper, styles.protectedNote, { color: colors.textSecondary }]}>
                This is a default category, so it can't be deleted. Transactions from deleted categories are moved here.
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

  segmentTrack: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segmentButton: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },

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
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 4 },
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