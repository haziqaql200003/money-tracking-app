/**
 * Glue between the phone's storage, the sync rules (sync-core.ts) and Supabase.
 * Everything here quietly does nothing when cloud mode is off, so local-only mode is unchanged.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { isRecoveryKey, loadJSON, loadJSONOrThrow, readJSON, saveJSONOrThrow, StorageWriteError, userKey, type WriteFailure } from '@/services/storage';
import { CLOUD_ENABLED, supabase } from '@/services/supabase';
import {
  adoptAll,
  backupKeyOf,
  markEdited,
  pushIfDirty,
  reconcile,
  type LocalStore,
  type Meta,
  type ReconcileResult,
  type RemoteStore,
} from '@/services/sync-core';

const isMergeBase = (key: string) => key.endsWith('.base');

/* ---------------- status (shown in Settings) ---------------- */

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';
export type SyncStatus = { state: SyncState; lastSyncedAt: string | null; pending: number };

let status: SyncStatus = { state: 'idle', lastSyncedAt: null, pending: 0 };
const listeners = new Set<() => void>();
const setStatus = (patch: Partial<SyncStatus>) => {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
};
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => status,
    () => status,
  );
}

/* ---------------- adapters ---------------- */

const PULL_TIMEOUT_MS = 6000;
const withTimeout = <T,>(p: PromiseLike<T>, ms = PULL_TIMEOUT_MS): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });

const metaKey = (key: string) => `__sync:${key}`;

/**
 * The phone's side of the sync rules. A value or its bookkeeping that cannot be read THROWS (StorageReadError)
 * instead of reading as "nothing here": the rules would otherwise adopt the cloud's copy over data that is still
 * on the phone, or treat unsent edits as already sent. Only the merge base may read as null, because the rules
 * are built for a missing base (then nothing counts as deleted).
 * A save that fails THROWS too (StorageWriteError): the rules must not record "the phone and the cloud agree"
 * or "this edit is waiting to be sent" for a value that never reached storage.
 */
function localStore(userId: string): LocalStore {
  return {
    read: (key) => (isMergeBase(key) ? loadJSON<unknown>(userKey(userId, key)) : loadJSONOrThrow<unknown>(userKey(userId, key))),
    write: (key, value) => saveJSONOrThrow(userKey(userId, key), value),
    readMeta: (key) => loadJSONOrThrow<Meta>(userKey(userId, metaKey(key))),
    writeMeta: (key, meta) => saveJSONOrThrow(userKey(userId, metaKey(key)), meta),
  };
}

function remoteStore(userId: string): RemoteStore {
  return {
    async pull(key) {
      if (!supabase) throw new Error('cloud off');
      const { data, error } = await withTimeout(
        supabase.from('user_data').select('value, updated_at').eq('user_id', userId).eq('key', key).maybeSingle(),
      );
      if (error) throw error;
      return data ? { value: data.value, updatedAt: data.updated_at as string } : null;
    },
    async push(key, value) {
      if (!supabase) throw new Error('cloud off');
      const { data, error } = await withTimeout(
        supabase.from('user_data').upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' }).select('updated_at').single(),
        12000,
      );
      if (error) throw error;
      return data.updated_at as string;
    },
    /** Compare-and-save: lands only while the cloud still holds the copy stamped `base`. */
    async pushIf(key, value, base) {
      if (!supabase) throw new Error('cloud off');
      if (base === null) {
        const { data, error } = await withTimeout(supabase.from('user_data').insert({ user_id: userId, key, value }).select('updated_at').single(), 12000);
        if (error) {
          if ((error as { code?: string }).code === '23505') return null; // another device created it first
          throw error;
        }
        return data.updated_at as string;
      }
      const { data, error } = await withTimeout(
        supabase.from('user_data').update({ value }).eq('user_id', userId).eq('key', key).eq('updated_at', base).select('updated_at'),
        12000,
      );
      if (error) throw error;
      return data && data.length > 0 ? (data[0].updated_at as string) : null;
    },
  };
}

/* ---------------- what the screens' state hooks call ---------------- */

/** Value last written/loaded per user+key, so an unchanged value is never counted as an edit. */
const lastSerialized = new Map<string, string>();
const idOf = (userId: string, key: string) => `${userId}:${key}`;

export function noteLoaded(userId: string, key: string, value: unknown) {
  lastSerialized.set(idOf(userId, key), JSON.stringify(value));
}

