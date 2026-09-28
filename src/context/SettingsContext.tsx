import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

type SettingsContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (t: ThemePreference) => void;
  /** Budget turns "nearing limit" at this % of the limit. */
  warnPercent: number;
  setWarnPercent: (n: number) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [warnPercent, setWarnPercent] = useState(80);

  // Overrides the OS scheme for the whole app (null = follow the system again).
  useEffect(() => {
    Appearance.setColorScheme(themePreference === 'system' ? null : themePreference);
  }, [themePreference]);

  const value = useMemo(
    () => ({ themePreference, setThemePreference, warnPercent, setWarnPercent }),
    [themePreference, warnPercent],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}