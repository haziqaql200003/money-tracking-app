import { brandKey, findBrand, type Brand, type LateFeeRule } from '@/constants/brands';
import { creditStatus, instalmentAmount, nextCreditDue, remainingPrincipal, round2, unpaid, type Debt } from '@/utils/debts';

/**
 * Debts grouped by who you owe (SPayLater, TikTok PayLater, Maybank...), so each company is one line with one total,
 * and everything due with it can be paid in one go. Pure functions: no React, no storage.
 */

/** One thing to pay inside a provider group. */
export type PayItem = {
  /** Stable id for lists and selection. */
  key: string;
  kind: 'instalment' | 'credit';
  debtId: string;
  /** Instalment number (instalments only). */
  n?: number;
  /** The debt's name ("iPhone case"). */
  name: string;
  dueDate: string | null;
  /** Instalment: principal + fee. Credit line: the amount used. */
  amount: number;
  overdue: boolean;
  daysLate: number;
  /** Estimated late charge from the provider's template, put on the first overdue item of each late month. 0 if none. */
  lateFee: number;
  /** The debt's usual paying account. */
  payFromAccountId: string;
};

export type ProviderGroup = {
  key: string;
  /** The company's proper name when known, else what was typed, else the debt's own name. */
  name: string;
  brand?: Brand;
  debts: Debt[];
  /** Everything still owed: unpaid principal plus credit used. */
  owed: number;
  /** Due up to the cut-off date, overdue included, soonest first. */
  due: PayItem[];
  dueAmount: number;
  overdueCount: number;
  overdueAmount: number;
  lateFeeTotal: number;
  /** Total credit limit of the provider's credit lines (0 when it has none). The instalments count against it too. */
  limit: number;
  /** Limit left after the credit used and the principal still owed on instalments. */
  available: number;
  /** Earliest unpaid due date of the group, if any. */
  nextDue: string | null;
};

const dayNum = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

/** The last day of the month of `dateKey`. */
export function endOfMonth(dateKey: string): string {
  const [y, m] = dateKey.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

/** Which group a debt belongs to: the known company, else the typed provider, else the debt alone. */
export function groupKeyOf(debt: Debt): string {
  const brand = findBrand(debt.provider);
  if (brand) return `b:${brand.id}`;
  const typed = brandKey(debt.provider ?? '');
  return typed ? `p:${typed}` : `d:${debt.id}`;
}

/**
 * Late charge for one late month of a provider, from its template. `amountLate` is what was overdue that month.
 * Returns 0 while still inside the grace days, or when the provider has no template.
 */
export function lateFeeFor(rule: LateFeeRule | undefined, amountLate: number, daysLate: number): number {
  if (!rule || daysLate <= rule.graceDays || amountLate <= 0) return 0;
  return round2(rule.capAtDue ? Math.min(rule.flat, amountLate) : rule.flat);
}

type Options = {
  /** Include instalments due up to and including this date (overdue ones are always included). */
  until: string;
  /** Credit lines with something used but no due day: include their bill (Debts screen) or not (Home). */
  undatedCredit: boolean;
};

export function providerGroups(debts: Debt[], balanceOf: (accountId: string) => number, todayKey: string, opts: Options): ProviderGroup[] {
  const today = dayNum(todayKey);
  const groups = new Map<string, ProviderGroup>();

  for (const d of debts) {
    if (d.status === 'done') continue;
    const key = groupKeyOf(d);
    let g = groups.get(key);
    if (!g) {
      const brand = findBrand(d.provider);
      g = {
        key, brand, name: brand?.name ?? (d.provider?.trim() || d.name), debts: [], owed: 0, due: [],
        dueAmount: 0, overdueCount: 0, overdueAmount: 0, lateFeeTotal: 0, limit: 0, available: 0, nextDue: null,
      };
      groups.set(key, g);
    }
    g.debts.push(d);

    if (d.kind === 'credit') {
      const used = creditStatus(d.creditLimit ?? 0, balanceOf(d.accountId)).used;
      g.limit += d.creditLimit ?? 0;
      g.owed += used;
      if (used <= 0) continue;
      const dueDate = d.dueDay ? nextCreditDue(d.dueDay, todayKey) : null;
      if (dueDate ? dueDate <= opts.until : opts.undatedCredit) {
        g.due.push({ key: `credit:${d.id}`, kind: 'credit', debtId: d.id, name: d.name, dueDate, amount: used, overdue: false, daysLate: 0, lateFee: 0, payFromAccountId: d.payFromAccountId });
      }
      if (dueDate && (!g.nextDue || dueDate < g.nextDue)) g.nextDue = dueDate;
      continue;
    }

    g.owed += remainingPrincipal(d);
    for (const s of unpaid(d)) {
      if (!g.nextDue || s.dueDate < g.nextDue) g.nextDue = s.dueDate;
      if (s.dueDate > opts.until) continue;
      const daysLate = Math.max(0, today - dayNum(s.dueDate));
      g.due.push({
        key: `inst:${d.id}:${s.n}`, kind: 'instalment', debtId: d.id, n: s.n, name: d.name, dueDate: s.dueDate,
        amount: instalmentAmount(s), overdue: daysLate > 0, daysLate, lateFee: 0, payFromAccountId: d.payFromAccountId,
      });
    }
  }

  for (const g of groups.values()) {
    g.due.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.name.localeCompare(b.name));
    // A provider bills once a month: one late charge per late month, put on that month's first overdue item.
    const byMonth = new Map<string, PayItem[]>();
    for (const it of g.due) if (it.overdue && it.dueDate) byMonth.set(it.dueDate.slice(0, 7), [...(byMonth.get(it.dueDate.slice(0, 7)) ?? []), it]);
    for (const items of byMonth.values()) {
      const late = items.reduce((s, it) => s + it.amount, 0);
      items[0].lateFee = lateFeeFor(g.brand?.lateFee, late, Math.max(...items.map((it) => it.daysLate)));
    }
    g.owed = round2(g.owed);
    g.available = round2(Math.max(0, g.limit - g.owed));
    g.dueAmount = round2(g.due.reduce((s, it) => s + it.amount, 0));
    g.overdueCount = g.due.filter((it) => it.overdue).length;
    g.overdueAmount = round2(g.due.filter((it) => it.overdue).reduce((s, it) => s + it.amount, 0));
    g.lateFeeTotal = round2(g.due.reduce((s, it) => s + it.lateFee, 0));
  }

  // Overdue first, then whatever is due soonest, then by name.
  return [...groups.values()].sort(
    (a, b) =>
      Number(b.overdueCount > 0) - Number(a.overdueCount > 0) ||
      (a.nextDue ?? '9999').localeCompare(b.nextDue ?? '9999') ||
      a.name.localeCompare(b.name),
  );
}

