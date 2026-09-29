import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { CURRENT_VERSION } from '@/constants/changelog';

const LAST_SEEN_VERSION_KEY = 'updates:lastSeenVersion';

type UpdatesContextValue = {
  currentVersion: string;
  /** True until the person opens What's New for this version. Persisted across launches. */
  hasUnseenUpdate: boolean;
  /** True once we've checked storage and know whether there's an unseen update. */
  isReady: boolean;
  markUpdateSeen: () => void;
};

const UpdatesContext = createContext<UpdatesContextValue | undefined>(undefined);

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const [seenVersion, setSeenVersion] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LAST_SEEN_VERSION_KEY)
      .then((stored) => {
        if (!cancelled) setSeenVersion(stored);
      })
      .catch(() => {
        // Storage unavailable — treat as unseen this session, don't block startup.
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function markUpdateSeen() {
    setSeenVersion(CURRENT_VERSION);
    AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_VERSION).catch(() => {});
  }

  const value = useMemo<UpdatesContextValue>(
    () => ({
      currentVersion: CURRENT_VERSION,
      hasUnseenUpdate: seenVersion !== CURRENT_VERSION,
      isReady,
      markUpdateSeen,
    }),
    [seenVersion, isReady],
  );

  return <UpdatesContext.Provider value={value}>{children}</UpdatesContext.Provider>;
}

export function useUpdates() {
  const ctx = useContext(UpdatesContext);
  if (!ctx) throw new Error('useUpdates must be used within UpdatesProvider');
  return ctx;
}