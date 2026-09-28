export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
  monthlyLimit: number; // 0 = no budget tracked for this category
};

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#FF9F43', subcategories: ['Groceries', 'Restaurants', 'Coffee'], monthlyLimit: 500 },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#5B8DEF', subcategories: ['Fuel', 'Parking', 'Public Transit'], monthlyLimit: 200 },
  { id: 'bills', name: 'Bills', icon: '📄', color: '#7C5CFC', subcategories: ['Rent', 'Utilities', 'Subscriptions'], monthlyLimit: 1000 },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#F0529C', subcategories: ['Clothes', 'Electronics', 'Other'], monthlyLimit: 300 },
  { id: 'income', name: 'Income', icon: '💰', color: '#2ECC71', subcategories: ['Salary', 'Bonus', 'Other'], monthlyLimit: 0 },
  { id: 'other', name: 'Other', icon: '📦', color: '#8E8E93', subcategories: ['Misc'], monthlyLimit: 100 },
];

export const EXPENSE_CATEGORY_IDS = ['food', 'transport', 'bills', 'shopping', 'other'] as const;
export const INCOME_CATEGORY_ID = 'income';