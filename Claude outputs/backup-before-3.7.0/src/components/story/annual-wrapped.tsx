import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { CountUp, Drift, GrowBar, GrowCol, Pop, Rise, Spin } from '@/components/story/story-kit';
import { dateText, int, monthName, rm0, type StoryCtx } from '@/components/story/story-common';
import type { StorySlide } from '@/components/story/story-player';
import type { TKey } from '@/i18n';
import { monthShort, weekdayLong, weekdayShort } from '@/i18n/format';
import type { Report } from '@/utils/report-data';

type Icon = ComponentProps<typeof Ionicons>['name'];
type Theme = { bg: string; fg: string; a: string; b: string; c: string };

const T: Record<string, Theme> = {
  intro: { bg: '#4B3BFF', fg: '#FFFFFF', a: '#7B6CFF', b: '#2F22D6', c: '#FFC93C' },
  records: { bg: '#FF5A3C', fg: '#FFFFFF', a: '#FF8A6E', b: '#E03E22', c: '#FFFFFF' },
  income: { bg: '#2F9E44', fg: '#FFFFFF', a: '#51CF66', b: '#237A35', c: '#FFE07A' },
  spend: { bg: '#0E9F6E', fg: '#FFFFFF', a: '#2FC28C', b: '#077A54', c: '#FFE07A' },
  cats: { bg: '#FFC93C', fg: '#1F1600', a: '#FFE07A', b: '#F5A70D', c: '#1F1600' },
  subs: { bg: '#0B7FAB', fg: '#FFFFFF', a: '#2FA8D6', b: '#075E80', c: '#FFFFFF' },
  big: { bg: '#FF7A45', fg: '#FFFFFF', a: '#FFA07A', b: '#D9541E', c: '#FFFFFF' },
  place: { bg: '#E64980', fg: '#FFFFFF', a: '#F37DA6', b: '#C2255C', c: '#FFFFFF' },
  habits: { bg: '#845EF7', fg: '#FFFFFF', a: '#B197FC', b: '#6741D9', c: '#FFE07A' },
  day: { bg: '#F76707', fg: '#FFFFFF', a: '#FF9248', b: '#C94F00', c: '#FFE07A' },
  persona: { bg: '#0B1020', fg: '#FFFFFF', a: '#1E2550', b: '#2A1F5C', c: '#7CF5C8' },
  peak: { bg: '#1C7ED6', fg: '#FFFFFF', a: '#4DA3F0', b: '#1662AD', c: '#FFFFFF' },
  moments: { bg: '#C2255C', fg: '#FFFFFF', a: '#E64980', b: '#A61E4D', c: '#FFE07A' },
  save: { bg: '#0B1020', fg: '#FFFFFF', a: '#0F3A30', b: '#1E2550', c: '#7CF5C8' },
  vs: { bg: '#7048E8', fg: '#FFFFFF', a: '#9775FA', b: '#5A33D6', c: '#FFFFFF' },
  badges: { bg: '#2B8A3E', fg: '#FFFFFF', a: '#40C057', b: '#1F6B2E', c: '#FFE07A' },
  future: { bg: '#0B1020', fg: '#FFFFFF', a: '#103A4A', b: '#1E2550', c: '#7CF5C8' },
  sum: { bg: '#05070F', fg: '#FFFFFF', a: '#1E2550', b: '#3A1430', c: '#FFC93C' },
};

const BADGE_ICON: Record<string, Icon> = {
  streak30: 'flame',
  budget6: 'shield-checkmark',
  goalDone: 'flag',
  debtFree1: 'checkmark-done',
  save40: 'star',
  noSpend100: 'leaf',
  streak365: 'trophy',
  saved50k: 'diamond',
  noDebt: 'ribbon',
};
const HABIT_ICON: Record<string, Icon> = { food: 'cafe', transport: 'car', shopping: 'bag-handle', entertainment: 'film', bills: 'home', subscriptions: 'repeat' };

