import { en } from './en';
import { getLanguage, t, type TKey } from './index';

/**
 * Names the app creates for the user at first run (default categories, subcategories, accounts) are saved
 * in English in their data. These helpers show them in the current language while leaving anything the user
 * typed or renamed exactly as written.
 */
const has = (key: string): key is TKey => key in en;

/** `defaultName` is the English name the app created; `stored` is what the user's data holds now. */
function localised(key: string, defaultName: string, stored: string): string {
  if (!has(key)) return stored;
  // Untouched default (English or already Malay): translate. Renamed by the user: keep their text.
  return stored === defaultName || stored === t(key, undefined) || stored === en[key] ? t(key) : stored;
}

export function categoryName(c: { id: string; name: string }): string {
  return localised(`cat.${c.id}`, has(`cat.${c.id}`) ? en[`cat.${c.id}` as TKey] : c.name, c.name);
}

/** Subcategories are plain strings: the English default is its own lookup key (`sub.Groceries`). */
export function subcategoryName(s: string): string {
  const key = `sub.${s}`;
  return has(key) ? t(key) : s;
}

export function accountName(a: { id: string; name: string }): string {
  return localised(`acct.${a.id}`, has(`acct.${a.id}`) ? en[`acct.${a.id}` as TKey] : a.name, a.name);
}

export const currentLang = getLanguage;
