import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { dayLabel, monthLabel } from '@/utils/dates';
import type { EmergencyFund, Inflation, Payday, RecurringReview } from '@/utils/advanced';
import { comparePayoff, type DebtBurden } from '@/utils/debt-burden';
import { rangeLabel } from '@/utils/faham-period';
import { cycleRange } from '@/utils/cycle';
import { p1 } from '@/utils/percent';
import { frequencyLabel } from '@/utils/recurring';

const MASK = 'RM ••••';

/* ---------------- shared bits ---------------- */

function useMoney() {
  const { hideAmounts } = usePrivacy();
  return (n: number) => (hideAmounts ? MASK : `${n < 0 ? '-' : ''}${formatMoney(Math.abs(n))}`);
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <>
      <ThemedText type="smallBold" style={styles.sectionTitle}>{title}</ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>{children}</View>
    </>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]}>{label}</ThemedText>
      <ThemedText type={bold ? 'smallBold' : 'small'} style={[tabularNums, color ? { color } : null]}>{value}</ThemedText>
    </View>
  );
}

function Note({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <ThemedText type="small" style={[styles.note, { color: colors.textSecondary }]}>{children}</ThemedText>;
}

function Sub({ children }: { children: ReactNode }) {
  return <ThemedText type="smallBold" style={styles.sub}>{children}</ThemedText>;
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.link, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{label}</ThemedText>
      <Ionicons name="arrow-forward" size={14} color={colors.accent} />
    </Pressable>
  );
}

export function Stepper({ value, onChange, step, min = 0, max = 100000, format }: { value: number; onChange: (v: number) => void; step: number; min?: number; max?: number; format: (v: number) => string }) {
  const colors = useTheme();
  const btn = (icon: 'remove' | 'add', next: number, disabled: boolean) => (
    <Pressable
      onPress={() => onChange(next)}
      disabled={disabled}
      hitSlop={6}
      style={[styles.stepBtn, { backgroundColor: colors.backgroundSelected }, disabled && { opacity: 0.4 }]}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={16} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('remove', Math.max(min, value - step), value <= min)}
      <ThemedText type="smallBold" style={[styles.stepValue, tabularNums]} numberOfLines={1} adjustsFontSizeToFit>{format(value)}</ThemedText>
      {btn('add', Math.min(max, value + step), value >= max)}
    </View>
  );
}

const keysLabel = (keys: string[]) => (keys.length ? rangeLabel({ from: cycleRange(keys[0]).from, to: cycleRange(keys[keys.length - 1]).to }) : '');
const signedPct = (n: number | null) => (n === null ? '—' : `${n > 0 ? '+' : ''}${p1(n)}%`);

/* ---------------- 10.1 recurring commitments ---------------- */

