import { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';

type PrivacyContextValue = {
  /** When true, balances on the account cards are masked. Remembered per account. */
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [hideAmounts, setHideAmounts] = usePersistedState<boolean>('hideAmounts', false, user?.id ?? null);
  const toggleHideAmounts = useCallback(() => setHideAmounts((prev) => !prev), [setHideAmounts]);
  const value = useMemo(() => ({ hideAmounts, toggleHideAmounts }), [hideAmounts, toggleHideAmounts]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider');
  return ctx;
}
