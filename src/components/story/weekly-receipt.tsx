import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { CountUp, Feed, Grow, MONO, Pop, Print, Rise, Stamp } from '@/components/story/story-kit';
import { dateText, dayName, label, rm2, weekNo, type StoryCtx } from '@/components/story/story-common';
import type { StorySlide } from '@/components/story/story-player';
import { weekdayShort } from '@/i18n/format';
import type { Report } from '@/utils/report-data';

const INK = '#1C1B19';
const PAPER = '#FBF8F1';
const BACK = '#2A241D';
const MUTED = '#57524A';
const RED = '#C2255C';
const GREEN = '#0F7A55';
const BLUE = '#1C7ED6';

/**
 * Weekly story (3.8): the week printed as a shop receipt. Five slides at most, one warm backdrop,
 * the receipt feeds out of a printer slot and each line prints in turn.
 */
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

  // 1. Intro
  pages.push({
    key: 'intro',
    body: (
      <>
        <Print paper={PAPER} delay={700}>
          <Text style={[s.small, s.center, s.spaced, s.bold]}>{'*** WAKIRA ***' /* i18n-ignore: brand */}</Text>
        </Print>
        <Print paper={PAPER} delay={900}>
          <Text style={[s.tiny, s.center]}>{tp('rpt.w.no', r.records, { n: no })}</Text>
        </Print>
        <Dash />
        <Rise delay={1150}>
          <Text style={[s.big, s.center]}>{t('rpt.w.introTitle')}</Text>
        </Rise>
        <Print paper={PAPER} delay={1400}>
          <Text style={[s.small, s.center]}>{`${dateText(r.period.from)} – ${dateText(r.period.to)}`}</Text>
        </Print>
        <Dash />
        <Rise delay={1800}>
          <Text style={[s.tiny, s.center, s.bold]}>{t('rpt.w.tapToRead')}</Text>
        </Rise>
      </>
    ),
  });

  // 2. Day by day
  const max = Math.max(1, ...r.daily.slice(0, 7));
  const busiest = r.priciestDay;
  pages.push({
    key: 'days',
    body: (
      <>
        <Text style={[s.small, s.center, s.spaced, s.bold]}>{t('rpt.w.dailyHead')}</Text>
        <Dash />
        {Array.from({ length: 7 }, (_, d) => {
          const counted = d < r.daysCounted;
          const v = r.daily[d] ?? 0;
          const hi = counted && v > 0 && v === max;
          return (
            <Print key={d} paper={PAPER} delay={700 + d * 170}>
              <View style={s.day}>
                <Text style={[s.line, s.dayName, hi && s.bold]}>{weekdayShort(d).toUpperCase()}</Text>
                <View style={s.track}>
                  {counted && v > 0 ? <Grow delay={800 + d * 170} style={[s.trackFill, { width: `${Math.max(3, (v / max) * 100)}%`, backgroundColor: hi ? RED : '#8E877A' }]} /> : null}
                </View>
                <Text style={[s.line, s.amount, hi && s.bold]}>{!counted ? '…' : v > 0 ? rm2(v) : '—'}</Text>
              </View>
            </Print>
          );
        })}
        <Dash />
        <Rise delay={2000} style={s.row}>
          <Text style={[s.total, s.bold]}>{t('rpt.w.total')}</Text>
          <CountUp value={r.spend} format={rm2} delay={2000} style={[s.total, s.bold]} />
        </Rise>
        <Rise delay={2500}>
          <Text style={s.tiny}>
            {[busiest ? t('rpt.w.busiest', { day: dayName(busiest.date).toUpperCase(), amount: rm2(busiest.amount) }) : null, tp('rpt.w.noSpend', r.noSpendDays)].filter(Boolean).join(' · ')}
          </Text>
        </Rise>
      </>
    ),
  });

  // 3. Against last week
  if (r.prev.spend > 0) {
    const saved = diff >= 0;
    const pct = Math.round((Math.abs(diff) / r.prev.spend) * 100);
    pages.push({
      key: 'vs',
      body: (
        <>
          <Text style={[s.small, s.center, s.spaced, s.bold]}>{t('rpt.w.vsHead')}</Text>
          <Dash />
          <Print paper={PAPER} delay={600}>
            <Pair label={t('rpt.w.lastWeek')} value={rm2(r.prev.spend)} />
          </Print>
          <Print paper={PAPER} delay={850}>
            <Pair label={t('rpt.w.thisWeek')} value={rm2(r.spend)} />
          </Print>
          <Dash />
          <Pop delay={1200}>
            <Text style={[s.huge, s.center, { color: saved ? GREEN : RED }]}>{`${saved ? '−' : '+'}${pct}%`}</Text>
          </Pop>
          <Rise delay={1500}>
            <Text style={[s.small, s.center]}>{saved ? t('rpt.w.kept', { amount: rm2(diff) }) : t('rpt.w.more', { amount: rm2(-diff) })}</Text>
          </Rise>
          <View style={s.stampBox}>
            <Stamp delay={2000} rotate={-8} style={[s.stamp, { borderColor: saved ? RED : BLUE }]}>
              <Text style={[s.stampText, { color: saved ? RED : BLUE }]}>{saved ? t('rpt.w.stampSave') : t('rpt.w.stampUp')}</Text>
            </Stamp>
          </View>
        </>
      ),
    });
  }

  // 4. Where it went
  if (r.places.length > 0 || top) {
    pages.push({
      key: 'places',
      body: (
        <>
          <Text style={[s.small, s.center, s.spaced, s.bold]}>{t('rpt.w.placesHead')}</Text>
          <Dash />
          {r.places.slice(0, 3).map((p, j) => (
            <Print key={`${p.title}-${j}`} paper={PAPER} delay={600 + j * 330}>
              <View style={s.row}>
                <Text style={[s.line, s.bold, s.flex]} numberOfLines={1}>
                  {label(p.title).toUpperCase()}
                </Text>
                <Text style={[s.line, s.bold]}>{rm2(p.amount)}</Text>
              </View>
              <Text style={s.tiny}>{tp('rpt.w.times', p.count)}</Text>
            </Print>
          ))}
          {top ? (
            <>
              <Dash />
              <Rise delay={1800} style={s.gap2}>
                <Text style={s.tiny}>{t('rpt.w.topCatHead')}</Text>
                <View style={s.row}>
                  <Text style={[s.line, s.bold, s.flex]} numberOfLines={1}>
                    {c.catName(top.id).toUpperCase()}
                  </Text>
                  <Text style={[s.line, s.bold]}>{rm2(top.amount)}</Text>
                </View>
                <Text style={s.tiny}>{t('rpt.w.topCatShare', { pct: Math.round(top.share * 100) })}</Text>
              </Rise>
            </>
          ) : null}
        </>
      ),
    });
  }

  // 5. Summary
  const days = r.recorded.slice(0, 7);
  const recordedDays = days.filter((x, d) => x && d < r.daysCounted).length;
  pages.push({
    key: 'sum',
    body: (
      <>
        <Text style={[s.small, s.center, s.spaced, s.bold]}>{t('rpt.w.sumHead', { n: no })}</Text>
        <Dash />
        <View style={s.sumTop}>
          <View style={s.flex}>
            <Print paper={PAPER} delay={500}>
              <Pair label={t('rpt.w.in')} value={rm2(r.income)} />
            </Print>
            <Print paper={PAPER} delay={650}>
              <Pair label={t('rpt.w.out')} value={rm2(r.spend)} />
            </Print>
            <Print paper={PAPER} delay={800}>
              <Pair label={t('rpt.w.records')} value={String(r.records)} />
            </Print>
            {weeklyBudget > 0 ? (
              <Print paper={PAPER} delay={950}>
                <Pair label={t('rpt.w.budget')} value={`${Math.round((r.spend / weeklyBudget) * 100)}%`} />
              </Print>
            ) : null}
          </View>
          <Stamp delay={1500} rotate={12} style={s.grade}>
            <Text style={[s.gradeLabel, { color: BLUE }]}>{t('rpt.w.grade')}</Text>
            <Text style={[s.gradeText, { color: BLUE }]}>{r.grade}</Text>
          </Stamp>
        </View>
        <Dash />
        <Text style={[s.tiny, s.center]}>{t('rpt.w.recordedOn', { n: recordedDays })}</Text>
        <View style={s.dots}>
          {days.map((on, d) => (
            <Pop key={d} delay={1100 + d * 110}>
              <View style={[s.dot, on && d < r.daysCounted && s.dotOn]} />
            </Pop>
          ))}
        </View>
        <Dash />
        <Text style={s.tiny}>{t('rpt.w.challengeHead')}</Text>
        <Rise delay={1900}>
          <Challenge text={challenge} doneLabel={t('rpt.w.challengeDone')} />
        </Rise>
        <Barcode />
        <Text style={[s.tiny, s.center]}>{t('rpt.w.thanks')}</Text>
      </>
    ),
  });

  return pages.map((p, j) => ({
    key: p.key,
    bg: BACK,
    fg: PAPER,
    accent: PAPER,
    track: 'rgba(251,248,241,0.22)',
    button: { bg: PAPER, fg: INK, border: 'rgba(251,248,241,0.4)' },
    backdrop: <Dots />,
    final: j === pages.length - 1,
    content: <Receipt>{p.body}</Receipt>,
  }));
}

