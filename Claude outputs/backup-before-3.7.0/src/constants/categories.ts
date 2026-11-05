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
export const FALLBACK_INCOME_ID = 'otherincome';
export const PROTECTED_CATEGORY_IDS: string[] = [FALLBACK_EXPENSE_ID, FALLBACK_INCOME_ID];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Drinks', icon: 'fast-food', color: '#FF9F43', kind: 'expense', subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee / Tea', 'Fast Food', 'Restaurant / Dining', 'Food Delivery', 'Groceries', 'Eating Out'], monthlyLimit: 500 }, // i18n-ignore: stored English data name
  { id: 'transport', name: 'Transport', icon: 'car', color: '#5B8DEF', kind: 'expense', subcategories: ['Petrol / Fuel', 'Toll', 'Parking', 'Public Transport', 'Grab / E-hailing', 'Taxi', 'Car Maintenance', 'Motorcycle Maintenance', 'Car Insurance / Road Tax', 'Car Wash', 'Public Transport Pass'], monthlyLimit: 200 }, // i18n-ignore: stored English data name
  { id: 'bills', name: 'Housing & Utilities', icon: 'home', color: '#7C5CFC', kind: 'expense', subcategories: ['Rent', 'Mortgage / Housing Loan', 'Electricity', 'Water', 'Internet', 'Mobile Phone', 'Gas', 'Maintenance Fee', 'Household Supplies', 'Home Repairs', 'Home Appliances'], monthlyLimit: 1000 }, // i18n-ignore: stored English data name
  { id: 'shopping', name: 'Shopping', icon: 'bag-handle', color: '#F0529C', kind: 'expense', subcategories: ['Clothing', 'Shoes', 'Accessories', 'Electronics', 'Gadgets', 'Beauty', 'Cosmetics', 'Personal Care', 'Household Items', 'Gifts', 'Online Shopping', 'Hobbies'], monthlyLimit: 300 }, // i18n-ignore: stored English data name
  { id: 'health', name: 'Health & Medical', icon: 'medkit', color: '#EF4444', kind: 'expense', subcategories: ['Doctor', 'Hospital', 'Medicine', 'Dental', 'Eye Care', 'Health Check-up', 'Health Insurance', 'Supplements', 'Fitness / Gym'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'education', name: 'Education', icon: 'school', color: '#EAB308', kind: 'expense', subcategories: ['Tuition / Courses', 'Books', 'Stationery', 'Online Courses', 'Certification', 'Training', 'Education Fees', 'Student Loan'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'entertainment', name: 'Entertainment', icon: 'game-controller', color: '#A855F7', kind: 'expense', subcategories: ['Movies', 'Games', 'Concerts', 'Events', 'Streaming', 'Music', 'Hobbies', 'Sports', 'Recreation', 'Theme Parks'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'financial', name: 'Financial', icon: 'card', color: '#14B8A6', kind: 'expense', subcategories: ['Credit Card Payment', 'Loan Payment', 'Personal Loan', 'BNPL', 'Bank Fees', 'Interest', 'Investment', 'Savings', 'Emergency Fund', 'Insurance', 'Taxes'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'family', name: 'Family & Personal', icon: 'people', color: '#F97316', kind: 'expense', subcategories: ['Parents', 'Children', 'Spouse / Partner', 'Allowance', 'Family Expenses', 'Baby / Childcare', 'Pet', 'Personal Spending', 'Charity / Donation'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'travel', name: 'Travel', icon: 'airplane', color: '#0EA5E9', kind: 'expense', subcategories: ['Flight', 'Hotel', 'Accommodation', 'Transport', 'Food', 'Activities', 'Travel Insurance', 'Travel Shopping', 'Visa / Passport'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'work', name: 'Work & Business', icon: 'briefcase', color: '#475569', kind: 'expense', subcategories: ['Work Meals', 'Work Transport', 'Work Equipment', 'Office Supplies', 'Business Expenses', 'Freelance Expenses', 'Professional Membership', 'Work Clothing'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat', color: '#84CC16', kind: 'expense', subcategories: ['Netflix', 'Spotify', 'YouTube', 'Cloud Storage', 'Software', 'AI Tools', 'Gaming', 'News / Publications', 'Memberships'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'gifts', name: 'Gifts & Occasions', icon: 'gift', color: '#EC4899', kind: 'expense', subcategories: ['Birthday', 'Wedding', 'Anniversary', 'Festive / Raya', 'Christmas', 'Valentine\'s Day', 'Graduation', 'Other Gifts'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'religious', name: 'Religious & Community', icon: 'moon', color: '#10B981', kind: 'expense', subcategories: ['Zakat', 'Donation', 'Mosque / Surau', 'Religious Activities', 'Community Activities', 'Charity'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'other', name: 'Miscellaneous', icon: 'cube', color: '#8E8E93', kind: 'expense', subcategories: ['Uncategorized', 'Other', 'Unexpected Expense'], monthlyLimit: 100 }, // i18n-ignore: stored English data name
  { id: 'income', name: 'Salary', icon: 'cash', color: '#2ECC71', kind: 'income', subcategories: ['Salary', 'Overtime', 'Bonus', 'Commission', 'Allowance'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'freelance', name: 'Business & Freelance', icon: 'briefcase', color: '#16A34A', kind: 'income', subcategories: ['Freelance', 'Business'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'investment', name: 'Investment', icon: 'trending-up', color: '#059669', kind: 'income', subcategories: ['Dividend', 'Interest', 'Rental Income', 'Investment Return', 'Royalties'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
  { id: 'otherincome', name: 'Other Income', icon: 'sparkles', color: '#65A30D', kind: 'income', subcategories: ['Cashback', 'Refund', 'Reimbursement', 'Gift Received', 'Government Assistance', 'Other Income'], monthlyLimit: 0 }, // i18n-ignore: stored English data name
];

/** Bump when DEFAULT_CATEGORIES changes in a way existing users should receive (see utils/category-upgrade.ts). */
export const CATEGORY_SCHEMA_VERSION = 2;

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