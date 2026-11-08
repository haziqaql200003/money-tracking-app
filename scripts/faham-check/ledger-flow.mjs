/** Faham integration checks: ledger through totals, categories, score, feed and balances. Run: npm run faham:test */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { buildLedger } = await import('@/utils/ledger');
const { windowSummary, categoryTrends, currentWindow, previousWindow, topTitles } = await import('@/utils/insights');
const { buildFeed } = await import('@/utils/insight-feed');
const { computeHealth } = await import('@/utils/health');
const { fixedVsEveryday, records, unusualExpenses, balanceTrend } = await import('@/utils/deep-insights');
cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null });
let id = 0;
const tx = (o) => ({ id: `t${++id}`, title: 'x', date: '2026-10-10', categoryId: 'food', subcategory: '', amount: 10, type: 'debit', accountId: 'a1', ...o });
const raw = [];
for (const m of ['05', '06', '07', '08', '09', '10']) {
  raw.push(tx({ type: 'credit', categoryId: 'income', subcategory: 'Salary', amount: 5000, date: `2026-${m}-01` }));
  raw.push(tx({ categoryId: 'bills', subcategory: 'Rent', amount: 1200, date: `2026-${m}-03` }));
  raw.push(tx({ amount: 900, date: `2026-${m}-12` }));
  raw.push(tx({ categoryId: 'shopping', amount: 600, date: `2026-${m}-15`, accountId: 'card' }));
  raw.push(tx({ categoryId: 'financial', subcategory: 'Credit Card Payment', amount: 600, date: `2026-${m}-25` }));
}
raw.push(tx({ id: 'aj:a1:big', type: 'credit', categoryId: 'otherincome', amount: 3000, date: '2026-10-20' }));
raw.push(tx({ type: 'credit', categoryId: 'otherincome', subcategory: 'Refund', amount: 100, date: '2026-10-21', title: 'Shopee refund' }));
const L = buildLedger(raw);
const w = { from: '2026-10-01', to: '2026-10-31' };
const s = windowSummary(L.entries, w);
assert.deepEqual(s, { income: 5000, spending: 2600, net: 2400, savingsRate: 48 });
const old = windowSummary(raw, w);
console.log('old', JSON.stringify(old), 'new', JSON.stringify(s));
const cats = categoryTrends(L.entries, w, { from: '2026-09-01', to: '2026-09-30' });
assert.ok(cats.every((c) => c.total > 0 && c.categoryId !== 'otherincome'));
assert.ok(!topTitles(L.entries, w).some((r) => r.title === 'Shopee refund'));
const split = fixedVsEveryday(L.entries, w);
assert.equal(split.fixed, 1200, 'manual rent counts as fixed');
assert.equal(split.everyday, 1400);
const rec = records(L.entries, w, ['2026-10'], '2026-10-31');
assert.equal(rec.expenseCount, 3);
// Balance still uses raw: correction + card payment change money.
const bt = balanceTrend(raw, 0, ['2026-10'], '2026-11-08');
assert.equal(bt[0].balance, 6 * (5000 - 1200 - 900 - 600 - 600) + 3000 + 100);
// Score: partial budgets (only food budgeted at 1000) must not fail on rent/shopping.
const budgets = [{ categoryId: 'food', limit: 1000 }];
// Health: partial budgets (only food at 1000) are judged per category, so rent and shopping never "fail" it.
const base = { entries: L.entries, moved: L.moved, transfers: [], isSavingsAccount: () => false, todayKey: '2026-11-08', savingsTarget: 20, savingsBalance: 5000, hasSavingsPlace: true, debtMonthly: 0, debtCount: 0, creditUsed: 0, creditLimit: 0, budgets };
const hl = computeHealth(base);
const byId = (h, id) => h.dimensions.find((d) => d.id === id);
assert.equal(byId(hl, 'budget').score, 100, 'food stays under its budget every month');
assert.equal(byId(hl, 'debt').score, null, 'no debt score without debts');
assert.equal(byId(hl, 'debt').missing, 'noDebts');
const hl2 = computeHealth({ ...base, debtMonthly: 1500, debtCount: 1 });
assert.ok(byId(hl2, 'debt').score < 100);
console.log('health', hl.overall, JSON.stringify(hl.dimensions.map((d) => [d.id, d.score])));
// Feed: debt rule
const feed = buildFeed({ transactions: L.entries, todayKey: '2026-11-08', categoryName: (i) => i, money: (n) => `RM${n.toFixed(0)}`, fixedMonthly: 1200, debtMonthly: 1750, budget: 1000, budgets, savingsBalance: 5000, goals: [] });
const debt = feed.find((f) => f.id === 'debt');
assert.ok(debt && debt.tone === 'warn', 'debt 35% of income -> attention');
console.log('feed ids', feed.map((f) => `${f.id}:${f.tone}`).join(' '));
// Weekend in Kelantan = Fri/Sat
cyc.setPaydayRule({ state: 'KTN' });
assert.equal(cyc.isWeekend('2026-11-06'), true); // Friday
assert.equal(cyc.isWeekend('2026-11-08'), false); // Sunday
console.log('integration OK');
