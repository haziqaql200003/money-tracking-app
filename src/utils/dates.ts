import { t } from '@/i18n';
import { cycleOf, cycleRange, shiftCycle, usesCalendarMonths } from '@/utils/cycle';
import { formatMonthYear, mondayIndex, monthShort, weekdayShort } from '@/i18n/format';

export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM' of the financial month `offset` months from now (0 = this one, -1 = the one before). */
export function monthKeyFromOffset(offset: number) {
  return shiftCycle(cycleOf(toDateKey(new Date())), offset);
}

/** "25 Sep - 24 Oct" for a financial month, or '' when months are plain calendar months (payday 1). */
export function cycleRangeLabel(key: string) {
  if (usesCalendarMonths()) return '';
  const { from, to } = cycleRange(key);
  const part = (k: string) => `${Number(k.slice(8, 10))} ${monthShort(Number(k.slice(5, 7)) - 1)}`;
  return `${part(from)} - ${part(to)}`;
}

export function monthLabel(key: string, variant: 'long' | 'short' = 'long') {
  const [y, m] = key.split('-').map(Number);
  return variant === 'long' ? formatMonthYear(new Date(y, m - 1, 1), 'long') : monthShort(m - 1);
}

/** "Today", "Yesterday", or "Mon, 21 Sep". */
export function dayLabel(iso: string) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (iso === toDateKey(now)) return t('common.today');
  if (iso === toDateKey(yesterday)) return t('common.yesterday');
  const [y, m, d] = iso.split('-').map(Number);
  return `${weekdayShort(mondayIndex(new Date(y, m - 1, d)))}, ${d} ${monthShort(m - 1)}`;
}