/** One month of bills with a provider: what falls due that month, so the list reads like the company's own "My bills". */
export type MonthBill = {
  /** 'YYYY-MM', or 'none' for a credit line with no due day. */
  month: string;
  /** The earliest due date inside the month (null for 'none'). */
  dueDate: string | null;
  total: number;
  items: PayItem[];
  overdue: boolean;
};

/** Everything still to pay, grouped by the month it falls due, soonest first. Pass items from `providerGroups` with a far `until`. */
export function monthBills(items: PayItem[]): MonthBill[] {
  const byMonth = new Map<string, PayItem[]>();
  for (const it of items) {
    const k = it.dueDate ? it.dueDate.slice(0, 7) : 'none';
    byMonth.set(k, [...(byMonth.get(k) ?? []), it]);
  }
  return [...byMonth.entries()]
    .map(([month, list]) => ({
      month,
      dueDate: list.reduce<string | null>((min, it) => (it.dueDate && (!min || it.dueDate < min) ? it.dueDate : min), null),
      total: round2(list.reduce((s, it) => s + it.amount, 0)),
      items: list,
      overdue: list.some((it) => it.overdue),
    }))
    .sort((a, b) => (a.month === 'none' ? 1 : b.month === 'none' ? -1 : a.month.localeCompare(b.month)));
}

/** A payment already made to this provider, newest first. */
export type PaidLine = { key: string; debtId: string; name: string; n: number; date: string; amount: number; /** The month's bill it belonged to. */ dueDate: string };

export function paidHistory(debts: Debt[]): PaidLine[] {
  const out: PaidLine[] = [];
  for (const d of debts) for (const s of d.schedule) if (s.paid) out.push({ key: `${d.id}:${s.n}`, debtId: d.id, name: d.name, n: s.n, date: s.paid.date, amount: s.paid.amount, dueDate: s.dueDate });
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

/** The last instalment date across all the provider's plans. */
export function lastPaymentDate(debts: Debt[]): string | null {
  let last: string | null = null;
  for (const d of debts) for (const s of d.schedule) if (!s.paid && (!last || s.dueDate > last)) last = s.dueDate;
  return last;
}

/** One month of what was already paid, newest month first: the same shape as the upcoming list, so both open the same way. */
export type PaidMonth = { month: string; dueDate: string; total: number; items: PaidLine[] };

export function paidMonths(lines: PaidLine[]): PaidMonth[] {
  const byMonth = new Map<string, PaidLine[]>();
  for (const l of lines) byMonth.set(l.dueDate.slice(0, 7), [...(byMonth.get(l.dueDate.slice(0, 7)) ?? []), l]);
  return [...byMonth.entries()]
    .map(([month, items]) => ({
      month,
      dueDate: items.reduce((min, it) => (it.dueDate < min ? it.dueDate : min), items[0].dueDate),
      total: round2(items.reduce((s, it) => s + it.amount, 0)),
      items,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}
