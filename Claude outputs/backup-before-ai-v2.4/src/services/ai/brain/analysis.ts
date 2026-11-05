/**
 * Deeper questions the brain answers with plain maths on the pengguna's records:
 *   trend        "show my spending trend for the last 6 months"
 *   cash flow    "am I spending more than I earn?"
 *   two months   "compare September and October"
 *   what-if      "what if I cut food by 20%?"
 *   afford       "can I afford a phone RM3000?"
 * Each one is spotted by a rule (see detect*), so it works even for phrasings the router was never trained on.
 */
import { addDays, cycleInfo, cycleOf, cycleRange } from '@/utils/cycle';
import { monthLabel } from '@/utils/dates';
import { monthlySums } from '@/utils/forecast';
import { monthKeysEnding } from '@/utils/insights';
import { instalmentAmount, nextInstalment, remainingPrincipal } from '@/utils/debts';
import { iouTotals } from '@/utils/ious';
import { isAdjustmentEntry } from '@/utils/saved';

import { runTool, type AiData } from '../engine';
import { rm, rmRough, type Say, type Translate } from './reply';
import type { Visual } from './types';

type R = Record<string, any>; // plain JSON made by engine.ts

const real = (d: AiData) => d.transactions.filter((x) => !isAdjustmentEntry(x));
const label = (key: string) => monthLabel(key, 'short');
const avgOf = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const catName = (d: AiData, id?: string) => {
  const c = id ? d.categories.find((x) => x.id === id) : undefined;
  return c ? d.categoryLabel(c) : '';
};

/** Complete financial months before this one, newest last, with income and spending (optionally one category). */
function months(d: AiData, n: number, categoryId?: string) {
  const keys = monthKeysEnding(d.todayKey, n + 1).slice(0, -1);
  const tx = real(d).filter((x) => !categoryId || x.categoryId === categoryId);
  const income = monthlySums(tx.filter((x) => x.type === 'credit'), keys);
  const spending = monthlySums(tx.filter((x) => x.type === 'debit'), keys);
  // Drop months before the pengguna started recording.
  const first = keys.findIndex((_, i) => income[i] > 0 || spending[i] > 0);
  let from = first < 0 ? keys.length : first;
  // The month the pengguna started recording is usually only half recorded: leave it out so trends are fair.
  const earliest = tx.reduce((m, x) => (x.date < m ? x.date : m), '9999-12-31');
  if (from < keys.length && earliest > addDays(cycleRange(keys[from]).from, 5)) from += 1;
  return { keys: keys.slice(from), income: income.slice(from), spending: spending.slice(from) };
}

/* ---------------- detection ---------------- */

const WORD_NUM: Record<string, number> = { two: 2, dua: 2, three: 3, tiga: 3, four: 4, empat: 4, six: 6, enam: 6, twelve: 12, 'dua belas': 12 };

export function monthsAsked(text: string): number | undefined {
  const low = text.toLowerCase();
  const m = low.match(/\b(\d{1,2})\s*(bulan|months?)\b/);
  if (m) return Math.min(12, Math.max(2, Number(m[1])));
  for (const [w, n] of Object.entries(WORD_NUM)) if (new RegExp(`\\b${w}\\s*(bulan|months?)\\b`).test(low)) return n;
  if (/\b(setahun|a year|12 bulan|this year|tahun ni)\b/.test(low)) return 12;
  return undefined;
}

export const detectTrend = (text: string) =>
  /\b(trend|tren|trending|month by month|bulan ke bulan|setiap bulan|each month|over time)\b/i.test(text) && /\b(belanja|spend|spending|spent|perbelanjaan|expenses?|income|pendapatan|duit|money)\b/i.test(text);
export const detectCashflow = (text: string) =>
  /\b(cash ?flow|aliran tunai)\b/i.test(text) ||
  /\b(spend|spending|belanja|perbelanjaan)\b.{0,30}\b(more than|lebih (?:dari|daripada)|melebihi|exceed)\b.{0,25}\b(earn|income|pendapatan|gaji|make)\b/i.test(text);

