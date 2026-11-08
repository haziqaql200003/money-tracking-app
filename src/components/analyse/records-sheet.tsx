import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

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
  /** Expense category to show; omit for every expense in the window. */
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
 */
export function RecordsSheet({ query, entries, onClose }: Props) {
  const { t, tp } = useT();
  const colors = useTheme();
  const { getCategory } = useCategories();
  const { accounts } = useTransactions();
  const { hideAmounts } = usePrivacy();
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
    if (!query) return { rows: [] as Transaction[], subs: [] as { name: string; total: number }[] };
    const { window: w, categoryId } = query;
    const rows = entries.filter(
      (x) => x.type === 'debit' && x.date >= w.from && x.date <= w.to && (categoryId ? x.categoryId === categoryId && x.amount > 0 : true),
    );
    const bySub = new Map<string, number>();
    for (const x of rows) {
      if (x.amount <= 0) continue;
      const name = x.subcategory?.trim() || '';
      bySub.set(name, (bySub.get(name) ?? 0) + x.amount);
    }
    const subs = [...bySub.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.amount - a.amount));
    return { rows, subs };
  }, [query, entries]);

  const shown = sub === null ? data.rows : data.rows.filter((x) => (x.subcategory?.trim() || '') === sub);
  const total = Math.round(shown.reduce((s, x) => s + x.amount, 0) * 100) / 100;
  const acctName = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? accountName(a) : '';
  };

  return (
    <Sheet visible={!!query} onClose={onClose} title={title}>
      {query ? (
        <View style={styles.body}>
          <View>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {rangeLabel(query.window)}
            </ThemedText>
            <ThemedText style={[styles.total, tabularNums]}>{money(total)}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {tp('plan.analyse.records.count', shown.length)}
            </ThemedText>
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
            <View style={[styles.list, { backgroundColor: colors.backgroundElement }]}>
              {shown.slice(0, MAX_ROWS).map((x, i) => {
                const c = getCategory(x.categoryId);
                const refund = isRefundEntry(x);
                const name = x.title.trim() || (x.subcategory ? subcategoryName(x.subcategory) : c ? categoryName(c) : '');
                return (
                  <View key={x.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                    <CategoryIcon icon={refund ? 'arrow-undo' : c?.icon ?? 'help-circle'} color={refund ? colors.positive : c?.color ?? '#8E8E93'} size={36} />
                    <View style={styles.flex}>
                      <ThemedText numberOfLines={1}>{name}</ThemedText>
                      <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                        {[dayLabel(x.date), refund ? t('plan.analyse.records.refund') : x.subcategory ? subcategoryName(x.subcategory) : '', acctName(x.accountId)].filter(Boolean).join(' · ')}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.amount, tabularNums, { color: refund ? colors.positive : colors.text }]}>
                      {refund ? `+${money(-x.amount)}` : money(x.amount)}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
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
  total: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  chips: { gap: Spacing.two, paddingVertical: 2 },
  list: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 2 },
  flex: { flex: 1 },
  amount: { fontWeight: '700' },
});
