/**
 * Which of the pengguna's datasets could not be read from this phone, and what can be done about it.
 * usePersistedState reports here; <StorageGuard /> (root layout) shows the warning. No React Native in this file.
 *
 * While a dataset is listed here it is NOT loaded: nothing is saved over it, so what is stored stays as it is.
 */
import { useSyncExternalStore } from 'react';

import { setAsideIfCorrupt, StorageReadError, userKey, RECOVERY_PREFIX, type ReadFailure, type WriteFailure } from '@/services/storage';

export type StorageIssue = {
  userId: string;
  /** The dataset as the screens know it ('transactions', 'accounts', ...). */
  key: string;
  /** The exact storage key that failed (the dataset itself, or its sync bookkeeping). */
  storageKey: string;
  reason: ReadFailure;
};
/** A dataset whose latest change is on screen but could not be saved to this phone. */
export type SaveIssue = { userId: string; key: string; reason: WriteFailure };
export type StorageHealth = {
  issues: StorageIssue[];
  /** Goes up every time a change to an unreadable dataset was refused. */
  blockedEdits: number;
  /** Datasets with a change that is not saved yet. */
  unsaved: SaveIssue[];
};

const idOf = (userId: string, key: string) => `${userId}\u0000${key}`;
const issues = new Map<string, StorageIssue>();
const retriers = new Map<string, () => void>();
const unsaved = new Map<string, SaveIssue>();
const savers = new Map<string, () => void>();
let health: StorageHealth = { issues: [], blockedEdits: 0, unsaved: [] };
const listeners = new Set<() => void>();

function publish(blocked = false) {
  health = { issues: [...issues.values()], blockedEdits: health.blockedEdits + (blocked ? 1 : 0), unsaved: [...unsaved.values()] };
  listeners.forEach((l) => l());
}

/** The latest change to a dataset could not be saved. `retry` makes its owner save it again. */
export function reportSaveIssue(userId: string, key: string, reason: WriteFailure, retry: () => void) {
  const id = idOf(userId, key);
  savers.set(id, retry);
  if (unsaved.get(id)?.reason === reason) return;
  unsaved.set(id, { userId, key, reason });
  publish();
}

/** The dataset is saved again (or its owner went away). */
export function clearSaveIssue(userId: string, key: string) {
  const id = idOf(userId, key);
  savers.delete(id);
  if (unsaved.delete(id)) publish();
}

/** Try saving every unsaved dataset of this user again. */
export function retrySaves(userId: string) {
  for (const [id, retry] of [...savers.entries()]) if (id.startsWith(`${userId}\u0000`)) retry();
}

/** A dataset could not be read. `retry` makes its owner read it again. */
export function reportReadIssue(userId: string, key: string, error: unknown, retry: () => void) {
  const known = error instanceof StorageReadError;
  const next: StorageIssue = { userId, key, storageKey: known ? error.key : userKey(userId, key), reason: known ? error.reason : 'read' };
  const id = idOf(userId, key);
  retriers.set(id, retry);
  const prev = issues.get(id);
  if (prev && prev.storageKey === next.storageKey && prev.reason === next.reason) return;
  issues.set(id, next);
  publish();
}

/** The dataset read fine again (or its owner went away). */
export function clearReadIssue(userId: string, key: string) {
  const id = idOf(userId, key);
  retriers.delete(id);
  if (issues.delete(id)) publish();
}

export const hasReadIssue = (userId: string, key: string) => issues.has(idOf(userId, key));
export const getStorageHealth = () => health;

/** A change to an unreadable dataset was refused, so the pengguna can be told it was not saved. */
export function noteBlockedEdit(userId: string, key: string) {
  if (issues.has(idOf(userId, key))) publish(true);
}

export function useStorageHealth(): StorageHealth {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getStorageHealth,
    getStorageHealth,
  );
}

/** Read every unreadable dataset of this user again. */
export function retryStorage(userId: string) {
  for (const [id, retry] of [...retriers.entries()]) if (id.startsWith(`${userId}\u0000`)) retry();
}

/**
 * For datasets whose stored text is damaged: keep the damaged text aside, untouched, then read again so the
 * dataset starts from the cloud copy (or empty). Datasets that merely failed to read are only retried, because
 * their stored value may be fine. `failed` counts damaged copies that could not be kept aside (nothing changed).
 */
export async function startFresh(userId: string): Promise<{ aside: number; failed: number }> {
  let aside = 0;
  let failed = 0;
  const mine = [...issues.values()].filter((i) => i.userId === userId && i.reason === 'corrupt');
  for (const issue of mine) {
    try {
      const prefix = userKey(userId, '');
      const name = issue.storageKey.startsWith(prefix) ? issue.storageKey.slice(prefix.length) : issue.key;
      const res = await setAsideIfCorrupt(issue.storageKey, userKey(userId, `${RECOVERY_PREFIX}${name}@${Date.now()}`));
      if (res === 'aside') aside++;
    } catch {
      failed++;
    }
  }
  retryStorage(userId);
  return { aside, failed };
}
