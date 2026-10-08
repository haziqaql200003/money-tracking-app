import { holidaysFor, isFriSatState, type MyStateCode, type Region } from '@/constants/my-holidays';

/**
 * The financial month.
 *
 * With payday 1 a "month" is the calendar month and everything behaves as it always did. With payday 25 a month runs
 * from the 25th to the 24th, and is named after the month it ENDS in: 25 Sep to 24 Oct is "October". Payday is
 * limited to 1..28 so every month has the day and no cycle is ever shorter than 28 days.
 *
 * Payday can also be the LAST day of the month (31 Jan, 28 Feb, 31 Mar...), and either kind can be moved to the
 * working day before when it lands on a weekend or a Malaysian public holiday. Then cycles are no longer all the
 * same length, so they are found from their real start dates instead of from a fixed day number.
 *
 * A cycle key is still 'YYYY-MM', so everything that groups by month keeps working once it asks `cycleOf(date)`
 * instead of cutting `date.slice(0, 7)`. Dates are 'YYYY-MM-DD' strings and all day maths is in UTC, so nothing
 * depends on the device time zone or daylight saving.
 */

export const MAX_PAYDAY = 28;

let payday = 1;
let paydayEom = false;
let paydayAdjust = false;
const startCache = new Map<string, string>();

let region: Region = { country: 'MY', state: null };
let holidays = holidaysFor(region);
let friSat = false;

export const clampPayday = (n: number) => (Number.isFinite(n) ? Math.min(MAX_PAYDAY, Math.max(1, Math.round(n))) : 1);

export type PaydayRule = { day: number; eom: boolean; adjust: boolean; country: Region['country']; state: MyStateCode | null };

/** Set by SettingsProvider. Kept here so date helpers never need it passed around. */
export function setPaydayRule(r: Partial<PaydayRule>) {
  if (r.day !== undefined) payday = clampPayday(r.day);
  if (r.eom !== undefined) paydayEom = r.eom;
  if (r.adjust !== undefined) paydayAdjust = r.adjust;
  if (r.country !== undefined || r.state !== undefined) {
    region = { country: r.country ?? region.country, state: r.state === undefined ? region.state : r.state };
    holidays = holidaysFor(region);
    friSat = isFriSatState(region);
  }
  startCache.clear();
}
export const setPayday = (n: number) => setPaydayRule({ day: n });
export const getPayday = () => payday;
export const getPaydayRule = (): PaydayRule => ({ day: payday, eom: paydayEom, adjust: paydayAdjust, country: region.country, state: region.state });
/** True while months are plain calendar months, so screens can skip payday wording. */
export const usesCalendarMonths = () => payday <= 1 && !paydayEom && !paydayAdjust;
/** Plain fixed-day maths is enough unless the payday is end of month or gets moved to a working day. */
const isGeneric = () => paydayEom || paydayAdjust;

