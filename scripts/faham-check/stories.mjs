/** Faham integration checks: stories on the ledger, and the shareable (masked) view. Run: npm run faham:test */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { buildReport } = await import('@/utils/report-data');
const sc = await import('@/components/story/story-common');
cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });

let id = 0;
const tx = (o) => ({ id: `t${++id}`, title: 'Shop', date: '2026-10-10', categoryId: 'food', subcategory: '', amount: 10, type: 'debit', accountId: 'bank', ...o });
const raw = [
  tx({ type: 'credit', categoryId: 'income', amount: 4000, date: '2026-10-01', title: 'Salary' }),
  tx({ amount: 900, date: '2026-10-05', title: 'Big TV' }),
  tx({ amount: 100, date: '2026-10-06' }),
  tx({ type: 'credit', categoryId: 'otherincome', subcategory: 'Refund', amount: 300, date: '2026-10-07', title: 'TV refund' }),
  tx({ id: 'aj:bank:1', type: 'credit', categoryId: 'otherincome', amount: 5000, date: '2026-10-08', title: '' }),
  tx({ categoryId: 'financial', subcategory: 'Credit Card Payment', amount: 900, date: '2026-10-20' }),
];
const r = buildReport({
  kind: 'month', key: '2026-10', todayKey: '2026-11-08', transactions: raw,
  categoryOf: (c) => ({ name: c }), subName: (s) => s, limits: [], goals: [], goalEntries: [], debts: [], savingsTarget: 20,
});
assert.equal(r.income, 4000, 'a balance correction is not income');
assert.equal(r.spend, 700, 'refund lowers spending; card payment is not spending');
assert.equal(r.net, 3300);
assert.equal(r.moved, 900, 'a card payment is shown as moved money, not spending');
assert.equal(r.biggest[0].title, 'Big TV');
assert.ok(!r.biggest.some((b) => b.amount < 0), 'refunds are never a "biggest purchase"');

// Shareable view
assert.equal(sc.rm0(1234), 'RM 1,234');
sc.setStoryMask(true);
assert.equal(sc.rm0(1234), 'RM ••••');
assert.equal(sc.rm2(5.5), 'RM ••••');
assert.equal(sc.label('Big TV'), '•••');
sc.setStoryMask(false);
assert.equal(sc.label('Big TV'), 'Big TV');
console.log('stories OK');
