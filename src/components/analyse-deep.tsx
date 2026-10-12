import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnalyseForecast } from '@/components/analyse-forecast';
import { CategoryIcon } from '@/components/category-icon';
import { HeatMatrix } from '@/components/charts/heat-matrix';
import { ScrubBars } from '@/components/charts/scrub-bars';
import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { cycleInfo, cycleRange, daysBetween } from '@/utils/cycle';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName, categoryName as categoryLabel, subcategoryName } from '@/i18n/data';
import { weekdayShort } from '@/i18n/format';
import { upcomingBills, upcomingOccurrences, billsTotal } from '@/utils/bills';
import { formatMoney } from '@/utils/currency';
import { cycleRangeLabel, dayLabel, monthLabel } from '@/utils/dates';
import {
  balanceTrend,
  budgetHistory,
  categoryByMonth,
  categoryMatrix,
  cycleBalance,
  spendingSizes,
  fixedVsEveryday,
  incomeStats,
  monthCalendar,
  monthOutlook,
  monthRhythm,
  records,
  spendingByAccount,
  topSubcategories,
  unusualExpenses,
} from '@/utils/deep-insights';
import { currentWindow, monthKeysEnding } from '@/utils/insights';
import { looksLikeSavings } from '@/utils/saved';
import { p1 } from '@/utils/percent';

const MASK = 'RM ••••';

type Props = { months: number; todayKey: string };

