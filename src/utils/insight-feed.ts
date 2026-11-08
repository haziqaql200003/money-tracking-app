import { t, type TKey } from '@/i18n';
import type { Transaction } from '@/context/TransactionsContext';
import { cycleInfo, cycleOf, cycleRange, isWeekend, sameDayInCycle, shiftCycle } from '@/utils/cycle';
import { rangeLabel } from '@/utils/faham-period';
import { runwayMonths } from '@/utils/forecast';
import type { Confidence, Evidence, FeedItem, FeedTone } from '@/utils/insight-engine';
import { monthKeysEnding } from '@/utils/insights';
import { p1, r1 } from '@/utils/percent';

/**
 * The Insight tab: DATA -> ANALYSIS -> INSIGHT -> ACTION.
 * Everything here is plain arithmetic on the user's own records, so each line can be explained and checked.
 * Nothing is said unless there is enough data, so the feed stays short and trustworthy.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');

export type { FeedItem, FeedTone } from '@/utils/insight-engine';

export type GoalFacts = { name: string; outlook: 'on' | 'late' | 'off' | 'done' | 'none'; need: number | null; pace: number };

export type FeedInput = {
  transactions: Transaction[];
  todayKey: string;
  categoryName: (id: string) => string;
  money: (n: number) => string;
  /** Total of recurring bills each month. */
  fixedMonthly: number;
  /** Monthly instalment and loan payments; null when not known. */
  debtMonthly: number | null;
  /** Total of the category budgets; 0 = none. */
  budget: number;
  /**
   * Each budgeted category and its monthly limit. When given, budget checks compare only the spending in these
   * categories with `budget`, so spending in categories without a budget never counts as going over.
   */
  budgets?: BudgetLimit[];
  /** Money in savings accounts. */
  savingsBalance: number;
  goals: GoalFacts[];
};

export type BudgetLimit = { categoryId: string; limit: number };

export type MonthRow = { key: string; income: number; spending: number };

export function monthRows(transactions: Transaction[], keys: string[]): MonthRow[] {
  const rows = new Map(keys.map((k) => [k, { key: k, income: 0, spending: 0 }]));
  for (const x of transactions) {
    const r = rows.get(cycleOf(x.date));
    if (!r) continue;
    if (x.type === 'debit') r.spending += x.amount;
    else r.income += x.amount;
  }
  return keys.map((k) => rows.get(k)!);
}

/** Months that actually have records, ignoring empty leading months. */
export function trimmed(rows: MonthRow[]) {
  const i = rows.findIndex((r) => r.income > 0 || r.spending > 0);
  return i === -1 ? [] : rows.slice(i);
}

export const rateOf = (r: MonthRow) => (r.income > 0 ? ((r.income - r.spending) / r.income) * 100 : null);

/** The last `n` months of savings rate as whole percents (null where there was no income). */
export function savingsRates(rows: MonthRow[]) {
  return rows.map((r) => {
    const v = rateOf(r);
    return v === null ? null : r1(v);
  });
}

/** How many months in a row, counting back from the latest, the rate went up. */
export function improvingStreak(rates: (number | null)[]): number {
  let n = 0;
  for (let i = rates.length - 1; i > 0; i--) {
    const a = rates[i];
    const b = rates[i - 1];
    if (a === null || b === null || a <= b) break;
    n++;
  }
  return n;
}

