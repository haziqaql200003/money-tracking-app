import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { CHANGELOG, CURRENT_VERSION, type Release } from '@/constants/changelog';

const LAST_SEEN_VERSION_KEY = 'updates:lastSeenVersion';

/** How an update is announced: `major` (2.x.0 or x.0.0 changed) = highlight dialog, `minor` = short sheet, `badge` = only the dot on More. */
export type UpdatePopup = 'major' | 'minor' | 'badge' | null;

type UpdatesContextValue = {
  currentVersion: string;
  /** True until the person opens What's New (or the popup) for this version. Persisted across launches. */
  hasUnseenUpdate: boolean;
  /** True once we've checked storage and know whether there's an unseen update. */
  isReady: boolean;
  /** This launch is the first ever on this phone (nothing stored yet). */
  freshInstall: boolean;
  /** What to show for the current version, decided once at launch. */
  popup: UpdatePopup;
  /** The release notes behind the popup. */
  release: Release | undefined;
  markUpdateSeen: () => void;
};

const UpdatesContext = createContext<UpdatesContextValue | undefined>(undefined);

const parts = (v: string) => v.split('.').map((n) => Number(n) || 0);

/** Major/minor = the first or second number changed; anything else is a small update. */
export function popupFor(previous: string | null, current: string, release: Release | undefined): UpdatePopup {
  if (previous === current) return null;
  if (release?.silent) return 'badge';
  if (!previous) return 'major';
  const [a1, b1] = parts(previous);
  const [a2, b2] = parts(current);
  return a1 !== a2 || b1 !== b2 ? 'major' : 'minor';
}

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const [seenVersion, setSeenVersion] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [freshInstall, setFreshInstall] = useState(false);
  const [popup, setPopup] = useState<UpdatePopup>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: string | null = null;
      let fresh = false;
      try {
        stored = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
        if (!stored) {
          // Nothing of an earlier version on this phone: a new install. It starts "up to date", with no popup.
          const keys = await AsyncStorage.getAllKeys();
          fresh = keys.filter((k) => !k.startsWith('updates:') && !k.startsWith('app:')).length === 0;
          if (fresh) {
            stored = CURRENT_VERSION;
            await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_VERSION);
          }
        }
      } catch {
        // Storage unavailable — no popup this session, don't block startup.
        stored = CURRENT_VERSION;
      }
      if (cancelled) return;
      setSeenVersion(stored);
      setFreshInstall(fresh);
      setPopup(popupFor(stored, CURRENT_VERSION, CHANGELOG.find((r) => r.version === CURRENT_VERSION)));
      setIsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markUpdateSeen = useCallback(() => {
    setSeenVersion(CURRENT_VERSION);
    setPopup(null);
    AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_VERSION).catch(() => {});
  }, []);

  const value = useMemo<UpdatesContextValue>(
    () => ({
      currentVersion: CURRENT_VERSION,
      hasUnseenUpdate: isReady && seenVersion !== CURRENT_VERSION,
      isReady,
      freshInstall,
      popup,
      release: CHANGELOG.find((r) => r.version === CURRENT_VERSION),
      markUpdateSeen,
    }),
    [seenVersion, isReady, freshInstall, popup, markUpdateSeen],
  );

  return <UpdatesContext.Provider value={value}>{children}</UpdatesContext.Provider>;
}

export function useUpdates() {
  const ctx = useContext(UpdatesContext);
  if (!ctx) throw new Error('useUpdates must be used within UpdatesProvider');
  return ctx;
}
