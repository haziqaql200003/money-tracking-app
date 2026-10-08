import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName as categoryLabel } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { instalmentAmount, isFinished, nextInstalment } from '@/utils/debts';
import { goalOutlook, goalProgress, goalProjection } from '@/utils/goals';
import { aiSummary, buildFeed, monthRows, wakiraScore, type FeedTone, type GoalFacts, type ScoreFactor } from '@/utils/insight-feed';
import { monthKeysEnding } from '@/utils/insights';
import { isEnded, isTransfer, monthlyEquivalent } from '@/utils/recurring';
import { looksLikeSavings } from '@/utils/saved';

const MASK = 'RM ••••';

type Props = { todayKey: string };

/** The "Insights" tab: a score, then short findings with what to do about each. */
export function AnalyseInsight({ todayKey }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { transactions, accounts, recurringRules, accountBalance } = useTransactions();
  const { getCategory, totalBudget } = useCategories();
  const { debts } = useDebts();
  const { goals, goalEntries } = usePlan();
  const { hideAmounts } = usePrivacy();
  const { savingsTarget } = useSettings();

  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));

  const data = useMemo(() => {
    const fixedMonthly = recurringRules
      .filter((r) => r.active && !isEnded(r) && !isTransfer(r) && r.type === 'debit')
      .reduce((s, r) => s + monthlyEquivalent(r), 0);
    const debtMonthly = debts
      .filter((d) => d.kind !== 'credit' && !isFinished(d))
      .reduce((s, d) => {
        const n = nextInstalment(d);
        return s + (n ? instalmentAmount(n) : 0);
      }, 0);
    const savingsBalance = accounts.filter((a) => !a.hidden && looksLikeSavings(a)).reduce((s, a) => s + Math.max(0, accountBalance(a.id)), 0);
    const goalFacts: GoalFacts[] = goals
      .filter((g) => !g.paused)
      .map((g) => {
        const p = goalProgress(g, goalEntries, todayKey);
        const proj = goalProjection(g, goalEntries, todayKey);
        return { name: g.name, outlook: goalOutlook(g, p.status, proj), need: p.perMonth, pace: proj.perMonth };
      });
    return { fixedMonthly, debtMonthly, savingsBalance, goalFacts };
  }, [recurringRules, debts, accounts, accountBalance, goals, goalEntries, todayKey]);

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

  const score = useMemo(
    () =>
      wakiraScore({
        transactions,
        todayKey,
        budget: totalBudget,
        debtMonthly: data.debtMonthly,
        savingsBalance: data.savingsBalance,
        fixedMonthly: data.fixedMonthly,
        savingsTarget,
      }),
    [transactions, todayKey, totalBudget, data, savingsTarget],
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

  return (
    <View>
      {!score && feed.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={muted}>{t('fc.insight.empty')}</ThemedText>
        </View>
      ) : null}

      {score ? (
        <>
          <ThemedText type="smallBold" style={styles.sectionTitle}>{t('fc.score.title')}</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.scoreRow}>
              <ThemedText style={[styles.big, { color: scoreColor }]}>{score.total}</ThemedText>
              <View style={styles.flex}>
                <ThemedText type="smallBold" style={{ color: scoreColor }}>{t(`fc.score.grade.${score.grade}` as TKey)}</ThemedText>
                <ThemedText type="small" style={muted}>/ 100</ThemedText>
              </View>
            </View>
            {score.factors.map(factorBar)}
            {score.weakest && score.total < 90 ? (
              <ThemedText type="small">
                <ThemedText type="smallBold">{t('fc.score.focus')}: </ThemedText>
                {t(`fc.score.tip.${score.weakest}` as TKey, { target: savingsTarget })}
              </ThemedText>
            ) : null}
            <ThemedText type="small" style={muted}>{t('fc.score.note')}</ThemedText>
          </View>
        </>
      ) : null}

      {score || feed.length > 0 ? (
        <>
          <ThemedText type="smallBold" style={styles.sectionTitle}>{t('fc.insight.title')}</ThemedText>
          {feed.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small" style={muted}>{t('fc.insight.none')}</ThemedText>
            </View>
          ) : (
            feed.map((f) => (
              <View key={f.id} style={[styles.card, { backgroundColor: colors.backgroundElement, borderLeftWidth: 4, borderLeftColor: tone[f.tone] }]}>
                <View style={styles.head}>
                  <Ionicons name={toneIcon[f.tone]} size={18} color={tone[f.tone]} />
                  <ThemedText type="smallBold" style={styles.flex}>{f.title}</ThemedText>
                </View>
                <ThemedText type="small" style={muted}>{f.body}</ThemedText>
                {f.action ? (
                  <ThemedText type="small">
                    <ThemedText type="smallBold" style={{ color: tone[f.tone] }}>{t('fc.insight.action')}: </ThemedText>
                    {f.action}
                  </ThemedText>
                ) : null}
              </View>
            ))
          )}

          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">{t('fc.ai.title')}</ThemedText>
            <ThemedText type="small" style={muted}>{t('fc.ai.body')}</ThemedText>
            <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={shareSummary} accessibilityRole="button">
              <Ionicons name="share-outline" size={16} color="#fff" />
              <ThemedText style={styles.buttonText}>{t('fc.ai.button')}</ThemedText>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three, gap: 8 },
  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.two },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  big: { fontSize: 52, lineHeight: 58, fontWeight: '700' },
  factor: { gap: 4 },
  factorHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: Radius.pill },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: Radius.md, marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
