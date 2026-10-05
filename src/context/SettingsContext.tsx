import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { loadJSON, saveJSON } from '@/services/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

type SettingsContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (t: ThemePreference) => void;
  /** Budget turns "nearing limit" at this % of the limit. */
  warnPercent: number;
  setWarnPercent: (n: number) => void;
  /** RM/day guideline shown as a horizontal line on the weekly spending chart. 0 = off. */
  dailyLimit: number;
  setDailyLimit: (n: number) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

type UserSettings = { warnPercent: number; dailyLimit: number };
const DEFAULT_USER_SETTINGS: UserSettings = { warnPercent: 80, dailyLimit: 0 };

// The theme belongs to this phone, not to an account, so the sign-in screens already look right.
const THEME_KEY = 'app:themePreference';
const isTheme = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [themePreference, setThemeState] = useState<ThemePreference>('system');
  const [userSettings, setUserSettings] = usePersistedState<UserSettings>('settings', DEFAULT_USER_SETTINGS, user?.id ?? null);

  useEffect(() => {
    let cancelled = false;
    loadJSON<string>(THEME_KEY).then((stored) => {
      if (cancelled) return;
      if (isTheme(stored)) setThemeState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Overrides the OS scheme for the whole app ('unspecified' = follow the system again).
  useEffect(() => {
    Appearance.setColorScheme(themePreference === 'system' ? 'unspecified' : themePreference);
  }, [themePreference]);

  const setThemePreference = useCallback((t: ThemePreference) => {
    setThemeState(t);
    saveJSON(THEME_KEY, t);
  }, []);
  const setWarnPercent = useCallback((warnPercent: number) => setUserSettings((s) => ({ ...s, warnPercent })), [setUserSettings]);
  const setDailyLimit = useCallback((dailyLimit: number) => setUserSettings((s) => ({ ...s, dailyLimit })), [setUserSettings]);

  const value = useMemo(
    () => ({
      themePreference,
      setThemePreference,
      warnPercent: userSettings.warnPercent ?? DEFAULT_USER_SETTINGS.warnPercent,
      setWarnPercent,
      dailyLimit: userSettings.dailyLimit ?? DEFAULT_USER_SETTINGS.dailyLimit,
      setDailyLimit,
    }),
    [themePreference, setThemePreference, userSettings, setWarnPercent, setDailyLimit],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
