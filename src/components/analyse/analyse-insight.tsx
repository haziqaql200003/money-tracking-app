import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { InsightCard } from '@/components/analyse/insight-card';
import { RecordsSheet, type RecordsQuery } from '@/components/analyse/records-sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName as categoryLabel } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { aiSummary, buildFeed, monthRows } from '@/utils/insight-feed';
import { applyState, dismiss, EMPTY_INSIGHT_STATE, rankInsights, recordHistory, restore, type Insight, type InsightState } from '@/utils/insight-engine';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { formatDate } from '@/i18n/format';
import { useHealthScore } from '@/hooks/use-health-score';
import { useLedger } from '@/hooks/use-ledger';
import { HealthCard } from '@/components/analyse/health-card';
import { WhatIf } from '@/components/analyse/what-if';
import { useAdvanced } from '@/hooks/use-advanced';
import { AskWakiraCard } from '@/components/ai/ask-card';
import { monthKeysEnding } from '@/utils/insights';
import { shareText } from '@/services/share-file';

const MASK = 'RM ••••';
const SHOWN = 4;

/** Where each kind of finding can be acted on, and the button that takes you there. */
function goFor(id: string): { href: Href; labelKey: TKey } | null {
  if (['budget', 'creep', 'spike', 'misc', 'why'].includes(id)) return { href: '/more/budgets', labelKey: 'fc.go.budgets' };
  if (id.startsWith('goal') || ['runway', 'income', 'rate'].includes(id)) return { href: '/more/rancang', labelKey: 'fc.go.rancang' };
  if (['subs', 'fixed'].includes(id)) return { href: '/more/recurring', labelKey: 'fc.go.recurring' };
  if (id === 'debt') return { href: '/more/debts', labelKey: 'fc.go.debts' };
  if (['payday', 'weekend', 'habit', 'small', 'topcat', 'bigone'].includes(id)) return { href: '/transactions', labelKey: 'fc.go.records' };
  return null;
}

type Props = { todayKey: string };

/** The "Insights" tab: a compact score, then short findings, each with a tip and a button to act on it. */
export function AnalyseInsight({ todayKey }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { entries: transactions } = useLedger();
  const { getCategory } = useCategories();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
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

  // Ranked, labelled and de-duplicated (utils/insight-engine.ts). Severity weighs impact against the user's own income.
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
  const [showHidden, setShowHidden] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [drill, setDrill] = useState<RecordsQuery | null>(null);
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

  const muted = { color: colors.textSecondary };

  const shareSummary = () => {
    const rows = monthRows(transactions, monthKeysEnding(todayKey, 7).slice(0, -1));
    void shareText(aiSummary({ rows, score, feed, goals: data.goalFacts, savingsBalance: data.savingsBalance, fixedMonthly: data.fixedMonthly }));
  };

  const shown = showAll ? visible : visible.slice(0, SHOWN);
  const card = (f: Insight) => {
    const go = goFor(f.id);
    return (
      <InsightCard
        key={f.key}
        insight={f}
        go={go ? { label: t(go.labelKey), onPress: () => router.push(go.href) } : null}
        onRecords={f.subjectCategoryId && f.window ? () => setDrill({ categoryId: f.subjectCategoryId, window: f.window! }) : undefined}
        onDismiss={() => setInsightState((st) => dismiss(st, f, todayKey))}
      />
    );
  };

  return (
    <View>
      <AskWakiraCard feed={feed} />
      <ThemedText type="small" style={[muted, styles.periodNote]}>{t('fc.insight.period')}</ThemedText>

      {health.health.measured === 0 && feed.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={muted}>{t('fc.insight.empty')}</ThemedText>
        </View>
      ) : null}

      {/* Financial health: five areas, each explained; an overall result only with enough data */}
      {health.health.measured > 0 ? <HealthCard health={health.health} savingsTarget={savingsTarget} /> : null}

      {health.health.measured > 0 || feed.length > 0 ? (
        <>
          <ThemedText type="smallBold" style={styles.sectionTitle}>{t('fc.insight.title')}</ThemedText>
          {visible.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small" style={muted}>{t('fc.insight.none')}</ThemedText>
            </View>
          ) : (
            shown.map(card)
          )}
          {visible.length > SHOWN ? (
            <Pressable onPress={() => setShowAll((v) => !v)} style={styles.moreButton} accessibilityRole="button">
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                {showAll ? t('plan.analyse.showLess') : t('fc.insight.more', { n: visible.length - SHOWN })}
              </ThemedText>
            </Pressable>
          ) : null}

          {/* Hidden for now: they come back after their cooldown, or at once if they get more serious */}
          {hidden.length > 0 ? (
            <>
              <Pressable onPress={() => setShowHidden((v) => !v)} style={styles.moreButton} accessibilityRole="button">
                <ThemedText type="small" style={muted}>
                  {showHidden ? t('fc.ui.hideHidden') : t('fc.ui.hidden', { n: hidden.length })}
                </ThemedText>
              </Pressable>
              {showHidden ? (
                <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  {hidden.map((h) => (
                    <View key={h.key} style={styles.histRow}>
                      <ThemedText type="small" style={styles.flex} numberOfLines={2}>{h.title}</ThemedText>
                      <Pressable onPress={() => setInsightState((st) => restore(st, h.key))} hitSlop={8} accessibilityRole="button">
                        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('fc.ui.restore')}</ThemedText>
                      </Pressable>
                    </View>
                  ))}
                  <ThemedText type="small" style={muted}>{t('fc.ui.cooldown')}</ThemedText>
                </View>
              ) : null}
            </>
          ) : null}

          {/* What-If: a simulation on the user's own averages; it never changes any record */}
          <WhatIf base={adv.whatIf} todayKey={todayKey} />

          {/* Past insights: findings that no longer apply, newest first */}
          {pastInsights.length > 0 ? (
            <>
              <Pressable onPress={() => setShowHistory((v) => !v)} style={styles.historyHead} accessibilityRole="button" accessibilityState={{ expanded: showHistory }}>
                <ThemedText type="smallBold" style={styles.flex}>{t('fc.ui.history')}</ThemedText>
                <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
              </Pressable>
              {showHistory ? (
                <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  {pastInsights.map(([k, h]) => (
                    <View key={k} style={styles.histItem}>
                      <ThemedText type="small">{h.title}</ThemedText>
                      <ThemedText type="small" style={muted}>
                        {t(`fc.sev.${h.severity}` as TKey)} · {t('fc.ui.firstSeen', { date: dateText(h.first), date2: dateText(h.last) })}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          <View style={[styles.card, styles.aiCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{t('fc.ai.title')}</ThemedText>
              <ThemedText type="small" style={muted}>{t('fc.ai.body')}</ThemedText>
            </View>
            <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={shareSummary} accessibilityRole="button" accessibilityLabel={t('fc.ai.button')}>
              <Ionicons name="share-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        </>
      ) : null}
      <RecordsSheet query={drill} entries={transactions} onClose={() => setDrill(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  periodNote: { marginBottom: Spacing.three, paddingHorizontal: Spacing.one },
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three, gap: 10 },
  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.two },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  grade: { fontSize: FontSize.title, fontWeight: '800' },
  chevron: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  scoreDetail: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 },
  factor: { gap: 4 },
  factorHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: Radius.pill },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toneIcon: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.body },
  tip: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Radius.md },
  tipIcon: { marginTop: 1 },
  goButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill },
  moreButton: { alignItems: 'center', paddingVertical: 10, marginBottom: Spacing.two },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  histItem: { gap: 2 },
  historyHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginBottom: Spacing.two },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  button: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
