import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenSkeleton } from '@/components/ui/skeleton';
import { useIsDesktop } from '@/components/desktop/use-desktop';
import { AdjustmentsModal } from '@/components/transactions/adjustments-modal';
import { TransferModal } from '@/components/transactions/transfer-modal';
import { AddTransactionModal } from '@/components/transactions/add-transaction-modal';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { rowPosition, SwipeableTransactionRow } from '@/components/transactions/swipeable-transaction-row';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenTitle } from '@/components/ui/screen-title';
import { MonthSummary } from '@/components/transactions/transactions-summary';
import { AccountStrip, InOutCard, SummaryView, TypeTabs, type AccountShare, type StripItem } from '@/components/transactions/month-glance';
import { GlassSegmented } from '@/components/glass/glass-segmented';
import { useCategories } from '@/context/CategoriesContext';
import { toCsv } from '@/utils/csv';
import type { IconName } from '@/constants/categories';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { usePrivacy } from '@/context/PrivacyContext';
import type { Transaction, TransactionType, Transfer } from '@/context/TransactionsContext';
import { adjustmentAccountId, debtEntries, goalEntriesOnly, isAdjustmentEntry, isDebtEntry, isEditableTransferEntry, isLinkedEntry, savedEntries, savedTransferId } from '@/utils/saved';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName, accountName } from '@/i18n/data';
import { cycleOf } from '@/utils/cycle';
import { cycleRangeLabel, dayLabel, monthKeyFromOffset, monthLabel } from '@/utils/dates';
import { formatMoney } from '@/utils/currency';
import { MIN_COMPARE_BASE } from '@/utils/insights';
import { Alert } from '@/services/dialog';
import { shareTextFile } from '@/services/share-file';

type TypeFilter = 'all' | TransactionType | 'transfer';
type View_ = 'summary' | 'list';

const TYPE_FILTERS: { key: TypeFilter; labelKey: TKey }[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'debit', labelKey: 'tx.list.spending' },
  { key: 'credit', labelKey: 'common.income' },
];

const MASK = 'RM ••••';

const byDateDesc = (a: Transaction, b: Transaction) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

