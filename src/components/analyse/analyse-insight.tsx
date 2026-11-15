import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AskWakiraCard } from '@/components/ai/ask-card';
import { HealthCard } from '@/components/analyse/health-card';
import { InsightDetail, InsightList, InsightRow, type SeverityFilter } from '@/components/analyse/insight-pages';
import { RecordsSheet, type RecordsQuery } from '@/components/analyse/records-sheet';
import { FullScreen } from '@/components/analyse/ui/full-screen';
import { leversFor, WhatIfPanel } from '@/components/analyse/what-if';
import { ScoreRing } from '@/components/charts/score-ring';
import { StoryShelf, latestStories } from '@/components/story/report-stories';
import { weekNo } from '@/components/story/story-common';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useAdvanced } from '@/hooks/use-advanced';
import { useHealthScore } from '@/hooks/use-health-score';
import { useLedger } from '@/hooks/use-ledger';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName as categoryLabel } from '@/i18n/data';
import { formatDate } from '@/i18n/format';
import { shareText } from '@/services/share-file';
import { formatMoney } from '@/utils/currency';
import { aiSummary, buildFeed, monthRows } from '@/utils/insight-feed';
import { applyState, dismiss, EMPTY_INSIGHT_STATE, rankInsights, recordHistory, restore, type Insight, type InsightState } from '@/utils/insight-engine';
import { monthKeysEnding } from '@/utils/insights';
import type { Levers } from '@/utils/what-if';

const MASK = 'RM ••••';
/** How many to-dos the tab shows before "See all". */
const TODO = 3;

/** Where each kind of finding can be acted on: the page, the full button label and the short chip label. */
function goFor(id: string): { href: Href; labelKey: TKey; shortKey: TKey } | null {
  if (['budget', 'creep', 'spike', 'misc', 'why'].includes(id)) return { href: '/more/budgets', labelKey: 'fc.go.budgets', shortKey: 'plan.ins.short.budgets' };
  if (id.startsWith('goal') || ['runway', 'income', 'rate'].includes(id)) return { href: '/more/rancang', labelKey: 'fc.go.rancang', shortKey: 'plan.ins.short.rancang' };
  if (['subs', 'fixed'].includes(id)) return { href: '/more/recurring', labelKey: 'fc.go.recurring', shortKey: 'plan.ins.short.recurring' };
  if (id === 'debt') return { href: '/more/debts', labelKey: 'fc.go.debts', shortKey: 'plan.ins.short.debts' };
  if (['payday', 'weekend', 'habit', 'small', 'topcat', 'bigone'].includes(id)) return { href: '/transactions', labelKey: 'fc.go.records', shortKey: 'plan.ins.short.records' };
  return null;
}

/** The pages of the Insights full screen. Back goes one page back; closing the first page closes the screen. */
type Page = { kind: 'list' } | { kind: 'detail'; key: string } | { kind: 'whatif'; levers?: Partial<Levers> } | { kind: 'health' } | { kind: 'stories' };

type Props = { todayKey: string };

/**
 * The "Insights" tab (3.8.1): the three things to do first, a compact health card, Stories and What if… tiles,
 * and a full screen for all insights, their evidence, What if…, the health breakdown and the stories.
 */
