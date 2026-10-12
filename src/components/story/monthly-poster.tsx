import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { CountUp, GrowBar, Pop, Rise } from '@/components/story/story-kit';
import { dateText, dayName, int, monthName, rm0, type StoryCtx } from '@/components/story/story-common';
import type { StorySlide } from '@/components/story/story-player';
import { weekdayShort } from '@/i18n/format';
import { addDays } from '@/utils/cycle';
import type { Report } from '@/utils/report-data';

const INK = '#1A1400';
const POSTERS = ['#FFD43B', '#63E6BE', '#FF8787', '#74C0FC', '#FFA94D', '#B197FC', '#F1F3F5'];

/** Concept F: every slide is a poster with one giant outlined number behind it. */
export function monthlySlides(r: Report, c: StoryCtx): StorySlide[] {
  const { t, tp } = c;
  const month = monthName(r.period.key);
  const pages: { key: string; big: string; body: ReactNode }[] = [];
  const target = c.savingsTarget;

  pages.push({
    key: 'intro',
    big: r.period.key.slice(5, 7),
    body: (
      <View style={s.fill}>
        <Rise>
          <Text style={s.lead}>{t('rpt.m.intro1')}</Text>
        </Rise>
        <Rise delay={150}>
          <Text style={s.title}>{t('rpt.m.introTitle', { month })}</Text>
        </Rise>
        <Rise delay={400}>
          <Text style={s.body}>{t('rpt.m.introBody', { records: r.records, days: r.daysCounted })}</Text>
        </Rise>
        <Rise delay={1000}>
          <View style={s.pill}>
            <Text style={s.pillText}>{t('rpt.tapToStart')}</Text>
          </View>
        </Rise>
      </View>
    ),
  });

  if (r.rate !== null) {
    const pass = r.rate >= target;
    const outPct = r.income > 0 ? Math.round((r.spend / r.income) * 100) : 0;
    pages.push({
      key: 'saved',
      big: `${Math.max(r.rate, 0)}%`,
      body: (
        <View style={s.fill}>
          <Rise>
            <Text style={s.lead}>{t('rpt.m.savedHead')}</Text>
          </Rise>
          <CountUp value={r.rate} format={(n) => `${Math.round(n)}%`} delay={200} style={s.hero} />
          <Rise delay={400}>
            <Text style={s.body}>
              {t('rpt.m.savedBody', { target })} <Text style={s.strong}>{pass ? t('rpt.m.pass') : t('rpt.m.notYet')}</Text>
            </Text>
          </Rise>
          <Rise delay={700} style={s.card}>
            <View style={s.row}>
              <Text style={s.label}>{t('rpt.m.in')}</Text>
              <Text style={s.label}>{rm0(r.income)}</Text>
            </View>
            <GrowBar pct={100} color={INK} track="rgba(26,20,0,0.12)" delay={800} height={12} />
            <View style={[s.row, s.mt]}>
              <Text style={s.label}>{t('rpt.m.out')}</Text>
              <Text style={s.label}>{rm0(r.spend)}</Text>
            </View>
            <GrowBar pct={outPct} color="#E03131" track="rgba(26,20,0,0.12)" delay={1000} height={12} />
          </Rise>
        </View>
      ),
    });
  } else {
    pages.push({
      key: 'spent',
      big: rm0(r.spend).replace('RM ', ''),
      body: (
        <View style={s.fill}>
          <Rise>
            <Text style={s.lead}>{t('rpt.m.spentHead')}</Text>
          </Rise>
          <CountUp value={r.spend} format={rm0} delay={200} style={s.hero} />
        </View>
      ),
    });
  }

  if (r.budgets.length > 0) {
    const ok = r.budgets.filter((b) => b.pct <= 100).length;
    pages.push({
      key: 'budgets',
      big: `${ok}/${r.budgets.length}`,
      body: (
        <View style={s.fill}>
          <Rise>
            <Text style={s.lead}>{t('rpt.m.budgetHead')}</Text>
          </Rise>
          <Rise delay={150}>
            <Text style={s.title2}>{t('rpt.m.budgetTitle', { ok, n: r.budgets.length })}</Text>
          </Rise>
          {r.budgets.slice(0, 6).map((b, j) => {
            const over = b.pct > 100;
            return (
              <Rise key={b.categoryId} delay={400 + j * 120} style={s.budget}>
                <View style={s.row}>
                  <Text style={[s.label, s.flex]} numberOfLines={1}>
                    {c.catName(b.categoryId)}
                  </Text>
                  <Text style={[s.chip, over ? s.chipBad : s.chipOk]}>{`${b.pct}%`}</Text>
                </View>
                <GrowBar pct={b.pct} color={over ? '#E03131' : INK} track="rgba(26,20,0,0.12)" delay={600 + j * 120} height={8} />
              </Rise>
            );
          })}
        </View>
      ),
    });
  }

  if (r.biggestRise || r.biggestFall) {
    const lead = r.biggestRise ?? r.biggestFall!;
    pages.push({
      key: 'change',
      big: `${lead.pct > 0 ? '+' : ''}${lead.pct}%`,
      body: (
        <View style={s.fill}>
          <Rise>
            <Text style={s.lead}>{t('rpt.m.changeHead')}</Text>
          </Rise>
          {[r.biggestRise, r.biggestFall].map((x, j) =>
            x ? (
              <Pop key={x.id} delay={250 + j * 350} style={s.card}>
                <Text style={s.label}>{c.catName(x.id)}</Text>
                <Text style={[s.change, { color: x.pct > 0 ? '#C92A2A' : '#087F5B' }]}>{`${x.pct > 0 ? '+' : ''}${x.pct}%`}</Text>
                <Text style={s.body}>{t('rpt.m.changeUp', { now: rm0(x.now), before: rm0(x.before) })}</Text>
              </Pop>
            ) : null,
          )}
        </View>
      ),
    });
  }

  // Calendar: Monday-first grid of the month
  const lead = (new Date(Number(r.period.from.slice(0, 4)), Number(r.period.from.slice(5, 7)) - 1, Number(r.period.from.slice(8, 10))).getDay() + 6) % 7;
  const max = Math.max(1, ...r.daily);
  pages.push({
    key: 'map',
    big: int(r.noSpendDays),
    body: (
      <View style={s.fill}>
        <Rise>
          <Text style={s.lead}>{t('rpt.m.mapHead')}</Text>
        </Rise>
        <Rise delay={150} style={s.card}>
          <View style={s.grid}>
            {Array.from({ length: 7 }, (_, d) => (
              <Text key={`h${d}`} style={s.dow}>
                {weekdayShort(d).slice(0, 1)}
              </Text>
            ))}
            {Array.from({ length: lead }, (_, j) => (
              <View key={`e${j}`} style={s.cell} />
            ))}
            {r.daily.map((v, j) => {
              const future = j >= r.daysCounted;
              const lvl = future ? -1 : v === 0 ? 0 : Math.min(4, 1 + Math.floor((v / max) * 4));
              const bg = ['rgba(26,20,0,0.06)', 'rgba(26,20,0,0.18)', 'rgba(26,20,0,0.35)', 'rgba(224,49,49,0.55)', '#E03131'][Math.max(0, lvl)];
              return (
                <Pop key={j} delay={300 + j * 25} style={[s.cell, { backgroundColor: future ? 'transparent' : bg }, lvl === 0 && s.cellFree]}>
                  <Text style={[s.cellText, lvl >= 3 && { color: '#FFFFFF' }]}>{Number(addDays(r.period.from, j).slice(8, 10))}</Text>
                </Pop>
              );
            })}
          </View>
        </Rise>
        <Rise delay={1200} style={s.pairRow}>
          {r.priciestDay ? (
            <View style={[s.card, s.flex]}>
              <Text style={s.small}>{t('rpt.m.priciest')}</Text>
              <Text style={s.label}>{`${dayName(r.priciestDay.date).slice(0, 3)} ${dateText(r.priciestDay.date).split(' ').slice(0, 2).join(' ')} · ${rm0(r.priciestDay.amount)}`}</Text>
            </View>
          ) : null}
          <View style={[s.card, s.flex]}>
            <Text style={s.small}>{t('rpt.m.noSpend')}</Text>
            <Text style={s.label}>{tp('rpt.m.days', r.noSpendDays)}</Text>
          </View>
        </Rise>
      </View>
    ),
  });

  if (r.goals.length > 0) {
    pages.push({
      key: 'goals',
      big: `${r.goals[0].percent}%`,
      body: (
        <View style={s.fill}>
          <Rise>
            <Text style={s.lead}>{t('rpt.m.goalsHead')}</Text>
          </Rise>
          {r.goals.map((g, j) => (
            <Rise key={g.id} delay={250 + j * 300} style={s.card}>
              <View style={s.row}>
                <Text style={[s.goal, s.flex]} numberOfLines={1}>
                  {g.name}
                </Text>
                <CountUp value={g.percent} format={(n) => `${Math.round(n)}%`} delay={400 + j * 300} style={s.goal} />
              </View>
              <GrowBar pct={g.percent} color={INK} track="rgba(26,20,0,0.12)" delay={500 + j * 300} height={14} />
              <Text style={s.small}>{t('rpt.m.goalMeta', { amount: rm0(g.inPeriod), saved: rm0(g.saved), target: rm0(g.target) })}</Text>
            </Rise>
          ))}
        </View>
      ),
    });
  }

  const over = r.budgets.find((b) => b.pct > 100);
  const tip = over
    ? t('rpt.m.tipBudget', { name: c.catName(over.categoryId), amount: rm0(Math.round((over.limit * 0.9 + over.spent * 0.1) / 10) * 10) })
    : r.records < 30
      ? t('rpt.m.tipRecord')
      : t('rpt.m.tipKeep');
  const okBudgets = r.budgets.filter((b) => b.pct <= 100).length;
  const tiles: [string, string][] = [
    [t('rpt.m.sumIn'), rm0(r.income)],
    [t('rpt.m.sumOut'), rm0(r.spend)],
    [t('rpt.m.sumSaved'), r.rate === null ? '—' : `${r.rate}%`],
    [t('rpt.m.sumBudget'), r.budgets.length ? `${okBudgets} / ${r.budgets.length}` : '—'],
    [t('rpt.m.sumRecords'), int(r.records)],
    [t('rpt.m.sumNoSpend'), int(r.noSpendDays)],
  ];
  pages.push({
    key: 'sum',
    big: r.period.key.slice(0, 4),
    body: (
      <View style={s.sumWrap}>
        <Pop style={s.sumCard}>
          <View style={s.row}>
            <Text style={s.sumTitle}>{`${month} ${r.period.key.slice(0, 4)}`}</Text>
            <Text style={s.tag}>{t('rpt.m.sumTag')}</Text>
          </View>
          <View style={s.tiles}>
            {tiles.map(([label, value], j) => (
              <Pop key={label} delay={250 + j * 80} style={s.tile}>
                <Text style={s.small}>{label}</Text>
                <Text style={s.tileValue}>{value}</Text>
              </Pop>
            ))}
          </View>
          <View style={s.tip}>
            <Text style={s.body}>
              <Text style={s.strong}>{t('rpt.m.tipLabel')}</Text> {tip}
            </Text>
          </View>
        </Pop>
      </View>
    ),
  });

  return pages.map((p, j) => ({
    key: p.key,
    bg: POSTERS[j % POSTERS.length],
    fg: INK,
    final: j === pages.length - 1,
    backdrop: <Outline text={p.big} />,
    content: p.body,
  }));
}

