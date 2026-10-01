import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [warnPercent, setWarnPercent] = useState(80);
  const [dailyLimit, setDailyLimit] = useState(0);

  // Overrides the OS scheme for the whole app ('unspecified' = follow the system again).
  useEffect(() => {
    Appearance.setColorScheme(themePreference === 'system' ? 'unspecified' : themePreference);
  }, [themePreference]);

  const value = useMemo(
    () => ({ themePreference, setThemePreference, warnPercent, setWarnPercent, dailyLimit, setDailyLimit }),
    [themePreference, warnPercent, dailyLimit],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}