export function RecurringCard({ data }: { data: RecurringReview }) {
  const colors = useTheme();
  const { t } = useT();
  const money = useMoney();
  const router = useRouter();
  const { getCategory } = useCategories();
  const catName = (id: string) => {
    const c = getCategory(id);
    return c ? categoryName(c) : t('cat.other');
  };
  const nothing = data.items.length === 0 && data.detected.length === 0;
  return (
    <Card title={t('plan.adv.rec.title')}>
      {nothing ? (
        <Note>{t('plan.adv.rec.none')}</Note>
      ) : (
        <>
          <Row label={t('plan.adv.rec.monthly')} value={money(data.monthly)} bold />
          <Row label={t('plan.adv.rec.annual')} value={money(data.annual)} />
          {data.items.length > 0 ? (
            <>
              <Sub>{t('plan.adv.rec.biggest')}</Sub>
              {data.items.slice(0, 5).map((i) => (
                <Row key={i.ruleId} label={`${i.title || catName(i.categoryId)} · ${frequencyLabel(i.frequency)}`} value={`${money(i.monthly)}${t('plan.adv.perMonth')}`} />
              ))}
            </>
          ) : null}
          {data.upcoming.length > 0 ? (
            <>
              <Sub>{t('plan.adv.rec.upcoming')}</Sub>
              {data.upcoming.slice(0, 5).map((b) => (
                <Row key={b.id} label={`${dayLabel(b.date)} · ${b.title}`} value={b.varies && !b.amount ? t('plan.adv.rec.varies') : money(b.amount)} />
              ))}
            </>
          ) : null}
          {data.added.length > 0 ? (
            <>
              <Sub>{t('plan.adv.rec.added')}</Sub>
              {data.added.map((i) => (
                <Row key={i.ruleId} label={i.title || catName(i.categoryId)} value={`${money(i.monthly)}${t('plan.adv.perMonth')}`} />
              ))}
            </>
          ) : null}
          {data.changes.length > 0 ? (
            <>
              <Sub>{t('plan.adv.rec.changes')}</Sub>
              {data.changes.map((c) => (
                <Row key={c.ruleId} label={c.title} value={`${money(c.before)} → ${money(c.now)} (${signedPct(c.pct)})`} color={c.pct > 0 ? colors.negative : colors.positive} />
              ))}
            </>
          ) : null}
          {data.duplicates.length > 0 ? (
            <>
              <Sub>{t('plan.adv.rec.duplicates')}</Sub>
              {data.duplicates.map(([a, b]) => (
                <Row key={`${a.ruleId}-${b.ruleId}`} label={`${a.title} · ${b.title}`} value={`${money(a.monthly + b.monthly)}${t('plan.adv.perMonth')}`} color={colors.warning} />
              ))}
              <Note>{t('plan.adv.rec.duplicatesNote')}</Note>
            </>
          ) : null}
          {data.detected.length > 0 ? (
            <>
              <Sub>{t('plan.adv.rec.detected')}</Sub>
              {data.detected.map((d) => (
                <Row key={d.title} label={`${d.title} · ${t('plan.adv.rec.inMonths', { n: d.months })}`} value={`~${money(d.average)}${t('plan.adv.perMonth')}`} />
              ))}
              <Note>{t('plan.adv.rec.detectedNote')}</Note>
            </>
          ) : null}
          <Note>{t('plan.adv.rec.usageNote')}</Note>
        </>
      )}
      <LinkButton label={t('fc.go.recurring')} onPress={() => router.push('/more/recurring')} />
    </Card>
  );
}

/* ---------------- 10.2 lifestyle inflation ---------------- */

export function InflationCard({ data }: { data: Inflation | null }) {
  const colors = useTheme();
  const { t } = useT();
  const money = useMoney();
  const { getCategory } = useCategories();
  if (!data) {
    return (
      <Card title={t('plan.adv.inf.title')}>
        <Note>{t('plan.adv.inf.needMore')}</Note>
      </Card>
    );
  }
  const verdictColor = data.inflating ? colors.warning : colors.positive;
  return (
    <Card title={t('plan.adv.inf.title')}>
      <ThemedText type="smallBold" style={{ color: verdictColor }}>{data.inflating ? t('plan.adv.inf.yes') : t('plan.adv.inf.no')}</ThemedText>
      <View style={styles.tableHead}>
        <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]} />
        <ThemedText type="small" style={[styles.col, { color: colors.textSecondary }]}>{t('plan.adv.inf.before')}</ThemedText>
        <ThemedText type="small" style={[styles.col, { color: colors.textSecondary }]}>{t('plan.adv.inf.after')}</ThemedText>
        <ThemedText type="small" style={[styles.colSm, { color: colors.textSecondary }]}>{t('plan.adv.inf.change')}</ThemedText>
      </View>
      {[
        { k: t('plan.adv.inf.income'), b: money(data.incomeBefore), a: money(data.incomeAfter), c: signedPct(data.incomeGrowth) },
        { k: t('plan.adv.inf.spending'), b: money(data.spendingBefore), a: money(data.spendingAfter), c: signedPct(data.spendingGrowth) },
        { k: t('plan.adv.inf.rate'), b: data.rateBefore === null ? '—' : `${p1(data.rateBefore)}%`, a: data.rateAfter === null ? '—' : `${p1(data.rateAfter)}%`, c: '' },
      ].map((r) => (
        <View key={r.k} style={styles.tableRow}>
          <ThemedText type="small" style={styles.flex}>{r.k}</ThemedText>
          <ThemedText type="small" style={[styles.col, tabularNums]} numberOfLines={1} adjustsFontSizeToFit>{r.b}</ThemedText>
          <ThemedText type="small" style={[styles.col, tabularNums]} numberOfLines={1} adjustsFontSizeToFit>{r.a}</ThemedText>
          <ThemedText type="smallBold" style={[styles.colSm, tabularNums]}>{r.c}</ThemedText>
        </View>
      ))}
      {data.drivers.length > 0 ? (
        <>
          <Sub>{t('plan.adv.inf.drivers')}</Sub>
          {data.drivers.map((d) => {
            const c = getCategory(d.categoryId);
            return <Row key={d.categoryId} label={c ? categoryName(c) : t('cat.other')} value={`+${money(d.diff)}${t('plan.adv.perMonth')}`} color={colors.negative} />;
          })}
        </>
      ) : null}
      <Note>{t('plan.adv.inf.how', { before: keysLabel(data.beforeKeys), after: keysLabel(data.afterKeys) })}</Note>
    </Card>
  );
}

