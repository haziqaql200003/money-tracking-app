import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const LAST_SEEN_VERSION_KEY = 'settings:lastSeenVersion';

type SettingsContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (t: ThemePreference) => void;
  /** Budget turns "nearing limit" at this % of the limit. */
  warnPercent: number;
  setWarnPercent: (n: number) => void;
  /** RM/day guideline shown as a horizontal line on the weekly spending chart. 0 = off. */
  dailyLimit: number;
  setDailyLimit: (n: number) => void;
  /** True once we've loaded stored settings and know whether to show What's New. */
  isReady: boolean;
  /** True when the current app version hasn't been marked as seen yet. */
  showWhatsNew: boolean;
  /** Call after the user dismisses the What's New alert. */
  dismissWhatsNew: () => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const currentVersion = Constants.expoConfig?.version ?? '1.0.0';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [warnPercent, setWarnPercent] = useState(80);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // Overrides the OS scheme for the whole app (null = follow the system again).
  useEffect(() => {
    Appearance.setColorScheme(themePreference === 'system' ? null : themePreference);
  }, [themePreference]);

  // On launch: compare the stored "last seen" version to the running app version.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LAST_SEEN_VERSION_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored !== currentVersion) setShowWhatsNew(true);
      })
      .catch(() => {
        // Storage unavailable — don't block startup, just skip the alert this time.
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function dismissWhatsNew() {
    setShowWhatsNew(false);
    AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion).catch(() => {});
  }

  const value = useMemo(
    () => ({
      themePreference,
      setThemePreference,
      warnPercent,
      setWarnPercent,
      dailyLimit,
      setDailyLimit }),
    [themePreference, warnPercent, dailyLimit],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}