import { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';

import {
  CATEGORY_SCHEMA_VERSION,
  DEFAULT_CATEGORIES,
  FALLBACK_EXPENSE_ID,
  PROTECTED_CATEGORY_IDS,
  type Category,
} from '@/constants/categories';
import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { upgradeCategories } from '@/utils/category-upgrade';

type CategoriesContextValue = {
  categories: Category[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  totalBudget: number;
  getCategory: (id: string) => Category | undefined;
  addCategory: (c: Omit<Category, 'id'>) => void;
  /** Adds many at once (file import). Returns the new ids. */
  addCategories: (list: Omit<Category, 'id'>[]) => string[];
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  resetCategories: () => void;
};

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories, categoriesReady] = usePersistedState<Category[]>('categories', DEFAULT_CATEGORIES, user?.id ?? null);
  const [schema, setSchema, schemaReady] = usePersistedState<number>('categoriesSchema', 0, user?.id ?? null);

  // One-time move to the 1.1.2 default categories; keeps ids and anything the user edited (see utils/category-upgrade.ts).
  useEffect(() => {
    if (!categoriesReady || !schemaReady || schema >= CATEGORY_SCHEMA_VERSION) return;
    setCategories((prev) => upgradeCategories(prev));
    setSchema(CATEGORY_SCHEMA_VERSION);
  }, [categoriesReady, schemaReady, schema, setCategories, setSchema]);

  const value = useMemo<CategoriesContextValue>(() => {
    const expense = categories.filter((c) => c.kind === 'expense');
    const expenseCategories = [
      ...expense.filter((c) => c.id !== FALLBACK_EXPENSE_ID),
      ...expense.filter((c) => c.id === FALLBACK_EXPENSE_ID),
    ];

    return {
      categories,
      expenseCategories,
      incomeCategories: categories.filter((c) => c.kind === 'income'),
      totalBudget: expense.reduce((sum, c) => sum + c.monthlyLimit, 0),
      getCategory: (id) => categories.find((c) => c.id === id),
      addCategory: (c) => setCategories((prev) => [...prev, { ...c, id: `cat_${Date.now()}` }]),
      addCategories: (list) => {
        const stamp = Date.now();
        const ids = list.map((_, i) => `cat_${stamp}_${i}`);
        setCategories((prev) => [...prev, ...list.map((c, i) => ({ ...c, id: ids[i] }))]);
        return ids;
      },
      updateCategory: (id, patch) =>
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
      deleteCategory: (id) => {
        if (PROTECTED_CATEGORY_IDS.includes(id)) return;
        setCategories((prev) => prev.filter((c) => c.id !== id));
      },
      resetCategories: () => setCategories(DEFAULT_CATEGORIES),
    };
  }, [categories, setCategories]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
