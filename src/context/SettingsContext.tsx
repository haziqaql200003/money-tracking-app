import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { loadJSON, saveJSON } from '@/services/storage';
import type { MyStateCode, Region } from '@/constants/my-holidays';
import { clampPayday, setPaydayRule, type PaydayRuleEntry } from '@/utils/cycle';
import { clampTarget, DEFAULT_SAVINGS_TARGET } from '@/utils/insight-feed';

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
  /** Savings rate (% of income) the WaKira score aims for. */
  savingsTarget: number;
  setSavingsTarget: (n: number) => void;
  /** Day of the month salary arrives (1-28). A financial month runs from one payday to the day before the next. */
  payday: number;
  setPayday: (n: number) => void;
  /** Payday is the last day of every month (31 Jan, 28 Feb ...). `payday` is ignored while this is on. */
  paydayEom: boolean;
  setPaydayEom: (on: boolean) => void;
  /** Move payday to the working day before when it lands on a weekend or a Malaysian public holiday. */
  paydayAdjust: boolean;
  setPaydayAdjust: (on: boolean) => void;
  /** Go back to plain calendar months (1st to last day): payday 1, no end-of-month, no working-day rule, payday history cleared. Records are not touched. */
  setCalendarMonths: () => void;
  /** Where the user lives. Decides which public holidays and which weekend (Sat-Sun or Fri-Sat) the payday rule uses. */
  country: Region['country'];
  setCountry: (c: Region['country']) => void;
  state: MyStateCode | null;
  setState: (s: MyStateCode | null) => void;
  /** Earlier payday rules (before the current one), oldest first. Empty unless the payday rule has changed over time. */
  paydayHistory: PaydayRuleEntry[];
  /** The date the current rule starts to apply, or null when it has always applied. */
  paydayFrom: string | null;
  /** Starts a new payday rule on `r.from`. Earlier months keep the rule they had. */
  changePayday: (r: PaydayRuleEntry) => void;
  /** Removes the latest change and goes back to the rule before it. */
  undoPaydayChange: () => void;
  /** Changes whenever any payday rule changes. */
  /** True when months are plain calendar months (payday the 1st, no end-of-month, no working-day rule, no history). */
  calendarMonths: boolean;
  paydayRuleKey: string;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

