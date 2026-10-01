import type { IconName } from './categories';

export const ACCOUNT_TYPE_LABEL: Record<'bank' | 'cash' | 'other', string> = {
  bank: 'Bank',
  cash: 'Cash',
  other: 'Other',
};

export const DEFAULT_ACCOUNT_ICON: Record<'bank' | 'cash' | 'other', IconName> = {
  bank: 'business',
  cash: 'cash',
  other: 'wallet',
};

/** Picker icons for accounts (Ionicons). If tsc complains about one name, delete it from the list. */
export const ACCOUNT_ICONS: IconName[] = [
  'business', 'home', 'cash', 'wallet', 'card', 'phone-portrait', 'globe', 'briefcase',
  'trending-up', 'shield-checkmark', 'gift', 'star', 'diamond', 'rocket', 'school',
  'car', 'airplane', 'boat', 'construct', 'medkit', 'basket', 'storefront', 'people',
  'lock-closed', 'key', 'ribbon', 'flag', 'planet', 'sparkles', 'flash',
];
