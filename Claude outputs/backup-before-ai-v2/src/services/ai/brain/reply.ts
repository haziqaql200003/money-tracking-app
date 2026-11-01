/**
 * Turns the numbers from engine.ts into sentences. Template wording only (no AI), in the pengguna's language
 * through the normal i18n dictionaries (keys "ai.b.*").
 */
import type { Params, TKey } from '@/i18n';

import type { AiData } from '../engine';
import type { PeriodName } from './slots';

export type Translate = (key: TKey, params?: Params) => string;
type R = Record<string, any>; // tool answers are plain JSON made by engine.ts // eslint-disable-line @typescript-eslint/no-explicit-any

export function rm(n: number): string {
  const v = Math.round(n * 100) / 100;
  const body = Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${v < 0 ? '-' : ''}RM${body}`;
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

const lines = (...l: (string | false | null | undefined)[]) => l.filter(Boolean).join('\n');

export function whereReply(t: Translate, r: R, period: PeriodName, catName?: string): string {
  const pt = periodText(t, period);
  if (!r.records) return t('ai.b.where.none', { period: pt });
  const head = catName
    ? t('ai.b.where.totalCat', { total: rm(r.total), cat: catName, period: pt, n: r.records })
    : t(r.kind === 'income' ? 'ai.b.where.totalIncome' : 'ai.b.where.total', { total: rm(r.total), period: pt, n: r.records });
  const rows = (r.rows as R[]).slice(0, 6).map((x) => t('ai.b.where.row', { name: x.name, total: rm(x.total), share: x.sharePercent }));
  return lines(head, ...rows, r.moreGroups ? t('ai.b.where.more', { n: r.moreGroups }) : null);
}

export function findReply(t: Translate, r: R): string {
  if (!r.matched) return t('ai.b.find.none');
  const rows = (r.records as R[]).map((x) => t('ai.b.find.row', { date: x.date, title: x.title || x.category, amount: `${x.type === 'income' ? '+' : '-'}${rm(x.amount)}` }));
  return lines(t('ai.b.find.head', { n: r.matched, spent: rm(r.totalExpense), earned: rm(r.totalIncome), shown: r.shown }), ...rows);
}

export function balanceReply(t: Translate, r: R, accountId?: string): string {
  const accounts = r.accounts as R[];
  if (accountId) {
    const a = accounts.find((x) => x.id === accountId);
    if (a) return t('ai.b.bal.single', { name: a.name, balance: rm(a.balance) });
  }
  return lines(t('ai.b.bal.total', { total: rm(r.totalBalance) }), ...accounts.slice(0, 8).map((a) => t('ai.b.bal.row', { name: a.name, balance: rm(a.balance) })));
}

export function forecastReply(t: Translate, r: R): string {
  const m = r.thisMonth as R;
  const head = m.reliable
    ? t('ai.b.fc.month', { spent: rm(m.spentSoFar), projected: rm(m.projectedTotalSpending), bills: rm(m.billsStillToCome) })
    : t('ai.b.fc.monthNoProj', { spent: rm(m.spentSoFar), bills: rm(m.billsStillToCome) });
  const next = (r.nextMonths as R[]) ?? [];
  const rows = next.map((x) => t('ai.b.fc.row', { month: x.month, left: rm(x.leftOver), low: rm(x.leftOverRange[0]), high: rm(x.leftOverRange[1]) }));
  const bills = ((r.upcomingIn30Days as R[]) ?? []).filter((x) => x.type === 'bill').slice(0, 4);
  return lines(
    head,
    rows.length ? t('ai.b.fc.next') : null,
    ...rows,
    typeof r.monthsSavingsWouldLast === 'number' && r.monthsSavingsWouldLast > 0 ? t('ai.b.fc.runway', { months: Math.round(r.monthsSavingsWouldLast * 10) / 10 }) : null,
    bills.length ? t('ai.b.fc.bills', { list: bills.map((b) => `${b.title}${b.amount ? ` ${rm(b.amount)}` : ''} (${b.date})`).join(', ') }) : null,
    r.reliable ? null : t('ai.b.fc.weak', { n: r.monthsOfHistory ?? 0 }),
  );
}

export function habitsReply(t: Translate, r: R, d: AiData): string {
  const w = r.weekendVsWeekday as R;
  if (!w || (!w.weekendDailyAverage && !w.weekdayDailyAverage)) return t('ai.b.hab.none');
  const top = ((r.topMerchants as R[]) ?? []).slice(0, 3);
  const odd = ((r.unusualExpenses as R[]) ?? [])[0];
  const score = r.wakiraScore as R | undefined;
  const tips = ((r.appInsights as R[]) ?? []).slice(0, 2);
  return lines(
    t('ai.b.hab.week', { weekend: rm(w.weekendDailyAverage), weekday: rm(w.weekdayDailyAverage) }),
    top.length ? t('ai.b.hab.top', { list: top.map((x) => String(x.title ?? x.name ?? x.label ?? '')).filter(Boolean).join(', ') }) : null,
    odd ? t('ai.b.hab.unusual', { title: odd.title || odd.category, amount: rm(odd.amount), date: odd.date, times: odd.timesTypical, cat: odd.category }) : null,
    score ? t('ai.b.hab.score', { total: score.total, grade: score.grade }) : null,
    ...tips.map((x) => t('ai.b.hab.tip', { title: x.title })),
    d.feed.length === 0 && !top.length ? t('ai.b.hab.none') : null,
  );
}

export function budgetReply(t: Translate, r: R, categoryId?: string): string {
  const all = (r.budgets as R[]) ?? [];
  const rows = categoryId && all.some((b) => b.categoryId === categoryId) ? all.filter((b) => b.categoryId === categoryId) : all;
  if (rows.length === 0) return t('ai.b.bud.none');
  return lines(
    ...rows.slice(0, 8).map((b) =>
      t('ai.b.bud.row', {
        cat: b.category,
        spent: rm(b.spent),
        limit: rm(b.limit),
        pct: Math.round(b.usedPercent),
        status: t(b.status === 'over' ? 'ai.b.bud.over' : b.status === 'likely_over' ? 'ai.b.bud.likely' : 'ai.b.bud.ok'),
      }),
    ),
  );
}

export function compareReply(t: Translate, r: R): string {
  const now = r.current?.spending as number;
  const before = r.previous?.spending as number;
  const change = r.spendingChangePercent as number | null;
  if (change === null || change === undefined) return t('ai.b.cmp.nolast', { now: rm(now ?? 0) });
  const head = Math.abs(change) < 2 ? t('ai.b.cmp.same', { now: rm(now), before: rm(before) }) : t(change > 0 ? 'ai.b.cmp.up' : 'ai.b.cmp.down', { change: Math.abs(change), now: rm(now), before: rm(before) });
  const movers = ((r.categories as R[]) ?? [])
    .filter((c) => typeof c.changePercent === 'number' && Math.abs(c.now - c.before) >= 10)
    .sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before))
    .slice(0, 3);
  return lines(head, ...movers.map((c) => t('ai.b.cmp.row', { cat: c.category, now: rm(c.now), before: rm(c.before), change: `${c.changePercent > 0 ? '+' : ''}${c.changePercent}` })));
}

export function transfersReply(t: Translate, r: R, period: PeriodName): string {
  const pt = periodText(t, period);
  if (!r.count) return t('ai.b.tr.none', { period: pt });
  return lines(t('ai.b.tr.head', { total: rm(r.totalMoved), n: r.count, period: pt }), ...((r.byRoute as R[]) ?? []).slice(0, 5).map((x) => t('ai.b.tr.row', { from: x.from, to: x.to, total: rm(x.total), n: x.count })));
}
