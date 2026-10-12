/**
 * Money typing like a card terminal: digits slide in from the right, so RM 100 is typed 1-0-0-0-0
 * and reads 0.01 > 0.10 > 1.00 > 10.00 > 100.00 (and 1,000.00 with the thousands comma).
 * Values are kept as plain decimal strings ("1000.00", or "" for zero) so the rest of the app parses them as before.
 */

const MAX_DIGITS = 11; // up to 999,999,999.99

/** "1000.5" -> 100050. Anything unreadable -> 0. The sign is ignored. */
export function centsFromValue(value: string): number {
  const n = parseFloat(value.replace(',', '.').replace('-', ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** 100050 -> "1,000.50" */
export function formatCents(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, '0');
  return `${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
}

/** 100050 -> "1000.50"; 0 -> "" */
export function valueFromCents(cents: number, negative = false): string {
  if (cents <= 0) return '';
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/** What the field shows for a stored value. Empty for zero so the "0.00" placeholder appears. */
export function displayForValue(value: string): string {
  const cents = centsFromValue(value);
  if (cents === 0) return '';
  return `${value.trim().startsWith('-') ? '-' : ''}${formatCents(cents)}`;
}

/** The text the user just produced in the field -> the new stored value. */
export function valueFromTyped(typed: string, previous: string): string {
  const digits = typed.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
  const cents = digits ? parseInt(digits, 10) : 0;
  return valueFromCents(cents, previous.trim().startsWith('-'));
}
