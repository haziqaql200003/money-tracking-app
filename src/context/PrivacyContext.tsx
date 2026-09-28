import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

type PrivacyContextValue = {
  /** When true, balances on the account cards are masked. */
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideAmounts, setHideAmounts] = useState(false);
  const toggleHideAmounts = useCallback(() => setHideAmounts((prev) => !prev), []);
  const value = useMemo(() => ({ hideAmounts, toggleHideAmounts }), [hideAmounts, toggleHideAmounts]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider');
  return ctx;
}