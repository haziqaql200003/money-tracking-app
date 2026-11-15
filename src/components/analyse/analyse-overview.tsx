import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { RecordsSheet, type RecordsQuery } from '@/components/analyse/records-sheet';
import { BigAmount } from '@/components/analyse/ui/big-amount';
import { SparkLine } from '@/components/analyse/ui/spark-line';
import { ChangeChip, StatusChip } from '@/components/analyse/ui/status-chip';
import { Split } from '@/components/desktop/split';
import { CategoryIcon } from '@/components/ui/category-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useHealthScore } from '@/hooks/use-health-score';
import { useLedger } from '@/hooks/use-ledger';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName as categoryLabel } from '@/i18n/data';
import { monthShort } from '@/i18n/format';
import { formatMoney } from '@/utils/currency';
import { shiftCycle } from '@/utils/cycle';
import type { FahamPeriod } from '@/utils/faham-period';
import { activeGoals } from '@/utils/goals';
import { categoryTrends, formatPct } from '@/utils/insights';
import { p1 } from '@/utils/percent';
import { allocation, highlights, incomeSources, keptByDay, snapshot, type Highlight } from '@/utils/ringkasan';
import { looksLikeSavings } from '@/utils/saved';

const MASK = 'RM ••••';
const TOP_CATEGORIES = 5;
const BAR_SLICES = 4;
const FALLBACK = '#8E8E93';
const THING_W = 240;

type Props = { period: FahamPeriod; todayKey: string; onOpenInsight: () => void; onOpenDeep: () => void };

/**
 * Ringkasan (3.8.1, design 1): the answer first, the detail after.
 *   1. Hero: what you kept, its share of income, the change against before, a day-by-day line, in / out / health.
 *   2. Things to know: up to three highlights you swipe through.
 *   3. Where it went: one stacked bar and the top categories with their change; tap one for its records.
 *   4. Where the income went, money in, and what is available now.
 * The weekly chart and the habits moved to Terperinci. All income and spending figures are ledger entries
 * (utils/ledger.ts); "available now" is a balance, so it is not.
 */
