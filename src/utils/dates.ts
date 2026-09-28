export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM' for the month `offset` months from now (0 = this month, -1 = last month). */
export function monthKeyFromOffset(offset: number) {
  const d = new Date();
  d.setDate(1); // avoid overflow, e.g. 31 Oct -> "31 Nov"
  d.setMonth(d.getMonth() + offset);
  return toDateKey(d).slice(0, 7);
}

export function monthLabel(key: string, variant: 'long' | 'short' = 'long') {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(
    undefined,
    variant === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short' },
  );
}

/** "Today", "Yesterday", or "Mon, 21 Sep". */
export function dayLabel(iso: string) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (iso === toDateKey(now)) return 'Today';
  if (iso === toDateKey(yesterday)) return 'Yesterday';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}