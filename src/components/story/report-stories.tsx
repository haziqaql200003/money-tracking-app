import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { annualSlides } from '@/components/story/annual-wrapped';
import { monthName, rm0, rm2, weekNo, dateText, type StoryCtx } from '@/components/story/story-common';
import { monthlySlides } from '@/components/story/monthly-poster';
import { StoryPlayer } from '@/components/story/story-player';
import { weeklySlides } from '@/components/story/weekly-receipt';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { categoryName, subcategoryName } from '@/i18n/data';
import { addDays, cycleOf, shiftCycle } from '@/utils/cycle';
import { toDateKey } from '@/utils/dates';
import { buildReport, MIN_RECORDS, mondayOf, periodOf, type ReportKind } from '@/utils/report-data';
import { shareText } from '@/services/share-file';

export type StoryRef = { kind: ReportKind; key: string };

/** The latest finished week and month, and the latest released year wrap. */
export function latestStories(todayKey: string): Record<ReportKind, StoryRef> {
  return {
    week: { kind: 'week', key: addDays(mondayOf(todayKey), -7) },
    month: { kind: 'month', key: shiftCycle(cycleOf(todayKey), -1) },
    // The year wrap stays secret until December, then it is this year's; from January it is last year's.
    year: { kind: 'year', key: String(Number(todayKey.slice(0, 4)) - (Number(todayKey.slice(5, 7)) === 12 ? 0 : 1)) },
  };
}

/** The year wrap exists only from 1 December to 15 January. */
function yearOpen(todayKey: string) {
  const month = Number(todayKey.slice(5, 7));
  return month === 12 || (month === 1 && Number(todayKey.slice(8, 10)) <= 15);
}

/** Builds the numbers for one story and plays it. */
export function ReportStory({ story, visible, onClose }: { story: StoryRef | null; visible: boolean; onClose: () => void }) {
  const { t, tp } = useT();
  const { transactions } = useTransactions();
  const { getCategory, expenseCategories } = useCategories();
  const { goals, goalEntries } = usePlan();
  const { debts } = useDebts();
  const { savingsTarget, paydayRuleKey } = useSettings();
  const todayKey = toDateKey(new Date());

  const built = useMemo(() => {
    void paydayRuleKey;
    if (!story || !visible) return null;
    const inputs = {
      todayKey,
      transactions,
      categoryOf: (id: string) => {
        const c = getCategory(id);
        return c ? { name: categoryName(c), isFood: c.id === 'food' } : undefined;
      },
      subName: subcategoryName,
      limits: expenseCategories.map((c) => ({ categoryId: c.id, limit: c.monthlyLimit })),
      goals,
      goalEntries,
      debts,
      savingsTarget,
    };
    const report = buildReport({ ...inputs, kind: story.kind, key: story.key });
    const prevYear = story.kind === 'year' ? buildReport({ ...inputs, kind: 'year', key: String(Number(story.key) - 1) }) : null;
    return { report, prevYear: prevYear && prevYear.records > 0 ? prevYear : null };
  }, [story, visible, todayKey, transactions, getCategory, expenseCategories, goals, goalEntries, debts, savingsTarget, paydayRuleKey]);

  if (!built || !story) return null;
  const { report } = built;
  const ctx: StoryCtx = {
    t,
    tp,
    catName: (id) => {
      const c = getCategory(id);
      return c ? categoryName(c) : t('cat.other');
    },
    subName: subcategoryName,
    savingsTarget,
    monthlyBudget: expenseCategories.reduce((sum, c) => sum + c.monthlyLimit, 0),
  };
  const slides = story.kind === 'week' ? weeklySlides(report, ctx) : story.kind === 'month' ? monthlySlides(report, ctx) : annualSlides(report, ctx, built.prevYear);
  const title =
    story.kind === 'week'
      ? t('rpt.title.week', { n: weekNo(report.period.from) })
      : story.kind === 'month'
        ? t('rpt.title.month', { month: `${monthName(report.period.key)} ${report.period.key.slice(0, 4)}` })
        : t('rpt.title.year', { year: report.period.key });

  const share = () => {
    const message =
      story.kind === 'week'
        ? t('rpt.shareWeek', { spend: rm2(report.spend), records: report.records, grade: report.grade })
        : story.kind === 'month'
          ? t('rpt.shareMonth', { month: monthName(report.period.key), spend: rm0(report.spend), rate: report.rate ?? 0 })
          : t('rpt.shareYear', { year: report.period.key, records: report.records, saved: rm0(report.net) });
    void shareText(message);
  };

  return <StoryPlayer visible={visible} onClose={onClose} title={title} slides={slides} onShare={share} />;
}

/** Records in a period, to decide whether its story is open yet. */
function useRecordCounts(refs: StoryRef[], todayKey: string) {
  const { transactions } = useTransactions();
  const { paydayRuleKey } = useSettings();
  return useMemo(() => {
    void paydayRuleKey;
    return refs.map((r) => {
      const p = periodOf(r.kind, r.key, todayKey);
      return transactions.filter((t) => t.date >= p.from && t.date <= p.end && !t.id.startsWith('aj:')).length;
    });
  }, [refs, todayKey, transactions, paydayRuleKey]);
}

