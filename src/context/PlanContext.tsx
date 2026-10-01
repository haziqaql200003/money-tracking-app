import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useSettings } from '@/context/SettingsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import {
  cancelAllReminders,
  configureNotifications,
  getPermission,
  notifyNow,
  replaceScheduled,
  requestPermission,
  type PermissionState,
} from '@/services/notifications';
import { formatMoney } from '@/utils/currency';
import { monthKeyFromOffset, toDateKey } from '@/utils/dates';
import { goalSaved, type GoalEntry, type SavingsGoal } from '@/utils/goals';
import {
  budgetAlertsToSend,
  buildReminders,
  currentAlertKeys,
  DEFAULT_REMINDER_PREFS,
  type ReminderPrefs,
} from '@/utils/reminders';

type PlanContextValue = {
  /** True once goals, preferences and the alert log are loaded. */
  ready: boolean;

  goals: SavingsGoal[];
  goalEntries: GoalEntry[];
  addGoal: (g: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, patch: Partial<Omit<SavingsGoal, 'id'>>) => void;
  /** Also removes the goal's history. */
  deleteGoal: (id: string) => void;
  /** Positive adds, negative takes out. A withdrawal can never be more than what the goal holds. */
  addGoalEntry: (goalId: string, amount: number, date: string, note?: string) => void;
  deleteGoalEntry: (id: string) => void;

  reminderPrefs: ReminderPrefs;
  /** The system permission. null until it has been checked. */
  permission: PermissionState | null;
  /** Asks the system for permission (if needed) and switches reminders on. Returns false when not allowed. */
  enableReminders: () => Promise<boolean>;
  disableReminders: () => void;
  setDaysBefore: (days: number) => void;
  setBudgetAlerts: (on: boolean) => void;

  resetPlan: () => void;
};

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

