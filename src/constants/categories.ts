import type { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;
export type CategoryKind = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  icon: IconName;
  color: string; // 6-digit hex
  kind: CategoryKind;
  subcategories: string[];
  monthlyLimit: number; // 0 = no budget
};

/** Fallbacks: cannot be deleted. Transactions of a deleted category move here. */
export const FALLBACK_EXPENSE_ID = 'other';
export const FALLBACK_INCOME_ID = 'income';
export const PROTECTED_CATEGORY_IDS: string[] = [FALLBACK_EXPENSE_ID, FALLBACK_INCOME_ID];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'fast-food', color: '#FF9F43', kind: 'expense', subcategories: ['Groceries', 'Restaurants', 'Coffee'], monthlyLimit: 500 }, // i18n-ignore: stored English data name
  { id: 'transport', name: 'Transport', icon: 'car', color: '#5B8DEF', kind: 'expense', subcategories: ['Fuel', 'Parking', 'Public Transit'], monthlyLimit: 200 }, // i18n-ignore: stored English data name
  { id: 'bills', name: 'Bills', icon: 'receipt', color: '#7C5CFC', kind: 'expense', subcategories: ['Rent', 'Utilities', 'Subscriptions'], monthlyLimit: 1000 }, // i18n-ignore: stored English data name
  { id: 'shopping', name: 'Shopping', icon: 'bag-handle', color: '#F0529C', kind: 'expense', subcategories: ['Clothes', 'Electronics', 'Other'], monthlyLimit: 300 }, // i18n-ignore: stored English data name
  { id: 'other', name: 'Other', icon: 'cube', color: '#8E8E93', kind: 'expense', subcategories: ['Misc'], monthlyLimit: 100 }, // i18n-ignore: stored English data name
  { id: 'income', name: 'Income', icon: 'cash', color: '#2ECC71', kind: 'income', subcategories: ['Salary', 'Bonus', 'Other'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
];

export const CATEGORY_COLORS = [
  '#FF9F43', '#EF4444', '#F0529C', '#A855F7', '#7C5CFC', '#5B8DEF', '#0EA5E9',
  '#14B8A6', '#2ECC71', '#84CC16', '#EAB308', '#F97316', '#8E8E93', '#475569',
];

/** Picker icons (Ionicons). If tsc complains about one name, just delete it from the list. */
export const CATEGORY_ICONS: IconName[] = [
  // food & drink
  'fast-food', 'restaurant', 'cafe', 'beer', 'wine', 'pizza', 'ice-cream', 'nutrition', 'fish', 'egg',
  // transport & travel
  'car', 'car-sport', 'bus', 'train', 'subway', 'bicycle', 'boat', 'airplane', 'walk', 'navigate', 'rocket', 'map', 'compass', 'location',
  // home & bills
  'home', 'bed', 'water', 'flash', 'flame', 'wifi', 'call', 'phone-portrait', 'tv', 'receipt', 'document-text', 'key', 'construct', 'hammer', 'lock-closed', 'print',
  // shopping & style
  'cart', 'bag-handle', 'shirt', 'gift', 'pricetag', 'storefront', 'watch', 'glasses', 'cut', 'brush', 'color-palette', 'diamond',
  // health & fitness
  'medkit', 'heart', 'pulse', 'bandage', 'medical', 'fitness', 'barbell', 'body', 'thermometer',
  // education & work
  'school', 'book', 'library', 'briefcase', 'laptop', 'desktop', 'pencil', 'calculator', 'newspaper', 'mail', 'megaphone', 'bulb',
  // fun & sports
  'game-controller', 'film', 'musical-notes', 'headset', 'camera', 'ticket', 'football', 'basketball', 'tennisball', 'trophy', 'dice', 'balloon',
  // family, pets & nature
  'paw', 'happy', 'people', 'person', 'flower', 'leaf', 'sunny', 'moon', 'umbrella', 'cloud', 'earth', 'globe', 'planet', 'bonfire',
  // money
  'cash', 'wallet', 'card', 'trending-up', 'stats-chart', 'pie-chart', 'shield-checkmark', 'business', 'swap-horizontal', 'repeat', 'ribbon', 'star', 'thumbs-up', 'sparkles',
  // misc
  'calendar', 'alarm', 'hourglass', 'paper-plane', 'flag', 'cog', 'eye', 'cube', 'grid', 'apps', 'shapes', 'ellipsis-horizontal',
];