import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecordsSheet, type RecordsQuery } from '@/components/analyse/records-sheet';
import { Donut } from '@/components/charts/donut';
import { IncomeSpendingCombo } from '@/components/charts/income-spending-combo';
import { Split } from '@/components/desktop/split';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useHealthScore } from '@/hooks/use-health-score';
import { useLedger } from '@/hooks/use-ledger';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName as categoryLabel } from '@/i18n/data';
import { monthShort, weekdayLong, weekdayShort } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { dayLabel, monthLabel } from '@/utils/dates';
import { grainForPeriod, type FahamPeriod } from '@/utils/faham-period';
import { activeGoals } from '@/utils/goals';
import { biggestExpense, categoryTrends, formatPct, topTitles, weekdayPattern } from '@/utils/insights';
import { p1 } from '@/utils/percent';
import { periodsForRange, periodTotals, type Grain, type PeriodTotals } from '@/utils/periods';
import { allocation, highlights, snapshot, type Highlight } from '@/utils/ringkasan';
import { looksLikeSavings } from '@/utils/saved';

const MASK = 'RM ••••';
const COLLAPSED_CATEGORIES = 5;
const DONUT_SLICES = 5;

type Props = { period: FahamPeriod; todayKey: string; onOpenInsight: () => void };

/**
 * Ringkasan: what happened to the money in the chosen period, in the order people ask.
 *   1. Four numbers: income, spending, kept (with savings rate), money available now. Each "vs before" uses the
 *      period's like-for-like window, and only when records go back far enough to be fair.
 *   2. What changed: two or three highlights backed by both windows' records.
 *   3. Where the income went: commitments, everyday, real transfers to savings, left over.
 *   4. When the money moved (chart), where it went (categories, tap for the records), habits on demand.
 * All income and spending figures are ledger entries (utils/ledger.ts); "available now" is a balance, so it is not.
 */
