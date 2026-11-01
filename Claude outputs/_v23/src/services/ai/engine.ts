import type { Category } from '@/constants/categories';
import { FALLBACK_EXPENSE_ID, FALLBACK_INCOME_ID } from '@/constants/categories';
import type { Account, RecurringRule, Transaction, TransactionType, Transfer } from '@/context/TransactionsContext';
import { upcomingBills, upcomingOccurrences, billsTotal } from '@/utils/bills';
import { addDays, cycleInfo, cycleOf, cycleRange, shiftCycle } from '@/utils/cycle';
import { fixedVsEveryday, monthOutlook, monthRhythm, spendingSizes, unusualExpenses } from '@/utils/deep-insights';
import { buildOutlook, monthlySums, runwayMonths, savingFlows } from '@/utils/forecast';
import type { FeedItem, GoalFacts, Score } from '@/utils/insight-feed';
import { categoryTrends, currentWindow, monthKeysEnding, previousWindow, topTitles, weekdayPattern, windowSummary, type Window } from '@/utils/insights';
import type { Debt } from '@/utils/debts';
import type { Iou } from '@/utils/ious';
import { isAdjustmentEntry, savedEntries } from '@/utils/saved';

import { normTitle, type CategoryModel } from './category-model';

/**
 * The on-device half of the WaKira assistant.
 *
 * The AI model (on the server) never sees the pengguna's records. It asks for what it needs by calling one of the
 * tools below, the phone works the answer out here from the local data, and only that small answer is sent back.
 * Every number the assistant says comes from this file, not from the AI's own arithmetic.
 *
 * Tool names and arguments must match the declarations in supabase/functions/wakira-ai/index.ts.
 */

export type AiAccount = Account & { balance: number; savings: boolean };

export type AiData = {
  todayKey: string;
  transactions: Transaction[];
  transfers: Transfer[];
  /** Accounts the pengguna can pick (no internal debt accounts), with their balances. */
  accounts: AiAccount[];
  categories: Category[];
  recurringRules: RecurringRule[];
  categoryLabel: (c: Category) => string;
  accountLabel: (a: Account) => string;
  fixedMonthly: number;
  debtMonthly: number;
  savingsBalance: number;
  totalBudget: number;
  goals: GoalFacts[];
  score: Score | null;
  feed: FeedItem[];
  model: CategoryModel;
  /** Hutang: instalment plans, loans and credit lines (optional so older callers still work). */
  debts?: Debt[];
  /** Money between the pengguna and other people. */
  ious?: Iou[];
};

export type ProposalNote = 'categoryFromHistory' | 'categoryGuessed' | 'accountGuessed' | 'dateToday' | 'futureDate' | 'sameAccount' | 'lowBalance';

export type TxProposal = { kind: 'transaction'; ref: string; tx: Omit<Transaction, 'id'>; notes: ProposalNote[] };
export type TransferProposal = { kind: 'transfer'; ref: string; tr: Omit<Transfer, 'id'>; notes: ProposalNote[] };
export type Proposal = TxProposal | TransferProposal;

export type ToolResult = { response: Record<string, unknown>; proposals?: Proposal[] };

type Args = Record<string, unknown>;

const round2 = (n: number) => Math.round(n * 100) / 100;
const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : NaN);
const clampInt = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Math.round(num(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};
const isDateKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime());
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

let refCounter = 0;
const newRef = () => `p${Date.now().toString(36)}${(refCounter++).toString(36)}`;

/* ---------------- periods ---------------- */

export const PERIODS = ['today', 'last_7_days', 'this_month', 'last_month', 'last_3_months', 'last_6_months', 'last_12_months', 'this_year', 'all'] as const;
type Period = (typeof PERIODS)[number];

