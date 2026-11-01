/**
 * "Macam mana nak boost saving?" — a saving plan worked out from the pengguna's own records.
 *
 * Each idea is a plain rule with a ringgit figure that comes from their data (how much they spend on X, how many
 * small buys, which category went up). Ideas are ranked by how much they would save. No guessing, no AI.
 */
import { addDays } from '@/utils/cycle';
import { monthlySums } from '@/utils/forecast';
import { monthKeysEnding } from '@/utils/insights';
import { isAdjustmentEntry } from '@/utils/saved';

import { runTool, type AiData } from '../engine';
import { rmRough, type Say, type Translate } from './reply';
import type { Visual } from './types';

type R = Record<string, any>; // plain JSON made by engine.ts

/** Categories most people can trim without touching needs (rent, loans, health, school fees). */
const FLEXIBLE = new Set(['food', 'shopping', 'entertainment', 'transport', 'travel', 'gifts']);

type Idea = { kind: 'cut' | 'small' | 'subs' | 'rising' | 'budget'; save: number; line: (i: number) => string; short: string };

const round10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);

export function adviceSay(t: Translate, d: AiData, opts: { simple?: boolean; categoryId?: string } = {}): Say {
  const real = d.transactions.filter((x) => !isAdjustmentEntry(x));
  // The last 3 complete financial months that have any records.
  const keys = monthKeysEnding(d.todayKey, 4).slice(0, -1);
  const inc = monthlySums(real.filter((x) => x.type === 'credit'), keys);
  const out = monthlySums(real.filter((x) => x.type === 'debit'), keys);
  const used = keys.map((_, i) => i).filter((i) => inc[i] > 0 || out[i] > 0);
  const avg = (a: number[]) => (used.length ? used.reduce((s, i) => s + a[i], 0) / used.length : 0);
  const income = avg(inc);
  const spending = avg(out);
  const saved = income - spending;
  const rate = income > 0 ? Math.round((saved / income) * 100) : null;

  const ideas: Idea[] = [];
  // 1) Trim the biggest flexible category by a fifth.
  const br = runTool('spending_breakdown', { period: 'last_3_months', group_by: 'category' }, d).response as R;
  const days = Math.max(1, Math.round((new Date(`${br.period?.to}T00:00:00`).getTime() - new Date(`${br.period?.from}T00:00:00`).getTime()) / 86_400_000) + 1);
  const perMonth = (n: number) => (n / days) * 30.4;
  const flex = ((br.rows as R[]) ?? []).filter((r) => FLEXIBLE.has(r.id) && (!opts.categoryId || r.id === opts.categoryId));
  for (const f of flex.slice(0, 2)) {
    const monthly = perMonth(f.total);
    const save = monthly * 0.2;
    if (save < 15) continue;
    const subs = runTool('spending_breakdown', { period: 'last_3_months', group_by: 'subcategory', category_id: f.id }, d).response as R;
    const sub = String(((subs.rows as R[]) ?? [])[0]?.name ?? '').split(' / ')[1];
    const subName = sub && sub !== '-' ? sub : '';
    ideas.push({
      kind: 'cut',
      save,
      short: t('ai.b.adv.short.cut', { cat: f.name }),
      line: (i) => t(subName ? 'ai.b.adv.cutSub' : 'ai.b.adv.cut', { i, cat: f.name, sub: subName, avg: rmRough(monthly), save: rmRough(save) }),
    });
  }

  // 2) Lots of small buys (under RM20) in the last 30 days.
  const since = addDays(d.todayKey, -29);
  const small = real.filter((x) => x.type === 'debit' && x.amount < 20 && x.date >= since && x.date <= d.todayKey && !x.recurringId);
  const smallTotal = small.reduce((s, x) => s + x.amount, 0);
  if (small.length >= 8 && smallTotal >= 60 && !opts.categoryId) {
    ideas.push({
      kind: 'small',
      save: smallTotal / 2,
      short: t('ai.b.adv.short.small'),
      line: (i) => t('ai.b.adv.small', { i, n: small.length, total: rmRough(smallTotal), save: rmRough(smallTotal / 2) }),
    });
  }

  // 3) Subscriptions in the last 30 days.
  const subsTx = real.filter((x) => x.type === 'debit' && x.categoryId === 'subscriptions' && x.date >= since && x.date <= d.todayKey);
  const subsTotal = subsTx.reduce((s, x) => s + x.amount, 0);
  if (subsTx.length >= 2 && subsTotal >= 20 && !opts.categoryId) {
    const one = subsTotal / subsTx.length;
    ideas.push({ kind: 'subs', save: one, short: t('ai.b.adv.short.subs'), line: (i) => t('ai.b.adv.subs', { i, total: rmRough(subsTotal), save: rmRough(one) }) });
  }

  // 4) A category that jumped compared with the same point last month.
  const cmp = runTool('compare_periods', { months: 1 }, d).response as R;
  const jump = ((cmp.categories as R[]) ?? [])
    .filter((c) => typeof c.changePercent === 'number' && c.changePercent >= 25 && c.now - c.before >= 30 && (!opts.categoryId || c.categoryId === opts.categoryId))
    .sort((a, b) => b.now - b.before - (a.now - a.before))[0];
  if (jump && !ideas.some((x) => x.kind === 'cut' && x.short === t('ai.b.adv.short.cut', { cat: jump.category }))) {
    const save = jump.now - jump.before;
    ideas.push({ kind: 'rising', save, short: t('ai.b.adv.short.rising', { cat: jump.category }), line: (i) => t('ai.b.adv.rising', { i, cat: jump.category, pct: Math.round(jump.changePercent), save: rmRough(save) }) });
  }

  // 5) A budget already blown this month.
  const bud = runTool('budget_status', {}, d).response as R;
  const blown = ((bud.budgets as R[]) ?? []).find((b) => b.status === 'over' && (!opts.categoryId || b.categoryId === opts.categoryId));
  if (blown) {
    ideas.push({ kind: 'budget', save: blown.spent - blown.limit, short: t('ai.b.adv.short.budget', { cat: blown.category }), line: (i) => t('ai.b.adv.budget', { i, cat: blown.category, over: rmRough(blown.spent - blown.limit) }) });
  }

  const best = ideas.sort((a, b) => b.save - a.save).slice(0, 3);
  const payFirst = income > 0 ? round10(Math.max(50, Math.min(income * 0.1, Math.max(50, saved > 0 ? saved : income * 0.05)))) : 0;

  // Where they stand today, in one sentence.
  let stand: string;
  if (income <= 0) stand = t('ai.b.adv.noIncome');
  else if (saved < 0) stand = t('ai.b.adv.rate.neg', { gap: rmRough(-saved) });
  else if ((rate ?? 0) >= 20) stand = t('ai.b.adv.rate.good', { saved: rmRough(saved), rate: rate ?? 0 });
  else if ((rate ?? 0) >= 10) stand = t('ai.b.adv.rate.ok', { saved: rmRough(saved), rate: rate ?? 0 });
  else stand = t('ai.b.adv.rate.low', { saved: rmRough(saved), rate: rate ?? 0 });

  const total = best.reduce((s, x) => s + x.save, 0);
  let text: string;
  if (opts.simple) {
    text = best[0] ? t('ai.b.adv.simple', { top: best[0].short, save: rmRough(best[0].save) }) : t('ai.b.adv.none');
  } else if (best.length === 0) {
    text = [stand, t('ai.b.adv.none')].join('\n');
  } else {
    const steps = best.map((x, i) => x.line(i + 1));
    if (payFirst) steps.push(t('ai.b.adv.payFirst', { i: steps.length + 1, amount: rmRough(payFirst) }));
    text = [stand, t('ai.b.adv.intro'), ...steps, t('ai.b.adv.total', { sum: rmRough(total), year: rmRough(total * 12) })].join('\n');
  }

  const visuals: Visual[] = [];
  if (income > 0 && !opts.simple) {
    visuals.push({
      kind: 'stats',
      items: [
        { label: t('ai.b.s.income'), value: rmRough(income) },
        { label: t('ai.b.s.spending'), value: rmRough(spending) },
        { label: t('ai.b.s.rate'), value: `${rate ?? 0}%`, tone: (rate ?? 0) >= 20 ? 'good' : (rate ?? 0) < 10 ? 'bad' : 'neutral' },
      ],
    });
  }
  if (best.length >= 2) visuals.push({ kind: 'bars', title: t('ai.b.v.saveIdeas'), rows: best.map((x) => ({ label: x.short, value: Math.round(x.save) })) });

  const chips = [t('ai.b.chip.small'), t('ai.b.chip.budget')];
  if (!opts.simple) chips.unshift(t('ai.b.chip.simple'));
  return { text, visuals, chips };
}