const MONTHS: [RegExp, number][] = [
  [/\b(january|jan|januari)\b/, 1], [/\b(february|feb|februari)\b/, 2], [/\b(march|mac)\b/, 3], [/\b(april|apr)\b/, 4], [/\b(may|mei)\b/, 5], [/\b(june|jun)\b/, 6],
  [/\b(july|jul|julai)\b/, 7], [/\b(august|aug|ogos)\b/, 8], [/\b(september|sept|sep)\b/, 9], [/\b(october|oct|oktober)\b/, 10], [/\b(november|nov)\b/, 11], [/\b(december|dec|disember)\b/, 12],
];
/** "September and October" -> ['2026-09', '2026-10'] (the most recent of each month, never in the future). */
export function namedMonths(text: string, todayKey: string): string[] {
  const low = text.toLowerCase();
  const now = cycleOf(todayKey);
  const hits = MONTHS.map(([re, m]) => ({ m, at: low.search(re) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
  return hits.map(({ m }) => {
    let y = Number(now.slice(0, 4));
    if (`${y}-${String(m).padStart(2, '0')}` > now) y -= 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  });
}

/** "kurangkan makan 20%" -> 20. "separuh / half" -> 50. */
export function percentAsked(text: string): number | undefined {
  const m = text.toLowerCase().match(/(\d{1,2})\s*(%|percent|peratus)/);
  if (m) return Number(m[1]);
  if (/\b(half|separuh)\b/i.test(text)) return 50;
  return undefined;
}
export const detectScenario = (text: string) =>
  /\b(what if|what happens if|if i|kalau|jika|sekiranya|andaikan|suppose)\b/i.test(text) && /\b(reduce|cut|kurang|kurangkan|potong|less|jimat|spend less|turunkan)\b/i.test(text) && percentAsked(text) !== undefined;
export const detectAfford = (text: string) => /\b(afford|mampu|mampukah|boleh beli|cukup (?:ke|tak) (?:duit )?(?:nak|untuk) beli|can i buy)\b/i.test(text);

/* ---------------- answers ---------------- */

export function trendSay(t: Translate, d: AiData, n: number, categoryId?: string): Say {
  const m = months(d, n, categoryId);
  if (m.keys.length < 2) return { text: t('ai.b.trend.short'), visuals: [], chips: [t('ai.b.chip.where')] };
  const sp = m.spending;
  const hi = sp.indexOf(Math.max(...sp));
  const lo = sp.indexOf(Math.min(...sp));
  const first = sp[0];
  const last = sp[sp.length - 1];
  const change = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const dir = Math.abs(change) < 8 ? t('ai.b.trend.flat') : change > 0 ? t('ai.b.trend.up', { pct: change }) : t('ai.b.trend.down', { pct: -change });
  const name = catName(d, categoryId);
  const text = [
    t(name ? 'ai.b.trend.headCat' : 'ai.b.trend.head', { n: m.keys.length, cat: name, avg: rmRough(avgOf(sp)), dir }),
    t('ai.b.trend.peaks', { hi: monthLabel(m.keys[hi]), hiAmt: rmRough(sp[hi]), lo: monthLabel(m.keys[lo]), loAmt: rmRough(sp[lo]) }),
  ].join(' ');
  const series: Extract<Visual, { kind: 'trend' }>['series'] = [{ name: t('ai.b.v.spending'), tone: 'expense', values: sp }];
  if (!categoryId && m.income.some((x) => x > 0)) series.push({ name: t('ai.b.v.income'), tone: 'income', values: m.income });
  return {
    text,
    visuals: [{ kind: 'trend', title: name ? t('ai.b.v.trendCat', { cat: name }) : t('ai.b.v.trend'), labels: m.keys.map(label), series }],
    chips: [t('ai.b.chip.why'), t('ai.b.chip.save')],
  };
}

export function cashflowSay(t: Translate, d: AiData): Say {
  const m = months(d, 6);
  if (m.keys.length === 0 || m.income.every((x) => x === 0)) return { text: t('ai.b.cash.noIncome'), visuals: [], chips: [t('ai.b.chip.where')] };
  const inc = avgOf(m.income);
  const sp = avgOf(m.spending);
  const over = m.keys.filter((_, i) => m.spending[i] > m.income[i]).length;
  const diff = inc - sp;
  const text = [
    t('ai.b.cash.head', { n: m.keys.length, inc: rmRough(inc), sp: rmRough(sp) }),
    t(diff >= 0 ? 'ai.b.cash.keep' : 'ai.b.cash.over', { diff: rmRough(Math.abs(diff)) }),
    over > 0 ? t('ai.b.cash.overMonths', { over, n: m.keys.length }) : t('ai.b.cash.never'),
  ].join(' ');
  return {
    text,
    visuals: [
      { kind: 'stats', items: [{ label: t('ai.b.s.income'), value: rmRough(inc) }, { label: t('ai.b.s.spending'), value: rmRough(sp) }, { label: t('ai.b.s.left'), value: rmRough(diff), tone: diff >= 0 ? 'good' : 'bad' }] },
      { kind: 'trend', title: t('ai.b.v.cash'), labels: m.keys.map(label), series: [{ name: t('ai.b.v.income'), tone: 'income', values: m.income }, { name: t('ai.b.v.spending'), tone: 'expense', values: m.spending }] },
    ],
    chips: [t('ai.b.chip.save'), t('ai.b.chip.forecast')],
  };
}

export function twoMonthsSay(t: Translate, d: AiData, a: string, b: string): Say {
  const [older, newer] = a < b ? [a, b] : [b, a];
  const get = (key: string) => runTool('spending_breakdown', { ...cycleRange(key), group_by: 'category', limit: 25 }, d).response as R;
  const ro = get(older);
  const rn = get(newer);
  if (!ro.records && !rn.records) return { text: t('ai.b.two.none', { a: monthLabel(older), b: monthLabel(newer) }), visuals: [], chips: [] };
  const diff = rn.total - ro.total;
  const byId = new Map<string, { label: string; a: number; b: number }>();
  for (const r of (rn.rows as R[]) ?? []) byId.set(r.id, { label: r.name, a: r.total, b: 0 });
  for (const r of (ro.rows as R[]) ?? []) byId.set(r.id, { label: r.name, a: byId.get(r.id)?.a ?? 0, b: r.total });
  const rows = [...byId.values()].sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b)).slice(0, 6);
  const mover = [...byId.values()].sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))[0];
  const text = [
    t(Math.abs(diff) < 1 ? 'ai.b.two.same' : diff > 0 ? 'ai.b.two.up' : 'ai.b.two.down', { a: monthLabel(older), b: monthLabel(newer), aAmt: rm(ro.total), bAmt: rm(rn.total), diff: rm(Math.abs(diff)) }),
    mover && Math.abs(mover.a - mover.b) >= 5 ? t(mover.a > mover.b ? 'ai.b.cmp.mover.up' : 'ai.b.cmp.mover.down', { cat: mover.label, diff: rmRough(Math.abs(mover.a - mover.b)) }) : '',
  ].filter(Boolean).join(' ');
  return {
    text,
    visuals: rows.length ? [{ kind: 'compare', title: `${monthLabel(newer, 'short')} vs ${monthLabel(older, 'short')}`, aLabel: monthLabel(newer), bLabel: monthLabel(older), rows }] : [],
    chips: [t('ai.b.chip.save')],
  };
}