function resolveWindow(args: Args, today: string, fallback: Period = 'this_month'): Window & { period: string } {
  const from = str(args.from, 10);
  const to = str(args.to, 10);
  if (isDateKey(from) && isDateKey(to) && from <= to) return { from, to, period: 'custom' };
  const p = (PERIODS as readonly string[]).includes(str(args.period)) ? (str(args.period) as Period) : fallback;
  const now = cycleOf(today);
  switch (p) {
    case 'today':
      return { from: today, to: today, period: p };
    case 'last_7_days':
      return { from: addDays(today, -6), to: today, period: p };
    case 'last_month': {
      const r = cycleRange(shiftCycle(now, -1));
      return { ...r, period: p };
    }
    case 'last_3_months':
      return { ...currentWindow(today, 3), period: p };
    case 'last_6_months':
      return { ...currentWindow(today, 6), period: p };
    case 'last_12_months':
      return { ...currentWindow(today, 12), period: p };
    case 'this_year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today, period: p };
    case 'all':
      return { from: '0000-01-01', to: today, period: p };
    default:
      return { from: cycleRange(now).from, to: today, period: 'this_month' };
  }
}

/* ---------------- helpers ---------------- */

function lookups(d: AiData) {
  const cat = new Map(d.categories.map((c) => [c.id, c]));
  const acc = new Map(d.accounts.map((a) => [a.id, a]));
  return {
    catName: (id: string) => {
      const c = cat.get(id);
      return c ? d.categoryLabel(c) : 'Other';
    },
    accName: (id: string) => {
      const a = acc.get(id);
      return a ? d.accountLabel(a) : 'Unknown account';
    },
    cat,
    acc,
  };
}

/** Real records only: balance corrections are not spending habits. */
const realTx = (d: AiData) => d.transactions.filter((t) => !isAdjustmentEntry(t));
const inW = (date: string, w: Window) => date >= w.from && date <= w.to;

function txRow(t: Transaction, L: ReturnType<typeof lookups>) {
  return {
    date: t.date,
    title: t.title,
    amount: t.amount,
    type: t.type === 'debit' ? 'expense' : 'income',
    category: L.catName(t.categoryId),
    subcategory: t.subcategory || undefined,
    account: L.accName(t.accountId),
    items: t.items?.length ? t.items.slice(0, 5).map((i) => `${i.label} ${i.amount}`) : undefined,
    recurring: t.recurringId ? true : undefined,
  };
}

/* ---------------- tools ---------------- */

function getOverview(d: AiData): ToolResult {
  const info = cycleInfo(d.todayKey);
  const range = cycleRange(info.key);
  const L = lookups(d);
  let income = 0;
  let spending = 0;
  for (const t of d.transactions) {
    if (cycleOf(t.date) !== info.key || t.date > d.todayKey) continue;
    if (t.type === 'credit') income += t.amount;
    else spending += t.amount;
  }
  const bills = billsTotal(upcomingBills(d.recurringRules, d.todayKey, info.daysAfterToday));
  const outlook = monthOutlook(d.transactions, d.todayKey, bills, d.totalBudget);
  return {
    response: {
      today: d.todayKey,
      financialMonth: { from: range.from, to: range.to, dayNumber: info.dayIndex, daysLeft: info.daysAfterToday },
      totalBalance: round2(d.accounts.reduce((s, a) => s + a.balance, 0)),
      accounts: d.accounts.slice(0, 30).map((a) => ({ id: a.id, name: L.accName(a.id), type: a.type, balance: round2(a.balance), savings: a.savings || undefined })),
      thisMonth: {
        income: round2(income),
        spending: round2(spending),
        net: round2(income - spending),
        projectedSpendingByMonthEnd: outlook.reliable ? outlook.projected : undefined,
        billsStillToCome: bills,
        lastMonthSpending: outlook.lastMonthTotal,
      },
      totalMonthlyBudget: d.totalBudget || undefined,
      recurringBillsPerMonth: round2(d.fixedMonthly),
      debtPaymentsPerMonth: round2(d.debtMonthly),
      savingsAccountsTotal: round2(d.savingsBalance),
      goals: d.goals.slice(0, 10),
      wakiraScore: d.score ? { total: d.score.total, outOf: 100, grade: d.score.grade, weakest: d.score.weakest } : undefined,
    },
  };
}