const pad = (n: number) => String(n).padStart(2, '0');
const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
};
const dayNo = (key: string) => {
  const { y, m, d } = parse(key);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
const fromDayNo = (n: number) => {
  const dt = new Date(n * 86400000);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};
const keyAdd = (y: number, m: number, delta: number) => {
  const total = y * 12 + (m - 1) + delta;
  return { y: Math.floor(total / 12), m: (((total % 12) + 12) % 12) + 1 };
};
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

const weekday = (key: string) => (((dayNo(key) + 4) % 7) + 7) % 7; // 0 = Sunday (1 Jan 1970 was a Thursday)
/** Saturday and Sunday, or Friday and Saturday in Kedah, Kelantan and Terengganu. */
export const isWeekend = (key: string) => {
  const w = weekday(key);
  return friSat ? w === 5 || w === 6 : w === 0 || w === 6;
};
export const isPublicHoliday = (key: string) => holidays.has(key);

export const addDays = (dateKey: string, n: number) => fromDayNo(dayNo(dateKey) + n);
export const daysBetween = (from: string, to: string) => dayNo(to) - dayNo(from);

export type PaydayDay = { date: string; base: string; reason: 'weekend' | 'holiday' | null };

/** The payday of calendar month `y-m` under the current rule: the end-of-month or fixed day, moved earlier if asked. */
export function paydayIn(y: number, m: number): PaydayDay {
  const base = `${y}-${pad(m)}-${pad(paydayEom ? lastDay(y, m) : Math.min(payday, lastDay(y, m)))}`;
  let date = base;
  let reason: PaydayDay['reason'] = null;
  if (paydayAdjust) {
    while (isWeekend(date) || isPublicHoliday(date)) {
      reason = reason ?? (isWeekend(date) ? 'weekend' : 'holiday');
      date = addDays(date, -1);
    }
  }
  return { date, base, reason };
}

/** First day of a cycle when paydays are irregular: the payday that opens it (the month before its name, unless day 1). */
function startOfCycle(key: string): string {
  const hit = startCache.get(key);
  if (hit) return hit;
  const { y, m } = parse(key);
  const shifted = paydayEom || payday > 1;
  const n = shifted ? keyAdd(y, m, -1) : { y, m };
  const out = paydayIn(n.y, n.m).date;
  startCache.set(key, out);
  return out;
}

function cycleOfGeneric(dateKey: string): string {
  const { y, m } = parse(dateKey);
  for (let delta = 2; delta >= -1; delta--) {
    const n = keyAdd(y, m, delta);
    const key = `${n.y}-${pad(n.m)}`;
    if (startOfCycle(key) <= dateKey) return key;
  }
  const n = keyAdd(y, m, -1);
  return `${n.y}-${pad(n.m)}`;
}

/** The cycle ('YYYY-MM') a date belongs to. */
export function cycleOf(dateKey: string, p = payday): string {
  if (isGeneric()) return cycleOfGeneric(dateKey);
  const { y, m, d } = parse(dateKey);
  if (p <= 1 || d < p) return `${y}-${pad(m)}`;
  const n = keyAdd(y, m, 1);
  return `${n.y}-${pad(n.m)}`;
}

/** Move a cycle key by whole cycles. */
export function shiftCycle(key: string, delta: number): string {
  const { y, m } = parse(key);
  const n = keyAdd(y, m, delta);
  return `${n.y}-${pad(n.m)}`;
}

/** First and last day (inclusive) of a cycle. */
export function cycleRange(key: string, p = payday): { from: string; to: string } {
  if (isGeneric()) return { from: startOfCycle(key), to: addDays(startOfCycle(shiftCycle(key, 1)), -1) };
  const { y, m } = parse(key);
  if (p <= 1) return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` };
  const prev = keyAdd(y, m, -1);
  return { from: `${prev.y}-${pad(prev.m)}-${pad(p)}`, to: `${y}-${pad(m)}-${pad(p - 1)}` };
}

export type CycleInfo = { key: string; from: string; to: string; length: number; dayIndex: number; daysAfterToday: number };

/** Where `todayKey` sits in its cycle. dayIndex is 1 on the first day; daysAfterToday excludes today. */
export function cycleInfo(todayKey: string, p = payday): CycleInfo {
  const key = cycleOf(todayKey, p);
  const { from, to } = cycleRange(key, p);
  const length = daysBetween(from, to) + 1;
  const dayIndex = daysBetween(from, todayKey) + 1;
  return { key, from, to, length, dayIndex, daysAfterToday: length - dayIndex };
}

/** Whole days until the next payday (0 on payday itself; with payday 1 it is the start of next month). */
export function daysToPayday(todayKey: string, p = payday): number {
  if (isGeneric()) return daysBetween(todayKey, nextPayday(todayKey).date);
  const { y, m, d } = parse(todayKey);
  if (p <= 1) {
    const n = keyAdd(y, m, 1);
    return daysBetween(todayKey, `${n.y}-${pad(n.m)}-01`);
  }
  if (d === p) return 0;
  if (d < p) return daysBetween(todayKey, `${y}-${pad(m)}-${pad(p)}`);
  const n = keyAdd(y, m, 1);
  return daysBetween(todayKey, `${n.y}-${pad(n.m)}-${pad(p)}`);
}

/** The next payday on or after today, with why it was moved if it was. */
export function nextPayday(todayKey: string): PaydayDay {
  const { y, m } = parse(todayKey);
  let best: PaydayDay | null = null;
  for (let delta = -1; delta <= 2; delta++) {
    const n = keyAdd(y, m, delta);
    const c = paydayIn(n.y, n.m);
    if (c.date >= todayKey && (best === null || c.date < best.date)) best = c;
  }
  return best as PaydayDay;
}

/** The same relative day in another cycle, e.g. day 10 of the cycle before (clamped to that cycle's length). */
export function sameDayInCycle(todayKey: string, delta: number, p = payday): string {
  const info = cycleInfo(todayKey, p);
  const target = cycleRange(shiftCycle(info.key, delta), p);
  const len = daysBetween(target.from, target.to) + 1;
  return addDays(target.from, Math.min(info.dayIndex, len) - 1);
}

/** 0-based position of a date inside its own cycle. */
export const dayInCycle = (dateKey: string, p = payday) => daysBetween(cycleRange(cycleOf(dateKey, p), p).from, dateKey);
