import { GROUP_CAPS, RELIEFS, type ReliefDef, type ReliefGroup } from '@/constants/tax-relief';

/** One amount you claim (or plan to claim) under a relief. The year of assessment is the year of its date. */
export type TaxClaim = {
  id: string;
  reliefId: string;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  /** The record it came from, when it was picked from your records. */
  txId?: string;
  /** Made from an expense tagged with this relief: follows that record, so it is changed in Transactions. */
  fromRecord?: boolean;
};

export type ReliefRow = {
  def: ReliefDef;
  /** Everything claimed under this relief. */
  used: number;
  /** The part the limit lets count. */
  counted: number;
  /** Room left under the limit (null for a rebate, which has none). */
  remaining: number | null;
  /** Claimed above the limit. */
  over: number;
};

export type TaxSummary = {
  rows: ReliefRow[];
  /** All reliefs together, with the shared limits applied (rebates not included). */
  reliefTotal: number;
  /** Rebates (zakat), taken off the tax itself. */
  rebateTotal: number;
  groups: Record<ReliefGroup, { counted: number; cap: number; over: number }>;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export const claimYear = (c: Pick<TaxClaim, 'date'>) => Number(c.date.slice(0, 4));

export function claimsOfYear(claims: TaxClaim[], year: number): TaxClaim[] {
  return claims.filter((c) => claimYear(c) === year);
}

export function summarizeTax(claims: TaxClaim[], year: number): TaxSummary {
  const mine = claimsOfYear(claims, year);
  const used = (id: string) => r2(mine.filter((c) => c.reliefId === id).reduce((s, c) => s + c.amount, 0));

  // Each member counts up to its own limit first; the group then counts up to the shared limit.
  const groups = {} as TaxSummary['groups'];
  (Object.keys(GROUP_CAPS) as ReliefGroup[]).forEach((g) => {
    const members = RELIEFS.filter((d) => d.group === g);
    const sum = r2(members.reduce((s, d) => s + Math.min(used(d.id), d.cap ?? Infinity), 0));
    const cap = GROUP_CAPS[g];
    groups[g] = { counted: Math.min(sum, cap), cap, over: r2(Math.max(0, sum - cap)) };
  });

  const rows: ReliefRow[] = RELIEFS.map((def) => {
    const u = used(def.id);
    const cap = def.cap ?? Infinity;
    const own = Math.min(u, cap);
    let remaining: number | null = def.cap === null ? null : r2(Math.max(0, cap - u));
    if (def.group && remaining !== null) {
      const g = groups[def.group];
      remaining = Math.min(remaining, r2(Math.max(0, g.cap - g.counted)));
    }
    return { def, used: u, counted: r2(own), remaining, over: def.cap === null ? 0 : r2(Math.max(0, u - cap)) };
  });

  const ungrouped = rows.filter((r) => !r.def.group && !r.def.rebate).reduce((s, r) => s + r.counted, 0);
  const grouped = (Object.keys(groups) as ReliefGroup[]).reduce((s, g) => s + groups[g].counted, 0);
  const rebateTotal = r2(rows.filter((r) => r.def.rebate).reduce((s, r) => s + r.used, 0));
  return { rows, reliefTotal: r2(ungrouped + grouped), rebateTotal, groups };
}

/** Roughly how much tax the claims save: the counted reliefs at your top rate, plus rebates ringgit for ringgit. */
export function estimateSaving(summary: TaxSummary, ratePct: number | null): number {
  const fromReliefs = ratePct === null ? 0 : (summary.reliefTotal * ratePct) / 100;
  return r2(fromReliefs + summary.rebateTotal);
}

/**
 * Every claim of a person: the ones typed in, plus one for each expense tagged with a relief. A claim picked from
 * a record that is itself tagged is counted once (the tag wins).
 */
export function effectiveClaims(
  manual: TaxClaim[],
  transactions: { id: string; title: string; date: string; amount: number; type: string; taxReliefId?: string }[],
): TaxClaim[] {
  const tagged = transactions.filter((t) => t.type === 'debit' && !!t.taxReliefId);
  const taggedIds = new Set(tagged.map((t) => t.id));
  const own = manual.filter((c) => !(c.txId && taggedIds.has(c.txId)));
  const fromRecords: TaxClaim[] = tagged.map((t) => ({ id: `tx:${t.id}`, reliefId: t.taxReliefId as string, amount: t.amount, date: t.date, note: t.title, txId: t.id, fromRecord: true }));
  return [...own, ...fromRecords];
}
