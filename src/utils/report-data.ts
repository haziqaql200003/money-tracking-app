import type { Transaction } from '@/context/TransactionsContext';
import { addDays, cycleOf, cycleRange, daysBetween, shiftCycle } from '@/utils/cycle';
import type { Debt } from '@/utils/debts';
import { goalProgress, type GoalEntry, type SavingsGoal } from '@/utils/goals';
import { isAdjustmentEntry } from '@/utils/saved';

/**
 * Numbers behind the story reports (weekly receipt, monthly poster, yearly wrap).
 * Pure functions over the user's records; nothing here is stored.
 */

export type ReportKind = 'week' | 'month' | 'year';
export type Period = { kind: ReportKind; key: string; from: string; to: string; /** Last day with data (today for a period still running). */ end: string };

export type Named = { id: string; amount: number; count: number; share: number };
export type Place = { title: string; amount: number; count: number; generic: boolean };
export type BigOne = { title: string; amount: number; date: string; categoryId: string };
export type Habit = { subcategory: string; categoryId: string; count: number; amount: number };
export type BudgetLine = { categoryId: string; spent: number; limit: number; pct: number };
export type GoalLine = { id: string; name: string; percent: number; saved: number; target: number; inPeriod: number; done: boolean };
export type Moment = { date: string; kind: 'first' | 'bonus' | 'big' | 'debt' | 'goalNew' | 'goalDone' | 'bestSave'; label: string; amount?: number };
export type Personality = 'saver' | 'weekend' | 'foodie' | 'monthEnd' | 'recorder' | 'balanced' | 'generous';
export type Badge = { id: string; got: boolean };

export type Report = {
  period: Period;
  income: number;
  spend: number;
  net: number;
  /** Saved as % of income, null without income. */
  rate: number | null;
  records: number;
  activeDays: number;
  daysCounted: number;
  /** Spending per day of the period, from `from` to `to` (days after `end` are 0). */
  daily: number[];
  /** Whether anything was recorded on each day of the period. */
  recorded: boolean[];
  prev: { income: number; spend: number; net: number; label: 'week' | 'month' | 'year' };
  spendChange: number | null;
  categories: Named[];
  incomeBy: Named[];
  biggestRise: { id: string; now: number; before: number; pct: number } | null;
  biggestFall: { id: string; now: number; before: number; pct: number } | null;
  places: Place[];
  biggest: BigOne[];
  habits: Habit[];
  longestStreak: number;
  currentStreak: number;
  noSpendDays: number;
  priciestDay: { date: string; amount: number } | null;
  weekday: number[]; // average spend Mon..Sun
  months: { key: string; income: number; spend: number }[];
  subscriptions: { title: string; perMonth: number; total: number }[];
  budgets: BudgetLine[];
  goals: GoalLine[];
  debtPaid: number;
  debtsCleared: string[];
  personality: Personality;
  moments: Moment[];
  badges: Badge[];
  /** Year only: savings a year from now if the average month repeats. */
  projection: number | null;
  grade: string;
};

type Input = {
  kind: ReportKind;
  key: string; // week: Monday 'YYYY-MM-DD'; month: cycle key 'YYYY-MM'; year: 'YYYY'
  todayKey: string;
  transactions: Transaction[];
  categoryOf: (id: string) => { name: string; isFood?: boolean } | undefined;
  subName: (sub: string) => string;
  limits: { categoryId: string; limit: number }[];
  goals: SavingsGoal[];
  goalEntries: GoalEntry[];
  debts: Debt[];
  savingsTarget: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
const weekdayOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = Monday
};
const min = (a: string, b: string) => (a < b ? a : b);

/** Monday of the week that holds `dateKey`. */
export function mondayOf(dateKey: string) {
  return addDays(dateKey, -weekdayOf(dateKey));
}

