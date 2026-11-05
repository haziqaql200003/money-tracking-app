import { useSyncExternalStore } from 'react';

import { en } from './en';
import { ms } from './ms';

export type Lang = 'ms' | 'en';
export type TKey = keyof typeof en;
export type Params = Record<string, string | number>;
/** Keys that come in `<base>.one` / `<base>.other` pairs, for `tp()`. */
export type PluralKey = TKey extends infer K ? (K extends `${infer B}.one` ? B : never) : never;

const dictionaries: Record<Lang, Record<TKey, string>> = { en, ms };

let current: Lang = 'ms';
const listeners = new Set<() => void>();

export const getLanguage = () => current;

export function setLanguage(lang: Lang) {
  if (lang === current) return;
  current = lang;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function fill(text: string, params?: Params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

const warned = new Set<string>();
function lookup(lang: Lang, key: string): string {
  const hit = (dictionaries[lang] as Record<string, string>)[key];
  if (hit !== undefined) return hit;
  if (__DEV__ && !warned.has(`${lang}:${key}`)) {
    warned.add(`${lang}:${key}`);
    console.warn(`[i18n] missing "${key}" for "${lang}"`);
  }
  return (dictionaries.en as Record<string, string>)[key] ?? key;
}

type Translate = (key: TKey, params?: Params) => string;
type TranslatePlural = (base: PluralKey, count: number, params?: Params) => string;

const bind = (lang: Lang): { t: Translate; tp: TranslatePlural } => ({
  t: (key, params) => fill(lookup(lang, key), params),
  tp: (base, count, params) => fill(lookup(lang, `${base}.${count === 1 ? 'one' : 'other'}`), { count, ...params }),
});
// One stable pair of translators per language: components that use them re-evaluate when the language changes.
const bound: Record<Lang, { t: Translate; tp: TranslatePlural }> = { en: bind('en'), ms: bind('ms') };

/** Translate in the language currently selected. Fine in plain functions (utils); inside components prefer `useT()`. */
export const t: Translate = (key, params) => bound[current].t(key, params);
/** Plural: picks `<base>.one` when count is 1, else `<base>.other`. `{count}` is filled in automatically. */
export const tp: TranslatePlural = (base, count, params) => bound[current].tp(base, count, params);

/**
 * Use inside components: `const { t } = useT();`. Re-renders when the language changes and returns translators
 * that are different objects per language, so memoised values that use `t` refresh too.
 */
export function useT() {
  const lang = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return { ...bound[lang], lang };
}
