import type { Transaction, Transfer } from '@/context/TransactionsContext';
import { addDays, cycleInfo, cycleOf, cycleRange, dayInCycle, daysBetween, shiftCycle } from '@/utils/cycle';

/**
 * Pure helpers for the "Deep dive" tab of Faham. Same rules as insights.ts: only real transactions count
 * (transfers are a separate thing and never appear here), and everything works on 'YYYY-MM-DD' strings so
 * results never depend on the device time zone.
 */

export type Window = { from: string; to: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const inWindow = (t: Transaction, w: Window) => t.date >= w.from && t.date <= w.to;
const mondayFirst = (jsDay: number) => (jsDay + 6) % 7;
const DAY = 86400000;
const dayNo = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** First day with any real transaction inside the window (so a new user is not judged on months before they started). */
function firstActiveDate(transactions: Transaction[], w: Window): string | null {
  let first: string | null = null;
  for (const t of transactions) if (inWindow(t, w) && (first === null || t.date < first)) first = t.date;
  return first;
}

/** Month keys of the window that fall on or after the first transaction. */
export function activeMonthKeys(transactions: Transaction[], w: Window, keys: string[]): string[] {
  const first = firstActiveDate(transactions, w);
  if (!first) return [];
  return keys.filter((k) => k >= cycleOf(first));
}

/* ---------------- 1. month-end outlook ---------------- */

export type Outlook = {
  monthKey: string;
  dayOfMonth: number;
  daysInMonth: number;
  daysLeft: number;
  spentSoFar: number;
  incomeSoFar: number;
  /** Recurring bills that are still to come this month. */
  billsAhead: number;
  /** Average of the everyday (non-recurring) spending per day so far. */
  dailyEveryday: number;
  projected: number;
  lastMonthTotal: number;
  /** Total of the category budgets; 0 when none is set. */
  budget: number;
  /** false while the month is too young for a trustworthy guess. */
  reliable: boolean;
};

export function monthOutlook(transactions: Transaction[], todayKey: string, billsAhead: number, budget: number): Outlook {
  const info = cycleInfo(todayKey);
  const monthKey = info.key;
  const prevKey = shiftCycle(monthKey, -1);
  const daysInMonth = info.length;
  const dayOfMonth = info.dayIndex;
  let spent = 0;
  let everyday = 0;
  let income = 0;
  let last = 0;
  let count = 0;
  for (const t of transactions) {
    const key = cycleOf(t.date);
    if (key === monthKey && t.date <= todayKey) {
      if (t.type === 'debit') {
        spent += t.amount;
        count++;
        if (!t.recurringId) everyday += t.amount;
      } else income += t.amount;
    } else if (key === prevKey && t.type === 'debit') last += t.amount;
  }
  const daysLeft = info.daysAfterToday;
  const dailyEveryday = dayOfMonth > 0 ? everyday / dayOfMonth : 0;
  return {
    monthKey,
    dayOfMonth,
    daysInMonth,
    daysLeft,
    spentSoFar: round2(spent),
    incomeSoFar: round2(income),
    billsAhead: round2(billsAhead),
    dailyEveryday: round2(dailyEveryday),
    projected: round2(spent + billsAhead + dailyEveryday * daysLeft),
    lastMonthTotal: round2(last),
    budget: round2(budget),
    reliable: dayOfMonth >= 5 && count >= 5,
  };
}

/* ---------------- 2. calendar heat map ---------------- */

export type CalendarDay = { date: string; day: number; total: number; count: number; income: number };
export type Calendar = { monthKey: string; /** 0 = Monday */ startOffset: number; days: CalendarDay[]; max: number; total: number };

export function monthCalendar(transactions: Transaction[], monthKey: string): Calendar {
  const range = cycleRange(monthKey);
  const n = daysBetween(range.from, range.to) + 1;
  const days: CalendarDay[] = Array.from({ length: n }, (_, i) => {
    const date = addDays(range.from, i);
    return { date, day: Number(date.slice(8, 10)), total: 0, count: 0, income: 0 };
  });
  for (const t of transactions) {
    if (cycleOf(t.date) !== monthKey) continue;
    const d = days[daysBetween(range.from, t.date)];
    if (!d) continue;
    if (t.type === 'debit') {
      d.total += t.amount;
      d.count++;
    } else d.income += t.amount;
  }
  for (const d of days) {
    d.total = round2(d.total);
    d.income = round2(d.income);
  }
  return {
    monthKey,
    startOffset: mondayFirst(new Date(Number(range.from.slice(0, 4)), Number(range.from.slice(5, 7)) - 1, Number(range.from.slice(8, 10))).getDay()),
    days,
    max: Math.max(0, ...days.map((d) => d.total)),
    total: round2(days.reduce((s, d) => s + d.total, 0)),
  };
}

/* ---------------- 3. fixed vs everyday ---------------- */

export type FixedSplit = { fixed: number; everyday: number; fixedShare: number };

/** "Fixed" = created by a recurring rule (rent, subscriptions). Everything else is everyday spending. */
export function fixedVsEveryday(transactions: Transaction[], w: Window): FixedSplit {
  let fixed = 0;
  let everyday = 0;
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    if (t.recurringId) fixed += t.amount;
    else everyday += t.amount;
  }
  const all = fixed + everyday;
  return { fixed: round2(fixed), everyday: round2(everyday), fixedShare: all > 0 ? Math.round((fixed / all) * 100) : 0 };
}