/** Concept A: one bold colour per story, floating shapes, big numbers. */
export function annualSlides(r: Report, c: StoryCtx, prevYearReport: Report | null): StorySlide[] {
  const { t, tp } = c;
  const year = r.period.key;
  const pages: { key: string; theme: Theme; body: ReactNode }[] = [];
  const add = (key: keyof typeof T, body: ReactNode) => pages.push({ key, theme: T[key], body });
  const top = r.categories[0];

  // 1. Intro (story count is filled in at the end)
  const introIndex = pages.length;
  add('intro', null);

  // 2. Records
  add(
    'records',
    <Center>
      <Rise>
        <Text style={[s.lead, { color: T.records.fg }]}>{t('rpt.y.recordsHead')}</Text>
      </Rise>
      <CountUp value={r.records} format={int} delay={150} style={[s.mega, { color: T.records.fg }]} />
      <Rise delay={350}>
        <Text style={[s.unit, { color: T.records.fg }]}>{t('rpt.y.recordsUnit')}</Text>
      </Rise>
      <Rise delay={800}>
        <Text style={[s.body, { color: T.records.fg }]}>{t('rpt.y.recordsBody', { perDay: (r.records / Math.max(1, r.daysCounted)).toFixed(1) })}</Text>
      </Rise>
      {r.longestStreak >= 3 ? (
        <Pop delay={1300} style={s.chipDark}>
          <Ionicons name="flame" size={20} color={T.records.fg} />
          <Text style={[s.chipText, { color: T.records.fg }]}>{t('rpt.y.streak', { count: r.longestStreak })}</Text>
        </Pop>
      ) : null}
    </Center>,
  );

  // 3. Income
  if (r.income > 0) {
    const best = [...r.months].sort((a, b) => b.income - a.income)[0];
    const maxInc = r.incomeBy[0]?.amount ?? 1;
    add(
      'income',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.incomeHead')}</Text>
        </Rise>
        <CountUp value={r.income} format={rm0} delay={150} style={[s.huge, { color: '#fff' }]} />
        <Rise delay={350}>
          <Text style={[s.body, { color: '#fff' }]}>{t('rpt.y.incomeBody', { year })}</Text>
        </Rise>
        {r.incomeBy.slice(0, 3).map((x, j) => (
          <Rise key={x.id} delay={600 + j * 150} style={s.gap6}>
            <View style={s.row}>
              <Text style={[s.rowText, { color: '#fff' }]}>{c.catName(x.id)}</Text>
              <Text style={[s.rowText, { color: '#fff' }]}>{rm0(x.amount)}</Text>
            </View>
            <GrowBar pct={(x.amount / maxInc) * 100} color={['#FFFFFF', '#FFE07A', '#B2F2BB'][j]} track="rgba(0,0,0,0.18)" delay={800 + j * 150} />
          </Rise>
        ))}
        {best && best.income > 0 ? (
          <Pop delay={1500} style={s.chipDark}>
            <Text style={[s.chipText, { color: '#fff' }]}>{t('rpt.y.bestMonth', { month: monthName(best.key), amount: rm0(best.income) })}</Text>
          </Pop>
        ) : null}
      </Center>,
    );
  }

  // 4. Spend + teh tarik
  const cups = Math.round(r.spend / 2.5);
  const perIcon = Math.max(1, Math.ceil(cups / 30));
  add(
    'spend',
    <Center>
      <Rise>
        <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.spendHead', { year })}</Text>
      </Rise>
      <CountUp value={r.spend} format={rm0} delay={150} style={[s.huge, { color: '#fff' }]} />
      <Rise delay={500}>
        <Text style={[s.body, { color: '#fff' }]}>{t('rpt.y.spendCups', { count: int(cups) })}</Text>
      </Rise>
      <View style={s.cups}>
        {Array.from({ length: Math.min(30, cups) }, (_, j) => (
          <Pop key={j} delay={900 + j * 45} style={s.cup}>
            <Ionicons name="cafe" size={22} color="#fff" />
          </Pop>
        ))}
      </View>
      {perIcon > 1 ? (
        <Rise delay={2400}>
          <Text style={[s.small, { color: '#fff' }]}>{t('rpt.y.cupsNote', { n: int(perIcon) })}</Text>
        </Rise>
      ) : null}
    </Center>,
  );

  // 5. Top categories
  if (top) {
    add(
      'cats',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: T.cats.fg }]}>{t('rpt.y.catHead')}</Text>
        </Rise>
        <Pop delay={150}>
          <Text style={[s.title, { color: T.cats.fg }]}>{c.catName(top.id)}</Text>
        </Pop>
        <Rise delay={350}>
          <Text style={[s.body, { color: T.cats.fg }]}>{t('rpt.y.catBody', { amount: rm0(top.amount), pct: Math.round(top.share * 100) })}</Text>
        </Rise>
        {r.categories.slice(0, 5).map((x, j) => (
          <Rise key={x.id} delay={550 + j * 150} style={s.gap6}>
            <View style={s.row}>
              <Text style={[s.rowText, { color: T.cats.fg }]} numberOfLines={1}>{`${j + 1}. ${c.catName(x.id)}`}</Text>
              <Text style={[s.rowText, { color: T.cats.fg }]}>{rm0(x.amount)}</Text>
            </View>
            <GrowBar pct={(x.amount / top.amount) * 100} color={T.cats.fg} track="rgba(0,0,0,0.12)" delay={700 + j * 150} height={12} />
          </Rise>
        ))}
      </Center>,
    );
  }

  // 6. Subscriptions
  if (r.subscriptions.length > 0) {
    const total = r.subscriptions.reduce((x, y) => x + y.total, 0);
    const perMonth = r.subscriptions.reduce((x, y) => x + y.perMonth, 0);
    add(
      'subs',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.subsHead')}</Text>
        </Rise>
        <CountUp value={total} format={rm0} delay={150} style={[s.huge, { color: '#fff' }]} />
        <Rise delay={350}>
          <Text style={[s.body, { color: '#fff' }]}>{tp('rpt.y.subsBody', r.subscriptions.length, { perMonth: rm0(perMonth) })}</Text>
        </Rise>
        {r.subscriptions.slice(0, 5).map((x, j) => (
          <Rise key={`${x.title}-${j}`} delay={700 + j * 120} style={s.listRow}>
            <Text style={[s.rowText, s.flex, { color: '#fff' }]} numberOfLines={1}>
              {x.title}
            </Text>
            <Text style={[s.rowText, { color: '#fff' }]}>{t('rpt.y.perMonth', { amount: rm0(x.perMonth) })}</Text>
          </Rise>
        ))}
      </Center>,
    );
  }

  // 7. Biggest buy
  const big = r.biggest[0];
  if (big && big.amount >= 100) {
    add(
      'big',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.bigHead')}</Text>
        </Rise>
        <Pop delay={200} style={s.whiteCard}>
          <View style={s.row}>
            <Text style={s.datePill}>{dateText(big.date)}</Text>
            <Text style={s.cardMuted}>{c.catName(big.categoryId)}</Text>
          </View>
          <CountUp value={big.amount} format={rm0} delay={400} style={s.cardHuge} />
          <Text style={s.cardTitle}>{big.title}</Text>
          <Text style={s.cardBody}>{t('rpt.y.bigBody', { pct: r.spend > 0 ? ((big.amount / r.spend) * 100).toFixed(1) : '0' })}</Text>
        </Pop>
        {r.biggest.length > 1 ? (
          <Rise delay={1000}>
            <Text style={[s.rowText, { color: '#fff' }]}>{t('rpt.y.bigNext')}</Text>
          </Rise>
        ) : null}
        {r.biggest.slice(1).map((x, j) => (
          <Rise key={`${x.title}${j}`} delay={1150 + j * 200} style={s.listRow}>
            <Text style={[s.rowText, s.flex, { color: '#fff' }]} numberOfLines={1}>
              {x.title}
            </Text>
            <Text style={[s.rowText, { color: '#fff' }]}>{rm0(x.amount)}</Text>
          </Rise>
        ))}
      </Center>,
    );
  }

  // 8. Place
  const place = r.places.find((p) => !p.generic);
  if (place && place.count >= 3) {
    add(
      'place',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.placeHead')}</Text>
        </Rise>
        <Pop delay={200} style={s.whiteCard}>
          <View style={[s.iconTile, { backgroundColor: '#E64980' }]}>
            <Ionicons name="location" size={28} color="#fff" />
          </View>
          <Text style={[s.cardHuge, { fontSize: 34, lineHeight: 38 }]}>{place.title}</Text>
          <Text style={[s.cardTitle, { color: '#8A3157' }]}>{tp('rpt.y.placeMeta', place.count, { amount: rm0(place.amount) })}</Text>
        </Pop>
        {r.places.filter((p) => p !== place && !p.generic).length > 0 ? (
          <Rise delay={1000}>
            <Text style={[s.rowText, { color: '#fff' }]}>{t('rpt.y.placeNext')}</Text>
          </Rise>
        ) : null}
        {r.places
          .filter((p) => p !== place && !p.generic)
          .map((p, j) => (
            <Rise key={`${p.title}-${j}`} delay={1150 + j * 200} style={s.listRow}>
              <Text style={[s.rowText, s.flex, { color: '#fff' }]} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={[s.rowText, { color: '#fff' }]}>{tp('rpt.y.placeMeta', p.count, { amount: rm0(p.amount) })}</Text>
            </Rise>
          ))}
      </Center>,
    );
  }

  // 9. Habits
  if (r.habits.length >= 2) {
    add(
      'habits',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.habitsHead')}</Text>
        </Rise>
        <Rise delay={150}>
          <Text style={[s.title2, { color: '#fff' }]}>{t('rpt.y.habitsTitle')}</Text>
        </Rise>
        <View style={s.tiles}>
          {r.habits.map((h, j) => (
            <Pop key={`${h.categoryId}${h.subcategory}`} delay={500 + j * 150} style={s.habit}>
              <Ionicons name={HABIT_ICON[h.categoryId] ?? 'sparkles'} size={24} color="#fff" />
              <CountUp value={h.count} format={int} delay={600 + j * 150} style={s.habitCount} />
              <Text style={s.habitLabel} numberOfLines={2}>
                {c.subName(h.subcategory)}
              </Text>
              <Text style={s.habitCost}>{rm0(h.amount)}</Text>
            </Pop>
          ))}
        </View>
      </Center>,
    );
  }

  // 10. Favourite weekday
  const wmax = Math.max(...r.weekday);
  if (wmax > 0) {
    const fav = r.weekday.indexOf(wmax);
    const positive = r.weekday.map((v, i) => ({ v, i })).filter((x) => x.v > 0);
    const quiet = positive.sort((a, b) => a.v - b.v)[0]?.i ?? fav;
    add(
      'day',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.dayHead')}</Text>
        </Rise>
        <Pop delay={150}>
          <Text style={[s.mega, { color: '#fff', fontSize: 76, lineHeight: 80 }]}>{`${weekdayLong(fav)}.`}</Text>
        </Pop>
        <Rise delay={400}>
          <Text style={[s.body, { color: '#fff' }]}>{t('rpt.y.dayBody', { amount: rm0(wmax), day: weekdayLong(fav), quiet: weekdayLong(quiet) })}</Text>
        </Rise>
        <View style={s.cols}>
          {r.weekday.map((v, j) => (
            <View key={j} style={s.col}>
              <GrowCol height={Math.max(4, (v / wmax) * 140)} color={j === fav ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} delay={600 + j * 100} />
              <Text style={s.colLabel}>{weekdayShort(j)}</Text>
            </View>
          ))}
        </View>
      </Center>,
    );
  }

  // 11. Personality
  add(
    'persona',
    <Center>
      <Rise>
        <Text style={[s.lead, { color: '#B9C2FF' }]}>{t('rpt.y.personaHead')}</Text>
      </Rise>
      <Pop delay={300} style={s.personaFrame}>
        <View style={s.persona}>
          <View style={s.personaIcon}>
            <Ionicons name="sparkles" size={30} color="#7CF5C8" />
          </View>
          <Text style={s.personaName}>{t(`rpt.y.p.${r.personality}.name` as TKey)}</Text>
          <Text style={s.personaBody}>{t(`rpt.y.p.${r.personality}.body` as TKey)}</Text>
        </View>
      </Pop>
    </Center>,
  );

  // 12. Peak month
  const active = r.months.filter((m) => m.spend > 0);
  if (active.length >= 2) {
    const peak = [...active].sort((a, b) => b.spend - a.spend)[0];
    const low = [...active].sort((a, b) => a.spend - b.spend)[0];
    const mmax = peak.spend;
    add(
      'peak',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.peakHead')}</Text>
        </Rise>
        <Pop delay={150}>
          <Text style={[s.mega, { color: '#fff', fontSize: 72, lineHeight: 76 }]}>{monthName(peak.key)}</Text>
        </Pop>
        <Rise delay={350}>
          <Text style={[s.body, { color: '#fff' }]}>{t('rpt.y.peakBody', { amount: rm0(peak.spend) })}</Text>
        </Rise>
        <View style={[s.cols, { height: 160 }]}>
          {r.months.map((m, j) => (
            <View key={m.key} style={s.col}>
              <GrowCol height={m.spend > 0 ? Math.max(6, (m.spend / mmax) * 130) : 2} color={m.key === peak.key ? '#FFFFFF' : 'rgba(255,255,255,0.38)'} delay={400 + j * 60} radius={6} />
              <Text style={s.colLabel}>{monthShort(j).slice(0, 1)}</Text>
            </View>
          ))}
        </View>
        <Rise delay={1300} style={s.pairRow}>
          <View style={s.darkTile}>
            <Text style={s.tileSmall}>{t('rpt.y.lowest')}</Text>
            <Text style={s.tileText}>{`${monthName(low.key)} · ${rm0(low.spend)}`}</Text>
          </View>
          {r.priciestDay ? (
            <View style={s.darkTile}>
              <Text style={s.tileSmall}>{t('rpt.y.priciestDay')}</Text>
              <Text style={s.tileText}>{`${dateText(r.priciestDay.date).split(' ').slice(0, 2).join(' ')} · ${rm0(r.priciestDay.amount)}`}</Text>
            </View>
          ) : null}
        </Rise>
      </Center>,
    );
  }

  // 13. Moments
  if (r.moments.length >= 2) {
    add(
      'moments',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.momentsHead', { year })}</Text>
        </Rise>
        <View style={s.timeline}>
          <View style={s.timelineLine} />
          {r.moments.map((m, j) => (
            <Rise key={`${m.kind}${j}`} delay={300 + j * 220} style={s.moment}>
              <View style={s.momentDot} />
              <Text style={s.momentWhen}>{monthShort(Number(m.date.slice(5, 7)) - 1).toUpperCase()}</Text>
              <Text style={s.momentWhat}>{t(`rpt.y.mo.${m.kind}` as TKey, { label: m.label, amount: m.amount !== undefined ? rm0(m.amount) : '' })}</Text>
            </Rise>
          ))}
        </View>
      </Center>,
    );
  }

  // 14. Savings
  if (r.income > 0 && r.rate !== null) {
    const rate = Math.max(0, r.rate);
    const doneGoals = r.goals.filter((g) => g.done);
    add(
      'save',
      <Center align>
        <Rise>
          <Text style={[s.lead, s.centerText, { color: '#fff' }]}>{t('rpt.y.saveHead')}</Text>
        </Rise>
        <Ring pct={rate} />
        <CountUp value={r.net} format={rm0} delay={600} style={[s.title, s.centerText, { color: '#fff' }]} />
        <Rise delay={900}>
          <Text style={[s.body, s.centerText, { color: '#fff' }]}>{rate >= c.savingsTarget ? t('rpt.y.saveGood', { target: c.savingsTarget }) : t('rpt.y.saveLow', { target: c.savingsTarget })}</Text>
        </Rise>
        <View style={s.wrapCenter}>
          {doneGoals.map((g, j) => (
            <Pop key={g.id} delay={1300 + j * 150} style={s.mintChip}>
              <Text style={s.mintText}>{t('rpt.y.goalDone', { name: g.name })}</Text>
            </Pop>
          ))}
        </View>
      </Center>,
    );
  }

  // 15. Against last year
  if (prevYearReport && prevYearReport.spend > 0) {
    const spendPct = Math.round(((r.spend - prevYearReport.spend) / prevYearReport.spend) * 100);
    const savedDiff = r.net - prevYearReport.net;
    const rows: { icon: Icon; big: string; small: string }[] = [
      {
        icon: spendPct <= 0 ? 'trending-down' : 'trending-up',
        big: spendPct <= 0 ? t('rpt.y.vsSpendDown', { pct: Math.abs(spendPct) }) : t('rpt.y.vsSpendUp', { pct: spendPct }),
        small: t('rpt.y.vsSpendBody', { now: rm0(r.spend), before: rm0(prevYearReport.spend) }),
      },
      {
        icon: savedDiff >= 0 ? 'arrow-up-circle' : 'arrow-down-circle',
        big: savedDiff >= 0 ? t('rpt.y.vsSavedMore', { amount: rm0(savedDiff) }) : t('rpt.y.vsSavedLess', { amount: rm0(-savedDiff) }),
        small: t('rpt.y.vsSavedBody', { year: Number(year) - 1 }),
      },
    ];
    if (r.debtPaid > 0) rows.push({ icon: 'checkmark-done', big: t('rpt.y.vsDebt', { amount: rm0(r.debtPaid) }), small: r.debtsCleared.length ? r.debtsCleared.join(', ') : t('rpt.y.vsDebtBody') });
    add(
      'vs',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.vsHead', { year: Number(year) - 1 })}</Text>
        </Rise>
        <Rise delay={150}>
          <Text style={[s.title, { color: '#fff' }]}>{spendPct <= 0 || savedDiff >= 0 ? t('rpt.y.vsTitleGood') : t('rpt.y.vsTitleMixed')}</Text>
        </Rise>
        {rows.map((x, j) => (
          <Rise key={j} delay={600 + j * 250} style={s.vsRow}>
            <View style={s.vsIcon}>
              <Ionicons name={x.icon} size={24} color="#5A33D6" />
            </View>
            <View style={s.flex}>
              <Text style={s.vsBig}>{x.big}</Text>
              <Text style={s.vsSmall}>{x.small}</Text>
            </View>
          </Rise>
        ))}
      </Center>,
    );
  }

  // 16. Badges
  const got = r.badges.filter((b) => b.got).length;
  add(
    'badges',
    <Center>
      <Rise>
        <Text style={[s.lead, s.centerText, { color: '#fff' }]}>{t('rpt.y.badgeHead')}</Text>
      </Rise>
      <Pop delay={150}>
        <Text style={[s.title, s.centerText, { color: '#fff' }]}>{`${got} / ${r.badges.length}`}</Text>
      </Pop>
      <View style={s.badges}>
        {r.badges.map((b, j) => (
          <Pop key={b.id} delay={400 + j * 100} style={[s.badge, !b.got && s.badgeOff]}>
            <View style={[s.badgeIcon, { backgroundColor: b.got ? '#FFE07A' : 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name={b.got ? BADGE_ICON[b.id] : 'lock-closed'} size={24} color={b.got ? '#5C4300' : '#FFFFFF'} />
            </View>
            <Text style={s.badgeText}>{t(`rpt.y.b.${b.id}` as TKey)}</Text>
          </Pop>
        ))}
      </View>
    </Center>,
  );

  // 17. Projection
  if (r.projection !== null) {
    const steps = 5;
    add(
      'future',
      <Center>
        <Rise>
          <Text style={[s.lead, { color: '#fff' }]}>{t('rpt.y.futureHead')}</Text>
        </Rise>
        <Rise delay={150}>
          <Text style={[s.body, { color: '#fff' }]}>{t('rpt.y.futureBody', { year: Number(year) + 1 })}</Text>
        </Rise>
        <CountUp value={r.projection} format={rm0} delay={300} style={[s.huge, { color: '#7CF5C8' }]} />
        <View style={[s.cols, { height: 150 }]}>
          {Array.from({ length: steps }, (_, j) => {
            const v = r.net + ((r.projection! - r.net) * j) / (steps - 1);
            return (
              <View key={j} style={s.col}>
                <GrowCol height={Math.max(8, (v / r.projection!) * 120)} color="#7CF5C8" dashed={j > 0} delay={600 + j * 150} radius={10} />
              </View>
            );
          })}
        </View>
        <Rise delay={1500}>
          <Text style={[s.small, { color: '#fff' }]}>{t('rpt.y.futureNote')}</Text>
        </Rise>
      </Center>,
    );
  }

  // 18. Summary
  const tiles: [string, string][] = [
    [t('rpt.y.sumRecords'), int(r.records)],
    [t('rpt.y.sumSpent'), rm0(r.spend)],
    [t('rpt.y.sumSaved'), r.rate === null ? rm0(r.net) : `${rm0(r.net)} · ${r.rate}%`],
    [t('rpt.y.sumCat'), top ? c.catName(top.id) : '—'],
    [t('rpt.y.sumPlace'), place ? place.title : '—'],
    [t('rpt.y.sumPersona'), t(`rpt.y.p.${r.personality}.name` as TKey)],
  ];
  add(
    'sum',
    <View style={s.sumWrap}>
      <Pop style={s.sumFrame}>
        <View style={s.sumCard}>
          <View style={s.row}>
            <Text style={s.sumTitle}>{year}</Text>
            <Text style={s.sumTag}>{'WaKira Wrapped' /* i18n-ignore: product name */}</Text>
          </View>
          <View style={s.tiles}>
            {tiles.map(([label, value], j) => (
              <Pop key={label} delay={300 + j * 90} style={s.sumTile}>
                <Text style={s.tileSmall}>{label}</Text>
                <Text style={s.sumValue} numberOfLines={2}>
                  {value}
                </Text>
              </Pop>
            ))}
          </View>
          <Text style={s.sumNote}>{t('rpt.y.sumNote', { year: Number(year) + 1 })}</Text>
        </View>
      </Pop>
    </View>,
  );

  // Intro now that the count is known
  pages[introIndex].body = (
    <Center>
      <Pop style={s.logo}>
        <Ionicons name="wallet" size={42} color="#4B3BFF" />
      </Pop>
      <Rise delay={150}>
        <Text style={[s.title, { color: '#fff', fontSize: 52, lineHeight: 54 }]}>{t('rpt.y.introTitle', { year })}</Text>
      </Rise>
      <Rise delay={400}>
        <Text style={[s.body, { color: '#fff' }]}>{t('rpt.y.introBody', { n: pages.length })}</Text>
      </Rise>
      <Rise delay={1000}>
        <View style={s.startPill}>
          <Text style={s.startText}>{t('rpt.tapToStart')}</Text>
        </View>
      </Rise>
    </Center>
  );

  return pages.map((p, j) => ({
    key: p.key,
    bg: p.theme.bg,
    fg: p.theme.fg,
    final: j === pages.length - 1,
    backdrop: <Shapes theme={p.theme} />,
    content: p.body,
  }));
}

function Center({ children, align }: { children: ReactNode; align?: boolean }) {
  return <View style={[s.center, align && { alignItems: 'center' }]}>{children}</View>;
}

function Shapes({ theme }: { theme: Theme }) {
  return (
    <>
      <Drift style={[s.blob, { backgroundColor: theme.a }]} duration={4200} />
      <Drift style={[s.square, { backgroundColor: theme.b }]} dx={-12} dy={18} duration={5200} />
      <Spin style={[s.ring, { borderColor: theme.c }]} />
    </>
  );
}

function Ring({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 44;
  return (
    <Pop delay={200} style={s.ringBox}>
      <Svg width={200} height={200} viewBox="0 0 104 104" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={52} cy={52} r={44} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={9} />
        <Circle cx={52} cy={52} r={44} fill="none" stroke="#7CF5C8" strokeWidth={9} strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - Math.min(100, pct) / 100)} />
      </Svg>
      <View style={s.ringLabel}>
        <CountUp value={pct} format={(n) => `${Math.round(n)}%`} delay={300} style={s.ringPct} />
      </View>
    </Pop>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 14 },
  centerText: { textAlign: 'center' },
  flex: { flex: 1 },
  gap6: { gap: 6 },
  lead: { fontSize: 20, fontWeight: '700' },
  mega: { fontSize: 104, lineHeight: 104, fontWeight: '900', letterSpacing: -4 },
  huge: { fontSize: 58, lineHeight: 62, fontWeight: '900', letterSpacing: -2 },
  title: { fontSize: 46, lineHeight: 50, fontWeight: '900', letterSpacing: -1.5 },
  title2: { fontSize: 36, lineHeight: 40, fontWeight: '900', letterSpacing: -1 },
  unit: { fontSize: 24, fontWeight: '800' },
  body: { fontSize: 17, lineHeight: 25 },
  small: { fontSize: 13, opacity: 0.85 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rowText: { fontSize: 15, fontWeight: '800' },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.18)' },
  chipDark: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.2)' },
  chipText: { fontWeight: '800', fontSize: 14 },
  cups: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cup: { width: '8.5%', alignItems: 'center' },
  whiteCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 22, gap: 8 },
  datePill: { fontSize: 13, fontWeight: '800', color: '#B3401B', backgroundColor: '#FFE3D6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  cardMuted: { fontSize: 13, fontWeight: '700', color: '#6B6B80' },
  cardHuge: { fontSize: 50, lineHeight: 54, fontWeight: '900', letterSpacing: -1.5, color: '#1A1A2E' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  cardBody: { fontSize: 15, lineHeight: 22, color: '#55556A' },
  iconTile: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  habit: { width: '47%', borderRadius: 22, padding: 16, gap: 4, backgroundColor: 'rgba(255,255,255,0.14)' },
  habitCount: { fontSize: 34, lineHeight: 38, fontWeight: '900', color: '#FFFFFF' },
  habitLabel: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  habitCost: { fontSize: 12, color: '#FFFFFF', opacity: 0.85 },
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 180 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' },
  colLabel: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  personaFrame: { borderRadius: 30, padding: 3, backgroundColor: '#8E9BFF' },
  persona: { borderRadius: 27, padding: 24, gap: 12, backgroundColor: '#0F1430' },
  personaIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#1E2550', alignItems: 'center', justifyContent: 'center' },
  personaName: { fontSize: 36, lineHeight: 40, fontWeight: '900', letterSpacing: -1, color: '#FFFFFF' },
  personaBody: { fontSize: 16, lineHeight: 24, color: '#C7CDEA' },
  pairRow: { flexDirection: 'row', gap: 10 },
  darkTile: { flex: 1, borderRadius: 18, padding: 12, backgroundColor: 'rgba(0,0,0,0.2)', gap: 2 },
  tileSmall: { fontSize: 12, color: '#FFFFFF', opacity: 0.8 },
  tileText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  timeline: { paddingLeft: 26, gap: 16, marginTop: 6 },
  timelineLine: { position: 'absolute', left: 7, top: 6, bottom: 6, width: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  moment: { gap: 2 },
  momentDot: { position: 'absolute', left: -26, top: 3, width: 17, height: 17, borderRadius: 9, backgroundColor: '#FFFFFF' },
  momentWhen: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: '#FFFFFF', opacity: 0.85 },
  momentWhat: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  ringBox: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center' },
  ringPct: { fontSize: 52, fontWeight: '900', color: '#7CF5C8' },
  wrapCenter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  mintChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#7CF5C8' },
  mintText: { fontWeight: '800', fontSize: 14, color: '#06261B' },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.18)' },
  vsIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  vsBig: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  vsSmall: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  badge: { width: '30.5%', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.16)' },
  badgeOff: { opacity: 0.55, backgroundColor: 'rgba(0,0,0,0.18)' },
  badgeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, lineHeight: 15, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  sumWrap: { flex: 1, justifyContent: 'center' },
  sumFrame: { borderRadius: 30, padding: 3, backgroundColor: '#E64980' },
  sumCard: { borderRadius: 27, padding: 20, gap: 14, backgroundColor: '#0F1430' },
  sumTitle: { fontSize: 30, fontWeight: '900', color: '#FFFFFF' },
  sumTag: { fontSize: 12, fontWeight: '800', color: '#06261B', backgroundColor: '#7CF5C8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  sumTile: { width: '47%', borderRadius: 16, padding: 12, gap: 4, backgroundColor: '#1A2148' },
  sumValue: { fontSize: 16, lineHeight: 20, fontWeight: '900', color: '#FFFFFF' },
  sumNote: { fontSize: 13, lineHeight: 19, color: '#C7CDEA' },
  logo: { width: 84, height: 84, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  startPill: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, backgroundColor: '#FFFFFF' },
  startText: { color: '#2A1FB8', fontWeight: '800', fontSize: 15 },
  blob: { position: 'absolute', width: 260, height: 260, borderRadius: 130, left: -90, top: 140, opacity: 0.55 },
  square: { position: 'absolute', width: 180, height: 180, borderRadius: 44, right: -60, top: 460, opacity: 0.5 },
  ring: { position: 'absolute', width: 120, height: 120, right: 40, top: 110, borderWidth: 14, borderStyle: 'dashed', borderRadius: 60, opacity: 0.45 },
});
