import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { CategoryIcon } from '@/components/category-icon';
import { CategoryModal } from '@/components/category-modal';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Category, CategoryKind } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';

const KINDS: { key: CategoryKind; label: string }[] = [
  { key: 'expense', label: 'Expense' },
  { key: 'income', label: 'Income' },
];

export default function CategoriesScreen() {
  const colors = useTheme();
  const { expenseCategories, incomeCategories } = useCategories();

  const [kind, setKind] = useState<CategoryKind>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const list = kind === 'expense' ? expenseCategories : incomeCategories;

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
            title="Categories"
            right={
              <Pressable
                onPress={openAdd}
                hitSlop={8}
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel="Add category"
              >
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            }
          />

          <View style={{ marginBottom: Spacing.three }}>
            <GlassSegmented
              options={KINDS.map((k) => ({
                key: k.key,
                label: `${k.label} · ${k.key === 'expense' ? expenseCategories.length : incomeCategories.length}`,
              }))}
              value={kind}
              onChange={setKind}
            />
          </View>

          <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
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
                  <ThemedText numberOfLines={1}>{c.name}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    {c.subcategories.join(', ')}
                  </ThemedText>
                </View>
                <View style={styles.right}>
                  {c.kind === 'expense' ? (
                    <ThemedText type="small" style={{ color: c.monthlyLimit > 0 ? colors.text : colors.textSecondary, fontWeight: '600' }}>
                      {c.monthlyLimit > 0 ? `${formatMoney(c.monthlyLimit)}/mo` : 'No budget'}
                    </ThemedText>
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
            accessibilityLabel="Add category"
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              Add {kind} category
            </ThemedText>
          </Pressable>

          <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary }]}>
            Tap a category to change its icon, colour, subcategories or budget.
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
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },


  listCard: { borderRadius: 20, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  footnote: { textAlign: 'center', marginTop: Spacing.three, fontSize: 12, lineHeight: 16 },
});
