/** Faham integration checks: insight engine v2 (evidence, severity, de-duplication, dismissal, history). Run: npm run faham:test */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { buildLedger } = await import('@/utils/ledger');
const { buildFeed } = await import('@/utils/insight-feed');
const eng = await import('@/utils/insight-engine');
cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });

let id = 0;
const tx = (o) => ({ id: `t${++id}`, title: 'x', date: '2026-10-10', categoryId: 'food', subcategory: '', amount: 10, type: 'debit', accountId: 'a1', ...o });
const raw = [];
const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
months.forEach((m, i) => {
  raw.push(tx({ type: 'credit', categoryId: 'income', amount: 4000, date: `${m}-01` }));
  raw.push(tx({ categoryId: 'bills', subcategory: 'Rent', amount: 1500, date: `${m}-02` }));
  raw.push(tx({ amount: 600 + i * 150, date: `${m}-12` })); // food creeping up
  for (let d = 3; d <= 27; d += 3) raw.push(tx({ title: 'Kopi', amount: 6, date: `${m}-${String(d).padStart(2, '0')}` }));
});
for (let d = 1; d <= 7; d++) raw.push(tx({ title: 'Kopi', amount: 6, date: `2026-11-0${d}` }));
raw.push(tx({ categoryId: 'shopping', title: 'TV', amount: 1800, date: '2026-11-05' }));
const L = buildLedger(raw);
const today = '2026-11-08';
const feed = buildFeed({
  transactions: L.entries, todayKey: today, categoryName: (c) => c, money: (n) => `RM${Math.round(n)}`,
  fixedMonthly: 1500, debtMonthly: 1400, budget: 800, budgets: [{ categoryId: 'food', limit: 800 }], savingsBalance: 1000,
  goals: [{ name: 'Car', outlook: 'off', need: 500, pace: 100 }, { name: 'Trip', outlook: 'on', need: 200, pace: 250 }],
});
assert.ok(feed.length >= 6, `expected a full feed, got ${feed.map((f) => f.id)}`);
for (const f of feed) {
  assert.ok(f.category, `${f.id} has a category`);
  assert.ok(f.confidence, `${f.id} has confidence`);
  assert.ok(f.how, `${f.id} explains how`);
  assert.ok(f.evidence && f.evidence.length > 0, `${f.id} has evidence`);
  if (!f.id.startsWith('goal')) assert.ok(f.period, `${f.id} has a period`);
}
assert.ok(feed.some((f) => f.id === 'goalOn'), 'a goal on track is reported');

const income = 4000;
const ranked = eng.rankInsights(feed, income);
const sev = Object.fromEntries(ranked.map((r) => [r.id, r.severity]));
console.log('ranked', ranked.map((r) => `${r.id}:${r.severity}:${r.confidence}:${r.priority}`).join(' '));
assert.equal(sev.debt, 'attention', 'debt at 35% of income is worth attention');
assert.equal(sev.goal0, 'attention', 'a late goal is never critical');
for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].priority >= ranked[i].priority, 'sorted by priority');
assert.equal(ranked[ranked.length - 1].severity === 'critical', false);

// Severity rules.
assert.equal(eng.severityOf({ id: 'x', tone: 'bad', title: '', body: '', impact: 500 }, 4000, 'high'), 'critical');
assert.equal(eng.severityOf({ id: 'x', tone: 'bad', title: '', body: '', impact: 500 }, 4000, 'low'), 'attention', 'low confidence never critical');
assert.equal(eng.severityOf({ id: 'x', tone: 'bad', title: '', body: '', impact: 100 }, 4000, 'high'), 'attention', 'small impact never critical');
assert.equal(eng.severityOf({ id: 'x', tone: 'bad', title: '', body: '', impact: 5000 }, 0, 'high'), 'attention', 'no income, no critical on amount');
assert.equal(eng.severityOf({ id: 'x', tone: 'warn', title: '', body: '', impact: 20 }, 4000, 'low'), 'opportunity');
assert.equal(eng.severityOf({ id: 'x', tone: 'good', title: '', body: '' }, 4000, 'high'), 'positive');

// De-duplication: two spending warnings about Food keep only the stronger one.
const dup = eng.rankInsights([
  { id: 'why', tone: 'warn', title: 'a', body: '', category: 'spending', impact: 300, subjectCategoryId: 'food', confidence: 'high' },
  { id: 'spike', tone: 'warn', title: 'b', body: '', category: 'spending', impact: 100, subjectCategoryId: 'food', confidence: 'high' },
  { id: 'improved', tone: 'good', title: 'c', body: '', category: 'positive', impact: 50, subjectCategoryId: 'food' },
], 4000);
assert.deepEqual(dup.map((d) => d.id), ['why', 'improved']);

// Dismissal, cooldown, escalation, history.
let st = eng.EMPTY_INSIGHT_STATE;
const att = dup[0];
st = eng.dismiss(st, att, today);
assert.equal(st.dismissed[att.key].until, '2026-11-22', 'attention hides for 14 days');
assert.equal(eng.applyState(dup, st, '2026-11-10').hidden.length, 1);
assert.equal(eng.applyState(dup, st, '2026-11-22').hidden.length, 0, 'back after the cooldown');
const worse = [{ ...att, severity: 'critical' }];
assert.equal(eng.applyState(worse, st, '2026-11-10').shown.length, 1, 'an escalation shows at once');
st = eng.restore(st, att.key);
assert.equal(st.dismissed[att.key], undefined);
let h = eng.recordHistory(st, dup, today);
assert.notEqual(h, st);
assert.equal(eng.recordHistory(h, dup, today), h, 'no change, same object (no save loop)');
const later = eng.recordHistory(h, [], '2027-06-01');
assert.equal(Object.keys(later.history).length, 0, 'history older than 180 days is dropped');
console.log('insight engine OK');