/** The three stories as a list (Analyse > Insights). */
export function StoryShelf() {
  const colors = useTheme();
  const { t, tp } = useT();
  const todayKey = toDateKey(new Date());
  const refs = useMemo(() => Object.values(latestStories(todayKey)), [todayKey]);
  const counts = useRecordCounts(refs, todayKey);
  const [open, setOpen] = useState<StoryRef | null>(null);

  const rows = refs.flatMap((r, j) => {
    // The year wrap is a surprise: no teaser and no lock, it simply is not there until it can be opened.
    if (r.kind === 'year' && (!yearOpen(todayKey) || MIN_RECORDS.year - counts[j] > 0)) return [];
    const p = periodOf(r.kind, r.key, todayKey);
    const need = MIN_RECORDS[r.kind] - counts[j];
    const sub =
      r.kind === 'week'
        ? `${dateText(p.from)} – ${dateText(p.to)}`
        : r.kind === 'month'
          ? `${monthName(r.key)} ${r.key.slice(0, 4)}`
          : t('rpt.entry.yearSub', { year: r.key });
    return [{ r, sub, need, icon: (r.kind === 'week' ? 'receipt-outline' : r.kind === 'month' ? 'calendar-outline' : 'sparkles-outline') as keyof typeof Ionicons.glyphMap, tint: r.kind === 'week' ? '#B08968' : r.kind === 'month' ? '#E6A700' : '#4B3BFF' }];
  });

  return (
    <View style={[styles.shelf, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.shelfTitle, { color: colors.text }]}>{t('rpt.entry.title')}</Text>
      {rows.map(({ r, sub, need, icon, tint }, j) => (
        <Pressable
          key={r.kind}
          disabled={need > 0}
          onPress={() => setOpen(r)}
          style={({ pressed }) => [styles.row, j > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          <View style={[styles.icon, { backgroundColor: `${tint}26` }]}>
            <Ionicons name={need > 0 ? 'lock-closed' : icon} size={20} color={tint} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{t(`rpt.entry.${r.kind}` as TKey)}</Text>
            <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{need > 0 ? tp('rpt.entry.locked', need) : sub}</Text>
          </View>
          {need > 0 ? null : <Ionicons name="play-circle" size={28} color={tint} />}
        </Pressable>
      ))}
      <ReportStory story={open} visible={open !== null} onClose={() => setOpen(null)} />
    </View>
  );
}

/** A card on Home when a new story is ready: a week on Mon-Wed, a month in its first 5 days, the year from December. */
export function HomeStoryCard() {
  const { t } = useT();
  const { user } = useAuth();
  const todayKey = toDateKey(new Date());
  const latest = useMemo(() => latestStories(todayKey), [todayKey]);
  const [seen, setSeen] = usePersistedState<string[]>('story_seen', [], user?.id ?? null);
  const [open, setOpen] = useState<StoryRef | null>(null);

  const candidates = useMemo(() => {
    const out: StoryRef[] = [];
    if (yearOpen(todayKey)) out.push(latest.year);
    const cycleStart = periodOf('month', cycleOf(todayKey), todayKey).from;
    if (todayKey <= addDays(cycleStart, 4)) out.push(latest.month);
    const weekday = (new Date().getDay() + 6) % 7;
    // When the month turns on a Monday, the monthly story takes the slot and the weekly one is skipped.
    if (weekday <= 2 && mondayOf(todayKey) !== cycleStart) out.push(latest.week);
    return out;
  }, [todayKey, latest]);
  const counts = useRecordCounts(candidates, todayKey);
  const ready = candidates.find((c, j) => counts[j] >= MIN_RECORDS[c.kind] && !seen.includes(`${c.kind}:${c.key}`));

  const story = open ?? ready ?? null;
  if (!story) return null;
  const id = `${story.kind}:${story.key}`;
  const label =
    story.kind === 'week'
      ? t('rpt.home.week')
      : story.kind === 'month'
        ? t('rpt.home.month', { month: monthName(story.key) })
        : t('rpt.home.year', { year: story.key });
  const look = story.kind === 'week' ? { bg: '#2A241D', fg: '#F4EFE6', icon: 'receipt' as const } : story.kind === 'month' ? { bg: '#FFD43B', fg: '#1A1400', icon: 'calendar' as const } : { bg: '#4B3BFF', fg: '#FFFFFF', icon: 'sparkles' as const };

  return (
    <>
      {ready ? (
        <Pressable
          onPress={() => {
            setOpen(ready);
            setSeen((s) => [...s.filter((x) => x !== id).slice(-30), id]);
          }}
          style={({ pressed }) => [styles.card, { backgroundColor: look.bg }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <View style={[styles.cardIcon, { backgroundColor: `${look.fg}22` }]}>
            <Ionicons name={look.icon} size={22} color={look.fg} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: look.fg }]}>{label}</Text>
            <Text style={[styles.cardSub, { color: look.fg }]}>{t('rpt.home.open')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={look.fg} />
        </Pressable>
      ) : null}
      <ReportStory story={open} visible={open !== null} onClose={() => setOpen(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shelf: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, marginBottom: Spacing.three },
  shelfTitle: { fontSize: 16, fontWeight: '800', marginBottom: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  icon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderRadius: Radius.lg, marginBottom: Spacing.three },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSub: { fontSize: 13, opacity: 0.85 },
});
