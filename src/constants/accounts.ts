import { t, type TKey } from '@/i18n';

import type { IconName } from './categories';

type AccountTypeKey = 'bank' | 'cash' | 'savings' | 'other';

const ACCOUNT_TYPE_LABEL_KEY: Record<AccountTypeKey, TKey> = {
  bank: 'acct.type.bank',
  cash: 'acct.type.cash',
  savings: 'acct.type.savings',
  other: 'acct.type.other',
};

/** Label of a built-in account type in the current language. */
export function accountTypeLabel(type: AccountTypeKey): string {
  return t(ACCOUNT_TYPE_LABEL_KEY[type]);
}

export const DEFAULT_ACCOUNT_ICON: Record<'bank' | 'cash' | 'savings' | 'other', IconName> = {
  bank: 'business',
  cash: 'cash',
  savings: 'save',
  other: 'wallet',
};

/** Picker icons for accounts (Ionicons). If tsc complains about one name, delete it from the list. */
export const ACCOUNT_ICONS: IconName[] = [
  'business', 'home', 'cash', 'wallet', 'card', 'phone-portrait', 'globe', 'briefcase',
  'trending-up', 'shield-checkmark', 'gift', 'star', 'diamond', 'rocket', 'school',
  'car', 'airplane', 'boat', 'construct', 'medkit', 'basket', 'storefront', 'people',
  'lock-closed', 'key', 'ribbon', 'flag', 'planet', 'sparkles', 'flash',
];