/* ---------------- 10.3 emergency fund ---------------- */

export function EmergencyCard({ data }: { data: EmergencyFund | null }) {
  const colors = useTheme();
  const { t } = useT();
  const money = useMoney();
  const router = useRouter();
  if (!data) {
    return (
      <Card title={t('plan.adv.ef.title')}>
        <Note>{t('plan.adv.ef.needMore')}</Note>
      </Card>
    );
  }
  const pct = Math.min(100, (data.months / 6) * 100);
  const color = data.months >= 6 ? colors.positive : data.months >= 3 ? colors.accent : colors.warning;
  return (
    <Card title={t('plan.adv.ef.title')}>
      <ThemedText style={[styles.big, { color }]}>{t('plan.adv.ef.months', { n: p1(data.months) })}</ThemedText>
      <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
        <View style={[styles.fill, { width: `${Math.max(2, pct)}%`, backgroundColor: color }]} />
        <View style={[styles.marker, { left: '50%', backgroundColor: colors.textSecondary }]} />
      </View>
      <View style={styles.scale}>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>0</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('plan.adv.ef.three')}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('plan.adv.ef.six')}</ThemedText>
      </View>
      <Row label={t('plan.adv.ef.savings')} value={money(data.savings)} bold />
      <Row label={t('plan.adv.ef.essential')} value={`${money(data.essential)}${t('plan.adv.perMonth')}`} />
      <Row label={t('plan.adv.ef.target3')} value={money(data.target3)} />
      <Row label={t('plan.adv.ef.gap3')} value={data.gap3 > 0 ? money(data.gap3) : t('plan.adv.ef.reached')} color={data.gap3 > 0 ? undefined : colors.positive} />
      <Row label={t('plan.adv.ef.target6')} value={money(data.target6)} />
      <Row label={t('plan.adv.ef.gap6')} value={data.gap6 > 0 ? money(data.gap6) : t('plan.adv.ef.reached')} color={data.gap6 > 0 ? undefined : colors.positive} />
      <Note>{t('plan.adv.ef.how', { period: keysLabel(data.basedOn) })}</Note>
      <LinkButton label={t('plan.adv.ef.goal')} onPress={() => router.push('/more/goals')} />
    </Card>
  );
}

/* ---------------- 10.5 payday ---------------- */

export function PaydayCard({ data, available }: { data: Payday | null; available: number }) {
  const colors = useTheme();
  const { t } = useT();
  const money = useMoney();
  if (!data) {
    return (
      <Card title={t('plan.adv.pay.title')}>
        <Note>{t('plan.adv.pay.needMore')}</Note>
      </Card>
    );
  }
  const perDay = available / Math.max(1, data.daysToPay);
  const tight = available < 0 || (data.dailyRest > 0 && perDay < data.dailyRest * 0.6);
  const heavy = data.firstWeekShare >= 40;
  return (
    <Card title={t('plan.adv.pay.title')}>
      <ThemedText type="smallBold" style={{ color: heavy ? colors.warning : colors.text }}>
        {t('plan.adv.pay.share', { pct: p1(data.firstWeekShare) })}
      </ThemedText>
      <Note>{t('plan.adv.pay.even')}</Note>
      <Row label={t('plan.adv.pay.dailyFirst')} value={money(data.dailyFirstWeek)} />
      <Row label={t('plan.adv.pay.dailyRest')} value={money(data.dailyRest)} />
      <Sub>{t('plan.adv.pay.cycles')}</Sub>
      {data.cycles.map((c) => (
        <Row key={c.key} label={`${monthLabel(c.key, 'short')} · ${t('plan.adv.pay.paidOn', { date: dayLabel(c.payDate) })}`} value={`${money(c.firstWeek)} (${p1(c.share)}%)`} />
      ))}
      <Sub>{t('plan.adv.pay.now')}</Sub>
      <Row label={t('plan.adv.pay.next', { date: dayLabel(data.nextPayDate) })} value={t('plan.adv.pay.days', { n: data.daysToPay })} bold />
      <Row label={t('plan.adv.pay.available')} value={money(available)} />
      <Row label={t('plan.adv.pay.perDay')} value={money(perDay)} color={tight ? colors.negative : colors.positive} bold />
      {tight ? <ThemedText type="small" style={{ color: colors.negative }}>{t('plan.adv.pay.tight')}</ThemedText> : null}
      <Note>{data.fromRule ? t('plan.adv.pay.fromRule') : t('plan.adv.pay.fromSetting')}</Note>
    </Card>
  );
}

