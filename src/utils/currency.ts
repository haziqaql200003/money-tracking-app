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
