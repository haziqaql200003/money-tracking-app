/**
 * Faham QA cross-check: the same money must give the same totals everywhere (acceptance criterion 8, no double counting).
 * A seeded random year of records (income, purchases, refunds, balance corrections, moved money) is read through
 * Ringkasan (snapshot), the stories (buildReport) and the ledger (flowTotals), under two payday rules. Run: npm run faham:test
 */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { buildLedger, flowTotals } = await import('@/utils/ledger');
const { resolvePeriod } = await import('@/utils/faham-period');
const { snapshot } = await import('@/utils/ringkasan');
const { buildReport } = await import('@/utils/report-data');

let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pad = (n) => String(n).padStart(2, '0');
let id = 0;
const raw = [];
const add = (o) => raw.push({ id: `t${++id}`, title: 'Shop', subcategory: '', accountId: 'bank', type: 'debit', categoryId: 'food', ...o });
for (let m = 1; m <= 10; m++) {
  add({ type: 'credit', categoryId: 'income', amount: 4500, date: `2026-${pad(m)}-25`, title: 'Salary' });
  for (let d = 1; d <= 28; d++) {
    const date = `2026-${pad(m)}-${pad(d)}`;
    if (rnd() < 0.7) add({ amount: Math.round(rnd() * 8000) / 100 + 1, date, categoryId: ['food', 'transport', 'shopping', 'bills'][Math.floor(rnd() * 4)] });
    if (rnd() < 0.05) add({ type: 'credit', categoryId: 'otherincome', subcategory: 'Refund', amount: Math.round(rnd() * 3000) / 100 + 1, date, title: 'Refund' });
    if (rnd() < 0.03) add({ id: `aj:bank:${id}`, type: rnd() < 0.5 ? 'credit' : 'debit', categoryId: 'otherincome', amount: 250, date, title: '' });
    if (rnd() < 0.04) add({ categoryId: 'financial', subcategory: ['Savings', 'Credit Card Payment', 'Loan Payment'][Math.floor(rnd() * 3)], amount: 300, date });
  }
}
const entries = buildLedger(raw).entries;
const inp = { todayKey: '2026-11-08', transactions: raw, categoryOf: (c) => ({ name: c }), subName: (s) => s, limits: [], goals: [], goalEntries: [], debts: [], savingsTarget: 20 };
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 0.011, `${what}: ${a} vs ${b}`);

let checks = 0;
for (const rule of [{ day: 1 }, { day: 25 }]) {
  cyc.setPaydayRule({ ...rule, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });
  let sumIncome = 0;
  let sumSpend = 0;
  for (let m = 1; m <= 10; m++) {
    const key = `2026-${pad(m)}`;
    const r = buildReport({ ...inp, kind: 'month', key });
    const f = flowTotals(entries, r.period.from, r.period.end);
    near(r.income, f.income, `month ${key} income (payday ${rule.day})`);
    near(r.spend, f.spending, `month ${key} spending (payday ${rule.day})`);
    near(r.net, f.net, `month ${key} net`);
    // Ringkasan over the same window gives the same numbers
    const p = resolvePeriod('custom', '2026-11-08', { from: r.period.from, to: r.period.end });
    const s = snapshot(entries, p);
    near(s.now.income, f.income, `ringkasan ${key} income`);
    near(s.now.spending, f.spending, `ringkasan ${key} spending`);
    // A balance correction never shows as income or spending
    assert.ok(!entries.some((e) => e.id.startsWith('aj:')), 'corrections are out of the ledger');
    if (rule.day === 1) {
      sumIncome += r.income;
      sumSpend += r.spend;
    }
    checks += 5;
  }
  if (rule.day === 1) {
    // With calendar months, ten months add up to the year: nothing counted twice or dropped
    const y = flowTotals(entries, '2026-01-01', '2026-10-31');
    near(sumIncome, y.income, 'months add up to the year (income)');
    near(sumSpend, y.spending, 'months add up to the year (spending)');
    checks += 2;
  }
}
// Moved money is reported beside spending, never inside it
cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });
const oct = buildReport({ ...inp, kind: 'month', key: '2026-10' });
const movedOct = raw.filter((t) => t.categoryId === 'financial' && t.date >= '2026-10-01' && t.date <= '2026-10-31').reduce((s, t) => s + t.amount, 0);
near(oct.moved, movedOct, 'moved money in October');
checks++;
console.log(`crosscheck OK (${checks} checks, ${raw.length} records)`);
