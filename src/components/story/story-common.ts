import type { PluralKey, TKey } from '@/i18n';
import { formatDate, formatMonthYear, monthLong, weekdayLong } from '@/i18n/format';

/** What every story builder needs from the screen that opens it. */
export type StoryCtx = {
  t: (key: TKey, params?: Record<string, string | number>) => string;
  tp: (base: PluralKey, count: number, params?: Record<string, string | number>) => string;
  catName: (id: string) => string;
  subName: (sub: string) => string;
  savingsTarget: number;
  /** The sum of all category budgets for a month, 0 when none are set. */
  monthlyBudget: number;
};

export const toDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
};
export const dayName = (key: string) => weekdayLong((toDate(key).getDay() + 6) % 7);
export const dateText = (key: string) => formatDate(toDate(key));
export const monthName = (key: string) => monthLong(Number(key.slice(5, 7)) - 1);
export const monthYear = (key: string) => formatMonthYear(toDate(`${key}-01`));

/** RM with no sen, for big headline numbers: "RM 25,438". */
export const rm0 = (n: number) => `RM ${Math.round(n).toLocaleString('en-US')}`;
/** RM with sen: "RM 497.73". */
export const rm2 = (n: number) => `RM ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const int = (n: number) => Math.round(n).toLocaleString('en-US');

/** ISO week number, for the receipt's "No.". */
export function weekNo(mondayKey: string) {
  const d = toDate(mondayKey);
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 86400000 / 7 - ((firstThursday.getDay() + 6) % 7 - 3) / 7);
}
