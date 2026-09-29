export type ChangeKind = 'new' | 'improved' | 'fixed';
export type ChangeEntry = { kind: ChangeKind; text: string };
export type Release = { version: string; date: string; title: string; changes: ChangeEntry[] };

export const CURRENT_VERSION = '1.0.1';

export const CHANGELOG: Release[] = [
  {
    version: '1.0.1',
    date: '2026-09-29',
    title: 'Budgets, custom categories & itemised transactions',
    changes: [
      { kind: 'new', text: 'Budgeting — set a monthly limit per category and track pace, projections and status under More → Budgets.' },
      { kind: 'new', text: 'Custom categories — add your own expense or income categories with icons, colours and subcategories under More → Categories.' },
      { kind: 'new', text: 'Itemised transactions — break a purchase into line items (food, drinks, service charge, SST, etc.) and the total adds up automatically.' },
      { kind: 'new', text: 'Vector icons replace emoji on accounts and categories, with a searchable icon picker.' },
      { kind: 'new', text: 'Assets now shows a donut chart of your accounts, switchable between "By account" and "By type".' },
      { kind: 'new', text: 'Edit and delete transactions and accounts by tapping them.' },
      { kind: 'new', text: 'Settings screen — theme (System/Light/Dark), hide-amounts, budget warning threshold, export & reset.' },
      { kind: 'improved', text: 'Transactions screen redesigned with month switching, search, category breakdown and CSV export.' },
      { kind: 'improved', text: 'Home screen groups recent transactions by day with quick filters.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-28',
    title: 'Initial release',
    changes: [
      { kind: 'new', text: 'Track spending and income across bank, cash and other accounts.' },
      { kind: 'new', text: 'Home dashboard with a balance carousel and spending chart.' },
      { kind: 'new', text: 'Basic categories with monthly limits.' },
    ],
  },
];