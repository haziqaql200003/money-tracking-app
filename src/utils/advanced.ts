import type { RecurringRule, Transaction } from '@/context/TransactionsContext';
import { upcomingBills, type UpcomingBill } from '@/utils/bills';
import { addDays, cycleInfo, cycleOf, cycleRange, daysBetween, shiftCycle } from '@/utils/cycle';
import { essentialAverage, PREPARED_MONTHS } from '@/utils/health';
import { monthRows, trimmed } from '@/utils/insight-feed';
import { monthKeysEnding } from '@/utils/insights';
import { isEnded, isTransfer, monthlyEquivalent } from '@/utils/recurring';

/**
 * Faham's deeper checks (step 7). Pure functions over LEDGER entries and the user's own plans; every result says
 * what it rests on, and returns null (with the reason) when the data cannot support it.
 */

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const completeMonths = (entries: Transaction[], todayKey: string, n = 12) => trimmed(monthRows(entries, monthKeysEnding(todayKey, n + 1).slice(0, -1)));

/* ---------------- 1. recurring commitments ---------------- */

export type RecurringItem = { ruleId: string; title: string; categoryId: string; monthly: number; frequency: RecurringRule['frequency']; startDate: string };
export type RecurringChange = { ruleId: string; title: string; before: number; now: number; pct: number };
export type DetectedRecurring = { title: string; categoryId: string; average: number; months: number };
export type RecurringReview = {
  items: RecurringItem[];
  monthly: number;
  annual: number;
  /** Bills from the rules in the next 30 days. */
  upcoming: UpcomingBill[];
  /** Rules that started in the last 60 days. */
  added: RecurringItem[];
  /** Rules whose recorded amount changed by 5% or more between their last two records. */
  changes: RecurringChange[];
  /** Pairs of rules that look like the same commitment twice (same name, or same subcategory and similar amount). */
  duplicates: [RecurringItem, RecurringItem][];
  /** Payments that come back every month in the records but have no recurring rule yet. */
  detected: DetectedRecurring[];
};

export function recurringReview(rules: RecurringRule[], entries: Transaction[], todayKey: string): RecurringReview {
  const active = rules.filter((r) => r.active && !isEnded(r) && !isTransfer(r) && r.type === 'debit');
  const items: RecurringItem[] = active
    .map((r) => ({ ruleId: r.id, title: r.title, categoryId: r.categoryId, monthly: r2(monthlyEquivalent(r)), frequency: r.frequency, startDate: r.startDate }))
    .sort((a, b) => b.monthly - a.monthly);
  const monthly = r2(items.reduce((s, i) => s + i.monthly, 0));
  const since = addDays(todayKey, -60);
  const added = items.filter((i) => i.startDate >= since && i.startDate <= todayKey);

  // Changes: the two latest records each rule made.
  const byRule = new Map<string, Transaction[]>();
  for (const x of entries) if (x.recurringId && x.amount > 0) byRule.set(x.recurringId, [...(byRule.get(x.recurringId) ?? []), x]);
  const changes: RecurringChange[] = [];
  for (const i of items) {
    const list = (byRule.get(i.ruleId) ?? []).sort((a, b) => (a.date < b.date ? 1 : -1));
    if (list.length < 2) continue;
    const now = list[0].amount;
    const before = list[1].amount;
    const pct = before > 0 ? ((now - before) / before) * 100 : 0;
    if (Math.abs(pct) >= 5) changes.push({ ruleId: i.ruleId, title: i.title, before, now, pct: r1(pct) });
  }

  // Duplicates: same name, or same subcategory with amounts within 10%, same frequency.
  const duplicates: [RecurringItem, RecurringItem][] = [];
  const sub = new Map(active.map((r) => [r.id, `${r.categoryId}|${norm(r.subcategory ?? '')}`]));
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const x = items[a];
      const y = items[b];
      if (x.frequency !== y.frequency) continue;
      const sameName = norm(x.title) !== '' && norm(x.title) === norm(y.title);
      const s1 = sub.get(x.ruleId) ?? '';
      const sameSub = !s1.endsWith('|') && s1 === sub.get(y.ruleId) && Math.abs(x.monthly - y.monthly) <= 0.1 * Math.max(x.monthly, y.monthly);
      if (sameName || sameSub) duplicates.push([x, y]);
    }
  }

  // Detected: a title paid in at least 3 of the last 4 complete months, with amounts within 15% of their average.
  const ruleTitles = new Set(active.map((r) => norm(r.title)));
  const last4 = monthKeysEnding(todayKey, 5).slice(0, -1);
  const seen = new Map<string, { title: string; categoryId: string; byMonth: Map<string, number> }>();
  for (const x of entries) {
    if (x.type !== 'debit' || x.amount <= 0 || x.recurringId) continue;
    const name = norm(x.title);
    const k = cycleOf(x.date);
    if (!name || ruleTitles.has(name) || !last4.includes(k)) continue;
    const key = `${name}|${x.categoryId}`;
    const row = seen.get(key) ?? { title: x.title.trim(), categoryId: x.categoryId, byMonth: new Map() };
    row.byMonth.set(k, (row.byMonth.get(k) ?? 0) + x.amount);
    seen.set(key, row);
  }
  const detected: DetectedRecurring[] = [];
  for (const row of seen.values()) {
    const vals = [...row.byMonth.values()];
    if (vals.length < 3) continue;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    if (avg < 10 || vals.some((v) => Math.abs(v - avg) > 0.15 * avg)) continue;
    detected.push({ title: row.title, categoryId: row.categoryId, average: r2(avg), months: vals.length });
  }
  detected.sort((a, b) => b.average - a.average);

  return { items, monthly, annual: r2(monthly * 12), upcoming: upcomingBills(rules, todayKey, 30), added, changes, duplicates, detected: detected.slice(0, 5) };
}