function spendingBreakdown(d: AiData, a: Args): ToolResult {
  const w = resolveWindow(a, d.todayKey);
  const L = lookups(d);
  const type: TransactionType = str(a.type) === 'income' ? 'credit' : 'debit';
  const groupBy = ['category', 'subcategory', 'account', 'merchant', 'weekday', 'day'].includes(str(a.group_by)) ? str(a.group_by) : 'category';
  const catFilter = str(a.category_id);
  const accFilter = str(a.account_id);
  const limit = clampInt(a.limit, 1, 25, 10);

  const groups = new Map<string, { id: string; label: string; total: number; count: number }>();
  let total = 0;
  let count = 0;
  for (const t of realTx(d)) {
    if (t.type !== type || !inW(t.date, w)) continue;
    if (catFilter && t.categoryId !== catFilter) continue;
    if (accFilter && t.accountId !== accFilter) continue;
    let key: string;
    let label: string;
    switch (groupBy) {
      case 'subcategory':
        key = `${t.categoryId}|${t.subcategory}`;
        label = `${L.catName(t.categoryId)} / ${t.subcategory || '-'}`;
        break;
      case 'account':
        key = t.accountId;
        label = L.accName(t.accountId);
        break;
      case 'merchant':
        key = t.title.trim().toLowerCase() || '(no title)';
        label = t.title.trim() || '(no title)';
        break;
      case 'weekday': {
        const [y, m, dd] = t.date.split('-').map(Number);
        const wd = (new Date(y, m - 1, dd).getDay() + 6) % 7;
        key = String(wd);
        label = WEEKDAYS[wd];
        break;
      }
      case 'day':
        key = t.date;
        label = t.date;
        break;
      default:
        key = t.categoryId;
        label = L.catName(t.categoryId);
    }
    const g = groups.get(key) ?? { id: key, label, total: 0, count: 0 };
    g.total += t.amount;
    g.count += 1;
    groups.set(key, g);
    total += t.amount;
    count += 1;
  }
  const rows = [...groups.values()]
    .sort((x, y) => (groupBy === 'weekday' || groupBy === 'day' ? 0 : y.total - x.total))
    .map((g) => ({ id: g.id, name: g.label, total: round2(g.total), count: g.count, sharePercent: total > 0 ? Math.round((g.total / total) * 1000) / 10 : 0 }));
  if (groupBy === 'day') rows.sort((x, y) => (x.name < y.name ? -1 : 1));
  return {
    response: {
      period: w,
      kind: type === 'debit' ? 'spending' : 'income',
      groupedBy: groupBy,
      total: round2(total),
      records: count,
      rows: groupBy === 'weekday' || groupBy === 'day' ? rows.slice(-31) : rows.slice(0, limit),
      moreGroups: groupBy === 'weekday' || groupBy === 'day' ? undefined : Math.max(0, rows.length - limit) || undefined,
      note: 'Transfers between own accounts are not spending and are not included.',
    },
  };
}

