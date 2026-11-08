/** Faham integration checks: step 7 (recurring, inflation, emergency fund, payday, debt burden, What-If). Run: npm run faham:test */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { buildLedger } = await import('@/utils/ledger');
const adv = await import('@/utils/advanced');
const { comparePayoff } = await import('@/utils/debt-burden');
const { simulate, NO_CHANGE } = await import('@/utils/what-if');
cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });

let id = 0;
const tx = (o) => ({ id: `t${++id}`, title: 'x', date: '2026-10-10', categoryId: 'food', subcategory: '', amount: 10, type: 'debit', accountId: 'bank', ...o });
const today = '2026-11-08';
const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
const raw = [];
months.forEach((m, i) => {
  raw.push(tx({ type: 'credit', categoryId: 'income', amount: 4000, date: `${m}-25` })); // salary on the 25th
  raw.push(tx({ categoryId: 'bills', subcategory: 'Rent', amount: 1200, date: `${m}-02` }));
  raw.push(tx({ categoryId: 'food', amount: 500 + (i >= 3 ? 300 : 0), date: `${m}-27` })); // food jumps in the latest 3 months, right after pay
  raw.push(tx({ categoryId: 'entertainment', amount: 200, date: `${m}-12` }));
  raw.push(tx({ title: 'Gym KL', categoryId: 'health', amount: 120, date: `${m}-05` })); // repeats, no rule
  raw.push(tx({ title: 'Netflix', categoryId: 'subscriptions', amount: i === 5 ? 55 : 45, date: `${m}-08`, recurringId: 'r1' }));
});
const L = buildLedger(raw);
const rules = [
  { id: 'r1', title: 'Netflix', categoryId: 'subscriptions', subcategory: 'Netflix', amount: 55, type: 'debit', accountId: 'bank', frequency: 'monthly', startDate: '2026-05-08', nextDate: '2026-11-08', active: true },
  { id: 'r2', title: 'netflix ', categoryId: 'subscriptions', subcategory: 'Netflix', amount: 55, type: 'debit', accountId: 'card', frequency: 'monthly', startDate: '2026-10-20', nextDate: '2026-11-20', active: true },
  { id: 'r3', title: 'Salary', categoryId: 'income', subcategory: 'Salary', amount: 4000, type: 'credit', accountId: 'bank', frequency: 'monthly', startDate: '2026-05-25', nextDate: '2026-11-25', active: true },
];

// Recurring
const rec = adv.recurringReview(rules, L.entries, today);
assert.equal(rec.monthly, 110);
assert.equal(rec.annual, 1320);
assert.equal(rec.duplicates.length, 1, 'two Netflix rules flagged');
assert.equal(rec.added.length, 1, 'the second Netflix started in the last 60 days');
assert.equal(rec.changes[0].before, 45);
assert.equal(rec.changes[0].now, 55);
assert.ok(rec.detected.some((d) => d.title === 'Gym KL' && d.average === 120), 'a monthly payment without a rule is spotted');
assert.ok(!rec.detected.some((d) => d.title === 'Netflix'), 'payments made by a rule are not re-detected');
assert.ok(rec.upcoming.every((b) => b.type === 'debit'));

// Inflation: income flat, spending up 300/month in the latest 3 months
const inf = adv.lifestyleInflation(L.entries, today);
assert.equal(inf.incomeGrowth, 0);
assert.ok(inf.spendingGrowth > 10);
assert.equal(inf.inflating, true);
assert.equal(inf.drivers[0].categoryId, 'food');
assert.equal(inf.drivers[0].diff, 300);
assert.equal(adv.lifestyleInflation(buildLedger(raw.filter((x) => x.date >= '2026-08-01')).entries, today), null, 'needs 6 months');

// Emergency fund: essential = rent 1200 + food 800 + gym (health) 120 = 2120/month; Netflix is a commitment too
const ef = adv.emergencyFund(L.entries, 6360, today);
assert.ok(Math.abs(ef.essential - (1200 + 800 + 120 + (45 + 45 + 55) / 3)) < 0.01, `essential ${ef.essential}`);
assert.ok(Math.abs(ef.target6 - ef.essential * 6) < 0.05);
assert.ok(ef.months === 2.9, `months ${ef.months}`);

// Payday: salary on the 25th; 800 food on the 27th falls in the first week
const pay = adv.paydayBehaviour(L.entries, rules, today);
assert.equal(pay.cycles.length, 3);
assert.equal(pay.cycles[0].payDate.slice(8), '25');
assert.equal(pay.nextPayDate, '2026-11-25', 'from the recurring salary rule');
assert.equal(pay.fromRule, true);
assert.ok(pay.dailyFirstWeek > pay.dailyRest);

// Debt payoff: rolling the extra ends sooner; both orders never slower than scheduled
const lines = [
  { id: 'a', name: 'Car', remaining: 12000, remainingPrincipal: 11000, monthly: 600, ratePct: 3, progress: 50, payoffDate: '2028-07-01' },
  { id: 'b', name: 'Phone', remaining: 1200, remainingPrincipal: 1100, monthly: 200, ratePct: 18, progress: 50, payoffDate: '2027-05-01' },
];
const plan = comparePayoff(lines, 200, today);
assert.equal(plan.scheduled.months, 20);
assert.ok(plan.avalanche.months < plan.scheduled.months);
assert.ok(plan.snowball.months <= plan.scheduled.months);
assert.equal(comparePayoff(lines, 0, today).avalanche.months <= 20, true);

// What-If: nothing changes with no levers; each lever moves the right figures
const base = { income: 4000, spending: 2500, categories: [{ categoryId: 'food', amount: 800 }], saving: 300, savingsBalance: 5000, available: 2000, goals: [{ id: 'g', name: 'Trip', remaining: 3000, pace: 300 }], debts: lines, months: 3 };
const b = simulate(base, NO_CHANGE, today);
assert.equal(b.cashFlow, 1500);
assert.equal(b.leftAfterSaving, 1200);
assert.equal(b.available6, 2000 + 1200 * 6);
assert.equal(b.savings12, 5000 + 300 * 12);
assert.equal(b.goalMonths, 10);
const cut = simulate(base, { ...NO_CHANGE, cutCategoryId: 'food', cutAmount: 1000 }, today);
assert.equal(cut.spending, 1700, 'a cut never exceeds what the category costs');
const save = simulate(base, { ...NO_CHANGE, extraSaving: 200, goalId: 'g' }, today);
assert.equal(save.goalMonths, 6);
assert.equal(save.leftAfterSaving, 1000);
const drop = simulate(base, { ...NO_CHANGE, incomePct: -10 }, today);
assert.equal(drop.cashFlow, 1100);
const debt = simulate(base, { ...NO_CHANGE, extraDebt: 200 }, today);
assert.ok(debt.debtMonths < b.debtMonths);
assert.equal(debt.cashFlow, 1300, 'extra debt payment leaves the cash flow');
assert.deepEqual(base.categories, [{ categoryId: 'food', amount: 800 }], 'the base is never changed');
console.log('advanced OK');
