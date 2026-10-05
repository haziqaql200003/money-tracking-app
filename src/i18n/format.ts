import { getLanguage } from './index';

// Locale data (not UI wording), so it lives here instead of in the dictionaries.
const MONTHS_LONG = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ms: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
};
const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
};
// Monday first, matching the week charts.
const WEEKDAYS_LONG = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ms: ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'],
};
const WEEKDAYS_SHORT = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ms: ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'],
};

/** index 0-11 (January = 0). */
export const monthLong = (i: number) => MONTHS_LONG[getLanguage()][i] ?? '';
export const monthShort = (i: number) => MONTHS_SHORT[getLanguage()][i] ?? '';
/** index 0-6, MONDAY = 0. */
export const weekdayLong = (i: number) => WEEKDAYS_LONG[getLanguage()][i] ?? '';
export const weekdayShort = (i: number) => WEEKDAYS_SHORT[getLanguage()][i] ?? '';

/** Monday-based weekday index of a JS Date (JS has Sunday = 0). */
export const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** "5 Oct 2026" / "5 Okt 2026" (`long` spells the month out). */
export function formatDate(d: Date, style: 'short' | 'long' = 'short') {
  const m = style === 'long' ? monthLong(d.getMonth()) : monthShort(d.getMonth());
  return `${d.getDate()} ${m} ${d.getFullYear()}`;
}

/** "Oct 2026" / "Okt 2026". */
export function formatMonthYear(d: Date, style: 'short' | 'long' = 'long') {
  const m = style === 'long' ? monthLong(d.getMonth()) : monthShort(d.getMonth());
  return `${m} ${d.getFullYear()}`;
}
