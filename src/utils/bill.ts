/**
 * Bill extras for an itemised receipt: service charge, SST/tax, tip, delivery fee and discount.
 * Percentages are worked out for the user, in the order a Malaysian receipt does it:
 *   discount comes off the items first, service charge and tip are a % of that,
 *   and SST/tax is a % of (items - discount + service charge).
 */

export type ChargeKind = 'service' | 'tax' | 'tip' | 'delivery' | 'discount';
export type ChargeMode = 'percent' | 'amount';
export type ChargeDraft = { kind: ChargeKind; mode: ChargeMode; value: string };
export type ChargeResult = { kind: ChargeKind; amount: number; base: number; percent: number | null };

export const CHARGE_ORDER: ChargeKind[] = ['service', 'tax', 'tip', 'delivery', 'discount'];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function num(text: string): number {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Signed amounts (discount is negative) in CHARGE_ORDER, plus the grand total. */
export function computeBill(subtotal: number, charges: ChargeDraft[]): { results: ChargeResult[]; total: number } {
  const get = (k: ChargeKind) => charges.find((c) => c.kind === k);
  const pick = (c: ChargeDraft | undefined, base: number) => {
    if (!c) return { amount: 0, percent: null as number | null };
    if (c.mode === 'percent' && c.kind !== 'delivery') {
      const p = num(c.value);
      return { amount: round2((base * p) / 100), percent: p };
    }
    return { amount: round2(num(c.value)), percent: null as number | null };
  };

  const disc = pick(get('discount'), subtotal);
  const discount = Math.min(disc.amount, Math.max(subtotal, 0));
  const afterDiscount = subtotal - discount;

  const service = pick(get('service'), afterDiscount);
  const taxBase = afterDiscount + service.amount;
  const tax = pick(get('tax'), taxBase);
  const tip = pick(get('tip'), afterDiscount);
  const delivery = pick(get('delivery'), 0);

  const byKind: Record<ChargeKind, ChargeResult> = {
    service: { kind: 'service', amount: service.amount, base: afterDiscount, percent: service.percent },
    tax: { kind: 'tax', amount: tax.amount, base: taxBase, percent: tax.percent },
    tip: { kind: 'tip', amount: tip.amount, base: afterDiscount, percent: tip.percent },
    delivery: { kind: 'delivery', amount: delivery.amount, base: 0, percent: null },
    discount: { kind: 'discount', amount: -discount, base: subtotal, percent: disc.percent },
  };
  const results = CHARGE_ORDER.filter((k) => get(k)).map((k) => byKind[k]);
  const total = round2(subtotal + results.reduce((s, r) => s + r.amount, 0));
  return { results, total };
}
