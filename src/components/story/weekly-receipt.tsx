import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { CountUp, MONO, Rise, Stamp } from '@/components/story/story-kit';
import { dateText, dayName, int, rm2, weekNo, type StoryCtx } from '@/components/story/story-common';
import type { StorySlide } from '@/components/story/story-player';
import { weekdayShort } from '@/i18n/format';
import type { Report } from '@/utils/report-data';

const INK = '#1C1B19';
const PAPER = '#FBF8F1';
const BACKS = ['#2A241D', '#1D2A25', '#2A1D25', '#1D2330', '#2A2A1D', '#161A26'];

/** Concept C: the week comes out as a shop receipt. */
export function weeklySlides(r: Report, c: StoryCtx): StorySlide[] {
  const { t, tp } = c;
  const no = weekNo(r.period.from);
  const top = r.categories[0];
  const weeklyBudget = c.monthlyBudget / 4.345;
  const diff = r.prev.spend - r.spend;

  const challenge =
    r.records < 7
      ? t('rpt.w.challengeRecord')
      : top && top.id === 'food'
        ? t('rpt.w.challengeFood', { amount: rm2(Math.max(10, Math.round(top.amount * 0.15))) })
        : top
          ? t('rpt.w.challengeCut', { name: c.catName(top.id), amount: rm2(top.amount * 0.1) })
          : t('rpt.w.challengeRecord');

  const pages: { key: string; body: ReactNode }[] = [];

  pages.push({
    key: 'intro',
    body: (
      <>
        <Text style={[s.small, s.center, s.spaced]}>{'*** WAKIRA ***' /* i18n-ignore: brand */}</Text>
        <Text style={[s.tiny, s.center]}>{t('rpt.w.no', { n: no })}</Text>
        <Dash />
        <Text style={[s.big, s.center]}>{t('rpt.w.introTitle')}</Text>
        <Text style={[s.small, s.center]}>{`${dateText(r.period.from)} – ${dateText(r.period.to)}`}</Text>
        <Dash />
        <Rise delay={900}>
          <Text style={[s.small, s.center, s.bold]}>{t('rpt.w.tapToRead')}</Text>
        </Rise>
      </>
    ),
  });

  pages.push({
    key: 'days',
    body: (
      <>
        <Text style={[s.small, s.center, s.spaced]}>{t('rpt.w.dailyHead')}</Text>
        <Dash />
        {Array.from({ length: 7 }, (_, d) => (
          <Rise key={d} delay={500 + d * 160}>
            <View style={s.leader}>
              <Text style={s.line}>{weekdayShort(d).toUpperCase()}</Text>
              <View style={s.dots} />
              <Text style={[s.line, s.bold]}>{d < r.daysCounted ? (r.daily[d] > 0 ? rm2(r.daily[d]) : '—') : '…'}</Text>
            </View>
          </Rise>
        ))}
        <Dash />
        <View style={s.row}>
          <Text style={[s.total, s.bold]}>{t('rpt.w.total')}</Text>
          <CountUp value={r.spend} format={rm2} delay={1500} style={[s.total, s.bold]} />
        </View>
        {r.priciestDay ? <Text style={s.tiny}>{t('rpt.w.priciest', { day: `${dayName(r.priciestDay.date)} · ${rm2(r.priciestDay.amount)}` })}</Text> : null}
      </>
    ),
  });

  if (r.prev.spend > 0) {
    const saved = diff >= 0;
    pages.push({
      key: 'vs',
      body: (
        <>
          <Text style={[s.small, s.center, s.spaced]}>{t('rpt.w.vsHead')}</Text>
          <Dash />
          <View style={s.row}>
            <Text style={s.line}>{t('rpt.w.lastWeek')}</Text>
            <Text style={s.line}>{rm2(r.prev.spend)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.line}>{t('rpt.w.thisWeek')}</Text>
            <Text style={s.line}>{rm2(r.spend)}</Text>
          </View>
          <Dash />
          <Rise delay={400}>
            <Text style={[s.huge, s.center, { color: saved ? '#0F7A55' : '#C2255C' }]}>{`${saved ? '-' : '+'}${Math.abs(r.spendChange ?? 0)}%`}</Text>
          </Rise>
          <Text style={[s.small, s.center]}>{saved ? t('rpt.w.kept', { amount: rm2(diff) }) : t('rpt.w.more', { amount: rm2(-diff) })}</Text>
          <View style={s.stampBox}>
            <Stamp delay={1000} style={[s.stamp, { borderColor: saved ? '#C2255C' : '#1C7ED6' }]}>
              <Text style={[s.stampText, { color: saved ? '#C2255C' : '#1C7ED6' }]}>{saved ? t('rpt.w.stampSave') : t('rpt.w.stampUp')}</Text>
            </Stamp>
          </View>
        </>
      ),
    });
  }

  if (r.places.length > 0 || top) {
    pages.push({
      key: 'places',
      body: (
        <>
          <Text style={[s.small, s.center, s.spaced]}>{t('rpt.w.placesHead')}</Text>
          <Dash />
          {r.places.map((p, j) => (
            <Rise key={`${p.title}-${j}`} delay={500 + j * 300}>
              <View style={s.row}>
                <Text style={[s.line, s.bold, s.flex]} numberOfLines={1}>
                  {p.title.toUpperCase()}
                </Text>
                <Text style={[s.line, s.bold]}>{rm2(p.amount)}</Text>
              </View>
              <Text style={s.tiny}>{tp('rpt.w.times', p.count)}</Text>
            </Rise>
          ))}
          <Dash />
          {top ? <Text style={s.tiny}>{t('rpt.w.topCat', { name: c.catName(top.id).toUpperCase(), amount: rm2(top.amount) })}</Text> : null}
        </>
      ),
    });
  }

  pages.push({
    key: 'streak',
    body: (
      <>
        <Text style={[s.small, s.center, s.spaced]}>{t('rpt.w.streakHead')}</Text>
        <Dash />
        <CountUp value={r.longestStreak} format={int} delay={300} style={[s.giant, s.center]} />
        <Text style={[s.small, s.center, s.bold]}>{t('rpt.w.streakLabel')}</Text>
        <View style={s.dotsRow}>
          {Array.from({ length: 7 }, (_, d) => (
            <Rise key={d} delay={900 + d * 120}>
              <View style={[s.day, { backgroundColor: r.recorded[d] ? INK : 'transparent' }]} />
            </Rise>
          ))}
        </View>
        <Dash />
        <Text style={[s.tiny, s.spaced]}>{t('rpt.w.challengeHead')}</Text>
        <View style={s.challenge}>
          <View style={s.box} />
          <Text style={[s.line, s.flex]}>{challenge}</Text>
        </View>
      </>
    ),
  });

  pages.push({
    key: 'sum',
    body: (
      <>
        <Text style={[s.small, s.center, s.spaced]}>{t('rpt.w.sumHead', { n: no })}</Text>
        <Dash />
        <Pair label={t('rpt.w.in')} value={rm2(r.income)} />
        <Pair label={t('rpt.w.out')} value={rm2(r.spend)} />
        <Pair label={t('rpt.w.records')} value={tp('rpt.w.recordsValue', r.records)} />
        {weeklyBudget > 0 ? <Pair label={t('rpt.w.budget')} value={t('rpt.w.budgetUsed', { pct: Math.round((r.spend / weeklyBudget) * 100) })} /> : null}
        <Dash />
        <View style={[s.stampBox, { height: 104 }]}>
          <Stamp delay={600} style={[s.round, { borderColor: '#1C7ED6' }]}>
            <Text style={[s.tiny, s.spaced, { color: '#1C7ED6' }]}>{t('rpt.w.grade')}</Text>
            <Text style={[s.gradeText, { color: '#1C7ED6' }]}>{r.grade}</Text>
          </Stamp>
        </View>
        <Barcode />
        <Text style={[s.tiny, s.center]}>{t('rpt.w.thanks')}</Text>
      </>
    ),
  });

  return pages.map((p, j) => ({
    key: p.key,
    bg: BACKS[j % BACKS.length],
    fg: '#F4EFE6',
    backdrop: <Dots />,
    final: j === pages.length - 1,
    content: <Receipt>{p.body}</Receipt>,
  }));
}

