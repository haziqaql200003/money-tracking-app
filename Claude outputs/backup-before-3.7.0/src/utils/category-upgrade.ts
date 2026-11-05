import { DEFAULT_CATEGORIES, FALLBACK_EXPENSE_ID, FALLBACK_INCOME_ID, type Category } from '@/constants/categories';

/** The six categories every WaKira version before 1.1.2 created. Used to tell "untouched" from "edited by the user". */
const LEGACY: Record<string, { name: string; subcategories: string[] }> = {
  food: { name: 'Food', subcategories: ['Groceries', 'Restaurants', 'Coffee'] }, // i18n-ignore: stored English data name
  transport: { name: 'Transport', subcategories: ['Fuel', 'Parking', 'Public Transit'] }, // i18n-ignore: stored English data name
  bills: { name: 'Bills', subcategories: ['Rent', 'Utilities', 'Subscriptions'] }, // i18n-ignore: stored English data name
  shopping: { name: 'Shopping', subcategories: ['Clothes', 'Electronics', 'Other'] }, // i18n-ignore: stored English data name
  other: { name: 'Other', subcategories: ['Misc'] }, // i18n-ignore: stored English data name
  income: { name: 'Income', subcategories: ['Salary', 'Bonus', 'Other'] }, // i18n-ignore: stored English data name
};

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Brings a saved category list up to the 1.1.2 defaults without touching anything the user changed:
 * - ids never change, so transactions, budgets and recurring items keep pointing at the right category;
 * - an old default that the user never edited gets the new name and subcategories;
 * - a category the user renamed or whose subcategories they edited keeps their version;
 * - new default categories are added; old defaults the user deleted stay deleted (except the two fallbacks).
 * Safe to run twice: the second run changes nothing.
 */
export function upgradeCategories(stored: Category[]): Category[] {
  const byId = new Map(stored.map((c) => [c.id, c]));
  const out: Category[] = stored.map((c) => {
    const def = DEFAULT_CATEGORIES.find((d) => d.id === c.id);
    const old = LEGACY[c.id];
    if (!def || !old) return c;
    return {
      ...c,
      name: c.name === old.name ? def.name : c.name,
      subcategories: same(c.subcategories, old.subcategories) ? def.subcategories : c.subcategories,
    };
  });
  for (const def of DEFAULT_CATEGORIES) {
    if (byId.has(def.id)) continue;
    const wasOldDefault = def.id in LEGACY;
    const isFallback = def.id === FALLBACK_EXPENSE_ID || def.id === FALLBACK_INCOME_ID;
    if (wasOldDefault && !isFallback) continue; // the user deleted it on purpose
    out.push(def);
  }
  return out;
}
