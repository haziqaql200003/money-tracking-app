import { hslToHex } from '@/constants/card-styles';
import type { AccountType } from '@/context/TransactionsContext';
import type { TKey } from '@/i18n';

export const TYPE_OPTIONS: { type: AccountType; labelKey: TKey; hintKey: TKey }[] = [
  { type: 'bank', labelKey: 'acct.type.bank', hintKey: 'acct.type.bankHint' },
  { type: 'cash', labelKey: 'acct.type.cash', hintKey: 'acct.type.cashHint' },
  { type: 'savings', labelKey: 'acct.type.savings', hintKey: 'acct.type.savingsHint' },
  { type: 'other', labelKey: 'acct.type.other', hintKey: 'acct.type.otherHint' },
];

export type CustomType = { id: string; label: string };
export const MAX_CUSTOM_TYPES = 12;

export const PRO_W = 148;
export const PRO_GAP = 12;
export const PRO_STEP = PRO_W + PRO_GAP;

export const HUE_STOPS = Array.from({ length: 24 }, (_, i) => hslToHex(i * 15, 72, 50));
export const LIGHT_MIN = 25;
export const LIGHT_MAX = 75;