/** The date key `n` days before `key` (negative `n` = after). */
function daysBack(key: string, n: number) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function buildFeed(inp: FeedInput): FeedItem[] {
  const { transactions, todayKey, categoryName, money, fixedMonthly, debtMonthly, budget, budgets, savingsBalance, goals } = inp;
  const out: FeedItem[] = [];
  const info = cycleInfo(todayKey);
  const monthKey = info.key;
  const complete = trimmed(monthRows(transactions, monthKeysEnding(todayKey, 7).slice(0, -1)));
  if (complete.length === 0 && !transactions.some((x) => cycleOf(x.date) === monthKey)) return out;

  // Evidence helpers. Confidence grows with the amount of history a finding rests on.
  const ev = (key: TKey, value: string): Evidence => ({ label: t(key), value });
  const pc = (n: number) => `${p1(n)}%`;
  const span = (keys: string[]) => (keys.length ? rangeLabel({ from: cycleRange(keys[0]).from, to: cycleRange(keys[keys.length - 1]).to }) : '');
  const monthsConf: Confidence = complete.length >= 4 ? 'high' : complete.length >= 2 ? 'medium' : 'low';

  // 1) Savings rate: streak or latest.
  const rates = savingsRates(complete);
  const streak = improvingStreak(rates);
  const last = rates[rates.length - 1];
  if (streak >= 2 && last !== null) {
    out.push({
      id: 'streak',
      tone: 'good',
      title: t('fc.feed.streak.title'),
      body: t('fc.feed.streak.body', { n: streak, from: p1(rates[rates.length - 1 - streak] ?? 0), to: p1(last) }),
      category: 'positive',
      confidence: monthsConf,
      impact: 0,
      period: span(complete.slice(-1 - streak).map((r) => r.key)),
      evidence: [ev('fc.ev.rateBefore', pc(rates[rates.length - 1 - streak] ?? 0)), ev('fc.ev.rateNow', pc(last)), ev('fc.ev.monthsUp', String(streak))],
      how: t('fc.how.rate'),
    });
  } else if (last !== null && complete.length >= 2) {
    const prev = rates[rates.length - 2];
    if (last < 0) {
      const lr = complete[complete.length - 1];
      out.push({
        id: 'rate',
        tone: 'bad',
        title: t('fc.feed.rateNeg.title'),
        body: t('fc.feed.rateNeg.body'),
        action: t('fc.feed.rateNeg.action'),
        category: 'risk',
        confidence: monthsConf,
        impact: lr.spending - lr.income,
        period: span([lr.key]),
        evidence: [ev('fc.ev.income', money(lr.income)), ev('fc.ev.spending', money(lr.spending)), ev('fc.ev.difference', money(lr.income - lr.spending))],
        how: t('fc.how.rate'),
      });
    } else if (prev !== null && last < prev - 5) {
      const lr = complete[complete.length - 1];
      out.push({
        id: 'rate',
        tone: 'warn',
        title: t('fc.feed.rateDown.title'),
        body: t('fc.feed.rateDown.body', { from: p1(prev), to: p1(last) }),
        action: t('fc.feed.rateDown.action'),
        category: 'risk',
        confidence: monthsConf,
        impact: ((prev - last) / 100) * lr.income,
        period: span(complete.slice(-2).map((r) => r.key)),
        evidence: [ev('fc.ev.rateBefore', pc(prev)), ev('fc.ev.rateNow', pc(last)), ev('fc.ev.income', money(lr.income))],
        how: t('fc.how.rate'),
      });
    }
  }

  // 2) Why did spending change: this month so far against the same days last month.
  const day = info.dayIndex;
  const prevMonth = shiftCycle(monthKey, -1);
  const cut = sameDayInCycle(todayKey, -1);
  const nowCat = new Map<string, number>();
  const prevCat = new Map<string, number>();
  for (const x of transactions) {
    if (x.type !== 'debit') continue;
    const k = cycleOf(x.date);
    if (k === monthKey && x.date <= todayKey) nowCat.set(x.categoryId, (nowCat.get(x.categoryId) ?? 0) + x.amount);
    else if (k === prevMonth && x.date <= cut) prevCat.set(x.categoryId, (prevCat.get(x.categoryId) ?? 0) + x.amount);
  }
  const nowTotal = [...nowCat.values()].reduce((a, b) => a + b, 0);
  const dayConf: Confidence = day >= 14 ? 'high' : day >= 7 ? 'medium' : 'low';
  const mtdLabel = rangeLabel({ from: cycleRange(monthKey).from, to: todayKey });
  const prevMtdLabel = rangeLabel({ from: cycleRange(prevMonth).from, to: cut });
  const prevTotal = [...prevCat.values()].reduce((a, b) => a + b, 0);
  if (prevTotal >= 100 && nowTotal - prevTotal >= 50 && (nowTotal - prevTotal) / prevTotal >= 0.1) {
    const ids = new Set([...nowCat.keys(), ...prevCat.keys()]);
    const movers = [...ids]
      .map((id) => ({ id, diff: (nowCat.get(id) ?? 0) - (prevCat.get(id) ?? 0) }))
      .filter((m) => m.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);
    out.push({
      id: 'why',
      tone: 'warn',
      title: t('fc.feed.why.title', { amount: money(nowTotal - prevTotal) }),
      body: movers.map((m) => `${categoryName(m.id)} +${money(m.diff)}`).join(' · '),
      action: t('fc.feed.why.action', { category: categoryName(movers[0].id) }),
      category: 'spending',
      confidence: dayConf,
      impact: nowTotal - prevTotal,
      period: `${mtdLabel} · ${prevMtdLabel}`,
      evidence: [
        ev('fc.ev.thisMonth', money(nowTotal)),
        ev('fc.ev.sameDaysBefore', money(prevTotal)),
        ev('fc.ev.difference', `+${money(nowTotal - prevTotal)} (${pc(((nowTotal - prevTotal) / prevTotal) * 100)})`),
        ...movers.map((m) => ({ label: categoryName(m.id), value: `+${money(m.diff)}` })),
      ],
      how: t('fc.how.why'),
      subjectCategoryId: movers[0].id,
      window: { from: cycleRange(monthKey).from, to: todayKey },
    });
  } else if (prevTotal >= 100 && prevTotal - nowTotal >= 50 && (prevTotal - nowTotal) / prevTotal >= 0.1) {
    out.push({
      id: 'why',
      tone: 'good',
      title: t('fc.feed.less.title', { amount: money(prevTotal - nowTotal) }),
      body: t('fc.feed.less.body'),
      category: 'positive',
      confidence: dayConf,
      impact: prevTotal - nowTotal,
      period: `${mtdLabel} · ${prevMtdLabel}`,
      evidence: [ev('fc.ev.thisMonth', money(nowTotal)), ev('fc.ev.sameDaysBefore', money(prevTotal)), ev('fc.ev.difference', `-${money(prevTotal - nowTotal)}`)],
      how: t('fc.how.why'),
    });
  }

  // 3) Weekends against weekdays, last 3 months.
  const from3 = cycleRange(shiftCycle(monthKey, -3)).from;
  let wkDays = 0;
  let weDays = 0;
  let wkSpend = 0;
  let weSpend = 0;
  const spendByDay = new Map<string, number>();
  for (const x of transactions) if (x.type === 'debit' && x.amount > 0 && x.date >= from3 && x.date <= todayKey) spendByDay.set(x.date, (spendByDay.get(x.date) ?? 0) + x.amount);
  {
    const [fy, fm, fd] = from3.split('-').map(Number);
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const start = Date.UTC(fy, fm - 1, fd);
    const end = Date.UTC(ty, tm - 1, td);
    for (let ms = start; ms <= end; ms += 86400000) {
      const d = new Date(ms);
      const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      const v = spendByDay.get(key) ?? 0;
      // Saturday-Sunday, or Friday-Saturday in Kedah, Kelantan and Terengganu (from the user's region setting).
      if (isWeekend(key)) {
        weDays++;
        weSpend += v;
      } else {
        wkDays++;
        wkSpend += v;
      }
    }
  }
  if (wkDays > 20 && weDays > 8 && wkSpend > 0) {
    const ratio = weSpend / weDays / (wkSpend / wkDays);
    if (ratio >= 1.5) {
      out.push({
        id: 'weekend',
        tone: 'info',
        title: t('fc.feed.weekend.title', { x: (Math.round(ratio * 10) / 10).toString() }),
        body: t('fc.feed.weekend.body', { we: money(weSpend / weDays), wk: money(wkSpend / wkDays) }),
        action: t('fc.feed.weekend.action'),
        category: 'pattern',
        confidence: wkDays > 50 ? 'high' : 'medium',
        // Extra spent on a month's weekends (about 8.7 weekend days) compared with weekday spending.
        impact: (weSpend / weDays - wkSpend / wkDays) * 8.7,
        period: rangeLabel({ from: from3, to: todayKey }),
        evidence: [ev('fc.ev.weekendDay', money(weSpend / weDays)), ev('fc.ev.weekdayDay', money(wkSpend / wkDays)), ev('fc.ev.daysCounted', String(weDays + wkDays))],
        how: t('fc.how.weekend'),
      });
    }
  }

  // 4) Fixed commitments against income.
  const incomeAvg = complete.length ? complete.slice(-3).reduce((s, r) => s + r.income, 0) / Math.min(3, complete.length) : 0;
  if (incomeAvg > 0 && fixedMonthly > 0) {
    const share = r1((fixedMonthly / incomeAvg) * 100);
    out.push({
      id: 'fixed',
      tone: share >= 50 ? 'bad' : share >= 40 ? 'warn' : 'info',
      title: t('fc.feed.fixed.title', { pct: p1(share) }),
      body: t('fc.feed.fixed.body', { amount: money(fixedMonthly) }),
      action: share >= 40 ? t('fc.feed.fixed.action') : undefined,
      category: 'risk',
      confidence: monthsConf,
      impact: share >= 40 ? fixedMonthly : 0,
      period: span(complete.slice(-3).map((r) => r.key)),
      evidence: [ev('fc.ev.fixedMonthly', money(fixedMonthly)), ev('fc.ev.avgIncome', money(incomeAvg)), ev('fc.ev.share', pc(share))],
      how: t('fc.how.fixed'),
    });
  }

  // 5) Lifestyle creep: spending growing faster than income, last 3 months against the 3 before.
  if (complete.length >= 6) {
    const a = complete.slice(-6, -3);
    const b = complete.slice(-3);
    const sum = (rs: MonthRow[], k: 'income' | 'spending') => rs.reduce((s, r) => s + r[k], 0);
    const gi = sum(a, 'income') > 0 ? (sum(b, 'income') / sum(a, 'income') - 1) * 100 : null;
    const ge = sum(a, 'spending') > 0 ? (sum(b, 'spending') / sum(a, 'spending') - 1) * 100 : null;
    if (gi !== null && ge !== null && ge >= 8 && ge > gi + 5) {
      out.push({
        id: 'creep',
        tone: 'warn',
        title: t('fc.feed.creep.title'),
        body: t('fc.feed.creep.body', { income: p1(gi), spending: p1(ge) }),
        action: t('fc.feed.creep.action'),
        category: 'spending',
        confidence: 'high',
        impact: (sum(b, 'spending') - sum(a, 'spending')) / 3,
        period: `${span(a.map((r) => r.key))} · ${span(b.map((r) => r.key))}`,
        evidence: [ev('fc.ev.incomeGrowth', pc(gi)), ev('fc.ev.spendingGrowth', pc(ge)), ev('fc.ev.spendingBefore', money(sum(a, 'spending'))), ev('fc.ev.spendingAfter', money(sum(b, 'spending')))],
        how: t('fc.how.creep'),
      });
    }
  }

  // 6) A spike this week against the usual week.
  {
    const back = (days: number) => {
      const [y, m, d] = todayKey.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d - days));
      return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
    };
    const weekFrom = back(6);
    const baseFrom = back(62);
    let week = 0;
    let base = 0;
    const weekCat = new Map<string, number>();
    for (const x of transactions) {
      if (x.type !== 'debit' || x.recurringId) continue;
      if (x.date >= weekFrom && x.date <= todayKey) {
        week += x.amount;
        weekCat.set(x.categoryId, (weekCat.get(x.categoryId) ?? 0) + x.amount);
      } else if (x.date >= baseFrom && x.date < weekFrom) base += x.amount;
    }
    const usual = base / 8;
    if (usual >= 50 && week >= usual * 1.5 && week - usual >= 80) {
      const top = [...weekCat.entries()].sort((a, b) => b[1] - a[1])[0];
      out.push({
        id: 'spike',
        tone: 'warn',
        title: t('fc.feed.spike.title'),
        body: t('fc.feed.spike.body', { week: money(week), usual: money(usual), category: top ? categoryName(top[0]) : '' }),
        category: 'spending',
        confidence: transactions.some((x) => x.date <= baseFrom) ? 'high' : 'medium',
        impact: week - usual,
        period: rangeLabel({ from: weekFrom, to: todayKey }),
        evidence: [ev('fc.ev.last7', money(week)), ev('fc.ev.usualWeek', money(usual)), ...(top ? [ev('fc.ev.topCategory', `${categoryName(top[0])} · ${money(top[1])}`)] : [])],
        how: t('fc.how.spike'),
        subjectCategoryId: top?.[0],
        window: { from: weekFrom, to: todayKey },
      });
    }
  }

  // 7) Emergency cushion in savings accounts.
  const spendAvg = complete.length ? complete.slice(-3).reduce((s, r) => s + r.spending, 0) / Math.min(3, complete.length) : 0;
  const runway = savingsBalance > 0 ? runwayMonths(savingsBalance, spendAvg) : null;
  if (runway !== null) {
    if (runway < 3) {
      out.push({
        id: 'runway',
        tone: 'warn',
        title: t('fc.feed.runwayLow.title', { n: runway.toString() }),
        body: t('fc.feed.runwayLow.body', { target: money(spendAvg * 3) }),
        action: t('fc.feed.runwayLow.action', { gap: money(spendAvg * 3 - savingsBalance) }),
        category: 'risk',
        confidence: monthsConf,
        impact: Math.max(0, spendAvg * 3 - savingsBalance) / 12,
        period: span(complete.slice(-3).map((r) => r.key)),
        evidence: [ev('fc.ev.savings', money(savingsBalance)), ev('fc.ev.avgSpending', money(spendAvg)), ev('fc.ev.monthsCovered', String(runway)), ev('fc.ev.target3', money(spendAvg * 3))],
        how: t('fc.how.runway'),
      });
    } else if (runway >= 6) {
      out.push({
        id: 'runway',
        tone: 'good',
        title: t('fc.feed.runwayGood.title', { n: Math.floor(runway) }),
        body: t('fc.feed.runwayGood.body'),
        category: 'positive',
        confidence: monthsConf,
        impact: 0,
        period: span(complete.slice(-3).map((r) => r.key)),
        evidence: [ev('fc.ev.savings', money(savingsBalance)), ev('fc.ev.avgSpending', money(spendAvg)), ev('fc.ev.monthsCovered', String(runway))],
        how: t('fc.how.runway'),
      });
    }
  }

  // 8) Budget risk this month: spending in budgeted categories so far, at today's pace, against their total.
  if (budget > 0 && day >= 7) {
    const daysIn = info.length;
    const budgetedNow = budgets ? budgets.reduce((s, b) => s + Math.max(0, nowCat.get(b.categoryId) ?? 0), 0) : nowTotal;
    const projected = (budgetedNow / day) * daysIn;
    if (projected > budget * 1.05) {
      out.push({
        id: 'budget',
        tone: 'bad',
        title: t('fc.feed.budget.title', { amount: money(projected - budget) }),
        body: t('fc.feed.budget.body', { projected: money(projected), budget: money(budget) }),
        action: t('fc.feed.budget.action', { perDay: money(Math.max(0, (budget - budgetedNow) / Math.max(1, daysIn - day))) }),
        category: 'spending',
        confidence: dayConf,
        impact: projected - budget,
        period: mtdLabel,
        evidence: [ev('fc.ev.spentBudgeted', money(budgetedNow)), ev('fc.ev.dayOf', `${day} / ${daysIn}`), ev('fc.ev.projected', money(projected)), ev('fc.ev.budget', money(budget))],
        how: t('fc.how.budget'),
      });
    }
  }

  // 9) Goals that are late or off track (at most two).
  goals
    .filter((g) => g.outlook === 'off' || g.outlook === 'late')
    .slice(0, 2)
    .forEach((g, i) => {
      out.push({
        id: `goal${i}`,
        tone: g.outlook === 'off' ? 'bad' : 'warn',
        title: t(g.outlook === 'off' ? 'fc.feed.goalOff.title' : 'fc.feed.goalLate.title', { name: g.name }),
        body: g.need !== null ? t('fc.feed.goal.body', { need: money(g.need), pace: money(g.pace) }) : t('fc.feed.goal.bodyNone'),
        action: g.need !== null && g.need > g.pace ? t('fc.feed.goal.action', { extra: money(g.need - g.pace) }) : undefined,
        category: 'goal',
        confidence: 'medium',
        impact: g.need !== null ? Math.max(0, g.need - g.pace) : 0,
        evidence: [...(g.need !== null ? [ev('fc.ev.need', money(g.need))] : []), ev('fc.ev.pace', money(g.pace))],
        how: t('fc.how.goal'),
      });
    });
  // A goal on or ahead of schedule: at most one, so wins never crowd out problems.
  const onTrack = goals.find((g) => g.outlook === 'on' && g.need !== null && g.pace > 0 && g.pace >= g.need);
  if (onTrack && onTrack.need !== null) {
    out.push({
      id: 'goalOn',
      tone: 'good',
      title: t('fc.feed.goalOn.title', { name: onTrack.name }),
      body: t('fc.feed.goalOn.body', { pace: money(onTrack.pace), need: money(onTrack.need) }),
      category: 'goal',
      confidence: 'medium',
      impact: 0,
      evidence: [ev('fc.ev.need', money(onTrack.need)), ev('fc.ev.pace', money(onTrack.pace))],
      how: t('fc.how.goal'),
    });
  }

  /* ---- 10 to 20: more everyday findings (2.1.0) ---- */
  const from30 = daysBack(todayKey, 29);
  const last30 = transactions.filter((x) => x.type === 'debit' && x.amount > 0 && x.date >= from30 && x.date <= todayKey);
  const spend30 = last30.reduce((s, x) => s + x.amount, 0);
  const lastRow = complete[complete.length - 1];
  const conf30: Confidence = last30.length >= 30 ? 'high' : last30.length >= 12 ? 'medium' : 'low';
  const label30 = rangeLabel({ from: from30, to: todayKey });

  // 10) How last month's income was split between spending and keeping.
  if (lastRow && lastRow.income > 0 && !out.some((o) => o.id === 'rate' && o.tone === 'bad')) {
    const spent = r1((lastRow.spending / lastRow.income) * 100);
    const kept = r1(100 - spent);
    if (kept >= 0) {
      out.push({
        id: 'split',
        tone: kept >= 20 ? 'good' : 'info',
        title: t('fc.feed.split.title', { spent: p1(spent), kept: p1(kept) }),
        body: t('fc.feed.split.body', { income: money(lastRow.income), spending: money(lastRow.spending) }),
        action: kept < 10 ? t('fc.feed.split.action') : undefined,
        category: kept >= 20 ? 'positive' : 'pattern',
        confidence: 'medium',
        impact: 0,
        period: span([lastRow.key]),
        evidence: [ev('fc.ev.income', money(lastRow.income)), ev('fc.ev.spending', money(lastRow.spending)), ev('fc.ev.kept', pc(kept))],
        how: t('fc.how.rate'),
      });
    }
  }

  // 11) A habit: the same thing bought again and again in 30 days.
  {
    const byTitle = new Map<string, { label: string; n: number; total: number }>();
    for (const x of last30) {
      const label = x.title.trim();
      const key = label.toLowerCase();
      if (!key || /^transfer$|^pindahan$/.test(key)) continue;
      const h = byTitle.get(key) ?? { label, n: 0, total: 0 };
      h.n++;
      h.total += x.amount;
      byTitle.set(key, h);
    }
    const habit = [...byTitle.values()].filter((h) => h.n >= 4).sort((a, b) => b.total - a.total)[0];
    if (habit && habit.total >= 30) {
      out.push({
        id: 'habit',
        tone: 'info',
        title: t('fc.feed.habit.title', { title: habit.label, n: habit.n }),
        body: t('fc.feed.habit.body', { total: money(habit.total), avg: money(habit.total / habit.n) }),
        action: t('fc.feed.habit.action', { half: money(habit.total / 2) }),
        category: 'opportunity',
        confidence: conf30,
        impact: habit.total / 2,
        period: label30,
        evidence: [ev('fc.ev.times', String(habit.n)), ev('fc.ev.total', money(habit.total)), ev('fc.ev.average', money(habit.total / habit.n))],
        how: t('fc.how.habit'),
      });
    }
  }

  // 12) Small purchases adding up.
  {
    const small = last30.filter((x) => x.amount < 20);
    const total = small.reduce((s, x) => s + x.amount, 0);
    if (small.length >= 10 && total >= 80) {
      out.push({
        id: 'small',
        tone: 'info',
        title: t('fc.feed.small.title', { n: small.length, total: money(total) }),
        body: t('fc.feed.small.body', { share: p1(spend30 > 0 ? (total / spend30) * 100 : 0) }),
        category: 'spending',
        confidence: conf30,
        impact: total,
        period: label30,
        evidence: [ev('fc.ev.count', String(small.length)), ev('fc.ev.total', money(total)), ev('fc.ev.shareSpend', pc(spend30 > 0 ? (total / spend30) * 100 : 0))],
        how: t('fc.how.small'),
      });
    }
  }

  // 13) Too much left in Miscellaneous makes every other finding weaker.
  {
    const misc = last30.filter((x) => x.categoryId === 'other').reduce((s, x) => s + x.amount, 0);
    if (spend30 > 0 && misc >= 50 && misc / spend30 >= 0.2) {
      out.push({
        id: 'misc',
        tone: 'warn',
        title: t('fc.feed.misc.title', { share: p1((misc / spend30) * 100) }),
        body: t('fc.feed.misc.body', { amount: money(misc) }),
        action: t('fc.feed.misc.action'),
        category: 'pattern',
        confidence: conf30,
        impact: 0,
        period: label30,
        evidence: [ev('fc.ev.total', money(misc)), ev('fc.ev.shareSpend', pc((misc / spend30) * 100))],
        how: t('fc.how.misc'),
      });
    }
  }

  // 14, 15, 19) Category picture of the last complete month.
  if (lastRow && lastRow.spending > 0) {
    const prevKey = shiftCycle(lastRow.key, -1);
    const last = new Map<string, number>();
    const before = new Map<string, number>();
    let subsCount = 0;
    let subsTotal = 0;
    for (const x of transactions) {
      if (x.type !== 'debit') continue;
      const k = cycleOf(x.date);
      if (k === lastRow.key) {
        last.set(x.categoryId, (last.get(x.categoryId) ?? 0) + x.amount);
        if (x.categoryId === 'subscriptions') {
          subsCount++;
          subsTotal += x.amount;
        }
      } else if (k === prevKey) before.set(x.categoryId, (before.get(x.categoryId) ?? 0) + x.amount);
    }
    const top = [...last.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[0] !== 'other' && top[1] / lastRow.spending >= 0.4) {
      out.push({
        id: 'topcat',
        tone: 'info',
        title: t('fc.feed.topcat.title', { category: categoryName(top[0]), share: p1((top[1] / lastRow.spending) * 100) }),
        body: t('fc.feed.topcat.body', { amount: money(top[1]) }),
        category: 'pattern',
        confidence: 'medium',
        impact: 0,
        period: span([lastRow.key]),
        evidence: [ev('fc.ev.amount', money(top[1])), ev('fc.ev.spending', money(lastRow.spending)), ev('fc.ev.shareSpend', pc((top[1] / lastRow.spending) * 100))],
        how: t('fc.how.topcat'),
        subjectCategoryId: top[0],
        window: cycleRange(lastRow.key),
      });
    }
    const drop = [...before.entries()]
      .map(([id, b]) => ({ id, b, a: last.get(id) ?? 0 }))
      .filter((d) => d.b >= 50 && d.b - d.a >= 30 && (d.b - d.a) / d.b >= 0.2)
      .sort((x, y) => y.b - y.a - (x.b - x.a))[0];
    if (drop) {
      out.push({
        id: 'improved',
        tone: 'good',
        title: t('fc.feed.improved.title', { category: categoryName(drop.id), amount: money(drop.b - drop.a) }),
        body: t('fc.feed.improved.body', { before: money(drop.b), after: money(drop.a) }),
        category: 'positive',
        confidence: 'medium',
        impact: drop.b - drop.a,
        period: span([prevKey, lastRow.key]),
        evidence: [ev('fc.ev.before', money(drop.b)), ev('fc.ev.after', money(drop.a)), ev('fc.ev.difference', `-${money(drop.b - drop.a)}`)],
        how: t('fc.how.improved'),
        subjectCategoryId: drop.id,
        window: cycleRange(lastRow.key),
      });
    }
    if (subsTotal >= 30) {
      out.push({
        id: 'subs',
        tone: 'info',
        title: t('fc.feed.subs.title', { amount: money(subsTotal) }),
        body: t('fc.feed.subs.body', { n: subsCount, year: money(subsTotal * 12) }),
        action: t('fc.feed.subs.action'),
        category: 'opportunity',
        confidence: 'medium',
        impact: subsTotal * 0.2,
        period: span([lastRow.key]),
        evidence: [ev('fc.ev.count', String(subsCount)), ev('fc.ev.total', money(subsTotal)), ev('fc.ev.year', money(subsTotal * 12))],
        how: t('fc.how.subs'),
      });
    }
  }

  // 16) Days without spending this month.
  if (day >= 5) {
    const spentDays = new Set(transactions.filter((x) => x.type === 'debit' && x.amount > 0 && cycleOf(x.date) === monthKey && x.date < todayKey).map((x) => x.date));
    const free = day - 1 - spentDays.size;
    if (free >= 3) {
      out.push({
        id: 'nospend',
        tone: 'good',
        title: t('fc.feed.nospend.title', { n: free }),
        body: t('fc.feed.nospend.body'),
        category: 'positive',
        confidence: dayConf,
        impact: 0,
        period: mtdLabel,
        evidence: [ev('fc.ev.daysFree', String(free)), ev('fc.ev.daysSoFar', String(day - 1))],
        how: t('fc.how.nospend'),
      });
    }
  }

  // 17) How fast the pay goes after payday.
  if (lastRow) {
    const credits = transactions.filter((x) => x.type === 'credit' && cycleOf(x.date) === lastRow.key && x.amount >= 500).sort((a, b) => b.amount - a.amount);
    const pay = credits[0];
    if (pay) {
      const until = daysBack(pay.date, -6);
      const week = transactions.filter((x) => x.type === 'debit' && x.date >= pay.date && x.date <= until).reduce((s, x) => s + x.amount, 0);
      const share = r1((week / pay.amount) * 100);
      if (share >= 40) {
        out.push({
          id: 'payday',
          tone: 'warn',
          title: t('fc.feed.payday.title', { share: p1(share) }),
          body: t('fc.feed.payday.body', { amount: money(week), pay: money(pay.amount) }),
          action: t('fc.feed.payday.action'),
          category: 'pattern',
          confidence: 'medium',
          impact: 0,
          period: rangeLabel({ from: pay.date, to: until }),
          evidence: [ev('fc.ev.pay', money(pay.amount)), ev('fc.ev.payWeek', money(week)), ev('fc.ev.share', pc(share))],
          how: t('fc.how.payday'),
        });
      }
    }
  }

  // 18) Income higher or lower than usual.
  if (complete.length >= 3 && lastRow && lastRow.income > 0) {
    const prevRows = complete.slice(-4, -1).filter((r) => r.income > 0);
    const usual = prevRows.length ? prevRows.reduce((s, r) => s + r.income, 0) / prevRows.length : 0;
    if (usual > 0) {
      const change = r1((lastRow.income / usual - 1) * 100);
      const meta = {
        confidence: (prevRows.length >= 3 ? 'high' : 'medium') as Confidence,
        impact: Math.abs(lastRow.income - usual),
        period: `${span(prevRows.map((r) => r.key))} · ${span([lastRow.key])}`,
        evidence: [ev('fc.ev.lastIncome', money(lastRow.income)), ev('fc.ev.usualIncome', money(usual)), ev('fc.ev.difference', pc(change))],
        how: t('fc.how.income'),
      };
      const body = t('fc.feed.income.body', { last: money(lastRow.income), usual: money(usual) });
      if (change <= -15) {
        out.push({ id: 'income', tone: 'warn', title: t('fc.feed.incomeDown.title', { pct: p1(-change) }), body, action: t('fc.feed.incomeDown.action'), category: 'risk', ...meta });
      } else if (change >= 15) {
        out.push({ id: 'income', tone: 'good', title: t('fc.feed.incomeUp.title', { pct: p1(change) }), body, action: t('fc.feed.incomeUp.action', { amount: money((lastRow.income - usual) / 2) }), category: 'positive', ...meta });
      }
    }
  }

  // 20) One purchase that dominates the last 30 days.
  if (spend30 >= 200) {
    const big = [...last30].sort((a, b) => b.amount - a.amount)[0];
    if (big && big.amount / spend30 >= 0.25) {
      out.push({
        id: 'bigone',
        tone: 'info',
        title: t('fc.feed.bigone.title', { share: p1((big.amount / spend30) * 100) }),
        body: t('fc.feed.bigone.body', { title: big.title || categoryName(big.categoryId), amount: money(big.amount) }),
        category: 'spending',
        confidence: conf30,
        impact: 0,
        period: label30,
        evidence: [ev('fc.ev.amount', money(big.amount)), ev('fc.ev.total', money(spend30)), ev('fc.ev.shareSpend', pc((big.amount / spend30) * 100))],
        how: t('fc.how.bigone'),
        subjectCategoryId: big.categoryId,
        window: { from: from30, to: todayKey },
      });
    }
  }

  // 21) Debt repayments against income (instalments and loans; credit lines have no fixed instalment).
  if (debtMonthly !== null && debtMonthly > 0 && incomeAvg > 0) {
    const share = r1((debtMonthly / incomeAvg) * 100);
    if (share >= 20) {
      out.push({
        id: 'debt',
        tone: share >= 40 ? 'bad' : share >= 30 ? 'warn' : 'info',
        title: t('fc.feed.debt.title', { pct: p1(share) }),
        body: t('fc.feed.debt.body', { amount: money(debtMonthly), income: money(incomeAvg) }),
        action: share >= 30 ? t('fc.feed.debt.action') : undefined,
        category: 'risk',
        confidence: monthsConf,
        impact: debtMonthly,
        period: span(complete.slice(-3).map((r) => r.key)),
        evidence: [ev('fc.ev.debtMonthly', money(debtMonthly)), ev('fc.ev.avgIncome', money(incomeAvg)), ev('fc.ev.share', pc(share))],
        how: t('fc.how.debt'),
      });
    }
  }
  // Most pressing first: problems, then warnings, then wins, then plain facts.
  const rank: Record<FeedTone, number> = { bad: 0, warn: 1, good: 2, info: 3 };
  return out.map((o, i) => ({ o, i })).sort((a, b) => rank[a.o.tone] - rank[b.o.tone] || a.i - b.i).map((x) => x.o);
}

