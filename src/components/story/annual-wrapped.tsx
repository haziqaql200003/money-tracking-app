import { useEffect, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { STORY_FACES, Text } from '@/components/ui/text';
import { CountUp, Grow, Pop, Rise, SpinIn } from '@/components/story/story-kit';
import { dateText, label, monthName, rm0, type StoryCtx } from '@/components/story/story-common';
import type { StorySlide } from '@/components/story/story-player';
import type { TKey } from '@/i18n';
import { monthShort, weekdayLong } from '@/i18n/format';
import type { Report } from '@/utils/report-data';

const GREEN = '#0E3B2E';
const GOLD = '#C9A24A';
const CREAM = '#F4EBD6';
const MUTED = '#E3D6B8';
const FAINT = '#A9BFB4';
const LINE = '#24564A';
const BORDER = '#3C6C5F';
const SAGE = '#7FA898';
const TRACK = '#1F5244';
const SERIF = STORY_FACES.serif;
const GOLD_MOMENTS = new Set(['goalDone', 'bestSave', 'debt']);

/**
 * Annual wrap (3.8), "songket": deep green and gold. The songket lattice weaves itself in on the first slide;
 * the slides after it stay plain so the numbers read easily. Ten slides at most.
 */
export function annualSlides(r: Report, c: StoryCtx, prevYearReport: Report | null): StorySlide[] {
  const { t, tp } = c;
  const year = r.period.key;
  const nextYear = Number(year) + 1;
  const pages: { key: string; body: ReactNode; backdrop?: ReactNode }[] = [];
  const top = r.categories[0];
  const active = r.months.filter((m) => m.income > 0 || m.spend > 0);
  const spending = r.months.filter((m) => m.spend > 0);
  const peak = [...spending].sort((a, b) => b.spend - a.spend)[0];
  const low = [...spending].sort((a, b) => a.spend - b.spend)[0];
  const best = r.months
    .filter((m) => m.income > 0)
    .map((m) => ({ ...m, rate: Math.round(((m.income - m.spend) / m.income) * 100) }))
    .sort((a, b) => b.rate - a.rate)[0];
  const better = prevYearReport && prevYearReport.rate !== null && r.rate !== null ? r.rate > prevYearReport.rate : null;
  const personaName = t(`rpt.y.p.${r.personality}.name` as TKey);

  // 1. Intro: the lattice weaves in
  pages.push({
    key: 'intro',
    backdrop: <Lattice />,
    body: (
      <View style={s.introWrap}>
        <View style={s.introPanel}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="yrfade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={GREEN} stopOpacity="0" />
                <Stop offset="0.3" stopColor={GREEN} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#yrfade)" />
          </Svg>
          <Rise delay={1200}>
            <Text style={s.eb}>{t('rpt.y.introHead')}</Text>
          </Rise>
          <Pop delay={1400}>
            <Text style={s.year} allowFontScaling={false}>
              {year}
            </Text>
          </Pop>
          <Grow delay={1800} style={s.rule} />
          <Rise delay={2000}>
            <Text style={s.mut}>{tp('rpt.y.introBody', r.records)}</Text>
          </Rise>
          <Rise delay={2400}>
            <Text style={s.hint}>{t('rpt.tapToStart')}</Text>
          </Rise>
        </View>
      </View>
    ),
  });

  // 2. The year in numbers
  const callout =
    better === true
      ? t('rpt.y.numBetter', { year: Number(year) - 1 })
      : r.rate !== null && r.rate >= c.savingsTarget
        ? t('rpt.y.numTarget', { target: c.savingsTarget })
        : r.longestStreak >= 7
          ? t('rpt.y.streak', { count: r.longestStreak })
          : null;
  pages.push({
    key: 'numbers',
    body: (
      <View style={s.fill}>
        <Rise delay={200}>
          <Text style={s.eb}>{t('rpt.y.numHead')}</Text>
        </Rise>
        <Rise delay={350}>
          <Text style={s.h3}>{r.net >= 0 ? t('rpt.y.numKept', { amount: rm0(r.net) }) : t('rpt.y.numOver', { amount: rm0(-r.net) })}</Text>
        </Rise>
        <View style={s.stats}>
          <Rise delay={700} style={s.stat}>
            <Text style={s.statLabel}>{t('rpt.y.in')}</Text>
            <CountUp value={r.income} format={rm0} delay={800} style={s.statValue} />
          </Rise>
          <Rise delay={950} style={s.stat}>
            <Text style={s.statLabel}>{t('rpt.y.out')}</Text>
            <CountUp value={r.spend} format={rm0} delay={1050} style={s.statValue} />
          </Rise>
          {r.rate !== null ? (
            <Rise delay={1200} style={[s.stat, s.statLast]}>
              <Text style={s.statLabel}>{t('rpt.y.kept')}</Text>
              <CountUp value={Math.max(0, r.rate)} format={(n) => `${Math.round(n)}%`} delay={1300} style={[s.statValue, { color: GOLD }]} />
            </Rise>
          ) : null}
        </View>
        {callout ? (
          <Rise delay={2000} style={[s.callout, s.bottom]}>
            <Diamond filled />
            <Text style={s.calloutText}>{callout}</Text>
          </Rise>
        ) : null}
      </View>
    ),
  });

  // 3. Month by month
  if (spending.length >= 2 && peak) {
    const max = peak.spend;
    pages.push({
      key: 'months',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.eb}>{t('rpt.y.monthsHead')}</Text>
          </Rise>
          <Rise delay={350}>
            <Text style={s.h3}>{t('rpt.y.monthsTitle', { month: monthName(peak.key) })}</Text>
          </Rise>
          <View style={s.cols}>
            {r.months.map((m, j) => {
              const hi = m.key === peak.key;
              const lo = low && m.key === low.key && low.key !== peak.key;
              return (
                <View key={m.key} style={s.col}>
                  {hi ? (
                    <Animated.View entering={FadeIn.delay(1900)}>
                      <Text style={s.colValue} allowFontScaling={false}>
                        {rm0(m.spend).replace('RM ', '')}
                      </Text>
                    </Animated.View>
                  ) : null}
                  <Grow axis="y" delay={600 + j * 90} style={[s.colBar, { height: m.spend > 0 ? Math.max(4, (m.spend / max) * 190) : 2, backgroundColor: hi ? GOLD : lo ? SAGE : BORDER }]} />
                  <Text style={s.colLabel}>{monthShort(j).slice(0, 1)}</Text>
                </View>
              );
            })}
          </View>
          <Rise delay={2000} style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendKey, { backgroundColor: GOLD }]} />
              <Text style={s.legendText}>{t('rpt.y.highest')}</Text>
            </View>
            {low && low.key !== peak.key ? (
              <View style={s.legendItem}>
                <View style={[s.legendKey, { backgroundColor: SAGE }]} />
                <Text style={s.legendText}>{t('rpt.y.lowestIs', { month: monthName(low.key) })}</Text>
              </View>
            ) : null}
          </Rise>
          <Rise delay={2300} style={s.bottom}>
            <Text style={s.small}>{t('rpt.y.monthsNote')}</Text>
          </Rise>
        </View>
      ),
    });
  }

  // 4. Top category
  if (top) {
    pages.push({
      key: 'cats',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.eb}>{t('rpt.y.catHead')}</Text>
          </Rise>
          <Rise delay={350}>
            <Text style={[s.h3, s.h3Big]} numberOfLines={2}>
              {c.catName(top.id)}
            </Text>
          </Rise>
          <CountUp value={top.amount} format={rm0} delay={700} style={s.goldBig} />
          <Rise delay={900}>
            <Text style={s.mut}>{t('rpt.y.catBody', { pct: Math.round(top.share * 100), perDay: rm0(top.amount / Math.max(1, r.daysCounted)) })}</Text>
          </Rise>
          <View style={s.bottom}>
            {r.categories.slice(1, 3).map((x, j) => (
              <Rise key={x.id} delay={1400 + j * 200} style={[s.rank, j === 1 && s.rankLast]}>
                <View style={s.rankNo}>
                  <Text style={s.rankNoText}>{j + 2}</Text>
                </View>
                <Text style={[s.rankName, s.flex]} numberOfLines={1}>
                  {c.catName(x.id)}
                </Text>
                <Text style={s.rankValue}>{rm0(x.amount)}</Text>
              </Rise>
            ))}
          </View>
        </View>
      ),
    });
  }

  // 5. Most memorable: biggest purchase and most visited place
  const big = r.biggest[0];
  const place = r.places.find((p) => !p.generic && p.count >= 3);
  if ((big && big.amount >= 100) || place) {
    pages.push({
      key: 'memorable',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.eb}>{t('rpt.y.memHead')}</Text>
          </Rise>
          {big && big.amount >= 100 ? (
            <Rise delay={500} style={[s.card, s.mt18]}>
              <Text style={s.cardKey}>{t('rpt.y.bigLabel')}</Text>
              <CountUp value={big.amount} format={rm0} delay={700} style={s.cardBig} />
              <Text style={s.cardMeta} numberOfLines={1}>{`${label(big.title)} · ${dateText(big.date)}`}</Text>
            </Rise>
          ) : null}
          {place ? (
            <Rise delay={1100} style={[s.card, s.mt14]}>
              <Text style={s.cardKey}>{t('rpt.y.placeLabel')}</Text>
              <Text style={s.cardBig} numberOfLines={1}>
                {label(place.title)}
              </Text>
              <Text style={s.cardMeta}>{tp('rpt.y.placeMeta', place.count, { amount: rm0(place.amount) })}</Text>
            </Rise>
          ) : null}
          <Rise delay={1600} style={s.bottom}>
            <Text style={s.small}>{t('rpt.y.memNote')}</Text>
          </Rise>
        </View>
      ),
    });
  }

  // 6. Best and hardest month
  if (active.length >= 2 && best && peak && best.key !== peak.key) {
    pages.push({
      key: 'best',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.eb}>{t('rpt.y.bestHead')}</Text>
          </Rise>
          <Pop delay={500} style={[s.card, s.cardGold, s.mt18]}>
            <Text style={[s.cardKey, { color: GREEN }]}>{t('rpt.y.bestLabel')}</Text>
            <Text style={[s.cardBig, { color: GREEN }]}>{monthName(best.key)}</Text>
            <Text style={[s.cardMeta, s.bold, { color: GREEN }]}>{t('rpt.y.bestMeta', { rate: best.rate, amount: rm0(best.income - best.spend) })}</Text>
          </Pop>
          <Rise delay={1000} style={[s.card, s.mt14]}>
            <Text style={s.cardKey}>{t('rpt.y.peakLabel')}</Text>
            <Text style={s.cardBig}>{monthName(peak.key)}</Text>
            <Text style={s.cardMeta}>{rm0(peak.spend)}</Text>
          </Rise>
          <Rise delay={1600} style={[s.callout, s.bottom]}>
            <Diamond filled />
            <Text style={s.calloutText}>{t('rpt.y.bestNote', { month: monthName(best.key) })}</Text>
          </Rise>
        </View>
      ),
    });
  }

  // 7. Money personality
  const wmax = Math.max(...r.weekday);
  const tags = [
    tp('rpt.y.tagDays', r.activeDays),
    tp('rpt.y.tagNoSpend', r.noSpendDays),
    wmax > 0 ? t('rpt.y.tagDay', { day: weekdayLong(r.weekday.indexOf(wmax)) }) : null,
    r.longestStreak >= 3 ? t('rpt.y.streak', { count: r.longestStreak }) : null,
  ].filter((x): x is string => !!x);
  pages.push({
    key: 'persona',
    body: (
      <View style={s.fill}>
        <Rise delay={200}>
          <Text style={s.eb}>{t('rpt.y.personaHead')}</Text>
        </Rise>
        <View style={s.emblem}>
          <SpinIn delay={400} style={s.emblemOuter} />
          <SpinIn delay={650} style={s.emblemInner} />
        </View>
        <Rise delay={1000}>
          <Text style={[s.h3, s.h3Big]}>{personaName}</Text>
        </Rise>
        <Rise delay={1200}>
          <Text style={[s.mut, s.mt10]}>{t(`rpt.y.p.${r.personality}.body` as TKey)}</Text>
        </Rise>
        <View style={[s.tags, s.bottom]}>
          {tags.map((x, j) => (
            <Pop key={x} delay={1600 + j * 150} style={s.tag}>
              <Text style={s.tagText}>{x}</Text>
            </Pop>
          ))}
        </View>
      </View>
    ),
  });

  // 8. Moments
  if (r.moments.length >= 2) {
    const moments = r.moments.slice(0, 5);
    pages.push({
      key: 'moments',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.eb}>{t('rpt.y.momentsHead')}</Text>
          </Rise>
          <Rise delay={350}>
            <Text style={s.h3}>{t('rpt.y.momentsTitle', { n: moments.length })}</Text>
          </Rise>
          <View style={s.timeline}>
            <Grow axis="y" from="top" delay={600} duration={1400} style={s.timelineLine} />
            {moments.map((m, j) => (
              <Rise key={`${m.kind}${j}`} delay={800 + j * 280} style={s.event}>
                <Text style={s.eventMonth}>{monthShort(Number(m.date.slice(5, 7)) - 1).toUpperCase()}</Text>
                <View style={s.eventDot}>
                  <Diamond filled={GOLD_MOMENTS.has(m.kind)} />
                </View>
                <View style={s.flex}>
                  <Text style={s.eventText}>{t(`rpt.y.mo.${m.kind}` as TKey, { label: label(m.label), amount: m.amount !== undefined ? rm0(m.amount) : '' })}</Text>
                  <Text style={s.eventDate}>{dateText(m.date)}</Text>
                </View>
              </Rise>
            ))}
          </View>
        </View>
      ),
    });
  }

  // 9. Against last year
  if (prevYearReport && prevYearReport.spend > 0) {
    const prevYear = Number(year) - 1;
    const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
    const rows: { name: string; value: string; good: boolean }[] = [];
    const inc = pct(r.income, prevYearReport.income);
    if (inc !== null) rows.push({ name: t('rpt.y.vsIncome'), value: `${inc >= 0 ? '+' : '−'}${Math.abs(inc)}%`, good: inc >= 0 });
    const sp = pct(r.spend, prevYearReport.spend);
    if (sp !== null) rows.push({ name: t('rpt.y.vsSpend'), value: `${sp > 0 ? '+' : '−'}${Math.abs(sp)}%`, good: sp <= 0 });
    if (r.debtPaid > 0) rows.push({ name: t('rpt.y.vsDebt'), value: rm0(r.debtPaid), good: true });
    const good = (sp !== null && sp <= 0) || r.net >= prevYearReport.net;
    const scale = Math.max(30, (r.rate ?? 0) + 5, (prevYearReport.rate ?? 0) + 5);
    pages.push({
      key: 'vs',
      body: (
        <View style={s.fill}>
          <Rise delay={200}>
            <Text style={s.eb}>{t('rpt.y.vsHead', { year: prevYear })}</Text>
          </Rise>
          <Rise delay={350}>
            <Text style={[s.h3, s.h3Big]}>{good ? t('rpt.y.vsTitleGood') : t('rpt.y.vsTitleMixed')}</Text>
          </Rise>
          {r.rate !== null && prevYearReport.rate !== null ? (
            <View style={s.meters}>
              <Rise delay={600} style={s.gap6}>
                <View style={s.row}>
                  <Text style={s.meterDim}>{t('rpt.y.keptIn', { year: prevYear })}</Text>
                  <Text style={s.meterDim}>{`${Math.max(0, prevYearReport.rate)}%`}</Text>
                </View>
                <View style={s.meterTrack}>
                  <Grow delay={700} style={[s.meterFill, { width: `${(Math.max(0, prevYearReport.rate) / scale) * 100}%`, backgroundColor: BORDER }]} />
                </View>
              </Rise>
              <Rise delay={900} style={s.gap6}>
                <View style={s.row}>
                  <Text style={s.meterText}>{t('rpt.y.keptIn', { year })}</Text>
                  <Text style={s.meterText}>{`${Math.max(0, r.rate)}%`}</Text>
                </View>
                <View style={s.meterTrack}>
                  <Grow delay={1000} style={[s.meterFill, { width: `${(Math.max(0, r.rate) / scale) * 100}%` }]} />
                </View>
              </Rise>
            </View>
          ) : null}
          <View style={s.bottom}>
            {rows.map((x, j) => (
              <Rise key={x.name} delay={1500 + j * 180} style={[s.rank, j === rows.length - 1 && s.rankLast]}>
                <Text style={[s.mut, s.flex]}>{x.name}</Text>
                <Text style={[s.rankValue, s.bold, { color: x.good ? GOLD : CREAM }]}>{x.value}</Text>
              </Rise>
            ))}
          </View>
        </View>
      ),
    });
  }

  // 10. Summary
  const badges = r.badges.filter((b) => b.got).slice(0, 4);
  pages.push({
    key: 'sum',
    body: (
      <View style={s.fill}>
        <Pop delay={200} style={s.sum}>
          <View style={s.row}>
            <Text style={s.sumTitle}>{t('rpt.y.sumTitle', { year })}</Text>
            <Text style={s.sumTag}>{'WAKIRA' /* i18n-ignore: brand */}</Text>
          </View>
          <View style={s.sumGrid}>
            <SumItem name={t('rpt.y.in')} value={rm0(r.income)} />
            <SumItem name={t('rpt.y.out')} value={rm0(r.spend)} />
            <SumItem name={t('rpt.y.kept')} value={r.rate === null ? rm0(r.net) : `${r.rate}%`} gold />
            <SumItem name={t('rpt.y.sumPersona')} value={personaName} small />
          </View>
          <View style={s.sumRule} />
          {top ? <Text style={s.sumLine}>{t('rpt.y.sumTop', { name: c.catName(top.id), amount: rm0(top.amount) })}</Text> : null}
          {best ? <Text style={s.sumLine}>{t('rpt.y.sumBest', { month: monthName(best.key), rate: best.rate })}</Text> : null}
          <Text style={s.sumLine}>{t('rpt.y.sumNote', { year: nextYear })}</Text>
        </Pop>
        {badges.length > 0 ? (
          <View style={s.badges}>
            {badges.map((b, j) => (
              <Pop key={b.id} delay={800 + j * 150} style={s.badge}>
                <View style={s.badgeIcon}>
                  <View style={s.badgeCore} />
                </View>
                <Text style={s.badgeText} numberOfLines={2}>
                  {t(`rpt.y.b.${b.id}` as TKey)}
                </Text>
              </Pop>
            ))}
          </View>
        ) : null}
        <Text style={[s.small, s.mt10]}>{tp('rpt.y.sumRecords', r.records)}</Text>
      </View>
    ),
  });

  return pages.map((p, j) => ({
    key: p.key,
    bg: GREEN,
    fg: CREAM,
    accent: GOLD,
    track: LINE,
    button: { bg: GOLD, fg: GREEN, border: BORDER },
    final: j === pages.length - 1,
    backdrop: p.backdrop,
    content: p.body,
  }));
}

