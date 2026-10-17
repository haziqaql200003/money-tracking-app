import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { CATEGORY_COLORS, type Category } from '@/constants/categories';
import { useCategories } from '@/context/CategoriesContext';
import type { TransactionType } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName, subcategoryName } from '@/i18n/data';

import { styles } from './styles';

type Props = {
  type: TransactionType;
  typeAccent: string;
  visibleCategories: Category[];
  selectedCategory: Category | undefined;
  categoryId: string;
  subcategory: string;
  setCategoryId: (id: string) => void;
  setSubcategory: (name: string) => void;
  pickCategory: (id: string) => void;
};

/** Category and subcategory chips, each with an inline "new" field (deleting stays in More > Categories). */
export function CategorySection({
  type,
  typeAccent,
  visibleCategories,
  selectedCategory,
  categoryId,
  subcategory,
  setCategoryId,
  setSubcategory,
  pickCategory,
}: Props) {
  const { t } = useT();
  const colors = useTheme();
  const { categories, addCategories, updateCategory } = useCategories();
  // null = closed; a string = the inline "new category / subcategory" field is open.
  const [newCat, setNewCat] = useState<string | null>(null);
  const [newSub, setNewSub] = useState<string | null>(null);

  function addCategoryInline() {
    const name = (newCat ?? '').trim();
    if (!name) return;
    const existing = visibleCategories.find((c) => categoryName(c).toLowerCase() === name.toLowerCase());
    if (existing) {
      pickCategory(existing.id);
    } else {
      const [id] = addCategories([
        {
          name,
          icon: type === 'credit' ? 'cash' : 'pricetag',
          color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
          kind: type === 'credit' ? 'income' : 'expense',
          subcategories: ['General'],
          monthlyLimit: 0,
        },
      ]);
      setCategoryId(id);
      setSubcategory('General');
    }
    setNewCat(null);
  }

  function addSubInline() {
    const name = (newSub ?? '').trim();
    if (!name || !selectedCategory) return;
    const existing = selectedCategory.subcategories.find((x) => subcategoryName(x).toLowerCase() === name.toLowerCase());
    if (existing) {
      setSubcategory(existing);
    } else {
      updateCategory(selectedCategory.id, { subcategories: [...selectedCategory.subcategories, name] });
      setSubcategory(name);
    }
    setNewSub(null);
  }

  return (
    <>
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
        <Pressable
          style={[styles.categoryChip, styles.newChip, { borderColor: colors.accent }]}
          onPress={() => setNewCat(newCat === null ? '' : null)}
          accessibilityRole="button"
        >
          <View style={styles.chipInner}>
            <Ionicons name="add" size={15} color={colors.accent} />
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              {t('tx.add.newChip')}
            </ThemedText>
          </View>
        </Pressable>
      </ScrollView>
      {newCat !== null ? (
        <View style={styles.inlineAdd}>
          <TextInput
            style={[styles.inlineInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            placeholder={t('tx.add.newCategoryPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={newCat}
            onChangeText={setNewCat}
            onSubmitEditing={addCategoryInline}
            returnKeyType="done"
            autoFocus
            maxLength={30}
          />
          <Pressable
            onPress={addCategoryInline}
            disabled={!newCat.trim()}
            style={[styles.inlineButton, { backgroundColor: newCat.trim() ? colors.accent : colors.backgroundSelected }]}
          >
            <ThemedText type="smallBold" style={{ color: newCat.trim() ? colors.onAccent : colors.textSecondary }}>
              {t('tx.add.addShort')}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* Subcategory */}
      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('tx.add.subcategory')}
      </ThemedText>
      <View style={styles.subGrid}>
        {selectedCategory?.subcategories.map((sub, si) => {
          const active = subcategory === sub;
          return (
            <Pressable
              key={`${sub}-${si}`}
              style={[
                styles.subChip,
                {
                  backgroundColor: active ? colors.backgroundSelected : colors.backgroundElement,
                  borderColor: active ? typeAccent : colors.divider,
                },
              ]}
              onPress={() => setSubcategory(sub)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <ThemedText type="small" numberOfLines={1} style={[styles.subChipText, { color: active ? colors.text : colors.textSecondary }]}>
                {subcategoryName(sub)}
              </ThemedText>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.subChip, styles.newChip, { borderColor: colors.accent }]}
          onPress={() => setNewSub(newSub === null ? '' : null)}
          accessibilityRole="button"
        >
          <ThemedText type="small" numberOfLines={1} style={[styles.subChipText, { color: colors.accent }]}>
            + {t('tx.add.newChip')}
          </ThemedText>
        </Pressable>
      </View>
      {newSub !== null ? (
        <View style={styles.inlineAdd}>
          <TextInput
            style={[styles.inlineInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            placeholder={t('tx.add.newSubPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={newSub}
            onChangeText={setNewSub}
            onSubmitEditing={addSubInline}
            returnKeyType="done"
            autoFocus
            maxLength={30}
          />
          <Pressable
            onPress={addSubInline}
            disabled={!newSub.trim()}
            style={[styles.inlineButton, { backgroundColor: newSub.trim() ? colors.accent : colors.backgroundSelected }]}
          >
            <ThemedText type="smallBold" style={{ color: newSub.trim() ? colors.onAccent : colors.textSecondary }}>
              {t('tx.add.addShort')}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}
