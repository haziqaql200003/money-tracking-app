#!/usr/bin/env node
/**
 * Self-test for the Faham ledger (src/utils/ledger.ts). Run: npm run ledger:test
 * Needs Node 22.18+ (it loads the .ts file directly).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLedger, flowTotals, isSpendItem, ledgerKind, percentChange, CORRECTION_PREFIX } from '../src/utils/ledger.ts';

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
};
const tx = (o) => ({ id: `t${n}-${Math.random()}`, title: '', date: '2026-10-10', categoryId: 'food', subcategory: '', amount: 10, type: 'debit', accountId: 'a1', ...o });

test('correction prefix matches utils/saved.ts', () => {
  const saved = readFileSync(new URL('../src/utils/saved.ts', import.meta.url), 'utf8');
  assert.match(saved, new RegExp(`ADJ_PREFIX = '${CORRECTION_PREFIX}'`));
});

test('moved subcategories exist in the default categories', () => {
  const cats = readFileSync(new URL('../src/constants/categories.ts', import.meta.url), 'utf8');
  for (const s of ['Credit Card Payment', 'Loan Payment', 'Personal Loan', 'BNPL', 'Investment', 'Savings', 'Emergency Fund', 'Refund']) {
    assert.ok(cats.includes(`'${s}'`), `missing ${s}`);
  }
});

test('plain income and expense', () => {
  assert.equal(ledgerKind(tx({ type: 'credit', categoryId: 'income', subcategory: 'Salary' })), 'income');
  assert.equal(ledgerKind(tx({})), 'expense');
});

test('refund is a credit under Other Income > Refund only', () => {
  assert.equal(ledgerKind(tx({ type: 'credit', categoryId: 'otherincome', subcategory: 'Refund' })), 'refund');
  assert.equal(ledgerKind(tx({ type: 'credit', categoryId: 'otherincome', subcategory: ' refund ' })), 'refund');
  assert.equal(ledgerKind(tx({ type: 'credit', categoryId: 'otherincome', subcategory: 'Cashback' })), 'income');
  // A debit in that category is still an expense.
  assert.equal(ledgerKind(tx({ type: 'debit', categoryId: 'otherincome', subcategory: 'Refund' })), 'expense');
});

test('balance adjustments are corrections either way', () => {
  assert.equal(ledgerKind(tx({ id: 'aj:acc1:x1', type: 'credit', categoryId: 'otherincome' })), 'correction');
  assert.equal(ledgerKind(tx({ id: 'aj:acc1:x2', type: 'debit', categoryId: 'other' })), 'correction');
});

test('moved money: card, loan, savings, investment payments', () => {
  for (const s of ['Credit Card Payment', 'Loan Payment', 'Personal Loan', 'BNPL', 'Investment', 'Savings', 'Emergency Fund']) {
    assert.equal(ledgerKind(tx({ categoryId: 'financial', subcategory: s })), 'moved', s);
  }
  // Real costs inside Financial stay expenses.
  for (const s of ['Bank Fees', 'Interest', 'Insurance', 'Taxes', '']) {
    assert.equal(ledgerKind(tx({ categoryId: 'financial', subcategory: s })), 'expense', s);
  }
  // Same subcategory name in another category is not moved.
  assert.equal(ledgerKind(tx({ categoryId: 'other', subcategory: 'Savings' })), 'expense');
});

test('buildLedger splits and turns refunds into negative debits', () => {
  const list = [
    tx({ type: 'credit', categoryId: 'income', amount: 5000 }),
    tx({ amount: 300 }),
    tx({ type: 'credit', categoryId: 'otherincome', subcategory: 'Refund', amount: 50 }),
    tx({ id: 'aj:a1:1', type: 'credit', categoryId: 'otherincome', amount: 2000 }),
    tx({ categoryId: 'financial', subcategory: 'Credit Card Payment', amount: 800 }),
  ];
  const l = buildLedger(list);
  assert.equal(l.entries.length, 3);
  assert.equal(l.corrections.length, 1);
  assert.equal(l.moved.length, 1);
  assert.equal(l.refunds.length, 1);
  const r = l.entries.find((e) => e.amount < 0);
  assert.equal(r.type, 'debit');
  assert.equal(r.amount, -50);
  assert.equal(isSpendItem(r), false);
  // The input is not changed.
  assert.equal(list[2].type, 'credit');
  assert.equal(list[2].amount, 50);
});

test('flowTotals: no double counting of a card purchase and its repayment', () => {
  const list = [
    tx({ type: 'credit', categoryId: 'income', amount: 4000, date: '2026-10-01' }),
    tx({ amount: 800, date: '2026-10-05', accountId: 'card' }), // purchase on the card
    tx({ categoryId: 'financial', subcategory: 'Credit Card Payment', amount: 800, date: '2026-10-20' }), // repayment
  ];
  const f = flowTotals(buildLedger(list).entries, '2026-10-01', '2026-10-31');
  assert.deepEqual(f, { income: 4000, spending: 800, net: 3200, savingsRate: 80 });
});

test('flowTotals: refund lowers spending, correction ignored', () => {
  const list = [
    tx({ type: 'credit', categoryId: 'income', amount: 3000 }),
    tx({ amount: 1200 }),
    tx({ type: 'credit', categoryId: 'otherincome', subcategory: 'Refund', amount: 200 }),
    tx({ id: 'aj:a1:9', type: 'credit', amount: 5000, categoryId: 'otherincome' }),
  ];
  const f = flowTotals(buildLedger(list).entries, '2026-10-01', '2026-10-31');
  assert.deepEqual(f, { income: 3000, spending: 1000, net: 2000, savingsRate: 66.7 });
});

test('flowTotals: zero income gives null savings rate; window is inclusive', () => {
  const list = [tx({ amount: 10, date: '2026-10-01' }), tx({ amount: 5, date: '2026-10-31' }), tx({ amount: 99, date: '2026-11-01' })];
  const f = flowTotals(buildLedger(list).entries, '2026-10-01', '2026-10-31');
  assert.deepEqual(f, { income: 0, spending: 15, net: -15, savingsRate: null });
});

test('flowTotals: leap day and money rounding', () => {
  const list = [tx({ amount: 0.1, date: '2028-02-29' }), tx({ amount: 0.2, date: '2028-02-29' })];
  assert.equal(flowTotals(buildLedger(list).entries, '2028-02-29', '2028-02-29').spending, 0.3);
});

test('percentChange guards a tiny base', () => {
  assert.equal(percentChange(120, 3), null);
  assert.equal(percentChange(620, 500), 24);
  assert.equal(percentChange(0, 0), null);
  assert.equal(percentChange(90, 100), -10);
});

console.log(`Ledger self-test OK (${n} tests)`);