export function AnalyseOverview({ period, todayKey, onOpenInsight }: Props) {
  const colors = useTheme();
  const { t, tp } = useT();
  const { entries, moved } = useLedger();
  const { transactions: raw, transfers, accounts, accountBalance } = useTransactions();
  const { goals, goalEntries } = usePlan();
  const { getCategory } = useCategories();
  const { hideAmounts } = usePrivacy();
  const { score } = useHealthScore(todayKey);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [showAvailableNote, setShowAvailableNote] = useState(false);
  const [records, setRecords] = useState<RecordsQuery | null>(null);

  const { months } = period;
  const grain: Grain = grainForPeriod(period);
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const signed = (n: number) => (hideAmounts ? MASK : `${n < 0 ? '-' : ''}${formatMoney(Math.abs(n))}`);
  const categoryName = (id: string) => {
    const c = getCategory(id);
    return c ? categoryLabel(c) : t('cat.other');
  };
  const muted = { color: colors.textSecondary };

  const isSavings = useMemo(() => {
    const ids = new Set(accounts.filter((a) => looksLikeSavings(a)).map((a) => a.id));
    return (id: string) => ids.has(id);
  }, [accounts]);

  const data = useMemo(() => {
    const w = period.window;
    const snap = snapshot(entries, period);
    return {
      w,
      snap,
      highlights: highlights(entries, period, snap),
      alloc: allocation({ entries, moved, transfers, isSavingsAccount: isSavings, window: w }),
      categories: categoryTrends(entries, w, period.previous),
      weekdays: weekdayPattern(entries, w),
      biggest: biggestExpense(entries, w),
      titles: topTitles(entries, w, 5),
    };
  }, [entries, moved, transfers, isSavings, period]);

  // Spendable money today: bank, cash, e-wallet and other everyday accounts. Not savings, credit lines or debts.
  const available = useMemo(
    () => accounts.filter((a) => !a.hidden && !a.debtId && !a.creditLimit && !looksLikeSavings(a)).reduce((s, a) => s + accountBalance(a.id), 0),
    // `accountBalance` is rebuilt every render; the balance only changes with these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, raw, transfers],
  );
  const plannedForGoals = useMemo(() => activeGoals(goals, goalEntries).reduce((s, g) => s + (g.monthly ?? 0), 0), [goals, goalEntries]);

  const periods = periodTotals(entries, periodsForRange(period.window, period.keys, grain, period.live), todayKey);

  const { snap, alloc } = data;
  const summary = snap.now;
  const hasData = summary.income > 0 || summary.spending > 0;
  const shownCategories = showAllCategories ? data.categories : data.categories.slice(0, COLLAPSED_CATEGORIES);
  const maxWeekday = Math.max(0, ...data.weekdays.map((d) => d.average));
  const priciestDay = maxWeekday > 0 ? data.weekdays.find((d) => d.average === maxWeekday)?.day : undefined;
  const scoreColor = score ? (score.total >= 80 ? colors.positive : score.total >= 60 ? colors.accent : score.total >= 40 ? colors.warning : colors.negative) : colors.textSecondary;
  const openCategory = (categoryId: string) => setRecords({ categoryId, window: period.window });

  /* Change line under a tile: ▲/▼ percent, coloured by whether the move is good for the user. */
  const change = (pct: number | null, upIsGood: boolean) => {
    if (pct === null) return null;
    if (pct === 0) return { text: '0%', color: colors.textSecondary };
    const good = pct > 0 === upIsGood;
    return { text: `${pct > 0 ? '▲' : '▼'} ${formatPct(pct)}`, color: good ? colors.positive : colors.negative };
  };

  /* Where the income went */
  const allocParts = [
    { id: 'fixed', label: t('plan.analyse.alloc.fixed'), value: alloc.fixed, color: colors.accent },
    { id: 'everyday', label: t('plan.analyse.alloc.everyday'), value: Math.max(0, alloc.everyday), color: colors.gold },
    { id: 'saved', label: t('plan.analyse.alloc.saved'), value: alloc.saved, color: colors.positive },
    { id: 'left', label: t('plan.analyse.alloc.left'), value: Math.max(0, alloc.left), color: colors.backgroundSelected },
  ];
  const ofIncome = (v: number) => (alloc.income > 0 ? p1((v / alloc.income) * 100) : 0);

  /* Category donut: the biggest few, the rest folded into one slice */
  const donutCats = data.categories.slice(0, DONUT_SLICES);
  const restTotal = data.categories.slice(DONUT_SLICES).reduce((s, c) => s + c.total, 0);
  const catSum = data.categories.reduce((s, c) => s + c.total, 0);
  const catParts = [
    ...donutCats.map((c) => ({ id: c.categoryId, value: c.total, color: getCategory(c.categoryId)?.color ?? '#8E8E93' })),
    ...(restTotal > 0 ? [{ id: '__rest', value: restTotal, color: colors.textSecondary }] : []),
  ];

  /* The chart: labels and headings for each kind of bar */
  const dm = (k: string) => `${Number(k.slice(8, 10))} ${monthShort(Number(k.slice(5, 7)) - 1)}`;
  const dmShort = (k: string) => `${Number(k.slice(8, 10))}/${Number(k.slice(5, 7))}`;
  const weekTitle = (d: PeriodTotals) => (d.from === d.to ? dm(d.from) : `${dm(d.from)} – ${dm(d.to)}`);
  const chartTitle = grain === 'week' ? t('plan.analyse.chart.week') : t('plan.analyse.incomeVsSpending');

  const keptTitle =
    period.preset === 'custom'
      ? t('plan.analyse.keptRange')
      : period.preset === 'YTD'
        ? t('plan.analyse.keptYtd')
        : months === 1
          ? t('plan.analyse.keptInOne')
          : t('plan.analyse.keptIn', { n: months });
  const compareNote =
    period.preset === 'custom'
      ? t('plan.analyse.compareNoteRange', { days: period.days })
      : period.preset === 'YTD'
        ? t('plan.analyse.compareNoteYtd')
        : months === 1
          ? t('plan.analyse.compareNoteOne')
          : t('plan.analyse.compareNote', { months });

  const highlightText = (h: Highlight) => {
    if (h.kind === 'keptMore' || h.kind === 'keptLess') {
      return {
        title: t(h.kind === 'keptMore' ? 'plan.analyse.hl.keptMore' : 'plan.analyse.hl.keptLess', { amount: money(Math.abs(h.diff)) }),
        body: t('plan.analyse.hl.keptBody', { now: signed(h.now), before: signed(h.before) }),
        good: h.kind === 'keptMore',
      };
    }
    return {
      title: t(h.kind === 'catUp' ? 'plan.analyse.hl.catUp' : 'plan.analyse.hl.catDown', { category: categoryName(h.categoryId), pct: formatPct(h.pct) }),
      body: t('plan.analyse.hl.catBody', { now: money(h.now), before: money(h.before) }),
      good: h.kind === 'catDown',
    };
  };

  if (!hasData) {
    return (
      <View style={[styles.card, styles.empty, { backgroundColor: colors.backgroundElement }]}>
        <Ionicons name="bar-chart-outline" size={32} color={colors.textSecondary} />
        <ThemedText style={styles.emptyTitle}>{t('plan.analyse.emptyTitle')}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {t('plan.analyse.emptyBody')}
        </ThemedText>
      </View>
    );
  }

  const incomeChange = change(snap.incomeChange, true);
  const spendingChange = change(snap.spendingChange, false);

  return (
    <>
      <Split
        a={
          <>
            {/* 1. The four numbers */}
            <View style={styles.grid}>
              <View style={[styles.tile, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={muted}>{t('plan.analyse.snap.income')}</ThemedText>
                <ThemedText style={[styles.tileValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {money(summary.income)}
                </ThemedText>
                {incomeChange ? (
                  <ThemedText type="small" style={{ color: incomeChange.color, fontWeight: '700' }}>{incomeChange.text}</ThemedText>
                ) : null}
                {snap.comparable ? (
                  <ThemedText type="small" style={muted} numberOfLines={1}>{t('plan.analyse.snap.vs', { amount: money(snap.prev.income) })}</ThemedText>
                ) : null}
              </View>
              <View style={[styles.tile, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={muted}>{t('plan.analyse.snap.spending')}</ThemedText>
                <ThemedText style={[styles.tileValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {money(summary.spending)}
                </ThemedText>
                {spendingChange ? (
                  <ThemedText type="small" style={{ color: spendingChange.color, fontWeight: '700' }}>{spendingChange.text}</ThemedText>
                ) : null}
                {snap.comparable ? (
                  <ThemedText type="small" style={muted} numberOfLines={1}>{t('plan.analyse.snap.vs', { amount: money(snap.prev.spending) })}</ThemedText>
                ) : null}
              </View>
              <View style={[styles.tile, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={muted} numberOfLines={1}>{keptTitle}</ThemedText>
                <ThemedText
                  style={[styles.tileValue, { color: summary.net < 0 ? colors.negative : summary.net > 0 ? colors.positive : colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {signed(summary.net)}
                </ThemedText>
                {summary.savingsRate !== null ? (
                  <ThemedText type="small" style={muted}>{t('plan.analyse.snap.rate', { rate: p1(summary.savingsRate) })}</ThemedText>
                ) : null}
                {snap.netDiff !== null && snap.netDiff !== 0 ? (
                  <ThemedText type="small" style={{ color: snap.netDiff > 0 ? colors.positive : colors.negative, fontWeight: '700' }} numberOfLines={2}>
                    {t(snap.netDiff > 0 ? 'plan.analyse.snap.netMore' : 'plan.analyse.snap.netLess', { amount: money(Math.abs(snap.netDiff)) })}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                onPress={() => setShowAvailableNote((v) => !v)}
                style={({ pressed }) => [styles.tile, { backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityHint={t('plan.analyse.snap.availableNote')}
              >
                <View style={styles.tileHead}>
                  <ThemedText type="small" style={[muted, styles.flex]} numberOfLines={1}>{t('plan.analyse.snap.available')}</ThemedText>
                  <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
                </View>
                <ThemedText style={[styles.tileValue, { color: available < 0 ? colors.negative : colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {signed(available)}
                </ThemedText>
                {showAvailableNote ? (
                  <ThemedText type="small" style={muted}>{t('plan.analyse.snap.availableNote')}</ThemedText>
                ) : null}
              </Pressable>
            </View>
            {!snap.comparable ? (
              <ThemedText type="small" style={[styles.footnote, muted]}>{t('plan.analyse.snap.noCompare')}</ThemedText>
            ) : null}

            {/* 2. What changed */}
            {data.highlights.length > 0 ? (
              <>
                <ThemedText type="smallBold" style={styles.sectionTitle}>{t('plan.analyse.hl.title')}</ThemedText>
                <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                  {data.highlights.map((h, i) => {
                    const txt = highlightText(h);
                    const tone = txt.good ? colors.positive : colors.warning;
                    const isCat = h.kind === 'catUp' || h.kind === 'catDown';
                    return (
                      <Pressable
                        key={`${h.kind}-${isCat ? h.categoryId : ''}`}
                        disabled={!isCat}
                        onPress={() => (isCat ? openCategory(h.categoryId) : undefined)}
                        style={({ pressed }) => [styles.hlRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && { opacity: 0.6 }]}
                        accessibilityRole={isCat ? 'button' : 'text'}
                      >
                        <View style={[styles.hlIcon, { backgroundColor: `${tone}1F` }]}>
                          <Ionicons name={h.diff > 0 ? 'trending-up' : 'trending-down'} size={16} color={tone} />
                        </View>
                        <View style={styles.flex}>
                          <ThemedText type="smallBold">{txt.title}</ThemedText>
                          <ThemedText type="small" style={muted}>{txt.body}</ThemedText>
                        </View>
                        {isCat ? <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {/* 3. Where the income went */}
            <ThemedText type="smallBold" style={styles.sectionTitle}>{t('plan.analyse.alloc.title')}</ThemedText>
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              {alloc.income > 0 ? (
                <>
                  <View style={[styles.splitBar, { backgroundColor: colors.backgroundSelected }]}>
                    {allocParts
                      .filter((p) => p.value > 0)
                      .map((p) => (
                        <View key={p.id} style={{ flex: p.value, backgroundColor: p.color }} />
                      ))}
                  </View>
                  <View style={styles.allocList}>
                    {allocParts.map((p) => (
                      <View key={p.id} style={styles.allocRow}>
                        <View style={[styles.legendDot, { backgroundColor: p.color, borderColor: colors.divider, borderWidth: p.id === 'left' ? 1 : 0 }]} />
                        <ThemedText type="small" style={styles.flex}>{p.label}</ThemedText>
                        <ThemedText type="small" style={[muted, tabularNums]}>{ofIncome(p.value)}%</ThemedText>
                        <ThemedText type="smallBold" style={[styles.allocAmount, tabularNums]}>{money(p.value)}</ThemedText>
                      </View>
                    ))}
                  </View>
                  {alloc.left < 0 ? (
                    <ThemedText type="small" style={{ color: colors.negative }}>{t('plan.analyse.alloc.short', { amount: money(-alloc.left) })}</ThemedText>
                  ) : null}
                  {plannedForGoals > 0 ? (
                    <ThemedText type="small" style={muted}>{t('plan.analyse.alloc.goals', { amount: money(plannedForGoals) })}</ThemedText>
                  ) : null}
                  <ThemedText type="small" style={[muted, styles.allocNote]}>{t('plan.analyse.alloc.note')}</ThemedText>
                </>
              ) : (
                <ThemedText type="small" style={muted}>{t('plan.analyse.alloc.noIncome')}</ThemedText>
              )}
            </View>

            {/* 4. When the money moved */}
            <ThemedText type="smallBold" style={styles.sectionTitle}>{chartTitle}</ThemedText>
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <IncomeSpendingCombo
                key={`${period.id}-${grain}`}
                data={periods}
                hideAmounts={hideAmounts}
                showRate={grain === 'month'}
                labelOf={grain === 'week' ? (d, i) => (period.preset === '1M' ? t('plan.analyse.weekN', { n: i + 1 }) : dmShort((d as PeriodTotals).from)) : undefined}
                titleOf={grain === 'week' ? (d) => weekTitle(d as PeriodTotals) : undefined}
              />
            </View>
          </>
        }
        b={
          <>
            {/* 5. Where it went */}
            {data.categories.length > 0 ? (
              <>
                <ThemedText type="smallBold" style={styles.sectionTitle}>{t('plan.analyse.whereItGoes')}</ThemedText>
                <View style={[styles.card, styles.center, { backgroundColor: colors.backgroundElement }]}>
                  <Donut parts={catParts} size={180} stroke={24}>
                    <ThemedText type="small" style={muted}>{t('plan.analyse.spending')}</ThemedText>
                    <ThemedText style={styles.donutMoney} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {money(catSum)}
                    </ThemedText>
                  </Donut>
                  <View style={styles.chipsWrap}>
                    {donutCats.map((c) => (
                      <Pressable
                        key={c.categoryId}
                        onPress={() => openCategory(c.categoryId)}
                        style={({ pressed }) => [styles.catChip, { borderColor: colors.divider }, pressed && { opacity: 0.6 }]}
                        accessibilityRole="button"
                      >
                        <View style={[styles.legendDot, { backgroundColor: getCategory(c.categoryId)?.color ?? '#8E8E93' }]} />
                        <ThemedText type="small" numberOfLines={1}>
                          {categoryName(c.categoryId)} · {p1(c.share)}%
                        </ThemedText>
                      </Pressable>
                    ))}
                    {restTotal > 0 ? (
                      <View style={[styles.catChip, { borderColor: colors.divider }]}>
                        <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
                        <ThemedText type="small">
                          {t('plan.analyse.othersSlice')} · {p1((restTotal / Math.max(1, catSum)) * 100)}%
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                  {shownCategories.map((row, i) => {
                    const category = getCategory(row.categoryId);
                    const color = category?.color ?? '#8E8E93';
                    const ch = snap.comparable ? change(row.change, false) : null;
                    const changeText = !snap.comparable ? '' : row.change === null ? t('plan.analyse.new') : ch?.text ?? '';
                    return (
                      <Pressable
                        key={row.categoryId}
                        onPress={() => openCategory(row.categoryId)}
                        style={({ pressed }) => [styles.catRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && { opacity: 0.6 }]}
                        accessibilityRole="button"
                      >
                        <CategoryIcon icon={category?.icon ?? 'help-circle'} color={color} size={42} />
                        <View style={styles.flex}>
                          <View style={styles.rowBetween}>
                            <ThemedText numberOfLines={2} style={styles.flex}>{categoryName(row.categoryId)}</ThemedText>
                            <ThemedText style={{ fontWeight: '700', ...tabularNums }}>{money(row.total)}</ThemedText>
                          </View>
                          <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                            <View style={[styles.fill, { width: `${Math.max(row.share, 2)}%`, backgroundColor: color }]} />
                          </View>
                          <View style={styles.rowBetween}>
                            <ThemedText type="small" style={[styles.flex, muted]} numberOfLines={2}>
                              {t('plan.analyse.shareOfSpending', { share: p1(row.share) })}
                            </ThemedText>
                            {changeText ? (
                              <ThemedText type="small" style={{ color: ch?.color ?? colors.textSecondary, fontWeight: '700' }}>{changeText}</ThemedText>
                            ) : null}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                      </Pressable>
                    );
                  })}
                  {data.categories.length > COLLAPSED_CATEGORIES ? (
                    <Pressable onPress={() => setShowAllCategories((v) => !v)} style={styles.moreButton}>
                      <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                        {showAllCategories ? t('plan.analyse.showLess') : t('plan.analyse.showAll', { count: data.categories.length })}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
                <ThemedText type="small" style={[styles.footnote, muted]}>
                  {t('plan.analyse.tapCategory')} {snap.comparable ? compareNote : ''}
                </ThemedText>
              </>
            ) : (
              <View style={[styles.listCard, styles.emptyList, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={muted}>{t('plan.analyse.noSpending')}</ThemedText>
              </View>
            )}

            {/* 6. Habits, on demand (the full picture is in Terperinci) */}
            {summary.spending > 0 ? (
              <>
                <Pressable onPress={() => setShowHabits((v) => !v)} style={styles.disclosure} accessibilityRole="button" accessibilityState={{ expanded: showHabits }}>
                  <ThemedText type="smallBold" style={{ color: colors.accent }}>
                    {showHabits ? t('plan.analyse.habitsHide') : t('plan.analyse.habitsShow')}
                  </ThemedText>
                  <Ionicons name={showHabits ? 'chevron-up' : 'chevron-down'} size={16} color={colors.accent} />
                </Pressable>
                {showHabits ? (
                  <>
                    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                      <ThemedText type="small" style={muted}>{t('plan.analyse.avgByWeekday')}</ThemedText>
                      <View style={styles.weekRow}>
                        {data.weekdays.map((d) => {
                          const isTop = d.day === priciestDay;
                          return (
                            <View key={d.day} style={styles.weekCol}>
                              <View style={styles.weekBarSlot}>
                                <View
                                  style={[
                                    styles.weekBar,
                                    {
                                      height: Math.max(d.average > 0 ? 4 : 0, maxWeekday > 0 ? (d.average / maxWeekday) * 72 : 0),
                                      backgroundColor: isTop ? colors.accent : colors.backgroundSelected,
                                    },
                                  ]}
                                />
                              </View>
                              <ThemedText type="small" style={{ fontSize: FontSize.micro, color: isTop ? colors.text : colors.textSecondary, fontWeight: isTop ? '700' : '400' }}>
                                {weekdayShort(d.day)}
                              </ThemedText>
                            </View>
                          );
                        })}
                      </View>
                      {priciestDay !== undefined ? (
                        <ThemedText type="small" style={muted}>
                          {t('plan.analyse.priciestDay', { day: weekdayLong(priciestDay), amount: money(maxWeekday) })}
                        </ThemedText>
                      ) : null}
                    </View>
                    {data.biggest ? (
                      <View style={[styles.card, styles.biggest, { backgroundColor: colors.backgroundElement }]}>
                        <CategoryIcon
                          icon={getCategory(data.biggest.categoryId)?.icon ?? 'help-circle'}
                          color={getCategory(data.biggest.categoryId)?.color ?? '#8E8E93'}
                          size={42}
                        />
                        <View style={styles.flex}>
                          <ThemedText type="small" style={muted}>{t('plan.analyse.biggest')}</ThemedText>
                          <ThemedText numberOfLines={1} style={{ fontWeight: '600' }}>{data.biggest.title}</ThemedText>
                          <ThemedText type="small" style={muted}>
                            {dayLabel(data.biggest.date)} · {monthLabel(data.biggest.date.slice(0, 7), 'short')}
                          </ThemedText>
                        </View>
                        <ThemedText style={{ color: colors.negative, fontWeight: '700' }}>{money(data.biggest.amount)}</ThemedText>
                      </View>
                    ) : null}
                    {data.titles.length > 0 ? (
                      <>
                        <ThemedText type="smallBold" style={styles.sectionTitle}>{t('plan.analyse.mostSpent')}</ThemedText>
                        <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                          {data.titles.map((row, i) => (
                            <View key={row.title} style={[styles.titleRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                              <ThemedText type="smallBold" style={[styles.rank, muted]}>{i + 1}</ThemedText>
                              <View style={styles.flex}>
                                <ThemedText numberOfLines={1}>{row.title}</ThemedText>
                                <ThemedText type="small" style={muted}>{tp('plan.analyse.times', row.count)}</ThemedText>
                              </View>
                              <ThemedText style={{ fontWeight: '700', ...tabularNums }}>{money(row.total)}</ThemedText>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

            {/* Health score: the full breakdown lives in Insight */}
            {score ? (
              <Pressable
                onPress={onOpenInsight}
                style={({ pressed }) => [styles.card, styles.healthLink, { backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
              >
                <View style={[styles.healthDot, { backgroundColor: scoreColor }]}>
                  <ThemedText style={styles.healthNum}>{Math.round(score.total)}</ThemedText>
                </View>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{t('plan.analyse.health')}</ThemedText>
                  <ThemedText type="small" style={muted}>
                    {t(`fc.score.grade.${score.grade}` as TKey)} · {t('plan.analyse.healthMore')}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </>
        }
      />
      <RecordsSheet query={records} entries={entries} onClose={() => setRecords(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },

  card: { borderRadius: Radius.lg, padding: 20, marginBottom: Spacing.three },
  empty: { alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.three },
  tile: { flexBasis: '48%', flexGrow: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: 2, minHeight: 104 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // A set width stops iPhone from shrinking "fit to width" text far too much.
  tileValue: { alignSelf: 'stretch', fontSize: FontSize.title, lineHeight: 28, fontWeight: '700', marginVertical: 2, ...tabularNums },

  hlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  hlIcon: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },

  splitBar: { flexDirection: 'row', height: 12, borderRadius: Radius.pill, overflow: 'hidden', gap: 2 },
  allocList: { marginTop: Spacing.three, gap: Spacing.two },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  allocAmount: { minWidth: 92, textAlign: 'right' },
  allocNote: { marginTop: Spacing.two, fontSize: FontSize.caption, lineHeight: 16 },

  healthLink: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  healthDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  healthNum: { color: '#fff', fontWeight: '800', fontSize: FontSize.body },

  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  emptyList: { padding: 20, alignItems: 'center' },
  footnote: { fontSize: FontSize.caption, lineHeight: 16, marginBottom: Spacing.three },
  disclosure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginBottom: Spacing.two },

  donutMoney: { fontSize: FontSize.heading, fontWeight: '800', ...tabularNums },
  legendDot: { width: 10, height: 10, borderRadius: Radius.pill },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: Spacing.three },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden', marginVertical: 6 },
  fill: { height: 6, borderRadius: Radius.pill },
  moreButton: { alignItems: 'center', paddingVertical: 12 },

  weekRow: { flexDirection: 'row', marginTop: Spacing.three, marginBottom: Spacing.two },
  weekCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekBarSlot: { height: 72, justifyContent: 'flex-end' },
  weekBar: { width: 18, borderTopLeftRadius: 5, borderTopRightRadius: 5 },

  biggest: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rank: { width: 18, textAlign: 'center' },
});
