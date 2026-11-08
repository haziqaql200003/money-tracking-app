import type { Transaction } from '@/context/TransactionsContext';

/**
 * The Faham ledger: ONE place that decides what each record means for analysis.
 *
 * Every record the user keeps is one of these kinds:
 *
 *   income      a credit that is real money earned (salary, freelance, dividends, cashback...)
 *   expense     a debit that is real money spent
 *   refund      a credit under Other Income > Refund. It gives back money that was spent, so it LOWERS spending
 *               in the period it lands in instead of counting as income.
 *   correction  a balance adjustment (ids start with "aj:"). It fixes a balance; it is neither income nor spending.
 *   moved       a debit under Financial > Credit Card Payment, Loan Payment, Personal Loan, BNPL, Investment,
 *               Savings or Emergency Fund. The money did not get spent: it paid off something already counted
 *               (a card purchase) or went somewhere the user still owns (savings, investments).
 *
 * Analysis (income, spending, savings rate, categories, insights, the score) uses `ledgerEntries()`: income and
 * expenses as they are, refunds as NEGATIVE debits, corrections and moved money left out.
 *
 * Balances are different: a correction or a card payment really does change how much is in an account, so balance
 * lines (daily balance, balance trend, cash flow) keep using the raw transaction list.
 *
 * This file has no runtime imports on purpose, so `scripts/ledger-selftest.mjs` can load it with plain Node.
 */

export type LedgerKind = 'income' | 'expense' | 'refund' | 'correction' | 'moved';

/** Keep in step with ADJ_PREFIX in utils/saved.ts (the self-test checks this). */
export const CORRECTION_PREFIX = 'aj:';
export const REFUND_CATEGORY_ID = 'otherincome';
export const REFUND_SUBCATEGORY = 'Refund';
export const MOVED_CATEGORY_ID = 'financial';
/** Stored English subcategory names (see constants/categories.ts). */
export const MOVED_SUBCATEGORIES: readonly string[] = [
  'Credit Card Payment',
  'Loan Payment',
  'Personal Loan',
  'BNPL',
  'Investment',
  'Savings',
  'Emergency Fund',
];

type Rec = Pick<Transaction, 'id' | 'type' | 'categoryId' | 'subcategory'>;

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase();
const MOVED_SET = new Set(MOVED_SUBCATEGORIES.map(norm));

export function ledgerKind(t: Rec): LedgerKind {
  if (t.id.startsWith(CORRECTION_PREFIX)) return 'correction';
  if (t.type === 'credit') {
    return t.categoryId === REFUND_CATEGORY_ID && norm(t.subcategory) === norm(REFUND_SUBCATEGORY) ? 'refund' : 'income';
  }
  return t.categoryId === MOVED_CATEGORY_ID && MOVED_SET.has(norm(t.subcategory)) ? 'moved' : 'expense';
}

/** A refund inside `ledgerEntries()`: a debit with a negative amount. */
export const isRefundEntry = (t: Pick<Transaction, 'type' | 'amount'>) => t.type === 'debit' && t.amount < 0;
/** A real purchase inside `ledgerEntries()` (not a refund). Use it for item-level views: biggest, sizes, titles. */
export const isSpendItem = (t: Pick<Transaction, 'type' | 'amount'>) => t.type === 'debit' && t.amount > 0;

export type Ledger = {
  /** What analysis should read. Refunds are debits with a negative amount; corrections and moved money are left out. */
  entries: Transaction[];
  corrections: Transaction[];
  moved: Transaction[];
  refunds: Transaction[];
};

/** Splits the raw records once. Pure: same input, same output. */
export function buildLedger(transactions: Transaction[]): Ledger {
  const entries: Transaction[] = [];
  const corrections: Transaction[] = [];
  const moved: Transaction[] = [];
  const refunds: Transaction[] = [];
  for (const t of transactions) {
    switch (ledgerKind(t)) {
      case 'correction':
        corrections.push(t);
        break;
      case 'moved':
        moved.push(t);
        break;
      case 'refund':
        refunds.push(t);
        entries.push({ ...t, type: 'debit', amount: -Math.abs(t.amount) });
        break;
      default:
        entries.push(t);
    }
  }
  return { entries, corrections, moved, refunds };
}

/** Shorthand for `buildLedger(transactions).entries`. */
export const ledgerEntries = (transactions: Transaction[]) => buildLedger(transactions).entries;

/* ---------------- the core metrics, defined once ---------------- */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type FlowTotals = {
  /** Sum of income records. */
  income: number;
  /** Sum of expenses minus refunds. */
  spending: number;
  /** income - spending. */
  net: number;
  /** net / income x 100, one decimal; null without income. */
  savingsRate: number | null;
};

/**
 * Totals for `from..to` (inclusive 'YYYY-MM-DD'), read from ledger entries.
 *
 *   income      = Σ income
 *   spending    = Σ expenses − Σ refunds
 *   net         = income − spending
 *   savingsRate = net ÷ income × 100        (null when income is 0)
 */
export function flowTotals(entries: Transaction[], from: string, to: string): FlowTotals {
  let income = 0;
  let spending = 0;
  for (const t of entries) {
    if (t.date < from || t.date > to) continue;
    if (t.type === 'credit') income += t.amount;
    else spending += t.amount;
  }
  income = round2(income);
  spending = round2(spending);
  const net = round2(income - spending);
  return { income, spending, net, savingsRate: income > 0 ? Math.round((net / income) * 1000) / 10 : null };
}

/** Percent change, one decimal; null when the base is under `minBase` (too small for a percentage to mean anything). */
export function percentChange(now: number, before: number, minBase = 10): number | null {
  if (!(before >= minBase)) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}