/* ---------------- 2. lifestyle inflation ---------------- */

export type CategoryDrift = { categoryId: string; before: number; after: number; diff: number };
export type Inflation = {
  /** Months compared: the latest 3 complete months against the 3 before them. */
  beforeKeys: string[];
  afterKeys: string[];
  incomeBefore: number;
  incomeAfter: number;
  spendingBefore: number;
  spendingAfter: number;
  incomeGrowth: number | null;
  spendingGrowth: number | null;
  rateBefore: number | null;
  rateAfter: number | null;
  /** Spending grew at least 5 points faster than income. */
  inflating: boolean;
  /** The categories that grew most (monthly average). */
  drivers: CategoryDrift[];
};

export function lifestyleInflation(entries: Transaction[], todayKey: string): Inflation | null {
  const rows = completeMonths(entries, todayKey, 6);
  if (rows.length < 6) return null;
  const a = rows.slice(0, 3);
  const b = rows.slice(3);
  const sum = (rs: typeof rows, k: 'income' | 'spending') => rs.reduce((s, r) => s + r[k], 0);
  const ib = sum(a, 'income');
  const ia = sum(b, 'income');
  const sb = sum(a, 'spending');
  const sa = sum(b, 'spending');
  const growth = (now: number, before: number) => (before > 0 ? r1((now / before - 1) * 100) : null);
  const rate = (inc: number, sp: number) => (inc > 0 ? r1(((inc - sp) / inc) * 100) : null);
  const beforeKeys = a.map((r) => r.key);
  const afterKeys = b.map((r) => r.key);
  const cat = new Map<string, { before: number; after: number }>();
  for (const x of entries) {
    if (x.type !== 'debit' || x.amount <= 0) continue;
    const k = cycleOf(x.date);
    const side = beforeKeys.includes(k) ? 'before' : afterKeys.includes(k) ? 'after' : null;
    if (!side) continue;
    const row = cat.get(x.categoryId) ?? { before: 0, after: 0 };
    row[side] += x.amount;
    cat.set(x.categoryId, row);
  }
  const drivers = [...cat.entries()]
    .map(([categoryId, v]) => ({ categoryId, before: r2(v.before / 3), after: r2(v.after / 3), diff: r2((v.after - v.before) / 3) }))
    .filter((d) => d.diff >= 20)
    .sort((x, y) => y.diff - x.diff)
    .slice(0, 3);
  const ig = growth(ia, ib);
  const sg = growth(sa, sb);
  return {
    beforeKeys,
    afterKeys,
    incomeBefore: r2(ib / 3),
    incomeAfter: r2(ia / 3),
    spendingBefore: r2(sb / 3),
    spendingAfter: r2(sa / 3),
    incomeGrowth: ig,
    spendingGrowth: sg,
    rateBefore: rate(ib, sb),
    rateAfter: rate(ia, sa),
    inflating: sg !== null && (ig === null ? sg > 5 : sg > ig + 5),
    drivers,
  };
}

