/** Faham integration checks: the tinted month table and the forecast range (utils/deep-trends). Run: npm run faham:test */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { trendTint, rowAverage, outlookRange } = await import('@/utils/deep-trends');

cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });
const today = '2026-11-08';

// Tints: against the row's own average.
assert.equal(trendTint(110, 100), 'up2');
assert.equal(trendTint(109.99, 100), 'up1');
assert.equal(trendTint(105, 100), 'up1');
assert.equal(trendTint(104, 100), null);
assert.equal(trendTint(96, 100), null);
assert.equal(trendTint(95, 100), 'down');
assert.equal(trendTint(0, 100), 'down');
assert.equal(trendTint(50, 0), null);

// Average: from the first month with records, without the running month.
assert.equal(rowAverage([0, 0, 100, 200, 300, 999], 2, true), 200);
assert.equal(rowAverage([100, 0, 200], 0, false), 100);
assert.equal(rowAverage([500], 0, true), 0);

// Range: quietest and busiest everyday daily rate of past cycles.
let n = 0;
const tx = (date, amount, extra = {}) => ({ id: `t${++n}`, type: 'debit', date, amount, categoryId: 'food', title: '', accountId: 'a', ...extra });
const entries = [
  tx('2026-10-05', 310), // Oct: 31 days → 10/day
  tx('2026-09-10', 600), // Sep: 30 days → 20/day
  tx('2026-09-11', 900, { recurringId: 'r1' }), // bills are not everyday spending
  { ...tx('2026-08-03', 5000), type: 'credit' }, // income is not spending
];
const o = { spentSoFar: 100, billsAhead: 50, daysLeft: 22, projected: 150 + 12 * 22 };
const r = outlookRange(entries, today, o);
assert.deepEqual(r, { low: 150 + 10 * 22, high: 150 + 20 * 22, cyclesUsed: 2 });
assert.ok(r.low <= o.projected && o.projected <= r.high);
// The projection is always inside the range.
const wide = outlookRange(entries, today, { ...o, projected: 1000 });
assert.equal(wide.high, 1000);
// Not enough history, or no days left: no range.
assert.equal(outlookRange([tx('2026-10-05', 310)], today, o), null);
assert.equal(outlookRange(entries, today, { ...o, daysLeft: 0 }), null);

console.log('deep-trends: ok');
