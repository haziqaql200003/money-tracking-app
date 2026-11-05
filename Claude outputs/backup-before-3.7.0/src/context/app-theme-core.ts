import { createContext } from 'react';

import type { AppThemeId, ThemeColors } from '@/constants/app-themes';

export type AppThemeValue = {
  /** Colours every screen uses (the Tenun palette, or a premium card theme in dark mode). */
  colors: ThemeColors;
  /** The premium theme the pengguna picked, or null for the normal look. */
  themeId: AppThemeId | null;
  /** True when the full premium theme is showing (it only shows in dark mode). */
  premiumActive: boolean;
};

/**
 * Kept in its own file so `useTheme` can read it without importing the provider (which needs the
 * transactions and settings contexts). Screens outside the provider (sign-in) get the normal palette.
 */
export const AppThemeContext = createContext<AppThemeValue | null>(null);
