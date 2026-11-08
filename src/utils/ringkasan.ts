import type { Transaction, Transfer } from '@/context/TransactionsContext';
import { addDays } from '@/utils/cycle';
import { fixedVsEveryday } from '@/utils/deep-insights';
import type { FahamPeriod } from '@/utils/faham-period';
import { savingFlows } from '@/utils/forecast';
import { windowSummary, type Summary, type Window } from '@/utils/insights';
import { percentChange } from '@/utils/ledger';

/**
 * The numbers behind Ringkasan, as pure functions over LEDGER entries (utils/ledger.ts).
 * Every figure can be traced back to records; nothing here is estimated.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const inside = (d: string, w: Window) => d >= w.from && d <= w.to;

/** How close to the start of the previous window the first record must be for a comparison to be fair. */
export const COVERAGE_SLACK_DAYS = 7;

export type Snapshot = {
  now: Summary;
  prev: Summary;
  /**
   * True when records go back far enough to cover the previous window (first record no later than a week into it).
   * Without that, "vs before" would compare a full period with a half-empty one, so no change is shown.
   */
  comparable: boolean;
  /** % change; null when not comparable or the base is too small. */
  incomeChange: number | null;
  spendingChange: number | null;
  /** now.net − prev.net, in RM; null when not comparable. */
  netDiff: number | null;
};

export function firstRecordDate(entries: Transaction[]): string | null {
  let first: string | null = null;
  for (const x of entries) if (!first || x.date < first) first = x.date;
  return first;
}

export function snapshot(entries: Transaction[], period: FahamPeriod): Snapshot {
  const now = windowSummary(entries, period.window);
  const prev = windowSummary(entries, period.previous);
  const first = firstRecordDate(entries);
  const comparable = !!first && first <= addDays(period.previous.from, COVERAGE_SLACK_DAYS) && (prev.income > 0 || prev.spending > 0);
  return {
    now,
    prev,
    comparable,
    incomeChange: comparable ? percentChange(now.income, prev.income) : null,
    spendingChange: comparable ? percentChange(now.spending, prev.spending) : null,
    netDiff: comparable ? round2(now.net - prev.net) : null,
  };
}

/* ---------------- where the income went ---------------- */

export type Allocation = {
  income: number;
  /** Commitments: recurring, subscriptions and bill-type subcategories (see isFixedExpense). */
  fixed: number;
  /** Everything else spent, after refunds. */
  everyday: number;
  /**
   * Money that really went into savings in the window: transfers into savings accounts or goals (minus money taken
   * back out), plus records under Financial > Savings, Emergency Fund or Investment. Never just "income minus spending".
   */
  saved: number;
  /** income − fixed − everyday − saved. Negative means more went out than came in. */
  left: number;
};

const SAVING_SUBS = new Set(['savings', 'emergency fund', 'investment']);

export function allocation(args: {
  entries: Transaction[];
  /** Ledger `moved` records (card, loan, savings and investment payments). */
  moved: Transaction[];
  transfers: Transfer[];
  isSavingsAccount: (accountId: string) => boolean;
  window: Window;
}): Allocation {
  const { entries, moved, transfers, isSavingsAccount, window: w } = args;
  const s = windowSummary(entries, w);
  const split = fixedVsEveryday(entries, w);
  let saved = 0;
  for (const f of savingFlows(transfers, isSavingsAccount)) if (inside(f.date, w)) saved += f.amount;
  for (const x of moved) if (inside(x.date, w) && x.categoryId === 'financial' && SAVING_SUBS.has((x.subcategory ?? '').trim().toLowerCase())) saved += x.amount;
  saved = round2(Math.max(0, saved));
  return {
    income: s.income,
    fixed: split.fixed,
    everyday: round2(s.spending - split.fixed),
    saved,
    left: round2(s.income - s.spending - saved),
  };
}

/* ---------------- highlights ---------------- */

type CategoryMove = { categoryId: string; now: number; before: number; pct: number; diff: number };
type KeptMove = { now: number; before: number; diff: number };
export type Highlight =
  | ({ kind: 'catUp' } & CategoryMove)
  | ({ kind: 'catDown' } & CategoryMove)
  | ({ kind: 'keptMore' } & KeptMove)
  | ({ kind: 'keptLess' } & KeptMove);

/** A category change must be at least this many RM and this many percent, from a base of at least MIN_BASE. */
const MIN_DIFF = 30;
const MIN_PCT = 15;
const MIN_BASE = 50;

/**
 * Two or three changes worth a look, each backed by the records of both windows. Only when the period is comparable.
 * Largest money changes first; at most one per kind of change so the list never repeats itself.
 */
export function highlights(entries: Transaction[], period: FahamPeriod, snap: Snapshot, limit = 3): Highlight[] {
  if (!snap.comparable) return [];
  const now = new Map<string, number>();
  const before = new Map<string, number>();
  for (const x of entries) {
    if (x.type !== 'debit' || x.amount <= 0) continue;
    if (inside(x.date, period.window)) now.set(x.categoryId, (now.get(x.categoryId) ?? 0) + x.amount);
    else if (inside(x.date, period.previous)) before.set(x.categoryId, (before.get(x.categoryId) ?? 0) + x.amount);
  }
  const moves: Highlight[] = [];
  for (const id of new Set([...now.keys(), ...before.keys()])) {
    const a = round2(now.get(id) ?? 0);
    const b = round2(before.get(id) ?? 0);
    const pct = percentChange(a, b, MIN_BASE);
    if (pct === null || Math.abs(a - b) < MIN_DIFF || Math.abs(pct) < MIN_PCT) continue;
    const move = { categoryId: id, now: a, before: b, pct, diff: round2(a - b) };
    moves.push(a > b ? { kind: 'catUp', ...move } : { kind: 'catDown', ...move });
  }
  const up = moves.filter((m) => m.kind === 'catUp').sort((x, y) => y.diff - x.diff)[0];
  const down = moves.filter((m) => m.kind === 'catDown').sort((x, y) => x.diff - y.diff)[0];
  const out: Highlight[] = [];
  if (snap.netDiff !== null && Math.abs(snap.netDiff) >= MIN_DIFF && snap.now.income > 0 && snap.prev.income > 0) {
    const kept = { now: snap.now.net, before: snap.prev.net, diff: snap.netDiff };
    out.push(snap.netDiff > 0 ? { kind: 'keptMore', ...kept } : { kind: 'keptLess', ...kept });
  }
  if (up) out.push(up);
  if (down) out.push(down);
  return out.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff)).slice(0, limit);
}
