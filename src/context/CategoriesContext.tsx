import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import {
  DEFAULT_CATEGORIES,
  FALLBACK_EXPENSE_ID,
  PROTECTED_CATEGORY_IDS,
  type Category,
} from '@/constants/categories';

type CategoriesContextValue = {
  categories: Category[];
  /** Expense categories, with the fallback ("Other") always last. */
  expenseCategories: Category[];
  incomeCategories: Category[];
  /** Sum of every expense category's monthly limit. */
  totalBudget: number;
  getCategory: (id: string) => Category | undefined;
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  /** Only removes the category. Move its transactions first with `reassignCategory`. */
  deleteCategory: (id: string) => void;
  resetCategories: () => void;
};

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

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
      updateCategory: (id, patch) =>
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
      deleteCategory: (id) => {
        if (PROTECTED_CATEGORY_IDS.includes(id)) return;
        setCategories((prev) => prev.filter((c) => c.id !== id));
      },
      resetCategories: () => setCategories(DEFAULT_CATEGORIES),
    };
  }, [categories]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}