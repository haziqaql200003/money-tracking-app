import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassSegmented } from '@/components/glass/glass-segmented';
import { ThemedText } from '@/components/ui/themed-text';
import { rowPosition, SwipeableTransactionRow } from '@/components/transactions/swipeable-transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing, tabularNums } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { AddTransactionModal } from '@/components/transactions/add-transaction-modal';
import type { Transaction, Transfer } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { AdjustmentsModal } from '@/components/transactions/adjustments-modal';
import { TransferModal } from '@/components/transactions/transfer-modal';
import { Alert } from '@/services/dialog';
import {
  adjustmentAccountId,
  allTransferEntries,
  isAdjustmentEntry,
  isDebtEntry,
  isEditableTransferEntry,
  isLinkedEntry,
  savedTransferId,
} from '@/utils/saved';
import { useLedger } from '@/hooks/use-ledger';
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

const MAX_ROWS = 5;
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
  const { transactions, transfers, accounts } = useTransactions();
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  // The "spent this month" line counts like Analyse; the list itself still shows every record.
  const { entries } = useLedger();
  const { openAddRecord } = useAddRecord();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [adjustmentsFor, setAdjustmentsFor] = useState<string | null>(null);

  // Everything for the selected account, newest first.
  const accountTxns = useMemo(
    () =>
      transactions
        .filter((t) => !accountId || t.accountId === accountId)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [transactions, accountId],
  );

  // Summary line (not affected by the chip filter): how many records this month, and spending as Analyse counts it
  // (refunds lower it; balance corrections and card, loan or savings payments are not spending).
  const summary = useMemo(() => {
    const monthKey = cycleOf(toKey(new Date()));
    const count = accountTxns.filter((t) => cycleOf(t.date) === monthKey).length;
    const spent = entries
      .filter((t) => t.type === 'debit' && cycleOf(t.date) === monthKey && (!accountId || t.accountId === accountId))
      .reduce((sum, t) => sum + t.amount, 0);
    return { count, spent };
  }, [accountTxns, entries, accountId]);

  // Transfers between your own accounts are listed under "All" (3.9.0), so money moved from Maybank to Ryt shows up
  // on both sides. They never count in the day's net, income or spending.
  const transferRows = useMemo(() => {
    const hiddenIds = new Set(accounts.filter((a) => a.hidden).map((a) => a.id));
    return allTransferEntries(
      transfers.filter((tr) => !accountId || tr.fromAccountId === accountId || tr.toAccountId === accountId),
      hiddenIds,
    );
  }, [transfers, accounts, accountId]);

  const sections = useMemo(() => {
    const visible = (filter === 'all' ? [...accountTxns, ...transferRows] : accountTxns.filter((t) => t.type === filter))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, MAX_ROWS);
    const groups = new Map<string, typeof visible>();
    visible.forEach((t) => {
      const list = groups.get(t.date) ?? [];
      list.push(t);
      groups.set(t.date, list);
    });
    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      net: items.reduce((sum, t) => (isLinkedEntry(t) ? sum : sum + (t.type === 'credit' ? t.amount : -t.amount)), 0),
      onlyTransfers: items.every(isLinkedEntry),
      items,
    }));
  }, [accountTxns, transferRows, filter]);

  function open(item: Transaction) {
    if (isAdjustmentEntry(item)) return setAdjustmentsFor(adjustmentAccountId(item));
    if (isEditableTransferEntry(item)) return setEditingTransfer(transfers.find((tr) => tr.id === savedTransferId(item)) ?? null);
    if (isDebtEntry(item) || item.debtId || item.iouId) return Alert.alert(t('debt.blocked.title'), t('debt.blocked.body'));
    setEditing(item);
  }

  const heading = accountName ? t('home.recent.headingAccount', { name: accountName }) : t('home.recent.heading');
  const spentText = hideAmounts ? MASK : formatMoney(summary.spent);

  return (
    <View>
      <SectionHeader
        title={heading}
        subtitle={tp('home.recent.summary', summary.count, { spent: spentText })}
      />

      <View style={styles.filter}>
        <GlassSegmented
          options={FILTERS.map((f) => ({ key: f.key, label: t(f.labelKey) }))}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {sections.length === 0 ? (
        <Card padding={0}>
          <EmptyState
            icon="receipt-outline"
            title={
              filter === 'all'
                ? accountName
                  ? t('home.recent.emptyAccount', { name: accountName })
                  : t('home.recent.empty')
                : filter === 'debit'
                  ? t('home.recent.emptySpending')
                  : t('home.recent.emptyIncome')
            }
            actionLabel={t('home.recent.addTransaction')}
            onAction={openAddRecord}
          />
        </Card>
      ) : (
        sections.map((section) => (
          <View key={section.date}>
            <View style={styles.dayHeader}>
              <ThemedText type="small" style={{ color: colors.textSecondary, fontWeight: '600' }}>
                {dayLabel(section.date, t)}
              </ThemedText>
{section.onlyTransfers ? null : (
              <ThemedText
                type="small"
                style={{ color: section.net < 0 ? colors.negative : colors.positive, fontWeight: '600', ...tabularNums }}
              >
                {hideAmounts
                  ? MASK
                  : formatMoney(section.net, { signed: true, type: section.net < 0 ? 'debit' : 'credit' })}
              </ThemedText>
              )}
            </View>
            {section.items.map((item, i) => (
              <SwipeableTransactionRow
                key={item.id}
                item={item}
                showAccount={!accountId}
                hidden={hideAmounts}
                onOpen={() => open(item)}
                position={rowPosition(i, section.items.length)}
                viewAccountId={accountId ?? null}
              />
            ))}
          </View>
        ))
      )}
      {accountTxns.length > 0 ? (
        <Button
          variant="secondary"
          size="sm"
          icon="list-outline"
          label={t('common.seeAll')}
          onPress={() => router.push('/transactions')}
          style={styles.seeAll}
        />
      ) : null}
      <AddTransactionModal
        visible={!!editing}
        onClose={() => setEditing(null)}
        editingTransaction={editing}
      />
      <AdjustmentsModal visible={!!adjustmentsFor} onClose={() => setAdjustmentsFor(null)} accountId={adjustmentsFor} />
      <TransferModal visible={!!editingTransfer} onClose={() => setEditingTransfer(null)} editing={editingTransfer} />
    </View>
  );
}

const styles = StyleSheet.create({
  filter: { marginBottom: Spacing.one },
  seeAll: { marginTop: Spacing.three, alignSelf: 'stretch' },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
});
