import { t } from '@/i18n';
import type { Transaction } from '@/context/TransactionsContext';
import { cycleInfo, cycleOf, cycleRange, sameDayInCycle, shiftCycle } from '@/utils/cycle';
import { monthKeysEnding } from '@/utils/insights';
import { p1, r1 } from '@/utils/percent';

/**
 * The Insight tab: DATA -> ANALYSIS -> INSIGHT -> ACTION.
 * Everything here is plain arithmetic on the user's own records, so each line can be explained and checked.
 * Nothing is said unless there is enough data, so the feed stays short and trustworthy.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');

export type FeedTone = 'good' | 'warn' | 'bad' | 'info';
export type FeedItem = { id: string; tone: FeedTone; title: string; body: string; action?: string };

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
  /** Money in savings accounts. */
  savingsBalance: number;
  goals: GoalFacts[];
};

type MonthRow = { key: string; income: number; spending: number };

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
function trimmed(rows: MonthRow[]) {
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

function dayOf(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}

export function buildFeed(inp: FeedInput): FeedItem[] {
  const { transactions, todayKey, categoryName, money, fixedMonthly, debtMonthly, budget, savingsBalance, goals } = inp;
  const out: FeedItem[] = [];
  const info = cycleInfo(todayKey);
  const monthKey = info.key;
  const complete = trimmed(monthRows(transactions, monthKeysEnding(todayKey, 7).slice(0, -1)));
  if (complete.length === 0 && !transactions.some((x) => cycleOf(x.date) === monthKey)) return out;

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
    });
  } else if (last !== null && complete.length >= 2) {
    const prev = rates[rates.length - 2];
    if (last < 0) {
      out.push({ id: 'rate', tone: 'bad', title: t('fc.feed.rateNeg.title'), body: t('fc.feed.rateNeg.body'), action: t('fc.feed.rateNeg.action') });
    } else if (prev !== null && last < prev - 5) {
      out.push({ id: 'rate', tone: 'warn', title: t('fc.feed.rateDown.title'), body: t('fc.feed.rateDown.body', { from: p1(prev), to: p1(last) }), action: t('fc.feed.rateDown.action') });
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
    });
  } else if (prevTotal >= 100 && prevTotal - nowTotal >= 50 && (prevTotal - nowTotal) / prevTotal >= 0.1) {
    out.push({ id: 'why', tone: 'good', title: t('fc.feed.less.title', { amount: money(prevTotal - nowTotal) }), body: t('fc.feed.less.body') });
  }

  // 3) Weekends against weekdays, last 3 months.
  const from3 = cycleRange(shiftCycle(monthKey, -3)).from;
  let wkDays = 0;
  let weDays = 0;
  let wkSpend = 0;
  let weSpend = 0;
  const spendByDay = new Map<string, number>();
  for (const x of transactions) if (x.type === 'debit' && x.date >= from3 && x.date <= todayKey) spendByDay.set(x.date, (spendByDay.get(x.date) ?? 0) + x.amount);
  {
    const [fy, fm, fd] = from3.split('-').map(Number);
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const start = Date.UTC(fy, fm - 1, fd);
    const end = Date.UTC(ty, tm - 1, td);
    for (let ms = start; ms <= end; ms += 86400000) {
      const d = new Date(ms);
      const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      const wd = dayOf(key);
      const v = spendByDay.get(key) ?? 0;
      if (wd === 0 || wd === 6) {
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
      });
    }
  }

  // 7) Emergency cushion in savings accounts.
  const spendAvg = complete.length ? complete.slice(-3).reduce((s, r) => s + r.spending, 0) / Math.min(3, complete.length) : 0;
  if (spendAvg > 0 && savingsBalance > 0) {
    const runway = savingsBalance / spendAvg;
    if (runway < 3) {
      out.push({
        id: 'runway',
        tone: 'warn',
        title: t('fc.feed.runwayLow.title', { n: (Math.round(runway * 10) / 10).toString() }),
        body: t('fc.feed.runwayLow.body', { target: money(spendAvg * 3) }),
        action: t('fc.feed.runwayLow.action', { gap: money(spendAvg * 3 - savingsBalance) }),
      });
    } else if (runway >= 6) {
      out.push({ id: 'runway', tone: 'good', title: t('fc.feed.runwayGood.title', { n: Math.floor(runway) }), body: t('fc.feed.runwayGood.body') });
    }
  }

  // 8) Budget risk this month.
  if (budget > 0 && day >= 7) {
    const daysIn = info.length;
    const projected = (nowTotal / day) * daysIn;
    if (projected > budget * 1.05) {
      out.push({
        id: 'budget',
        tone: 'bad',
        title: t('fc.feed.budget.title', { amount: money(projected - budget) }),
        body: t('fc.feed.budget.body', { projected: money(projected), budget: money(budget) }),
        action: t('fc.feed.budget.action', { perDay: money(Math.max(0, (budget - nowTotal) / Math.max(1, daysIn - day))) }),
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
      });
    });

  /* ---- 10 to 20: more everyday findings (2.1.0) ---- */
  const from30 = daysBack(todayKey, 29);
  const last30 = transactions.filter((x) => x.type === 'debit' && x.date >= from30 && x.date <= todayKey);
  const spend30 = last30.reduce((s, x) => s + x.amount, 0);
  const lastRow = complete[complete.length - 1];

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
      out.push({ id: 'topcat', tone: 'info', title: t('fc.feed.topcat.title', { category: categoryName(top[0]), share: p1((top[1] / lastRow.spending) * 100) }), body: t('fc.feed.topcat.body', { amount: money(top[1]) }) });
    }
    const drop = [...before.entries()]
      .map(([id, b]) => ({ id, b, a: last.get(id) ?? 0 }))
      .filter((d) => d.b >= 50 && d.b - d.a >= 30 && (d.b - d.a) / d.b >= 0.2)
      .sort((x, y) => y.b - y.a - (x.b - x.a))[0];
    if (drop) {
      out.push({ id: 'improved', tone: 'good', title: t('fc.feed.improved.title', { category: categoryName(drop.id), amount: money(drop.b - drop.a) }), body: t('fc.feed.improved.body', { before: money(drop.b), after: money(drop.a) }) });
    }
    if (subsTotal >= 30) {
      out.push({ id: 'subs', tone: 'info', title: t('fc.feed.subs.title', { amount: money(subsTotal) }), body: t('fc.feed.subs.body', { n: subsCount, year: money(subsTotal * 12) }), action: t('fc.feed.subs.action') });
    }
  }

  // 16) Days without spending this month.
  if (day >= 5) {
    const spentDays = new Set(transactions.filter((x) => x.type === 'debit' && cycleOf(x.date) === monthKey && x.date < todayKey).map((x) => x.date));
    const free = day - 1 - spentDays.size;
    if (free >= 3) out.push({ id: 'nospend', tone: 'good', title: t('fc.feed.nospend.title', { n: free }), body: t('fc.feed.nospend.body') });
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
        out.push({ id: 'payday', tone: 'warn', title: t('fc.feed.payday.title', { share: p1(share) }), body: t('fc.feed.payday.body', { amount: money(week), pay: money(pay.amount) }), action: t('fc.feed.payday.action') });
      }
    }
  }

  // 18) Income higher or lower than usual.
  if (complete.length >= 3 && lastRow && lastRow.income > 0) {
    const prevRows = complete.slice(-4, -1).filter((r) => r.income > 0);
    const usual = prevRows.length ? prevRows.reduce((s, r) => s + r.income, 0) / prevRows.length : 0;
    if (usual > 0) {
      const change = r1((lastRow.income / usual - 1) * 100);
      if (change <= -15) out.push({ id: 'income', tone: 'warn', title: t('fc.feed.incomeDown.title', { pct: p1(-change) }), body: t('fc.feed.income.body', { last: money(lastRow.income), usual: money(usual) }), action: t('fc.feed.incomeDown.action') });
      else if (change >= 15) out.push({ id: 'income', tone: 'good', title: t('fc.feed.incomeUp.title', { pct: p1(change) }), body: t('fc.feed.income.body', { last: money(lastRow.income), usual: money(usual) }), action: t('fc.feed.incomeUp.action', { amount: money((lastRow.income - usual) / 2) }) });
    }
  }

  // 20) One purchase that dominates the last 30 days.
  if (spend30 >= 200) {
    const big = [...last30].sort((a, b) => b.amount - a.amount)[0];
    if (big && big.amount / spend30 >= 0.25) {
      out.push({ id: 'bigone', tone: 'info', title: t('fc.feed.bigone.title', { share: p1((big.amount / spend30) * 100) }), body: t('fc.feed.bigone.body', { title: big.title || categoryName(big.categoryId), amount: money(big.amount) }) });
    }
  }

  void debtMonthly;
  // Most pressing first: problems, then warnings, then wins, then plain facts.
  const rank: Record<FeedTone, number> = { bad: 0, warn: 1, good: 2, info: 3 };
  return out.map((o, i) => ({ o, i })).sort((a, b) => rank[a.o.tone] - rank[b.o.tone] || a.i - b.i).map((x) => x.o);
}