function Receipt({ children }: { children: ReactNode }) {
  return (
    <View style={s.center1}>
      <Animated.View entering={FadeInDown.duration(900)} style={s.paperWrap}>
        <View style={s.paper}>{children}</View>
        <View style={s.teeth}>
          {Array.from({ length: 30 }, (_, j) => (
            <View key={j} style={s.tooth} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.line}>{label}</Text>
      <Text style={s.line}>{value}</Text>
    </View>
  );
}

function Dash() {
  return <View style={s.dash} />;
}

const BARS = [2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2];
function Barcode() {
  return (
    <View style={s.barcode}>
      {BARS.map((w, j) => (
        <View key={j} style={{ width: w, height: '100%', backgroundColor: j % 2 === 0 ? INK : 'transparent', marginRight: 1 }} />
      ))}
    </View>
  );
}

function Dots() {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="dots" width={18} height={18} patternUnits="userSpaceOnUse">
          <Circle cx={2} cy={2} r={1} fill="rgba(255,255,255,0.08)" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

const s = StyleSheet.create({
  center1: { flex: 1, justifyContent: 'center', paddingBottom: 30 },
  paperWrap: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  paper: { backgroundColor: PAPER, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16, gap: 10 },
  teeth: { height: 10, overflow: 'hidden', flexDirection: 'row', justifyContent: 'center' },
  tooth: { width: 14, height: 14, backgroundColor: PAPER, transform: [{ rotate: '45deg' }], marginTop: -7, marginHorizontal: 0.5 },
  small: { fontFamily: MONO, fontSize: 13, color: INK },
  tiny: { fontFamily: MONO, fontSize: 11, color: INK, opacity: 0.75 },
  line: { fontFamily: MONO, fontSize: 14, color: INK },
  total: { fontFamily: MONO, fontSize: 18, color: INK },
  big: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -1, color: INK },
  huge: { fontSize: 54, lineHeight: 58, fontWeight: '800', letterSpacing: -1 },
  giant: { fontSize: 76, lineHeight: 80, fontWeight: '800', color: INK },
  center: { textAlign: 'center' },
  spaced: { letterSpacing: 2 },
  bold: { fontWeight: '700' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  leader: { flexDirection: 'row', alignItems: 'flex-end' },
  dots: { flex: 1, borderBottomWidth: 2, borderStyle: 'dotted', borderColor: 'rgba(28,27,25,0.35)', marginHorizontal: 8, marginBottom: 4 },
  dash: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: INK, marginVertical: 2 },
  stampBox: { height: 90, alignItems: 'center', justifyContent: 'center' },
  stamp: { borderWidth: 4, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 22 },
  stampText: { fontFamily: MONO, fontSize: 26, fontWeight: '700', letterSpacing: 3 },
  round: { width: 128, height: 92, borderRadius: 64, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 40, lineHeight: 44, fontWeight: '800' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  day: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: INK },
  challenge: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  box: { width: 16, height: 16, borderWidth: 2, borderColor: INK, marginTop: 2 },
  barcode: { height: 34, flexDirection: 'row', justifyContent: 'center' },
});