export default function TransactionsScreen() {
  const colors = useTheme();
  const { t, tp } = useT();
  const { transactions, transfers, accounts, selectableAccounts, accountBalance, ready } = useTransactions();
  const { hideAmounts, toggleHideAmounts } = usePrivacy();
  const desktop = useIsDesktop();
  const { openAddRecord } = useAddRecord();
  const { getCategory } = useCategories();

  const [monthOffset, setMonthOffset] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [type, setType] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [adjustmentsFor, setAdjustmentsFor] = useState<string | null>(null);
  // Phone: the month in numbers, or the list of records. Search opens from the icon on the title row.
  const [view, setView] = useState<View_>('list');
  const [searchOpen, setSearchOpen] = useState(false);

  const currentKey = monthKeyFromOffset(0);
  const monthKey = monthKeyFromOffset(monthOffset);
  const prevKey = monthKeyFromOffset(monthOffset - 1);

  // Don't let the user page back past the first month that has data.
  const earliestKey = useMemo(
    () => transactions.reduce((min, t) => (cycleOf(t.date) < min ? cycleOf(t.date) : min), currentKey),
    [transactions, currentKey],
  );
  const canPrev = monthKey > earliestKey;
  const canNext = monthOffset < 0;

  // Scope 1: selected account. Scope 2: + selected month. Both feed the summary.
  const inAccount = useMemo(
    () => transactions.filter((t) => !accountId || t.accountId === accountId),
    [transactions, accountId],
  );
  const monthTxns = useMemo(() => inAccount.filter((t) => cycleOf(t.date) === monthKey), [inAccount, monthKey]);

  // Savings transfers that count in the budget: listed with the records, but never part of income or spending.
  const monthSaved = useMemo(
    () =>
      savedEntries(
        transfers.filter((tr) => cycleOf(tr.date) === monthKey && (!accountId || tr.fromAccountId === accountId || tr.toAccountId === accountId)),
      ),
    [transfers, monthKey, accountId],
  );
  const monthDebt = useMemo(
    () =>
      debtEntries(
        transfers.filter((tr) => cycleOf(tr.date) === monthKey && (!accountId || tr.fromAccountId === accountId || tr.toAccountId === accountId)),
        new Set(accounts.filter((a) => a.hidden).map((a) => a.id)),
      ),
    [transfers, accounts, monthKey, accountId],
  );
  const monthGoal = useMemo(
    () =>
      goalEntriesOnly(
        transfers.filter((tr) => cycleOf(tr.date) === monthKey && (!accountId || tr.fromAccountId === accountId || tr.toAccountId === accountId)),
      ),
    [transfers, monthKey, accountId],
  );
  const savedTotal = [...monthSaved, ...monthGoal].reduce((sum, e) => sum + e.amount, 0);

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
      .filter((t) => t.type === 'debit' && cycleOf(t.date) === prevKey)
      .reduce((sum, t) => sum + t.amount, 0);
    const slices = Array.from(byCategory.entries())
      .map(([id, value]) => ({ categoryId: id, value, percent: spending > 0 ? (value / spending) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    const deltaPercent = prevSpending >= MIN_COMPARE_BASE ? ((spending - prevSpending) / prevSpending) * 100 : null;
    return { income, spending, slices, deltaPercent };
  }, [monthTxns, inAccount, prevKey]);

  // The list is further narrowed by type, category and search.
  const q = query.trim().toLowerCase();
  const linkedEntries = useMemo(() => [...monthSaved, ...monthGoal, ...monthDebt], [monthSaved, monthGoal, monthDebt]);
  const filtered = useMemo(
    () =>
      [...(type === 'transfer' ? [] : monthTxns), ...(type === 'all' || type === 'transfer' ? linkedEntries : [])]
        .filter((t) => {
          if (type !== 'all' && type !== 'transfer' && t.type !== type) return false;
          if (categoryId && t.categoryId !== categoryId) return false;
          if (q && !`${t.title} ${t.subcategory}`.toLowerCase().includes(q)) return false;
          return true;
        })
        .sort(byDateDesc),
    [monthTxns, linkedEntries, type, categoryId, q],
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
      net: data.reduce((sum, t) => (isLinkedEntry(t) ? sum : sum + (t.type === 'credit' ? t.amount : -t.amount)), 0),
      data,
    }));
  }, [filtered]);

  const filtersActive = type !== 'all' || !!categoryId || q.length > 0;

  // Phone header numbers: counts under the tabs, the round account buttons, and spending per account.
  const typeCounts = useMemo(
    () => ({
      all: monthTxns.length + linkedEntries.length,
      debit: monthTxns.filter((x) => x.type === 'debit').length,
      credit: monthTxns.filter((x) => x.type === 'credit').length,
      transfer: linkedEntries.length,
    }),
    [monthTxns, linkedEntries],
  );
  const stripItems: StripItem[] = [
    { id: null, label: t('common.all'), icon: 'apps', balance: selectableAccounts.reduce((sum, a) => sum + accountBalance(a.id), 0) },
    ...selectableAccounts.map((a) => ({ id: a.id, label: accountName(a), icon: a.icon, balance: accountBalance(a.id) })),
  ];
  const accountShares: AccountShare[] = useMemo(() => {
    const spent = new Map<string, number>();
    transactions.forEach((x) => {
      if (x.type === 'debit' && cycleOf(x.date) === monthKey) spent.set(x.accountId, (spent.get(x.accountId) ?? 0) + x.amount);
    });
    const total = Array.from(spent.values()).reduce((sum, v) => sum + v, 0);
    return selectableAccounts
      .filter((a) => (spent.get(a.id) ?? 0) > 0)
      .map((a) => ({ id: a.id, label: accountName(a), value: spent.get(a.id) ?? 0, percent: total > 0 ? ((spent.get(a.id) ?? 0) / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, selectableAccounts, monthKey]);

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
      (id) => {
        const acc = accounts.find((a) => a.id === id);
        return acc ? accountName(acc) : id;
      },
      (id) => {
        const cat = getCategory(id);
        return cat ? categoryName(cat) : id;
      },
    );
    await shareTextFile(`wakira-transactions-${monthKey}.csv`, csv); // i18n-ignore: file name
  }
  
  const accountOptions: { id: string | null; label: string; icon: IconName }[] = [
    { id: null, label: t('tx.list.allAccounts'), icon: 'apps' },
    ...selectableAccounts.map((a) => ({ id: a.id, label: accountName(a), icon: a.icon })),
  ];

  const titleBlock = (
    <>
      {/* Title */}
      <ScreenTitle
        title={t('tx.list.title')}
        right={<IconButton icon="share-outline" onPress={handleExport} disabled={monthTxns.length === 0} label={t('tx.list.exportA11y')} />}
      />

      {/* Month switcher */}
      <MonthSwitcher
        label={monthLabel(monthKey)}
        range={cycleRangeLabel(monthKey)}
        isCurrent={monthOffset === 0}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={() => goToMonth(monthOffset - 1)}
        onNext={() => goToMonth(monthOffset + 1)}
        onReset={() => goToMonth(0)}
      />
    </>
  );

  const summaryBlock = (
    <>
      <MonthSummary
        income={stats.income}
        spending={stats.spending}
        deltaPercent={stats.deltaPercent}
        prevLabel={monthLabel(prevKey, 'short')}
        hidden={hideAmounts}
        onToggleHidden={toggleHideAmounts}
        slices={stats.slices}
        total={stats.spending}
        selectedId={categoryId}
        onSelect={toggleCategory}
      />

      {savedTotal > 0 ? (
        <View style={[styles.savedRow, { backgroundColor: colors.backgroundElement }]}>
          <Ionicons name="wallet-outline" size={18} color={colors.accent} />
          <ThemedText type="small" style={styles.savedLabel}>
            {t('tx.saved.thisMonth')}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: colors.accent }}>
            {hideAmounts ? MASK : formatMoney(savedTotal)}
          </ThemedText>
        </View>
      ) : null}
    </>
  );

  const searchBlock = (
    <>
      {/* Search */}
      <View style={[styles.search, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('tx.list.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('tx.list.clearSearch')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Filters in one row: what kind, then which account */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
        keyboardShouldPersistTaps="handled"
      >
        {TYPE_FILTERS.map((f) => (
          <Chip key={f.key} size="sm" label={t(f.labelKey)} active={type === f.key} onPress={() => setType(f.key)} />
        ))}
        {selectableAccounts.length > 1 ? (
          <>
            <View style={[styles.chipDivider, { backgroundColor: colors.divider }]} />
            {accountOptions.map((opt) => (
              <Chip
                key={opt.id ?? 'all'}
                size="sm"
                icon={opt.icon}
                label={opt.label}
                active={accountId === opt.id}
                onPress={() => selectAccount(opt.id)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>


      {/* Result count */}
      <View style={styles.countRow}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {tp('tx.list.count', filtered.length)}
        </ThemedText>
        {filtersActive ? (
          <Pressable onPress={clearFilters} hitSlop={8}>
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              {t('tx.list.clearFilters')}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </>
  );

  // Wide web: the list on the left, the month's summary beside it instead of above it.
  const hasMonthData = monthTxns.length + linkedEntries.length > 0;
  const searchBox = (
    <View style={[styles.search, { backgroundColor: colors.backgroundElement }]}>
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder={t('tx.list.searchPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={query.length === 0}
      />
      <Pressable
        onPress={() => {
          setQuery('');
          setSearchOpen(false);
        }}
        hitSlop={8}
        accessibilityLabel={t('tx.list.clearSearch')}
      >
        <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );

  // Phone: account buttons, income / spending with the share used, then Summary | List.
  const phoneHeader = (
    <View>
      <ScreenTitle
        title={t('tx.list.title')}
        right={
          <View style={styles.titleActions}>
            <IconButton size={36} icon={hideAmounts ? 'eye-off-outline' : 'eye-outline'} onPress={toggleHideAmounts} label={hideAmounts ? t('home.summary.showAmounts') : t('home.summary.hideAmounts')} />
            <IconButton size={36} icon="search" onPress={() => setSearchOpen((v) => !v)} label={t('tx.list.searchA11y')} />
            <IconButton size={36} icon="share-outline" onPress={handleExport} disabled={monthTxns.length === 0} label={t('tx.list.exportA11y')} />
            <IconButton size={36} icon="add" onPress={openAddRecord} label={t('tx.list.addTransaction')} />
          </View>
        }
      />
      <MonthSwitcher
        label={monthLabel(monthKey)}
        range={cycleRangeLabel(monthKey)}
        isCurrent={monthOffset === 0}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={() => goToMonth(monthOffset - 1)}
        onNext={() => goToMonth(monthOffset + 1)}
        onReset={() => goToMonth(0)}
      />
      {selectableAccounts.length > 1 ? <AccountStrip items={stripItems} selectedId={accountId} onSelect={selectAccount} hidden={hideAmounts} /> : null}
      <InOutCard income={stats.income} spending={stats.spending} hidden={hideAmounts} />
      {savedTotal > 0 ? (
        <View style={[styles.savedRow, { backgroundColor: colors.backgroundElement }]}>
          <Ionicons name="wallet-outline" size={18} color={colors.accent} />
          <ThemedText type="small" style={styles.savedLabel}>
            {t('tx.saved.thisMonth')}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: colors.accent }}>
            {hideAmounts ? MASK : formatMoney(savedTotal)}
          </ThemedText>
        </View>
      ) : null}
      <View style={styles.viewToggle}>
        <GlassSegmented
          options={[
            { key: 'summary' as View_, label: t('tx.list.viewSummary') },
            { key: 'list' as View_, label: t('tx.list.viewList') },
          ]}
          value={view}
          onChange={setView}
        />
      </View>
      {searchOpen || query.length > 0 ? searchBox : null}
      {view === 'list' ? (
        <>
          <TypeTabs
            items={[
              { key: 'all' as TypeFilter, label: t('common.all'), count: typeCounts.all },
              { key: 'debit' as TypeFilter, label: t('tx.list.tabOut'), count: typeCounts.debit },
              { key: 'credit' as TypeFilter, label: t('tx.list.tabIn'), count: typeCounts.credit },
              { key: 'transfer' as TypeFilter, label: t('common.transfer'), count: typeCounts.transfer },
            ]}
            value={type}
            onChange={setType}
          />
          {filtersActive ? (
            <View style={styles.countRow}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {tp('tx.list.count', filtered.length)}
              </ThemedText>
              <Pressable onPress={clearFilters} hitSlop={8}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('tx.list.clearFilters')}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const header = desktop ? (
    <View>
      {titleBlock}
      {searchBlock}
    </View>
  ) : (
    phoneHeader
  );

  const summaryEl = (
    <SummaryView
      income={stats.income}
      spending={stats.spending}
      deltaPercent={stats.deltaPercent}
      prevLabel={monthLabel(prevKey, 'short')}
      slices={stats.slices}
      accountShares={accountShares}
      selectedCategory={categoryId}
      hidden={hideAmounts}
      onPickCategory={(id) => {
        setCategoryId(id);
        setType('debit');
        setView('list');
      }}
      onPickAccount={(id) => {
        selectAccount(id);
        setView('list');
      }}
    />
  );

  const empty = !ready ? (
    <ScreenSkeleton rows={8} />
  ) : monthTxns.length + monthSaved.length + monthGoal.length + monthDebt.length === 0 ? (
      <Card padding={0} style={styles.empty}>
        <EmptyState
          icon="receipt-outline"
          title={t('tx.list.emptyMonth', { month: monthLabel(monthKey) })}
          message={accountId ? t('tx.list.emptyAccount') : t('tx.list.emptyAll')}
          actionLabel={t('tx.list.addTransaction')}
          onAction={openAddRecord}
        />
      </Card>
    ) : (
      <Card padding={0} style={styles.empty}>
        <EmptyState
          icon="search-outline"
          title={t('tx.list.noMatches')}
          message={t('tx.list.noMatchesHint')}
          actionLabel={t('tx.list.clearFilters')}
          onAction={clearFilters}
        />
      </Card>
    );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={[styles.safeArea, desktop && styles.desktopSafe]} edges={['top', 'left', 'right']}>
        <View style={desktop ? styles.desktopRow : styles.flex}>
        <SectionList
          style={desktop ? styles.desktopList : undefined}
          sections={!desktop && view === 'summary' ? [] : sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index, section }) => (
            <SwipeableTransactionRow
              item={item}
              position={rowPosition(index, section.data.length)}
              showAccount={!accountId}
              hidden={hideAmounts}
              onOpen={() =>
                isAdjustmentEntry(item)
                  ? setAdjustmentsFor(adjustmentAccountId(item))
                  : isDebtEntry(item)
                  ? Alert.alert(t('debt.blocked.title'), t('debt.blocked.body'))
                  : isEditableTransferEntry(item)
                  ? setEditingTransfer(transfers.find((tr) => tr.id === savedTransferId(item)) ?? null)
                  : item.debtId || item.iouId
                    ? Alert.alert(t('debt.blocked.title'), t('debt.blocked.body'))
                    : setEditing(item)
              }
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <ThemedText type="small" style={{ color: colors.text, fontWeight: '700' }}>
                {dayLabel(section.title)}
                <ThemedText type="small" style={{ color: colors.textSecondary, fontWeight: '500' }}>
                  {`  ·  ${tp('tx.list.count', section.data.length)}`}
                </ThemedText>
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: section.net < 0 ? colors.negative : colors.positive, fontWeight: '600', ...tabularNums }}
              >
                {hideAmounts
                  ? MASK
                  : formatMoney(section.net, { signed: true, type: section.net < 0 ? 'debit' : 'credit' })}
              </ThemedText>
            </View>
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={!desktop && view === 'summary' && hasMonthData ? summaryEl : empty}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
        {desktop ? (
          <ScrollView style={styles.desktopSide} contentContainerStyle={styles.desktopSideContent} showsVerticalScrollIndicator={false}>
            {summaryBlock}
          </ScrollView>
        ) : null}
        </View>

        <AdjustmentsModal visible={!!adjustmentsFor} onClose={() => setAdjustmentsFor(null)} accountId={adjustmentsFor} />
        <TransferModal visible={!!editingTransfer} onClose={() => setEditingTransfer(null)} editing={editingTransfer} />

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
  titleActions: { flexDirection: 'row', gap: 6 },
  viewToggle: { marginBottom: Spacing.three },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.three, borderRadius: Radius.md, marginBottom: Spacing.three },
  savedLabel: { flex: 1 },
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  desktopSafe: { paddingHorizontal: Spacing.five, paddingTop: Spacing.three },
  desktopRow: { flex: 1, flexDirection: 'row', gap: Spacing.four },
  desktopList: { flex: 1, minWidth: 0 },
  desktopSide: { width: 380, flexGrow: 0 },
  desktopSideContent: { paddingTop: 76, paddingBottom: Spacing.five },
  listContent: { paddingBottom: 120 },


  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  monthCenter: { alignItems: 'center' },
  monthLabel: { fontSize: FontSize.body, fontWeight: '700' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    marginBottom: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: FontSize.body, paddingVertical: 0 },


  chipScroll: { marginHorizontal: -Spacing.four, flexGrow: 0, marginBottom: Spacing.three },
  chipRow: { paddingHorizontal: Spacing.four, gap: Spacing.two, alignItems: 'center' },
  chipDivider: { width: StyleSheet.hairlineWidth, height: 22, marginHorizontal: 2 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.three, paddingBottom: Spacing.two, paddingHorizontal: Spacing.one },
  empty: { marginTop: Spacing.three },
});
