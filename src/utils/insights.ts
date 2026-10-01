import type { Transaction } from '@/context/TransactionsContext';

/**
 * Pure analysis helpers for the Faham tab.
 *
 * Only real transactions are analysed. Transfers between accounts are a separate entity and
 * "Confirm each time" recurring entries only become transactions once confirmed, so neither can
 * distort income, spending or savings here.
 *
 * Everything works on 'YYYY-MM-DD' strings so results never depend on the device time zone.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

function parse(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m: m - 1, d };
}

/** Shift a date by whole months, clamping the day (31 Mar - 1 month = 28/29 Feb). */
export function shiftMonths(dateKey: string, months: number): string {
  const { y, m, d } = parse(dateKey);
  const total = y * 12 + m + months;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return keyOf(ny, nm, Math.min(d, daysIn(ny, nm)));
}

/** 'YYYY-MM' keys of the `count` months ending at the month of `todayKey`, oldest first. */
export function monthKeysEnding(todayKey: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(shiftMonths(todayKey, -i).slice(0, 7));
  return out;
}

export type Window = { from: string; to: string };

/** The last `months` calendar months, up to and including today. */
export function currentWindow(todayKey: string, months: number): Window {
  return { from: `${monthKeysEnding(todayKey, months)[0]}-01`, to: todayKey };
}

/** The same-length window immediately before, ending the same number of months earlier (like-for-like). */
export function previousWindow(w: Window, months: number): Window {
  return { from: shiftMonths(w.from, -months), to: shiftMonths(w.to, -months) };
}

const inWindow = (t: Transaction, w: Window) => t.date >= w.from && t.date <= w.to;

export type MonthTotals = { key: string; income: number; spending: number; net: number };

export function monthlyTotals(transactions: Transaction[], keys: string[]): MonthTotals[] {
  const map = new Map<string, MonthTotals>(keys.map((key) => [key, { key, income: 0, spending: 0, net: 0 }]));
  for (const t of transactions) {
    const row = map.get(t.date.slice(0, 7));
    if (!row) continue;
    if (t.type === 'credit') row.income += t.amount;
    else row.spending += t.amount;
  }
  return keys.map((k) => {
    const row = map.get(k)!;
    row.income = round2(row.income);
    row.spending = round2(row.spending);
    row.net = round2(row.income - row.spending);
    return row;
  });
}

export type Summary = {
  income: number;
  spending: number;
  net: number;
  /** Share of income kept, 0-100 (can be negative). null when there is no income to compare with. */
  savingsRate: number | null;
};

export function windowSummary(transactions: Transaction[], w: Window): Summary {
  let income = 0;
  let spending = 0;
  for (const t of transactions) {
    if (!inWindow(t, w)) continue;
    if (t.type === 'credit') income += t.amount;
    else spending += t.amount;
  }
  income = round2(income);
  spending = round2(spending);
  const net = round2(income - spending);
  return { income, spending, net, savingsRate: income > 0 ? Math.round((net / income) * 100) : null };
}

/** Percent change from `before` to `now`; null when there is nothing to compare against. */
export function pctChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export type SubRow = { name: string; total: number };
export type CategoryRow = {
  categoryId: string;
  total: number;
  /** 0-100, share of all spending in the window. */
  share: number;
  previous: number;
  /** null = no spending in the previous window ("new"). */
  change: number | null;
  subs: SubRow[];
};

