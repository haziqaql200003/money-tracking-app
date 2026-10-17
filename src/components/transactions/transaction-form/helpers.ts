import type { TKey } from '@/i18n';
import { formatDate, mondayIndex, weekdayShort } from '@/i18n/format';
import type { ChargeKind } from '@/utils/charges';

export type DraftItem = { id: string; label: string; amountText: string };

let itemCounter = 0;
export function newItemId() {
  itemCounter += 1;
  return `item_${Date.now()}_${itemCounter}`;
}

/** Extras on a bill. Each can be added once; they sit under the items, not among them. */
export const CHARGES: { kind: ChargeKind; labelKey: TKey; percent: boolean }[] = [
  { kind: 'service', labelKey: 'tx.add.quickServiceCharge', percent: true },
  { kind: 'tax', labelKey: 'tx.add.quickTax', percent: true },
  { kind: 'tip', labelKey: 'tx.add.quickTip', percent: true },
  { kind: 'delivery', labelKey: 'tx.add.quickDelivery', percent: false },
  { kind: 'discount', labelKey: 'tx.add.quickDiscount', percent: true },
];

/** Keeps a percent field to digits and one dot, e.g. "6" or "8.5". */
export function cleanPercent(text: string) {
  const t = text.replace(',', '.').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = t.split('.');
  const out = rest.length ? `${whole}.${rest.join('')}` : whole;
  return out.slice(0, 6);
}

export function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateString(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The date key `offsetDays` from today (0 = today, -1 = yesterday). */
export function dateKeyFromToday(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateString(d);
}

export function formatDisplayDate(iso: string) {
  const d = parseDateString(iso);
  return `${weekdayShort(mondayIndex(d))}, ${formatDate(d)}`;
}

export function isValidAmount(raw: string) {
  if (!raw.trim()) return false;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0;
}