function findTransactions(d: AiData, a: Args): ToolResult {
  const w = resolveWindow(a, d.todayKey, 'last_3_months');
  const L = lookups(d);
  const q = str(a.query, 60).toLowerCase();
  const typeArg = str(a.type);
  const type: TransactionType | null = typeArg === 'income' ? 'credit' : typeArg === 'expense' ? 'debit' : null;
  const catFilter = str(a.category_id);
  const accFilter = str(a.account_id);
  const min = num(a.min_amount);
  const max = num(a.max_amount);
  const limit = clampInt(a.limit, 1, 40, 15);
  const byAmount = str(a.sort) === 'amount';

  const hits = realTx(d).filter((t) => {
    if (!inW(t.date, w)) return false;
    if (type && t.type !== type) return false;
    if (catFilter && t.categoryId !== catFilter) return false;
    if (accFilter && t.accountId !== accFilter) return false;
    if (Number.isFinite(min) && t.amount < min) return false;
    if (Number.isFinite(max) && t.amount > max) return false;
    if (q) {
      const hay = `${t.title} ${t.subcategory} ${L.catName(t.categoryId)} ${(t.items ?? []).map((i) => i.label).join(' ')}`.toLowerCase();
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  });
  hits.sort((x, y) => (byAmount ? y.amount - x.amount : x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
  const spent = hits.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const earned = hits.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  return {
    response: {
      period: w,
      matched: hits.length,
      totalExpense: round2(spent),
      totalIncome: round2(earned),
      shown: Math.min(limit, hits.length),
      records: hits.slice(0, limit).map((t) => txRow(t, L)),
    },
  };
}

function listTransfers(d: AiData, a: Args): ToolResult {
  const w = resolveWindow(a, d.todayKey, 'last_3_months');
  const L = lookups(d);
  const accFilter = str(a.account_id);
  const limit = clampInt(a.limit, 1, 40, 15);
  const list = d.transfers
    .filter((t) => inW(t.date, w) && (!accFilter || t.fromAccountId === accFilter || t.toAccountId === accFilter))
    .sort((x, y) => (x.date < y.date ? 1 : -1));
  const pairs = new Map<string, { from: string; to: string; total: number; count: number }>();
  for (const t of list) {
    const k = `${t.fromAccountId}>${t.toAccountId}`;
    const p = pairs.get(k) ?? { from: L.accName(t.fromAccountId), to: L.accName(t.toAccountId), total: 0, count: 0 };
    p.total += t.amount;
    p.count += 1;
    pairs.set(k, p);
  }
  return {
    response: {
      period: w,
      count: list.length,
      totalMoved: round2(list.reduce((s, t) => s + t.amount, 0)),
      byRoute: [...pairs.values()].map((p) => ({ ...p, total: round2(p.total) })).sort((x, y) => y.total - x.total).slice(0, 10),
      transfers: list.slice(0, limit).map((t) => ({ date: t.date, from: L.accName(t.fromAccountId), to: L.accName(t.toAccountId), amount: t.amount, note: t.note || undefined, toSavingsGoal: t.goalId ? true : undefined })),
    },
  };
}

function comparePeriods(d: AiData, a: Args): ToolResult {
  const months = clampInt(a.months, 1, 12, 1);
  const L = lookups(d);
  const tx = realTx(d);
  const w = currentWindow(d.todayKey, months);
  const prev = previousWindow(w, months);
  const now = windowSummary(tx, w);
  const before = windowSummary(tx, prev);
  const cats = categoryTrends(tx, w, prev).slice(0, 10);
  return {
    response: {
      note: 'Like-for-like: the earlier window ends the same number of days into its month as today.',
      current: { ...w, ...now },
      previous: { ...prev, ...before },
      spendingChangePercent: before.spending >= 10 ? Math.round(((now.spending - before.spending) / before.spending) * 1000) / 10 : null,
      categories: cats.map((c) => ({
        category: L.catName(c.categoryId),
        categoryId: c.categoryId,
        now: c.total,
        before: c.previous,
        changePercent: c.change,
        topSubcategories: c.subs.slice(0, 3),
      })),
    },
  };
}

function spendingHabits(d: AiData, a: Args): ToolResult {
  const w = resolveWindow(a, d.todayKey, 'last_3_months');
  const L = lookups(d);
  const tx = realTx(d);
  const week = weekdayPattern(tx, w);
  const weekendAvg = (week[5].average + week[6].average) / 2;
  const weekdayAvg = week.slice(0, 5).reduce((s, r) => s + r.average, 0) / 5;
  const sizes = spendingSizes(tx, w);
  const rhythm = monthRhythm(tx, w);
  const split = fixedVsEveryday(tx, w);
  return {
    response: {
      period: w,
      averagePerWeekday: week.map((r) => ({ day: WEEKDAYS[r.day], average: r.average })),
      weekendVsWeekday: { weekendDailyAverage: round2(weekendAvg), weekdayDailyAverage: round2(weekdayAvg) },
      topMerchants: topTitles(tx, w, 8),
      unusualExpenses: unusualExpenses(tx, w, 3).map((u) => ({ ...txRow(u.transaction, L), typicalForCategory: u.typical, timesTypical: u.times })),
      bySize: sizes.map((b) => ({ range: b.max === null ? `${b.min}+` : `${b.min}-${b.max}`, count: b.count, total: b.total, sharePercent: b.share })),
      monthRhythm: { days1to10Percent: rhythm.parts[0].share, days11to20Percent: rhythm.parts[1].share, days21toEndPercent: rhythm.parts[2].share },
      fixedVsEveryday: split,
      appInsights: d.feed.slice(0, 6).map((f) => ({ title: f.title, detail: f.body, tip: f.action })),
      wakiraScore: d.score ? { total: d.score.total, grade: d.score.grade, factors: d.score.factors.map((f) => ({ id: f.id, points: Math.round(f.points), max: f.max })) } : undefined,
    },
  };
}

function forecast(d: AiData, a: Args): ToolResult {
  const months = clampInt(a.months, 1, 6, 3);
  const tx = realTx(d);
  const past = monthKeysEnding(d.todayKey, 7).slice(0, -1); // the 6 complete months before this one
  const everyday = monthlySums(tx.filter((x) => x.type === 'debit' && !x.recurringId), past);
  const income = monthlySums(tx.filter((x) => x.type === 'credit'), past);
  const savingIds = new Set(d.accounts.filter((x) => x.savings).map((x) => x.id));
  const flows = savingFlows(d.transfers, (id) => savingIds.has(id));
  const saving = monthlySums(flows, past);
  const outlook = buildOutlook({ everydayHistory: everyday, incomeHistory: income, savingHistory: saving, fixedMonthly: d.fixedMonthly, horizon: months + 1 });
  const nowKey = cycleOf(d.todayKey);
  const info = cycleInfo(d.todayKey);
  const billsNow = billsTotal(upcomingBills(d.recurringRules, d.todayKey, info.daysAfterToday));
  const thisMonth = monthOutlook(d.transactions, d.todayKey, billsNow, d.totalBudget);

  const usable = d.accounts.filter((x) => !x.savings).reduce((s, x) => s + x.balance, 0);
  let running = usable;
  const ahead = outlook.left.slice(1).map((band, i) => {
    running += band.value;
    return {
      month: shiftCycle(nowKey, i + 1),
      expectedIncome: outlook.income.points[i + 1].value,
      expectedSpending: outlook.expense.points[i + 1].value,
      expectedSpendingRange: [outlook.expense.points[i + 1].low, outlook.expense.points[i + 1].high],
      expectedSaving: outlook.saving.points[i + 1].value,
      leftOver: band.value,
      leftOverRange: [band.low, band.high],
      spendableBalanceAfter: round2(running),
    };
  });
  const upcoming = upcomingOccurrences(d.recurringRules, d.todayKey, 30)
    .slice(0, 12)
    .map((o) => ({ date: o.date, title: o.title, amount: o.amount || undefined, amountVaries: o.varies || undefined, type: o.type === 'debit' ? 'bill' : 'income' }));
  return {
    response: {
      method: 'Smoothed recent months plus half the recent trend, with a band of one typical swing. Recurring bills are added on top.',
      reliable: outlook.expense.reliable && outlook.income.reliable,
      monthsOfHistory: Math.max(outlook.expense.monthsUsed, outlook.income.monthsUsed),
      history: past.map((k, i) => ({ month: k, income: income[i], everydaySpending: everyday[i], saved: saving[i] })),
      thisMonth: {
        spentSoFar: thisMonth.spentSoFar,
        incomeSoFar: thisMonth.incomeSoFar,
        billsStillToCome: thisMonth.billsAhead,
        projectedTotalSpending: thisMonth.projected,
        reliable: thisMonth.reliable,
        daysLeft: thisMonth.daysLeft,
      },
      nextMonths: ahead,
      spendableBalanceNow: round2(usable),
      savingsNow: round2(d.savingsBalance),
      monthsSavingsWouldLast: runwayMonths(d.savingsBalance, outlook.expense.average),
      upcomingIn30Days: upcoming,
    },
  };
}

function budgetStatus(d: AiData): ToolResult {
  const info = cycleInfo(d.todayKey);
  const entries = [...realTx(d), ...savedEntries(d.transfers)];
  const rows = d.categories
    .filter((c) => c.kind === 'expense' && c.monthlyLimit > 0)
    .map((c) => {
      const spent = entries.filter((t) => t.type === 'debit' && t.categoryId === c.id && cycleOf(t.date) === info.key).reduce((s, t) => s + t.amount, 0);
      const pace = info.dayIndex > 0 ? (spent / info.dayIndex) * info.length : spent;
      return {
        category: d.categoryLabel(c),
        categoryId: c.id,
        limit: c.monthlyLimit,
        spent: round2(spent),
        left: round2(c.monthlyLimit - spent),
        usedPercent: Math.round((spent / c.monthlyLimit) * 1000) / 10,
        atThisPaceByMonthEnd: round2(pace),
        status: spent > c.monthlyLimit ? 'over' : pace > c.monthlyLimit ? 'likely_over' : 'ok',
      };
    })
    .sort((x, y) => y.usedPercent - x.usedPercent);
  return {
    response: {
      dayOfMonth: info.dayIndex,
      daysInMonth: info.length,
      budgets: rows,
      noBudgets: rows.length === 0 ? 'The pengguna has not set any category budget yet (More > Budgets).' : undefined,
    },
  };
}

/* ---------------- proposals (nothing is saved until the pengguna taps Save) ---------------- */

function resolveAccount(d: AiData, raw: unknown, notes: ProposalNote[], fallback = true, title = ''): string | null {
  const id = str(raw, 80);
  if (d.accounts.some((x) => x.id === id)) return id;
  const low = id.toLowerCase();
  if (low) {
    const byName = d.accounts.find((x) => d.accountLabel(x).toLowerCase() === low) ?? d.accounts.find((x) => d.accountLabel(x).toLowerCase().includes(low) || (x.provider ?? '').toLowerCase().includes(low));
    if (byName) return byName.id;
  }
  if (!fallback) return null;
  // The account this title was paid with before (Petronas -> the card), else the account used most in the last 30 records.
  const same = normTitle(title);
  if (same) {
    const byTitle = new Map<string, number>();
    for (const t of d.transactions) if (normTitle(t.title) === same && d.accounts.some((x) => x.id === t.accountId)) byTitle.set(t.accountId, (byTitle.get(t.accountId) ?? 0) + 1);
    const top = [...byTitle.entries()].sort((x, y) => y[1] - x[1])[0];
    if (top) {
      notes.push('accountGuessed');
      return top[0];
    }
  }
  const counts = new Map<string, number>();
  for (const t of [...d.transactions].sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 30)) counts.set(t.accountId, (counts.get(t.accountId) ?? 0) + 1);
  const best = [...counts.entries()].filter(([k]) => d.accounts.some((x) => x.id === k)).sort((x, y) => y[1] - x[1])[0]?.[0] ?? d.accounts[0]?.id ?? null;
  if (best) notes.push('accountGuessed');
  return best;
}

function resolveDate(raw: unknown, today: string, notes: ProposalNote[]) {
  const s = str(raw, 10);
  if (!isDateKey(s)) {
    notes.push('dateToday');
    return today;
  }
  if (s > today) notes.push('futureDate');
  return s;
}

function proposeTransactions(d: AiData, a: Args): ToolResult {
  const raw = Array.isArray(a.items) ? (a.items as Args[]).slice(0, 30) : [];
  const proposals: TxProposal[] = [];
  const rejected: { index: number; reason: string }[] = [];
  raw.forEach((it, index) => {
    const notes: ProposalNote[] = [];
    const amount = round2(Math.abs(num(it.amount)));
    if (!(amount > 0) || amount >= 10_000_000) {
      rejected.push({ index, reason: 'amount missing or not a number' });
      return;
    }
    const type: TransactionType = str(it.type) === 'income' ? 'credit' : 'debit';
    const kind = type === 'debit' ? 'expense' : 'income';
    const title = str(it.title, 60) || (type === 'debit' ? 'Expense' : 'Income');
    const accountId = resolveAccount(d, it.account_id, notes, true, title);
    if (!accountId) {
      rejected.push({ index, reason: 'no account exists' });
      return;
    }
    // Category: the pengguna's own habit (on-device model) wins when it is clear; then the AI's pick; then "Other".
    let cat = d.categories.find((c) => c.id === str(it.category_id) && c.kind === kind);
    const habit = d.model.predict(title, type);
    const habitCat = habit && habit.confidence >= 0.6 && habit.samples >= 2 ? d.categories.find((c) => c.id === habit.categoryId && c.kind === kind) : undefined;
    let sub = str(it.subcategory, 60);
    if (habitCat && habitCat.id !== cat?.id) {
      cat = habitCat;
      sub = habit!.subcategory;
      notes.push('categoryFromHistory');
    } else if (!cat) {
      const loose = habit ? d.categories.find((c) => c.id === habit.categoryId && c.kind === kind) : undefined;
      cat = loose ?? d.categories.find((c) => c.id === (type === 'debit' ? FALLBACK_EXPENSE_ID : FALLBACK_INCOME_ID)) ?? d.categories.find((c) => c.kind === kind);
      if (loose && habit) sub = habit.subcategory;
      notes.push('categoryGuessed');
    }
    if (!cat) {
      rejected.push({ index, reason: 'no category exists' });
      return;
    }
    const subcategory = cat.subcategories.includes(sub) ? sub : (cat.subcategories.find((s) => s.toLowerCase() === sub.toLowerCase()) ?? cat.subcategories[0] ?? '');
    const date = resolveDate(it.date, d.todayKey, notes);
    const rawItems = Array.isArray(it.line_items) ? (it.line_items as Args[]) : [];
    const lines = rawItems
      .map((x, i) => ({ id: `ai${Date.now().toString(36)}${i}`, label: str(x.label, 60), amount: round2(num(x.amount)) }))
      .filter((x) => x.label && Number.isFinite(x.amount) && x.amount !== 0);
    // Like receipt scanning: line items are kept only when they add up to the amount.
    const items = lines.length >= 2 && Math.abs(lines.reduce((s, x) => s + x.amount, 0) - amount) <= 0.05 ? lines : undefined;
    if (type === 'debit') {
      const acc = d.accounts.find((x) => x.id === accountId);
      if (acc && acc.balance - amount < 0 && !acc.creditLimit) notes.push('lowBalance');
    }
    proposals.push({ kind: 'transaction', ref: newRef(), tx: { title, amount, type, date, categoryId: cat.id, subcategory, accountId, items }, notes });
  });
  const L = lookups(d);
  return {
    proposals,
    response: {
      status: proposals.length ? 'shown_to_pengguna_waiting_for_confirmation' : 'nothing_to_show',
      instruction: 'Nothing is saved yet. Tell the pengguna to check the card(s) and tap Save. Mention anything in notes.',
      proposals: proposals.map((p) => ({ ...txRow({ ...p.tx, id: p.ref }, L), notes: p.notes.length ? p.notes : undefined })),
      rejected: rejected.length ? rejected : undefined,
    },
  };
}

function proposeTransfer(d: AiData, a: Args): ToolResult {
  const notes: ProposalNote[] = [];
  const amount = round2(Math.abs(num(a.amount)));
  const from = resolveAccount(d, a.from_account_id, notes, false);
  const to = resolveAccount(d, a.to_account_id, notes, false);
  const L = lookups(d);
  if (!(amount > 0)) return { response: { status: 'rejected', reason: 'amount missing' } };
  if (!from || !to) {
    return {
      response: {
        status: 'rejected',
        reason: 'unknown account; ask the pengguna which account',
        accounts: d.accounts.map((x) => ({ id: x.id, name: L.accName(x.id) })),
      },
    };
  }
  if (from === to) return { response: { status: 'rejected', reason: 'from and to are the same account' } };
  const date = resolveDate(a.date, d.todayKey, notes);
  const fromAcc = d.accounts.find((x) => x.id === from);
  if (fromAcc && fromAcc.balance - amount < 0 && !fromAcc.creditLimit) notes.push('lowBalance');
  const note = str(a.note, 80) || undefined;
  const p: TransferProposal = { kind: 'transfer', ref: newRef(), tr: { fromAccountId: from, toAccountId: to, amount, date, note }, notes };
  return {
    proposals: [p],
    response: {
      status: 'shown_to_pengguna_waiting_for_confirmation',
      instruction: 'Nothing is saved yet. Tell the pengguna to check the card and tap Save.',
      transfer: { from: L.accName(from), to: L.accName(to), amount, date, note, notes: notes.length ? notes : undefined },
    },
  };
}

/* ---------------- dispatcher ---------------- */

export function runTool(name: string, args: Args | undefined, data: AiData): ToolResult {
  const a = args ?? {};
  try {
    switch (name) {
      case 'get_overview':
        return getOverview(data);
      case 'spending_breakdown':
        return spendingBreakdown(data, a);
      case 'find_transactions':
        return findTransactions(data, a);
      case 'list_transfers':
        return listTransfers(data, a);
      case 'compare_periods':
        return comparePeriods(data, a);
      case 'spending_habits':
        return spendingHabits(data, a);
      case 'forecast':
        return forecast(data, a);
      case 'budget_status':
        return budgetStatus(data);
      case 'propose_transactions':
        return proposeTransactions(data, a);
      case 'propose_transfer':
        return proposeTransfer(data, a);
      default:
        return { response: { error: `unknown tool ${name}` } };
    }
  } catch (e) {
    return { response: { error: 'tool failed on the phone', detail: e instanceof Error ? e.message.slice(0, 120) : undefined } };
  }
}

/** The short, always-sent context: ids and names so the AI can refer to accounts and categories. No amounts. */
export function aiContext(d: AiData, lang: 'ms' | 'en') {
  const info = cycleInfo(d.todayKey);
  const range = cycleRange(info.key);
  return {
    lang,
    today: d.todayKey,
    financialMonth: `${range.from} to ${range.to}`,
    accounts: d.accounts.slice(0, 30).map((x) => ({ id: x.id, name: d.accountLabel(x), type: x.savings ? 'savings' : x.type })),
    expenseCategories: d.categories.filter((c) => c.kind === 'expense').slice(0, 40).map((c) => ({ id: c.id, name: d.categoryLabel(c), subs: c.subcategories.slice(0, 20) })),
    incomeCategories: d.categories.filter((c) => c.kind === 'income').slice(0, 20).map((c) => ({ id: c.id, name: d.categoryLabel(c), subs: c.subcategories.slice(0, 20) })),
  };
}
