import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { STORY_FACES, Text } from '@/components/ui/text';
import { CountUp, Drift, Grow, Pop, ProgressRing, Rise } from '@/components/story/story-kit';
import { dateText, int, monthName, rm0, type StoryCtx } from '@/components/story/story-common';
import type { StorySlide } from '@/components/story/story-player';
import type { Report } from '@/utils/report-data';

const INK = '#17161A';
const GROTESK = STORY_FACES.grotesk;
/** One soft colour per slide, chosen by what the slide is about, so a skipped slide never shifts the colours. */
const FIELD = {
  intro: '#FFD8B0',
  kept: '#CDEFD9',
  spent: '#CDEFD9',
  flow: '#CFE1FF',
  where: '#E8D6FA',
  change: '#FFF1B8',
  plan: '#FFD6DE',
  sum: '#F3EEE6',
} as const;
type Field = keyof typeof FIELD;
const SHADES = [INK, '#4A4750', '#7D7A84', 'rgba(23,22,26,0.25)'];

/**
 * Monthly story (3.8), "colour field": one soft colour per slide, very large numbers, little else.
 * A month is a payday cycle (utils/cycle.ts), so the copy says "cycle" where it compares.
 */
export function monthlySlides(r: Report, c: StoryCtx): StorySlide[] {
  const { t, tp } = c;
  const month = monthName(r.period.key);
  const target = c.savingsTarget;
  const pages: { key: Field; body: ReactNode }[] = [];

  // 1. Intro
  const digits = String(Number(r.period.key.slice(5, 7)));
  pages.push({
    key: 'intro',
    body: (
      <View style={s.fill}>
        <View style={s.digits}>
          {digits.split('').map((d, j) => (
            <Animated.Text key={j} entering={FadeInUp.delay(250 + j * 140).duration(900).springify().damping(14)} style={s.digit} allowFontScaling={false}>
              {d}
            </Animated.Text>
          ))}
        </View>
        <View style={s.bottom}>
          <Rise delay={700}>
            <Text style={s.h3}>{t('rpt.m.introTitle', { month })}</Text>
          </Rise>
          <Rise delay={900}>
            <Text style={s.body}>{t('rpt.m.introBody', { from: dateText(r.period.from), to: dateText(r.period.to) })}</Text>
            <Text style={s.body}>{tp('rpt.m.records', r.records)}</Text>
          </Rise>
          <Rise delay={1400}>
            <Text style={s.hint}>{t('rpt.tapToStart')}</Text>
          </Rise>
        </View>
      </View>
    ),
  });

  // 2. Kept (or spent, without income)
  if (r.rate !== null) {
    const rate = Math.max(0, r.rate);
    const scale = Math.max(30, target + 10, rate + 5);
    const pts = Math.abs((r.rate ?? 0) - target);
    const pass = r.rate >= target;
    pages.push({
      key: 'kept',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.lede}>{t('rpt.m.keptHead')}</Text>
          </Rise>
          <CountUp value={rate} format={(n) => `${Math.round(n)}%`} delay={400} style={[s.big, s.hero]} />
          <Rise delay={600}>
            <Text style={s.lede}>{t('rpt.m.keptUnit')}</Text>
          </Rise>
          <View style={s.meter}>
            <View style={s.track}>
              <Grow delay={900} style={[s.trackFill, { width: `${(rate / scale) * 100}%` }]} />
            </View>
            <Rise delay={1600} style={[s.mark, { left: `${(target / scale) * 100}%` }]}>
              <View style={s.markLine} />
              <Text style={s.markLabel}>{t('rpt.m.target', { target })}</Text>
            </Rise>
          </View>
          <View style={s.bottom}>
            <Rise delay={1800}>
              <Text style={s.body}>{r.net < 0 ? t('rpt.m.keptNeg', { amount: rm0(-r.net) }) : pass ? t('rpt.m.keptPass', { amount: rm0(r.net), pts }) : t('rpt.m.keptBelow', { amount: rm0(r.net), pts })}</Text>
            </Rise>
            <Pop delay={2200} style={s.pill}>
              <Text style={s.pillText}>{pass ? t('rpt.m.pass') : t('rpt.m.notYet')}</Text>
            </Pop>
          </View>
        </View>
      ),
    });
  } else {
    pages.push({
      key: 'spent',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.lede}>{t('rpt.m.spentHead')}</Text>
          </Rise>
          <CountUp value={r.spend} format={rm0} delay={400} style={[s.big, s.mid]} />
          <Rise delay={800}>
            <Text style={s.body}>{t('rpt.m.spentBody')}</Text>
          </Rise>
        </View>
      ),
    });
  }

  // 3. Money in and out
  if (r.income > 0) {
    const top = Math.max(r.income, r.spend, 1);
    pages.push({
      key: 'flow',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.lede}>{t('rpt.m.flowHead')}</Text>
          </Rise>
          <CountUp value={Math.abs(r.net)} format={(n) => `${r.net < 0 ? '−' : '+'}${rm0(n)}`} delay={400} style={[s.big, s.mid]} />
          <View style={s.flows}>
            <Rise delay={600} style={s.gap8}>
              <View style={s.row}>
                <Text style={s.label}>{t('rpt.m.in')}</Text>
                <Text style={s.label}>{rm0(r.income)}</Text>
              </View>
              <Grow delay={700} style={[s.flowBar, { width: `${(r.income / top) * 100}%` }]} />
            </Rise>
            <Rise delay={900} style={s.gap8}>
              <View style={s.row}>
                <Text style={s.label}>{t('rpt.m.out')}</Text>
                <Text style={s.label}>{rm0(r.spend)}</Text>
              </View>
              <Grow delay={1000} style={[s.flowBar, s.flowOut, { width: `${Math.max(2, (r.spend / top) * 100)}%` }]} />
            </Rise>
          </View>
          {r.incomeBy.length > 0 ? (
            <Rise delay={1600}>
              <Text style={s.body}>{r.incomeBy.slice(0, 2).map((x) => `${c.catName(x.id)} ${rm0(x.amount)}`).join(' · ')}</Text>
            </Rise>
          ) : null}
          {r.moved > 0 ? (
            <Rise delay={2000} style={s.bottom}>
              <Text style={s.note}>{t('rpt.m.moved', { amount: rm0(r.moved) })}</Text>
            </Rise>
          ) : null}
        </View>
      ),
    });
  }

  // 4. Where it went
  const top = r.categories[0];
  if (top && r.spend > 0) {
    const shown = r.categories.slice(0, 3);
    const rest = Math.max(0, r.spend - shown.reduce((x, y) => x + y.amount, 0));
    const rows = [...shown.map((x) => ({ name: c.catName(x.id), amount: x.amount })), ...(rest > 0.5 ? [{ name: t('rpt.m.rest'), amount: rest }] : [])];
    pages.push({
      key: 'where',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.lede}>{t('rpt.m.whereHead')}</Text>
          </Rise>
          <Rise delay={350}>
            <Text style={s.h3} numberOfLines={2}>
              {c.catName(top.id)}
            </Text>
          </Rise>
          <CountUp value={top.amount} format={rm0} delay={600} style={[s.big, s.mid]} />
          <View style={s.stack}>
            {rows.map((x, j) => (
              <Grow key={x.name} delay={900 + j * 160} style={{ flex: Math.max(0.02, x.amount / r.spend), height: '100%', backgroundColor: SHADES[Math.min(j, 3)] }} />
            ))}
          </View>
          <View style={s.bottom}>
            {rows.map((x, j) => (
              <Rise key={x.name} delay={1300 + j * 160} style={[s.listRow, j === 0 && s.listFirst]}>
                <View style={[s.key, { backgroundColor: SHADES[Math.min(j, 3)] }]} />
                <Text style={[s.rowText, s.flex]} numberOfLines={1}>
                  {x.name}
                </Text>
                <Text style={s.rowText}>{`${rm0(x.amount)} · ${Math.round((x.amount / r.spend) * 100)}%`}</Text>
              </Rise>
            ))}
          </View>
        </View>
      ),
    });
  }

  // 5. Biggest change (a fall is told first: it is the good news)
  const main = r.biggestFall ?? r.biggestRise;
  if (main) {
    const other = main === r.biggestFall ? r.biggestRise : r.biggestFall;
    const down = main.pct < 0;
    pages.push({
      key: 'change',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.lede}>{t('rpt.m.changeHead')}</Text>
          </Rise>
          <Animated.View entering={(down ? FadeInDown : FadeInUp).delay(400).duration(900).springify().damping(10)} style={s.arrow}>
            <Ionicons name={down ? 'arrow-down' : 'arrow-up'} size={84} color={INK} />
          </Animated.View>
          <Rise delay={700}>
            <Text style={s.h3}>{c.catName(main.id)}</Text>
          </Rise>
          <CountUp value={Math.abs(main.pct)} format={(n) => `${down ? '−' : '+'}${Math.round(n)}%`} delay={850} style={[s.big, s.hero]} />
          <Rise delay={1200}>
            <Text style={s.body}>{t('rpt.m.changeBody', { now: rm0(main.now), before: rm0(main.before) })}</Text>
          </Rise>
          {other ? (
            <Rise delay={1700} style={[s.bottom, s.otherRow]}>
              <Text style={[s.rowText, s.flex]}>{other.pct < 0 ? t('rpt.m.alsoDown', { name: c.catName(other.id) }) : t('rpt.m.alsoUp', { name: c.catName(other.id) })}</Text>
              <Text style={[s.rowText, s.bold]}>{`${other.now - other.before >= 0 ? '+' : '−'}${rm0(Math.abs(other.now - other.before))}`}</Text>
            </Rise>
          ) : null}
        </View>
      ),
    });
  }

  // 6. Budgets and goals
  const okBudgets = r.budgets.filter((b) => b.pct <= 100).length;
  if (r.budgets.length > 0 || r.goals.length > 0) {
    pages.push({
      key: 'plan',
      body: (
        <View style={s.fill}>
          {r.budgets.length > 0 ? (
            <>
              <Rise delay={200}>
                <Text style={s.lede}>{t('rpt.m.budgetHead')}</Text>
              </Rise>
              <Rise delay={350}>
                <Text style={[s.big, s.mid]} allowFontScaling={false}>
                  {t('rpt.m.budgetBig', { ok: okBudgets, n: r.budgets.length })}
                </Text>
              </Rise>
              <View style={s.budgets}>
                {r.budgets.slice(0, 5).map((b, j) => {
                  const over = b.pct > 100;
                  return (
                    <Rise key={b.categoryId} delay={600 + j * 130} style={s.budget}>
                      <Text style={[s.budgetName]} numberOfLines={1}>
                        {c.catName(b.categoryId)}
                      </Text>
                      <View style={s.budgetTrack}>
                        <Grow delay={700 + j * 130} style={[s.budgetFill, { width: `${Math.min(100, b.pct)}%`, backgroundColor: over ? '#C2255C' : INK }]} />
                      </View>
                      <Text style={[s.budgetPct, over && s.over]}>{`${b.pct}%`}</Text>
                    </Rise>
                  );
                })}
              </View>
            </>
          ) : (
            <Rise delay={200}>
              <Text style={s.lede}>{t('rpt.m.goalsHead')}</Text>
            </Rise>
          )}
          {r.goals.length > 0 ? (
            <View style={[s.goals, r.budgets.length > 0 && s.bottom]}>
              {r.goals.slice(0, 2).map((g, j) => (
                <Pop key={g.id} delay={1500 + j * 200} style={s.goal}>
                  <View>
                    <ProgressRing pct={g.percent} color={INK} track="rgba(23,22,26,0.12)" delay={1700 + j * 200} />
                    <View style={s.ringLabel}>
                      <Text style={s.ringPct} allowFontScaling={false}>{`${g.percent}%`}</Text>
                    </View>
                  </View>
                  <Text style={s.goalName} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={s.goalMeta}>{t('rpt.m.goalAdded', { amount: rm0(g.inPeriod) })}</Text>
                </Pop>
              ))}
            </View>
          ) : null}
        </View>
      ),
    });
  }

  // 7. Summary
  const over = r.budgets.find((b) => b.pct > 100);
  const tip = over
    ? t('rpt.m.tipBudget', { name: c.catName(over.categoryId), amount: rm0(over.limit) })
    : r.records < 30
      ? t('rpt.m.tipRecord')
      : t('rpt.m.tipKeep');
  // The best thing about the cycle, from the strongest evidence available (nothing is invented when nothing stands out).
  const win =
    r.rate !== null && r.rate >= target
      ? t('rpt.m.winTarget', { rate: r.rate, target })
      : r.biggestFall
        ? t('rpt.m.winCut', { name: c.catName(r.biggestFall.id), amount: rm0(r.biggestFall.before - r.biggestFall.now) })
        : r.budgets.length > 0 && okBudgets === r.budgets.length
          ? t('rpt.m.winBudgets')
          : r.noSpendDays >= 5
            ? t('rpt.m.winNoSpend', { n: r.noSpendDays })
            : r.longestStreak >= 7
              ? t('rpt.m.winStreak', { n: r.longestStreak })
              : null;
  const tiles: [string, string, string][] = [
    [t('rpt.m.sumIn'), rm0(r.income), FIELD.intro],
    [t('rpt.m.sumOut'), rm0(r.spend), FIELD.flow],
    [t('rpt.m.sumSaved'), r.rate === null ? '—' : `${r.rate}%`, FIELD.kept],
    r.budgets.length ? [t('rpt.m.sumBudget'), `${okBudgets} / ${r.budgets.length}`, FIELD.where] : [t('rpt.m.sumRecords'), int(r.records), FIELD.where],
  ];
  pages.push({
    key: 'sum',
    body: (
      <View style={s.fill}>
        <Rise delay={150}>
          <Text style={[s.h3, s.sumTitle]}>{t('rpt.m.sumTitle', { month })}</Text>
        </Rise>
        <View style={s.tiles}>
          {tiles.map(([name, value, bg], j) => (
            <Pop key={name} delay={400 + j * 120} style={[s.tile, { backgroundColor: bg }]}>
              <Text style={s.tileLabel}>{name}</Text>
              <Text style={s.tileValue} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>
                {value}
              </Text>
            </Pop>
          ))}
        </View>
        {win ? (
          <Rise delay={1100}>
            <Text style={s.line}>
              <Text style={s.bold}>{t('rpt.m.winLabel')}</Text> {win}
            </Text>
          </Rise>
        ) : null}
        <Rise delay={1300}>
          <Text style={s.line}>
            <Text style={s.bold}>{t('rpt.m.tipLabel')}</Text> {tip}
          </Text>
        </Rise>
      </View>
    ),
  });

  return pages.map((p, j) => ({
    key: p.key,
    bg: FIELD[p.key],
    fg: INK,
    track: 'rgba(23,22,26,0.18)',
    button: { bg: INK, fg: '#FFFFFF', border: INK },
    final: j === pages.length - 1,
    backdrop: p.key === 'sum' ? null : <Drift style={s.blob} dx={-40} dy={30} duration={9000} />,
    content: p.body,
  }));
}

