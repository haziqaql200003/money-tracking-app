import { useState } from 'react';

import type { Transaction } from '@/context/TransactionsContext';
import { computeBill, type ChargeDraft, type ChargeKind, type ChargeMode } from '@/utils/charges';

import { isValidAmount, newItemId, type DraftItem } from './helpers';

/** The "Breakdown" of a transaction: line items plus extras (service charge, tax, tip, delivery, discount). */
export function useBreakdown(editing?: Transaction | null) {
  const [breakdownOn, setBreakdownOn] = useState(!!editing?.items && editing.items.length > 0);
  const [items, setItems] = useState<DraftItem[]>(
    () => editing?.items?.map((it) => ({ id: it.id, label: it.label, amountText: it.amount ? String(it.amount) : '' })) ?? [],
  );
  const [charges, setCharges] = useState<ChargeDraft[]>([]);

  const itemsTotal = items.reduce((sum, it) => {
    const n = parseFloat(it.amountText.replace(',', '.'));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const bill = computeBill(itemsTotal, charges);
  const grandTotal = bill.total;

  /** Turning it on seeds the first line with the amount already typed. */
  function toggle(next: boolean, amount: string) {
    setBreakdownOn(next);
    if (next && items.length === 0) {
      const seed = isValidAmount(amount) ? parseFloat(amount.replace(',', '.')) : 0;
      setItems([{ id: newItemId(), label: '', amountText: seed > 0 ? String(seed) : '' }]);
    }
  }

  function addItem(label = '') {
    setItems((prev) => [...prev, { id: newItemId(), label, amountText: '' }]);
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  // Extras are kept apart from the numbered items, and each kind can only be added once.
  function addCharge(kind: ChargeKind) {
    setCharges((prev) => (prev.some((c) => c.kind === kind) ? prev : [...prev, { kind, mode: kind === 'delivery' ? 'amount' : 'percent', value: '' }]));
  }

  function updateCharge(kind: ChargeKind, patch: Partial<ChargeDraft>) {
    setCharges((prev) => prev.map((c) => (c.kind === kind ? { ...c, ...patch } : c)));
  }

  function removeCharge(kind: ChargeKind) {
    setCharges((prev) => prev.filter((c) => c.kind !== kind));
  }

  function setChargeMode(kind: ChargeKind, mode: ChargeMode) {
    // A typed "10" means ten percent or ten ringgit, so switching clears it rather than reinterpreting it.
    setCharges((prev) => prev.map((c) => (c.kind === kind && c.mode !== mode ? { ...c, mode, value: '' } : c)));
  }

  return { breakdownOn, items, charges, itemsTotal, bill, grandTotal, toggle, addItem, updateItem, removeItem, addCharge, updateCharge, removeCharge, setChargeMode };
}

export type Breakdown = ReturnType<typeof useBreakdown>;