export function AnalyseInsight({ todayKey }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { entries: transactions } = useLedger();
  const { getCategory } = useCategories();
  const router = useRouter();
  const { hideAmounts } = usePrivacy();
  const health = useHealthScore(todayKey);
  const adv = useAdvanced(todayKey);
  const { score, savingsTarget, totalBudget, budgets } = health;
  const { fixedMonthly, debtMonthly, savingsBalance, goalFacts } = health;
  const data = useMemo(() => ({ fixedMonthly, debtMonthly, savingsBalance, goalFacts }), [fixedMonthly, debtMonthly, savingsBalance, goalFacts]);

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const catName = (id: string) => {
    const c = getCategory(id);
    return c ? categoryLabel(c) : t('cat.other');
  };

  const feed = useMemo(
    () =>
      buildFeed({
        transactions,
        todayKey,
        categoryName: catName,
        money,
        fixedMonthly: data.fixedMonthly,
        debtMonthly: data.debtMonthly,
        budget: totalBudget,
        budgets,
        savingsBalance: data.savingsBalance,
        goals: data.goalFacts,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, todayKey, data, totalBudget, budgets, hideAmounts, getCategory],
  );

  // Ranked, labelled and de-duplicated (utils/insight-engine.ts). Severity weighs impact against the pengguna's own income.
  const ranked = useMemo(() => {
    const rows = monthRows(transactions, monthKeysEnding(todayKey, 4).slice(0, -1)).filter((r) => r.income > 0);
    const income = rows.length ? rows.reduce((s, r) => s + r.income, 0) / rows.length : 0;
    return rankInsights(feed, income);
  }, [feed, transactions, todayKey]);

  // Dismissals, cooldowns and history are kept per user (and synced like any other setting when cloud is on).
  const { user } = useAuth();
  const [insightState, setInsightState, stateReady] = usePersistedState<InsightState>('insight_state', EMPTY_INSIGHT_STATE, user?.id ?? null);
  const { shown: visible, hidden } = useMemo(() => applyState(ranked, insightState, todayKey), [ranked, insightState, todayKey]);
  useEffect(() => {
    if (!stateReady) return;
    const next = recordHistory(insightState, visible, todayKey);
    if (next !== insightState) setInsightState(next);
  }, [stateReady, insightState, visible, todayKey, setInsightState]);
  const pastInsights = useMemo(() => {
    const live = new Set(ranked.map((r) => r.key));
    return Object.entries(insightState.history)
      .filter(([k]) => !live.has(k))
      .sort((a, b) => (a[1].last < b[1].last ? 1 : -1))
      .slice(0, 20);
  }, [insightState.history, ranked]);
  const dateText = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return formatDate(new Date(y, m - 1, d));
  };

  /* The full screen and its pages */
  const [stack, setStack] = useState<Page[]>([]);
  const [listTab, setListTab] = useState<'all' | 'history'>('all');
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [drill, setDrill] = useState<RecordsQuery | null>(null);
  const page = stack[stack.length - 1] ?? null;
  const push = (p: Page) => setStack((s) => [...s, p]);
  const back = () => setStack((s) => s.slice(0, -1));
  const close = () => setStack([]);
  const open = (p: Page) => setStack([p]);
  // Leaving Faham for another module: close the screen first, then go.
  const goTo = (href: Href) => {
    close();
    router.push(href);
  };

  const byKey = useMemo(() => new Map([...visible, ...hidden].map((x) => [x.key, x])), [visible, hidden]);
  const detail = page?.kind === 'detail' ? byKey.get(page.key) ?? null : null;

  const todos = visible.filter((x) => x.severity !== 'positive').slice(0, TODO);
  const latest = useMemo(() => latestStories(todayKey), [todayKey]);
  const muted = { color: colors.textSecondary };
  const box = [styles.card, { backgroundColor: colors.backgroundElement }];

  const shareSummary = () => {
    const rows = monthRows(transactions, monthKeysEnding(todayKey, 7).slice(0, -1));
    void shareText(aiSummary({ rows, score, feed, goals: data.goalFacts, savingsBalance: data.savingsBalance, fixedMonthly: data.fixedMonthly }));
  };

  const h = health.health;
  const colorOf = (s: number | null) => (s === null ? colors.textSecondary : s >= 70 ? colors.positive : s >= 40 ? colors.warning : colors.negative);
  const overallColor = h.overall === null ? colors.textSecondary : h.overall >= 80 ? colors.positive : h.overall >= 60 ? colors.accent : h.overall >= 40 ? colors.warning : colors.negative;

  const title =
    page?.kind === 'list'
      ? t('plan.ins.list.title')
      : page?.kind === 'detail'
        ? detail
          ? t(`fc.cat.${detail.category}` as TKey)
          : t('plan.ins.list.title')
        : page?.kind === 'whatif'
          ? t('plan.wi.title')
          : page?.kind === 'health'
            ? t('fc.h.title')
            : page?.kind === 'stories'
              ? t('rpt.entry.title')
              : '';

  const detailGo = detail ? goFor(detail.id) : null;

  return (
    <View>
      <ThemedText type="small" style={[muted, styles.periodNote]}>{t('fc.insight.period')}</ThemedText>

      {h.measured === 0 && feed.length === 0 ? (
        <View style={box}>
          <ThemedText type="small" style={muted}>{t('fc.insight.empty')}</ThemedText>
        </View>
      ) : null}

      {/* 1. The three things to do first */}
      {feed.length > 0 ? (
        <>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>{t('plan.ins.todo.title', { n: Math.max(todos.length, 1) })}</ThemedText>
            <ThemedText type="small" style={muted}>{t('plan.ins.todo.hint')}</ThemedText>
          </View>
          <View style={[box, styles.listBox]}>
            {todos.length === 0 ? (
              <View style={styles.allClear}>
                <Ionicons name="checkmark-circle" size={20} color={colors.positive} />
                <ThemedText type="small" style={styles.flex}>{t('fc.insight.none')}</ThemedText>
              </View>
            ) : (
              todos.map((it, i) => {
                const go = goFor(it.id);
                return (
                  <InsightRow
                    key={it.key}
                    insight={it}
                    first={i === 0}
                    onPress={() => open({ kind: 'detail', key: it.key })}
                    chip={go ? { label: t(go.shortKey), onPress: () => router.push(go.href) } : null}
                  />
                );
              })
            )}
          </View>
        </>
      ) : null}

      {/* 2. Financial health, compact: the full breakdown opens on its own page */}
      {h.measured > 0 ? (
        <Pressable onPress={() => open({ kind: 'health' })} style={({ pressed }) => [box, styles.health, pressed && { opacity: 0.75 }]} accessibilityRole="button">
          <View style={styles.healthHead}>
            {h.overall !== null ? (
              <ScoreRing value={h.overall} color={overallColor} size={56} stroke={7} />
            ) : (
              <View style={[styles.ringStub, { borderColor: colors.backgroundSelected }]}>
                <Ionicons name="pulse" size={20} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                {h.overall !== null ? t('plan.ins.health.score', { n: h.overall }) : t('plan.ins.health.partial', { n: h.measured })}
              </ThemedText>
              <ThemedText type="small" style={muted}>
                {t('fc.h.title')}
                {h.grade ? ` · ${t(`fc.score.grade.${h.grade}` as TKey)}` : ''}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.dims}>
            {h.dimensions.map((d) => (
              <View key={d.id} style={styles.dim}>
                <View style={[styles.dimTrack, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.dimFill, { width: `${d.score ?? 0}%`, backgroundColor: colorOf(d.score) }]} />
                </View>
                <ThemedText type="small" style={[muted, styles.dimLabel]} numberOfLines={1}>{t(`fc.h.dim.${d.id}` as TKey)}</ThemedText>
              </View>
            ))}
          </View>
        </Pressable>
      ) : null}

      {/* 3. Stories and What if… */}
      <View style={styles.tiles}>
        <Pressable onPress={() => open({ kind: 'stories' })} style={({ pressed }) => [box, styles.tile, pressed && { opacity: 0.75 }]} accessibilityRole="button">
          <View style={[styles.tileIcon, { backgroundColor: '#B0896826' }]}>
            <Ionicons name="receipt-outline" size={18} color="#B08968" />
          </View>
          <ThemedText type="smallBold">{t('plan.ins.tile.stories')}</ThemedText>
          <ThemedText type="small" style={muted} numberOfLines={2}>{t('plan.ins.tile.storiesSub', { n: weekNo(latest.week.key) })}</ThemedText>
        </Pressable>
        <Pressable onPress={() => open({ kind: 'whatif' })} style={({ pressed }) => [box, styles.tile, pressed && { opacity: 0.75 }]} accessibilityRole="button">
          <View style={[styles.tileIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="flask-outline" size={18} color={colors.accent} />
          </View>
          <ThemedText type="smallBold">{t('plan.wi.title')}</ThemedText>
          <ThemedText type="small" style={muted} numberOfLines={2}>{t('plan.ins.tile.whatIfSub')}</ThemedText>
        </Pressable>
      </View>

      {/* 4. Everything else */}
      {visible.length + hidden.length > 0 || pastInsights.length > 0 ? (
        <Pressable onPress={() => open({ kind: 'list' })} style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.6 }]} accessibilityRole="button">
          <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('plan.ins.seeAll', { n: visible.length })}</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </Pressable>
      ) : null}

      <AskWakiraCard feed={feed} />

      {h.measured > 0 || feed.length > 0 ? (
        <View style={[box, styles.aiCard]}>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{t('fc.ai.title')}</ThemedText>
            <ThemedText type="small" style={muted}>{t('fc.ai.body')}</ThemedText>
          </View>
          <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={shareSummary} accessibilityRole="button" accessibilityLabel={t('fc.ai.button')}>
            <Ionicons name="share-outline" size={18} color={colors.onAccent} />
          </Pressable>
        </View>
      ) : null}

      <FullScreen visible={!!page} onBack={back} title={title} pageKey={stack.map((p) => p.kind).join('/')}>
        {page?.kind === 'list' ? (
          <InsightList
            tab={listTab}
            onTab={setListTab}
            filter={filter}
            onFilter={setFilter}
            shown={visible}
            hidden={hidden}
            showHidden={showHidden}
            onToggleHidden={() => setShowHidden((v) => !v)}
            onOpen={(it: Insight) => push({ kind: 'detail', key: it.key })}
            onRestore={(key) => setInsightState((st) => restore(st, key))}
            history={pastInsights}
            dateText={dateText}
          />
        ) : null}
        {page?.kind === 'detail' && detail ? (
          <InsightDetail
            insight={detail}
            go={detailGo ? { label: t(detailGo.labelKey), onPress: () => goTo(detailGo.href) } : null}
            onRecords={detail.subjectCategoryId && detail.window ? () => setDrill({ categoryId: detail.subjectCategoryId, window: detail.window! }) : undefined}
            onWhatIf={adv.whatIf && detail.severity !== 'positive' ? () => push({ kind: 'whatif', levers: leversFor(adv.whatIf, detail.subjectCategoryId) }) : undefined}
            onHide={() => {
              setInsightState((st) => dismiss(st, detail, todayKey));
              back();
            }}
          />
        ) : null}
        {page?.kind === 'detail' && !detail ? (
          <ThemedText type="small" style={muted}>{t('plan.ins.gone')}</ThemedText>
        ) : null}
        {page?.kind === 'whatif' ? <WhatIfPanel key={stack.length} base={adv.whatIf} todayKey={todayKey} initial={page.levers} /> : null}
        {page?.kind === 'health' ? <HealthCard health={h} savingsTarget={savingsTarget} /> : null}
        {page?.kind === 'stories' ? <StoryShelf /> : null}
        {/* Inside the full screen, so iOS presents it on top */}
        <RecordsSheet query={drill} entries={transactions} onClose={() => setDrill(null)} />
      </FullScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  periodNote: { marginBottom: Spacing.three, paddingHorizontal: Spacing.one },
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 16, marginBottom: Spacing.three, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, marginTop: Spacing.one, marginBottom: Spacing.two },
  sectionTitle: { fontSize: FontSize.body },
  listBox: { paddingVertical: 4, gap: 0 },
  allClear: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },

  health: { gap: 14 },
  healthHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringStub: { width: 56, height: 56, borderRadius: 28, borderWidth: 7, alignItems: 'center', justifyContent: 'center' },
  dims: { flexDirection: 'row', gap: 8 },
  dim: { flex: 1, gap: 4 },
  dimTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  dimFill: { height: 6, borderRadius: Radius.pill },
  dimLabel: { fontSize: FontSize.micro },

  tiles: { flexDirection: 'row', gap: Spacing.three },
  tile: { flex: 1, gap: 4 },
  tileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, marginBottom: Spacing.two, minHeight: 44 },

  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  button: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
