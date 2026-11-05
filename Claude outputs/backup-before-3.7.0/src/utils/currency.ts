const CURRENCY_CODE = 'MYR';

export function formatMoney(amount: number, options?: { signed?: boolean; type?: 'debit' | 'credit' }) {
  const formatted = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (!options?.signed || !options.type) return formatted;
  const prefix = options.type === 'credit' ? '+' : '-';
  return `${prefix}${formatted}`;
}

/** Short axis label without currency, e.g. 0 -> "0", 2.5 -> "2.5", 1200 -> "1.2k". */
export function formatCompact(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  if (abs < 10 && !Number.isInteger(abs)) return abs.toFixed(1);
  return String(Math.round(abs));
}