const s = StyleSheet.create({
  fill: { flex: 1, paddingTop: 12, gap: 6 },
  bottom: { marginTop: 'auto', gap: 10 },
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  gap8: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  blob: { position: 'absolute', width: 380, height: 380, borderRadius: 190, right: -150, top: -100, backgroundColor: 'rgba(255,255,255,0.38)' },
  digits: { flexDirection: 'row', marginTop: 20 },
  digit: { fontFamily: GROTESK, fontSize: 200, lineHeight: 190, letterSpacing: -12, color: INK },
  h3: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1.4, color: INK },
  lede: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: INK, letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23, color: INK },
  hint: { fontSize: 12, color: INK, marginTop: 20 },
  note: { fontSize: 13, lineHeight: 19, color: 'rgba(23,22,26,0.7)' },
  big: { fontFamily: GROTESK, color: INK, fontVariant: ['tabular-nums'] },
  hero: { fontSize: 128, lineHeight: 130, letterSpacing: -6 },
  mid: { fontSize: 62, lineHeight: 68, letterSpacing: -3 },
  meter: { marginTop: 40, height: 50 },
  track: { height: 16, borderRadius: 16, backgroundColor: 'rgba(23,22,26,0.12)', overflow: 'hidden' },
  trackFill: { height: 16, borderRadius: 16, backgroundColor: INK },
  mark: { position: 'absolute', top: -6, alignItems: 'center', width: 90, marginLeft: -45 },
  markLine: { width: 2, height: 28, backgroundColor: INK },
  markLabel: { fontSize: 12, fontWeight: '700', color: INK, marginTop: 4 },
  pill: { alignSelf: 'flex-start', backgroundColor: INK, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  flows: { marginTop: 28, gap: 18 },
  label: { fontSize: 15, fontWeight: '700', color: INK },
  flowBar: { height: 44, borderRadius: 14, backgroundColor: INK },
  flowOut: { backgroundColor: 'transparent', borderWidth: 2.5, borderColor: INK },
  stack: { flexDirection: 'row', height: 22, borderRadius: 22, overflow: 'hidden', gap: 3, marginTop: 24 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(23,22,26,0.22)' },
  listFirst: { borderTopWidth: 1.5, borderTopColor: INK },
  key: { width: 10, height: 10, borderRadius: 3 },
  rowText: { fontSize: 15, color: INK },
  arrow: { marginTop: 12, marginLeft: -10 },
  otherRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1.5, borderTopColor: INK, paddingTop: 12 },
  budgets: { marginTop: 10 },
  budget: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  budgetName: { width: 96, fontSize: 13.5, color: INK },
  budgetTrack: { flex: 1, height: 10, borderRadius: 10, backgroundColor: 'rgba(23,22,26,0.12)', overflow: 'hidden' },
  budgetFill: { height: 10, borderRadius: 10 },
  budgetPct: { width: 46, textAlign: 'right', fontSize: 13.5, fontWeight: '800', color: INK, fontVariant: ['tabular-nums'] },
  over: { color: '#A51D4E' },
  goals: { flexDirection: 'row', gap: 12, marginTop: 14 },
  goal: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, padding: 14, alignItems: 'center', gap: 6 },
  ringLabel: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: GROTESK, fontSize: 19, color: INK },
  goalName: { fontSize: 13, fontWeight: '800', color: INK },
  goalMeta: { fontSize: 12, color: INK, textAlign: 'center' },
  sumTitle: { fontSize: 32, lineHeight: 36 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 10 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 20, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 16 },
  tileLabel: { fontSize: 12, fontWeight: '700', color: INK },
  tileValue: { fontFamily: GROTESK, fontSize: 23, color: INK, marginTop: 6 },
  line: { fontSize: 14.5, lineHeight: 21, color: INK, marginTop: 6 },
});
