import type { TKey } from '@/i18n';

/**
 * A receipt pasted as JSON (what ChatGPT, Gemini or another scanner gives back from a photo):
 *   { "merchant": "Soru Station", "date": "2026-11-03", "items": [{ "name": "Chicken XL", "quantity": 1, "price": 18.90 }],
 *     "subtotal": 114.60, "sst": 6.88, "rounding": 0.02, "total": 121.50, "payment_method": "Card" }
 * becomes ONE expense with its line items, tax and rounding as lines, so the lines add up to the total.
 * Nothing here trusts the JSON blindly: every number is checked and the total must match, or the items are left out.
 */

export type JsonReceipt = {
  merchant: string;
  date?: string;
  total: number;
  currency?: string;
  payment?: string;
  /** Items, then tax / service / delivery / discount / rounding lines. */
  lines: { label: string; amount: number }[];
  /** True when the lines add up to the total (within 5 sen). */
  adds: boolean;
  /** What the lines add up to. */
  sum: number;
};

type Obj = Record<string, unknown>;
const r2 = (n: number) => Math.round(n * 100) / 100;

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/rm|myr|,|\s/gi, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const pick = (o: Obj, keys: string[]) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

/** The JSON object in a message, also inside ```json fences or with words around it. */
function parse(text: string): Obj | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const v: unknown = JSON.parse(body.slice(start, end + 1));
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null;
  } catch {
    return null;
  }
}

/** Extras that are part of what was paid, as their own lines. Discounts become negative lines. */
const EXTRAS: { keys: string[]; labelKey: TKey; sign: 1 | -1 }[] = [
  { keys: ['service_charge', 'service', 'serviceCharge', 'service_tax'], labelKey: 'tx.add.quickServiceCharge', sign: 1 },
  { keys: ['sst', 'tax', 'gst', 'vat', 'tax_amount'], labelKey: 'tx.add.quickTax', sign: 1 },
  { keys: ['delivery', 'delivery_fee', 'delivery_charges', 'deliveryFee'], labelKey: 'tx.add.quickDelivery', sign: 1 },
  { keys: ['tip', 'tips'], labelKey: 'tx.add.quickTip', sign: 1 },
  { keys: ['discount', 'discounts', 'voucher'], labelKey: 'tx.add.quickDiscount', sign: -1 },
  { keys: ['rounding', 'rounding_adjustment', 'round'], labelKey: 'ai.b.json.rounding', sign: 1 },
];

export function readJsonReceipt(text: string, t: (k: TKey) => string): JsonReceipt | null {
  if (!text.includes('{')) return null;
  const o = parse(text);
  if (!o) return null;
  const total = num(pick(o, ['total', 'grand_total', 'amount', 'total_amount', 'amount_paid', 'paid']));
  const merchant = str(pick(o, ['merchant', 'store', 'shop', 'vendor', 'restaurant', 'name', 'title']));
  const rawItems = pick(o, ['items', 'line_items', 'lines', 'products']);
  if (total === undefined || total <= 0 || total > 1_000_000 || !merchant) return null;

  const items: { label: string; amount: number }[] = [];
  if (Array.isArray(rawItems)) {
    const parsed = rawItems.slice(0, 60).flatMap((it) => {
      if (!it || typeof it !== 'object') return [];
      const x = it as Obj;
      const label = str(pick(x, ['name', 'label', 'description', 'item', 'title']));
      const qty = num(pick(x, ['quantity', 'qty', 'count'])) ?? 1;
      const price = num(pick(x, ['price', 'amount', 'unit_price', 'total', 'line_total']));
      const lineTotal = num(pick(x, ['line_total', 'total', 'amount']));
      if (!label || price === undefined) return [];
      return [{ label, qty: qty > 0 ? qty : 1, price, lineTotal }];
    });
    // Is "price" the price of the line, or of one unit? Use whichever agrees with the subtotal.
    const subtotal = num(pick(o, ['subtotal', 'sub_total']));
    const asLine = parsed.reduce((s, x) => s + (x.lineTotal ?? x.price), 0);
    const asUnit = parsed.reduce((s, x) => s + x.price * x.qty, 0);
    const perUnit = subtotal !== undefined && Math.abs(asUnit - subtotal) < Math.abs(asLine - subtotal) - 0.001;
    for (const x of parsed) {
      const amount = r2(perUnit ? x.price * x.qty : (x.lineTotal ?? x.price));
      items.push({ label: `${Math.round(x.qty) === x.qty ? x.qty : 1}x ${x.label}`.slice(0, 60), amount });
    }
  }
  for (const e of EXTRAS) {
    const v = num(pick(o, e.keys));
    if (v !== undefined && Math.abs(v) >= 0.005) items.push({ label: t(e.labelKey), amount: r2(e.sign === -1 ? -Math.abs(v) : v) });
  }
  const sum = r2(items.reduce((s, x) => s + x.amount, 0));
  const dateRaw = str(pick(o, ['date', 'transaction_date', 'datetime']));
  const date = dateRaw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const currency = str(pick(o, ['currency'])).toUpperCase() || undefined;
  return {
    merchant: merchant.slice(0, 60),
    date,
    total: r2(total),
    currency,
    payment: str(pick(o, ['payment_method', 'payment', 'paid_with', 'card'])) || undefined,
    lines: items,
    adds: items.length >= 2 && Math.abs(sum - total) <= 0.05,
    sum,
  };
}
