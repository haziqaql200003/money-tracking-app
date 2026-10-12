import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName as categoryLabel } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { aiSummary, buildFeed, monthRows, type FeedTone, type ScoreFactor } from '@/utils/insight-feed';
import { useHealthScore } from '@/hooks/use-health-score';
import { ScoreRing } from '@/components/charts/score-ring';
import { monthKeysEnding } from '@/utils/insights';

const MASK = 'RM ••••';
const SHOWN = 4;

/** Where each kind of finding can be acted on, and the button that takes you there. */
function goFor(id: string): { href: Href; labelKey: TKey } | null {
  if (['budget', 'creep', 'spike', 'misc', 'why'].includes(id)) return { href: '/more/budgets', labelKey: 'fc.go.budgets' };
  if (id.startsWith('goal') || ['runway', 'income', 'rate'].includes(id)) return { href: '/more/rancang', labelKey: 'fc.go.rancang' };
  if (['subs', 'fixed'].includes(id)) return { href: '/more/recurring', labelKey: 'fc.go.recurring' };
  if (['payday', 'weekend', 'habit', 'small', 'topcat', 'bigone'].includes(id)) return { href: '/transactions', labelKey: 'fc.go.records' };
  return null;
}

type Props = { todayKey: string };

/** The "Insights" tab: a compact score, then short findings, each with a tip and a button to act on it. */
export function AnalyseInsight({ todayKey }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { transactions } = useTransactions();
  const { getCategory } = useCategories();
  const router = useRouter();
  const [scoreOpen, setScoreOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { hideAmounts } = usePrivacy();
  const health = useHealthScore(todayKey);
  const { score, savingsTarget, totalBudget } = health;
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
        savingsBalance: data.savingsBalance,
        goals: data.goalFacts,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, todayKey, data, totalBudget, hideAmounts, getCategory],
  );

  const muted = { color: colors.textSecondary };
  const tone: Record<FeedTone, string> = { good: colors.positive, warn: colors.warning, bad: colors.negative, info: colors.accent };
  const toneIcon: Record<FeedTone, keyof typeof Ionicons.glyphMap> = { good: 'trending-up', warn: 'alert-circle-outline', bad: 'warning-outline', info: 'bulb-outline' };
  const scoreColor = score ? (score.total >= 80 ? colors.positive : score.total >= 60 ? colors.accent : score.total >= 40 ? colors.warning : colors.negative) : colors.textSecondary;

  const shareSummary = () => {
    const rows = monthRows(transactions, monthKeysEnding(todayKey, 7).slice(0, -1));
    void Share.share({ message: aiSummary({ rows, score, feed, goals: data.goalFacts, savingsBalance: data.savingsBalance, fixedMonthly: data.fixedMonthly }) });
  };

  const factorBar = (f: ScoreFactor) => (
    <View key={f.id} style={styles.factor}>
      <View style={styles.factorHead}>
        <ThemedText type="small">{t(`fc.score.f.${f.id}` as TKey)}</ThemedText>
        <ThemedText type="small" style={muted}>{Math.round(f.points)}/{f.max}</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
        <View style={{ width: `${(f.points / f.max) * 100}%`, height: 8, borderRadius: Radius.pill, backgroundColor: f.points / f.max >= 0.7 ? colors.positive : f.points / f.max >= 0.4 ? colors.warning : colors.negative }} />
      </View>
    </View>
  );

  const shown = showAll ? feed : feed.slice(0, SHOWN);

  return (
    <View>
      {!score && feed.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={muted}>{t('fc.insight.empty')}</ThemedText>
        </View>
      ) : null}

      {score ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Pressable
            onPress={() => setScoreOpen((v) => !v)}
            style={styles.scoreRow}
            accessibilityRole="button"
            accessibilityState={{ expanded: scoreOpen }}
          >
            <ScoreRing value={score.total} color={scoreColor} size={84} stroke={10} />
            <View style={[styles.flex, { gap: 2 }]}>
              <ThemedText type="small" style={muted}>{t('fc.score.title')}</ThemedText>
              <ThemedText style={[styles.grade, { color: scoreColor }]}>{t(`fc.score.grade.${score.grade}` as TKey)}</ThemedText>
              {score.weakest && score.total < 90 ? (
                <ThemedText type="small" numberOfLines={3}>
                  {t(`fc.score.tip.${score.weakest}` as TKey, { target: savingsTarget })}
                </ThemedText>
              ) : null}
            </View>
            <View style={[styles.chevron, { backgroundColor: colors.backgroundSelected }]}>
              <Ionicons name={scoreOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </View>
          </Pressable>
          {scoreOpen ? (
            <View style={[styles.scoreDetail, { borderTopColor: colors.divider }]}>
              {score.factors.map(factorBar)}
              <ThemedText type="small" style={muted}>{t('fc.score.note')}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {score || feed.length > 0 ? (
        <>
          <ThemedText type="smallBold" style={styles.sectionTitle}>{t('fc.insight.title')}</ThemedText>
          {feed.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small" style={muted}>{t('fc.insight.none')}</ThemedText>
            </View>
          ) : (
            shown.map((f) => {
              const go = goFor(f.id);
              return (
                <View key={f.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.head}>
                    <View style={[styles.toneIcon, { backgroundColor: `${tone[f.tone]}1F` }]}>
                      <Ionicons name={toneIcon[f.tone]} size={17} color={tone[f.tone]} />
                    </View>
                    <ThemedText type="smallBold" style={[styles.flex, styles.cardTitle]}>{f.title}</ThemedText>
                  </View>
                  <ThemedText type="small" style={muted}>{f.body}</ThemedText>
                  {f.action ? (
                    <View style={[styles.tip, { backgroundColor: colors.backgroundSelected }]}>
                      <Ionicons name="bulb-outline" size={15} color={colors.accent} style={styles.tipIcon} />
                      <ThemedText type="small" style={styles.flex}>{f.action}</ThemedText>
                    </View>
                  ) : null}
                  {go ? (
                    <Pressable
                      onPress={() => router.push(go.href)}
                      style={({ pressed }) => [styles.goButton, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                    >
                      <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t(go.labelKey)}</ThemedText>
                      <Ionicons name="arrow-forward" size={14} color={colors.accent} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
          {feed.length > SHOWN ? (
            <Pressable onPress={() => setShowAll((v) => !v)} style={styles.moreButton} accessibilityRole="button">
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                {showAll ? t('plan.analyse.showLess') : t('fc.insight.more', { n: feed.length - SHOWN })}
              </ThemedText>
            </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  button: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