export function scenarioSay(t: Translate, d: AiData, pct: number, categoryId?: string): Say {
  const m = months(d, 3, categoryId);
  const now = avgOf(m.spending);
  if (now <= 0) return { text: t('ai.b.what.none'), visuals: [], chips: [t('ai.b.chip.where')] };
  const p = Math.min(90, Math.max(1, pct));
  const save = (now * p) / 100;
  const target = now - save;
  const name = catName(d, categoryId) || t('ai.b.what.all');
  return {
    text: [
      t('ai.b.what.head', { pct: p, cat: name, save: rmRough(save), year: rmRough(save * 12) }),
      t('ai.b.what.target', { now: rmRough(now), target: rmRough(target), perDay: rmRough(target / 30.4) }),
      t('ai.b.what.basis', { n: m.keys.length }),
    ].join(' '),
    visuals: [
      { kind: 'stats', items: [{ label: t('ai.b.s.savePerMonth'), value: rmRough(save), tone: 'good' }, { label: t('ai.b.s.savePerYear'), value: rmRough(save * 12), tone: 'good' }] },
      { kind: 'compare', title: name, aLabel: t('ai.b.what.after'), bLabel: t('ai.b.what.now'), rows: [{ label: name, a: Math.round(target), b: Math.round(now) }] },
    ],
    chips: [t('ai.b.chip.save'), t('ai.b.chip.budget')],
  };
}