/** The printer slot and the receipt feeding out of it. */
function Receipt({ children }: { children: ReactNode }) {
  return (
    <View style={s.wrap}>
      <View style={s.slot} />
      <Feed style={s.feed}>
        <View style={s.paper}>{children}</View>
        <View style={s.teeth}>
          {Array.from({ length: 30 }, (_, j) => (
            <View key={j} style={s.tooth} />
          ))}
        </View>
      </Feed>
    </View>
  );
}

/** Next week's challenge: tick it off on the receipt. */
function Challenge({ text, doneLabel }: { text: string; doneLabel: string }) {
  const [done, setDone] = useState(false);
  return (
    <Pressable onPress={() => setDone((d) => !d)} style={s.challenge} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityHint={doneLabel} hitSlop={8}>
      <View style={[s.box, done && s.boxOn]}>{done ? <View style={s.tick} /> : null}</View>
      <Text style={[s.line, s.flex, done && s.struck]}>{text}</Text>
    </Pressable>
  );
}

function Pair({ label: name, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.line}>{name}</Text>
      <Text style={s.line}>{value}</Text>
    </View>
  );
}

function Dash() {
  return <View style={s.dash} />;
}

const BARS = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1];
function Barcode() {
  return (
    <View style={s.barcode}>
      {BARS.map((w, j) => (
        <View key={j} style={{ width: w, height: '100%', backgroundColor: INK, marginRight: 2 }} />
      ))}
    </View>
  );
}

