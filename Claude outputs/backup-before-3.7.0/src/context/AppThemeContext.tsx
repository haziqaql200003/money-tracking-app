import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { buildPalette, themeForCard, type AppThemeId } from '@/constants/app-themes';
import { normalizeDesign, normalizeFinish } from '@/constants/card-styles';
import { AppThemeContext } from '@/context/app-theme-core';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';

/**
 * Applies the premium theme of the card the pengguna picked in Settings > Card theme.
 * The theme follows that card's design (and Titanium finish), so changing the card's look changes the theme too.
 * It never follows the card that happens to be in view in the Home carousel.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const dark = useColorScheme() === 'dark';
  const { themeCard } = useSettings();
  const { accounts } = useTransactions();

  const card = themeCard ? accounts.find((a) => a.id === themeCard) : undefined;
  const themeId: AppThemeId | null = card ? themeForCard(normalizeDesign(card.design), normalizeFinish(card.finish)) : null;

  const value = useMemo(() => {
    const colors = buildPalette(themeId, dark);
    return { colors, themeId, premiumActive: !!themeId && dark };
  }, [themeId, dark]);

  // Navigation (screen backgrounds during transitions, headers) uses the same colours.
  const navTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    const c = value.colors;
    return {
      ...base,
      colors: { ...base.colors, primary: c.accent, background: c.background, card: c.backgroundElement, text: c.text, border: c.divider },
    };
  }, [dark, value.colors]);

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider value={navTheme}>{children}</ThemeProvider>
    </AppThemeContext.Provider>
  );
}

/** Which premium theme is on (for Settings and anything that wants to add theme-only touches). */
export function useAppTheme() {
  return useContext(AppThemeContext);
}