export function affordSay(t: Translate, d: AiData, price: number): Say {
  const spendable = d.accounts.filter((a) => !a.savings).reduce((s, a) => s + a.balance, 0);
  const savings = d.accounts.filter((a) => a.savings).reduce((s, a) => s + a.balance, 0);
  const fc = runTool('forecast', { months: 1 }, d).response as R;
  const bills = Number(fc.thisMonth?.billsStillToCome) || 0;
  const m = months(d, 3);
  const leftover = avgOf(m.income) - avgOf(m.spending);
  const free = spendable - bills;
  const lines: string[] = [];
  if (price <= free * 0.7) lines.push(t('ai.b.afford.yes', { price: rm(price), free: rmRough(free), left: rmRough(free - price) }));
  else if (price <= free) lines.push(t('ai.b.afford.tight', { price: rm(price), free: rmRough(free), left: rmRough(free - price) }));
  else lines.push(t('ai.b.afford.no', { price: rm(price), free: rmRough(Math.max(0, free)) }));
  if (price > free * 0.7 && leftover > 0) lines.push(t('ai.b.afford.wait', { save: rmRough(leftover), months: Math.max(1, Math.ceil(Math.max(0, price - Math.max(0, free * 0.5)) / leftover)) }));
  if (price > free && savings >= price) lines.push(t('ai.b.afford.savings', { savings: rmRough(savings) }));
  if (bills > 0) lines.push(t('ai.b.afford.bills', { bills: rmRough(bills) }));
  return {
    text: lines.join(' '),
    visuals: [{ kind: 'stats', items: [
      { label: t('ai.b.s.price'), value: rmRough(price) },
      { label: t('ai.b.s.free'), value: rmRough(free), tone: free >= price ? 'good' : 'bad' },
      { label: t('ai.b.s.savedPerMonth'), value: rmRough(leftover), tone: leftover > 0 ? 'good' : 'bad' },
    ] }],
    chips: [t('ai.b.chip.save'), t('ai.b.chip.forecast')],
  };
}


/* ---------------- "I want to save RM100 this month: what should I cut?" ---------------- */

const FLEX = new Set(['food', 'shopping', 'entertainment', 'transport', 'travel', 'gifts', 'subscriptions', 'other']);

/** "dapatkan saving 100 bulan ni", "save RM300 this month", "nak simpan 200 sebulan". Needs an amount and a saving word. */
export const detectSaveTarget = (text: string) =>
  /\b(sav(e|ing|ings)|simpan|simpanan|kumpul|jimat|tabung)\b/i.test(text) &&
  /\b(patut|should|macam mana|camne|mcm mana|how|apa|what|nak|want|target|capai|achieve|dapatkan|reach|plan|boleh ke|can i)\b/i.test(text) &&
  !/\b(dari|daripada|from)\b.{0,20}\b(ke|to)\b/i.test(text);