/* ---------------- 3. emergency fund ---------------- */

export type EmergencyFund = {
  savings: number;
  /** Average essential spending a month over the last 3 complete months (see utils/health.ts). */
  essential: number;
  months: number;
  target3: number;
  target6: number;
  gap3: number;
  gap6: number;
  basedOn: string[];
};

export function emergencyFund(entries: Transaction[], savingsBalance: number, todayKey: string): EmergencyFund | null {
  const keys = completeMonths(entries, todayKey, 6).slice(-3).map((r) => r.key);
  if (keys.length < 2) return null;
  const essential = essentialAverage(entries, keys);
  if (essential <= 0) return null;
  const savings = Math.max(0, savingsBalance);
  return {
    savings: r2(savings),
    essential: r2(essential),
    months: r1(savings / essential),
    target3: r2(essential * 3),
    target6: r2(essential * PREPARED_MONTHS),
    gap3: r2(Math.max(0, essential * 3 - savings)),
    gap6: r2(Math.max(0, essential * PREPARED_MONTHS - savings)),
    basedOn: keys,
  };
}

/* ---------------- 4. payday behaviour ---------------- */

export type PaydayCycle = { key: string; payDate: string; pay: number; firstWeek: number; total: number; share: number };
export type Payday = {
  /** Last complete cycles: spending in the 7 days from the salary, as a share of the cycle's spending. */
  cycles: PaydayCycle[];
  /** Average share of a cycle's spending that goes in its first week after pay (a week is ~23% of a month). */
  firstWeekShare: number;
  /** Average daily spending in the first week after pay and in the rest of the cycle. */
  dailyFirstWeek: number;
  dailyRest: number;
  /** Today's cycle: days until the next income, and what that leaves per day from the money available now. */
  nextPayDate: string;
  daysToPay: number;
  /** True when the next pay date comes from a recurring income rule, false when from the payday setting. */
  fromRule: boolean;
};

/**
 * Uses the user's real salary: in each cycle the largest income record (at least RM300) is the pay. Cycles without one
 * are skipped. The next pay date is the nearest active income rule, or else the start of the next financial month.
 */
export function paydayBehaviour(entries: Transaction[], rules: RecurringRule[], todayKey: string): Payday | null {
  const keys = completeMonths(entries, todayKey, 6).slice(-3).map((r) => r.key);
  const cycles: PaydayCycle[] = [];
  let firstDays = 0;
  let restDays = 0;
  let firstSum = 0;
  let restSum = 0;
  for (const k of keys) {
    const { from, to } = cycleRange(k);
    const credits = entries.filter((x) => x.type === 'credit' && x.date >= from && x.date <= to && x.amount >= 300).sort((a, b) => b.amount - a.amount);
    const pay = credits[0];
    if (!pay) continue;
    const weekEnd = addDays(pay.date, 6);
    let first = 0;
    let total = 0;
    for (const x of entries) {
      if (x.type !== 'debit' || x.date < from || x.date > to) continue;
      total += x.amount;
      if (x.date >= pay.date && x.date <= weekEnd) first += x.amount;
    }
    if (total <= 0) continue;
    const len = daysBetween(from, to) + 1;
    const fd = Math.min(7, daysBetween(pay.date, to) + 1);
    firstDays += fd;
    restDays += len - fd;
    firstSum += first;
    restSum += total - first;
    cycles.push({ key: k, payDate: pay.date, pay: r2(pay.amount), firstWeek: r2(first), total: r2(total), share: r1((first / total) * 100) });
  }
  if (cycles.length < 2) return null;
  const incomeRules = rules.filter((r) => r.active && !isEnded(r) && !isTransfer(r) && r.type === 'credit' && r.nextDate >= todayKey).sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1));
  const fromRule = incomeRules.length > 0;
  const nextPayDate = fromRule ? incomeRules[0].nextDate : cycleRange(shiftCycle(cycleInfo(todayKey).key, 1)).from;
  return {
    cycles,
    firstWeekShare: r1(cycles.reduce((s, c) => s + c.share, 0) / cycles.length),
    dailyFirstWeek: r2(firstDays > 0 ? firstSum / firstDays : 0),
    dailyRest: r2(restDays > 0 ? restSum / restDays : 0),
    nextPayDate,
    daysToPay: Math.max(0, daysBetween(todayKey, nextPayDate)),
    fromRule,
  };
}