/* ---------------- WaKira score (legacy shape) ---------------- */

/**
 * The overall score as the rest of the app reads it (Ringkasan, Ask WaKira). Since 3.8 it is made by the five-area
 * financial health assessment in utils/health.ts: each area's 0-100 score becomes `points` out of 20.
 * It is not a credit score or financial advice.
 */
export type ScoreFactor = { id: 'cashflow' | 'savings' | 'debt' | 'budget' | 'preparedness'; points: number; max: 20 };
export type Score = { total: number; factors: ScoreFactor[]; grade: 'great' | 'good' | 'fair' | 'low'; weakest: ScoreFactor['id'] | null };

export const DEFAULT_SAVINGS_TARGET = 20;
/** Keeps a saved target inside a sensible range so the score never divides by zero. */
export const clampTarget = (n: number) => Math.min(60, Math.max(5, Math.round(Number.isFinite(n) ? n : DEFAULT_SAVINGS_TARGET)));

/* ---------------- Profile snapshot ---------------- */

export type Snapshot = { months: number; income: number; spending: number; saved: number; rate: number | null };

/**
 * Averages over the last (up to) 3 complete months that have records. Needs at least 3 such months, otherwise
 * returns null so the Profile says "not enough data yet" instead of guessing. Never stored: always derived.
 */