export function periodOf(kind: ReportKind, key: string, todayKey: string): Period {
  let from: string;
  let to: string;
  if (kind === 'week') {
    from = key;
    to = addDays(key, 6);
  } else if (kind === 'month') {
    ({ from, to } = cycleRange(key));
  } else {
    from = `${key}-01-01`;
    to = `${key}-12-31`;
  }
  return { kind, key, from, to, end: min(to, todayKey) };
}

function previous(p: Period): { from: string; to: string } {
  if (p.kind === 'week') return { from: addDays(p.from, -7), to: addDays(p.end, -7) };
  if (p.kind === 'month') {
    const r = cycleRange(shiftCycle(p.key, -1));
    const len = daysBetween(p.from, p.end);
    return { from: r.from, to: min(r.to, addDays(r.from, len)) };
  }
  const y = Number(p.key) - 1;
  return { from: `${y}-01-01`, to: `${y}${p.end.slice(4)}` };
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

/** Longest run of consecutive days with at least one record, and the run ending on the last day. */
function streaks(days: Set<string>, from: string, to: string) {
  let best = 0;
  let run = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    run = days.has(d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { best, current: run };
}

export function buildReport(inp: Input): Report {
  const { kind, key, todayKey, transactions, categoryOf, subName } = inp;
  const p = periodOf(kind, key, todayKey);
  const pv = previous(p);
  const all = transactions.filter((t) => inRange(t.date, p.from, p.end));
  const real = all.filter((t) => !isAdjustmentEntry(t));
  const debits = all.filter((t) => t.type === 'debit');
  const realDebits = real.filter((t) => t.type === 'debit');

  const income = r2(all.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0));
  const spend = r2(debits.reduce((s, t) => s + t.amount, 0));
  const net = r2(income - spend);
  const rate = income > 0 ? Math.round((net / income) * 100) : null;

  const before = transactions.filter((t) => inRange(t.date, pv.from, pv.to));
  const pIncome = r2(before.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0));
  const pSpend = r2(before.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0));

  // Per day
  const length = daysBetween(p.from, p.to) + 1;
  const daysCounted = daysBetween(p.from, p.end) + 1;
  const daily = new Array<number>(length).fill(0);
  const recordDays = new Set<string>();
  for (const t of real) recordDays.add(t.date);
  for (const t of debits) daily[daysBetween(p.from, t.date)] += t.amount;
  for (let i = 0; i < length; i++) daily[i] = r2(daily[i]);
  const recorded = Array.from({ length }, (_, i) => recordDays.has(addDays(p.from, i)));
  let noSpendDays = 0;
  let priciestDay: Report['priciestDay'] = null;
  for (let i = 0; i < daysCounted; i++) {
    if (daily[i] === 0) noSpendDays++;
    if (!priciestDay || daily[i] > priciestDay.amount) priciestDay = { date: addDays(p.from, i), amount: daily[i] };
  }
  if (priciestDay && priciestDay.amount === 0) priciestDay = null;
  const { best: longestStreak, current: currentStreak } = streaks(recordDays, p.from, p.end);

  // Categories now and before
  const byCat = new Map<string, { amount: number; count: number }>();
  for (const t of debits) {
    const c = byCat.get(t.categoryId) ?? { amount: 0, count: 0 };
    c.amount += t.amount;
    c.count++;
    byCat.set(t.categoryId, c);
  }
  const categories = [...byCat.entries()]
    .map(([id, v]) => ({ id, amount: r2(v.amount), count: v.count, share: spend > 0 ? v.amount / spend : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const inc = new Map<string, { amount: number; count: number }>();
  for (const t of real) {
    if (t.type !== 'credit') continue;
    const c = inc.get(t.categoryId) ?? { amount: 0, count: 0 };
    c.amount += t.amount;
    c.count++;
    inc.set(t.categoryId, c);
  }
  const incomeBy = [...inc.entries()]
    .map(([id, v]) => ({ id, amount: r2(v.amount), count: v.count, share: income > 0 ? v.amount / income : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const prevCat = new Map<string, number>();
  for (const t of before) if (t.type === 'debit') prevCat.set(t.categoryId, (prevCat.get(t.categoryId) ?? 0) + t.amount);
  let biggestRise: Report['biggestRise'] = null;
  let biggestFall: Report['biggestFall'] = null;
  for (const c of categories) {
    const b = prevCat.get(c.id) ?? 0;
    const change = pct(c.amount, b);
    if (change === null || b < 20) continue;
    const row = { id: c.id, now: c.amount, before: r2(b), pct: change };
    if (change > 0 && (!biggestRise || c.amount - b > biggestRise.now - biggestRise.before)) biggestRise = row;
    if (change < 0 && (!biggestFall || b - c.amount > biggestFall.before - biggestFall.now)) biggestFall = row;
  }

  // Places: the record titles. A title that is just the subcategory or category name says nothing about where.
  const places = new Map<string, Place>();
  for (const t of realDebits) {
    if (t.recurringId || t.debtId || t.iouId) continue; // rent and bills are not "places you go"
    const title = t.title.trim();
    if (!title) continue;
    const k = title.toLowerCase();
    const generic = title === t.subcategory || title === subName(t.subcategory) || title === categoryOf(t.categoryId)?.name;
    const pl = places.get(k) ?? { title, amount: 0, count: 0, generic };
    pl.amount += t.amount;
    pl.count++;
    places.set(k, pl);
  }
  const placeList = [...places.values()]
    .map((x) => ({ ...x, amount: r2(x.amount) }))
    .sort((a, b) => Number(a.generic) - Number(b.generic) || b.count - a.count || b.amount - a.amount)
    .slice(0, 3);

  const biggest = realDebits
    .filter((t) => !t.recurringId && !t.debtId && !t.iouId)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((t) => ({ title: t.title.trim() || subName(t.subcategory), amount: t.amount, date: t.date, categoryId: t.categoryId }));

  const habitMap = new Map<string, Habit>();
  for (const t of realDebits) {
    if (t.recurringId) continue;
    const k = `${t.categoryId}|${t.subcategory}`;
    const h = habitMap.get(k) ?? { subcategory: t.subcategory, categoryId: t.categoryId, count: 0, amount: 0 };
    h.count++;
    h.amount += t.amount;
    habitMap.set(k, h);
  }
  const habits = [...habitMap.values()].map((h) => ({ ...h, amount: r2(h.amount) })).sort((a, b) => b.count - a.count).slice(0, 4);

  // Weekday averages
  const wdSum = new Array<number>(7).fill(0);
  const wdN = new Array<number>(7).fill(0);
  for (let i = 0; i < daysCounted; i++) {
    const w = weekdayOf(addDays(p.from, i));
    wdSum[w] += daily[i];
    wdN[w]++;
  }
  const weekday = wdSum.map((s, i) => (wdN[i] ? r2(s / wdN[i]) : 0));

  // Months (year report)
  const months: Report['months'] = [];
  if (kind === 'year') {
    const byMonth = new Map<string, { income: number; spend: number }>();
    for (const t of all) {
      const mk = t.date.slice(0, 7);
      const m = byMonth.get(mk) ?? { income: 0, spend: 0 };
      if (t.type === 'credit') m.income += t.amount;
      else m.spend += t.amount;
      byMonth.set(mk, m);
    }
    for (let m = 1; m <= 12; m++) {
      const mk = `${key}-${String(m).padStart(2, '0')}`;
      const v = byMonth.get(mk) ?? { income: 0, spend: 0 };
      months.push({ key: mk, income: r2(v.income), spend: r2(v.spend) });
    }
  }

  // Subscriptions: anything in the Subscriptions category, grouped by its recurring rule or its name
  const subMap = new Map<string, { title: string; total: number; n: number }>();
  for (const t of realDebits) {
    if (t.categoryId !== 'subscriptions') continue;
    const k = t.recurringId ?? (t.title.trim() || t.subcategory).toLowerCase();
    const s = subMap.get(k) ?? { title: t.title.trim() || subName(t.subcategory), total: 0, n: 0 };
    s.total += t.amount;
    s.n++;
    subMap.set(k, s);
  }
  const subscriptions = [...subMap.values()]
    .map((s) => ({ title: s.title, total: r2(s.total), perMonth: r2(s.total / s.n) }))
    .sort((a, b) => b.total - a.total);

  // Budgets (month report): every category with a limit
  const budgets: BudgetLine[] =
    kind === 'month'
      ? inp.limits
          .filter((l) => l.limit > 0)
          .map((l) => {
            const spent = r2(byCat.get(l.categoryId)?.amount ?? 0);
            return { categoryId: l.categoryId, spent, limit: l.limit, pct: Math.round((spent / l.limit) * 100) };
          })
          .sort((a, b) => b.pct - a.pct)
      : [];

  // Goals
  const goals: GoalLine[] = inp.goals
    .filter((g) => !g.paused)
    .map((g) => {
      const pr = goalProgress(g, inp.goalEntries, p.end);
      const inPeriod = r2(inp.goalEntries.filter((e) => e.goalId === g.id && inRange(e.date, p.from, p.end)).reduce((s, e) => s + e.amount, 0));
      return { id: g.id, name: g.name, percent: Math.round(pr.percent), saved: pr.saved, target: g.target, inPeriod, done: pr.status === 'done' };
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3);

  // Debts paid in the period
  let debtPaid = 0;
  const debtsCleared: string[] = [];
  for (const d of inp.debts) {
    for (const s of d.schedule) if (s.paid && inRange(s.paid.date, p.from, p.end)) debtPaid += s.paid.amount;
    if (d.settled && inRange(d.settled.date, p.from, p.end)) debtPaid += d.settled.amount;
    const lastPaid = d.settled?.date ?? d.schedule.reduce((m, s) => (s.paid && s.paid.date > m ? s.paid.date : m), '');
    if (d.status === 'done' && lastPaid && inRange(lastPaid, p.from, p.end)) debtsCleared.push(d.name);
  }
  debtPaid = r2(debtPaid);

  // Personality: the first rule that fits
  const weekendSpend = daily.reduce((s, v, i) => (weekdayOf(addDays(p.from, i)) >= 5 ? s + v : s), 0);
  const foodShare = categories.filter((c) => categoryOf(c.id)?.isFood).reduce((s, c) => s + c.share, 0);
  let lateSpend = 0;
  for (const t of debits) {
    const r = cycleRange(cycleOf(t.date));
    if (daysBetween(t.date, r.to) < 7) lateSpend += t.amount;
  }
  const personality: Personality =
    rate !== null && rate < 0
      ? 'generous'
      : rate !== null && rate >= 40
        ? 'saver'
        : spend > 0 && weekendSpend / spend > 0.42
          ? 'weekend'
          : foodShare > 0.3
            ? 'foodie'
            : spend > 0 && lateSpend / spend > 0.35
              ? 'monthEnd'
              : real.length / Math.max(1, daysCounted) >= 2.5
                ? 'recorder'
                : 'balanced';

  // Moments of the year
  const moments: Moment[] = [];
  if (kind === 'year') {
    const first = [...real].sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (first) moments.push({ date: first.date, kind: 'first', label: first.title.trim() || subName(first.subcategory), amount: first.amount });
    const bestIncome = [...months].sort((a, b) => b.income - a.income)[0];
    const avgIncome = months.filter((m) => m.income > 0).reduce((s, m, _i, arr) => s + m.income / arr.length, 0);
    if (bestIncome && avgIncome > 0 && bestIncome.income > avgIncome * 1.25) moments.push({ date: `${bestIncome.key}-15`, kind: 'bonus', label: '', amount: bestIncome.income });
    if (biggest[0]) moments.push({ date: biggest[0].date, kind: 'big', label: biggest[0].title, amount: biggest[0].amount });
    for (const d of inp.debts) {
      const lastPaid = d.settled?.date ?? d.schedule.reduce((m, s) => (s.paid && s.paid.date > m ? s.paid.date : m), '');
      if (d.status === 'done' && lastPaid && inRange(lastPaid, p.from, p.end)) moments.push({ date: lastPaid, kind: 'debt', label: d.name });
    }
    for (const g of inp.goals) if (inRange(g.createdAt, p.from, p.end)) moments.push({ date: g.createdAt, kind: 'goalNew', label: g.name });
    const bestSave = [...months].filter((m) => m.income > 0).sort((a, b) => b.income - b.spend - (a.income - a.spend))[0];
    if (bestSave && bestSave.income - bestSave.spend > 0) moments.push({ date: `${bestSave.key}-28`, kind: 'bestSave', label: '', amount: r2(bestSave.income - bestSave.spend) });
    moments.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  // Badges
  const monthsInBudget = kind === 'year' && inp.limits.some((l) => l.limit > 0)
    ? months.filter((m) => {
        const total = inp.limits.reduce((s, l) => s + l.limit, 0);
        return m.spend > 0 && m.spend <= total;
      }).length
    : 0;
  const badges: Badge[] = [
    { id: 'streak30', got: longestStreak >= 30 },
    { id: 'budget6', got: monthsInBudget >= 6 },
    { id: 'goalDone', got: goals.some((g) => g.done) },
    { id: 'debtFree1', got: debtsCleared.length > 0 },
    { id: 'save40', got: rate !== null && rate >= 40 },
    { id: 'noSpend100', got: noSpendDays >= 100 },
    { id: 'streak365', got: longestStreak >= 365 },
    { id: 'saved50k', got: net >= 50000 },
    { id: 'noDebt', got: inp.debts.every((d) => d.status === 'done') && inp.debts.length > 0 }
  ];

  // Projection (year): today's savings plus another twelve average months
  let projection: number | null = null;
  if (kind === 'year') {
    const counted = months.filter((m) => m.key <= todayKey.slice(0, 7) && (m.income > 0 || m.spend > 0));
    if (counted.length >= 3) {
      const avg = counted.reduce((s, m) => s + (m.income - m.spend), 0) / counted.length;
      projection = avg > 0 ? r2(net + avg * 12) : null;
    }
  }

  // Grade (week): five simple checks
  const weeklyBudget = inp.limits.reduce((s, l) => s + l.limit, 0) / 4.345;
  let points = 0;
  if (pSpend > 0 && spend < pSpend) points++;
  if (real.length >= 7) points++;
  if (noSpendDays >= 1) points++;
  if (weeklyBudget > 0 ? spend <= weeklyBudget : rate !== null && rate >= inp.savingsTarget) points++;
  if (longestStreak >= Math.min(7, daysCounted)) points++;
  const grade = ['C', 'C+', 'B', 'B+', 'A-', 'A'][points];

  return {
    period: p,
    income,
    spend,
    net,
    rate,
    records: real.length,
    activeDays: recordDays.size,
    daysCounted,
    daily,
    recorded,
    prev: { income: pIncome, spend: pSpend, net: r2(pIncome - pSpend), label: kind },
    spendChange: pct(spend, pSpend),
    categories,
    incomeBy,
    biggestRise,
    biggestFall,
    places: placeList,
    biggest,
    habits,
    longestStreak,
    currentStreak,
    noSpendDays,
    priciestDay,
    weekday,
    months,
    subscriptions,
    budgets,
    goals,
    debtPaid,
    debtsCleared,
    personality,
    moments: moments.slice(0, 6),
    badges,
    projection,
    grade
  };
}

/** Minimum records before a report opens, so an empty week never looks like a failure. */
export const MIN_RECORDS: Record<ReportKind, number> = { week: 5, month: 15, year: 60 };
