import { addMonths, instalmentAmount, isFinished, lastDueDate, nextInstalment, progressPercent, remainingPrincipal, unpaid, type Debt } from '@/utils/debts';

/**
 * Debt burden for Faham: what is still owed, what it costs each month, when it ends, and how much faster it could end.
 * Total debt (what is owed) and the monthly obligation (what is paid each month) are kept apart on purpose.
 */

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export type DebtLine = {
  id: string;
  name: string;
  /** Unpaid instalments, principal plus interest/fee, as scheduled. */
  remaining: number;
  remainingPrincipal: number;
  /** The next instalment. */
  monthly: number;
  ratePct: number;
  progress: number;
  payoffDate: string | null;
};

export type DebtBurden = {
  lines: DebtLine[];
  /** Everything still owed: unpaid instalments plus money used on credit lines. */
  outstanding: number;
  creditUsed: number;
  /** What the instalments and loans take each month. */
  monthly: number;
  /** monthly ÷ average monthly income, in percent; null without income. */
  dti: number | null;
  /** The last scheduled payment of all instalment debts. */
  debtFreeDate: string | null;
  /** Share of all scheduled principal already repaid. */
  progress: number;
};

export function debtBurden(debts: Debt[], creditUsed: number, avgIncome: number): DebtBurden | null {
  const active = debts.filter((d) => d.kind !== 'credit' && !isFinished(d));
  if (active.length === 0 && creditUsed <= 0) return null;
  const lines: DebtLine[] = active
    .map((d) => {
      const next = nextInstalment(d);
      return {
        id: d.id,
        name: d.name,
        remaining: r2(unpaid(d).reduce((s, i) => s + instalmentAmount(i), 0)),
        remainingPrincipal: remainingPrincipal(d),
        monthly: next ? instalmentAmount(next) : 0,
        ratePct: d.ratePct,
        progress: progressPercent(d),
        payoffDate: lastDueDate(d),
      };
    })
    .sort((a, b) => b.remaining - a.remaining);
  const monthly = r2(lines.reduce((s, l) => s + l.monthly, 0));
  const totalPrincipal = active.reduce((s, d) => s + d.schedule.reduce((a, i) => a + i.principal, 0), 0);
  const left = lines.reduce((s, l) => s + l.remainingPrincipal, 0);
  const dates = lines.map((l) => l.payoffDate).filter((x): x is string => !!x).sort();
  return {
    lines,
    outstanding: r2(lines.reduce((s, l) => s + l.remaining, 0) + Math.max(0, creditUsed)),
    creditUsed: r2(Math.max(0, creditUsed)),
    monthly,
    dti: avgIncome > 0 ? r1((monthly / avgIncome) * 100) : null,
    debtFreeDate: dates.length ? dates[dates.length - 1] : null,
    progress: totalPrincipal > 0 ? r1(((totalPrincipal - left) / totalPrincipal) * 100) : 0,
  };
}

export type PayoffPlan = { months: number; debtFree: string };
export type PayoffComparison = { scheduled: PayoffPlan; avalanche: PayoffPlan; snowball: PayoffPlan };

/**
 * Months until every instalment debt is cleared:
 *   scheduled  each debt paid by its own instalment, nothing extra
 *   avalanche  `extra` a month, plus each finished debt's instalment, goes to the highest rate first
 *   snowball   the same money goes to the smallest balance first
 * Assumption (shown in the app): the scheduled amounts already include interest/fees, and paying early is not assumed
 * to cut them, which is true of flat-rate plans. So the plans differ in TIME, not in interest saved.
 */
export function comparePayoff(lines: DebtLine[], extra: number, todayKey: string): PayoffComparison | null {
  const debts = lines.filter((l) => l.remaining > 0 && l.monthly > 0);
  if (debts.length === 0) return null;
  const run = (order: DebtLine[] | null) => {
    const rem = new Map(debts.map((d) => [d.id, d.remaining]));
    let m = 0;
    while ([...rem.values()].some((v) => v > 0.005) && m < 600) {
      m++;
      let pool = order ? Math.max(0, extra) : 0;
      for (const d of debts) {
        const r = rem.get(d.id) ?? 0;
        if (r <= 0.005) {
          if (order) pool += d.monthly; // a finished debt's instalment rolls over
          continue;
        }
        const pay = Math.min(r, d.monthly);
        rem.set(d.id, r - pay);
        if (order) pool += d.monthly - pay;
      }
      if (order) {
        for (const d of order) {
          if (pool <= 0) break;
          const r = rem.get(d.id) ?? 0;
          if (r <= 0.005) continue;
          const p = Math.min(r, pool);
          rem.set(d.id, r - p);
          pool -= p;
        }
      }
    }
    return { months: m, debtFree: addMonths(todayKey, m) };
  };
  const avalanche = [...debts].sort((a, b) => b.ratePct - a.ratePct || a.remaining - b.remaining);
  const snowball = [...debts].sort((a, b) => a.remaining - b.remaining || b.ratePct - a.ratePct);
  return { scheduled: run(null), avalanche: run(avalanche), snowball: run(snowball) };
}
