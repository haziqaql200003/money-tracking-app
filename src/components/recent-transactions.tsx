import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { ThemedText } from '@/components/themed-text';
import { SwipeableTransactionRow } from '@/components/swipeable-transaction-row';
import { Spacing } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { AddTransactionModal } from '@/components/add-transaction-modal';
import type { Transaction } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/currency';
import { useT, type TKey } from '@/i18n';
import { mondayIndex, monthShort, weekdayShort } from '@/i18n/format';
import { cycleOf } from '@/utils/cycle';


type Filter = 'all' | 'debit' | 'credit';

const FILTERS: { key: Filter; labelKey: TKey }[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'debit', labelKey: 'home.recent.filterSpending' },
  { key: 'credit', labelKey: 'common.income' },
];

const MAX_ROWS = 15;
const MASK = 'RM ••••';

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLabel(iso: string, t: ReturnType<typeof useT>['t']) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (iso === toKey(now)) return t('common.today');
  if (iso === toKey(yesterday)) return t('common.yesterday');
  const [y, m, d] = iso.split('-').map(Number);
  return `${weekdayShort(mondayIndex(new Date(y, m - 1, d)))}, ${d} ${monthShort(m - 1)}`;
}

type Props = {
  /** Limit to one account (omit for all accounts). */
  accountId?: string;
  accountName?: string;
};

export function RecentTransactions({ accountId, accountName }: Props) {
  const { t, tp } = useT();
  const colors = useTheme();
  const router = useRouter();
  const { hideAmounts } = usePrivacy();
  const { transactions } = useTransactions();
  const { openAddRecord } = useAddRecord();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);

  // Everything for the selected account, newest first.
  const accountTxns = useMemo(
    () =>
      transactions
        .filter((t) => !accountId || t.accountId === accountId)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions, accountId],
  );

  // Summary line (not affected by the chip filter).
  const summary = useMemo(() => {
    const monthKey = cycleOf(toKey(new Date()));
    let count = 0;
    let spent = 0;
    accountTxns.forEach((t) => {
      if (cycleOf(t.date) !== monthKey) return;
      count += 1;
      if (t.type === 'debit') spent += t.amount;
    });
    return { count, spent };
  }, [accountTxns]);

  const sections = useMemo(() => {
    const visible = accountTxns.filter((t) => filter === 'all' || t.type === filter).slice(0, MAX_ROWS);
    const groups = new Map<string, typeof visible>();
    visible.forEach((t) => {
      const list = groups.get(t.date) ?? [];
      list.push(t);
      groups.set(t.date, list);
    });
    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      net: items.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0),
      items,
    }));
  }, [accountTxns, filter]);

  const heading = accountName ? t('home.recent.headingAccount', { name: accountName }) : t('home.recent.heading');
  const spentText = hideAmounts ? MASK : formatMoney(summary.spent);

  return (
    <View>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold" style={styles.heading} numberOfLines={1}>
          {heading}
        </ThemedText>
        <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
            {t('common.seeAll')}
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
        {tp('home.recent.summary', summary.count, { spent: spentText })}
      </ThemedText>

      <View style={{ marginBottom: Spacing.two }}>
        <GlassSegmented
          options={FILTERS.map((f) => ({ key: f.key, label: t(f.labelKey) }))}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {sections.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {filter === 'all'
              ? accountName
                ? t('home.recent.emptyAccount', { name: accountName })
                : t('home.recent.empty')
              : filter === 'debit'
                ? t('home.recent.emptySpending')
                : t('home.recent.emptyIncome')}
          </ThemedText>
          <Pressable style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={openAddRecord}>
            <ThemedText style={styles.emptyButtonText}>{t('home.recent.addTransaction')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        sections.map((section) => (
          <View key={section.date}>
            <View style={styles.dayHeader}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {dayLabel(section.date, t)}
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
            {section.items.map((item) => (
              <SwipeableTransactionRow
                key={item.id}
                item={item}
                showAccount={!accountId}
                hidden={hideAmounts}
                onOpen={() => setEditing(item)}
              />
            ))}
          </View>
        ))
      )}
      <AddTransactionModal
        visible={!!editing}
        onClose={() => setEditing(null)}
        editingTransaction={editing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  heading: { fontSize: 16, flexShrink: 1 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    paddingBottom: 2,
  },
  empty: { borderRadius: 16, padding: Spacing.four, alignItems: 'center', gap: Spacing.three },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyButtonText: { color: '#fff', fontWeight: '700' },
});