type UserSettings = { warnPercent: number; dailyLimit: number; savingsTarget?: number; payday?: number; paydayEom?: boolean; paydayAdjust?: boolean; paydayFrom?: string; paydayPast?: PaydayRuleEntry[]; country?: Region['country']; state?: MyStateCode | null };
const DEFAULT_USER_SETTINGS: UserSettings = { warnPercent: 80, dailyLimit: 0, savingsTarget: DEFAULT_SAVINGS_TARGET, payday: 1 };

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
    if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme(themePreference === 'system' ? 'unspecified' : themePreference);
  }, [themePreference]);

  const setThemePreference = useCallback((t: ThemePreference) => {
    setThemeState(t);
    saveJSON(THEME_KEY, t);
  }, []);
  const setWarnPercent = useCallback((warnPercent: number) => setUserSettings((s) => ({ ...s, warnPercent })), [setUserSettings]);
  const setDailyLimit = useCallback((dailyLimit: number) => setUserSettings((s) => ({ ...s, dailyLimit })), [setUserSettings]);

  const setSavingsTarget = useCallback((n: number) => setUserSettings((s) => ({ ...s, savingsTarget: clampTarget(n) })), [setUserSettings]);

  const setPaydayValue = useCallback((n: number) => setUserSettings((s) => ({ ...s, payday: clampPayday(n) })), [setUserSettings]);
  // Turning end-of-month on also turns the working-day rule on the first time, which is what it is almost always wanted for.
  const setPaydayEom = useCallback(
    (on: boolean) => setUserSettings((s) => ({ ...s, paydayEom: on, paydayAdjust: on && s.paydayAdjust === undefined ? true : s.paydayAdjust })),
    [setUserSettings],
  );
  const setPaydayAdjust = useCallback((on: boolean) => setUserSettings((s) => ({ ...s, paydayAdjust: on })), [setUserSettings]);

  const setCalendarMonths = useCallback(
    () => setUserSettings((s) => ({ ...s, payday: 1, paydayEom: false, paydayAdjust: false, paydayFrom: undefined, paydayPast: [] })),
    [setUserSettings],
  );
  const changePayday = useCallback(
    (r: PaydayRuleEntry) =>
      setUserSettings((s) => {
        const from = s.paydayFrom ?? '0000-01-01';
        if (r.from <= from) return s;
        const earlier: PaydayRuleEntry = { from, day: clampPayday(s.payday ?? 1), eom: s.paydayEom ?? false, adjust: s.paydayAdjust ?? false };
        return { ...s, paydayPast: [...(s.paydayPast ?? []), earlier], payday: clampPayday(r.day), paydayEom: r.eom, paydayAdjust: r.adjust, paydayFrom: r.from };
      }),
    [setUserSettings],
  );
  const undoPaydayChange = useCallback(
    () =>
      setUserSettings((s) => {
        const past = s.paydayPast ?? [];
        const last = past[past.length - 1];
        if (!last) return s;
        return { ...s, paydayPast: past.slice(0, -1), payday: last.day, paydayEom: last.eom, paydayAdjust: last.adjust, paydayFrom: last.from === '0000-01-01' ? undefined : last.from };
      }),
    [setUserSettings],
  );

  const setCountry = useCallback(
    (country: Region['country']) => setUserSettings((s) => ({ ...s, country, state: country === 'MY' ? s.state ?? null : null })),
    [setUserSettings],
  );
  const setState = useCallback((state: MyStateCode | null) => setUserSettings((s) => ({ ...s, state })), [setUserSettings]);

  const country = userSettings.country ?? 'MY';
  const state = country === 'MY' ? userSettings.state ?? null : null;
  const payday = clampPayday(userSettings.payday ?? 1);
  const paydayEom = userSettings.paydayEom ?? false;
  const paydayAdjust = userSettings.paydayAdjust ?? false;
  const paydayHistory = useMemo(() => userSettings.paydayPast ?? [], [userSettings.paydayPast]);
  const paydayFrom = userSettings.paydayFrom ?? null;
  const paydayRuleKey = `${payday}|${paydayEom ? 1 : 0}|${paydayAdjust ? 1 : 0}|${country}|${state ?? ''}|${paydayFrom ?? ''}|${paydayHistory.map((h) => `${h.from}:${h.day}:${h.eom ? 1 : 0}:${h.adjust ? 1 : 0}`).join(',')}`;
  // Set during render, before any child renders, so every screen reads the same rule as this value.
  setPaydayRule({ day: payday, eom: paydayEom, adjust: paydayAdjust, country, state, history: paydayHistory, from: paydayFrom });

  const value = useMemo(
    () => ({
      themePreference,
      setThemePreference,
      warnPercent: userSettings.warnPercent ?? DEFAULT_USER_SETTINGS.warnPercent,
      setWarnPercent,
      dailyLimit: userSettings.dailyLimit ?? DEFAULT_USER_SETTINGS.dailyLimit,
      setDailyLimit,
      savingsTarget: clampTarget(userSettings.savingsTarget ?? DEFAULT_SAVINGS_TARGET),
      setSavingsTarget,
      payday,
      setPayday: setPaydayValue,
      paydayEom,
      setPaydayEom,
      paydayAdjust,
      setPaydayAdjust,
      setCalendarMonths,
      paydayHistory,
      paydayFrom,
      changePayday,
      undoPaydayChange,
      country,
      setCountry,
      state,
      setState,
      calendarMonths: payday <= 1 && !paydayEom && !paydayAdjust && paydayHistory.length === 0,
      paydayRuleKey,
    }),
    [themePreference, setThemePreference, userSettings, setWarnPercent, setDailyLimit, setSavingsTarget, payday, setPaydayValue, paydayEom, setPaydayEom, paydayAdjust, setPaydayAdjust, setCalendarMonths, paydayHistory, paydayFrom, changePayday, undoPaydayChange, country, setCountry, state, setState, paydayRuleKey],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