export function AnalyseOverview({ period, todayKey, onOpenInsight, onOpenDeep }: Props) {
  const colors = useTheme();
  const { t, tp } = useT();
  const { entries, moved } = useLedger();
  const { transactions: raw, transfers, accounts, accountBalance } = useTransactions();
  const { goals, goalEntries } = usePlan();
  const { getCategory } = useCategories();
  const { hideAmounts } = usePrivacy();
  const { score } = useHealthScore(todayKey);
  const [showAll, setShowAll] = useState(false);
  const [showAvailableNote, setShowAvailableNote] = useState(false);
  const [records, setRecords] = useState<RecordsQuery | null>(null);

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
      snap,
      highlights: highlights(entries, period, snap),
      alloc: allocation({ entries, moved, transfers, isSavingsAccount: isSavings, window: w }),
      categories: categoryTrends(entries, w, period.previous),
      line: keptByDay(entries, w),
      incomeBy: incomeSources(entries, w),
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

  const { snap, alloc } = data;
  const summary = snap.now;
  const hasData = summary.income > 0 || summary.spending > 0;
  const openCategory = (categoryId: string) => setRecords({ categoryId, window: period.window });

  if (!hasData) {
    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <EmptyState icon="bar-chart-outline" title={t('plan.analyse.emptyTitle')} message={t('plan.analyse.emptyBody')} />
      </View>
    );
  }

  /* 1. Hero */
  const keptTitle =
    period.preset === 'custom'
      ? t('plan.analyse.keptRange')
      : period.preset === 'YTD'
        ? t('plan.analyse.keptYtd')
        : period.months === 1
          ? t('plan.analyse.keptInOne')
          : t('plan.analyse.keptIn', { n: period.months });
  const vsName = period.cycleKey ? monthShort(Number(shiftCycle(period.cycleKey, -1).slice(5, 7)) - 1) : null;
  const diff = snap.netDiff;
  const onAccentSoft = colors.onHeroSoft;
  const ringColor = score ? (score.total >= 60 ? '#7FD8B2' : score.total >= 40 ? '#F2C66B' : '#F6A598') : colors.onAccent;

  /* 2. Things to know */
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

  /* 3. Where it went */
  const catTotal = data.categories.reduce((s, c) => s + c.total, 0);
  const barCats = data.categories.slice(0, BAR_SLICES);
  const barRest = Math.max(0, catTotal - barCats.reduce((s, c) => s + c.total, 0));
  const shownCats = showAll ? data.categories : data.categories.slice(0, TOP_CATEGORIES);

  /* 4. Where the income went */
  const allocParts = [
    { id: 'fixed', label: t('plan.analyse.alloc.fixed'), value: alloc.fixed, color: colors.accent },
    { id: 'everyday', label: t('plan.analyse.alloc.everyday'), value: Math.max(0, alloc.everyday), color: colors.gold },
    { id: 'saved', label: t('plan.analyse.alloc.saved'), value: alloc.saved, color: colors.positive },
    { id: 'left', label: t('plan.analyse.alloc.left'), value: Math.max(0, alloc.left), color: colors.backgroundSelected },
  ];
  const ofIncome = (v: number) => (alloc.income > 0 ? p1((v / alloc.income) * 100) : 0);

  return (
    <>
      <Split
        a={
          <>
            {/* 1. Hero */}
            <View style={[styles.hero, { backgroundColor: colors.hero }]}>
              <ThemedText type="smallBold" style={{ color: onAccentSoft }}>
                {keptTitle}
              </ThemedText>
              <BigAmount amount={summary.net} size="hero" color={colors.onAccent} countUp />
              <View style={styles.heroChips}>
                {summary.savingsRate !== null ? (
                  <View style={[styles.heroChip, styles.heroChipGlass]}>
                    <ThemedText type="small" style={[styles.heroChipText, { color: colors.onAccent }]}>
                      {t('plan.analyse.snap.rate', { rate: p1(summary.savingsRate) })}
                    </ThemedText>
                  </View>
                ) : null}
                {diff !== null && diff !== 0 ? (
                  <View style={[styles.heroChip, { backgroundColor: colors.backgroundElement }]}>
                    <ThemedText type="small" style={[styles.heroChipText, { color: diff > 0 ? colors.positive : colors.negative }]}>
                      {vsName
                        ? t(diff > 0 ? 'plan.analyse.hero.moreVs' : 'plan.analyse.hero.lessVs', { amount: money(Math.abs(diff)), month: vsName })
                        : t(diff > 0 ? 'plan.analyse.hero.more' : 'plan.analyse.hero.less', { amount: money(Math.abs(diff)) })}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <SparkLine values={data.line} color={colors.onAccent} fill={0.16} accessibilityLabel={t('plan.analyse.hero.line')} />
              <View style={styles.heroFoot}>
                <View style={styles.flex}>
                  <ThemedText type="small" style={[styles.heroLabel, { color: onAccentSoft }]}>{t('plan.analyse.hero.in')}</ThemedText>
                  <BigAmount amount={summary.income} size="row" color={colors.onAccent} />
                </View>
                <View style={styles.flex}>
                  <ThemedText type="small" style={[styles.heroLabel, { color: onAccentSoft }]}>{t('plan.analyse.hero.out')}</ThemedText>
                  <BigAmount amount={summary.spending} size="row" color={colors.onAccent} />
                </View>
                {score ? (
                  <Pressable
                    onPress={onOpenInsight}
                    style={styles.health}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('plan.analyse.health')} ${Math.round(score.total)}`}
                    accessibilityHint={t('plan.analyse.healthMore')}
                    hitSlop={6}
                  >
                    <Ring pct={score.total} color={ringColor} />
                    <View>
                      <ThemedText type="small" style={[styles.heroLabel, { color: onAccentSoft }]}>{t('plan.analyse.hero.health')}</ThemedText>
                      <ThemedText type="smallBold" style={[styles.heroFigText, { color: colors.onAccent }]}>{Math.round(score.total)}</ThemedText>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {!snap.comparable ? <ThemedText type="small" style={[styles.footnote, muted]}>{t('plan.analyse.snap.noCompare')}</ThemedText> : null}

            {/* 2. Things to know */}
            {data.highlights.length > 0 ? (
              <>
                <ThemedText type="smallBold" style={styles.sectionTitle}>{tp('plan.analyse.things.title', data.highlights.length)}</ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.things}
                  style={styles.thingsScroll}
                  decelerationRate="fast"
                  snapToInterval={THING_W + Spacing.two}
                >
                  {data.highlights.map((h) => {
                    const txt = highlightText(h);
                    const isCat = h.kind === 'catUp' || h.kind === 'catDown';
                    return (
                      <Pressable
                        key={`${h.kind}-${isCat ? h.categoryId : ''}`}
                        disabled={!isCat}
                        onPress={() => (isCat ? openCategory(h.categoryId) : undefined)}
                        style={({ pressed }) => [styles.thing, { backgroundColor: colors.backgroundElement, borderColor: colors.border }, pressed && styles.pressed]}
                        accessibilityRole={isCat ? 'button' : 'text'}
                      >
                        <StatusChip severity={txt.good ? 'positive' : 'attention'} />
                        <ThemedText type="smallBold" style={styles.thingTitle} numberOfLines={2}>
                          {txt.title}
                        </ThemedText>
                        <ThemedText type="small" style={muted} numberOfLines={2}>
                          {txt.body}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            {/* 3. Where it went */}
            {data.categories.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.rowBetween}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>{t('plan.analyse.whereItGoes')}</ThemedText>
                  <BigAmount amount={catTotal} size="row" />
                </View>
                <View style={[styles.stack, { backgroundColor: colors.backgroundSelected }]}>
                  {barCats.map((c) => (
                    <View key={c.categoryId} style={{ flex: c.total, backgroundColor: getCategory(c.categoryId)?.color ?? FALLBACK }} />
                  ))}
                  {barRest > 0 ? <View style={{ flex: barRest, backgroundColor: colors.divider }} /> : null}
                </View>
                {shownCats.map((row, i) => {
                  const category = getCategory(row.categoryId);
                  return (
                    <Pressable
                      key={row.categoryId}
                      onPress={() => openCategory(row.categoryId)}
                      style={({ pressed }) => [styles.catRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${categoryName(row.categoryId)}, ${money(row.total)}, ${p1(row.share)}%`}
                    >
                      <CategoryIcon icon={category?.icon ?? 'help-circle'} color={category?.color ?? FALLBACK} size={34} />
                      <View style={styles.flex}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {categoryName(row.categoryId)}
                        </ThemedText>
                        <ThemedText type="small" style={[muted, styles.share]}>
                          {t('plan.analyse.shareOfSpending', { share: p1(row.share) })}
                        </ThemedText>
                      </View>
                      {snap.comparable ? (
                        row.change === null ? (
                          <View style={[styles.newChip, { backgroundColor: colors.accentSoft }]}>
                            <ThemedText type="small" style={[styles.newText, { color: colors.accent }]}>{t('plan.analyse.new')}</ThemedText>
                          </View>
                        ) : (
                          <ChangeChip pct={row.change} />
                        )
                      ) : null}
                      <BigAmount amount={row.total} size="row" style={styles.rowAmount} />
                    </Pressable>
                  );
                })}
                {data.categories.length > TOP_CATEGORIES ? (
                  <Pressable onPress={() => setShowAll((v) => !v)} style={styles.more} accessibilityRole="button">
                    <ThemedText type="smallBold" style={{ color: colors.accent }}>
                      {showAll ? t('plan.analyse.showLess') : t('plan.analyse.allCategories', { count: data.categories.length })}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={muted}>{t('plan.analyse.noSpending')}</ThemedText>
              </View>
            )}
          </>
        }
        b={
          <>
            {/* 4. Where the income went */}
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.cardTitle}>{t('plan.analyse.alloc.title')}</ThemedText>
              {alloc.income > 0 ? (
                <>
                  <View style={[styles.split, { backgroundColor: colors.backgroundSelected }]}>
                    {allocParts
                      .filter((p) => p.value > 0)
                      .map((p) => (
                        <View key={p.id} style={{ flex: p.value, backgroundColor: p.color }} />
                      ))}
                  </View>
                  <View style={styles.allocList}>
                    {allocParts.map((p) => (
                      <View key={p.id} style={styles.allocRow}>
                        <View style={[styles.dot, { backgroundColor: p.color, borderColor: colors.divider, borderWidth: p.id === 'left' ? 1 : 0 }]} />
                        <ThemedText type="small" style={styles.flex}>{p.label}</ThemedText>
                        <ThemedText type="small" style={[muted, tabularNums]}>{ofIncome(p.value)}%</ThemedText>
                        <ThemedText type="smallBold" style={[styles.allocAmount, tabularNums]}>{money(p.value)}</ThemedText>
                      </View>
                    ))}
                  </View>
                  {alloc.left < 0 ? <ThemedText type="small" style={{ color: colors.negative }}>{t('plan.analyse.alloc.short', { amount: money(-alloc.left) })}</ThemedText> : null}
                  {plannedForGoals > 0 ? <ThemedText type="small" style={muted}>{t('plan.analyse.alloc.goals', { amount: money(plannedForGoals) })}</ThemedText> : null}
                  <ThemedText type="small" style={[muted, styles.note]}>{t('plan.analyse.alloc.note')}</ThemedText>
                </>
              ) : (
                <ThemedText type="small" style={muted}>{t('plan.analyse.alloc.noIncome')}</ThemedText>
              )}
            </View>

            {/* Money in */}
            {data.incomeBy.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold" style={styles.cardTitle}>{t('plan.analyse.moneyIn')}</ThemedText>
                {data.incomeBy.slice(0, 4).map((r, i) => (
                  <Pressable
                    key={r.categoryId}
                    onPress={() => openCategory(r.categoryId)}
                    style={({ pressed }) => [styles.inRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <ThemedText type="small" style={styles.flex} numberOfLines={1}>
                      {categoryName(r.categoryId)}
                    </ThemedText>
                    <BigAmount amount={r.amount} size="row" />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Available now */}
            <Pressable
              onPress={() => setShowAvailableNote((v) => !v)}
              style={({ pressed }) => [styles.card, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityHint={t('plan.analyse.snap.availableNote')}
            >
              <View style={styles.rowBetween}>
                <View style={styles.availHead}>
                  <ThemedText type="smallBold">{t('plan.analyse.snap.available')}</ThemedText>
                  <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
                </View>
                <BigAmount amount={available} size="row" color={available < 0 ? colors.negative : undefined} />
              </View>
              {showAvailableNote ? <ThemedText type="small" style={[muted, styles.note]}>{t('plan.analyse.snap.availableNote')}</ThemedText> : null}
            </Pressable>

            <Pressable onPress={onOpenDeep} style={({ pressed }) => [styles.deepLink, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]} accessibilityRole="button">
              <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('plan.analyse.toDeep')}</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>
          </>
        }
      />
      <RecordsSheet query={records} entries={entries} onClose={() => setRecords(null)} />
    </>
  );
}

/** The small health ring in the hero card. */
function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct)) / 100;
  return (
    <Svg width={38} height={38} viewBox="0 0 38 38">
      <Circle cx={19} cy={19} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={5} />
      <Circle cx={19} cy={19} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 19 19)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  pressed: { opacity: 0.7 },

  hero: { borderRadius: Radius.xl, padding: 18, paddingBottom: 14, gap: 10, marginBottom: Spacing.three },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroChip: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  heroChipGlass: { backgroundColor: 'rgba(255,255,255,0.16)' },
  heroChipText: { fontSize: FontSize.caption, lineHeight: 16, fontWeight: '700' },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 10 },
  heroLabel: { fontSize: 11, lineHeight: 14 },
  heroFigText: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  health: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.one },
  thingsScroll: { marginHorizontal: -Spacing.four, marginBottom: Spacing.three },
  things: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  thing: { width: THING_W, borderRadius: 18, borderWidth: 1, padding: 12, gap: 6 },
  thingTitle: { lineHeight: 19 },

  card: { borderRadius: Radius.lg, padding: Spacing.three, marginBottom: Spacing.three, gap: Spacing.two },
  cardTitle: { fontSize: FontSize.body },
  stack: { flexDirection: 'row', height: 10, borderRadius: Radius.pill, overflow: 'hidden', gap: 2, marginBottom: Spacing.one },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  share: { fontSize: FontSize.caption, lineHeight: 16 },
  rowAmount: { minWidth: 76, textAlign: 'right' },
  newChip: { borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  newText: { fontSize: 11, lineHeight: 15, fontWeight: '800' },
  more: { alignItems: 'center', paddingVertical: Spacing.two },

  split: { flexDirection: 'row', height: 12, borderRadius: Radius.pill, overflow: 'hidden', gap: 2 },
  allocList: { gap: Spacing.two, marginTop: Spacing.one },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  allocAmount: { minWidth: 92, textAlign: 'right' },
  dot: { width: 10, height: 10, borderRadius: Radius.pill },
  note: { fontSize: FontSize.caption, lineHeight: 16 },

  inRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 8 },
  availHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deepLink: { height: 48, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: Spacing.three },
  footnote: { fontSize: FontSize.caption, lineHeight: 16, marginTop: -Spacing.two, marginBottom: Spacing.three },
});
