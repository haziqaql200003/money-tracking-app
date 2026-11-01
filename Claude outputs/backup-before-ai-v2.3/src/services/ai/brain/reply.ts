/**
 * Turns the verified numbers from engine.ts into an answer a person can follow: a plain sentence first (what it
 * means), the key figures second, a chart, and a few follow-up buttons. Templates only (no AI), in the pengguna's
 * language through the i18n dictionaries (keys "ai.b.*").
 *
 * Every function has a "simple" variant for "terangkan mudah / explain simply": everyday words, money per day,
 * "out of every RM10".
 */
import type { Params, TKey } from '@/i18n';
import { monthLabel } from '@/utils/dates';

import type { AiData } from '../engine';
import type { PeriodName } from './slots';
import type { Visual } from './types';

export type Translate = (key: TKey, params?: Params) => string;
export type Say = { text: string; visuals: Visual[]; chips: string[] };
type R = Record<string, any>; // plain JSON made by engine.ts

/* ---------------- small helpers ---------------- */

export function rm(n: number): string {
  const v = Math.round(n * 100) / 100;
  const body = Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${v < 0 ? '-' : ''}RM${body}`;
}
/** Whole ringgit for rough figures ("about RM300"), cents only under RM10. */
export function rmRough(n: number): string {
  const a = Math.abs(n);
  if (a < 10) return rm(n);
  const v = Math.round(n);
  return `${v < 0 ? '-' : ''}RM${Math.abs(v).toLocaleString('en-US')}`;
}

const PERIOD_KEY: Record<PeriodName, TKey> = {
  today: 'ai.b.p.today',
  last_7_days: 'ai.b.p.last_7_days',
  this_month: 'ai.b.p.this_month',
  last_month: 'ai.b.p.last_month',
  last_3_months: 'ai.b.p.last_3_months',
  last_6_months: 'ai.b.p.last_6_months',
  last_12_months: 'ai.b.p.last_12_months',
  this_year: 'ai.b.p.this_year',
  all: 'ai.b.p.all',
};
export const periodText = (t: Translate, p: PeriodName) => t(PERIOD_KEY[p]);

const join = (...l: (string | false | null | undefined)[]) => l.filter(Boolean).join(' ');
const lines = (...l: (string | false | null | undefined)[]) => l.filter(Boolean).join('\n');

function daysBetween(from: string, to: string) {
  if (!from || !to || from < '1900') return 0;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/** 64 -> "about two thirds" */
function fraction(t: Translate, sharePercent: number): string {
  const s = sharePercent;
  if (s >= 90) return t('ai.b.frac.almostAll');
  if (s >= 70) return t('ai.b.frac.threeQuarters');
  if (s >= 58) return t('ai.b.frac.twoThirds');
  if (s >= 42) return t('ai.b.frac.half');
  if (s >= 29) return t('ai.b.frac.third');
  if (s >= 20) return t('ai.b.frac.quarter');
  return t('ai.b.frac.small');
}

const FALLBACK_COLORS = ['#5B73E8', '#FF9F43', '#1E9E74', '#F0529C', '#7C5CFC', '#0EA5E9', '#EAB308', '#EF4444'];
const colorOf = (d: AiData, id: string | undefined, i: number) => d.categories.find((c) => c.id === id)?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
const monthShortLabel = (key: string) => (/^\d{4}-\d{2}$/.test(key) ? monthLabel(key, 'short') : key);

/* ---------------- where did the money go ---------------- */

/** Subcategory rows come as "Food & Drinks / Lunch": show only "Lunch" ("-" = no subcategory). */
const subName = (s: string) => {
  const sub = String(s).split(' / ').slice(1).join(' / ');
  return sub && sub !== '-' ? sub : String(s);
};

export function whereSay(t: Translate, d: AiData, r: R, period: PeriodName, opts: { catName?: string; simple?: boolean; why?: R | null } = {}): Say {
  const pt = periodText(t, period);
  const chips = [t('ai.b.chip.simple'), t('ai.b.chip.compare'), t('ai.b.chip.save')];
  if (!r.records) return { text: t('ai.b.where.none', { period: pt }), visuals: [], chips: [t('ai.b.chip.lastMonth')] };
  const rows = (r.rows as R[]) ?? [];
  const top = rows[0];
  const days = daysBetween(r.period?.from, r.period?.to);
  const perDay = days > 0 ? rmRough(r.total / days) : null;
  const income = r.kind === 'income';

  let text: string;
  if (opts.simple && top) {
    text = lines(
      income ? null : t('ai.b.where.simple', { n: Math.max(1, Math.round(top.sharePercent / 10)), cat: top.name }),
      perDay && !income ? t('ai.b.where.simple2', { perDay }) : null,
      t('ai.b.where.simple3', { total: rmRough(r.total), period: pt }),
    );
  } else {
    const head = opts.catName ? t('ai.b.where.headCat', { total: rm(r.total), cat: opts.catName, period: pt }) : t(income ? 'ai.b.where.headIncome' : 'ai.b.where.head', { total: rm(r.total), period: pt });
    const topLine =
      top && rows.length > 1
        ? t(opts.catName ? 'ai.b.where.topSub' : income ? 'ai.b.where.topIncome' : 'ai.b.where.top', { cat: opts.catName ? subName(top.name) : top.name, amount: rm(top.total), frac: fraction(t, top.sharePercent) })
        : null;
    text = join(head, topLine, perDay && !income && period !== 'today' ? t('ai.b.where.daily', { perDay }) : null);
  }
  // "kenapa?": what makes the biggest part big (its top shops / titles).
  if (opts.why && top) {
    const shops = ((opts.why.rows as R[]) ?? []).slice(0, 3).map((x) => `${x.name} (${rmRough(x.total)})`);
    if (shops.length) text = lines(text, t('ai.b.where.why', { cat: top.name, list: shops.join(', ') }));
  }

  const visuals: Visual[] = [];
  if (rows.length >= 2 && !opts.catName) {
    visuals.push({
      kind: 'donut',
      title: t(income ? 'ai.b.v.byIncome' : 'ai.b.v.byCategory'),
      center: rmRough(r.total),
      centerSub: pt,
      parts: rows.slice(0, 6).map((x, i) => ({ label: x.name, value: x.total, color: colorOf(d, x.id, i) })),
    });
  } else if (rows.length >= 2) {
    visuals.push({ kind: 'bars', title: opts.catName ?? t('ai.b.v.byCategory'), rows: rows.slice(0, 6).map((x) => ({ label: subName(x.name), value: x.total, note: `${x.sharePercent}%` })) });
  }
  return { text, visuals, chips: opts.simple ? [t('ai.b.chip.why'), t('ai.b.chip.save')] : chips };
}

/* ---------------- search ---------------- */

export function findSay(t: Translate, r: R, biggest: boolean): Say {
  if (!r.matched) return { text: t('ai.b.find.none'), visuals: [], chips: [] };
  const rows = (r.records as R[]).map((x) => t('ai.b.find.row', { date: x.date, title: x.title || x.category, amount: `${x.type === 'income' ? '+' : '-'}${rm(x.amount)}` }));
  const head = t(biggest ? 'ai.b.find.headBiggest' : 'ai.b.find.head', { n: r.matched, spent: rm(r.totalExpense) });
  return { text: lines(head, ...rows), visuals: [], chips: [] };
}

/* ---------------- balances ---------------- */

export function balanceSay(t: Translate, d: AiData, r: R, accountId?: string, simple = false): Say {
  const accounts = (r.accounts as R[]) ?? [];
  if (accountId) {
    const a = accounts.find((x) => x.id === accountId);
    if (a) return { text: t(a.balance < 0 ? 'ai.b.bal.negative' : 'ai.b.bal.single', { name: a.name, balance: rm(a.balance), amount: rm(a.balance) }), visuals: [], chips: [t('ai.b.chip.where')] };
  }
  const sorted = [...accounts].sort((x, y) => y.balance - x.balance);
  const savings = accounts.filter((a) => a.savings).reduce((s, a) => s + a.balance, 0);
  const spendable = r.totalBalance - savings;
  const text = simple
    ? t('ai.b.bal.simple', { total: rmRough(r.totalBalance), spendable: rmRough(spendable), savings: rmRough(savings) })
    : join(
        t('ai.b.bal.total', { total: rm(r.totalBalance), n: accounts.length }),
        sorted[0] && accounts.length > 1 ? t('ai.b.bal.most', { name: sorted[0].name, amount: rm(sorted[0].balance) }) : null,
        ...accounts.filter((a) => a.balance < 0).map((a) => t('ai.b.bal.negative', { name: a.name, amount: rm(a.balance) })),
      );
  const visuals: Visual[] = accounts.length > 1 ? [{ kind: 'bars', title: t('ai.b.v.balances'), rows: sorted.slice(0, 8).map((a) => ({ label: a.name, value: a.balance })) }] : [];
  return { text, visuals, chips: [t('ai.b.chip.forecast'), t('ai.b.chip.where')] };
}

/* ---------------- forecast ---------------- */

export function forecastSay(t: Translate, r: R, simple = false): Say {
  const m = (r.thisMonth as R) ?? {};
  const next = ((r.nextMonths as R[]) ?? [])[0];
  const bills = ((r.upcomingIn30Days as R[]) ?? []).filter((x) => x.type === 'bill').slice(0, 3);
  let text: string;
  if (simple) {
    text = next ? t('ai.b.fc.simple', { left: rmRough(next.leftOver) }) : t('ai.b.fc.monthNoProj', { spent: rm(m.spentSoFar ?? 0), bills: rm(m.billsStillToCome ?? 0) });
  } else {
    text = join(
      m.reliable
        ? t(m.billsStillToCome > 0 ? 'ai.b.fc.month' : 'ai.b.fc.monthNoBills', { spent: rmRough(m.spentSoFar), projected: rmRough(m.projectedTotalSpending), bills: rmRough(m.billsStillToCome) })
        : t('ai.b.fc.monthNoProj', { spent: rm(m.spentSoFar ?? 0), bills: rm(m.billsStillToCome ?? 0) }),
      next ? t(next.leftOver >= 0 ? 'ai.b.fc.next' : 'ai.b.fc.nextNeg', { left: rmRough(Math.abs(next.leftOver)) }) : null,
      typeof r.monthsSavingsWouldLast === 'number' && r.monthsSavingsWouldLast > 0 ? t('ai.b.fc.runway', { months: Math.round(r.monthsSavingsWouldLast * 10) / 10 }) : null,
    );
    if (bills.length) text = lines(text, t('ai.b.fc.bills', { list: bills.map((b) => `${b.title}${b.amount ? ` ${rmRough(b.amount)}` : ''} (${b.date})`).join(', ') }));
    if (!r.reliable) text = lines(text, t('ai.b.fc.weak', { n: r.monthsOfHistory ?? 0 }));
  }

  // Chart: the past months (actual) then the coming months (forecast, dashed).
  const hist = ((r.history as R[]) ?? []).filter((h) => h.income > 0 || h.everydaySpending > 0);
  const ahead = (r.nextMonths as R[]) ?? [];
  const visuals: Visual[] = [];
  if (hist.length + ahead.length >= 3) {
    const labels = [...hist.map((h) => monthShortLabel(h.month)), ...ahead.map((a) => monthShortLabel(a.month))];
    const pad = (n: number) => new Array(n).fill(null) as null[];
    visuals.push({
      kind: 'trend',
      title: t('ai.b.v.forecast'),
      labels,
      splitAt: hist.length,
      series: [
        { name: t('ai.b.v.income'), tone: 'income', values: [...hist.map((h) => h.income), ...pad(ahead.length)] },
        { name: t('ai.b.v.spending'), tone: 'expense', values: [...hist.map((h) => h.everydaySpending), ...pad(ahead.length)] },
        { name: t('ai.b.v.incomeAhead'), tone: 'income', dashed: true, values: [...pad(Math.max(0, hist.length - 1)), ...(hist.length ? [hist[hist.length - 1].income] : []), ...ahead.map((a) => a.expectedIncome)] },
        { name: t('ai.b.v.spendingAhead'), tone: 'expense', dashed: true, values: [...pad(Math.max(0, hist.length - 1)), ...(hist.length ? [hist[hist.length - 1].everydaySpending] : []), ...ahead.map((a) => a.expectedSpending)] },
      ],
    });
  }
  return { text, visuals, chips: simple ? [t('ai.b.chip.save')] : [t('ai.b.chip.simple'), t('ai.b.chip.save'), t('ai.b.chip.budget')] };
}

/* ---------------- habits ---------------- */

const WEEKDAY_KEYS: TKey[] = ['ai.b.day.0', 'ai.b.day.1', 'ai.b.day.2', 'ai.b.day.3', 'ai.b.day.4', 'ai.b.day.5', 'ai.b.day.6'];

export function habitsSay(t: Translate, r: R, simple = false): Say {
  const w = r.weekendVsWeekday as R;
  const week = ((r.averagePerWeekday as R[]) ?? []).map((x, i) => ({ day: t(WEEKDAY_KEYS[i]), avg: Number(x.average) || 0 }));
  if (!w || week.every((x) => x.avg === 0)) return { text: t('ai.b.hab.none'), visuals: [], chips: [] };
  const busiest = [...week].sort((a, b) => b.avg - a.avg)[0];
  const top = ((r.topMerchants as R[]) ?? []).slice(0, 3);
  const odd = ((r.unusualExpenses as R[]) ?? [])[0];
  const score = r.wakiraScore as R | undefined;
  const we = Number(w.weekendDailyAverage) || 0;
  const wd = Number(w.weekdayDailyAverage) || 0;
  const weekLine =
    Math.abs(we - wd) < Math.max(2, 0.1 * Math.max(we, wd))
      ? t('ai.b.hab.weekSame', { a: rmRough((we + wd) / 2) })
      : t('ai.b.hab.week', { more: t(we > wd ? 'ai.b.hab.weekends' : 'ai.b.hab.weekdays'), a: rmRough(Math.max(we, wd)), less: t(we > wd ? 'ai.b.hab.weekdays' : 'ai.b.hab.weekends'), b: rmRough(Math.min(we, wd)) });

  const text = simple
    ? t('ai.b.hab.simple', { day: busiest.day, top: top[0]?.title ?? '-' })
    : lines(
        join(weekLine, t('ai.b.hab.busiest', { day: busiest.day })),
        top.length ? t('ai.b.hab.top', { list: top.map((x) => `${x.title} (${x.count}x)`).join(', ') }) : null,
        odd ? t('ai.b.hab.unusual', { title: odd.title || odd.category, amount: rm(odd.amount), date: odd.date, times: odd.timesTypical, cat: odd.category }) : null,
        score ? t('ai.b.hab.score', { total: score.total, grade: score.grade }) : null,
      );
  const visuals: Visual[] = [{ kind: 'bars', title: t('ai.b.v.weekday'), rows: week.map((x) => ({ label: x.day, value: x.avg })) }];
  if (top.length >= 2 && !simple) visuals.push({ kind: 'bars', title: t('ai.b.v.topPlaces'), rows: top.map((x) => ({ label: String(x.title), value: x.total, note: `${x.count}x` })) });
  return { text, visuals, chips: [t('ai.b.chip.save'), t('ai.b.chip.simple')] };
}

/* ---------------- budgets ---------------- */

export function budgetSay(t: Translate, r: R, categoryId?: string, simple = false): Say {
  const all = (r.budgets as R[]) ?? [];
  if (all.length === 0) return { text: t('ai.b.bud.none'), visuals: [], chips: [t('ai.b.chip.save')] };
  const rows = categoryId && all.some((b) => b.categoryId === categoryId) ? all.filter((b) => b.categoryId === categoryId) : all;
  const daysLeft = Math.max(1, (r.daysInMonth ?? 30) - (r.dayOfMonth ?? 0) + 1);
  const over = rows.filter((b) => b.status === 'over');
  const likely = rows.filter((b) => b.status === 'likely_over');
  const ok = rows.filter((b) => b.status === 'ok');
  const okLine = (b: R) => t('ai.b.bud.ok', { cat: b.category, left: rmRough(b.left), limit: rmRough(b.limit), perDay: rmRough(b.left / daysLeft) });
  let text: string;
  if (simple || rows.length === 1) {
    text = lines(...over.map((b) => t('ai.b.bud.over', { cat: b.category, spent: rmRough(b.spent), limit: rmRough(b.limit) })), ...likely.map(okLine), ...ok.slice(0, 4).map(okLine));
  } else {
    text = lines(
      over.length === 0 && likely.length === 0 ? t('ai.b.bud.allOk', { n: rows.length }) : null,
      ...over.map((b) => t('ai.b.bud.over', { cat: b.category, spent: rmRough(b.spent), limit: rmRough(b.limit) })),
      ...likely.map((b) => t('ai.b.bud.likely', { cat: b.category, spent: rmRough(b.spent), limit: rmRough(b.limit), pct: Math.round(b.usedPercent) })),
      over.length + likely.length > 0 && ok.length ? t('ai.b.bud.othersOk', { n: ok.length }) : null,
    );
  }
  const visuals: Visual[] = [
    {
      kind: 'meter',
      title: t('ai.b.v.budgets'),
      rows: rows.slice(0, 8).map((b) => ({ label: b.category, used: b.spent, limit: b.limit, status: b.status === 'over' ? 'over' : b.status === 'likely_over' ? 'warn' : 'ok' })),
    },
  ];
  return { text, visuals, chips: [t('ai.b.chip.save'), t('ai.b.chip.simple')] };
}

/* ---------------- this month vs last month ---------------- */

export function compareSay(t: Translate, d: AiData, r: R, opts: { simple?: boolean; why?: boolean } = {}): Say {
  const now = Number(r.current?.spending) || 0;
  const before = Number(r.previous?.spending) || 0;
  const change = r.spendingChangePercent as number | null;
  const days = Math.max(1, daysBetween(r.current?.from, r.current?.to));
  const cats = ((r.categories as R[]) ?? []).filter((c) => Math.abs(c.now - c.before) >= 5);
  const up = [...cats].filter((c) => c.now > c.before).sort((a, b) => b.now - b.before - (a.now - a.before))[0];
  const down = [...cats].filter((c) => c.now < c.before).sort((a, b) => a.now - a.before - (b.now - b.before))[0];
  const diff = Math.abs(now - before);

  let text: string;
  if (change === null || change === undefined) {
    text = t('ai.b.cmp.nolast', { now: rm(now) });
  } else if (opts.simple) {
    text = Math.abs(change) < 3 ? t('ai.b.cmp.simple.same') : t(change > 0 ? 'ai.b.cmp.simple.up' : 'ai.b.cmp.simple.down', { perDay: rmRough(diff / days) });
  } else {
    const head = Math.abs(change) < 3 ? t('ai.b.cmp.same', { now: rm(now), before: rm(before) }) : t(change > 0 ? 'ai.b.cmp.up' : 'ai.b.cmp.down', { now: rm(now), diff: rm(diff), pct: Math.abs(Math.round(change)) });
    text = join(
      head,
      up ? t('ai.b.cmp.mover.up', { cat: up.category, diff: rmRough(up.now - up.before) }) : null,
      down ? t('ai.b.cmp.mover.down', { cat: down.category, diff: rmRough(down.before - down.now) }) : null,
    );
  }
  if (opts.why) {
    const main = change !== null && change < 0 ? down : up;
    if (main) {
      const subs = ((main.topSubcategories as R[]) ?? []).slice(0, 2).map((s) => `${s.name} (${rmRough(s.total)})`).join(', ');
      text = lines(text, t('ai.b.cmp.why', { cat: main.category, change: `${main.now >= main.before ? '+' : '-'}${rmRough(Math.abs(main.now - main.before))}`, subs: subs || main.category }));
    }
  }
  const visuals: Visual[] = [];
  if (change !== null && change !== undefined) {
    visuals.push({ kind: 'stats', items: [
      { label: t('ai.b.v.now'), value: rmRough(now) },
      { label: t('ai.b.v.before'), value: rmRough(before) },
      { label: t('ai.b.s.change'), value: `${change > 0 ? '+' : ''}${Math.round(change)}%`, tone: change > 3 ? 'bad' : change < -3 ? 'good' : 'neutral' },
    ] });
    const rows = ((r.categories as R[]) ?? []).slice(0, 6).map((c) => ({ label: c.category, a: c.now, b: c.before }));
    if (rows.length) visuals.push({ kind: 'compare', title: t('ai.b.v.thisVsLast'), aLabel: t('ai.b.v.now'), bLabel: t('ai.b.v.before'), rows });
  }
  void d;
  return { text, visuals, chips: opts.why || opts.simple ? [t('ai.b.chip.save')] : [t('ai.b.chip.why'), t('ai.b.chip.simple'), t('ai.b.chip.save')] };
}

/* ---------------- transfers ---------------- */

export function transfersSay(t: Translate, r: R, period: PeriodName): Say {
  const pt = periodText(t, period);
  if (!r.count) return { text: t('ai.b.tr.none', { period: pt }), visuals: [], chips: [] };
  const routes = ((r.byRoute as R[]) ?? []).slice(0, 6);
  return {
    text: t('ai.b.tr.head', { total: rm(r.totalMoved), n: r.count, period: pt }),
    visuals: routes.length ? [{ kind: 'bars', title: t('ai.b.v.routes'), rows: routes.map((x) => ({ label: t('ai.b.tr.route', { from: x.from, to: x.to }), value: x.total, note: `${x.count}x` })) }] : [],
    chips: [t('ai.b.chip.balance')],
  };
}