/**
 * Load a key: phone first, then agree with the cloud. `value` is null only when nothing is stored anywhere.
 * Throws StorageReadError when the phone's own copy cannot be read; nothing has been changed in that case.
 */
export async function loadKey<T>(userId: string, key: string): Promise<{ value: T | null; source: ReconcileResult['source'] }> {
  if (!CLOUD_ENABLED) return { value: await loadJSONOrThrow<T>(userKey(userId, key)), source: 'local' };
  setStatus({ state: 'syncing' });
  let res: ReconcileResult;
  try {
    res = await reconcile(localStore(userId), remoteStore(userId), key);
  } catch (error) {
    setStatus({ state: 'idle' });
    // The phone could not store what the sync decided (for example storage is full). What the phone holds is
    // still good, so the app carries on with it, exactly as when the cloud cannot be reached.
    if (error instanceof StorageWriteError) return { value: await loadJSONOrThrow<T>(userKey(userId, key)), source: 'offline' };
    throw error;
  }
  setStatus(res.source === 'offline' ? { state: 'offline' } : { state: 'idle', lastSyncedAt: new Date().toISOString() });
  return { value: res.value as T | null, source: res.source };
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const PUSH_DELAY_MS = 1500;

export type SaveResult = { ok: true } | { ok: false; reason: WriteFailure };
const SAVED: SaveResult = { ok: true };

/**
 * The user changed a key. Store it now; send it to the cloud shortly after (debounced).
 * Never throws. `ok: false` means the change did NOT reach this phone's storage (it only exists on screen);
 * calling again with the same value tries again.
 */
export async function saveKey(userId: string, key: string, value: unknown): Promise<SaveResult> {
  const id = idOf(userId, key);
  const json = JSON.stringify(value);
  if (lastSerialized.get(id) === json) return SAVED;
  lastSerialized.set(id, json);

  try {
    if (!CLOUD_ENABLED) {
      await saveJSONOrThrow(userKey(userId, key), value);
      return SAVED;
    }
    await markEdited(localStore(userId), key, value, new Date().toISOString());
  } catch (error) {
    // Not stored: forget it as "the value last written", so the next attempt really writes.
    if (lastSerialized.get(id) === json) lastSerialized.delete(id);
    return { ok: false, reason: error instanceof StorageWriteError ? error.reason : 'other' };
  }
  void refreshPending(userId);
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      void pushKey(userId, key);
    }, PUSH_DELAY_MS),
  );
  return SAVED;
}

async function pushKey(userId: string, key: string) {
  setStatus({ state: 'syncing' });
  const r = await pushSafely(userId, key);
  await refreshPending(userId);
  if (r === 'failed') setStatus({ state: 'offline' });
  else setStatus({ state: 'idle', lastSyncedAt: new Date().toISOString() });
  // Another device had saved meanwhile and the two were combined: show the combined copy.
  if (r === 'merged') await reloadKey(userId, key);
}

/** pushIfDirty, except that a phone copy that cannot be read counts as "not sent" (it stays waiting) instead of throwing. */
async function pushSafely(userId: string, key: string): Promise<Awaited<ReturnType<typeof pushIfDirty>>> {
  try {
    return await pushIfDirty(localStore(userId), remoteStore(userId), key);
  } catch {
    return 'failed';
  }
}

async function refreshPending(userId: string) {
  setStatus({ pending: (await dirtyKeys(userId)).length });
}

/** Keys on this phone that still have edits the cloud has not received. */
async function dirtyKeys(userId: string): Promise<string[]> {
  const prefix = userKey(userId, '__sync:');
  const all = await AsyncStorage.getAllKeys();
  const out: string[] = [];
  for (const k of all.filter((x) => x.startsWith(prefix))) {
    const name = k.slice(prefix.length);
    if (isRecoveryKey(name)) continue; // damaged copies kept aside are never synced
    const meta = await loadJSON<Meta>(k);
    if (meta?.dirty) out.push(name);
  }
  return out;
}

