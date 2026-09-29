import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { CURRENT_VERSION } from '@/constants/changelog';

type UpdatesContextValue = {
  currentVersion: string;
  /** True until the person opens What's New for this version. Resets each app launch (no persistence yet). */
  hasUnseenUpdate: boolean;
  markUpdateSeen: () => void;
};

const UpdatesContext = createContext<UpdatesContextValue | undefined>(undefined);

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const [seenVersion, setSeenVersion] = useState<string | null>(null);

  const value = useMemo<UpdatesContextValue>(
    () => ({
      currentVersion: CURRENT_VERSION,
      hasUnseenUpdate: seenVersion !== CURRENT_VERSION,
      markUpdateSeen: () => setSeenVersion(CURRENT_VERSION),
    }),
    [seenVersion],
  );

  return <UpdatesContext.Provider value={value}>{children}</UpdatesContext.Provider>;
}

export function useUpdates() {
  const ctx = useContext(UpdatesContext);
  if (!ctx) throw new Error('useUpdates must be used within UpdatesProvider');
  return ctx;
}