/* ---------------- WaKira score ---------------- */

export type ScoreFactor = { id: 'saving' | 'budget' | 'stable' | 'debt' | 'cushion'; points: number; max: 20 };
export type Score = { total: number; factors: ScoreFactor[]; grade: 'great' | 'good' | 'fair' | 'low'; weakest: ScoreFactor['id'] | null };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A simple indicator made by WaKira, out of 100. It is not a credit score or financial advice.
 * Factors without enough data are left out and the rest are scaled up, so a new user is not marked down for missing data.
 */
export const DEFAULT_SAVINGS_TARGET = 20;
/** Keeps a saved target inside a sensible range so the score never divides by zero. */
export const clampTarget = (n: number) => Math.min(60, Math.max(5, Math.round(Number.isFinite(n) ? n : DEFAULT_SAVINGS_TARGET)));

export function wakiraScore(inp: { transactions: Transaction[]; todayKey: string; budget: number; debtMonthly: number | null; savingsBalance: number; fixedMonthly: number; savingsTarget?: number }): Score | null {
  const { transactions, todayKey, budget, debtMonthly, savingsBalance } = inp;
  const target = clampTarget(inp.savingsTarget ?? DEFAULT_SAVINGS_TARGET) / 100;
  const rows = trimmed(monthRows(transactions, monthKeysEnding(todayKey, 7).slice(0, -1)));
  if (rows.length < 2) return null;
  const recent = rows.slice(-3);
  const factors: ScoreFactor[] = [];

  const inc = recent.reduce((s, r) => s + r.income, 0);
  const sp = recent.reduce((s, r) => s + r.spending, 0);
  if (inc > 0) factors.push({ id: 'saving', points: round2(clamp(((inc - sp) / inc / target) * 20, 0, 20)), max: 20 });

  if (budget > 0) {
    const ok = recent.filter((r) => r.spending <= budget).length;
    factors.push({ id: 'budget', points: round2((ok / recent.length) * 20), max: 20 });
  }

  if (rows.length >= 3) {
    const vals = rows.slice(-6).map((r) => r.spending);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (mean > 0) {
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      factors.push({ id: 'stable', points: round2(clamp(20 - ((sd / mean - 0.1) / 0.4) * 20, 0, 20)), max: 20 });
    }
  }

  if (inc > 0) {
    const ratio = debtMonthly === null ? 0 : debtMonthly / (inc / recent.length);
    factors.push({ id: 'debt', points: round2(clamp(20 - ((ratio - 0.1) / 0.3) * 20, 0, 20)), max: 20 });
  }

  const avgSpend = sp / recent.length;
  if (avgSpend > 0) factors.push({ id: 'cushion', points: round2(clamp((savingsBalance / avgSpend / 6) * 20, 0, 20)), max: 20 });

  if (factors.length < 2) return null;
  const total = Math.round((factors.reduce((s, f) => s + f.points, 0) / (factors.length * 20)) * 100);
  const weakest = [...factors].sort((a, b) => a.points - b.points)[0]?.id ?? null;
  const grade = total >= 80 ? 'great' : total >= 60 ? 'good' : total >= 40 ? 'fair' : 'low';
  return { total, factors, grade, weakest };
}

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
