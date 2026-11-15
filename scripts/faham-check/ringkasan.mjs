/** Faham integration checks: Ringkasan numbers (snapshot, allocation, highlights). Run: npm run faham:test */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { buildLedger } = await import('@/utils/ledger');
const { resolvePeriod } = await import('@/utils/faham-period');
const { snapshot, allocation, highlights, keptByDay, incomeSources, KEPT_LINE_POINTS } = await import('@/utils/ringkasan');
cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });

let id = 0;
const tx = (o) => ({ id: `t${++id}`, title: 'x', date: '2026-10-10', categoryId: 'food', subcategory: '', amount: 10, type: 'debit', accountId: 'bank', ...o });
const today = '2026-10-31';
const raw = [
  // September (previous window for 1M)
  tx({ type: 'credit', categoryId: 'income', amount: 4000, date: '2026-09-01' }),
  tx({ categoryId: 'bills', subcategory: 'Rent', amount: 1000, date: '2026-09-02' }),
  tx({ amount: 400, date: '2026-09-10' }),
  tx({ categoryId: 'transport', amount: 300, date: '2026-09-12' }),
  // October
  tx({ type: 'credit', categoryId: 'income', amount: 4000, date: '2026-10-01' }),
  tx({ categoryId: 'bills', subcategory: 'Rent', amount: 1000, date: '2026-10-02' }),
  tx({ amount: 600, date: '2026-10-10' }),
  tx({ categoryId: 'transport', amount: 150, date: '2026-10-12' }),
  tx({ type: 'credit', categoryId: 'otherincome', subcategory: 'Refund', amount: 50, date: '2026-10-15' }),
  tx({ categoryId: 'financial', subcategory: 'Savings', amount: 200, date: '2026-10-20' }), // a savings record
  tx({ categoryId: 'financial', subcategory: 'Credit Card Payment', amount: 300, date: '2026-10-25' }), // not savings
];
const transfers = [
  { id: 'tr1', fromAccountId: 'bank', toAccountId: 'asb', amount: 500, date: '2026-10-26' },
  { id: 'tr2', fromAccountId: 'asb', toAccountId: 'bank', amount: 100, date: '2026-10-28' }, // taken back out
  { id: 'tr3', fromAccountId: 'bank', toAccountId: 'cash', amount: 300, date: '2026-10-05' }, // between spendable accounts
];
const isSavings = (a) => a === 'asb';
const L = buildLedger(raw);
const p = resolvePeriod('1M', today);

const s = snapshot(L.entries, p);
assert.equal(s.comparable, true);
assert.deepEqual(s.now, { income: 4000, spending: 1700, net: 2300, savingsRate: 57.5 });
assert.equal(s.prev.spending, 1700);
assert.equal(s.spendingChange, 0);
assert.equal(s.netDiff, 0);

const a = allocation({ entries: L.entries, moved: L.moved, transfers, isSavingsAccount: isSavings, window: p.window });
assert.deepEqual(a, { income: 4000, fixed: 1000, everyday: 700, saved: 600, left: 1700 });
assert.equal(a.fixed + a.everyday + a.saved + a.left, a.income, 'the parts add up to income');

const h = highlights(L.entries, p, s);
assert.deepEqual(h.map((x) => `${x.kind}:${x.categoryId ?? ''}:${x.diff}`), ['catUp:food:200', 'catDown:transport:-150']);

// New user: records start this month, so there is nothing fair to compare with.
const fresh = buildLedger(raw.filter((x) => x.date >= '2026-10-01'));
const s2 = snapshot(fresh.entries, p);
assert.equal(s2.comparable, false);
assert.equal(s2.incomeChange, null);
assert.deepEqual(highlights(fresh.entries, p, s2), []);

// Zero income: savings rate null, left over negative.
const noInc = buildLedger(raw.filter((x) => x.type === 'debit'));
const a3 = allocation({ entries: noInc.entries, moved: noInc.moved, transfers: [], isSavingsAccount: isSavings, window: p.window });
assert.equal(a3.income, 0);
assert.ok(a3.left < 0);
assert.equal(snapshot(noInc.entries, p).now.savingsRate, null);
// 3.8.1: the hero line ends on the period's net, and money in is grouped by category.
{
  const w = { from: '2026-10-01', to: '2026-10-31' };
  const entries = L.entries;
  const line = keptByDay(entries, w);
  assert.equal(line.length, 31);
  assert.equal(line[line.length - 1], snapshot(entries, resolvePeriod('custom', today, w)).now.net, 'last point = net for the period');
  assert.equal(line[0], 4000, 'salary on the 1st');
  const long = keptByDay(entries, { from: '2025-01-01', to: '2026-10-31' });
  assert.equal(long.length, KEPT_LINE_POINTS, 'long periods are sampled');
  assert.equal(long[long.length - 1], keptByDay(entries, { from: '2025-01-01', to: '2026-10-31' }).at(-1));
  const inc = incomeSources(entries, w);
  assert.deepEqual(inc.map((r) => r.categoryId), ['income'], 'a refund is not income');
}
console.log('ringkasan OK');
