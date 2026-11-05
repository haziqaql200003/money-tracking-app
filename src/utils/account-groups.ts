import { accountTypeLabel } from '@/constants/accounts';
import { brandKey, findBrand } from '@/constants/brands';
import type { AccountType } from '@/context/TransactionsContext';
import { t } from '@/i18n';

/**
 * The kind of an account in words. An e-wallet is stored as type 'other' (so older app versions keep reading it),
 * so a known e-wallet provider is named "E-wallet" here instead of "Other".
 */
export function accountKindLabel(a: { type: AccountType; typeLabel?: string | null; provider?: string | null }): string {
  if (a.typeLabel) return a.typeLabel;
  // Older versions saved e-wallets as 'other'.
  if (a.type === 'other' && findBrand(a.provider)?.kind === 'ewallet') return t('acct.type.ewallet');
  return accountTypeLabel(a.type);
}

/** One key per company, so "Maybank", "maybank2u" and "MAE" style aliases of the same bank fall together. */
export function providerKeyOf(provider: string | null | undefined): string | null {
  const text = (provider ?? '').trim();
  if (!text) return null;
  return findBrand(text)?.id ?? brandKey(text);
}

export type ProviderBundle<A> = { kind: 'bundle'; key: string; name: string; accounts: A[] };
export type SingleEntry<A> = { kind: 'single'; key: string; account: A };
export type AccountEntry<A> = ProviderBundle<A> | SingleEntry<A>;

/**
 * Accounts with the same provider fold into one entry (Maybank: savings + current). A provider with one account,
 * and accounts with no provider, stay as single rows. The order follows the first account of each entry.
 */
export function bundleByProvider<A extends { id: string; provider?: string }>(list: A[]): AccountEntry<A>[] {
  const counts = new Map<string, number>();
  for (const a of list) {
    const k = providerKeyOf(a.provider);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out: AccountEntry<A>[] = [];
  const seen = new Map<string, ProviderBundle<A>>();
  for (const a of list) {
    const k = providerKeyOf(a.provider);
    if (k && (counts.get(k) ?? 0) > 1) {
      const existing = seen.get(k);
      if (existing) existing.accounts.push(a);
      else {
        const bundle: ProviderBundle<A> = { kind: 'bundle', key: `p:${k}`, name: findBrand(a.provider)?.name ?? (a.provider ?? '').trim(), accounts: [a] };
        seen.set(k, bundle);
        out.push(bundle);
      }
    } else {
      out.push({ kind: 'single', key: a.id, account: a });
    }
  }
  return out;
}
