/**
 * Glue between the phone's storage, the sync rules (sync-core.ts) and Supabase.
 * Everything here quietly does nothing when cloud mode is off, so local-only mode is unchanged.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { loadJSON, saveJSON, userKey } from '@/services/storage';
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

function localStore(userId: string): LocalStore {
  return {
    read: (key) => loadJSON<unknown>(userKey(userId, key)),
    write: (key, value) => saveJSON(userKey(userId, key), value),
    readMeta: (key) => loadJSON<Meta>(userKey(userId, metaKey(key))),
    writeMeta: (key, meta) => saveJSON(userKey(userId, metaKey(key)), meta),
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
  };
}

/* ---------------- what the screens' state hooks call ---------------- */

/** Value last written/loaded per user+key, so an unchanged value is never counted as an edit. */
const lastSerialized = new Map<string, string>();
const idOf = (userId: string, key: string) => `${userId}:${key}`;

export function noteLoaded(userId: string, key: string, value: unknown) {
  lastSerialized.set(idOf(userId, key), JSON.stringify(value));
}

/** Load a key: phone first, then agree with the cloud. Never throws. */
export async function loadKey<T>(userId: string, key: string): Promise<{ value: T | null; source: ReconcileResult['source'] }> {
  if (!CLOUD_ENABLED) return { value: await loadJSON<T>(userKey(userId, key)), source: 'local' };
  setStatus({ state: 'syncing' });
  const res = await reconcile(localStore(userId), remoteStore(userId), key);
  setStatus(res.source === 'offline' ? { state: 'offline' } : { state: 'idle', lastSyncedAt: new Date().toISOString() });
  return { value: res.value as T | null, source: res.source };
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const PUSH_DELAY_MS = 1500;

/** The user changed a key. Store it now; send it to the cloud shortly after (debounced). */
export async function saveKey(userId: string, key: string, value: unknown) {
  const id = idOf(userId, key);
  const json = JSON.stringify(value);
  if (lastSerialized.get(id) === json) return;
  lastSerialized.set(id, json);

  if (!CLOUD_ENABLED) {
    await saveJSON(userKey(userId, key), value);
    return;
  }
  await markEdited(localStore(userId), key, value, new Date().toISOString());
  void refreshPending(userId);
  clearTimeout(timers.get(id));
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      void pushKey(userId, key);
    }, PUSH_DELAY_MS),
  );
}

async function pushKey(userId: string, key: string) {
  setStatus({ state: 'syncing' });
  const r = await pushIfDirty(localStore(userId), remoteStore(userId), key);
  await refreshPending(userId);
  if (r === 'failed') setStatus({ state: 'offline' });
  else setStatus({ state: 'idle', lastSyncedAt: new Date().toISOString() });
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
    const meta = await loadJSON<Meta>(k);
    if (meta?.dirty) out.push(k.slice(prefix.length));
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
    const r = await pushIfDirty(localStore(userId), remoteStore(userId), key);
    if (r === 'failed') ok = false;
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

/** Put the kept-aside copies back as the current data (and send them to the cloud). */
export async function restoreBackups(userId: string): Promise<number> {
  const keys = await listBackups(userId);
  for (const key of keys) {
    const bak = userKey(userId, backupKeyOf(key));
    const value = await loadJSON<unknown>(bak);
    if (value !== null) await saveKey(userId, key, value);
    await AsyncStorage.removeItem(bak);
  }
  await reloadAll(userId);
  await flushAll(userId);
  return keys.length;
}

/** First sign-in on a phone: download everything the cloud holds. Throws when it cannot be reached. */
export async function initialPull(userId: string): Promise<{ count: number }> {
  if (!supabase) return { count: 0 };
  const { data, error } = await withTimeout(supabase.from('user_data').select('key, value, updated_at').eq('user_id', userId), 15000);
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({ key: r.key as string, value: r.value as unknown, updatedAt: r.updated_at as string }));
  await adoptAll(localStore(userId), rows);
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
