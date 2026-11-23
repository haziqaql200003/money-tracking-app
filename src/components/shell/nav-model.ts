import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

import type { TKey } from '@/i18n';

/**
 * One map of WaKira's places, grouped by the motto Kira · Faham · Rancang. The desktop side menu, the tablet
 * icon rail, the More page and the "no back button on menu pages" rule all read it, so a page is added or moved
 * in one place only.
 */
export type NavItem = {
  /** Matches the tab route name or the segment after /more/. */
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: TKey;
  /** A bottom tab (index, transactions, analyse). */
  tab?: 'index' | 'transactions' | 'analyse';
  /** A page inside More. */
  href?: Href;
};

export type NavGroup = {
  id: 'kira' | 'faham' | 'rancang';
  titleKey: TKey;
  subKey: TKey;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'kira',
    titleKey: 'home.nav.kira',
    subKey: 'home.nav.kiraSub',
    items: [
      { id: 'index', icon: 'home-outline', labelKey: 'home.tabs.home', tab: 'index' },
      { id: 'transactions', icon: 'list-outline', labelKey: 'home.tabs.transactions', tab: 'transactions' },
      { id: 'assets', icon: 'wallet-outline', labelKey: 'more.index.menu.assets', href: '/more/assets' },
      { id: 'debts', icon: 'card-outline', labelKey: 'more.index.menu.debts', href: '/more/debts' },
      { id: 'recurring', icon: 'repeat-outline', labelKey: 'more.index.menu.recurring', href: '/more/recurring' },
    ],
  },
  {
    id: 'faham',
    titleKey: 'home.nav.faham',
    subKey: 'home.nav.fahamSub',
    items: [
      { id: 'analyse', icon: 'bar-chart-outline', labelKey: 'home.tabs.analyse', tab: 'analyse' },
      { id: 'report', icon: 'document-text-outline', labelKey: 'mrep.title', href: '/more/report' },
      { id: 'ai', icon: 'sparkles-outline', labelKey: 'ai.title', href: '/more/ai' },
    ],
  },
  {
    id: 'rancang',
    titleKey: 'home.nav.rancang',
    subKey: 'home.nav.rancangSub',
    items: [
      { id: 'rancang', icon: 'flag-outline', labelKey: 'home.nav.rancangOverview', href: '/more/rancang' },
      { id: 'budgets', icon: 'pie-chart-outline', labelKey: 'more.index.menu.budgets', href: '/more/budgets' },
      { id: 'goals', icon: 'trophy-outline', labelKey: 'plan.goals.title', href: '/more/goals' },
      { id: 'planner', icon: 'cash-outline', labelKey: 'alloc.title', href: '/more/planner' },
      { id: 'cashflow', icon: 'calendar-outline', labelKey: 'cal.title', href: '/more/cashflow' },
      { id: 'tax', icon: 'receipt-outline', labelKey: 'tax.title', href: '/more/tax' },
    ],
  },
];

/** The footer link of the side menu and rail. */
export const SETTINGS_ITEM: NavItem = { id: 'settings', icon: 'settings-outline', labelKey: 'home.nav.settingsHelp', href: '/more' };

/** Every /more/... page that the side menu opens directly. On desktop these are places of their own: no back button. */
export const MENU_PAGES = new Set(
  NAV_GROUPS.flatMap((g) => g.items)
    .filter((i) => typeof i.href === 'string')
    .map((i) => i.href as string),
);

/** Which menu item an address belongs to, so the right row is lit however the page was reached. */
export function activeNavId(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'index';
  if (pathname === '/more') return 'settings';
  if (pathname.startsWith('/more/')) {
    const sub = pathname.slice('/more/'.length).split('/')[0];
    const known = NAV_GROUPS.some((g) => g.items.some((i) => i.id === sub));
    // Settings, Profile, Data, About, What's new… all live under "Settings & help".
    return known ? sub : 'settings';
  }
  return pathname.slice(1).split('/')[0];
}

/** The group the current page sits in (none for Settings & help). */
export function activeGroupId(pathname: string): NavGroup['id'] | null {
  const id = activeNavId(pathname);
  return NAV_GROUPS.find((g) => g.items.some((i) => i.id === id))?.id ?? null;
}
