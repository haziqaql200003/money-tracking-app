import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountInput } from '@/components/ui/amount-input';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { AllocLineSheet } from '@/components/tools/alloc-line-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTools } from '@/context/ToolsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { Alert } from '@/services/dialog';
import { allocSummary, commitmentsOf, commitmentsTotal, copyPlan, rule503020, suggestLines, type AllocLine, type AllocPlan } from '@/utils/allocation';
import { spentByCategory } from '@/utils/budget';
import { cycleOf, cycleRange, shiftCycle } from '@/utils/cycle';
import { formatMoney } from '@/utils/currency';
import { cycleRangeLabel, monthLabel, toDateKey } from '@/utils/dates';

const MASK = 'RM ••••';

export default function PlannerScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { plans, setPlan } = useTools();
  const { transactions, recurringRules, budgetEntries } = useTransactions();
  const { debts } = useDebts();
  const { goals } = usePlan();
  const { expenseCategories } = useCategories();
  const todayKey = toDateKey(new Date());
  const currentKey = cycleOf(todayKey);
  const [monthKey, setMonthKey] = useState(currentKey);
  const [sheet, setSheet] = useState<{ line: AllocLine | null } | null>(null);
  const [incomeText, setIncomeText] = useState<string | null>(null);
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const muted = { color: colors.textSecondary };

  const plan: AllocPlan = plans[monthKey] ?? { income: 0, lines: [] };
  const range = cycleRange(monthKey);
  const { from, to } = range;
  const commitments = useMemo(() => commitmentsOf({ from, to }, { todayKey, rules: recurringRules, transactions, debts }), [from, to, todayKey, recurringRules, transactions, debts]);
  const committed = commitmentsTotal(commitments);
  const sum = allocSummary(plan.income > 0 || plan.lines.length ? plan : undefined, committed);
  const recorded = useMemo(() => transactions.filter((x) => x.type === 'credit' && x.date >= range.from && x.date <= range.to).reduce((s, x) => s + x.amount, 0), [transactions, range.from, range.to]);
  const spent = useMemo(() => spentByCategory(budgetEntries, monthKey), [budgetEntries, monthKey]);
  const earliestKey = useMemo(() => Object.keys(plans).concat(transactions.map((x) => cycleOf(x.date))).reduce((m, k) => (k < m ? k : m), currentKey), [plans, transactions, currentKey]);

  const save = (next: AllocPlan) => setPlan(monthKey, next.income > 0 || next.lines.length ? next : null);
  const setIncome = (n: number) => save({ ...plan, income: Math.max(0, Math.round(n * 100) / 100) });
  const setLines = (lines: AllocLine[]) => save({ ...plan, lines });

  const nameOf = (l: AllocLine) => (l.kind === 'custom' ? l.label ?? '' : l.kind === 'goal' ? goals.find((g) => g.id === l.refId)?.name ?? '' : (() => { const c = expenseCategories.find((x) => x.id === l.refId); return c ? categoryName(c) : ''; })());

  function suggest() {
    const add = suggestLines({ categories: expenseCategories.map((c) => ({ id: c.id, limit: c.monthlyLimit })), goals: goals.filter((g) => !g.paused).map((g) => ({ id: g.id, monthly: g.monthly ?? 0 })), existing: plan.lines });
    if (add.length === 0) {
      Alert.alert(t('alloc.suggest'), t('alloc.suggest.none'));
      return;
    }
    setLines([...plan.lines, ...add]);
    if (committed > 0) Alert.alert(t('alloc.suggest'), t('alloc.suggest.double'));
  }

  function apply503020() {
    const lines = rule503020(plan.income, committed, { needs: t('alloc.rule.needs'), wants: t('alloc.rule.wants'), save: t('alloc.rule.save') });
    const run = () => setLines(lines);
    if (plan.lines.length === 0) run();
    else Alert.alert(t('alloc.rule'), t('alloc.rule.confirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('alloc.rule.replace'), onPress: run }]);
  }

  function copyLast() {
    const prev = plans[shiftCycle(monthKey, -1)];
    if (!prev) {
      Alert.alert(t('alloc.copy'), t('alloc.copy.none'));
      return;
    }
    save(copyPlan(prev));
    setIncomeText(null);
  }

  function clear() {
    Alert.alert(t('alloc.clear'), t('alloc.clear.confirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('alloc.clear'), style: 'destructive', onPress: () => { setPlan(monthKey, null); setIncomeText(null); } }]);
  }

  const stateText =
    sum.state === 'empty' ? t('alloc.state.empty') : sum.state === 'open' ? t('alloc.state.open', { amount: money(sum.left) }) : sum.state === 'zero' ? t('alloc.state.zero') : t('alloc.state.over', { amount: money(Math.abs(sum.left)) });
  const stateColor = sum.state === 'zero' ? colors.positive : sum.state === 'over' ? colors.negative : colors.textSecondary;
  const pct = (n: number) => (sum.income > 0 ? Math.max(0, Math.min(100, (n / sum.income) * 100)) : 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <ScreenHeader title={t('alloc.title')} />
          <ThemedText type="small" style={[muted, styles.tag]}>{t('alloc.tagline')}</ThemedText>
          <MonthSwitcher
            label={monthLabel(monthKey)}
            range={cycleRangeLabel(monthKey)}
            isCurrent={monthKey === currentKey}
            canPrev={monthKey > earliestKey}
            canNext={monthKey < shiftCycle(currentKey, 1)}
            onPrev={() => { setMonthKey(shiftCycle(monthKey, -1)); setIncomeText(null); }}
            onNext={() => { setMonthKey(shiftCycle(monthKey, 1)); setIncomeText(null); }}
            onReset={() => { setMonthKey(currentKey); setIncomeText(null); }}
          />

          <Card style={styles.gap}>
            <ThemedText type="smallBold">{t('alloc.income')}</ThemedText>
            <AmountInput
              value={incomeText ?? (plan.income > 0 ? String(plan.income) : '')}
              onChange={(v) => { setIncomeText(v); const n = parseFloat(v.replace(',', '.')); setIncome(Number.isFinite(n) ? n : 0); }}
              onBlur={() => setIncomeText(null)}
              style={[Type.heading, styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
              placeholderTextColor={colors.textSecondary}
            />
            <ThemedText type="small" style={muted}>{t('alloc.income.hint')}</ThemedText>
            {recorded > 0 && Math.round(recorded * 100) !== Math.round(plan.income * 100) ? (
              <Button size="sm" variant="secondary" label={t('alloc.income.use', { amount: money(recorded) })} onPress={() => { setIncome(recorded); setIncomeText(null); }} />
            ) : null}
          </Card>

          <Card style={[styles.gap, styles.mt]}>
            <View style={[styles.bar, { backgroundColor: colors.backgroundSelected }]}>
              <View style={{ width: `${pct(committed)}%`, backgroundColor: colors.warning }} />
              <View style={{ width: `${Math.min(pct(sum.assigned), 100 - pct(committed))}%`, backgroundColor: colors.accent }} />
            </View>
            <Stat dot={colors.warning} label={t('alloc.sum.committed')} value={money(sum.commitments)} />
            <Stat dot={colors.accent} label={t('alloc.sum.assigned')} value={money(sum.assigned)} />
            <View style={[styles.stat, styles.leftLine, { borderTopColor: colors.divider }]}>
              <ThemedText type="smallBold" style={styles.flex}>{t('alloc.sum.left')}</ThemedText>
              <ThemedText style={[Type.heading, { color: stateColor }]}>{money(sum.left)}</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: stateColor }}>{stateText}</ThemedText>
          </Card>

          <ThemedText style={[Type.heading, styles.h]}>{t('alloc.commit.title')}</ThemedText>
          {commitments.length === 0 ? (
            <ThemedText type="small" style={muted}>{t('alloc.commit.empty')}</ThemedText>
          ) : (
            <Card padding={0}>
              {commitments.map((c, i) => (
                <View key={c.id} style={[styles.row, i > 0 && { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <Ionicons name={c.kind === 'debt' ? 'card-outline' : 'receipt-outline'} size={18} color={colors.textSecondary} />
                  <View style={styles.flex}>
                    <ThemedText type="small" numberOfLines={1}>{c.title}</ThemedText>
                    <ThemedText type="small" style={[muted, styles.sub]}>{c.date}{c.done ? ` · ${t('alloc.commit.paid')}` : ''}{c.varies ? ` · ${t('alloc.commit.varies')}` : ''}</ThemedText>
                  </View>
                  <ThemedText type="smallBold">{money(c.amount)}</ThemedText>
                </View>
              ))}
            </Card>
          )}
          <ThemedText type="small" style={[muted, styles.sub, styles.mt]}>{t('alloc.commit.note')}</ThemedText>

          <ThemedText style={[Type.heading, styles.h]}>{t('alloc.lines.title')}</ThemedText>
          {plan.lines.length === 0 ? (
            <ThemedText type="small" style={muted}>{t('alloc.lines.empty')}</ThemedText>
          ) : (
            <Card padding={0}>
              {plan.lines.map((l, i) => {
                const used = l.kind === 'category' && l.refId ? spent.get(l.refId) ?? 0 : null;
                return (
                  <Pressable key={l.id} onPress={() => setSheet({ line: l })} style={[styles.row, i > 0 && { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <Ionicons name={l.kind === 'goal' ? 'flag-outline' : l.kind === 'category' ? 'pie-chart-outline' : 'pricetag-outline'} size={18} color={colors.accent} />
                    <View style={styles.flex}>
                      <ThemedText type="small" numberOfLines={1}>{nameOf(l)}</ThemedText>
                      {used !== null ? <ThemedText type="small" style={[{ color: used > l.amount ? colors.negative : colors.textSecondary }, styles.sub]}>{t('alloc.spent', { spent: money(used), planned: money(l.amount) })}</ThemedText> : null}
                    </View>
                    <ThemedText type="smallBold">{money(l.amount)}</ThemedText>
                  </Pressable>
                );
              })}
            </Card>
          )}

          <View style={[styles.gap, styles.mt]}>
            <Button label={t('alloc.add')} icon="add" onPress={() => setSheet({ line: null })} />
            <Button label={t('alloc.suggest')} variant="secondary" icon="sparkles-outline" onPress={suggest} />
            {plan.income > 0 ? <Button label={t('alloc.rule')} variant="secondary" icon="pie-chart-outline" onPress={apply503020} /> : null}
            <Button label={t('alloc.copy')} variant="secondary" icon="copy-outline" onPress={copyLast} />
            {plan.income > 0 || plan.lines.length ? <Button label={t('alloc.clear')} variant="danger" onPress={clear} /> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
      <AllocLineSheet
        visible={!!sheet}
        line={sheet?.line ?? null}
        onClose={() => setSheet(null)}
        onSave={(l) => { setLines(plan.lines.some((x) => x.id === l.id) ? plan.lines.map((x) => (x.id === l.id ? l : x)) : [...plan.lines, l]); setSheet(null); }}
        onRemove={(id) => { setLines(plan.lines.filter((x) => x.id !== id)); setSheet(null); }}
      />
    </ThemedView>
  );

  function Stat({ dot, label, value }: { dot: string; label: string; value: string }) {
    return (
      <View style={styles.stat}>
        <View style={[styles.dotS, { backgroundColor: dot }]} />
        <ThemedText type="small" style={styles.flex}>{label}</ThemedText>
        <ThemedText type="smallBold">{value}</ThemedText>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  tag: { marginTop: -Spacing.two, marginBottom: Spacing.two },
  gap: { gap: Spacing.two },
  mt: { marginTop: Spacing.three },
  h: { marginTop: Spacing.four, marginBottom: Spacing.two },
  flex: { flex: 1 },
  sub: { fontSize: 12 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 12 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotS: { width: 10, height: 10, borderRadius: 5 },
  leftLine: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.three },
});
