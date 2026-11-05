import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';

import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import type { AllocPlan, AllocStore } from '@/utils/allocation';
import type { TaxClaim } from '@/utils/tax-relief';

type ToolsContextValue = {
  ready: boolean;
  claims: TaxClaim[];
  addClaim: (c: Omit<TaxClaim, 'id'>) => void;
  updateClaim: (id: string, patch: Partial<Omit<TaxClaim, 'id'>>) => void;
  deleteClaim: (id: string) => void;
  /** Top income-tax rate (percent) used for the saving estimate. null = not chosen. */
  taxRate: number | null;
  setTaxRate: (rate: number | null) => void;
  /** Salary plans, one per pay cycle. */
  plans: AllocStore;
  setPlan: (cycleKey: string, plan: AllocPlan | null) => void;
};

const ToolsContext = createContext<ToolsContextValue | undefined>(undefined);

const NO_CLAIMS: TaxClaim[] = [];
const NO_PLANS: AllocStore = {};
type TaxPrefs = { rate: number | null };
const NO_PREFS: TaxPrefs = { rate: null };

let seq = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

/** Tax relief claims, the chosen tax rate and the salary plans. All of it is saved and synced like the rest. */
export function ToolsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [claims, setClaims, claimsReady] = usePersistedState<TaxClaim[]>('tax_claims', NO_CLAIMS, userId);
  const [prefs, setPrefs, prefsReady] = usePersistedState<TaxPrefs>('tax_prefs', NO_PREFS, userId);
  const [plans, setPlans, plansReady] = usePersistedState<AllocStore>('alloc_plans', NO_PLANS, userId);

  const addClaim = useCallback((c: Omit<TaxClaim, 'id'>) => setClaims((prev) => [...prev, { ...c, id: newId('tx') }]), [setClaims]);
  const updateClaim = useCallback(
    (id: string, patch: Partial<Omit<TaxClaim, 'id'>>) => setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [setClaims],
  );
  const deleteClaim = useCallback((id: string) => setClaims((prev) => prev.filter((c) => c.id !== id)), [setClaims]);
  const setTaxRate = useCallback((rate: number | null) => setPrefs((p) => ({ ...p, rate })), [setPrefs]);
  const setPlan = useCallback(
    (cycleKey: string, plan: AllocPlan | null) =>
      setPlans((prev) => {
        const next = { ...prev };
        if (plan) next[cycleKey] = plan;
        else delete next[cycleKey];
        return next;
      }),
    [setPlans],
  );

  const value = useMemo<ToolsContextValue>(
    () => ({ ready: claimsReady && prefsReady && plansReady, claims, addClaim, updateClaim, deleteClaim, taxRate: prefs.rate, setTaxRate, plans, setPlan }),
    [claimsReady, prefsReady, plansReady, claims, addClaim, updateClaim, deleteClaim, prefs.rate, setTaxRate, plans, setPlan],
  );
  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}

export function useTools() {
  const ctx = useContext(ToolsContext);
  if (!ctx) throw new Error('useTools must be used inside ToolsProvider');
  return ctx;
}