/* ---------------- 4. income sources ---------------- */

export type IncomeSource = { categoryId: string; total: number; share: number };
export type IncomeStats = {
  sources: IncomeSource[];
  total: number;
  /** Average per month, counted from the first month with any record. */
  avgMonthly: number;
  monthsWithIncome: number;
  monthsCounted: number;
  best: { key: string; total: number } | null;
  /** How much monthly income swings: 'steady' (under 15%), 'some' (under 40%) or 'irregular'. null = not enough months. */
  steadiness: 'steady' | 'some' | 'irregular' | null;
};

export function incomeStats(transactions: Transaction[], w: Window, keys: string[]): IncomeStats {
  const byCat = new Map<string, number>();
  const byMonth = new Map<string, number>(keys.map((k) => [k, 0]));
  let total = 0;
  for (const t of transactions) {
    if (t.type !== 'credit' || !inWindow(t, w)) continue;
    byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount);
    byMonth.set(cycleOf(t.date), (byMonth.get(cycleOf(t.date)) ?? 0) + t.amount);
    total += t.amount;
  }
  const active = activeMonthKeys(transactions, w, keys);
  const monthly = active.map((k) => byMonth.get(k) ?? 0);
  const withIncome = monthly.filter((v) => v > 0);
  let best: IncomeStats['best'] = null;
  for (const k of active) {
    const v = byMonth.get(k) ?? 0;
    if (v > 0 && (!best || v > best.total)) best = { key: k, total: round2(v) };
  }
  // Judge steadiness on completed months only (the running month is still filling up).
  const complete = monthly.slice(0, -1).filter((v) => v > 0);
  let steadiness: IncomeStats['steadiness'] = null;
  if (complete.length >= 3) {
    const mean = complete.reduce((s, v) => s + v, 0) / complete.length;
    const sd = Math.sqrt(complete.reduce((s, v) => s + (v - mean) ** 2, 0) / complete.length);
    const cv = mean > 0 ? sd / mean : 0;
    steadiness = cv < 0.15 ? 'steady' : cv < 0.4 ? 'some' : 'irregular';
  }
  return {
    sources: Array.from(byCat.entries())
      .map(([categoryId, v]) => ({ categoryId, total: round2(v), share: total > 0 ? Math.round((v / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total),
    total: round2(total),
    avgMonthly: active.length ? round2(total / active.length) : 0,
    monthsWithIncome: withIncome.length,
    monthsCounted: active.length,
    best,
    steadiness,
  };
}

/* ---------------- 5. top subcategories ---------------- */

export type SubSpend = { categoryId: string; name: string; total: number; count: number; share: number };

export function topSubcategories(transactions: Transaction[], w: Window, limit = 8): SubSpend[] {
  const map = new Map<string, SubSpend>();
  let all = 0;
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    all += t.amount;
    const name = t.subcategory?.trim();
    if (!name) continue;
    const key = `${t.categoryId}|${name}`;
    const row = map.get(key) ?? { categoryId: t.categoryId, name, total: 0, count: 0, share: 0 };
    row.total += t.amount;
    row.count++;
    map.set(key, row);
  }
  return Array.from(map.values())
    .map((r) => ({ ...r, total: round2(r.total), share: all > 0 ? Math.round((r.total / all) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/* ---------------- 6. records & averages ---------------- */

export type Records = {
  avgMonthlySpending: number;
  avgDailySpending: number;
  highestMonth: { key: string; total: number } | null;
  lowestMonth: { key: string; total: number } | null;
  expenseCount: number;
  avgExpense: number;
  /** Days with no spending since the first record. */
  noSpendDays: number;
  daysCounted: number;
  longestNoSpendStreak: number;
  /** Days in a row without spending, counting back from today. */
  currentNoSpendStreak: number;
};

export function records(transactions: Transaction[], w: Window, keys: string[], todayKey: string): Records {
  const first = firstActiveDate(transactions, w);
  const spendDays = new Set<string>();
  const byMonth = new Map<string, number>();
  let total = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    spendDays.add(t.date);
    byMonth.set(cycleOf(t.date), (byMonth.get(cycleOf(t.date)) ?? 0) + t.amount);
    total += t.amount;
    count++;
  }
  const active = first ? keys.filter((k) => k >= cycleOf(first)) : [];
  let highest: Records['highestMonth'] = null;
  let lowest: Records['lowestMonth'] = null;
  // The running month is incomplete, so it never counts as the lowest.
  for (const k of active) {
    const v = round2(byMonth.get(k) ?? 0);
    if (v <= 0) continue;
    if (!highest || v > highest.total) highest = { key: k, total: v };
    if (k !== cycleOf(todayKey) && (!lowest || v < lowest.total)) lowest = { key: k, total: v };
  }
  let daysCounted = 0;
  let noSpend = 0;
  let longest = 0;
  let run = 0;
  if (first) {
    const end = dayNo(w.to);
    for (let d = dayNo(first); d <= end; d++) {
      daysCounted++;
      const key = new Date(d * DAY).toISOString().slice(0, 10);
      if (spendDays.has(key)) run = 0;
      else {
        noSpend++;
        run++;
        if (run > longest) longest = run;
      }
    }
  }
  return {
    avgMonthlySpending: active.length ? round2(total / active.length) : 0,
    avgDailySpending: daysCounted > 0 ? round2(total / daysCounted) : 0,
    highestMonth: highest,
    lowestMonth: lowest,
    expenseCount: count,
    avgExpense: count > 0 ? round2(total / count) : 0,
    noSpendDays: noSpend,
    daysCounted,
    longestNoSpendStreak: longest,
    currentNoSpendStreak: first ? run : 0,
  };
}

/* ---------------- 7. by account ---------------- */

export type AccountSpend = { accountId: string; total: number; share: number };

export function spendingByAccount(transactions: Transaction[], w: Window): AccountSpend[] {
  const map = new Map<string, number>();
  let all = 0;
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    map.set(t.accountId, (map.get(t.accountId) ?? 0) + t.amount);
    all += t.amount;
  }
  return Array.from(map.entries())
    .map(([accountId, v]) => ({ accountId, total: round2(v), share: all > 0 ? Math.round((v / all) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

/* ---------------- 8. budget history ---------------- */

export type BudgetRow = {
  categoryId: string;
  limit: number;
  monthsOver: number;
  monthsCounted: number;
  /** Average of spent / limit over the counted months, as a percentage. */
  avgUse: number;
  worst: { key: string; spent: number } | null;
};

/** How each budgeted category did month by month. The running month counts only once it is over budget. */
export function budgetHistory(transactions: Transaction[], limits: { categoryId: string; limit: number }[], w: Window, keys: string[], todayKey: string): BudgetRow[] {
  const active = activeMonthKeys(transactions, w, keys);
  const current = cycleOf(todayKey);
  const spent = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    const key = `${t.categoryId}|${cycleOf(t.date)}`;
    spent.set(key, (spent.get(key) ?? 0) + t.amount);
  }
  const rows: BudgetRow[] = [];
  for (const { categoryId, limit } of limits) {
    if (limit <= 0) continue;
    let over = 0;
    let counted = 0;
    let useSum = 0;
    let worst: BudgetRow['worst'] = null;
    for (const k of active) {
      const s = spent.get(`${categoryId}|${k}`) ?? 0;
      if (k === current && s <= limit) continue; // unfinished and still within budget: not a result yet
      counted++;
      useSum += s / limit;
      if (s > limit) over++;
      if (!worst || s > worst.spent) worst = { key: k, spent: round2(s) };
    }
    if (counted === 0) continue;
    rows.push({ categoryId, limit, monthsOver: over, monthsCounted: counted, avgUse: Math.round((useSum / counted) * 100), worst });
  }
  return rows.sort((a, b) => b.monthsOver / b.monthsCounted - a.monthsOver / a.monthsCounted || b.avgUse - a.avgUse);
}

/* ---------------- 9. unusual expenses ---------------- */

export type Unusual = { transaction: Transaction; typical: number; times: number };

/**
 * Expenses far above what is normal for their category: at least RM50, three times the category's median
 * and well above its spread. A category needs 6+ expenses before anything in it can be called unusual.
 */
export function unusualExpenses(transactions: Transaction[], w: Window, limit = 3): Unusual[] {
  const byCat = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    const list = byCat.get(t.categoryId) ?? [];
    list.push(t);
    byCat.set(t.categoryId, list);
  }
  const out: Unusual[] = [];
  for (const list of byCat.values()) {
    if (list.length < 6) continue;
    const amounts = list.map((t) => t.amount);
    const med = median(amounts);
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const sd = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
    for (const t of list) {
      if (t.amount >= 50 && med > 0 && t.amount >= med * 3 && t.amount >= mean + 2 * sd) {
        out.push({ transaction: t, typical: round2(med), times: Math.round((t.amount / med) * 10) / 10 });
      }
    }
  }
  return out.sort((a, b) => b.times - a.times).slice(0, limit);
}

/* ---------------- 10. rhythm of the month ---------------- */

export type Rhythm = { parts: { total: number; share: number }[] };

/** Spending in days 1-10, 11-20 and 21-end of the month: shows whether money goes out early or late. */
export function monthRhythm(transactions: Transaction[], w: Window): Rhythm {
  const totals = [0, 0, 0];
  let all = 0;
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    const d = dayInCycle(t.date) + 1;
    totals[d <= 10 ? 0 : d <= 20 ? 1 : 2] += t.amount;
    all += t.amount;
  }
  return { parts: totals.map((v) => ({ total: round2(v), share: all > 0 ? Math.round((v / all) * 100) : 0 })) };
}

/* ---------------- 11. balance over time ---------------- */

export type BalancePoint = { key: string; balance: number };

/**
 * Total money across all accounts at the end of each month. Transfers between accounts do not change the total,
 * so only the starting balances and the real income / spending matter.
 */
export function balanceTrend(
  transactions: Transaction[],
  startingTotal: number,
  keys: string[],
  todayKey: string,
  /** Internal debt accounts: their records are not part of your real money, but money crossing in or out of them is. */
  debt?: { hiddenIds: ReadonlySet<string>; transfers: Transfer[] },
): BalancePoint[] {
  return keys.map((k) => {
    const monthEnd = cycleRange(k).to;
    const until = monthEnd < todayKey ? monthEnd : todayKey;
    let sum = startingTotal;
    for (const t of transactions) {
      if (t.date > until || debt?.hiddenIds.has(t.accountId)) continue;
      sum += t.type === 'credit' ? t.amount : -t.amount;
    }
    if (debt) {
      for (const tr of debt.transfers) {
        if (tr.date > until) continue;
        const fromHidden = debt.hiddenIds.has(tr.fromAccountId);
        const toHidden = debt.hiddenIds.has(tr.toAccountId);
        if (fromHidden && !toHidden) sum += tr.amount;
        else if (!fromHidden && toHidden) sum -= tr.amount;
      }
    }
    return { key: k, balance: round2(sum) };
  });
}

/* ---------------- 12. one category over time ---------------- */

export function categoryByMonth(transactions: Transaction[], categoryId: string, keys: string[]): { key: string; total: number }[] {
  const map = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const t of transactions) {
    if (t.type !== 'debit' || t.categoryId !== categoryId) continue;
    const k = cycleOf(t.date);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + t.amount);
  }
  return keys.map((k) => ({ key: k, total: round2(map.get(k) ?? 0) }));
}
