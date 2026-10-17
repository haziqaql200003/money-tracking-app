import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthSwitcher } from '@/components/ui/month-switcher';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing, Type } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName, subcategoryName } from '@/i18n/data';
import { datedName, shareText, shareTextFile } from '@/services/share-file';
import { cycleOf, shiftCycle } from '@/utils/cycle';
import { formatMoney } from '@/utils/currency';
import { cycleRangeLabel, monthLabel, toDateKey } from '@/utils/dates';
import { reportRows, reportToCsv, reportToText } from '@/utils/monthly-report';
import { buildReport } from '@/utils/report-data';

const MASK = 'RM ••••';

export default function MonthlyReportScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { transactions } = useTransactions();
  const { getCategory, expenseCategories } = useCategories();
  const { goals, goalEntries } = usePlan();
  const { debts } = useDebts();
  const { savingsTarget, paydayRuleKey } = useSettings();
  const todayKey = toDateKey(new Date());
  const currentKey = cycleOf(todayKey);
  const [monthKey, setMonthKey] = useState(currentKey);
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const muted = { color: colors.textSecondary };
  const catName = (id: string) => {
    const c = getCategory(id);
    return c ? categoryName(c) : t('cat.other');
  };

  const earliestKey = useMemo(() => transactions.reduce((m, x) => (cycleOf(x.date) < m ? cycleOf(x.date) : m), currentKey), [transactions, currentKey]);

  const r = useMemo(() => {
    void paydayRuleKey;
    return buildReport({
      kind: 'month',
      key: monthKey,
      todayKey,
      transactions,
      categoryOf: (id) => {
        const c = getCategory(id);
        return c ? { name: categoryName(c), isFood: c.id === 'food' } : undefined;
      },
      subName: subcategoryName,
      limits: expenseCategories.map((c) => ({ categoryId: c.id, limit: c.monthlyLimit })),
      goals,
      goalEntries,
      debts,
      savingsTarget,
    });
  }, [monthKey, todayKey, transactions, getCategory, expenseCategories, goals, goalEntries, debts, savingsTarget, paydayRuleKey]);

  const budgetsOk = r.budgets.filter((b) => b.spent <= b.limit).length;
  const monthName = `${monthLabel(monthKey)}`;

  function rows() {
    return reportRows(
      r,
      { summary: t('mrep.sec.summary'), budgets: t('mrep.budget.title'), categories: t('mrep.cat.title'), goals: t('mrep.goal.title'), debts: t('mrep.debt.title'), highlights: t('mrep.hl.title'), income: t('mrep.income'), spend: t('mrep.spend'), saved: t('mrep.saved'), rate: t('mrep.rate'), vsLastMonth: t('mrep.vs.title'), paid: t('mrep.debt.title') },
      catName,
      (spent, limit) => t('mrep.budget.line', { spent: formatMoney(spent), limit: formatMoney(limit) }),
    );
  }
  const shareAsText = () => void shareText(reportToText(t('mrep.share.head', { month: monthName }), rows()));
  const shareAsCsv = () => void shareTextFile(datedName(`wakira-report-${monthKey}`, todayKey, 'csv'), reportToCsv(t('mrep.csv.header'), rows()), 'text/csv'); // i18n-ignore: file name

  const vs =
    r.spendChange === null
      ? t('mrep.vs.none')
      : Math.abs(r.spendChange) < 1
        ? t('mrep.vs.same')
        : r.spendChange > 0
          ? t('mrep.vs.up', { pct: Math.round(r.spendChange), amount: money(Math.abs(r.spend - r.prev.spend)) })
          : t('mrep.vs.down', { pct: Math.round(Math.abs(r.spendChange)), amount: money(Math.abs(r.spend - r.prev.spend)) });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('mrep.title')} />
          <MonthSwitcher
            label={monthName}
            range={cycleRangeLabel(monthKey)}
            isCurrent={monthKey === currentKey}
            canPrev={monthKey > earliestKey}
            canNext={monthKey < currentKey}
            onPrev={() => setMonthKey(shiftCycle(monthKey, -1))}
            onNext={() => setMonthKey(shiftCycle(monthKey, 1))}
            onReset={() => setMonthKey(currentKey)}
          />

          {r.records === 0 ? (
            <ThemedText type="small" style={muted}>{t('mrep.empty')}</ThemedText>
          ) : (
            <>
              <Card style={styles.gap}>
                <View style={styles.two}>
                  <Stat label={t('mrep.income')} value={money(r.income)} color={colors.positive} />
                  <Stat label={t('mrep.spend')} value={money(r.spend)} color={colors.negative} />
                </View>
                <View style={styles.two}>
                  <Stat label={t('mrep.saved')} value={money(r.net)} color={r.net >= 0 ? colors.positive : colors.negative} />
                  <View style={styles.flex}>
                    <ThemedText type="small" style={muted}>{t('mrep.rate')}</ThemedText>
                    <ThemedText style={Type.heading}>{r.rate === null ? '-' : t('mrep.rate.value', { pct: Math.round(r.rate) })}</ThemedText>
                    <ThemedText type="small" style={[muted, styles.sub]}>{r.rate === null ? t('mrep.rate.none') : t('mrep.rate.target', { pct: savingsTarget })}</ThemedText>
                  </View>
                </View>
                <ThemedText type="smallBold">{t('mrep.grade', { grade: r.grade })}</ThemedText>
              </Card>

              <Section title={t('mrep.vs.title')}>
                <ThemedText type="small">{vs}</ThemedText>
              </Section>

              <Section title={t('mrep.budget.title')}>
                {r.budgets.length === 0 ? (
                  <ThemedText type="small" style={muted}>{t('mrep.budget.none')}</ThemedText>
                ) : (
                  <>
                    <ThemedText type="small" style={muted}>{t('mrep.budget.summary', { ok: budgetsOk, total: r.budgets.length })}</ThemedText>
                    {r.budgets.map((b) => (
                      <Bar key={b.categoryId} label={catName(b.categoryId)} right={t('mrep.budget.line', { spent: money(b.spent), limit: money(b.limit) })} ratio={b.limit > 0 ? b.spent / b.limit : 0} color={b.spent > b.limit ? colors.negative : colors.accent} note={b.spent > b.limit ? t('mrep.budget.over', { amount: money(b.spent - b.limit) }) : undefined} />
                    ))}
                  </>
                )}
              </Section>

              <Section title={t('mrep.cat.title')}>
                {r.categories.length === 0 ? <ThemedText type="small" style={muted}>{t('mrep.cat.none')}</ThemedText> : null}
                {r.categories.slice(0, 6).map((c) => (
                  <Bar key={c.id} label={catName(c.id)} right={`${money(c.amount)} · ${t('mrep.cat.share', { pct: Math.round(c.share * 100) })}`} ratio={c.share} color={colors.accent} />
                ))}
              </Section>

              <Section title={t('mrep.goal.title')}>
                {r.goals.length === 0 ? <ThemedText type="small" style={muted}>{t('mrep.goal.none')}</ThemedText> : null}
                {r.goals.map((g) => (
                  <Bar key={g.id} label={g.name} right={t('mrep.goal.progress', { pct: Math.round(g.percent), target: money(g.target) })} ratio={g.percent / 100} color={colors.positive} note={g.inPeriod !== 0 ? t('mrep.goal.added', { amount: money(g.inPeriod) }) : undefined} />
                ))}
              </Section>

              <Section title={t('mrep.debt.title')}>
                <ThemedText type="small">{r.debtPaid > 0 ? t('mrep.debt.paid', { amount: money(r.debtPaid) }) : t('mrep.debt.none')}</ThemedText>
              </Section>

              <Section title={t('mrep.hl.title')}>
                {r.biggest[0] ? <ThemedText type="small">{t('mrep.hl.biggest', { title: r.biggest[0].title, amount: money(r.biggest[0].amount) })}</ThemedText> : null}
                {r.priciestDay ? <ThemedText type="small">{t('mrep.hl.priciest', { date: r.priciestDay.date, amount: money(r.priciestDay.amount) })}</ThemedText> : null}
                <ThemedText type="small">{t('mrep.hl.nospend', { n: r.noSpendDays })}</ThemedText>
                {r.biggestRise ? <ThemedText type="small">{t('mrep.hl.rise', { category: catName(r.biggestRise.id), pct: r.biggestRise.pct })}</ThemedText> : null}
              </Section>

              <View style={[styles.gap, styles.mt]}>
                <Button label={t('mrep.share.text')} icon="share-outline" onPress={shareAsText} />
                <Button label={t('mrep.share.csv')} icon="document-outline" variant="secondary" onPress={shareAsCsv} />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );

  function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
      <View style={styles.flex}>
        <ThemedText type="small" style={muted}>{label}</ThemedText>
        <ThemedText style={[Type.heading, { color }]}>{value}</ThemedText>
      </View>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={styles.mt}>
        <ThemedText style={[Type.heading, styles.h]}>{title}</ThemedText>
        <Card style={styles.gap}>{children}</Card>
      </View>
    );
  }

  function Bar({ label, right, ratio, color, note }: { label: string; right: string; ratio: number; color: string; note?: string }) {
    return (
      <View style={styles.bar}>
        <View style={styles.barHead}>
          <ThemedText type="small" style={styles.flex} numberOfLines={1}>{label}</ThemedText>
          <ThemedText type="small" style={muted}>{right}</ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
          <View style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
        </View>
        {note ? <ThemedText type="small" style={[muted, styles.sub]}>{note}</ThemedText> : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  gap: { gap: Spacing.two },
  mt: { marginTop: Spacing.three },
  h: { marginBottom: Spacing.two },
  flex: { flex: 1 },
  two: { flexDirection: 'row', gap: Spacing.three },
  sub: { fontSize: 12 },
  bar: { gap: 4 },
  barHead: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
});