/* ---------------- 10.4 debt burden ---------------- */

export function DebtCard({ data, todayKey }: { data: DebtBurden | null; todayKey: string }) {
  const colors = useTheme();
  const { t } = useT();
  const money = useMoney();
  const router = useRouter();
  const [extra, setExtra] = useState(100);
  if (!data) {
    return (
      <Card title={t('plan.adv.debt.title')}>
        <Note>{t('plan.adv.debt.none')}</Note>
        <LinkButton label={t('fc.go.debts')} onPress={() => router.push('/more/debts')} />
      </Card>
    );
  }
  const plans = comparePayoff(data.lines, extra, todayKey);
  const dtiColor = data.dti === null ? colors.text : data.dti >= 40 ? colors.negative : data.dti >= 30 ? colors.warning : colors.positive;
  const when = (m: number) => t('plan.adv.debt.inMonths', { n: m });
  return (
    <Card title={t('plan.adv.debt.title')}>
      <Row label={t('plan.adv.debt.outstanding')} value={money(data.outstanding)} bold />
      {data.creditUsed > 0 ? <Row label={t('plan.adv.debt.creditUsed')} value={money(data.creditUsed)} /> : null}
      <Row label={t('plan.adv.debt.monthly')} value={money(data.monthly)} bold />
      <Row label={t('plan.adv.debt.dti')} value={data.dti === null ? '—' : `${p1(data.dti)}%`} color={dtiColor} />
      {data.debtFreeDate ? <Row label={t('plan.adv.debt.free')} value={monthLabel(data.debtFreeDate.slice(0, 7), 'long')} /> : null}
      <Row label={t('plan.adv.debt.progress')} value={`${p1(data.progress)}%`} />
      {data.lines.length > 0 ? (
        <>
          <Sub>{t('plan.adv.debt.each')}</Sub>
          {data.lines.map((l) => (
            <Row
              key={l.id}
              label={`${l.name} · ${l.payoffDate ? monthLabel(l.payoffDate.slice(0, 7), 'short') : ''} · ${p1(l.progress)}%`}
              value={`${money(l.remaining)} · ${money(l.monthly)}${t('plan.adv.perMonth')}`}
            />
          ))}
        </>
      ) : null}
      {plans && data.lines.length > 0 ? (
        <>
          <Sub>{t('plan.adv.debt.simTitle')}</Sub>
          <View style={styles.row}>
            <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]}>{t('plan.adv.debt.extra')}</ThemedText>
            <Stepper value={extra} onChange={setExtra} step={50} max={10000} format={(v) => money(v)} />
          </View>
          <Row label={t('plan.adv.debt.scheduled')} value={when(plans.scheduled.months)} />
          <Row label={t('plan.adv.debt.avalanche')} value={when(plans.avalanche.months)} color={colors.positive} />
          <Row label={t('plan.adv.debt.snowball')} value={when(plans.snowball.months)} color={colors.positive} />
          <Note>{t('plan.adv.debt.simNote')}</Note>
        </>
      ) : null}
      <LinkButton label={t('fc.go.debts')} onPress={() => router.push('/more/debts')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionTitle: { fontSize: FontSize.body, marginBottom: Spacing.two, marginTop: Spacing.two },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sub: { marginTop: Spacing.two },
  note: { fontSize: FontSize.caption, lineHeight: 16 },
  link: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, marginTop: Spacing.one },
  big: { fontSize: FontSize.title, fontWeight: '800' },
  track: { height: 10, borderRadius: Radius.pill, overflow: 'hidden', position: 'relative' },
  fill: { height: 10, borderRadius: Radius.pill },
  marker: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  col: { width: 82, textAlign: 'right' },
  colSm: { width: 58, textAlign: 'right' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 76, textAlign: 'center' },
});
