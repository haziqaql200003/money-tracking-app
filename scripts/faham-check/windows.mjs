/** Faham integration checks: payday-aligned comparison windows. Run: npm run faham:test */
import assert from 'node:assert/strict';
const { previousWindow, currentWindow } = await import('@/utils/insights');
const cyc = await import('@/utils/cycle');
// Calendar months
cyc.setPaydayRule({ day: 1, eom: false, adjust: false });
let w = currentWindow('2026-11-08', 1);
assert.deepEqual(w, { from: '2026-11-01', to: '2026-11-08' });
assert.deepEqual(previousWindow(w, 1), { from: '2026-10-01', to: '2026-10-08' });
w = currentWindow('2026-03-31', 1);
assert.deepEqual(previousWindow(w, 1), { from: '2026-02-01', to: '2026-02-28' }, 'capped at Feb end');
// Payday 25: 26 Nov is in the December cycle
cyc.setPaydayRule({ day: 25 });
w = currentWindow('2026-11-26', 1);
assert.equal(w.from, '2026-11-25');
assert.deepEqual(previousWindow(w, 1), { from: '2026-10-25', to: '2026-10-26' });
w = currentWindow('2026-11-26', 3);
assert.deepEqual(previousWindow(w, 3), { from: cyc.cycleRange(cyc.shiftCycle('2026-10', -3)).from, to: previousWindow(w, 3).to });
// End-of-month payday, moved to working day
cyc.setPaydayRule({ day: 1, eom: true, adjust: true });
w = currentWindow('2026-11-10', 1);
const p = previousWindow(w, 1);
assert.equal(p.from, cyc.cycleRange(cyc.shiftCycle(cyc.cycleOf('2026-11-10'), -1)).from);
assert.ok(p.to <= cyc.cycleRange(cyc.shiftCycle(cyc.cycleOf('2026-11-10'), -1)).to);
console.log('previousWindow OK', JSON.stringify(w), JSON.stringify(p));