/** The "Deep dive" tab of Faham: forecast, calendar, income, records, budgets, unusual spending and more. */
export function AnalyseDeep({ months, todayKey }: Props) {
  const colors = useTheme();
  const { t, tp } = useT();
  const { transactions, accounts, transfers, recurringRules } = useTransactions();
  const { expenseCategories, getCategory, totalBudget } = useCategories();
  const { hideAmounts } = usePrivacy();

  const keys = useMemo(() => monthKeysEnding(todayKey, months), [todayKey, months]);
  const [calendarKey, setCalendarKey] = useState<string | null>(null);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedCategory, setPickedCategory] = useState<string | null>(null);

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const catName = (id: string) => {
    const c = getCategory(id);
    return c ? categoryLabel(c) : t('cat.other');
  };

  const d = useMemo(() => {
    const w = currentWindow(todayKey, months);
    const daysLeft = cycleInfo(todayKey).daysAfterToday;
    const bills = billsTotal(upcomingBills(recurringRules, todayKey, daysLeft));
    // "Money you can use" leaves out debt accounts and savings accounts. Moving money into savings then counts as leaving it.
    const hiddenIds = new Set(accounts.filter((a) => a.hidden || looksLikeSavings(a)).map((a) => a.id));
    const startingTotal = accounts.reduce((s, a) => (hiddenIds.has(a.id) ? s : s + a.initialBalance), 0);
    const spendByCat = new Map<string, number>();
    for (const tx of transactions) if (tx.type === 'debit' && tx.date >= w.from && tx.date <= w.to) spendByCat.set(tx.categoryId, (spendByCat.get(tx.categoryId) ?? 0) + tx.amount);
    const outlookNow = monthOutlook(transactions, todayKey, bills, totalBudget);
    const scheduled = upcomingOccurrences(recurringRules, todayKey, daysLeft).map((o) => ({ date: o.date, amount: o.amount, type: o.type }));
    const topIds = [...spendByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
    return {
      w,
      outlook: outlookNow,
      cycle: cycleBalance({ transactions, startingTotal, todayKey, upcoming: scheduled, dailyEveryday: outlookNow.dailyEveryday, debt: { hiddenIds, transfers } }),
      matrix: categoryMatrix(transactions, topIds, keys, todayKey),
      sizes: spendingSizes(transactions, w),
      split: fixedVsEveryday(transactions, w),
      income: incomeStats(transactions, w, keys),
      subs: topSubcategories(transactions, w, 8),
      rec: records(transactions, w, keys, todayKey),
      byAccount: spendingByAccount(transactions, w),
      budgets: budgetHistory(transactions, expenseCategories.map((c) => ({ categoryId: c.id, limit: c.monthlyLimit })), w, keys, todayKey),
      unusual: unusualExpenses(transactions, w, 3),
      rhythm: monthRhythm(transactions, w),
      balance: balanceTrend(transactions, startingTotal, keys, todayKey, { hiddenIds, transfers }),
      topCats: [...spendByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id),
    };
  }, [transactions, accounts, transfers, recurringRules, expenseCategories, totalBudget, todayKey, months, keys]);

  // Calendar-month mode: real months. Payday mode: the same financial months as everything else, with the range shown.
  const { calendarMonths } = useSettings();
  const byCycle = !calendarMonths;
  const calKeys = useMemo(() => {
    if (byCycle) return keys;
    const first = cycleRange(keys[0]).from.slice(0, 7);
    const lastEnd = cycleRange(keys[keys.length - 1]).to;
    const last = (lastEnd > todayKey ? lastEnd : todayKey).slice(0, 7);
    const out: string[] = [];
    let [y, m] = first.split('-').map(Number);
    while (`${y}-${String(m).padStart(2, '0')}` <= last && out.length < 400) {
      out.push(`${y}-${String(m).padStart(2, '0')}`);
      if (++m > 12) {
        m = 1;
        y++;
      }
    }
    return out;
  }, [keys, todayKey, byCycle]);
  const todayMonth = byCycle ? cycleInfo(todayKey).key : todayKey.slice(0, 7);
  const activeCalendarKey = calendarKey && calKeys.includes(calendarKey) ? calendarKey : calKeys.includes(todayMonth) ? todayMonth : calKeys[calKeys.length - 1];
  const calendar = useMemo(() => monthCalendar(transactions, activeCalendarKey, byCycle), [transactions, activeCalendarKey, byCycle]);
  const calIndex = calKeys.indexOf(activeCalendarKey);
  const picked = calendar.days.find((x) => x.date === pickedDay) ?? null;

  const chosenCategory = pickedCategory && d.topCats.includes(pickedCategory) ? pickedCategory : d.topCats[0];
  const categorySeries = useMemo(() => (chosenCategory ? categoryByMonth(transactions, chosenCategory, keys) : []), [transactions, chosenCategory, keys]);

  const hasAnything = d.rec.expenseCount > 0 || d.income.total > 0;
  if (!hasAnything) {
    return (
      <View style={[styles.card, styles.center, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="telescope-outline" size={32} color={colors.textSecondary} />
        <ThemedText style={styles.cardTitle}>{t('plan.deep.emptyTitle')}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {t('plan.deep.emptyBody')}
        </ThemedText>
      </View>
    );
  }

  const muted = { color: colors.textSecondary };

  const outlook = d.outlook;
  const outlookVisible = outlook.spentSoFar > 0 || outlook.billsAhead > 0;
  const vsLast = outlook.lastMonthTotal > 0 ? outlook.projected - outlook.lastMonthTotal : null;
  const budgetGap = outlook.budget > 0 ? outlook.projected - outlook.budget : null;
  const barMax = Math.max(outlook.projected, outlook.budget, 1);
  const intensity = (total: number) => {
    if (total <= 0 || calendar.max <= 0) return 0;
    const r = total / calendar.max;
    return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
  };
  const heat = [colors.heat0, colors.heat1, colors.heat2, colors.heat3, colors.heat4];

  const cells: (number | null)[] = [...Array(calendar.startOffset).fill(null), ...calendar.days.map((_, i) => i)]; // positions in the cycle, not day numbers: a cycle can run across two months
  while (cells.length % 7 !== 0) cells.push(null);
  const calRows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const catAvg = categorySeries.length ? categorySeries.reduce((s, x) => s + x.total, 0) / categorySeries.length : 0;
  const balFirst = d.balance[0]?.balance ?? 0;
  const balLast = d.balance[d.balance.length - 1]?.balance ?? 0;
  const heaviestPart = d.rhythm.parts.reduce((best, p, i) => (p.total > d.rhythm.parts[best].total ? i : best), 0);
  const partLabels = [t('plan.deep.rhythm.early'), t('plan.deep.rhythm.mid'), t('plan.deep.rhythm.late')];

  const cycleLine = (() => {
    const pts = d.cycle.points;
    const actual = pts.map((x, i) => (i <= d.cycle.todayIndex ? x.balance : null));
    const projected = pts.map((x, i) => (i >= d.cycle.todayIndex ? x.balance : null));
    return { labels: pts.map((x) => String(Number(x.date.slice(8)))), actual, projected, negative: pts.some((x) => x.balance < 0) };
  })();
  const runsOutDays = d.cycle.runsOutOn ? daysBetween(d.cycle.runsOutOn, d.cycle.points[d.cycle.points.length - 1].date) : null;
  const balanceLine = (() => {
    const split = d.balance.length;
    const labels = [...d.balance.map((b) => monthLabel(b.key, 'short')), t('plan.deep.balance.endShort')];
    const actual = [...d.balance.map((b) => b.balance), null] as (number | null)[];
    const proj = [...d.balance.map((b, i) => (i === split - 1 ? b.balance : null)), d.cycle.endBalance] as (number | null)[];
    return { labels, actual, proj, split, titles: d.balance.map((b) => monthLabel(b.key, 'long')) };
  })();
  const bigSmall = d.sizes.slice(0, 2).reduce((acc, b) => ({ c: acc.c + b.countShare, s: acc.s + b.share }), { c: 0, s: 0 });
  const bigLarge = d.sizes.slice(3).reduce((acc, b) => ({ c: acc.c + b.countShare, s: acc.s + b.share }), { c: 0, s: 0 });
  const sizeNote =
    bigLarge.s >= 50
      ? t('plan.deep.size.noteBig', { countShare: p1(bigLarge.c), share: p1(bigLarge.s) })
      : t('plan.deep.size.note', { countShare: p1(bigSmall.c), share: p1(bigSmall.s) });
  const risers = d.matrix.filter((r) => r.rose).map((r) => catName(r.categoryId));
  const fallers = d.matrix.filter((r) => r.fell).map((r) => catName(r.categoryId));

  const section = (title: string) => (
    <ThemedText type="smallBold" style={styles.sectionTitle}>
      {title}
    </ThemedText>
  );
  const card = [styles.card, { backgroundColor: colors.backgroundElement }];
  const list = [styles.listCard, { backgroundColor: colors.backgroundElement }];
  const hair = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider };

  return (
    <>
      <ThemedText type="title" style={styles.group}>{t('plan.deep.group.forecast')}</ThemedText>

      {/* 1. Month-end outlook */}
      {outlookVisible ? (
        <>
          {section(t('plan.deep.outlook.title'))}
          <View style={card}>
            <ThemedText type="small" style={muted}>
              {t('plan.deep.outlook.label', { month: monthLabel(outlook.monthKey, 'long') })}
            </ThemedText>
            <ThemedText style={styles.big} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {money(outlook.projected)}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
              <View style={[styles.fill, { width: `${Math.min(100, (outlook.spentSoFar / barMax) * 100)}%`, backgroundColor: colors.accent }]} />
            </View>
            <View style={styles.line}>
              <ThemedText type="small" style={[muted, styles.flex]}>{t('plan.deep.outlook.spent')}</ThemedText>
              <ThemedText type="small">{money(outlook.spentSoFar)}</ThemedText>
            </View>
            {outlook.incomeSoFar > 0 ? (
              <View style={styles.line}>
                <ThemedText type="small" style={[muted, styles.flex]}>{t('plan.deep.outlook.income')}</ThemedText>
                <ThemedText type="small" style={{ color: colors.positive }}>{money(outlook.incomeSoFar)}</ThemedText>
              </View>
            ) : null}
            <View style={styles.line}>
              <ThemedText type="small" style={[muted, styles.flex]}>{t('plan.deep.outlook.bills')}</ThemedText>
              <ThemedText type="small">{money(outlook.billsAhead)}</ThemedText>
            </View>
            <View style={styles.line}>
              <ThemedText type="small" style={[muted, styles.flex]}>{tp('plan.deep.outlook.everyday', outlook.daysLeft, { amount: money(outlook.dailyEveryday) })}</ThemedText>
              <ThemedText type="small">{money(outlook.dailyEveryday * outlook.daysLeft)}</ThemedText>
            </View>
            {vsLast !== null ? (
              <ThemedText type="small" style={[styles.gap, { color: vsLast > 0 ? colors.negative : colors.positive, fontWeight: '700' }]}>
                {vsLast > 0
                  ? t('plan.deep.outlook.moreThanLast', { amount: money(vsLast), last: money(outlook.lastMonthTotal) })
                  : t('plan.deep.outlook.lessThanLast', { amount: money(-vsLast), last: money(outlook.lastMonthTotal) })}
              </ThemedText>
            ) : null}
            {budgetGap !== null ? (
              <ThemedText type="small" style={{ color: budgetGap > 0 ? colors.negative : colors.positive, fontWeight: '700' }}>
                {budgetGap > 0
                  ? t('plan.deep.outlook.overBudget', { amount: money(budgetGap) })
                  : t('plan.deep.outlook.underBudget', { amount: money(-budgetGap) })}
              </ThemedText>
            ) : null}
            <ThemedText type="small" style={[styles.gap, muted]}>
              {outlook.reliable ? t('plan.deep.outlook.how') : t('plan.deep.outlook.early')}
            </ThemedText>
          </View>
        </>
      ) : null}

      {/* Cycle balance, day by day */}
      {d.cycle.points.length > 1 ? (
        <>
          {section(t('plan.deep.cycle.title'))}
          <View style={card}>
            <LineChart
              labels={cycleLine.labels}
              hide={hideAmounts}
              splitAt={d.cycle.todayIndex}
              initialIndex={d.cycle.todayIndex}
              hline={cycleLine.negative ? { value: 0, color: colors.negative } : undefined}
              series={[
                { values: cycleLine.projected, color: colors.textSecondary, dashed: true },
                { values: cycleLine.actual, color: colors.accent },
              ]}
              readout={(i) => ({
                title: `${dayLabel(d.cycle.points[i].date)}${d.cycle.points[i].projected ? ` · ${t('plan.deep.guess')}` : ''}`,
                rows: [{ label: '', value: money(d.cycle.points[i].balance), color: d.cycle.points[i].balance < 0 ? colors.negative : d.cycle.points[i].projected ? colors.textSecondary : colors.accent }],
              })}
            />
            <View style={styles.trio}>
              {[
                { label: t('plan.deep.cycle.now'), value: money(d.cycle.nowBalance), tone: d.cycle.nowBalance < 0 ? colors.negative : colors.text },
                { label: t('plan.deep.cycle.lowest'), value: money(d.cycle.lowest.balance), tone: d.cycle.lowest.balance < 0 ? colors.negative : colors.text },
                { label: t('plan.deep.cycle.end'), value: money(d.cycle.endBalance), tone: d.cycle.endBalance < 0 ? colors.negative : colors.text },
              ].map((x) => (
                <View key={x.label} style={styles.flex}>
                  <ThemedText type="small" style={muted} numberOfLines={1}>{x.label}</ThemedText>
                  <ThemedText type="smallBold" style={{ color: x.tone }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{x.value}</ThemedText>
                </View>
              ))}
            </View>
            <ThemedText type="small" style={{ fontWeight: '700', color: runsOutDays !== null || d.cycle.nowBalance < 0 ? colors.negative : colors.positive }}>
              {d.cycle.nowBalance < 0
                ? t('plan.deep.cycle.negative')
                : d.cycle.runsOutOn
                  ? runsOutDays && runsOutDays > 0
                    ? t('plan.deep.cycle.runsOut', { date: dayLabel(d.cycle.runsOutOn), days: runsOutDays })
                    : t('plan.deep.cycle.runsOutShort', { date: dayLabel(d.cycle.runsOutOn) })
                  : t('plan.deep.cycle.ok')}
            </ThemedText>
            <ThemedText type="small" style={muted}>{outlook.reliable ? t('plan.deep.cycle.note') : `${t('plan.deep.cycle.early')} ${t('plan.deep.cycle.note')}`}</ThemedText>
          </View>
        </>
      ) : null}

      {/* 12. Balance trend */}
      {d.balance.length > 1 ? (
        <>
          {section(t('plan.deep.balance.title'))}
          <View style={card}>
            <LineChart
              labels={balanceLine.labels}
              hide={hideAmounts}
              splitAt={balanceLine.split}
              initialIndex={balanceLine.split - 1}
              series={[
                { values: balanceLine.proj, color: colors.textSecondary, dashed: true },
                { values: balanceLine.actual, color: colors.accent, dots: true },
              ]}
              readout={(i) =>
                i >= balanceLine.split
                  ? { title: t('plan.deep.balance.endTitle'), rows: [{ label: '', value: money(balanceLine.proj[i] ?? 0), color: colors.textSecondary }] }
                  : { title: balanceLine.titles[i], rows: [{ label: '', value: money(balanceLine.actual[i] ?? 0), color: colors.accent }] }
              }
            />
            <ThemedText type="small" style={{ color: balLast >= balFirst ? colors.positive : colors.negative, fontWeight: '700' }}>
              {balLast >= balFirst
                ? months === 1 ? t('plan.deep.balance.upOne', { amount: money(balLast - balFirst) }) : t('plan.deep.balance.up', { amount: money(balLast - balFirst), months })
                : months === 1 ? t('plan.deep.balance.downOne', { amount: money(balFirst - balLast) }) : t('plan.deep.balance.down', { amount: money(balFirst - balLast), months })}
            </ThemedText>
            <ThemedText type="small" style={muted}>{t('plan.deep.balance.note')}</ThemedText>
          </View>
        </>
      ) : null}

      <AnalyseForecast months={months} todayKey={todayKey} />

      <ThemedText type="title" style={styles.group}>{t('plan.deep.group.patterns')}</ThemedText>

      {/* 2. Calendar */}
      {section(t('plan.deep.calendar.title'))}
      <View style={card}>
        <View style={styles.monthRow}>
          <Pressable
            disabled={calIndex <= 0}
            onPress={() => {
              setCalendarKey(calKeys[calIndex - 1]);
              setPickedDay(null);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('plan.deep.calendar.prev')}
            style={{ opacity: calIndex <= 0 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <ThemedText style={styles.monthTitle}>{monthLabel(activeCalendarKey, 'long')}</ThemedText>
          <Pressable
            disabled={calIndex >= calKeys.length - 1}
            onPress={() => {
              setCalendarKey(calKeys[calIndex + 1]);
              setPickedDay(null);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('plan.deep.calendar.next')}
            style={{ opacity: calIndex >= calKeys.length - 1 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.calRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <ThemedText key={i} type="small" style={[styles.calHead, muted]}>
              {weekdayShort(i).slice(0, 2)}
            </ThemedText>
          ))}
        </View>
        {calRows.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((pos, ci) => {
              const info = pos === null ? undefined : calendar.days[pos];
              if (!info) return <View key={ci} style={styles.calCell} />;
              const level = intensity(info.total);
              const isToday = info.date === todayKey;
              const selected = info.date === pickedDay;
              return (
                <Pressable
                  key={ci}
                  onPress={() => setPickedDay(selected ? null : info.date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(info.date)}: ${money(info.total)}`}
                  style={[
                    styles.calCell,
                    styles.calDay,
                    { backgroundColor: heat[level] },
                    (isToday || selected) && { borderWidth: 2, borderColor: selected ? colors.text : colors.accent },
                  ]}
                >
                  <ThemedText type="small" style={{ fontSize: FontSize.caption, color: level >= 3 ? colors.heatInk : colors.text, fontWeight: level >= 3 ? '700' : '400' }}>
                    {info.day}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={styles.legend}>
          <ThemedText type="small" style={muted}>{t('plan.deep.calendar.less')}</ThemedText>
          {heat.map((c, i) => (
            <View key={i} style={[styles.legendDot, { backgroundColor: c }]} />
          ))}
          <ThemedText type="small" style={muted}>{t('plan.deep.calendar.more')}</ThemedText>
        </View>
        <ThemedText type="small" style={[styles.gap, muted]}>
          {picked
            ? picked.count > 0 || picked.income > 0
              ? `${dayLabel(picked.date)}: ${money(picked.total)} · ${tp('plan.deep.calendar.expenses', picked.count)}${picked.income > 0 ? ` · +${money(picked.income)}` : ''}`
              : `${dayLabel(picked.date)}: ${t('plan.deep.calendar.nothing')}`
            : t('plan.deep.calendar.total', { month: byCycle ? `${monthLabel(activeCalendarKey, 'long')} (${cycleRangeLabel(activeCalendarKey)})` : monthLabel(activeCalendarKey, 'long'), amount: money(calendar.total) })}
        </ThemedText>
      </View>

      {/* How big expenses are */}
      {d.sizes.some((b) => b.count > 0) ? (
        <>
          {section(t('plan.deep.size.title'))}
          <View style={card}>
            <ScrubBars
              items={d.sizes.map((b) => ({
                key: String(b.index),
                label: b.max === null ? `${b.min >= 1000 ? `${b.min / 1000}k` : b.min}+` : b.index === 0 ? `<${b.max}` : `${b.min}–${b.max >= 1000 ? `${b.max / 1000}k` : b.max}`,
                title: b.max === null ? t('plan.deep.size.over', { from: b.min }) : b.index === 0 ? t('plan.deep.size.under', { to: b.max }) : t('plan.deep.size.range', { from: b.min, to: b.max }),
                value: b.count,
              }))}
              color={colors.accent}
              format={(n) => tp('plan.deep.size.countValue', n)}
              extra={(_item, i) => t('plan.deep.size.total', { amount: money(d.sizes[i].total), share: p1(d.sizes[i].share) })}
            />
            <ThemedText type="small" style={[styles.gap, muted]}>
              {sizeNote}
            </ThemedText>
          </View>
        </>
      ) : null}

      {/* 10. Rhythm */}
      {d.rhythm.parts.some((p) => p.total > 0) ? (
        <>
          {section(t('plan.deep.rhythm.title'))}
          <View style={card}>
            {d.rhythm.parts.map((p, i) => (
              <View key={i} style={styles.rhythmRow}>
                <ThemedText type="small" style={[styles.rhythmLabel, muted]}>{partLabels[i]}</ThemedText>
                <View style={[styles.track, styles.flex, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.fill, { width: `${Math.max(p.share, p.total > 0 ? 2 : 0)}%`, backgroundColor: i === heaviestPart ? colors.accent : colors.textSecondary }]} />
                </View>
                <ThemedText type="small" style={styles.rhythmValue}>{p1(p.share)}%</ThemedText>
              </View>
            ))}
            <ThemedText type="small" style={[styles.gap, muted]}>
              {t('plan.deep.rhythm.note', { part: partLabels[heaviestPart], share: p1(d.rhythm.parts[heaviestPart].share) })}
            </ThemedText>
          </View>
        </>
      ) : null}

      {/* 3. Fixed vs everyday */}
      {d.split.fixed + d.split.everyday > 0 ? (
        <>
          {section(t('plan.deep.fixed.title'))}
          <View style={card}>
            <View style={[styles.split, { backgroundColor: colors.backgroundSelected }]}>
              {d.split.fixed > 0 ? <View style={{ flex: d.split.fixed, backgroundColor: colors.accent }} /> : null}
              {d.split.everyday > 0 ? <View style={{ flex: d.split.everyday, backgroundColor: colors.gold }} /> : null}
            </View>
            <View style={styles.line}>
              <View style={styles.key}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <ThemedText type="small">{t('plan.deep.fixed.fixed')}</ThemedText>
              </View>
              <ThemedText type="small" style={{ fontWeight: '700' }}>{money(d.split.fixed)}</ThemedText>
            </View>
            <View style={styles.line}>
              <View style={styles.key}>
                <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
                <ThemedText type="small">{t('plan.deep.fixed.everyday')}</ThemedText>
              </View>
              <ThemedText type="small" style={{ fontWeight: '700' }}>{money(d.split.everyday)}</ThemedText>
            </View>
            <ThemedText type="small" style={[styles.gap, muted]}>
              {d.split.fixed > 0 ? t('plan.deep.fixed.note', { share: p1(d.split.fixedShare) }) : t('plan.deep.fixed.none')}
            </ThemedText>
          </View>
        </>
      ) : null}

      {/* Categories by month */}
      {d.matrix.length > 0 && keys.length > 1 ? (
        <>
          {section(t('plan.deep.heat.title'))}
          <View style={card}>
            <HeatMatrix
              columns={keys.map((k) => monthLabel(k, 'short'))}
              hide={hideAmounts}
              format={money}
              rows={d.matrix.map((r) => {
                const c = getCategory(r.categoryId);
                return { id: r.categoryId, label: catName(r.categoryId), icon: c?.icon ?? 'help-circle', color: c?.color ?? '#8E8E93', values: r.values, rose: r.rose };
              })}
            />
            <ThemedText type="small" style={[styles.gap, muted]}>{t('plan.deep.heat.note')}</ThemedText>
            {risers.length > 0 ? <ThemedText type="small" style={{ color: colors.negative, fontWeight: '700' }}>{t('plan.deep.heat.rose', { names: risers.join(', ') })}</ThemedText> : null}
            {fallers.length > 0 ? <ThemedText type="small" style={{ color: colors.positive, fontWeight: '700' }}>{t('plan.deep.heat.fell', { names: fallers.join(', ') })}</ThemedText> : null}
            {risers.length === 0 && fallers.length === 0 ? <ThemedText type="small" style={muted}>{t('plan.deep.heat.steady')}</ThemedText> : null}
          </View>
        </>
      ) : null}

      {/* 7. Category over time */}
      {d.topCats.length > 0 && chosenCategory ? (
        <>
          {section(t('plan.deep.category.title'))}
          <View style={card}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {d.topCats.map((id) => (
                <Chip key={id} label={catName(id)} active={id === chosenCategory} onPress={() => setPickedCategory(id)} />
              ))}
            </ScrollView>
            <ScrubBars
              items={categorySeries.map((p) => ({ key: p.key, label: monthLabel(p.key, 'short'), title: monthLabel(p.key, 'long'), value: p.total }))}
              color={getCategory(chosenCategory)?.color ?? colors.accent}
              hide={hideAmounts}
              format={money}
              extra={(item) => (catAvg > 0 ? t('plan.deep.category.vsAvg', { pct: `${item.value >= catAvg ? '+' : ''}${p1(((item.value - catAvg) / catAvg) * 100)}` }) : null)}
            />
            <ThemedText type="small" style={muted}>{t('plan.deep.category.avg', { amount: money(catAvg) })}</ThemedText>
          </View>
        </>
      ) : null}

      {/* 5. Top subcategories */}
      {d.subs.length > 0 ? (
        <>
          {section(t('plan.deep.subs.title'))}
          <View style={list}>
            {d.subs.map((s, i) => {
              const c = getCategory(s.categoryId);
              return (
                <View key={`${s.categoryId}|${s.name}`} style={[styles.row, i > 0 && hair]}>
                  <CategoryIcon icon={c?.icon ?? 'help-circle'} color={c?.color ?? '#8E8E93'} size={36} />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1}>{subcategoryName(s.name)}</ThemedText>
                    <ThemedText type="small" style={muted} numberOfLines={1}>
                      {catName(s.categoryId)} · {tp('plan.analyse.times', s.count)}
                    </ThemedText>
                  </View>
                  <View style={styles.right}>
                    <ThemedText style={{ fontWeight: '700' }}>{money(s.total)}</ThemedText>
                    <ThemedText type="small" style={muted}>{p1(s.share)}%</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {/* 6. Records */}
      {d.rec.expenseCount > 0 ? (
        <>
          {section(t('plan.deep.records.title'))}
          <View style={styles.tiles}>
            {[
              { label: t('plan.deep.records.avgMonth'), value: money(d.rec.avgMonthlySpending) },
              { label: t('plan.deep.records.avgDay'), value: money(d.rec.avgDailySpending) },
              { label: t('plan.deep.records.highest'), value: d.rec.highestMonth ? money(d.rec.highestMonth.total) : '—', sub: d.rec.highestMonth ? monthLabel(d.rec.highestMonth.key, 'short') : '' },
              { label: t('plan.deep.records.lowest'), value: d.rec.lowestMonth ? money(d.rec.lowestMonth.total) : '—', sub: d.rec.lowestMonth ? monthLabel(d.rec.lowestMonth.key, 'short') : '' },
              { label: t('plan.deep.records.avgExpense'), value: money(d.rec.avgExpense), sub: tp('plan.deep.records.expenseCount', d.rec.expenseCount) },
              { label: t('plan.deep.records.noSpend'), value: String(d.rec.noSpendDays), sub: t('plan.deep.records.noSpendOf', { n: d.rec.daysCounted }) },
            ].map((tile) => (
              <View key={tile.label} style={[styles.tile, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={muted} numberOfLines={1}>{tile.label}</ThemedText>
                <ThemedText style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{tile.value}</ThemedText>
                {tile.sub ? <ThemedText type="small" style={muted} numberOfLines={1}>{tile.sub}</ThemedText> : null}
              </View>
            ))}
          </View>
          {d.rec.longestNoSpendStreak >= 2 ? (
            <ThemedText type="small" style={[styles.foot, muted]}>
              {tp('plan.deep.records.streak', d.rec.longestNoSpendStreak)}
              {d.rec.currentNoSpendStreak >= 2 ? ` ${tp('plan.deep.records.streakNow', d.rec.currentNoSpendStreak)}` : ''}
            </ThemedText>
          ) : null}
        </>
      ) : null}

      {/* 9. Unusual */}
      {d.unusual.length > 0 ? (
        <>
          {section(t('plan.deep.unusual.title'))}
          <View style={list}>
            {d.unusual.map((u, i) => {
              const c = getCategory(u.transaction.categoryId);
              return (
                <View key={u.transaction.id} style={[styles.row, i > 0 && hair]}>
                  <CategoryIcon icon={c?.icon ?? 'help-circle'} color={c?.color ?? '#8E8E93'} size={36} />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1}>{u.transaction.title || catName(u.transaction.categoryId)}</ThemedText>
                    <ThemedText type="small" style={muted} numberOfLines={2}>
                      {dayLabel(u.transaction.date)} · {t('plan.deep.unusual.note', { times: u.times, typical: money(u.typical), category: catName(u.transaction.categoryId) })}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: '700', color: colors.negative }}>{money(u.transaction.amount)}</ThemedText>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <ThemedText type="title" style={styles.group}>{t('plan.deep.group.money')}</ThemedText>

      {/* 4. Income */}
      {d.income.total > 0 ? (
        <>
          {section(t('plan.deep.income.title'))}
          <View style={list}>
            {d.income.sources.map((s, i) => {
              const c = getCategory(s.categoryId);
              return (
                <View key={s.categoryId} style={[styles.row, i > 0 && hair]}>
                  <CategoryIcon icon={c?.icon ?? 'help-circle'} color={c?.color ?? '#8E8E93'} size={36} />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1}>{catName(s.categoryId)}</ThemedText>
                    <ThemedText type="small" style={muted}>{t('plan.deep.income.share', { share: p1(s.share) })}</ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: '700', color: colors.positive }}>{money(s.total)}</ThemedText>
                </View>
              );
            })}
          </View>
          <View style={card}>
            <View style={styles.line}>
              <ThemedText type="small" style={[muted, styles.flex]}>{t('plan.deep.income.avg')}</ThemedText>
              <ThemedText type="small" style={{ fontWeight: '700' }}>{money(d.income.avgMonthly)}</ThemedText>
            </View>
            <View style={styles.line}>
              <ThemedText type="small" style={[muted, styles.flex]}>{t('plan.deep.income.months')}</ThemedText>
              <ThemedText type="small" style={{ fontWeight: '700' }}>
                {t('plan.deep.income.monthsValue', { n: d.income.monthsWithIncome, of: d.income.monthsCounted })}
              </ThemedText>
            </View>
            {d.income.best ? (
              <View style={styles.line}>
                <ThemedText type="small" style={[muted, styles.flex]}>{t('plan.deep.income.best')}</ThemedText>
                <ThemedText type="small" style={{ fontWeight: '700' }}>
                  {monthLabel(d.income.best.key, 'short')} · {money(d.income.best.total)}
                </ThemedText>
              </View>
            ) : null}
            {d.income.steadiness ? (
              <ThemedText type="small" style={[styles.gap, { color: d.income.steadiness === 'steady' ? colors.positive : d.income.steadiness === 'some' ? colors.text : colors.warning }]}>
                {d.income.steadiness === 'steady' ? t('plan.deep.income.steady') : d.income.steadiness === 'some' ? t('plan.deep.income.some') : t('plan.deep.income.irregular')}
              </ThemedText>
            ) : null}
          </View>
        </>
      ) : null}

      {/* 8. Budget history */}
      {d.budgets.length > 0 ? (
        <>
          {section(t('plan.deep.budgets.title'))}
          <View style={list}>
            {d.budgets.map((b, i) => {
              const c = getCategory(b.categoryId);
              const bad = b.monthsOver / b.monthsCounted >= 0.5;
              return (
                <View key={b.categoryId} style={[styles.row, i > 0 && hair]}>
                  <CategoryIcon icon={c?.icon ?? 'help-circle'} color={c?.color ?? '#8E8E93'} size={36} />
                  <View style={styles.flex}>
                    <ThemedText numberOfLines={1}>{catName(b.categoryId)}</ThemedText>
                    <ThemedText type="small" style={{ color: b.monthsOver === 0 ? colors.positive : bad ? colors.negative : colors.warning }}>
                      {b.monthsOver === 0
                        ? t('plan.deep.budgets.never', { n: b.monthsCounted })
                        : t('plan.deep.budgets.over', { n: b.monthsOver, of: b.monthsCounted })}
                    </ThemedText>
                  </View>
                  <View style={styles.right}>
                    <ThemedText style={{ fontWeight: '700' }}>{p1(b.avgUse)}%</ThemedText>
                    <ThemedText type="small" style={muted}>{t('plan.deep.budgets.used')}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {/* 11. By account */}
      {d.byAccount.length > 1 ? (
        <>
          {section(t('plan.deep.accounts.title'))}
          <View style={list}>
            {d.byAccount.map((a, i) => {
              const acc = accounts.find((x) => x.id === a.accountId);
              return (
                <View key={a.accountId} style={[styles.row, i > 0 && hair]}>
                  <View style={styles.flex}>
                    <View style={styles.line}>
                      <ThemedText numberOfLines={1} style={styles.flex}>{acc ? accountName(acc) : '?'}</ThemedText>
                      <ThemedText style={{ fontWeight: '700' }}>{money(a.total)}</ThemedText>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                      <View style={[styles.fill, { width: `${Math.max(a.share, 2)}%`, backgroundColor: colors.accent }]} />
                    </View>
                    <ThemedText type="small" style={muted}>{t('plan.analyse.shareOfSpending', { share: p1(a.share) })}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', gap: Spacing.two },
  trio: { flexDirection: 'row', gap: 12, marginTop: Spacing.two },
  group: { fontSize: FontSize.heading, lineHeight: 30, marginTop: Spacing.four, marginBottom: Spacing.one },
  card: { borderRadius: Radius.lg, padding: 20, marginBottom: Spacing.three, gap: 6 },
  cardTitle: { fontSize: FontSize.body, fontWeight: '700' },
  big: { fontSize: FontSize.display, lineHeight: 42, fontWeight: '700' },
  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  right: { alignItems: 'flex-end' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gap: { marginTop: Spacing.two },
  foot: { marginBottom: Spacing.three },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden', marginVertical: 6 },
  fill: { height: 8, borderRadius: Radius.pill },
  split: { height: 14, borderRadius: Radius.pill, overflow: 'hidden', flexDirection: 'row', marginBottom: Spacing.two },
  legendDot: { width: 10, height: 10, borderRadius: Radius.xs },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.two },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  monthTitle: { fontWeight: '700' },
  calRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  calHead: { flex: 1, textAlign: 'center', fontSize: FontSize.micro },
  calCell: { flex: 1, aspectRatio: 1 },
  calDay: { borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  tile: { width: '48.5%', borderRadius: Radius.lg, padding: 14, gap: 2 },
  tileValue: { fontSize: FontSize.heading, fontWeight: '700' },

  chipRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', marginTop: Spacing.two, marginBottom: Spacing.two },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barSlot: { height: 90, justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  barValue: { fontSize: FontSize.micro, height: 14 },
  barLabel: { fontSize: FontSize.micro },

  rhythmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rhythmLabel: { width: 84 },
  rhythmValue: { width: 40, textAlign: 'right' },
});