export function saveTargetSay(t: Translate, d: AiData, target: number): Say {
  const info = cycleInfo(d.todayKey);
  const daysLeft = Math.max(1, info.length - info.dayIndex);
  const tx = real(d).filter((x) => x.date >= info.from && x.date <= d.todayKey);
  const spentSoFar = tx.filter((x) => x.type === 'debit').reduce((s, x) => s + x.amount, 0);
  const incomeSoFar = tx.filter((x) => x.type === 'credit').reduce((s, x) => s + x.amount, 0);
  const past = months(d, 3);
  const usualIncome = avgOf(past.income);
  const expectedIncome = Math.max(incomeSoFar, usualIncome);
  const fc = runTool('forecast', { months: 1 }, d).response as R;
  const pacePerDay = spentSoFar / Math.max(1, info.dayIndex);
  const projected = Number(fc.thisMonth?.projectedTotalSpending) || spentSoFar + pacePerDay * daysLeft;
  const expectedLeft = expectedIncome - projected;
  const allowed = expectedIncome - target; // what can still be spent in total this month
  const gap = target - expectedLeft;

  // Where to cut: flexible categories this month, in proportion to how fast they are being spent.
  const br = runTool('spending_breakdown', { period: 'this_month', group_by: 'category', limit: 25 }, d).response as R;
  const flex = ((br.rows as R[]) ?? []).filter((r) => FLEX.has(r.id) && r.total > 0);
  const flexPace = flex.reduce((s, r) => s + r.total / info.dayIndex, 0);
  const flexLeftAll = flexPace * daysLeft;
  // Too big for the days left: suggest a realistic 30% cut on everyday spending instead of impossible numbers.
  const hard = gap > flexLeftAll * 0.6;
  const cuts = gap > 0 && flexPace > 0
    ? flex.slice(0, 3).map((r) => {
        const pace = r.total / info.dayIndex;
        const perDay = hard ? pace * 0.3 : (gap * (pace / flexPace)) / daysLeft;
        return { name: r.name, perDay, total: perDay * daysLeft, pace };
      })
    : [];
  const shops = runTool('spending_breakdown', { period: 'this_month', group_by: 'merchant', limit: 25 }, d).response as R;
  const avoid = ((shops.rows as R[]) ?? [])
    .filter((r) => {
      const hit = tx.find((x) => x.type === 'debit' && x.title.trim().toLowerCase() === String(r.name).toLowerCase());
      return hit && FLEX.has(hit.categoryId) && !hit.recurringId;
    })
    .slice(0, 3);
  const flexLeft = flexPace * daysLeft;
  const lines: string[] = [];

  if (expectedIncome <= 0) {
    lines.push(t('ai.b.goal.noIncome', { target: rmRough(target) }));
  } else if (gap <= 0) {
    lines.push(t('ai.b.goal.onTrack', { target: rmRough(target), left: rmRough(expectedLeft) }));
    lines.push(t('ai.b.goal.lockIn', { target: rmRough(target) }));
  } else {
    lines.push(t('ai.b.goal.gap', { target: rmRough(target), left: rmRough(Math.max(0, expectedLeft)), gap: rmRough(gap), days: daysLeft }));
    if (hard) lines.push(t('ai.b.goal.hard', { realistic: rmRough(Math.max(0, expectedLeft + flexLeft * 0.3)) }));
    if (cuts.length) {
      lines.push(t('ai.b.goal.cutHead'));
      for (const c of cuts) lines.push(t('ai.b.goal.cut', { cat: c.name, perDay: rmRough(c.perDay), pace: rmRough(c.pace), total: rmRough(c.total) }));
    }
  }
  if (avoid.length) lines.push(t(gap > 0 ? 'ai.b.goal.avoid' : 'ai.b.goal.watch', { list: avoid.map((a) => `${a.name} (${rmRough(a.total)})`).join(', ') }));
  if (expectedIncome > 0) lines.push(allowed - spentSoFar > 0 ? t('ai.b.goal.allowed', { allowed: rmRough(allowed - spentSoFar), perDay: rmRough((allowed - spentSoFar) / daysLeft) }) : t('ai.b.goal.noRoom'));

  // Forecast chart: spending so far, where it ends at today's pace, and the path that reaches the target.
  const step = info.length > 24 ? Math.ceil(info.length / 20) : 1;
  const dayKeys: string[] = [];
  for (let i = 0; i < info.length; i += step) dayKeys.push(addDays(info.from, i));
  if (dayKeys[dayKeys.length - 1] !== info.to) dayKeys.push(info.to);
  const byDay = new Map<string, number>();
  for (const x of tx) if (x.type === 'debit') byDay.set(x.date, (byDay.get(x.date) ?? 0) + x.amount);
  const cumUntil = (key: string) => [...byDay.entries()].filter(([k]) => k <= key).reduce((s, [, v]) => s + v, 0);
  const todayIdx = dayKeys.findIndex((k) => k >= d.todayKey);
  const ti = todayIdx < 0 ? dayKeys.length - 1 : todayIdx;
  const actual = dayKeys.map((k, i) => (i <= ti ? Math.round(cumUntil(k)) : null));
  const line = (endValue: number) =>
    dayKeys.map((k, i) => {
      if (i < ti) return null;
      const frac = (i - ti) / Math.max(1, dayKeys.length - 1 - ti);
      return Math.round(spentSoFar + (endValue - spentSoFar) * frac);
    });
  const visuals: Visual[] = [
    {
      kind: 'stats',
      items: [
        { label: t('ai.b.s.target'), value: rmRough(target) },
        { label: t('ai.b.s.expectedLeft'), value: rmRough(expectedLeft), tone: expectedLeft >= target ? 'good' : 'bad' },
        { label: t('ai.b.s.gap'), value: gap > 0 ? rmRough(gap) : '0', tone: gap > 0 ? 'bad' : 'good' },
      ],
    },
  ];
  if (expectedIncome > 0 && dayKeys.length >= 3) {
    visuals.push({
      kind: 'trend',
      title: t('ai.b.v.goalPath', { target: rmRough(target) }),
      labels: dayKeys.map((k) => String(Number(k.slice(8, 10)))),
      splitAt: ti,
      series: [
        { name: t('ai.b.v.spentSoFar'), tone: 'expense', values: actual },
        { name: t('ai.b.v.atThisPace'), tone: 'expense', dashed: true, values: line(projected) },
        { name: t('ai.b.v.toReachTarget'), tone: 'income', dashed: true, values: line(Math.max(spentSoFar, allowed)) },
      ],
    });
  }
  if (cuts.length >= 1) visuals.push({ kind: 'compare', title: t('ai.b.v.perDay'), aLabel: t('ai.b.v.newPace'), bLabel: t('ai.b.v.nowPace'), rows: cuts.map((c) => ({ label: c.name, a: Math.max(0, Math.round(c.pace - c.perDay)), b: Math.round(c.pace) })) });
  return { text: lines.join('\n'), visuals, chips: [t('ai.b.chip.simple'), t('ai.b.chip.budget')] };
}

