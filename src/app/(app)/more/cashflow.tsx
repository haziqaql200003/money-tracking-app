import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthSwitcher } from '@/components/ui/month-switcher';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Card } from '@/components/ui/card';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useDebts } from '@/context/DebtsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTools } from '@/context/ToolsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { formatDate, mondayIndex, weekdayShort } from '@/i18n/format';
import { buildCashflow, plannedItems, spendableFlows, type CashDay, type PlannedKind } from '@/utils/cashflow';
import { cycleOf, cycleRange, paydayIn, shiftCycle } from '@/utils/cycle';
import { formatMoney } from '@/utils/currency';
import { cycleRangeLabel, monthLabel, toDateKey } from '@/utils/dates';
import { looksLikeSavings } from '@/utils/saved';

const MASK = 'RM ••••';
const MAX_AHEAD = 6;
const KIND_KEY: Record<PlannedKind, TKey> = { bill: 'cal.kind.bill', income: 'cal.kind.income', debt: 'cal.kind.debt', iou: 'cal.kind.iou', salary: 'cal.kind.salary' };
const KIND_ICON: Record<PlannedKind, keyof typeof Ionicons.glyphMap> = { bill: 'receipt-outline', income: 'arrow-down-circle-outline', debt: 'card-outline', iou: 'people-outline', salary: 'cash-outline' };

const dateOf = (iso: string) => new Date(`${iso}T00:00:00`);