/** Spending per category in a window, biggest first, compared with the previous window. */
export function categoryTrends(transactions: Transaction[], w: Window, prev: Window): CategoryRow[] {
  const totals = new Map<string, number>();
  const subs = new Map<string, Map<string, number>>();
  const before = new Map<string, number>();
  let all = 0;

  for (const t of transactions) {
    if (t.type !== 'debit') continue;
    if (inWindow(t, w)) {
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
      all += t.amount;
      const name = t.subcategory?.trim() || 'Other';
      const m = subs.get(t.categoryId) ?? new Map<string, number>();
      m.set(name, (m.get(name) ?? 0) + t.amount);
      subs.set(t.categoryId, m);
    } else if (inWindow(t, prev)) {
      before.set(t.categoryId, (before.get(t.categoryId) ?? 0) + t.amount);
    }
  }

  return Array.from(totals.entries())
    .map(([categoryId, total]) => ({
      categoryId,
      total: round2(total),
      share: all > 0 ? Math.round((total / all) * 100) : 0,
      previous: round2(before.get(categoryId) ?? 0),
      change: pctChange(total, before.get(categoryId) ?? 0),
      subs: Array.from(subs.get(categoryId)?.entries() ?? [])
        .map(([name, v]) => ({ name, total: round2(v) }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

export type WeekdayRow = {
  /** 0 = Monday ... 6 = Sunday */
  day: number;
  total: number;
  /** Average spend on this weekday: total / how many such days fell in the window. */
  average: number;
};

const mondayFirst = (jsDay: number) => (jsDay + 6) % 7;

/** How much is spent on each weekday, averaged per occurrence so short/long windows compare fairly. */
export function weekdayPattern(transactions: Transaction[], w: Window): WeekdayRow[] {
  const totals = new Array<number>(7).fill(0);
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    const p = parse(t.date);
    totals[mondayFirst(new Date(p.y, p.m, p.d).getDay())] += t.amount;
  }

  const counts = new Array<number>(7).fill(0);
  const a = parse(w.from);
  const b = parse(w.to);
  const cursor = new Date(a.y, a.m, a.d);
  const end = new Date(b.y, b.m, b.d);
  while (cursor <= end) {
    counts[mondayFirst(cursor.getDay())] += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return totals.map((total, day) => ({
    day,
    total: round2(total),
    average: counts[day] > 0 ? round2(total / counts[day]) : 0,
  }));
}

export function biggestExpense(transactions: Transaction[], w: Window): Transaction | null {
  let best: Transaction | null = null;
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    if (!best || t.amount > best.amount) best = t;
  }
  return best;
}

export type TitleRow = { title: string; total: number; count: number };

/** Where the money goes by name (same title, ignoring case and spaces, is grouped). */
export function topTitles(transactions: Transaction[], w: Window, limit = 5): TitleRow[] {
  const map = new Map<string, TitleRow>();
  for (const t of transactions) {
    if (t.type !== 'debit' || !inWindow(t, w)) continue;
    const label = t.title.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const row = map.get(key) ?? { title: label, total: 0, count: 0 };
    row.total += t.amount;
    row.count += 1;
    map.set(key, row);
  }
  return Array.from(map.values())
    .map((r) => ({ ...r, total: round2(r.total) }))
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, limit);
}

export type Insight = { id: string; tone: 'good' | 'bad' | 'info'; text: string };

type InsightInput = {
  transactions: Transaction[];
  todayKey: string;
  months: number;
  categoryName: (id: string) => string;
  /** Formats money for the sentence, e.g. "RM 120.00". */
  money: (n: number) => string;
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const weekdayName = (day: number) => WEEKDAYS[day];

/**
 * A few plain-language observations. Deliberately conservative: nothing is said unless there is enough data
 * and the change is big enough to matter, so the list stays trustworthy instead of noisy.
 */
export function buildInsights({ transactions, todayKey, months, categoryName, money }: InsightInput): Insight[] {
  const out: Insight[] = [];
  const w = currentWindow(todayKey, months);
  const prev = previousWindow(w, months);
  const now = windowSummary(transactions, w);
  if (now.spending === 0 && now.income === 0) return out;

  // 1) Pace this month vs the same days last month.
  const mtd = currentWindow(todayKey, 1);
  const mtdPrev = previousWindow(mtd, 1);
  const spentNow = windowSummary(transactions, mtd).spending;
  const spentBefore = windowSummary(transactions, mtdPrev).spending;
  const pace = pctChange(spentNow, spentBefore);
  if (pace !== null && spentBefore >= 50 && Math.abs(pace) >= 10) {
    out.push({
      id: 'pace',
      tone: pace > 0 ? 'bad' : 'good',
      text:
        pace > 0
          ? `You have spent ${pace}% more this month than by the same day last month.`
          : `You have spent ${Math.abs(pace)}% less this month than by the same day last month.`,
    });
  }

  // 2) Savings rate.
  if (now.savingsRate !== null) {
    if (now.savingsRate >= 20) {
      out.push({ id: 'save', tone: 'good', text: `You kept ${now.savingsRate}% of your income (${money(now.net)}) over this period.` });
    } else if (now.savingsRate < 0) {
      out.push({ id: 'save', tone: 'bad', text: `You spent ${money(-now.net)} more than you earned over this period.` });
    } else {
      out.push({ id: 'save', tone: 'info', text: `You kept ${now.savingsRate}% of your income over this period.` });
    }
  }

  // 3) Biggest category mover vs the previous window.
  const cats = categoryTrends(transactions, w, prev);
  const movers = cats
    .filter((c) => c.change !== null && c.previous >= 50 && Math.abs(c.total - c.previous) >= 30 && Math.abs(c.change!) >= 20)
    .sort((a, b) => Math.abs(b.total - b.previous) - Math.abs(a.total - a.previous));
  if (movers[0]) {
    const c = movers[0];
    const up = c.total > c.previous;
    out.push({
      id: 'mover',
      tone: up ? 'bad' : 'good',
      text: `${categoryName(c.categoryId)} is ${up ? 'up' : 'down'} ${Math.abs(c.change!)}% compared with the previous ${months === 1 ? 'month' : `${months} months`}.`,
    });
  }

  // 4) Where most of the money goes.
  if (cats[0] && cats[0].share >= 30) {
    out.push({ id: 'top', tone: 'info', text: `${categoryName(cats[0].categoryId)} takes ${cats[0].share}% of your spending.` });
  }

  // 5) Priciest weekday (needs a few weeks of data so one big purchase does not decide it).
  const days = weekdayPattern(transactions, w);
  const busiest = [...days].sort((a, b) => b.average - a.average)[0];
  const daysCovered = Math.round((Date.parse(`${w.to}T00:00:00Z`) - Date.parse(`${w.from}T00:00:00Z`)) / 86400000) + 1;
  if (busiest && busiest.average > 0 && daysCovered >= 28) {
    out.push({ id: 'weekday', tone: 'info', text: `${weekdayName(busiest.day)} is your priciest day, about ${money(busiest.average)} on average.` });
  }

  return out;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
