import { useSyncExternalStore } from 'react';

/**
 * The account card in view on Home (3.7.0, A5). With Settings > Card theme > "Follow the card on Home" on, the app
 * theme follows a premium card as the pengguna swipes to it. Kept outside React state so swiping does not re-render
 * Home itself, only the theme provider.
 */
let current: string | null = null;
const listeners = new Set<() => void>();

export function setHomeCard(accountId: string | null) {
  if (accountId === current) return;
  current = accountId;
  listeners.forEach((l) => l());
}

export function useHomeCard(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => current,
    () => current,
  );
}
