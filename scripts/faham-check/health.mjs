/** Faham integration checks: the five-area financial health assessment. Run: npm run faham:test */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { buildLedger } = await import('@/utils/ledger');
const { computeHealth, scoreOf, MIN_MEASURED } = await import('@/utils/health');
cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });

let id = 0;
const tx = (o) => ({ id: `t${++id}`, title: 'x', date: '2026-10-10', categoryId: 'food', subcategory: '', amount: 10, type: 'debit', accountId: 'bank', ...o });
const raw = [];
const transfers = [];
for (const m of ['2026-08', '2026-09', '2026-10']) {
  raw.push(tx({ type: 'credit', categoryId: 'income', amount: 5000, date: `${m}-01` }));
  raw.push(tx({ categoryId: 'bills', subcategory: 'Rent', amount: 1500, date: `${m}-02` })); // essential
  raw.push(tx({ categoryId: 'food', amount: 800, date: `${m}-10` })); // essential
  raw.push(tx({ categoryId: 'entertainment', amount: 700, date: `${m}-15` })); // not essential
  transfers.push({ id: `s${m}`, fromAccountId: 'bank', toAccountId: 'asb', amount: 500, date: `${m}-03` });
}
raw.push(tx({ categoryId: 'financial', subcategory: 'Savings', amount: 500, date: '2026-10-20' })); // saving recorded as a record
const L = buildLedger(raw);
const today = '2026-11-08';
const input = {
  entries: L.entries, moved: L.moved, transfers, isSavingsAccount: (a) => a === 'asb', todayKey: today, savingsTarget: 20,
  savingsBalance: 13800, hasSavingsPlace: true, debtMonthly: 1000, debtCount: 1, creditUsed: 600, creditLimit: 2000,
  budgets: [{ categoryId: 'food', limit: 900 }, { categoryId: 'entertainment', limit: 500 }],
};
const h = computeHealth(input);
const d = Object.fromEntries(h.dimensions.map((x) => [x.id, x]));
console.log('dims', JSON.stringify(h.dimensions.map((x) => [x.id, x.score, x.status])), 'overall', h.overall, h.grade);

// Cash flow: kept 2000 of 5000 = 40% vs 20% target -> full 70, all 3 months positive -> +30.
assert.equal(d.cashflow.score, 100);
// Savings: transfers 1500 + one Savings record 500 = 2000 of 15000 income = 13.3% -> 0.7*66.7 + 0.3*100 = 76.7.
assert.equal(d.savings.score, 77);
assert.equal(d.savings.indicators.find((i) => i.id === 'savedRate').value, 13.3);
// Debt: 1000/5000 = 20% -> 66.7; credit 600/2000 = 30% -> 100; 0.6*66.7 + 0.4*100 = 80.
assert.equal(d.debt.score, 80);
// Budget: food within 3 of 3, entertainment over 3 of 3 -> 3 of 6.
assert.equal(d.budget.score, 50);
assert.deepEqual(d.budget.indicators[0], { id: 'within', value: 3, unit: 'count', of: 6 });
// Preparedness: essential = 1500 + 800 = 2300/month (entertainment left out); 13800 / 2300 = 6 months -> 100.
assert.equal(d.preparedness.indicators.find((i) => i.id === 'essentialAvg').value, 2300);
assert.equal(d.preparedness.score, 100);
assert.equal(h.measured, 5);
assert.equal(h.overall, Math.round((100 + 77 + 80 + 50 + 100) / 5));
assert.equal(h.weakest, 'budget');
const sc = scoreOf(h);
assert.equal(sc.total, h.overall);
assert.equal(sc.factors.find((f) => f.id === 'budget').points, 10);

// Missing data is left out, never scored as zero.
const h2 = computeHealth({ ...input, debtCount: 0, debtMonthly: 0, creditLimit: 0, creditUsed: 0, budgets: [] });
assert.equal(h2.dimensions.find((x) => x.id === 'debt').missing, 'noDebts');
assert.equal(h2.dimensions.find((x) => x.id === 'budget').missing, 'noBudgets');
assert.equal(h2.measured, 3);
assert.equal(h2.overall, Math.round((100 + 77 + 100) / 3), 'average of the measured areas only');

// A new user: one month of records -> no overall, no misleading zero.
const h3 = computeHealth({ ...input, entries: buildLedger(raw.filter((x) => x.date >= '2026-10-01')).entries, transfers: [] });
assert.ok(h3.measured < MIN_MEASURED);
assert.equal(h3.overall, null);
assert.equal(scoreOf(h3), null);
assert.equal(h3.dimensions.find((x) => x.id === 'cashflow').missing, 'months');

// No savings place and no saving at all -> savings not measured.
const h4 = computeHealth({ ...input, transfers: [], moved: [], hasSavingsPlace: false, savingsBalance: 0 });
assert.equal(h4.dimensions.find((x) => x.id === 'savings').missing, 'noSavingsPlace');
console.log('health OK');