function Dots() {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="wkdots" width={14} height={14} patternUnits="userSpaceOnUse">
          <Circle cx={2} cy={2} r={1} fill="rgba(255,240,220,0.08)" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#wkdots)" />
    </Svg>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 8 },
  slot: { height: 12, borderRadius: 8, backgroundColor: '#14110D', marginHorizontal: -6, zIndex: 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  feed: { marginTop: -6, marginHorizontal: 4 },
  paper: { backgroundColor: PAPER, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 14, gap: 8 },
  teeth: { height: 8, overflow: 'hidden', flexDirection: 'row', justifyContent: 'center' },
  tooth: { width: 12, height: 12, backgroundColor: PAPER, transform: [{ rotate: '45deg' }], marginTop: -6, marginHorizontal: 0.5 },
  small: { fontFamily: MONO, fontSize: 13, color: INK },
  tiny: { fontFamily: MONO, fontSize: 11, color: MUTED, letterSpacing: 0.3 },
  line: { fontFamily: MONO, fontSize: 13.5, color: INK, fontVariant: ['tabular-nums'] },
  total: { fontSize: 19, color: INK, fontVariant: ['tabular-nums'] },
  big: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: INK },
  huge: { fontSize: 64, lineHeight: 68, fontWeight: '800', letterSpacing: -2 },
  center: { textAlign: 'center' },
  spaced: { letterSpacing: 2.2 },
  bold: { fontWeight: '800' },
  flex: { flex: 1 },
  gap2: { gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  dayName: { width: 40 },
  amount: { width: 84, textAlign: 'right' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#EEE8DC', overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 3 },
  dash: { borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: '#B9B2A4', marginVertical: 4 },
  stampBox: { height: 76, alignItems: 'center', justifyContent: 'center' },
  stamp: { borderWidth: 3, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16 },
  stampText: { fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  sumTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grade: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  gradeLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  gradeText: { fontSize: 24, lineHeight: 28, fontWeight: '800' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 2 },
  dot: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: INK },
  dotOn: { backgroundColor: INK },
  challenge: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 2 },
  box: { width: 16, height: 16, borderWidth: 1.5, borderColor: INK, borderRadius: 3, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: GREEN, borderColor: GREEN },
  tick: { width: 8, height: 4, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#FFFFFF', transform: [{ rotate: '-45deg' }, { translateY: -1 }] },
  struck: { textDecorationLine: 'line-through', color: MUTED },
  barcode: { height: 30, flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
});
