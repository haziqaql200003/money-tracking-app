import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Donut } from '@/components/charts/donut';
import { IncomeSpendingCombo } from '@/components/charts/income-spending-combo';
import { CategoryIcon } from '@/components/category-icon';
import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useHealthScore } from '@/hooks/use-health-score';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName as categoryLabel, subcategoryName } from '@/i18n/data';
import { monthShort, weekdayLong, weekdayShort } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { dayLabel, monthLabel } from '@/utils/dates';
import { fixedVsEveryday } from '@/utils/deep-insights';
import {
  formatPct,
  biggestExpense,
  categoryTrends,
  currentWindow,
  monthKeysEnding,
  monthlyTotals,
  previousWindow,
  topTitles,
  weekdayPattern,
  windowSummary,
} from '@/utils/insights';
import { p1, r1 } from '@/utils/percent';
import { grainsFor, periodsFor, periodTotals, type Grain, type PeriodTotals } from '@/utils/periods';

const MASK = 'RM ••••';
const COLLAPSED_CATEGORIES = 5;
const DONUT_SLICES = 5;

type Props = { months: number; todayKey: string; onOpenInsight: () => void };

/**
 * The Overview tab of Analyse, in the order people ask: how much did I keep, when did the money move
 * (by week or day for one month, by week for three, by month for six and twelve), where did it go, and habits.
 */
