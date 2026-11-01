import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { CategoryIcon } from '@/components/ui/category-icon';
import { CategoryModal } from '@/components/categories/category-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import type { Category, CategoryKind } from '@/constants/categories';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName, subcategoryName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';

const KINDS: { key: CategoryKind; labelKey: TKey }[] = [
  { key: 'expense', labelKey: 'common.expense' },
  { key: 'income', labelKey: 'common.income' },
];

export default function CategoriesScreen() {
  const { t } = useT();
  const colors = useTheme();
  const { expenseCategories, incomeCategories } = useCategories();

  const [kind, setKind] = useState<CategoryKind>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const all = kind === 'expense' ? expenseCategories : incomeCategories;
  // Search matches the category or any of its subcategories.
  const list = q ? all.filter((c) => categoryName(c).toLowerCase().includes(q) || c.subcategories.some((x) => subcategoryName(x).toLowerCase().includes(q))) : all;
  const subLine = (c: Category) => {
    const names = c.subcategories.map(subcategoryName);
    return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
  };

  function openAdd() {
    setEditing(null);
    setModalVisible(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setModalVisible(true);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader
            title={t('acct.categories.title')}
            right={
              <Pressable
                onPress={openAdd}
                hitSlop={8}
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel={t('acct.categories.addA11y')}
              >
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            }
          />

          <View style={{ marginBottom: Spacing.three }}>
            <GlassSegmented
              options={KINDS.map((k) => ({
                key: k.key,
                label: `${t(k.labelKey)} · ${k.key === 'expense' ? expenseCategories.length : incomeCategories.length}`,
              }))}
              value={kind}
              onChange={setKind}
            />
          </View>

          <View style={[styles.search, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('acct.categories.search')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              autoCorrect={false}
              accessibilityLabel={t('acct.categories.search')}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {list.length === 0 ? (
            <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary, marginBottom: Spacing.three }]}>
              {t('acct.categories.noMatch')}
            </ThemedText>
          ) : null}
          <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }, list.length === 0 && { display: 'none' }]}>
            {list.map((c, i) => (
              <Pressable
                key={c.id}
                onPress={() => openEdit(c)}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <CategoryIcon icon={c.icon} color={c.color} size={44} />
                <View style={styles.flex}>
                  <ThemedText numberOfLines={2} style={{ fontWeight: '600' }}>{categoryName(c)}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    {subLine(c)}
                  </ThemedText>
                </View>
                <View style={styles.right}>
                  {c.kind === 'expense' ? (
                    <View style={[styles.pill, { backgroundColor: c.monthlyLimit > 0 ? colors.accentSoft : colors.background }]}>
                      <ThemedText type="small" style={{ color: c.monthlyLimit > 0 ? colors.accent : colors.textSecondary, fontWeight: '700' }} numberOfLines={1}>
                        {c.monthlyLimit > 0 ? t('acct.categories.perMonth', { amount: formatMoney(c.monthlyLimit).replace(/\.00$/, '') }) : t('acct.categories.noBudget')}
                      </ThemedText>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={openAdd}
            style={[styles.addRow, { borderColor: colors.divider }]}
            accessibilityRole="button"
            accessibilityLabel={t('acct.categories.addA11y')}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              {kind === 'expense' ? t('acct.categories.addExpense') : t('acct.categories.addIncome')}
            </ThemedText>
          </Pressable>

          <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary }]}>
            {t('acct.categories.footnote')}
          </ThemedText>
        </ScrollView>

        <CategoryModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          editingCategory={editing}
          defaultKind={kind}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  flex: { flex: 1 },
  addButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },


  listCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  pill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, minHeight: 46, marginBottom: Spacing.three },
  searchInput: { flex: 1, fontSize: FontSize.body, paddingVertical: 10 },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  footnote: { textAlign: 'center', marginTop: Spacing.three, fontSize: FontSize.caption, lineHeight: 16 },
});
