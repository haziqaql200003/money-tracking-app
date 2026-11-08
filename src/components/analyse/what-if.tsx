import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Stepper } from '@/components/analyse/advanced-cards';
import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { NO_CHANGE, simulate, type Levers, type WhatIfBase } from '@/utils/what-if';

const MASK = 'RM ••••';

type Props = { base: WhatIfBase | null; todayKey: string };

/**
 * What-If simulation inside Insight. Every figure is arithmetic on the user's own averages; nothing is saved and no
 * record, budget or plan is changed. Base and simulation are always shown side by side and labelled.
 */
export function WhatIf({ base, todayKey }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { getCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [lv, setLv] = useState<Levers>(NO_CHANGE);
  const money = (n: number) => (hideAmounts ? MASK : `${n < 0 ? '-' : ''}${formatMoney(Math.abs(n))}`);
  const set = (patch: Partial<Levers>) => setLv((v) => ({ ...v, ...patch }));
  const muted = { color: colors.textSecondary };

  const results = useMemo(() => (base ? { before: simulate(base, NO_CHANGE, todayKey), after: simulate(base, lv, todayKey) } : null), [base, lv, todayKey]);
  const changed = JSON.stringify(lv) !== JSON.stringify(NO_CHANGE);

  if (!base || !results) {
    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="smallBold">{t('plan.wi.title')}</ThemedText>
        <ThemedText type="small" style={muted}>{t('plan.wi.needMore')}</ThemedText>
      </View>
    );
  }

  const cats = base.categories.slice(0, 6);
  const catMax = lv.cutCategoryId ? Math.floor(base.categories.find((c) => c.categoryId === lv.cutCategoryId)?.amount ?? 0) : 0;
  const goalName = (base.goals.find((g) => g.id === lv.goalId) ?? base.goals[0])?.name;
  const months = (n: number | null) => (n === null ? t('plan.wi.never') : t('plan.adv.debt.inMonths', { n }));
  const { before: b, after: a } = results;

  type Line = { k: string; b: string; a: string; diff: number; goodUp: boolean };
  const lines: Line[] = [
    { k: t('plan.wi.r.cashFlow'), b: money(b.cashFlow), a: money(a.cashFlow), diff: a.cashFlow - b.cashFlow, goodUp: true },
    { k: t('plan.wi.r.left'), b: money(b.leftAfterSaving), a: money(a.leftAfterSaving), diff: a.leftAfterSaving - b.leftAfterSaving, goodUp: true },
    { k: t('plan.wi.r.available6'), b: money(b.available6), a: money(a.available6), diff: a.available6 - b.available6, goodUp: true },
    { k: t('plan.wi.r.savings12'), b: money(b.savings12), a: money(a.savings12), diff: a.savings12 - b.savings12, goodUp: true },
    {
      k: t('plan.wi.r.runway'),
      b: b.runway12 === null ? '—' : t('plan.adv.ef.months', { n: b.runway12 }),
      a: a.runway12 === null ? '—' : t('plan.adv.ef.months', { n: a.runway12 }),
      diff: (a.runway12 ?? 0) - (b.runway12 ?? 0),
      goodUp: true,
    },
  ];
  if (goalName) lines.push({ k: t('plan.wi.r.goal', { name: goalName }), b: months(b.goalMonths), a: months(a.goalMonths), diff: (b.goalMonths ?? 999) - (a.goalMonths ?? 999), goodUp: true });
  if (b.debtMonths !== null) lines.push({ k: t('plan.wi.r.debt'), b: months(b.debtMonths), a: months(a.debtMonths), diff: (b.debtMonths ?? 0) - (a.debtMonths ?? 0), goodUp: true });

  const lever = (label: string, control: ReactNode) => (
    <View style={styles.lever}>
      <ThemedText type="small" style={styles.flex}>{label}</ThemedText>
      {control}
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.head} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="flask-outline" size={18} color={colors.accent} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{t('plan.wi.title')}</ThemedText>
          <ThemedText type="small" style={muted}>{t('plan.wi.subtitle')}</ThemedText>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
      </Pressable>

      {open ? (
        <>
          <View style={[styles.banner, { backgroundColor: colors.backgroundSelected }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
            <ThemedText type="small" style={[styles.flex, muted]}>{t('plan.wi.banner')}</ThemedText>
          </View>

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

          <View style={[styles.table, { borderTopColor: colors.divider }]}>
            <View style={styles.tRow}>
              <ThemedText type="small" style={[styles.flex, muted]} />
              <ThemedText type="small" style={[styles.col, muted]}>{t('plan.wi.base')}</ThemedText>
              <ThemedText type="smallBold" style={[styles.col, { color: colors.accent }]}>{t('plan.wi.sim')}</ThemedText>
            </View>
            {lines.map((l) => {
              const c = !changed || Math.abs(l.diff) < 0.005 ? colors.text : l.diff > 0 === l.goodUp ? colors.positive : colors.negative;
              return (
                <View key={l.k} style={styles.tRow}>
                  <ThemedText type="small" style={styles.flex}>{l.k}</ThemedText>
                  <ThemedText type="small" style={[styles.col, tabularNums, muted]} numberOfLines={1} adjustsFontSizeToFit>{l.b}</ThemedText>
                  <ThemedText type="smallBold" style={[styles.col, tabularNums, { color: c }]} numberOfLines={1} adjustsFontSizeToFit>{l.a}</ThemedText>
                </View>
              );
            })}
          </View>

          <ThemedText type="small" style={[styles.note, muted]}>{t('plan.wi.assumptions', { months: base.months })}</ThemedText>
          {changed ? (
            <Pressable onPress={() => setLv(NO_CHANGE)} style={styles.reset} accessibilityRole="button">
              <Ionicons name="refresh" size={14} color={colors.accent} />
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('plan.wi.reset')}</ThemedText>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: Radius.md, alignItems: 'flex-start' },
  lever: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chips: { gap: Spacing.two, paddingVertical: 2 },
  table: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, gap: 8, marginTop: Spacing.one },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  col: { width: 96, textAlign: 'right' },
  note: { fontSize: FontSize.caption, lineHeight: 16 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6 },
});
