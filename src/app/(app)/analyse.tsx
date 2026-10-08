import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalyseDeep } from '@/components/analyse-deep';
import { AnalyseForecast } from '@/components/analyse-forecast';
import { AnalyseInsight } from '@/components/analyse-insight';
import { CategoryIcon } from '@/components/category-icon';
import { IncomeSpendingChart } from '@/components/income-spending-chart';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName as categoryLabel, subcategoryName } from '@/i18n/data';
import { weekdayLong, weekdayShort } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { formatPct } from '@/utils/insights';
import { dayLabel, monthLabel, toDateKey } from '@/utils/dates';
import {
  biggestExpense,
  buildInsights,
  categoryTrends,
  currentWindow,
  monthKeysEnding,
  monthlyTotals,
  previousWindow,
  topTitles,
  weekdayPattern,
  windowSummary,
} from '@/utils/insights';

const MASK = 'RM ••••';
const RANGES = [3, 6, 12] as const;
const COLLAPSED_CATEGORIES = 5;

export default function AnalyseScreen() {
  const colors = useTheme();
  const { t, tp, lang } = useT();
  const { transactions, ready } = useTransactions();
  const { getCategory } = useCategories();
  const { hideAmounts } = usePrivacy();

  const [months, setMonths] = useState<(typeof RANGES)[number]>(6);
  const [tab, setTab] = useState<'overview' | 'deep' | 'forecast' | 'insight'>('overview');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const todayKey = toDateKey(new Date());
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
      categories: categoryTrends(transactions, w, prev),
      weekdays: weekdayPattern(transactions, w),
      biggest: biggestExpense(transactions, w),
      titles: topTitles(transactions, w, 5),
    };
  }, [transactions, todayKey, months]);

  // Insights read money as text, so hidden amounts are masked inside the sentence too.
  const insights = useMemo(
    () => buildInsights({ transactions, todayKey, months, categoryName, money }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, todayKey, months, hideAmounts, getCategory, lang],
  );

  const { summary } = data;
  const hasData = data.summary.income > 0 || data.summary.spending > 0;
  const netColor = summary.net < 0 ? colors.negative : summary.net > 0 ? colors.positive : colors.text;
  const shownCategories = showAllCategories ? data.categories : data.categories.slice(0, COLLAPSED_CATEGORIES);
  const maxWeekday = Math.max(0, ...data.weekdays.map((d) => d.average));
  const priciestDay = maxWeekday > 0 ? data.weekdays.find((d) => d.average === maxWeekday)?.day : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.titleBlock}>
            <ThemedText type="title" style={styles.heading}>
              {t('plan.analyse.title')}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.analyse.subtitle')}
            </ThemedText>
          </View>
          {!(ready) ? <ScreenSkeleton variant="cards" /> : (
          <>

          {/* Overview / Deep dive */}
          <View style={[styles.segment, { backgroundColor: colors.backgroundElement }]}>
            {(['overview', 'deep', 'forecast', 'insight'] as const).map((id) => {
              const active = id === tab;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTab(id)}
                  style={[styles.segmentItem, active && { backgroundColor: colors.accent }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <ThemedText type="small" style={{ fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
                    {id === 'overview' ? t('plan.analyse.tabOverview') : id === 'deep' ? t('plan.analyse.tabDeep') : id === 'forecast' ? t('fc.tab') : t('fc.insight.tab')}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Range */}
          <View style={[styles.segment, { backgroundColor: colors.backgroundElement }]}>
            {RANGES.map((r) => {
              const active = r === months;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    setMonths(r);
                    setOpenCategory(null);
                    setShowAllCategories(false);
                  }}
                  style={[styles.segmentItem, active && { backgroundColor: colors.accent }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t('plan.analyse.rangeA11y', { n: r })}
                >
                  <ThemedText type="small" style={{ fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
                    {t('plan.analyse.rangeLabel', { n: r })}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {tab === 'insight' ? (
            <AnalyseInsight todayKey={todayKey} />
          ) : tab === 'forecast' ? (
            <AnalyseForecast months={months} todayKey={todayKey} />
          ) : tab === 'deep' ? (
            <AnalyseDeep months={months} todayKey={todayKey} />
          ) : !hasData ? (
            <View style={[styles.card, styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="bar-chart-outline" size={32} color={colors.textSecondary} />
              <ThemedText style={styles.emptyTitle}>{t('plan.analyse.emptyTitle')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {t('plan.analyse.emptyBody')}
              </ThemedText>
            </View>
          ) : (
            <>
              {/* Summary */}
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('plan.analyse.keptIn', { n: months })}
                </ThemedText>
                <ThemedText style={[styles.big, { color: netColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {hideAmounts ? MASK : `${summary.net < 0 ? '-' : ''}${formatMoney(summary.net)}`}
                </ThemedText>
                {summary.savingsRate !== null ? (
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {t('plan.analyse.ofIncome', { rate: summary.savingsRate })}
                  </ThemedText>
                ) : null}
                <View style={[styles.tiles, { borderTopColor: colors.divider }]}>
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('common.income')}
                    </ThemedText>
                    <ThemedText style={[styles.tileValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit>
                      {money(summary.income)}
                    </ThemedText>
                  </View>
                  <View style={[styles.tileDivider, { backgroundColor: colors.divider }]} />
                  <View style={styles.tile}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {t('plan.analyse.spending')}
                    </ThemedText>
                    <ThemedText style={[styles.tileValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit>
                      {money(summary.spending)}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Insights */}
              {insights.length > 0 ? (
                <>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    {t('plan.analyse.standsOut')}
                  </ThemedText>
                  <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                    {insights.map((item, i) => {
                      const icon = item.tone === 'good' ? 'trending-down' : item.tone === 'bad' ? 'trending-up' : 'bulb-outline';
                      const tint = item.tone === 'good' ? colors.positive : item.tone === 'bad' ? colors.negative : colors.accent;
                      return (
                        <View
                          key={item.id}
                          style={[styles.insightRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
                        >
                          <View style={[styles.insightIcon, { backgroundColor: `${tint}26` }]}>
                            <Ionicons name={icon} size={16} color={tint} />
                          </View>
                          <ThemedText style={styles.flex}>{item.text}</ThemedText>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {/* Income vs spending */}
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {t('plan.analyse.incomeVsSpending')}
              </ThemedText>
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <IncomeSpendingChart key={months} data={data.totals} hideAmounts={hideAmounts} />
              </View>

              {/* Categories */}
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {t('plan.analyse.whereItGoes')}
              </ThemedText>
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
                              <ThemedText numberOfLines={1} style={styles.flex}>
                                {categoryName(row.categoryId)}
                              </ThemedText>
                              <ThemedText style={{ fontWeight: '700' }}>{money(row.total)}</ThemedText>
                            </View>
                            <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
                              <View style={[styles.fill, { width: `${Math.max(row.share, 2)}%`, backgroundColor: color }]} />
                            </View>
                            <View style={styles.rowBetween}>
                              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                                {t('plan.analyse.shareOfSpending', { share: row.share })}
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
                  {t('plan.analyse.compareNote', { months })}
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
                            <ThemedText type="small" style={{ fontSize: 11, color: isTop ? colors.text : colors.textSecondary, fontWeight: isTop ? '700' : '400' }}>
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
                            <ThemedText style={{ fontWeight: '700' }}>{money(row.total)}</ThemedText>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          )}

          <ThemedText type="small" style={[styles.footnote, styles.center, { color: colors.textSecondary }]}>
            {t('plan.analyse.transfersNote')}
          </ThemedText>
          </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },

  titleBlock: { paddingVertical: Spacing.three, gap: 2 },
  heading: { fontSize: 34, lineHeight: 40 },

  segment: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: Spacing.three },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },

  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three },
  big: { fontSize: 34, lineHeight: 42, fontWeight: '700', marginTop: 4 },
  tiles: { flexDirection: 'row', marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  tile: { flex: 1, alignItems: 'center' },
  tileValue: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  tileDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },

  sectionTitle: { fontSize: 16, marginBottom: Spacing.two, marginTop: Spacing.two },
  listCard: { borderRadius: 20, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  emptyList: { padding: 20, alignItems: 'center' },
  footnote: { fontSize: 12, lineHeight: 16, marginBottom: Spacing.three },
  center: { textAlign: 'center' },

  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  insightIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginVertical: 6 },
  fill: { height: 6, borderRadius: 3 },
  subs: { paddingLeft: 54, paddingBottom: 12, gap: 6 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  subNote: { fontSize: 12, marginTop: 2 },
  moreButton: { alignItems: 'center', paddingVertical: 12 },

  weekRow: { flexDirection: 'row', marginTop: Spacing.three, marginBottom: Spacing.two },
  weekCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekBarSlot: { height: 72, justifyContent: 'flex-end' },
  weekBar: { width: 18, borderTopLeftRadius: 5, borderTopRightRadius: 5 },

  biggest: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rank: { width: 18, textAlign: 'center' },

  empty: { alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
});