export function AnalyseOverview({ months, todayKey, onOpenInsight }: Props) {
  const colors = useTheme();
  const { t, tp } = useT();
  const { transactions } = useTransactions();
  const { getCategory } = useCategories();
  const { hideAmounts } = usePrivacy();
  const { score } = useHealthScore(todayKey);

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  // One month by week, longer ranges by month.
  const grain: Grain = grainsFor(months)[0];

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const categoryName = (id: string) => {
    const c = getCategory(id);
    return c ? categoryLabel(c) : t('cat.other');
  };

  const data = useMemo(() => {
    const w = currentWindow(todayKey, months);
    const prev = previousWindow(w, months);
    return {
      w,
      totals: monthlyTotals(transactions, monthKeysEnding(todayKey, months)),
      summary: windowSummary(transactions, w),
      split: fixedVsEveryday(transactions, w),
      categories: categoryTrends(transactions, w, prev),
      weekdays: weekdayPattern(transactions, w),
      biggest: biggestExpense(transactions, w),
      titles: topTitles(transactions, w, 5),
    };
  }, [transactions, todayKey, months]);
  const periods = periodTotals(transactions, periodsFor(todayKey, months, grain), todayKey);

  const { summary } = data;
  const hasData = data.summary.income > 0 || data.summary.spending > 0;
  const netColor = summary.net < 0 ? colors.negative : summary.net > 0 ? colors.positive : colors.text;
  const shownCategories = showAllCategories ? data.categories : data.categories.slice(0, COLLAPSED_CATEGORIES);
  const maxWeekday = Math.max(0, ...data.weekdays.map((d) => d.average));
  const priciestDay = maxWeekday > 0 ? data.weekdays.find((d) => d.average === maxWeekday)?.day : undefined;
  const muted = { color: colors.textSecondary };
  const pct = (n: number) => r1(n);

  /* Health score */
  const scoreColor = score ? (score.total >= 80 ? colors.positive : score.total >= 60 ? colors.accent : score.total >= 40 ? colors.warning : colors.negative) : colors.textSecondary;

  /* Where the income went */
  const income = summary.income;
  const kept = Math.max(0, income - summary.spending);
  const splitParts = [
    { id: 'fixed', label: t('plan.analyse.split.fixed'), value: data.split.fixed, color: colors.accent },
    { id: 'everyday', label: t('plan.analyse.split.everyday'), value: data.split.everyday, color: colors.gold },
    { id: 'kept', label: t('plan.analyse.split.kept'), value: kept, color: colors.positive },
  ];
  const ofIncome = (v: number) => (income > 0 ? pct((v / income) * 100) : 0);
  const spentPct = ofIncome(summary.spending);

  /* Category donut: the biggest few, the rest folded into one slice */
  const donutCats = data.categories.slice(0, DONUT_SLICES);
  const restTotal = data.categories.slice(DONUT_SLICES).reduce((s, c) => s + c.total, 0);
  const catParts = [
    ...donutCats.map((c) => ({ id: c.categoryId, value: c.total, color: getCategory(c.categoryId)?.color ?? '#8E8E93' })),
    ...(restTotal > 0 ? [{ id: '__rest', value: restTotal, color: colors.textSecondary }] : []),
  ];

  /* The chart: labels and headings for each kind of bar */
  const dm = (k: string) => `${Number(k.slice(8, 10))} ${monthShort(Number(k.slice(5, 7)) - 1)}`;
  const dmShort = (k: string) => `${Number(k.slice(8, 10))}/${Number(k.slice(5, 7))}`;
  const weekTitle = (d: PeriodTotals) => (d.from === d.to ? dm(d.from) : `${dm(d.from)} – ${dm(d.to)}`);
  const chartTitle = grain === 'week' ? t('plan.analyse.chart.week') : t('plan.analyse.incomeVsSpending');

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

  return (
    <>
      {/* How much was kept */}
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {months === 1 ? t('plan.analyse.keptInOne') : t('plan.analyse.keptIn', { n: months })}
        </ThemedText>
        <ThemedText style={[styles.big, { color: netColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {hideAmounts ? MASK : `${summary.net < 0 ? '-' : ''}${formatMoney(summary.net)}`}
        </ThemedText>
        {summary.savingsRate !== null ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('plan.analyse.ofIncome', { rate: p1(summary.savingsRate) })}
          </ThemedText>
        ) : null}
        <View style={[styles.tiles, { borderTopColor: colors.divider }]}>
          <View style={styles.tile}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('common.income')}
            </ThemedText>
            <ThemedText style={[styles.tileValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {money(summary.income)}
            </ThemedText>
          </View>
          <View style={[styles.tileDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.tile}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.analyse.spending')}
            </ThemedText>
            <ThemedText style={[styles.tileValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {money(summary.spending)}
            </ThemedText>
          </View>
        </View>

        {/* Where the income went, as one bar: fixed bills, everyday spending, kept */}
        {income > 0 ? (
          <View style={styles.splitBlock}>
            <View style={[styles.splitBar, { backgroundColor: colors.backgroundSelected }]}>
              {splitParts
                .filter((p) => p.value > 0)
                .map((p) => (
                  <View key={p.id} style={{ flex: p.value, backgroundColor: p.color }} />
                ))}
            </View>
            <View style={styles.splitLegend}>
              {splitParts.map((p) => (
                <View key={p.id} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                  <ThemedText type="small" style={muted}>
                    {p.label}
                  </ThemedText>
                  <ThemedText type="smallBold" style={tabularNums}>
                    {p1(ofIncome(p.value))}%
                  </ThemedText>
                </View>
              ))}
            </View>
            {summary.spending > income ? (
              <ThemedText type="small" style={{ color: colors.negative }}>
                {t('plan.analyse.split.over', { over: p1(spentPct - 100) })}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* When the money moved */}
      <View style={styles.chartHead}>
        <ThemedText type="smallBold" style={[styles.sectionTitle, styles.flex]}>
          {chartTitle}
        </ThemedText>
      </View>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <IncomeSpendingCombo
            key={`${months}-${grain}`}
            data={periods}
            hideAmounts={hideAmounts}
            showRate={grain === 'month'}
            labelOf={grain === 'week' ? (d, i) => (months === 1 ? t('plan.analyse.weekN', { n: i + 1 }) : dmShort((d as PeriodTotals).from)) : undefined}
            titleOf={grain === 'week' ? (d) => weekTitle(d as PeriodTotals) : undefined}
          />
      </View>

      {/* Category donut */}
      {data.categories.length > 0 ? (
        <>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {t('plan.analyse.whereItGoes')}
          </ThemedText>
          <View style={[styles.card, styles.center, { backgroundColor: colors.backgroundElement }]}>
            <Donut parts={catParts} size={180} stroke={24} selectedId={openCategory}>
              <ThemedText type="small" style={muted}>{t('plan.analyse.spending')}</ThemedText>
              <ThemedText style={styles.donutMoney} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {money(summary.spending)}
              </ThemedText>
            </Donut>
            <View style={styles.chipsWrap}>
              {donutCats.map((c) => (
                <Pressable
                  key={c.categoryId}
                  onPress={() => setOpenCategory(openCategory === c.categoryId ? null : c.categoryId)}
                  style={[styles.catChip, { borderColor: openCategory === c.categoryId ? colors.text : colors.divider }]}
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
                    {t('plan.analyse.othersSlice')} · {p1((restTotal / Math.max(1, summary.spending)) * 100)}%
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </>
      ) : null}

      {/* Categories */}
          {/* Categories */}
          
          {data.categories.length === 0 ? (
            <View style={[styles.listCard, styles.emptyList, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t('plan.analyse.noSpending')}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
              {shownCategories.map((row, i) => {
                const category = getCategory(row.categoryId);
                const color = category?.color ?? '#8E8E93';
                const open = openCategory === row.categoryId;
                // Spending going UP is the bad direction, so up = red, down = green.
                const changeColor = row.change === null ? colors.textSecondary : row.change > 0 ? colors.negative : row.change < 0 ? colors.positive : colors.textSecondary;
                const changeText = row.change === null ? t('plan.analyse.new') : row.change === 0 ? '0%' : `${row.change > 0 ? '▲' : '▼'} ${formatPct(row.change)}`;
                return (
                  <View key={row.categoryId} style={i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }}>
                    <Pressable
                      onPress={() => setOpenCategory(open ? null : row.categoryId)}
                      style={({ pressed }) => [styles.catRow, pressed && { opacity: 0.6 }]}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                    >
                      <CategoryIcon icon={category?.icon ?? 'help-circle'} color={color} size={42} />
                      <View style={styles.flex}>
                        <View style={styles.rowBetween}>
                          <ThemedText numberOfLines={2} style={styles.flex}>
                            {categoryName(row.categoryId)}
                          </ThemedText>
                          <ThemedText style={{ fontWeight: '700', ...tabularNums }}>{money(row.total)}</ThemedText>
                        </View>
                        <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                          <View style={[styles.fill, { width: `${Math.max(row.share, 2)}%`, backgroundColor: color }]} />
                        </View>
                        <View style={styles.rowBetween}>
                          <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]} numberOfLines={2}>
                            {t('plan.analyse.shareOfSpending', { share: p1(row.share) })}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: changeColor, fontWeight: '700' }}>
                            {changeText}
                          </ThemedText>
                        </View>
                      </View>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                    </Pressable>

                    {open ? (
                      <View style={styles.subs}>
                        {row.subs.map((s) => (
                          <View key={s.name} style={styles.subRow}>
                            <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
                              {subcategoryName(s.name)}
                            </ThemedText>
                            <ThemedText type="small">{money(s.total)}</ThemedText>
                          </View>
                        ))}
                        {row.previous > 0 ? (
                          <ThemedText type="small" style={[styles.subNote, { color: colors.textSecondary }]}>
                            {t('plan.analyse.before', { amount: money(row.previous) })}
                          </ThemedText>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
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
          )}
          {data.categories.length > 0 ? (
            <ThemedText type="small" style={[styles.footnote, { color: colors.textSecondary }]}>
              {months === 1 ? t('plan.analyse.compareNoteOne') : t('plan.analyse.compareNote', { months })}
            </ThemedText>
          ) : null}

          {/* Patterns */}
          {data.summary.spending > 0 ? (
            <>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {t('plan.analyse.habits')}
              </ThemedText>
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('plan.analyse.avgByWeekday')}
                </ThemedText>
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
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
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
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('plan.analyse.biggest')}
                    </ThemedText>
                    <ThemedText numberOfLines={1} style={{ fontWeight: '600' }}>
                      {data.biggest.title}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {dayLabel(data.biggest.date)} · {monthLabel(data.biggest.date.slice(0, 7), 'short')}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: colors.negative, fontWeight: '700' }}>{money(data.biggest.amount)}</ThemedText>
                </View>
              ) : null}

              {data.titles.length > 0 ? (
                <>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    {t('plan.analyse.mostSpent')}
                  </ThemedText>
                  <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                    {data.titles.map((row, i) => (
                      <View
                        key={row.title}
                        style={[styles.titleRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
                      >
                        <ThemedText type="smallBold" style={[styles.rank, { color: colors.textSecondary }]}>
                          {i + 1}
                        </ThemedText>
                        <View style={styles.flex}>
                          <ThemedText numberOfLines={1}>{row.title}</ThemedText>
                          <ThemedText type="small" style={{ color: colors.textSecondary }}>
                            {tp('plan.analyse.times', row.count)}
                          </ThemedText>
                        </View>
                        <ThemedText style={{ fontWeight: '700', ...tabularNums }}>{money(row.total)}</ThemedText>
                      </View>
                    ))}
                  </View>
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
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  gapTop: { marginTop: Spacing.two },

  card: { borderRadius: Radius.lg, padding: 20, marginBottom: Spacing.three },
  big: { fontSize: FontSize.display, lineHeight: 42, fontWeight: '700', marginTop: 4 },
  tiles: { flexDirection: 'row', marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  tile: { flex: 1, alignItems: 'center' },
  // The figure spans the whole tile. Without a set width, iPhone shrinks text that "fits to width" far too much.
  tileValue: { alignSelf: 'stretch', textAlign: 'center', fontSize: FontSize.heading, lineHeight: 24, fontWeight: '700', marginTop: 2, ...tabularNums },
  tileDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  splitBlock: { marginTop: Spacing.three, gap: 8 },
  splitBar: { flexDirection: 'row', height: 10, borderRadius: Radius.pill, overflow: 'hidden', gap: 2 },
  splitLegend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  healthLink: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  healthDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  healthNum: { color: '#fff', fontWeight: '800', fontSize: FontSize.body },

  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  emptyList: { padding: 20, alignItems: 'center' },
  footnote: { fontSize: FontSize.caption, lineHeight: 16, marginBottom: Spacing.three },

  healthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  grade: { fontSize: FontSize.heading, fontWeight: '800' },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factorLabel: { width: 96, fontSize: FontSize.caption },
  factorTrack: { flex: 1, height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.two },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  donutBig: { fontSize: FontSize.title, fontWeight: '800' },
  donutMoney: { fontSize: FontSize.heading, fontWeight: '800', ...tabularNums },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: Radius.pill },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: Spacing.three },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },
  bubbleInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.two, marginBottom: 6 },

  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  insightIcon: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden', marginVertical: 6 },
  fill: { height: 6, borderRadius: Radius.pill },
  subs: { paddingLeft: 54, paddingBottom: 12, gap: 6 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  subNote: { fontSize: FontSize.caption, marginTop: 2 },
  moreButton: { alignItems: 'center', paddingVertical: 12 },

  weekRow: { flexDirection: 'row', marginTop: Spacing.three, marginBottom: Spacing.two },
  weekCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekBarSlot: { height: 72, justifyContent: 'flex-end' },
  weekBar: { width: 18, borderTopLeftRadius: 5, borderTopRightRadius: 5 },

  biggest: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rank: { width: 18, textAlign: 'center' },

  empty: { alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: FontSize.body, fontWeight: '700' },
});
