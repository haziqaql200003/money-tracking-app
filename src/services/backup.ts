import AsyncStorage from '@react-native-async-storage/async-storage';

import { flushAll, reloadAll, saveKey } from '@/services/cloud-sync';
import { isRecoveryKey, loadJSONOrThrow, readJSON, saveJSON, setAsideUserKey, StorageReadError, userKey, type ReadResult } from '@/services/storage';
import { backupKeyOf } from '@/services/sync-core';

/**
 * A full WaKira backup: every piece of data stored for one person, in one .wakira.json file.
 * It holds what the screens keep (accounts, records, transfers, recurring, categories, budgets, debts, goals,
 * settings), not the sync bookkeeping. Restoring writes each part back exactly as it was, then syncs it.
 */
export const BACKUP_FORMAT = 1;
export type WakiraBackup = {
  app: 'WaKira';
  format: number;
  appVersion: string;
  exportedAt: string;
  keys: Record<string, unknown>;
};
export type BackupSummary = { exportedAt: string; appVersion: string; transactions: number; accounts: number; debts: number; goals: number; parts: number };
export type ParseResult = { ok: true; backup: WakiraBackup } | { ok: false; reason: 'notWakira' | 'newer' | 'broken' };

/** Sync bookkeeping and copies kept aside never go into a backup. */
const isBookkeeping = (key: string) => key.startsWith('__sync:') || key.endsWith('.bak') || key.endsWith('.base') || isRecoveryKey(key);

/**
 * Throws StorageReadError when any part cannot be read: a backup that silently leaves records out would look
 * complete and is worse than no backup.
 */
export async function collectBackup(userId: string, appVersion: string): Promise<WakiraBackup> {
  const prefix = userKey(userId, '');
  const all = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix));
  const keys: Record<string, unknown> = {};
  for (const full of all) {
    const key = full.slice(prefix.length);
    if (isBookkeeping(key)) continue;
    const value = await loadJSONOrThrow<unknown>(full);
    if (value !== null) keys[key] = value;
  }
  return { app: 'WaKira', format: BACKUP_FORMAT, appVersion, exportedAt: new Date().toISOString(), keys };
}

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, reason: 'broken' };
  }
  const b = raw as Partial<WakiraBackup> | null;
  if (!b || typeof b !== 'object' || b.app !== 'WaKira') return { ok: false, reason: 'notWakira' };
  if (typeof b.format !== 'number' || b.format > BACKUP_FORMAT) return { ok: false, reason: 'newer' };
  if (!b.keys || typeof b.keys !== 'object' || Array.isArray(b.keys)) return { ok: false, reason: 'broken' };
  const keys: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b.keys)) if (!isBookkeeping(k)) keys[k] = v;
  return {
    ok: true,
    backup: { app: 'WaKira', format: b.format, appVersion: String(b.appVersion ?? ''), exportedAt: String(b.exportedAt ?? ''), keys },
  };
}

const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);

export function summarize(b: WakiraBackup): BackupSummary {
  return {
    exportedAt: b.exportedAt,
    appVersion: b.appVersion,
    transactions: count(b.keys.transactions),
    accounts: count(b.keys.accounts),
    debts: count(b.keys.debts) + count(b.keys.ious),
    goals: count(b.keys.plan_goals),
    parts: Object.keys(b.keys).length,
  };
}

/**
 * Puts a backup back. What is on this device now is first kept aside (the same copies "Restore older copy"
 * brings back), then every part of the backup is saved as if it had just been edited, so it also goes to the cloud.
 * Everything on the device is looked at BEFORE anything is replaced: a part whose stored text is damaged is kept
 * aside as it is, and if a part cannot be read at all this throws StorageReadError with nothing replaced.
 */
export async function restoreBackup(userId: string, b: WakiraBackup): Promise<number> {
  const entries = Object.entries(b.keys);
  // 1. Look only: stop here, with the device exactly as it was, if any part cannot be read.
  const now = new Map<string, ReadResult<unknown>>();
  for (const [key] of entries) {
    const full = userKey(userId, key);
    const current = await readJSON<unknown>(full);
    if (current.status === 'failed' && current.reason !== 'corrupt') throw new StorageReadError(full, current.reason);
    now.set(key, current);
  }
  // 2. Keep aside what is there now (damaged text is kept as it is).
  for (const [key] of entries) {
    const current = now.get(key);
    if (current?.status === 'failed') {
      try {
        await setAsideUserKey(userId, key);
      } catch {
        throw new StorageReadError(userKey(userId, key), 'read');
      }
    } else if (current?.status === 'ok' && current.value !== null) {
      await saveJSON(userKey(userId, backupKeyOf(key)), current.value);
    }
  }
  // 3. Replace.
  for (const [key, value] of entries) await saveKey(userId, key, value);
  await reloadAll(userId);
  await flushAll(userId);
  return entries.length;
}