/** Send everything that is waiting. Used before sign-out, on return to the app, and from "Sync now". */
export async function flushAll(userId: string): Promise<boolean> {
  if (!CLOUD_ENABLED) return true;
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  const keys = await dirtyKeys(userId);
  if (keys.length === 0) {
    setStatus({ pending: 0 });
    return true;
  }
  setStatus({ state: 'syncing' });
  let ok = true;
  for (const key of keys) {
    const r = await pushSafely(userId, key);
    if (r === 'failed') ok = false;
    if (r === 'merged') await reloadKey(userId, key);
  }
  const left = (await dirtyKeys(userId)).length;
  setStatus(ok ? { state: 'idle', pending: left, lastSyncedAt: new Date().toISOString() } : { state: 'offline', pending: left });
  return ok;
}

/* ---------------- copies kept aside when the cloud replaced the phone's data ---------------- */

/** Keys whose older phone copy was kept aside (see backupKeyOf in sync-core). */
export async function listBackups(userId: string): Promise<string[]> {
  const prefix = userKey(userId, '');
  const all = await AsyncStorage.getAllKeys();
  return all.filter((k) => k.startsWith(prefix) && k.endsWith('.bak')).map((k) => k.slice(prefix.length, -4));
}

/**
 * Put the kept-aside copies back as the current data (and send them to the cloud).
 * A copy that cannot be read or put back right now is left where it is: it is only removed once it has been put back.
 */
export async function restoreBackups(userId: string): Promise<number> {
  const keys = await listBackups(userId);
  let restored = 0;
  for (const key of keys) {
    const bak = userKey(userId, backupKeyOf(key));
    const res = await readJSON<unknown>(bak);
    if (res.status === 'failed') continue;
    if (res.status === 'ok' && res.value !== null && !(await saveKey(userId, key, res.value)).ok) continue; // not put back: keep the copy
    await AsyncStorage.removeItem(bak);
    restored++;
  }
  await reloadAll(userId);
  await flushAll(userId);
  return restored;
}

/** First sign-in on a phone: download everything the cloud holds. Throws when the cloud cannot be reached. */
export async function initialPull(userId: string): Promise<{ count: number }> {
  if (!supabase) return { count: 0 };
  const { data, error } = await withTimeout(supabase.from('user_data').select('key, value, updated_at').eq('user_id', userId), 15000);
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({ key: r.key as string, value: r.value as unknown, updatedAt: r.updated_at as string }));
  const local = localStore(userId);
  for (const row of rows) {
    try {
      await adoptAll(local, [row]);
    } catch {
      // This phone already holds something for this key that cannot be read: leave it exactly as it is. Signing in
      // still works, and the warning with Try again appears when the app opens that data.
    }
  }
  setStatus({ lastSyncedAt: new Date().toISOString() });
  return { count: rows.length };
}

/** How many documents the cloud holds for this user (decides whether to offer the old-account import). */
export async function remoteCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await withTimeout(supabase.from('user_data').select('key', { count: 'exact', head: true }).eq('user_id', userId));
  if (error) throw error;
  return count ?? 0;
}

/* ---------------- live state hooks re-read after a background sync ---------------- */

type Reloader = () => Promise<void>;
const reloaders = new Map<string, Reloader>();

export function registerReloader(userId: string, key: string, fn: Reloader) {
  const id = idOf(userId, key);
  reloaders.set(id, fn);
  return () => {
    if (reloaders.get(id) === fn) reloaders.delete(id);
  };
}

/** Re-read one mounted key. */
async function reloadKey(userId: string, key: string) {
  const fn = reloaders.get(idOf(userId, key));
  if (fn) await fn();
}

/** Re-read every mounted key (after a foreground sync or after importing an old account). */
export async function reloadAll(userId: string) {
  const mine = [...reloaders.entries()].filter(([id]) => id.startsWith(`${userId}:`));
  await Promise.all(mine.map(([, fn]) => fn()));
}

/** Call once when a user is signed in: syncs again whenever the app returns to the foreground. */
export function startForegroundSync(userId: string): () => void {
  if (!CLOUD_ENABLED) return () => {};
  const sub = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    void flushAll(userId).then(() => reloadAll(userId));
  });
  return () => sub.remove();
}

/** Forget in-memory bookkeeping for a user (sign-out / delete). */
export function forgetUser(userId: string) {
  for (const id of [...lastSerialized.keys()]) if (id.startsWith(`${userId}:`)) lastSerialized.delete(id);
  for (const [id, t] of [...timers.entries()])
    if (id.startsWith(`${userId}:`)) {
      clearTimeout(t);
      timers.delete(id);
    }
  setStatus({ state: 'idle', pending: 0, lastSyncedAt: null });
}
