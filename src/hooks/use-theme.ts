import { useContext } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemeColors } from '@/constants/app-themes';
import { Colors } from '@/constants/theme';
import { AppThemeContext } from '@/context/app-theme-core';

/**
 * Colours for the current screen. Inside the app this is the premium card theme when one is picked
 * (dark mode), otherwise the normal Tenun palette. Screens before sign-in always get the normal palette.
 */
export function useTheme(): ThemeColors {
  const app = useContext(AppThemeContext);
  const scheme = useColorScheme();
  if (app) return app.colors;
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