/* ---------------- Hutang: "berapa hutang saya?", "ansuran bulan ni berapa?" ---------------- */

export const detectDebtQuestion = (text: string) =>
  /\b(hutang|debts?|ansuran|instalments?|installments?|pay ?later|spaylater|atome|bnpl|loans?|pinjaman|owe|owes|komitmen|commitments?)\b/i.test(text) &&
  /\b(berapa|how much|bila|when|senarai|list|tunjuk|show|ada|what|apa|semua|all|next|seterusnya|baki|left|remaining)\b/i.test(text);

export function debtsSay(t: Translate, d: AiData): Say {
  const active = (d.debts ?? []).filter((x) => x.status !== 'done' && x.kind !== 'credit');
  const ious = iouTotals(d.ious ?? []);
  if (active.length === 0 && ious.owe === 0 && ious.owed === 0) return { text: t('ai.b.debt.none'), visuals: [], chips: [t('ai.b.chip.save')] };
  const rows = active.map((x) => {
    const next = nextInstalment(x);
    return { name: x.provider ? `${x.name} (${x.provider})` : x.name, left: remainingPrincipal(x), next };
  });
  const total = rows.reduce((s, r) => s + r.left, 0);
  const info = cycleInfo(d.todayKey);
  const dueThisMonth = rows.filter((r) => r.next && r.next.dueDate <= info.to).reduce((s, r) => s + (r.next ? instalmentAmount(r.next) : 0), 0);
  const upcoming = rows.filter((r) => r.next).sort((a, b) => (a.next!.dueDate < b.next!.dueDate ? -1 : 1)).slice(0, 3);
  const lines: string[] = [];
  if (active.length) {
    lines.push(t('ai.b.debt.head', { total: rm(total), n: active.length }));
    if (dueThisMonth > 0) lines.push(t('ai.b.debt.thisMonth', { amount: rm(dueThisMonth) }));
    if (upcoming.length) lines.push(t('ai.b.debt.next', { list: upcoming.map((r) => `${r.name} ${rmRough(instalmentAmount(r.next!))} (${r.next!.dueDate})`).join(', ') }));
  }
  if (ious.owe > 0) lines.push(t('ai.b.debt.iouOwe', { amount: rm(ious.owe) }));
  if (ious.owed > 0) lines.push(t('ai.b.debt.iouOwed', { amount: rm(ious.owed) }));
  const visuals: Visual[] = rows.length >= 1 ? [{ kind: 'bars', title: t('ai.b.v.debtsLeft'), rows: rows.sort((a, b) => b.left - a.left).slice(0, 8).map((r) => ({ label: r.name, value: r.left, note: r.next ? r.next.dueDate : undefined })) }] : [];
  return { text: lines.join('\n'), visuals, chips: [t('ai.b.chip.save'), t('ai.b.chip.forecast')] };
}
