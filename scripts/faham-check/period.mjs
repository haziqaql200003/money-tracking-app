/** Faham integration checks: the period model (presets, YTD, custom, bars). Run: npm run faham:test */
import assert from 'node:assert/strict';
const cyc = await import('@/utils/cycle');
const { resolvePeriod, normaliseRange, grainForPeriod, rangeLabel, stepCycle } = await import('@/utils/faham-period');
const { periodsForRange, periodsFor } = await import('@/utils/periods');
const { setLanguage } = await import('@/i18n').catch(() => ({}));
if (setLanguage) setLanguage('en');

cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });
const today = '2026-11-08';

// Presets keep their old windows.
let p = resolvePeriod('3M', today);
assert.deepEqual(p.window, { from: '2026-09-01', to: today });
assert.deepEqual(p.keys, ['2026-09', '2026-10', '2026-11']);
assert.equal(p.live, true);
assert.equal(grainForPeriod(p), 'month');
assert.equal(grainForPeriod(resolvePeriod('1M', today)), 'week');
// The 1M/3M/6M/12M bars match what periodsFor produced before step 2.
for (const [pr, n] of [['1M', 1], ['6M', 6], ['12M', 12]]) {
  const q = resolvePeriod(pr, today);
  assert.deepEqual(periodsForRange(q.window, q.keys, grainForPeriod(q), q.live), periodsFor(today, n, grainForPeriod(q)), pr);
}

// YTD: Jan 1 to today, compared with Jan 1 to the same day last year.
p = resolvePeriod('YTD', today);
assert.deepEqual(p.window, { from: '2026-01-01', to: today });
assert.deepEqual(p.previous, { from: '2025-01-01', to: '2025-11-08' });
assert.equal(p.months, 11);

// YTD with payday 25: 26 Dec 2026 already belongs to the January 2027 cycle, so the new year has begun.
cyc.setPaydayRule({ day: 25 });
p = resolvePeriod('YTD', '2026-12-26');
assert.deepEqual(p.keys, ['2027-01']);
assert.equal(p.window.from, '2026-12-25');
cyc.setPaydayRule({ day: 1 });

// Custom: ordered, capped at today, compared with the same number of days just before.
p = resolvePeriod('custom', today, { from: '2026-10-31', to: '2026-10-01' });
assert.deepEqual(p.window, { from: '2026-10-01', to: '2026-10-31' });
assert.deepEqual(p.previous, { from: '2026-08-31', to: '2026-09-30' });
assert.equal(p.days, 31);
assert.equal(p.live, false);
assert.deepEqual(normaliseRange({ from: '2026-11-01', to: '2027-03-01' }, today), { from: '2026-11-01', to: today });
// Leap year: 29 Feb counted.
p = resolvePeriod('custom', today, { from: '2024-02-01', to: '2024-02-29' });
assert.equal(p.days, 29);
assert.deepEqual(p.previous, { from: '2024-01-03', to: '2024-01-31' });
// A past custom range is cut at its own ends (no bar runs past the last picked day).
p = resolvePeriod('custom', today, { from: '2026-06-15', to: '2026-09-10' });
const bars = periodsForRange(p.window, p.keys, grainForPeriod(p), p.live);
assert.equal(bars[0].from, '2026-06-15');
assert.equal(bars[bars.length - 1].to, '2026-09-10');
assert.equal(bars.length, 4);
// Very long ranges are cut to 5 years.
p = resolvePeriod('custom', today, { from: '2000-01-01', to: today });
assert.ok(p.days <= 5 * 366);

assert.equal(rangeLabel({ from: '2026-10-01', to: '2026-11-08' }), '1 Oct – 8 Nov 2026');
assert.equal(rangeLabel({ from: '2025-12-15', to: '2026-01-08' }), '15 Dec 2025 – 8 Jan 2026');
// 3.8.1: one past payday month ('cycle'), and stepping with the pill's arrows.
{
  const oct = resolvePeriod('cycle', today, null, '2026-10');
  assert.deepEqual(oct.window, { from: '2026-10-01', to: '2026-10-31' }, 'a past cycle is the whole cycle');
  assert.deepEqual(oct.previous, { from: '2026-09-01', to: '2026-09-30' }, 'compared with the whole cycle before');
  assert.equal(oct.cycleKey, '2026-10');
  assert.equal(oct.live, false);
  const now = resolvePeriod('cycle', today, null, '2026-11');
  assert.equal(now.preset, '1M', 'the running cycle is the same as 1M');
  assert.equal(resolvePeriod('1M', today).cycleKey, '2026-11');
  assert.equal(resolvePeriod('6M', today).cycleKey, null, 'longer periods do not step');
  assert.deepEqual(stepCycle(resolvePeriod('1M', today), -1, today), { preset: 'cycle', cycleKey: '2026-10' });
  assert.equal(stepCycle(resolvePeriod('1M', today), 1, today), null, 'cannot step past the running month');
  assert.deepEqual(stepCycle(oct, 1, today), { preset: '1M' }, 'stepping into the running month gives 1M');
  assert.deepEqual(stepCycle(resolvePeriod('cycle', today, null, '2026-01'), -1, today), { preset: 'cycle', cycleKey: '2025-12' }, 'steps across a new year');
  // Payday on the 25th: the October cycle runs 25 Sep - 24 Oct.
  cyc.setPaydayRule({ day: 25, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });
  const oct25 = resolvePeriod('cycle', today, null, '2026-10');
  assert.equal(oct25.window.from < oct25.window.to, true);
  assert.equal(resolvePeriod('cycle', today, null, '2026-09').window.to < oct25.window.from, true, 'cycles do not overlap');
  cyc.setPaydayRule({ day: 1, eom: false, adjust: false, country: 'MY', state: null, history: [], from: null });
}
console.log('period model OK');
