import { createContext, ReactNode, useContext, useMemo } from 'react';

import {
  DEFAULT_CATEGORIES,
  FALLBACK_EXPENSE_ID,
  PROTECTED_CATEGORY_IDS,
  type Category,
} from '@/constants/categories';
import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';

type CategoriesContextValue = {
  categories: Category[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  totalBudget: number;
  getCategory: (id: string) => Category | undefined;
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  resetCategories: () => void;
};

const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = usePersistedState<Category[]>('categories', DEFAULT_CATEGORIES, user?.id ?? null);

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
  }, [categories, setCategories]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
