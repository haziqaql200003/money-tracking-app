import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatCompact, formatMoney } from '@/utils/currency';
import { monthLabel } from '@/utils/dates';
import { buildOutlook, forecastSeries, monthlySums, savingFlows, savingsRate, runwayMonths, type Band } from '@/utils/forecast';
import { goalMonthSaved, goalProjection, goalSaved, activeGoals } from '@/utils/goals';
import { monthKeysEnding } from '@/utils/insights';
import { isEnded, isTransfer, monthlyEquivalent } from '@/utils/recurring';
import { looksLikeSavings } from '@/utils/saved';
import { cycleOf } from '@/utils/cycle';

const MASK = 'RM ••••';
const HORIZON = 3;

function shiftMonth(key: string, by: number) {
  const [y, m] = key.slice(0, 7).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}
function nextKeys(todayKey: string, n: number) {
  return Array.from({ length: n }, (_, i) => shiftMonth(todayKey, i + 1));
}
const HIST = 6;

type Props = { months: number; todayKey: string };

/** The "Forecast" tab of Faham: this month so far, the next months for spending, income and saving, and goals. */
export function AnalyseForecast({ months, todayKey }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { transactions, transfers, accounts, recurringRules, accountBalance } = useTransactions();
  const { goals, goalEntries } = usePlan();
  const { hideAmounts } = usePrivacy();

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const compact = (n: number) => (hideAmounts ? '••' : formatCompact(n));
  const monthKey = cycleOf(todayKey);

  const d = useMemo(() => {
    const span = Math.max(months, 6);
    const past = monthKeysEnding(todayKey, span + 1).slice(0, -1); // complete months only
    const everyday = monthlySums(
      transactions.filter((x) => x.type === 'debit' && !x.recurringId).map((x) => ({ date: x.date, amount: x.amount })),
      past,
    );
    const income = monthlySums(transactions.filter((x) => x.type === 'credit').map((x) => ({ date: x.date, amount: x.amount })), past);
    const savingIds = new Set(accounts.filter((a) => looksLikeSavings(a)).map((a) => a.id));
    const flows = savingFlows(transfers, (id) => savingIds.has(id));
    const saving = monthlySums(flows, past);
    const fixedMonthly = recurringRules
      .filter((r) => r.active && !isEnded(r) && !isTransfer(r) && r.type === 'debit')
      .reduce((s, r) => s + monthlyEquivalent(r), 0);
    const outlook = buildOutlook({ everydayHistory: everyday, incomeHistory: income, savingHistory: saving, fixedMonthly, horizon: HORIZON + 1 });

    let spent = 0;
    let earned = 0;
    for (const x of transactions) {
      if (cycleOf(x.date) !== monthKey || x.date > todayKey) continue;
      if (x.type === 'debit') spent += x.amount;
      else earned += x.amount;
    }
    const savedNow = monthlySums(flows, [monthKey])[0] ?? 0;
    const planned = goals.filter((g) => !g.paused).reduce((s, g) => s + (g.monthly ?? 0), 0);

    const balance = accounts.filter((a) => !a.hidden && savingIds.has(a.id)).reduce((s, a) => s + accountBalance(a.id), 0);
    const spendAll = monthlySums(transactions.filter((x) => x.type === 'debit').map((x) => ({ date: x.date, amount: x.amount })), past);
    const flowsAll = flows;
    const totalSaved = saving.reduce((s, v) => s + v, 0);
    const totalIncome = income.reduce((s, v) => s + v, 0);
    const avgSpend = outlook.expense.average;
    return {
      past,
      spendAll,
      flowsAll,
      outlook,
      saving,
      spent,
      earned,
      savedNow,
      planned,
      balance,
      rate: savingsRate(totalSaved, totalIncome),
      runway: runwayMonths(balance, avgSpend),
      fixedMonthly,
      monthsUsed: outlook.expense.monthsUsed,
    };
  }, [transactions, transfers, accounts, recurringRules, goals, months, todayKey, monthKey, accountBalance]);

  const goalRows = useMemo(
    () =>
      activeGoals(goals, goalEntries).map((g) => {
        const p = goalProjection(g, goalEntries, todayKey);
        const remaining = Math.max(0, g.target - goalSaved(goalEntries, g.id));
        let need: number | null = null;
        if (g.deadline && remaining > 0) {
          const left = (new Date(g.deadline).getTime() - new Date(todayKey).getTime()) / (30.4375 * 86400000);
          need = Math.round((remaining / Math.max(1, left)) * 100) / 100;
        }
        return { g, p, need, thisMonth: goalMonthSaved(goalEntries, g.id, monthKey) };
      }),
    [goals, goalEntries, todayKey, monthKey],
  );

  const [pick, setPick] = useState<string | null>(null);
  const picked = goalRows.find((r) => r.g.id === pick) ?? goalRows[0] ?? null;

  const goalChart = useMemo(() => {
    if (!picked) return null;
    const { g, p, need } = picked;
    const saved = goalSaved(goalEntries, g.id);
    const remaining = Math.max(0, g.target - saved);
    const rate = p.perMonth > 0 ? p.perMonth : (g.monthly ?? 0);
    const monthsPace = remaining > 0 && rate > 0 ? Math.ceil(remaining / rate) : 0;
    const monthsDeadline = g.deadline ? Math.max(1, Math.round((new Date(g.deadline).getTime() - new Date(todayKey).getTime()) / (30.4375 * 86400000))) : 0;
    const horizon = Math.min(60, Math.max(3, monthsPace, monthsDeadline, 6));
    const histKeys = Array.from({ length: HIST }, (_, i) => shiftMonth(todayKey, i - (HIST - 1)));
    const hist = histKeys.map((k, i) => {
      if (i === HIST - 1) return saved;
      const end = `${k}-31`;
      return Math.round(goalEntries.filter((e) => e.goalId === g.id && e.date <= end).reduce((a, e) => a + e.amount, 0) * 100) / 100;
    });
    const fut = Array.from({ length: horizon }, (_, i) => shiftMonth(todayKey, i + 1));
    const nulls = <T,>(n: number) => Array.from({ length: n }, () => null as T | null);
    const cap = (v: number) => Math.min(g.target, v);
    const actual = [...hist, ...nulls<number>(horizon)];
    const pace = rate > 0 ? [...nulls<number>(HIST - 1), saved, ...fut.map((_, i) => cap(saved + rate * (i + 1)))] : null;
    const suggest = need !== null && remaining > 0 ? [...nulls<number>(HIST - 1), saved, ...fut.map((_, i) => (i + 1 <= monthsDeadline ? cap(saved + need * (i + 1)) : null))] : null;
    return {
      labels: [...histKeys, ...fut].map((k) => monthLabel(k, 'short')),
      actual,
      pace,
      suggest,
      target: g.target,
      monthsPace,
      rate,
      need,
      remaining,
      done: remaining <= 0,
    };
  }, [picked, goalEntries, todayKey]);

  const totalChart = useMemo(() => {
    const H = 6;
    const sv = forecastSeries(d.saving, H + 1);
    const hk = d.past.slice(-HIST);
    // Savings level at the end of each past month, ending at today's real balance.
    const fut = d.flowsAll.filter((f) => cycleOf(f.date) > hk[hk.length - 1]).reduce((a, f) => a + f.amount, 0);
    let level = d.balance - fut;
    const hist: number[] = new Array(hk.length);
    for (let i = hk.length - 1; i >= 0; i--) {
      hist[i] = Math.round(level * 100) / 100;
      level -= d.saving[d.saving.length - hk.length + i] ?? 0;
    }
    const nowVal = hist[hist.length - 1] ?? d.balance;
    const nulls = (n: number) => Array.from({ length: n }, () => null as number | null);
    let acc = nowVal;
    const mid: number[] = [];
    const lo: number[] = [];
    const hi: number[] = [];
    let accLo = nowVal;
    let accHi = nowVal;
    sv.points.forEach((p) => {
      acc += p.value;
      accLo += p.low;
      accHi += p.high;
      mid.push(Math.round(acc));
      lo.push(Math.round(accLo));
      hi.push(Math.round(accHi));
    });
    const keys2 = [...hk, shiftMonth(todayKey, 0), ...nextKeys(todayKey, H)];
    return {
      labels: keys2.map((k) => monthLabel(k, 'short')),
      hist: [...hist, ...nulls(H + 1)],
      mid: [...nulls(hk.length - 1), hist[hist.length - 1] ?? nowVal, ...mid],
      lo: [...nulls(hk.length - 1), hist[hist.length - 1] ?? nowVal, ...lo],
      hi: [...nulls(hk.length - 1), hist[hist.length - 1] ?? nowVal, ...hi],
      split: hk.length,
    };
  }, [d, todayKey]);

  const spendChart = useMemo(() => {
    const hk = d.past.slice(-HIST);
    const hist = d.spendAll.slice(-HIST);
    const ex = d.outlook.expense.points;
    const nulls = (n: number) => Array.from({ length: n }, () => null as number | null);
    const last = hist[hist.length - 1] ?? 0;
    return {
      labels: [...hk, shiftMonth(todayKey, 0), ...nextKeys(todayKey, HORIZON)].map((k) => monthLabel(k, 'short')),
      hist: [...hist, ...nulls(HORIZON + 1)],
      mid: [...nulls(hk.length - 1), last, ...ex.map((p) => p.value)],
      lo: [...nulls(hk.length - 1), last, ...ex.map((p) => p.low)],
      hi: [...nulls(hk.length - 1), last, ...ex.map((p) => p.high)],
      split: hk.length,
    };
  }, [d, todayKey]);

  const legend = (items: { c: string; k: string; dashed?: boolean }[]) => (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.k} style={styles.legendItem}>
          <View style={{ width: 14, height: 0, borderTopWidth: 3, borderTopColor: i.c, borderStyle: i.dashed ? 'dashed' : 'solid' }} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{i.k}</ThemedText>
        </View>
      ))}
    </View>
  );

  const muted = { color: colors.textSecondary };
  const card = [styles.card, { backgroundColor: colors.backgroundElement }];
  const section = (title: string) => (
    <ThemedText type="smallBold" style={styles.sectionTitle}>
      {title}
    </ThemedText>
  );
  const keys = nextKeys(todayKey, HORIZON);
  const rough = d.monthsUsed < 3;
  const hasHistory = d.monthsUsed > 0 || d.saving.some((v) => v !== 0);
  const maxSaving = Math.max(1, ...d.saving.map((v) => Math.abs(v)));

  const bandRow = (label: string, bands: Band[], tone?: string) => (
    <View style={styles.block}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {bands.map((b, i) => (
        <View key={keys[i]} style={styles.bandRow}>
          <ThemedText type="small" style={[muted, styles.monthCol]}>{monthLabel(keys[i], 'short')}</ThemedText>
          <View style={styles.flex}>
            <ThemedText type="smallBold" style={tone ? { color: tone } : undefined}>{money(b.value)}</ThemedText>
            <ThemedText type="small" style={muted}>{t('fc.next.range', { low: compact(b.low), high: compact(b.high) })}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View>
      {section(t('fc.now.title'))}
      <View style={card}>
        <View style={styles.trio}>
          {[
            { k: 'fc.now.spent', v: d.spent, c: colors.negative },
            { k: 'fc.now.income', v: d.earned, c: colors.positive },
            { k: 'fc.now.saved', v: d.savedNow, c: colors.accent },
          ].map((x) => (
            <View key={x.k} style={styles.flex}>
              <ThemedText type="small" style={muted}>{t(x.k as 'fc.now.spent')}</ThemedText>
              <ThemedText type="smallBold" style={{ color: x.c }}>{money(x.v)}</ThemedText>
            </View>
          ))}
        </View>
        {d.planned > 0 ? (
          <ThemedText type="small" style={muted}>
            {t('fc.now.saved')}: {t('fc.now.planned', { amount: money(d.planned) })}
          </ThemedText>
        ) : null}
      </View>

      {section(t('fc.next.title', { n: HORIZON }))}
      <View style={card}>
        {!hasHistory ? (
          <ThemedText type="small" style={muted}>{t('fc.next.empty')}</ThemedText>
        ) : (
          <>
            {bandRow(t('fc.next.expense'), d.outlook.expense.points.slice(1), colors.negative)}
            {bandRow(t('fc.next.income'), d.outlook.income.points.slice(1), colors.positive)}
            {bandRow(t('fc.next.saving'), d.outlook.saving.points.slice(1), colors.accent)}
            {bandRow(t('fc.next.left'), d.outlook.left.slice(1))}
            <ThemedText type="small" style={muted}>{t('fc.next.how', { fixed: money(d.fixedMonthly) })}</ThemedText>
            {rough ? <ThemedText type="small" style={muted}>{t('fc.next.rough')}</ThemedText> : null}
          </>
        )}
      </View>

      {section(t('fc.sav.title'))}
      <View style={card}>
        <View style={styles.trio}>
          <View style={styles.flex}>
            <ThemedText type="small" style={muted}>{t('fc.sav.balance')}</ThemedText>
            <ThemedText type="smallBold">{money(d.balance)}</ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="small" style={muted}>{t('fc.sav.rate')}</ThemedText>
            <ThemedText type="smallBold">{d.rate === null ? '—' : `${d.rate}%`}</ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="small" style={muted}>{t('fc.sav.runway')}</ThemedText>
            <ThemedText type="smallBold">{d.runway === null ? '—' : t('fc.sav.runwayValue', { n: d.runway })}</ThemedText>
          </View>
        </View>
        <ThemedText type="smallBold" style={styles.gap}>{t('fc.sav.monthly')}</ThemedText>
        {d.saving.every((v) => v === 0) ? (
          <ThemedText type="small" style={muted}>{t('fc.sav.none')}</ThemedText>
        ) : (
          d.saving.slice(-6).map((v, i, arr) => {
            const key = d.past[d.past.length - arr.length + i];
            return (
              <View key={key} style={styles.bandRow}>
                <ThemedText type="small" style={[muted, styles.monthCol]}>{monthLabel(key, 'short')}</ThemedText>
                <View style={[styles.barTrack, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={{ width: `${Math.max(2, (Math.abs(v) / maxSaving) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: v < 0 ? colors.negative : colors.accent }} />
                </View>
                <ThemedText type="small" style={styles.amountCol}>{money(v)}</ThemedText>
              </View>
            );
          })
        )}
      </View>

      {section(t('fc.goalChart.title'))}
      <View style={card}>
        {!picked || !goalChart ? (
          <ThemedText type="small" style={muted}>{t('fc.goals.none')}</ThemedText>
        ) : (
          <>
            <View style={styles.chips}>
              {goalRows.map((r) => (
                <Chip key={r.g.id} label={r.g.name} active={r.g.id === picked.g.id} onPress={() => setPick(r.g.id)} />
              ))}
            </View>
            <LineChart
              labels={goalChart.labels}
              hide={hideAmounts}
              splitAt={HIST}
              hline={{ value: goalChart.target, color: colors.warning }}
              series={[
                { values: goalChart.actual, color: colors.accent, dots: true },
                ...(goalChart.pace ? [{ values: goalChart.pace, color: colors.positive, dashed: true }] : []),
                ...(goalChart.suggest ? [{ values: goalChart.suggest, color: colors.negative, dashed: true }] : []),
              ]}
            />
            {legend([
              { c: colors.accent, k: t('fc.goalChart.actual') },
              ...(goalChart.pace ? [{ c: colors.positive, k: t('fc.goalChart.pace'), dashed: true }] : []),
              ...(goalChart.suggest ? [{ c: colors.negative, k: t('fc.goalChart.suggest'), dashed: true }] : []),
            ])}
            {goalChart.done ? (
              <ThemedText type="smallBold">{t('fc.goalChart.done')}</ThemedText>
            ) : (
              <>
                <ThemedText type="small">
                  {goalChart.rate > 0
                    ? t('fc.goalChart.paceText', { amount: money(goalChart.rate), n: goalChart.monthsPace })
                    : t('fc.goals.noPace')}
                </ThemedText>
                {goalChart.need !== null ? (
                  <ThemedText type="small">{t('fc.goalChart.needText', { amount: money(goalChart.need), left: money(goalChart.remaining) })}</ThemedText>
                ) : (
                  <ThemedText type="small" style={muted}>{t('fc.goalChart.noDeadline')}</ThemedText>
                )}
                {goalChart.need !== null && goalChart.rate > 0 ? (
                  <ThemedText type="small" style={muted}>
                    {goalChart.rate >= goalChart.need
                      ? t('fc.goalChart.ontrack')
                      : t('fc.goalChart.short', { amount: money(goalChart.need - goalChart.rate) })}
                  </ThemedText>
                ) : null}
              </>
            )}
          </>
        )}
      </View>

      {section(t('fc.totalChart.title'))}
      <View style={card}>
        <LineChart
          labels={totalChart.labels}
          hide={hideAmounts}
          splitAt={totalChart.split}
          series={[
            { values: totalChart.hi, color: colors.textSecondary, dashed: true, width: 1.5 },
            { values: totalChart.lo, color: colors.textSecondary, dashed: true, width: 1.5 },
            { values: totalChart.mid, color: colors.positive, dashed: true },
            { values: totalChart.hist, color: colors.accent, dots: true },
          ]}
        />
        {legend([
          { c: colors.accent, k: t('fc.goalChart.actual') },
          { c: colors.positive, k: t('fc.totalChart.forecast'), dashed: true },
          { c: colors.textSecondary, k: t('fc.totalChart.range'), dashed: true },
        ])}
        <ThemedText type="small" style={muted}>{t('fc.totalChart.note')}</ThemedText>
      </View>

      {section(t('fc.spendChart.title'))}
      <View style={card}>
        <LineChart
          labels={spendChart.labels}
          hide={hideAmounts}
          splitAt={spendChart.split}
          series={[
            { values: spendChart.hi, color: colors.textSecondary, dashed: true, width: 1.5 },
            { values: spendChart.lo, color: colors.textSecondary, dashed: true, width: 1.5 },
            { values: spendChart.mid, color: colors.negative, dashed: true },
            { values: spendChart.hist, color: colors.accent, dots: true },
          ]}
        />
        {legend([
          { c: colors.accent, k: t('fc.goalChart.actual') },
          { c: colors.negative, k: t('fc.totalChart.forecast'), dashed: true },
          { c: colors.textSecondary, k: t('fc.totalChart.range'), dashed: true },
        ])}
      </View>

      {section(t('fc.goals.title'))}
      <View style={card}>
        {goalRows.length === 0 ? (
          <ThemedText type="small" style={muted}>{t('fc.goals.none')}</ThemedText>
        ) : (
          goalRows.map(({ g, p, need }) => (
            <View key={g.id} style={styles.block}>
              <View style={styles.bandRow}>
                <Ionicons name="flag-outline" size={16} color={colors.accent} />
                <ThemedText type="smallBold" style={styles.flex}>{g.name}</ThemedText>
              </View>
              <ThemedText type="small" style={muted}>
                {p.finishDate ? t('fc.goals.finish', { date: monthLabel(p.finishDate.slice(0, 7), 'short') + ' ' + p.finishDate.slice(0, 4) }) : t('fc.goals.noPace')}
                {p.daysVsDeadline !== null
                  ? ` · ${p.daysVsDeadline > 0 ? t('fc.goals.late', { n: p.daysVsDeadline }) : t('fc.goals.early', { n: -p.daysVsDeadline })}`
                  : ''}
              </ThemedText>
              {need !== null ? <ThemedText type="small" style={muted}>{t('fc.goals.need', { amount: money(need) })}</ThemedText> : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three, gap: 10 },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.two, marginTop: Spacing.two },
  trio: { flexDirection: 'row', gap: 12 },
  block: { gap: 4, marginBottom: 6 },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthCol: { width: 44 },
  amountCol: { minWidth: 70, textAlign: 'right' },
  barTrack: { flex: 1, height: 8, borderRadius: 4 },
  gap: { marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
