import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Stepper } from '@/components/analyse/advanced-cards';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { Alert } from '@/services/dialog';
import { formatMoney } from '@/utils/currency';
import { NO_CHANGE, simulate, type Levers, type WhatIfBase } from '@/utils/what-if';

const MASK = 'RM ••••';

type Props = {
  base: WhatIfBase | null;
  todayKey: string;
  /** Levers to start from, e.g. "spend less on Shopping" when opened from an insight. */
  initial?: Partial<Levers>;
};

/** The levers an insight about this category starts What if… with: RM 100 less (or the whole amount when smaller). */
export function leversFor(base: WhatIfBase | null, categoryId?: string): Partial<Levers> | undefined {
  const c = categoryId ? base?.categories.find((x) => x.categoryId === categoryId) : undefined;
  return c ? { cutCategoryId: c.categoryId, cutAmount: Math.min(100, Math.floor(c.amount)) } : undefined;
}

/**
 * What if… (full screen in 3.8.1). Every figure is arithmetic on the pengguna's own averages; trying levers saves
 * nothing. The only thing that changes data is the separate, confirmed "Set budget" button under the results.
 */
export function WhatIfPanel({ base, todayKey, initial }: Props) {
  const colors = useTheme();
  const { t, tp } = useT();
  const { hideAmounts } = usePrivacy();
  const { getCategory, updateCategory } = useCategories();
  const start = useMemo(() => ({ ...NO_CHANGE, ...initial }), [initial]);
  const [lv, setLv] = useState<Levers>(start);
  const [applied, setApplied] = useState<string | null>(null);
  const money = (n: number) => (hideAmounts ? MASK : `${n < 0 ? '-' : ''}${formatMoney(Math.abs(n))}`);
  const set = (patch: Partial<Levers>) => setLv((v) => ({ ...v, ...patch }));
  const muted = { color: colors.textSecondary };

  const results = useMemo(() => (base ? { before: simulate(base, NO_CHANGE, todayKey), after: simulate(base, lv, todayKey) } : null), [base, lv, todayKey]);
  const changed = JSON.stringify(lv) !== JSON.stringify(NO_CHANGE);

  if (!base || !results) {
    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="small" style={muted}>{t('plan.wi.needMore')}</ThemedText>
      </View>
    );
  }

  const cats = base.categories.slice(0, 6);
  const catAvg = lv.cutCategoryId ? base.categories.find((c) => c.categoryId === lv.cutCategoryId)?.amount ?? 0 : 0;
  const catMax = Math.floor(catAvg);
  const goal = base.goals.find((g) => g.id === lv.goalId) ?? base.goals[0];
  const goalName = goal?.name;
  const months = (n: number | null) => (n === null ? t('plan.wi.never') : t('plan.adv.debt.inMonths', { n }));
  const { before: b, after: a } = results;

  type Line = { k: string; b: string; a: string; diff: number };
  const lines: Line[] = [
    { k: t('plan.wi.r.cashFlow'), b: money(b.cashFlow), a: money(a.cashFlow), diff: a.cashFlow - b.cashFlow },
    { k: t('plan.wi.r.left'), b: money(b.leftAfterSaving), a: money(a.leftAfterSaving), diff: a.leftAfterSaving - b.leftAfterSaving },
    { k: t('plan.wi.r.available6'), b: money(b.available6), a: money(a.available6), diff: a.available6 - b.available6 },
    { k: t('plan.wi.r.savings12'), b: money(b.savings12), a: money(a.savings12), diff: a.savings12 - b.savings12 },
    {
      k: t('plan.wi.r.runway'),
      b: b.runway12 === null ? '—' : t('plan.adv.ef.months', { n: b.runway12 }),
      a: a.runway12 === null ? '—' : t('plan.adv.ef.months', { n: a.runway12 }),
      diff: (a.runway12 ?? 0) - (b.runway12 ?? 0),
    },
  ];
  if (goalName) lines.push({ k: t('plan.wi.r.goal', { name: goalName }), b: months(b.goalMonths), a: months(a.goalMonths), diff: (b.goalMonths ?? 999) - (a.goalMonths ?? 999) });
  if (b.debtMonths !== null) lines.push({ k: t('plan.wi.r.debt'), b: months(b.debtMonths), a: months(a.debtMonths), diff: (b.debtMonths ?? 0) - (a.debtMonths ?? 0) });

  /* One plain sentence on what the changes do */
  const verdict: string[] = [];
  if (changed) {
    const kept = Math.round((a.cashFlow - b.cashFlow) * 100) / 100;
    if (Math.abs(kept) >= 1) verdict.push(kept > 0 ? t('plan.wi.verdict.more', { amount: money(kept) }) : t('plan.wi.verdict.less', { amount: money(-kept) }));
    if (goalName && a.goalMonths !== null) {
      if (b.goalMonths !== null && a.goalMonths < b.goalMonths) verdict.push(tp('plan.wi.verdict.goal', b.goalMonths - a.goalMonths, { name: goalName }));
      else if (b.goalMonths === null) verdict.push(tp('plan.wi.verdict.goalNow', a.goalMonths, { name: goalName }));
    }
  }

  /* The one real action: turn the cut into a monthly budget, after asking */
  const cutCat = lv.cutCategoryId ? getCategory(lv.cutCategoryId) : undefined;
  const newLimit = cutCat && lv.cutAmount > 0 ? Math.max(0, Math.round(catAvg - lv.cutAmount)) : null;
  const applyKey = cutCat && newLimit !== null ? `${cutCat.id}:${newLimit}` : null;
  const alreadySet = !!cutCat && newLimit !== null && (cutCat.monthlyLimit === newLimit || applied === applyKey);
  const applyBudget = () => {
    if (!cutCat || newLimit === null) return;
    const name = categoryName(cutCat);
    Alert.alert(t('plan.wi.apply.title'), t('plan.wi.apply.body', { category: name, amount: money(newLimit) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('plan.wi.apply.ok'),
        onPress: () => {
          updateCategory(cutCat.id, { monthlyLimit: newLimit });
          setApplied(applyKey);
        },
      },
    ]);
  };

  const lever = (label: string, control: ReactNode) => (
    <View style={styles.lever}>
      <ThemedText type="small" style={styles.flex}>{label}</ThemedText>
      {control}
    </View>
  );

  return (
    <View>
      <View style={[styles.banner, { backgroundColor: colors.backgroundSelected }]}>
        <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
        <ThemedText type="small" style={[styles.flex, muted]}>{t('plan.wi.banner')}</ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        {lever(t('plan.wi.l.income'), <Stepper value={lv.incomePct} onChange={(v) => set({ incomePct: v })} step={5} min={-50} max={50} format={(v) => `${v > 0 ? '+' : ''}${v}%`} />)}
        <ThemedText type="small">{t('plan.wi.l.cut')}</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {cats.map((c) => {
            const cat = getCategory(c.categoryId);
            return (
              <Chip
                key={c.categoryId}
                size="sm"
                label={cat ? categoryName(cat) : t('cat.other')}
                active={lv.cutCategoryId === c.categoryId}
                onPress={() => set(lv.cutCategoryId === c.categoryId ? { cutCategoryId: null, cutAmount: 0 } : { cutCategoryId: c.categoryId, cutAmount: Math.min(100, Math.floor(c.amount)) })}
              />
            );
          })}
        </ScrollView>
        {lv.cutCategoryId ? lever(t('plan.wi.l.cutBy'), <Stepper value={lv.cutAmount} onChange={(v) => set({ cutAmount: v })} step={50} max={catMax} format={money} />) : null}
        {lever(t('plan.wi.l.saving'), <Stepper value={lv.extraSaving} onChange={(v) => set({ extraSaving: v })} step={50} max={20000} format={money} />)}
        {base.goals.length > 1 && lv.extraSaving > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {base.goals.map((g) => (
              <Chip key={g.id} size="sm" label={g.name} active={(lv.goalId ?? base.goals[0].id) === g.id} onPress={() => set({ goalId: g.id })} />
            ))}
          </ScrollView>
        ) : null}
        {lever(t('plan.wi.l.commitment'), <Stepper value={lv.newCommitment} onChange={(v) => set({ newCommitment: v })} step={50} max={20000} format={money} />)}
        {base.debts.length > 0 ? lever(t('plan.wi.l.debt'), <Stepper value={lv.extraDebt} onChange={(v) => set({ extraDebt: v })} step={50} max={20000} format={money} />) : null}
        {changed ? (
          <Pressable onPress={() => setLv(NO_CHANGE)} style={styles.reset} accessibilityRole="button">
            <Ionicons name="refresh" size={14} color={colors.accent} />
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('plan.wi.reset')}</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.tRow}>
          <ThemedText type="small" style={[styles.flex, muted]} />
          <ThemedText type="small" style={[styles.col, muted]}>{t('plan.wi.base')}</ThemedText>
          <ThemedText type="smallBold" style={[styles.col, { color: colors.accent }]}>{t('plan.wi.sim')}</ThemedText>
        </View>
        {lines.map((l) => {
          const c = !changed || Math.abs(l.diff) < 0.005 ? colors.text : l.diff > 0 ? colors.positive : colors.negative;
          return (
            <View key={l.k} style={[styles.tRow, styles.tLine, { borderTopColor: colors.divider }]}>
              <ThemedText type="small" style={styles.flex}>{l.k}</ThemedText>
              <ThemedText type="small" style={[styles.col, tabularNums, muted]} numberOfLines={1} adjustsFontSizeToFit>{l.b}</ThemedText>
              <ThemedText type="smallBold" style={[styles.col, tabularNums, { color: c }]} numberOfLines={1} adjustsFontSizeToFit>{l.a}</ThemedText>
            </View>
          );
        })}
        {verdict.length > 0 ? (
          <View style={[styles.verdict, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
            <ThemedText type="small" style={styles.flex}>{verdict.join(' ')}</ThemedText>
          </View>
        ) : null}
      </View>

      {cutCat && newLimit !== null ? (
        alreadySet ? (
          <View style={[styles.done, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.positive} />
            <ThemedText type="small" style={styles.flex}>{t('plan.wi.apply.done', { category: categoryName(cutCat), amount: money(newLimit) })}</ThemedText>
          </View>
        ) : (
          <Button label={t('plan.wi.apply.button', { category: categoryName(cutCat), amount: money(newLimit) })} icon="pie-chart" onPress={applyBudget} />
        )
      ) : null}

      <ThemedText type="small" style={[styles.note, muted]}>{t('plan.wi.assumptions', { months: base.months })}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three, gap: 12 },
  banner: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Radius.md, alignItems: 'flex-start', marginBottom: Spacing.three },
  lever: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chips: { gap: Spacing.two, paddingVertical: 2 },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tLine: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  col: { width: 96, textAlign: 'right' },
  verdict: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Radius.md, alignItems: 'flex-start' },
  done: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: Radius.lg, alignItems: 'center' },
  note: { fontSize: FontSize.caption, lineHeight: 16, marginTop: Spacing.three },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
});