/** The poster's giant number, drawn only as an outline so the text on top stays readable. */
function Outline({ text }: { text: string }) {
  const size = text.length <= 2 ? 300 : text.length <= 4 ? 210 : 150;
  return (
    <Svg width="100%" height="100%">
      <SvgText x={-12} y={size + 60} fontSize={size} fontWeight="800" fill="none" stroke="rgba(26,20,0,0.22)" strokeWidth={2} letterSpacing={-8}>
        {text}
      </SvgText>
    </Svg>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center', gap: 14 },
  flex: { flex: 1 },
  lead: { fontSize: 20, fontWeight: '800', color: INK },
  title: { fontSize: 58, lineHeight: 60, fontWeight: '900', letterSpacing: -2, color: INK },
  title2: { fontSize: 40, lineHeight: 44, fontWeight: '900', letterSpacing: -1, color: INK },
  hero: { fontSize: 92, lineHeight: 96, fontWeight: '900', letterSpacing: -3, color: INK },
  body: { fontSize: 17, lineHeight: 25, color: INK },
  strong: { fontWeight: '800' },
  pill: { alignSelf: 'flex-start', backgroundColor: INK, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  pillText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  card: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 22, padding: 16, gap: 8 },
  budget: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  mt: { marginTop: 8 },
  label: { fontSize: 15, fontWeight: '800', color: INK },
  small: { fontSize: 12, color: INK, opacity: 0.75 },
  chip: { fontSize: 12, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  chipOk: { backgroundColor: 'rgba(26,20,0,0.12)', color: INK },
  chipBad: { backgroundColor: '#E03131', color: '#FFFFFF' },
  change: { fontSize: 56, lineHeight: 60, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  dow: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '800', color: INK, opacity: 0.6 },
  cell: { width: `${100 / 7 - 1.6}%`, marginHorizontal: '0.8%', aspectRatio: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cellFree: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(26,20,0,0.5)' },
  cellText: { fontSize: 11, fontWeight: '800', color: INK },
  pairRow: { flexDirection: 'row', gap: 10 },
  goal: { fontSize: 22, fontWeight: '900', color: INK },
  sumWrap: { flex: 1, justifyContent: 'center' },
  sumCard: { backgroundColor: '#FFFFFF', borderRadius: 30, padding: 20, gap: 14, borderWidth: 3, borderColor: INK },
  sumTitle: { fontSize: 26, fontWeight: '900', color: INK, letterSpacing: -0.5 },
  tag: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', backgroundColor: INK, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47.5%', backgroundColor: '#FFF3BF', borderRadius: 16, padding: 12, gap: 3 },
  tileValue: { fontSize: 17, fontWeight: '900', color: INK },
  tip: { backgroundColor: '#FFF3BF', borderRadius: 16, padding: 14 },
});
