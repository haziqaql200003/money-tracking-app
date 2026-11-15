import { monthShort } from '@/i18n/format';
import { addDays, cycleOf, cycleRange, daysBetween, shiftCycle } from '@/utils/cycle';
import { currentWindow, monthKeysEnding, previousWindow, type Window } from '@/utils/insights';
import type { Grain } from '@/utils/periods';

/**
 * The period Faham analyses, chosen once in the screen header and shared by Ringkasan and Terperinci.
 *
 *   1M / 3M / 6M / 12M  the last n financial months (payday cycles), the running one up to today.
 *   YTD                 every financial month named in this year, up to today.
 *   cycle               one past financial month, picked from the period sheet or with the pill's arrows.
 *   custom              any from..to the user picks (to is never after today).
 *
 * `previous` is the like-for-like window used for every "vs before" figure:
 *   presets  the same days n cycles earlier (see previousWindow), so 1 Oct-8 Nov compares with 1 Sep-8 Oct
 *   YTD      the same stretch 12 cycles earlier (this year so far vs last year so far)
 *   cycle    the whole cycle before it
 *   custom   the same number of days immediately before `from`
 */
export type PeriodPreset = '1M' | '3M' | '6M' | '12M' | 'YTD' | 'cycle' | 'custom';
export const PERIOD_PRESETS: readonly PeriodPreset[] = ['1M', '3M', '6M', '12M', 'YTD', 'custom'];
const PRESET_MONTHS: Partial<Record<PeriodPreset, number>> = { '1M': 1, '3M': 3, '6M': 6, '12M': 12 };

/** Custom ranges longer than this are cut to their last 5 years, to keep every chart fast. */
export const MAX_CUSTOM_DAYS = 5 * 366;

export type FahamPeriod = {
  preset: PeriodPreset;
  window: Window;
  previous: Window;
  /** Financial-month keys the window touches, oldest first. */
  keys: string[];
  /** keys.length: how many financial months the window touches. */
  months: number;
  /** Days in the window, both ends included. */
  days: number;
  /** True when the window runs up to today (the latest month is still going). */
  live: boolean;
  /** A stable string for React keys and memo dependencies. */
  id: string;
  /** The financial month shown when the period is exactly one cycle (1M or cycle); null for longer periods. */
  cycleKey: string | null;
};

function keysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const last = cycleOf(to);
  for (let k = cycleOf(from); k <= last && out.length < 120; k = shiftCycle(k, 1)) out.push(k);
  return out;
}

/** Puts a picked range in order, ends it no later than today and keeps it within MAX_CUSTOM_DAYS. */
export function normaliseRange(r: Window, todayKey: string): Window {
  let from = r.from <= r.to ? r.from : r.to;
  let to = r.from <= r.to ? r.to : r.from;
  if (to > todayKey) to = todayKey;
  if (from > to) from = to;
  if (daysBetween(from, to) + 1 > MAX_CUSTOM_DAYS) from = addDays(to, -(MAX_CUSTOM_DAYS - 1));
  return { from, to };
}

export function resolvePeriod(preset: PeriodPreset, todayKey: string, custom?: Window | null, cycleKey?: string | null): FahamPeriod {
  // A "cycle" that is the running one (or later) is the same as 1M.
  if (preset === 'cycle' && (!cycleKey || cycleKey >= cycleOf(todayKey))) preset = '1M';
  let window: Window;
  let previous: Window;
  let keys: string[];
  const n = PRESET_MONTHS[preset];
  if (preset === 'cycle' && cycleKey) {
    window = cycleRange(cycleKey);
    previous = cycleRange(shiftCycle(cycleKey, -1));
    keys = [cycleKey];
  } else if (n) {
    window = currentWindow(todayKey, n);
    previous = previousWindow(window, n);
    keys = monthKeysEnding(todayKey, n);
  } else if (preset === 'YTD') {
    const nowKey = cycleOf(todayKey);
    const first = `${nowKey.slice(0, 4)}-01`;
    window = { from: cycleRange(first).from, to: todayKey };
    previous = previousWindow(window, 12);
    keys = keysBetween(window.from, todayKey);
  } else {
    window = normaliseRange(custom ?? currentWindow(todayKey, 1), todayKey);
    const len = daysBetween(window.from, window.to) + 1;
    previous = { from: addDays(window.from, -len), to: addDays(window.from, -1) };
    keys = keysBetween(window.from, window.to);
  }
  const days = daysBetween(window.from, window.to) + 1;
  return {
    preset,
    window,
    previous,
    keys,
    months: keys.length,
    days,
    live: window.to === todayKey,
    id: `${preset}:${window.from}:${window.to}`,
    cycleKey: preset === '1M' || preset === 'cycle' ? keys[keys.length - 1] ?? cycleOf(todayKey) : null,
  };
}

/** What the period pill and sheet store: a preset, plus the cycle or the dates when they need one. */
export type PeriodChoice = { preset: PeriodPreset; cycleKey?: string | null; custom?: Window | null };

/**
 * The period one cycle earlier (dir -1) or later (+1), for the pill's arrows and swipe.
 * Only single-cycle periods move; stepping past the running cycle stays on it. Returns null when it cannot move.
 */
export function stepCycle(p: FahamPeriod, dir: -1 | 1, todayKey: string): PeriodChoice | null {
  if (!p.cycleKey) return null;
  const now = cycleOf(todayKey);
  const next = shiftCycle(p.cycleKey, dir);
  if (next > now) return null;
  return next === now ? { preset: '1M' } : { preset: 'cycle', cycleKey: next };
}

/** Bars by week for a month or less, by financial month for anything longer. */
export function grainForPeriod(p: FahamPeriod): Grain {
  return p.days <= 45 ? 'week' : 'month';
}

const dm = (k: string) => `${Number(k.slice(8, 10))} ${monthShort(Number(k.slice(5, 7)) - 1)}`;

/** "1 Oct – 8 Nov 2026", or "15 Dec 2025 – 8 Jan 2026" across a new year, or "8 Nov 2026" for one day. */
export function rangeLabel(w: Window): string {
  const y1 = w.from.slice(0, 4);
  const y2 = w.to.slice(0, 4);
  if (w.from === w.to) return `${dm(w.to)} ${y2}`;
  return y1 === y2 ? `${dm(w.from)} – ${dm(w.to)} ${y2}` : `${dm(w.from)} ${y1} – ${dm(w.to)} ${y2}`;
}