function SumItem({ name, value, gold, small }: { name: string; value: string; gold?: boolean; small?: boolean }) {
  return (
    <View style={s.sumItem}>
      <Text style={s.sumLabel}>{name}</Text>
      <Text style={[s.sumValue, gold && { color: '#8A6A1F' }, small && { fontSize: 15 }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Diamond({ filled }: { filled?: boolean }) {
  return <View style={[s.diamond, filled && { backgroundColor: GOLD }]} />;
}

/* ---------- the songket lattice ---------- */

const CELL = 40;
const EDGE = Math.SQRT2 * (CELL / 2); // one side of a diamond
const AnimatedPath = Animated.createAnimatedComponent(Path);

function LatticeRow({ d, length, delay }: { d: string; length: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.cubic) }));
  }, [delay, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.value) }));
  return <AnimatedPath d={d} stroke={GOLD} strokeOpacity={0.3} strokeWidth={1} fill="none" strokeDasharray={`${length} ${length}`} animatedProps={props} />;
}

/** A diamond lattice with a small solid diamond in each cell, drawn row by row. */
function Lattice() {
  const { width, height } = useWindowDimensions();
  const rows = Math.ceil(height / CELL) + 1;
  const lines: { d: string; length: number }[] = [];
  let dots = '';
  for (let r = 0; r < rows; r++) {
    const y = r * CELL;
    let d = '';
    let n = 0;
    for (let x = -CELL / 2; x < width + CELL / 2; x += CELL) {
      d += `M${x} ${y + 20}L${x + 20} ${y}L${x + 40} ${y + 20}L${x + 20} ${y + 40}Z`;
      dots += `M${x + 20} ${y + 13}L${x + 27} ${y + 20}L${x + 20} ${y + 27}L${x + 13} ${y + 20}Z`;
      n++;
    }
    lines.push({ d, length: n * 4 * EDGE });
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        {lines.map((l, j) => (
          <LatticeRow key={j} d={l.d} length={l.length} delay={j * 70} />
        ))}
      </Svg>
      <Animated.View entering={FadeIn.delay(900).duration(1600)} style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height}>
          <Path d={dots} fill={GOLD} fillOpacity={0.22} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, paddingTop: 12 },
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  bottom: { marginTop: 'auto' },
  mt10: { marginTop: 10 },
  mt14: { marginTop: 14 },
  mt18: { marginTop: 18 },
  gap6: { gap: 6 },
  eb: { fontSize: 13, fontWeight: '700', color: GOLD },
  h3: { fontFamily: SERIF, fontSize: 38, lineHeight: 44, color: CREAM, marginTop: 6 },
  h3Big: { fontSize: 44, lineHeight: 50 },
  mut: { fontSize: 15, lineHeight: 22, color: MUTED },
  small: { fontSize: 12, lineHeight: 18, color: FAINT },
  hint: { fontSize: 12, color: FAINT, marginTop: 14 },
  introWrap: { flex: 1, justifyContent: 'flex-end', marginHorizontal: -26, marginBottom: -24 },
  introPanel: { paddingHorizontal: 26, paddingTop: 90, paddingBottom: 40, gap: 12 },
  year: { fontFamily: SERIF, fontSize: 112, lineHeight: 118, color: GOLD },
  rule: { width: 64, height: 2, backgroundColor: GOLD },
  stats: { marginTop: 28 },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 14, borderTopWidth: 1, borderTopColor: LINE },
  statLast: { borderBottomWidth: 1, borderBottomColor: LINE },
  statLabel: { fontSize: 14, color: MUTED },
  statValue: { fontFamily: SERIF, fontSize: 28, color: CREAM, fontVariant: ['tabular-nums'] },
  callout: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: GOLD, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  calloutText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: CREAM },
  diamond: { width: 11, height: 11, borderWidth: 1.5, borderColor: GOLD, backgroundColor: GREEN, transform: [{ rotate: '45deg' }] },
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 240, marginTop: 28 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' },
  colBar: { width: '100%', borderRadius: 5 },
  colLabel: { fontSize: 11, color: FAINT },
  colValue: { fontSize: 10, fontWeight: '800', color: CREAM },
  legend: { flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendKey: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, color: MUTED },
  goldBig: { fontFamily: SERIF, fontSize: 60, lineHeight: 68, color: GOLD, marginTop: 14, fontVariant: ['tabular-nums'] },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: LINE },
  rankLast: { borderBottomWidth: 1, borderBottomColor: LINE },
  rankNo: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  rankNoText: { fontSize: 13, fontWeight: '800', color: GOLD },
  rankName: { fontSize: 15, fontWeight: '600', color: CREAM },
  rankValue: { fontSize: 15, color: CREAM, fontVariant: ['tabular-nums'] },
  card: { borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 18 },
  cardGold: { backgroundColor: GOLD, borderColor: GOLD },
  cardKey: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, color: GOLD },
  cardBig: { fontFamily: SERIF, fontSize: 40, lineHeight: 46, color: CREAM, marginTop: 6 },
  cardMeta: { fontSize: 14, color: MUTED, marginTop: 4 },
  emblem: { width: 80, height: 80, marginTop: 34, marginBottom: 26, marginLeft: 18 },
  emblemOuter: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderWidth: 2, borderColor: GOLD },
  emblemInner: { position: 'absolute', left: 18, top: 18, right: 18, bottom: 18, backgroundColor: GOLD },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderColor: GOLD, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { fontSize: 13, fontWeight: '600', color: CREAM },
  timeline: { marginTop: 26, gap: 20 },
  timelineLine: { position: 'absolute', left: 51, top: 6, bottom: 6, width: 1, backgroundColor: BORDER },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  eventMonth: { width: 34, fontSize: 12, fontWeight: '800', color: GOLD, paddingTop: 1 },
  eventDot: { width: 14, alignItems: 'center', paddingTop: 4 },
  eventText: { fontSize: 15, fontWeight: '600', color: CREAM },
  eventDate: { fontSize: 12, color: FAINT, marginTop: 2 },
  meters: { marginTop: 28, gap: 16 },
  meterTrack: { height: 9, borderRadius: 9, backgroundColor: TRACK, overflow: 'hidden' },
  meterFill: { height: 9, borderRadius: 9, backgroundColor: GOLD },
  meterText: { fontSize: 13, color: MUTED },
  meterDim: { fontSize: 13, color: FAINT },
  sum: { backgroundColor: CREAM, borderRadius: 24, padding: 20, gap: 14 },
  sumTitle: { fontFamily: SERIF, fontSize: 26, color: GREEN },
  sumTag: { fontSize: 11, fontWeight: '800', color: '#8A6A1F', letterSpacing: 0.5 },
  sumGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  sumItem: { width: '50%', paddingRight: 8 },
  sumLabel: { fontSize: 12, color: '#4D6B60' },
  sumValue: { fontSize: 18, fontWeight: '800', color: GREEN, marginTop: 2, fontVariant: ['tabular-nums'] },
  sumRule: { height: 1, backgroundColor: '#D9CCAA' },
  sumLine: { fontSize: 13.5, lineHeight: 19, color: GREEN },
  badges: { flexDirection: 'row', gap: 8, marginTop: 18 },
  badge: { flex: 1, alignItems: 'center', gap: 10 },
  badgeIcon: { width: 22, height: 22, borderWidth: 1.5, borderColor: GOLD, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  badgeCore: { width: 8, height: 8, backgroundColor: GOLD },
  badgeText: { fontSize: 10.5, lineHeight: 13, color: MUTED, textAlign: 'center' },
});