export default function CashflowScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { transactions, transfers, accounts, recurringRules, accountBalance } = useTransactions();
  const { debts, ious } = useDebts();
  const { plans } = useTools();
  const todayKey = toDateKey(new Date());
  const currentKey = cycleOf(todayKey);
  const [monthKey, setMonthKey] = useState(currentKey);
  const [picked, setPicked] = useState<string | null>(null);
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const muted = { color: colors.textSecondary };

  const earliestKey = useMemo(() => transactions.reduce((min, x) => (cycleOf(x.date) < min ? cycleOf(x.date) : min), currentKey), [transactions, currentKey]);
  const lastKey = shiftCycle(currentKey, MAX_AHEAD);
  const range = cycleRange(monthKey);

  const flow = useMemo(() => {
    const spendable = accounts.filter((a) => !a.hidden && !a.debtId && !a.creditLimit && !looksLikeSavings(a));
    const ids = new Set(spendable.map((a) => a.id));
    const balanceNow = spendable.reduce((s, a) => s + accountBalance(a.id), 0);
    const flows = spendableFlows(transactions, transfers, ids);
    // Pay days from this month on, up to the end of the month being viewed.
    const paydays: { date: string; amount: number }[] = [];
    const [ty, tm] = todayKey.split('-').map(Number);
    const [ey, em] = range.to.split('-').map(Number);
    for (let y = ty, m = tm; y < ey || (y === ey && m <= em + 1); m === 12 ? ((y += 1), (m = 1)) : (m += 1)) {
      const d = paydayIn(y, m).date;
      paydays.push({ date: d, amount: plans[cycleOf(d)]?.income ?? 0 });
    }
    const planned = plannedItems({ to: range.to, todayKey, rules: recurringRules, debts, ious, paydays });
    return { balanceNow, cf: buildCashflow({ from: range.from, to: range.to, todayKey, balanceNow, flows, planned }) };
  }, [accounts, accountBalance, transactions, transfers, recurringRules, debts, ious, plans, range.from, range.to, todayKey]);

  const { cf } = flow;
  const isCurrent = monthKey === currentKey;
  const selected = picked && cf.days.some((d) => d.date === picked) ? picked : isCurrent ? todayKey : cf.days[0]?.date ?? null;
  const day = cf.days.find((d) => d.date === selected) ?? null;
  const lead = cf.days.length ? mondayIndex(dateOf(cf.days[0].date)) : 0;
  const cells: (CashDay | null)[] = [...Array(lead).fill(null), ...cf.days];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const futureEnd = monthKey >= currentKey;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('cal.title')} />
          <MonthSwitcher
            label={monthLabel(monthKey)}
            range={cycleRangeLabel(monthKey)}
            isCurrent={isCurrent}
            canPrev={monthKey > earliestKey}
            canNext={monthKey < lastKey}
            onPrev={() => setMonthKey(shiftCycle(monthKey, -1))}
            onNext={() => setMonthKey(shiftCycle(monthKey, 1))}
            onReset={() => setMonthKey(currentKey)}
          />

          <Card style={styles.gap}>
            <ThemedText type="small" style={muted}>{t('cal.balance.now')}</ThemedText>
            <ThemedText style={Type.largeTitle}>{money(flow.balanceNow)}</ThemedText>
            <View style={styles.two}>
              <View style={styles.flex}>
                <ThemedText type="small" style={muted}>{t('cal.summary.in')}</ThemedText>
                <ThemedText type="smallBold" style={{ color: colors.positive }}>{money(cf.actualIn)}</ThemedText>
              </View>
              <View style={styles.flex}>
                <ThemedText type="small" style={muted}>{t('cal.summary.out')}</ThemedText>
                <ThemedText type="smallBold" style={{ color: colors.negative }}>{money(cf.actualOut)}</ThemedText>
              </View>
            </View>
            {futureEnd && (cf.plannedIn > 0 || cf.plannedOut > 0) ? (
              <ThemedText type="small" style={muted}>{t('cal.summary.expected', { in: money(cf.plannedIn), out: money(cf.plannedOut) })}</ThemedText>
            ) : null}
            {futureEnd ? (
              cf.firstNegative ? (
                <View style={[styles.banner, { backgroundColor: colors.negative + '18' }]}>
                  <Ionicons name="warning-outline" size={18} color={colors.negative} />
                  <ThemedText type="small" style={[styles.flex, { color: colors.negative }]}>{t('cal.warn', { date: formatDate(dateOf(cf.firstNegative)) })}</ThemedText>
                </View>
              ) : (
                <View style={[styles.banner, { backgroundColor: colors.positive + '18' }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.positive} />
                  <ThemedText type="small" style={[styles.flex, { color: colors.positive }]}>{t('cal.ok')}</ThemedText>
                </View>
              )
            ) : null}
            {futureEnd && cf.lowest ? <ThemedText type="small" style={muted}>{t('cal.lowest', { amount: money(cf.lowest.balance), date: formatDate(dateOf(cf.lowest.date)) })}</ThemedText> : null}
          </Card>

          <Card style={[styles.mt, styles.gap]}>
            <View style={styles.weekRow}>
              {Array.from({ length: 7 }, (_, i) => (
                <ThemedText key={i} type="small" style={[styles.weekCell, muted]}>{weekdayShort(i)}</ThemedText>
              ))}
            </View>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.weekRow}>
                {row.map((c, ci) => {
                  if (!c) return <View key={ci} style={styles.cell} />;
                  const on = c.date === selected;
                  const neg = !c.isPast && c.balance < 0;
                  return (
                    <Pressable
                      key={ci}
                      onPress={() => setPicked(c.date)}
                      style={[styles.cell, styles.cellBox, { backgroundColor: on ? colors.accentSoft : 'transparent', borderColor: c.isToday ? colors.accent : neg ? colors.negative : 'transparent' }]}
                    >
                      <ThemedText type="small" style={{ fontWeight: c.isToday ? '800' : '500', color: c.isPast && !c.isToday ? colors.textSecondary : colors.text }}>{Number(c.date.slice(8))}</ThemedText>
                      <View style={styles.dots}>
                        {c.actualIn > 0 ? <View style={[styles.dot, { backgroundColor: colors.positive }]} /> : null}
                        {c.actualOut > 0 ? <View style={[styles.dot, { backgroundColor: colors.negative }]} /> : null}
                        {c.plannedIn > 0 || c.planned.some((p) => p.varies && p.direction === 'in') ? <View style={[styles.dot, styles.ring, { borderColor: colors.positive }]} /> : null}
                        {c.plannedOut > 0 || c.planned.some((p) => p.varies && p.direction === 'out') ? <View style={[styles.dot, styles.ring, { borderColor: colors.negative }]} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <View style={styles.legend}>
              <Legend color={colors.positive} label={t('cal.legend.in')} />
              <Legend color={colors.negative} label={t('cal.legend.out')} />
              <Legend color={colors.textSecondary} label={t('cal.legend.planned')} ring />
            </View>
          </Card>

          {day ? (
            <Card style={[styles.mt, styles.gap]}>
              <ThemedText style={Type.heading}>{formatDate(dateOf(day.date), 'long')}{day.isToday ? ` · ${t('cal.today')}` : ''}</ThemedText>
              {day.actual.length === 0 && day.planned.length === 0 ? <ThemedText type="small" style={muted}>{t('cal.day.empty')}</ThemedText> : null}
              {day.actual.length ? <ThemedText type="small" style={muted}>{t('cal.day.happened')}</ThemedText> : null}
              {day.actual.map((a) => (
                <View key={a.id} style={styles.line}>
                  <ThemedText type="small" style={styles.flex} numberOfLines={1}>{a.title}</ThemedText>
                  <ThemedText type="smallBold" style={{ color: a.amount >= 0 ? colors.positive : colors.negative }}>{a.amount >= 0 ? '+' : '-'}{money(Math.abs(a.amount))}</ThemedText>
                </View>
              ))}
              {day.planned.length ? <ThemedText type="small" style={muted}>{t('cal.day.expected')}</ThemedText> : null}
              {day.planned.map((p) => (
                <View key={p.id} style={styles.line}>
                  <Ionicons name={KIND_ICON[p.kind]} size={16} color={colors.textSecondary} />
                  <View style={styles.flex}>
                    <ThemedText type="small" numberOfLines={1}>{p.title || t(KIND_KEY[p.kind])}</ThemedText>
                    <ThemedText type="small" style={[muted, { fontSize: 12 }]}>
                      {t(KIND_KEY[p.kind])}
                      {p.overdue ? ` · ${t('cal.overdue')}` : ''}
                      {p.varies ? ` · ${p.kind === 'salary' ? t('cal.salary.setAmount') : t('cal.varies')}` : ''}
                    </ThemedText>
                  </View>
                  {p.amount > 0 ? <ThemedText type="smallBold" style={{ color: p.direction === 'in' ? colors.positive : colors.negative }}>{p.direction === 'in' ? '+' : '-'}{money(p.amount)}</ThemedText> : null}
                </View>
              ))}
              <View style={[styles.line, styles.balanceLine, { borderTopColor: colors.divider }]}>
                <ThemedText type="small" style={[styles.flex, muted]}>{t('cal.day.balance')}</ThemedText>
                <ThemedText type="smallBold" style={{ color: day.balance < 0 ? colors.negative : colors.text }}>{money(day.balance)}</ThemedText>
              </View>
            </Card>
          ) : null}

          <ThemedText type="small" style={[muted, styles.mt]}>{t('cal.balance.note')}</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Legend({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, ring ? [styles.ring, { borderColor: color }] : { backgroundColor: color }]} />
      <ThemedText type="small" style={{ color }}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  gap: { gap: Spacing.two },
  mt: { marginTop: Spacing.three },
  flex: { flex: 1 },
  two: { flexDirection: 'row', gap: Spacing.three },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.two, borderRadius: Radius.md },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, height: 54 },
  cellBox: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1.5, gap: 2 },
  dots: { flexDirection: 'row', gap: 2, height: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  ring: { borderWidth: 1.5, width: 7, height: 7, borderRadius: 4 },
  legend: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap', marginTop: Spacing.one },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceLine: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, marginTop: Spacing.one },
});
