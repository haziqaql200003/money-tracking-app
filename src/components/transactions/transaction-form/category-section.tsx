import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { EvenGrid } from '@/components/ui/even-grid';
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

/** How many category tiles show before "More": two rows of five, the last spot being "More". */
const FIRST = 9;

/**
 * Categories as a grid of icons (two rows, then "More"), and the subcategory as a dropdown under it.
 * Both have an inline "new" field; deleting stays in More > Categories.
 */
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
  const [showAll, setShowAll] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  // The chosen category always shows, even when it sits past the first rows.
  const selectedIndex = visibleCategories.findIndex((c) => c.id === categoryId);
  const collapsed = !showAll && visibleCategories.length > FIRST + 1;
  const shown = collapsed
    ? selectedIndex >= FIRST
      ? [...visibleCategories.slice(0, FIRST - 1), visibleCategories[selectedIndex]]
      : visibleCategories.slice(0, FIRST)
    : visibleCategories;

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
    setSubOpen(false);
  }

  const tile = (cat: Category) => {
    const active = categoryId === cat.id;
    return (
      <Pressable
        key={cat.id}
        onPress={() => {
          pickCategory(cat.id);
          setSubOpen(false);
        }}
        style={({ pressed }) => [styles.catTile, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={categoryName(cat)}
      >
        <View style={[styles.catIcon, { backgroundColor: `${cat.color}22`, borderColor: active ? typeAccent : 'transparent' }]}>
          <Ionicons name={cat.icon} size={22} color={cat.color} />
        </View>
        <ThemedText type="small" numberOfLines={1} style={[styles.catLabel, { color: active ? colors.text : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
          {categoryName(cat)}
        </ThemedText>
      </Pressable>
    );
  };

  const special = (key: string, icon: keyof typeof Ionicons.glyphMap, text: string, onPress: () => void) => (
    <Pressable key={key} onPress={onPress} style={({ pressed }) => [styles.catTile, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={text}>
      <View style={[styles.catIcon, { backgroundColor: colors.backgroundElement, borderColor: colors.divider, borderStyle: 'dashed' }]}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <ThemedText type="small" numberOfLines={1} style={[styles.catLabel, { color: colors.accent, fontWeight: '700' }]}>
        {text}
      </ThemedText>
    </Pressable>
  );

  const subs = selectedCategory?.subcategories ?? [];

  return (
    <>
      {/* Category */}
      <View style={[styles.labelRow, styles.fieldLabel]}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t('common.category')}
        </ThemedText>
        {visibleCategories.length > FIRST + 1 ? (
          <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={8} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
              {showAll ? t('tx.add.fewerCats') : t('tx.add.allCats', { count: visibleCategories.length })}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      <EvenGrid columns={5} rowGap={10}>
        {[
          ...shown.map(tile),
          collapsed
            ? special('more', 'grid-outline', t('tx.add.moreCats'), () => setShowAll(true))
            : special('new', 'add', t('tx.add.newChip'), () => setNewCat(newCat === null ? '' : null)),
        ]}
      </EvenGrid>
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

      {/* Subcategory, as a dropdown */}
      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('tx.add.subcategory')}
      </ThemedText>
      <Pressable
        onPress={() => setSubOpen((v) => !v)}
        style={[styles.selectRow, { backgroundColor: colors.backgroundElement, borderColor: subOpen ? typeAccent : colors.divider }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: subOpen }}
        accessibilityLabel={t('tx.add.subcategory')}
      >
        {selectedCategory ? <Ionicons name={selectedCategory.icon} size={18} color={selectedCategory.color} /> : null}
        <ThemedText style={[styles.flex, { fontWeight: '600' }]} numberOfLines={1}>
          {subcategory ? subcategoryName(subcategory) : t('tx.add.subNone')}
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {selectedCategory ? categoryName(selectedCategory) : ''}
        </ThemedText>
        <Ionicons name={subOpen ? 'chevron-up' : 'chevron-down'} size={18} color={typeAccent} />
      </Pressable>
      {subOpen ? (
        <View style={[styles.menu, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
          {subs.map((sub, si) => {
            const active = subcategory === sub;
            return (
              <Pressable
                key={`${sub}-${si}`}
                onPress={() => {
                  setSubcategory(sub);
                  setSubOpen(false);
                }}
                style={({ pressed }) => [styles.menuItem, active && { backgroundColor: colors.backgroundSelected }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <ThemedText style={[styles.flex, { fontWeight: active ? '700' : '500' }]} numberOfLines={1}>
                  {subcategoryName(sub)}
                </ThemedText>
                {active ? <Ionicons name="checkmark" size={18} color={typeAccent} /> : null}
              </Pressable>
            );
          })}
          {newSub === null ? (
            <Pressable onPress={() => setNewSub('')} style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Ionicons name="add" size={18} color={colors.accent} />
              <ThemedText style={[styles.flex, { color: colors.accent, fontWeight: '700' }]}>{t('tx.add.newSubShort')}</ThemedText>
            </Pressable>
          ) : (
            <View style={[styles.inlineAdd, styles.menuAdd]}>
              <TextInput
                style={[styles.inlineInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
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
          )}
        </View>
      ) : null}
    </>
  );
}
