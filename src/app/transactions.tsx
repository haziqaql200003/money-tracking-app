import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddTransactionModal } from '@/components/add-transaction-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionRow } from '@/components/transaction-row';
import { CategoryBreakdown, SummaryCard } from '@/components/transactions-summary';
import { useCategories } from '@/context/CategoriesContext';
import { toCsv } from '@/utils/csv';
import { Spacing } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { usePrivacy } from '@/context/PrivacyContext';
import type { Transaction, TransactionType } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { dayLabel, monthKeyFromOffset, monthLabel } from '@/utils/dates';
import { formatMoney } from '@/utils/currency';

type TypeFilter = 'all' | TransactionType;

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'debit', label: 'Spending' },
  { key: 'credit', label: 'Income' },
];

const MASK = 'RM ••••';

const byDateDesc = (a: Transaction, b: Transaction) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

export default function TransactionsScreen() {
  const colors = useTheme();
  const { transactions, accounts } = useTransactions();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();
  const { openAddRecord } = useAddRecord();
  const { getCategory } = useCategories();

  const [monthOffset, setMonthOffset] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [type, setType] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const currentKey = monthKeyFromOffset(0);
  const monthKey = monthKeyFromOffset(monthOffset);
  const prevKey = monthKeyFromOffset(monthOffset - 1);

  // Don't let the user page back past the first month that has data.
  const earliestKey = useMemo(
    () => transactions.reduce((min, t) => (t.date.slice(0, 7) < min ? t.date.slice(0, 7) : min), currentKey),
    [transactions, currentKey],
  );
  const canPrev = monthKey > earliestKey;
  const canNext = monthOffset < 0;

  // Scope 1: selected account. Scope 2: + selected month. Both feed the summary.
  const inAccount = useMemo(
    () => transactions.filter((t) => !accountId || t.accountId === accountId),
    [transactions, accountId],
  );
  const monthTxns = useMemo(() => inAccount.filter((t) => t.date.startsWith(monthKey)), [inAccount, monthKey]);

  const stats = useMemo(() => {
    let income = 0;
    let spending = 0;
    const byCategory = new Map<string, number>();
    monthTxns.forEach((t) => {
      if (t.type === 'credit') {
        income += t.amount;
      } else {
        spending += t.amount;
        byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount);
      }
    });
    const prevSpending = inAccount
      .filter((t) => t.type === 'debit' && t.date.startsWith(prevKey))
      .reduce((sum, t) => sum + t.amount, 0);
    const slices = Array.from(byCategory.entries())
      .map(([id, value]) => ({ categoryId: id, value, percent: spending > 0 ? (value / spending) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    const deltaPercent = prevSpending > 0 ? ((spending - prevSpending) / prevSpending) * 100 : null;
    return { income, spending, slices, deltaPercent };
  }, [monthTxns, inAccount, prevKey]);

  // The list is further narrowed by type, category and search.
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      monthTxns
        .filter((t) => {
          if (type !== 'all' && t.type !== type) return false;
          if (categoryId && t.categoryId !== categoryId) return false;
          if (q && !`${t.title} ${t.subcategory}`.toLowerCase().includes(q)) return false;
          return true;
        })
        .sort(byDateDesc),
    [monthTxns, type, categoryId, q],
  );

  const sections = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    filtered.forEach((t) => {
      const list = groups.get(t.date) ?? [];
      list.push(t);
      groups.set(t.date, list);
    });
    return Array.from(groups.entries()).map(([date, data]) => ({
      title: date,
      net: data.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0),
      data,
    }));
  }, [filtered]);

  const filtersActive = type !== 'all' || !!categoryId || q.length > 0;

  function goToMonth(offset: number) {
    setMonthOffset(offset);
    setCategoryId(null); // the chosen category may not exist in the new month
  }

  function selectAccount(id: string | null) {
    setAccountId(id);
    setCategoryId(null);
  }

  function toggleCategory(id: string) {
    setCategoryId(categoryId === id ? null : id);
    if (type === 'credit') setType('debit'); // categories in the breakdown are spending only
  }

  function clearFilters() {
    setType('all');
    setCategoryId(null);
    setQuery('');
  }

  async function handleExport() {
    if (monthTxns.length === 0) return;
    const csv = toCsv(
      [...monthTxns].sort(byDateDesc),
      (id) => accounts.find((a) => a.id === id)?.name ?? id,
      (id) => getCategory(id)?.name ?? id,
    );
  }
  
  const accountOptions: { id: string | null; label: string }[] = [
    { id: null, label: 'All accounts' },
    ...accounts.map((a) => ({ id: a.id, label: `${a.icon} ${a.name}` })),
  ];

  const header = (
    <View>
      {/* Title */}
      <View style={styles.titleRow}>
        <ThemedText type="title" style={styles.heading}>
          Transactions
        </ThemedText>
        <Pressable
          onPress={handleExport}
          disabled={monthTxns.length === 0}
          hitSlop={8}
          style={[styles.iconButton, { backgroundColor: colors.backgroundElement, opacity: monthTxns.length ? 1 : 0.4 }]}
          accessibilityRole="button"
          accessibilityLabel="Export this month as CSV"
        >
          <Ionicons name="share-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Month switcher */}
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => goToMonth(monthOffset - 1)}
          disabled={!canPrev}
          hitSlop={8}
          style={[styles.iconButton, { backgroundColor: colors.backgroundElement, opacity: canPrev ? 1 : 0.35 }]}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>

        <Pressable style={styles.monthCenter} onPress={() => goToMonth(0)} disabled={monthOffset === 0}>
          <ThemedText style={styles.monthLabel}>{monthLabel(monthKey)}</ThemedText>
          {monthOffset !== 0 ? (
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              Back to this month
            </ThemedText>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => goToMonth(monthOffset + 1)}
          disabled={!canNext}
          hitSlop={8}
          style={[styles.iconButton, { backgroundColor: colors.backgroundElement, opacity: canNext ? 1 : 0.35 }]}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <SummaryCard
        income={stats.income}
        spending={stats.spending}
        deltaPercent={stats.deltaPercent}
        prevLabel={monthLabel(prevKey, 'short')}
        hidden={hideAmounts}
        onToggleHidden={toggleHideAmounts}
      />

      <CategoryBreakdown
        slices={stats.slices}
        total={stats.spending}
        selectedId={categoryId}
        onSelect={toggleCategory}
        hidden={hideAmounts}
      />

      {/* Search */}
      <View style={[styles.search, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search title or subcategory"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Type filter */}
      <View style={[styles.segmentTrack, { backgroundColor: colors.backgroundElement }]}>
        {TYPE_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.segmentButton, type === f.key && { backgroundColor: colors.background }]}
            onPress={() => setType(f.key)}
          >
            <ThemedText
              type="small"
              style={type === f.key ? { fontWeight: '600' } : { color: colors.textSecondary }}
            >
              {f.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Account filter (only useful with 2+ accounts) */}
      {accounts.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
          keyboardShouldPersistTaps="handled"
        >
          {accountOptions.map((opt) => {
            const active = accountId === opt.id;
            return (
              <Pressable
                key={opt.id ?? 'all'}
                onPress={() => selectAccount(opt.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.accent : colors.backgroundElement,
                    borderColor: active ? colors.accent : colors.divider,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={active ? { color: '#fff', fontWeight: '600' } : { color: colors.textSecondary }}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Result count */}
      <View style={styles.countRow}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {filtered.length} transaction{filtered.length === 1 ? '' : 's'}
        </ThemedText>
        {filtersActive ? (
          <Pressable onPress={clearFilters} hitSlop={8}>
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              Clear filters
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const empty =
    monthTxns.length === 0 ? (
      <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} />
        <ThemedText style={styles.emptyTitle}>Nothing in {monthLabel(monthKey)}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {accountId ? 'This account has no transactions this month.' : 'No transactions recorded this month.'}
        </ThemedText>
        <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={openAddRecord}>
          <ThemedText style={styles.emptyButtonText}>Add transaction</ThemedText>
        </Pressable>
      </View>
    ) : (
      <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="search-outline" size={32} color={colors.textSecondary} />
        <ThemedText style={styles.emptyTitle}>No matches</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Try a different search or filter.
        </ThemedText>
        <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={clearFilters}>
          <ThemedText style={styles.emptyButtonText}>Clear filters</ThemedText>
        </Pressable>
      </View>
    );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionRow
              item={item}
              showAccount={!accountId}
              hidden={hideAmounts}
              onPress={() => setEditing(item)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {dayLabel(section.title)}
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: section.net < 0 ? colors.negative : colors.positive, fontWeight: '600' }}
              >
                {hideAmounts
                  ? MASK
                  : formatMoney(section.net, { signed: true, type: section.net < 0 ? 'debit' : 'credit' })}
              </ThemedText>
            </View>
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />

        <AddTransactionModal
          visible={!!editing}
          onClose={() => setEditing(null)}
          editingTransaction={editing}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  listContent: { paddingBottom: 120 },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.three },
  heading: { fontSize: 34, lineHeight: 40 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  monthCenter: { alignItems: 'center' },
  monthLabel: { fontSize: 17, fontWeight: '700' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    marginBottom: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },

  segmentTrack: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: Spacing.three },
  segmentButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },

  chipScroll: { marginHorizontal: -Spacing.four, flexGrow: 0, marginBottom: Spacing.two },
  chipRow: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },

  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.three, paddingBottom: 6 },

  empty: { borderRadius: 16, padding: Spacing.four, alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: Spacing.two },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});