export function snapshotOf(transactions: Transaction[], todayKey: string): Snapshot | null {
  const rows = trimmed(monthRows(transactions, monthKeysEnding(todayKey, 7).slice(0, -1)));
  if (rows.length < 3) return null;
  const recent = rows.slice(-3);
  const income = recent.reduce((s, r) => s + r.income, 0) / recent.length;
  const spending = recent.reduce((s, r) => s + r.spending, 0) / recent.length;
  const saved = income - spending;
  return { months: recent.length, income: round2(income), spending: round2(spending), saved: round2(saved), rate: income > 0 ? round2((saved / income) * 100) : null };
}

/** A starting point for an emergency fund: `months` of average spending, rounded up to the next 100. */
export function emergencyTarget(snapshot: Snapshot | null, months = 6): number {
  if (!snapshot || snapshot.spending <= 0) return 0;
  return Math.ceil((snapshot.spending * months) / 100) * 100;
}

/* ---------------- AI-ready summary ---------------- */

/**
 * A short, anonymous summary of the numbers (no titles, notes, merchants or account names) that the user can
 * paste into any AI assistant. WaKira itself sends nothing anywhere.
 */
export function aiSummary(inp: { rows: MonthRow[]; score: Score | null; feed: FeedItem[]; goals: GoalFacts[]; savingsBalance: number; fixedMonthly: number }): string {
  const { rows, score, feed, goals, savingsBalance, fixedMonthly } = inp;
  const line = (r: MonthRow) => `${r.key}: income ${Math.round(r.income)}, spending ${Math.round(r.spending)}`;
  const parts = [
    t('fc.ai.intro'),
    '',
    rows.map(line).join('\n'),
    `Recurring bills per month: ${Math.round(fixedMonthly)}`,
    `Savings accounts total: ${Math.round(savingsBalance)}`,
    score ? `WaKira score: ${score.total}/100` : '',
    goals.length ? `Goals: ${goals.map((g) => `${g.name} (${g.outlook}${g.need !== null ? `, needs ${Math.round(g.need)}/month, pace ${Math.round(g.pace)}` : ''})`).join('; ')}` : '',
    feed.length ? `Observations: ${feed.map((f) => f.title).join(' | ')}` : '',
    '',
    t('fc.ai.ask'),
  ];
  return parts.filter((p, i) => p !== '' || parts[i - 1] !== '').join('\n');
}