const NO_GOALS: SavingsGoal[] = [];
const NO_ENTRIES: GoalEntry[] = [];
const NO_KEYS: string[] = [];

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { ready: txReady, transactions, recurringRules } = useTransactions();
  const { expenseCategories } = useCategories();
  const { warnPercent } = useSettings();
  const { hideAmounts } = usePrivacy();

  const [goals, setGoals, goalsReady] = usePersistedState<SavingsGoal[]>('plan_goals', NO_GOALS, userId);
  const [goalEntries, setGoalEntries, entriesReady] = usePersistedState<GoalEntry[]>('plan_goal_entries', NO_ENTRIES, userId);
  const [reminderPrefs, setReminderPrefs, prefsReady] = usePersistedState<ReminderPrefs>('plan_reminders', DEFAULT_REMINDER_PREFS, userId);
  const [sentAlerts, setSentAlerts, alertsReady] = usePersistedState<string[]>('plan_alerts_sent', NO_KEYS, userId);

  const ready = goalsReady && entriesReady && prefsReady && alertsReady;

  const [permission, setPermission] = useState<PermissionState | null>(null);
  // Bumped whenever the app comes back to the foreground, so the day rolls over and reminders are re-planned.
  const [foregroundTick, setForegroundTick] = useState(0);
  const inFlightAlerts = useRef(new Set<string>());

  const money = useCallback((n: number) => (hideAmounts ? 'RM ••••' : formatMoney(n)), [hideAmounts]);
  const budgets = useMemo(
    () => expenseCategories.map((c) => ({ id: c.id, name: c.name, limit: c.monthlyLimit })),
    [expenseCategories],
  );

  // --- permission: check at start and every time the app is reopened (the user may change it in Settings) ---
  useEffect(() => {
    let cancelled = false;
    void configureNotifications();
    const check = () =>
      getPermission().then((p) => {
        if (!cancelled) setPermission(p);
      });
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void check();
        setForegroundTick((n) => n + 1);
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // --- bill / income reminders: plan again whenever rules, settings or the day change ---
  const todayKey = toDateKey(new Date());
  useEffect(() => {
    if (!ready || !txReady || permission === null) return;
    let cancelled = false;
    void (async () => {
      if (!reminderPrefs.enabled || permission !== 'granted') {
        await cancelAllReminders();
        return;
      }
      if (cancelled) return;
      await replaceScheduled(
        buildReminders({ rules: recurringRules, now: new Date(), todayKey, daysBefore: reminderPrefs.daysBefore, money }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, txReady, permission, reminderPrefs.enabled, reminderPrefs.daysBefore, recurringRules, todayKey, money, foregroundTick]);

  // --- budget alerts: when a category reaches its warning level or goes over, tell the user once ---
  const monthKey = monthKeyFromOffset(0);
  useEffect(() => {
    if (!ready || !txReady || !reminderPrefs.enabled || !reminderPrefs.budgetAlerts || permission !== 'granted') return;
    const sent = new Set(sentAlerts);
    for (const k of inFlightAlerts.current) sent.add(k);
    const alerts = budgetAlertsToSend({ transactions, monthKey, warnPercent, budgets, sent, money });
    if (alerts.length === 0) return;

    // Remember them straight away so a quick re-render can never announce the same thing twice.
    for (const a of alerts) inFlightAlerts.current.add(a.key);
    void (async () => {
      for (const a of alerts) await notifyNow(a.title, a.body).catch(() => {});
      setSentAlerts((prev) => {
        // Keep only this month's keys so the log does not grow forever.
        const keep = prev.filter((k) => k.startsWith(`${monthKey}:`));
        return Array.from(new Set([...keep, ...alerts.map((a) => a.key)]));
      });
      for (const a of alerts) inFlightAlerts.current.delete(a.key);
    })();
  }, [ready, txReady, reminderPrefs.enabled, reminderPrefs.budgetAlerts, permission, transactions, monthKey, warnPercent, budgets, sentAlerts, money, setSentAlerts]);

  /** Marks everything that is already over/near budget as announced, so switching alerts on is not noisy. */
  const seedAlerts = useCallback(() => {
    const keys = currentAlertKeys({ transactions, monthKey, warnPercent, budgets, sent: new Set(), money });
    setSentAlerts((prev) => Array.from(new Set([...prev.filter((k) => k.startsWith(`${monthKey}:`)), ...keys])));
  }, [transactions, monthKey, warnPercent, budgets, money, setSentAlerts]);

  const value = useMemo<PlanContextValue>(
    () => ({
      ready,
      goals,
      goalEntries,
      addGoal: (g) =>
        setGoals((prev) => [...prev, { ...g, id: newId('goal'), createdAt: toDateKey(new Date()) }]),
      updateGoal: (id, patch) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g))),
      deleteGoal: (id) => {
        setGoals((prev) => prev.filter((g) => g.id !== id));
        setGoalEntries((prev) => prev.filter((e) => e.goalId !== id));
      },
      addGoalEntry: (goalId, amount, date, note) =>
        setGoalEntries((prev) => {
          let value = Math.round(amount * 100) / 100;
          if (value < 0) value = -Math.min(-value, goalSaved(prev, goalId));
          if (value === 0) return prev;
          return [...prev, { id: newId('ge'), goalId, amount: value, date, note: note?.trim() || undefined }];
        }),
      deleteGoalEntry: (id) => setGoalEntries((prev) => prev.filter((e) => e.id !== id)),

      reminderPrefs,
      permission,
      enableReminders: async () => {
        const state = permission === 'granted' ? 'granted' : await requestPermission();
        setPermission(state);
        if (state !== 'granted') return false;
        seedAlerts();
        setReminderPrefs((p) => ({ ...p, enabled: true }));
        return true;
      },
      disableReminders: () => setReminderPrefs((p) => ({ ...p, enabled: false })),
      setDaysBefore: (days) => setReminderPrefs((p) => ({ ...p, daysBefore: days })),
      setBudgetAlerts: (on) => {
        if (on) seedAlerts();
        setReminderPrefs((p) => ({ ...p, budgetAlerts: on }));
      },

      resetPlan: () => {
        setGoals(NO_GOALS);
        setGoalEntries(NO_ENTRIES);
        setReminderPrefs(DEFAULT_REMINDER_PREFS);
        setSentAlerts(NO_KEYS);
      },
    }),
    [ready, goals, goalEntries, reminderPrefs, permission, seedAlerts, setGoals, setGoalEntries, setReminderPrefs, setSentAlerts],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
