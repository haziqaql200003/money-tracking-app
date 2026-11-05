import type { Category } from '@/constants/categories';
import type { TransactionItem } from '@/context/TransactionsContext';

/** What the scan-receipt Edge Function sends back (already cleaned on the server, but never trusted blindly). */
export type ScanResult = {
  isReceipt: boolean;
  merchant: string;
  date: string;
  total: number;
  currency: string;
  items: { label: string; amount: number }[];
  categoryId: string;
  subcategory: string;
};

/** The fields of the add form that a scan can fill in. Anything left out stays at the form default. */
export type ReceiptPrefill = {
  title: string;
  /** 0 when the total could not be read; the form then leaves the amount empty. */
  amount: number;
  date: string;
  categoryId: string;
  subcategory: string;
  items?: TransactionItem[];
  /** Things the person should double-check before saving. */
  notes: ReceiptNote[];
};

export type ReceiptNote = 'noTotal' | 'noDate' | 'foreignCurrency' | 'itemsDropped';

const round2 = (n: number) => Math.round(n * 100) / 100;

function validDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && localKey(d) === s;
}

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Turns a scan into form defaults. The rules are deliberately cautious: a wrong amount is worse than an empty one,
 * so unreadable or odd values are left blank and flagged instead of guessed.
 */
export function receiptToPrefill(
  scan: ScanResult,
  expenseCategories: Category[],
  today: string,
  newId: () => string,
): ReceiptPrefill {
  const notes: ReceiptNote[] = [];

  const total = Number.isFinite(scan.total) && scan.total > 0 && scan.total < 10_000_000 ? round2(scan.total) : 0;
  if (!total) notes.push('noTotal');

  let date = today;
  if (validDate(scan.date) && scan.date <= today) date = scan.date;
  else notes.push('noDate');

  if (scan.currency && scan.currency.toUpperCase() !== 'MYR' && scan.currency.toUpperCase() !== 'RM') notes.push('foreignCurrency');

  const cat = expenseCategories.find((c) => c.id === scan.categoryId) ?? expenseCategories.find((c) => c.id === 'other') ?? expenseCategories[0];
  const subcategory = cat?.subcategories.includes(scan.subcategory) ? scan.subcategory : (cat?.subcategories[0] ?? '');

  // Line items are only kept when they add up to the total, so the breakdown never contradicts the amount.
  let items: TransactionItem[] | undefined;
  const lines = scan.items.filter((i) => i.label.trim() && Number.isFinite(i.amount) && i.amount !== 0);
  if (lines.length >= 2 && total > 0) {
    const sum = round2(lines.reduce((s, i) => s + i.amount, 0));
    if (Math.abs(sum - total) <= 0.05) {
      items = lines.map((i) => ({ id: newId(), label: i.label.trim().slice(0, 60), amount: round2(i.amount) }));
    } else {
      notes.push('itemsDropped');
    }
  }

  return {
    title: scan.merchant.trim().slice(0, 60),
    amount: total,
    date,
    categoryId: cat?.id ?? '',
    subcategory,
    items,
    notes,
  };
}
