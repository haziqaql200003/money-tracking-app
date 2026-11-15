import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BigAmount } from '@/components/analyse/ui/big-amount';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Chip } from '@/components/ui/chip';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions, type Transaction } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName, categoryName, subcategoryName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { dayLabel } from '@/utils/dates';
import { rangeLabel } from '@/utils/faham-period';
import type { Window } from '@/utils/insights';
import { isRefundEntry } from '@/utils/ledger';

const MASK = 'RM ••••';
/** Long periods can hold thousands of records; the sheet lists the newest ones and says how many more there are. */
const MAX_ROWS = 200;

export type RecordsQuery = {
  /** Category to show (an expense or, since 3.8.1, an income category); omit for every expense in the window. */
  categoryId?: string;
  /** Start on this subcategory (stored name). */
  subcategory?: string;
  window: Window;
};

type Props = {
  query: RecordsQuery | null;
  /** Ledger entries (see utils/ledger.ts): the same records the totals on screen were made from. */
  entries: Transaction[];
  onClose: () => void;
};

/**
 * Faham's drill-down: from a category on Ringkasan to its subcategories and then to the records themselves.
 * Read-only. The total always matches the figure that was tapped, because it is made from the same ledger entries.
 * 3.8.1: records are grouped by day, refunds show as a minus that lowers the total, income categories work too,
 * and "Open in Transactions" leads on to the full list.
 */
export function RecordsSheet({ query, entries, onClose }: Props) {
  const { t, tp } = useT();
  const colors = useTheme();
  const { getCategory } = useCategories();
  const { accounts } = useTransactions();
  const { hideAmounts } = usePrivacy();
  const router = useRouter();
  const [sub, setSub] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<RecordsQuery | null>(null);

  // A new query starts on the subcategory it asked for.
  if (query !== openFor) {
    setOpenFor(query);
    setSub(query?.subcategory ?? null);
  }

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const category = query?.categoryId ? getCategory(query.categoryId) : undefined;
  const title = category ? categoryName(category) : t('plan.analyse.spending');

  const data = useMemo(() => {
    if (!query) return { rows: [] as Transaction[], subs: [] as { name: string; total: number }[], income: false };
    const { window: w, categoryId } = query;
    const inside = (x: Transaction) => x.date >= w.from && x.date <= w.to;
    // An income category lists its income records; anything else lists spending (refunds in it lower the total).
    const income = !!categoryId && entries.some((x) => inside(x) && x.categoryId === categoryId && x.type === 'credit');
    const rows = entries.filter((x) =>
      !inside(x) ? false : income ? x.type === 'credit' && x.categoryId === categoryId : x.type === 'debit' && (categoryId ? x.categoryId === categoryId : true),
    );
    const bySub = new Map<string, number>();
    for (const x of rows) {
      if (x.amount <= 0) continue;
      const name = x.subcategory?.trim() || '';
      bySub.set(name, (bySub.get(name) ?? 0) + x.amount);
    }
    const subs = [...bySub.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.amount - a.amount));
    return { rows, subs, income };
  }, [query, entries]);

  const shown = sub === null ? data.rows : data.rows.filter((x) => (x.subcategory?.trim() || '') === sub);
  const total = Math.round(shown.reduce((s, x) => s + x.amount, 0) * 100) / 100;
  // Records grouped by day, newest first (rows are already sorted that way).
  const days: { date: string; rows: Transaction[] }[] = [];
  for (const x of shown.slice(0, MAX_ROWS)) {
    const last = days[days.length - 1];
    if (last && last.date === x.date) last.rows.push(x);
    else days.push({ date: x.date, rows: [x] });
  }
  const acctName = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? accountName(a) : '';
  };

  return (
    <Sheet
      visible={!!query}
      onClose={onClose}
      title={title}
      footer={
        <Button
          label={t('plan.analyse.records.open')}
          variant="secondary"
          fullWidth
          onPress={() => {
            onClose();
            router.push('/transactions');
          }}
        />
      }
    >
      {query ? (
        <View style={styles.body}>
          <View style={styles.head}>
            {category ? <CategoryIcon icon={category.icon} color={category.color} size={44} /> : null}
            <View style={styles.flex}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {rangeLabel(query.window)}
              </ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {tp('plan.analyse.records.count', shown.length)}
              </ThemedText>
            </View>
            <BigAmount amount={total} size="card" color={data.income ? colors.positive : undefined} />
          </View>

          {data.subs.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip size="sm" label={t('plan.analyse.records.all')} active={sub === null} onPress={() => setSub(null)} />
              {data.subs.map((s) => (
                <Chip
                  key={s.name || '_'}
                  size="sm"
                  label={`${s.name ? subcategoryName(s.name) : t('plan.analyse.records.noSub')} · ${money(s.total)}`}
                  active={sub === s.name}
                  onPress={() => setSub(sub === s.name ? null : s.name)}
                />
              ))}
            </ScrollView>
          ) : null}

          {shown.length === 0 ? (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.analyse.records.none')}
            </ThemedText>
          ) : (
            days.map((d) => (
              <View key={d.date} style={styles.day}>
                <ThemedText type="small" style={[styles.dayHead, { color: colors.textSecondary }]}>
                  {dayLabel(d.date).toUpperCase()}
                </ThemedText>
                <View style={[styles.list, { backgroundColor: colors.backgroundElement }]}>
                  {d.rows.map((x, i) => {
                    const c = getCategory(x.categoryId);
                    const refund = isRefundEntry(x);
                    const name = x.title.trim() || (x.subcategory ? subcategoryName(x.subcategory) : c ? categoryName(c) : '');
                    return (
                      <View key={x.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                        <CategoryIcon icon={refund ? 'arrow-undo' : c?.icon ?? 'help-circle'} color={refund ? colors.positive : c?.color ?? '#8E8E93'} size={36} />
                        <View style={styles.flex}>
                          <ThemedText numberOfLines={1}>{name}</ThemedText>
                          <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                            {[refund ? t('plan.analyse.records.refundLowers') : x.subcategory ? subcategoryName(x.subcategory) : '', acctName(x.accountId)].filter(Boolean).join(' · ')}
                          </ThemedText>
                        </View>
                        <ThemedText style={[styles.amount, tabularNums, { color: refund || data.income ? colors.positive : colors.text }]}>
                          {refund ? `−${money(-x.amount)}` : money(x.amount)}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
          {shown.length > MAX_ROWS ? (
            <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              {t('plan.analyse.records.more', { n: shown.length - MAX_ROWS })}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  day: { gap: Spacing.one },
  dayHead: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5, paddingHorizontal: Spacing.one },
  chips: { gap: Spacing.two, paddingVertical: 2 },
  list: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 2 },
  flex: { flex: 1 },
  amount: { fontWeight: '700' },
});
