import type { Category } from '@/constants/categories';
import type { Account, Transaction } from '@/context/TransactionsContext';
import { en } from '@/i18n/en';
import { ms } from '@/i18n/ms';

import type { Context } from './plan';

const both = (key: string, stored: string): string[] => {
  const e = (en as Record<string, string>)[key];
  const m = (ms as Record<string, string>)[key];
  return [stored, ...(e ? [e] : []), ...(m ? [m] : [])];
};

/** What the importer needs to know about the user's categories, accounts and existing records. Names are matched in English and Malay. */
export function buildImportContext(categories: Category[], accounts: Account[], transactions: Transaction[], fallback: { expense: string; income: string }): Context {
  return {
    categories: categories.map((c) => ({
      id: c.id,
      kind: c.kind,
      names: both(`cat.${c.id}`, c.name),
      subs: c.subcategories.map((s) => ({ name: s, names: both(`sub.${s}`, s) })),
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      names: [...both(`acct.${a.id}`, a.name), ...(a.provider ? [a.provider] : [])],
    })),
    existing: transactions.map((t) => ({ date: t.date, type: t.type, amount: t.amount, title: t.title })),
    fallback,
  };
}
