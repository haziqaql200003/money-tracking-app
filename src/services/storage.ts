import AsyncStorage from '@react-native-async-storage/async-storage';

// Semua data pengguna diasingkan dengan prefix `u:<userId>:`.
export const userKey = (userId: string, key: string) => `u:${userId}:${key}`;

/* ---------------- reading: "nothing stored" is not the same as "could not read" ---------------- */

/**
 * Why a stored value could not be used:
 *   'read'    = the phone's storage did not hand it over (the value itself may be perfectly fine)
 *   'corrupt' = the text came back but is not valid JSON
 */
export type ReadFailure = 'read' | 'corrupt';

export type ReadResult<T> = { status: 'ok'; value: T } | { status: 'missing' } | { status: 'failed'; reason: ReadFailure };

/** A key name that is safe to write into a log: no user id in it. */
export function safeKeyName(key: string): string {
  const own = /^u:[^:]+:([\s\S]*)$/.exec(key);
  return (own ? own[1] : key).replace(/[0-9a-f]{8}-[0-9a-f-]{20,}/gi, '<id>');
}

/**
 * Thrown where a failed read must stop the work instead of being mistaken for "nothing stored".
 * The message never carries the stored text (a JSON error can quote a piece of it).
 */
export class StorageReadError extends Error {
  readonly key: string;
  readonly reason: ReadFailure;
  constructor(key: string, reason: ReadFailure) {
    super(`storage ${reason === 'corrupt' ? 'value is not valid JSON' : 'read failed'}: ${safeKeyName(key)}`);
    this.name = 'StorageReadError';
    this.key = key;
    this.reason = reason;
  }
}

/* ---------------- one place every storage failure is reported to ---------------- */

/**
 * Why a value could not be saved:
 *   'full'  = the storage WaKira may use on this phone is full
 *   'other' = anything else (the phone refused the write, the value could not be turned into text)
 */
export type WriteFailure = 'full' | 'other';

/** Thrown where a failed save must be noticed instead of passing as saved. */
export class StorageWriteError extends Error {
  readonly key: string;
  readonly reason: WriteFailure;
  /** True when some parts were saved before this one failed (restore from a file). */
  partial = false;
  constructor(key: string, reason: WriteFailure) {
    super(`storage write failed (${reason}): ${safeKeyName(key)}`);
    this.name = 'StorageWriteError';
    this.key = key;
    this.reason = reason;
  }
}

export type StorageErrorEvent =
  | { op: 'read'; key: string; reason: ReadFailure; detail: string }
  | { op: 'write'; key: string; reason: WriteFailure; detail: string };
type StorageErrorReporter = (event: StorageErrorEvent) => void;

let reporter: StorageErrorReporter = (e) => console.warn(`[storage] ${e.op} failed (${e.reason}): ${safeKeyName(e.key)} ${e.detail}`.trim());
/** Once per key and reason until that key reads fine again, so a retry loop cannot flood the log. */
const reported = new Set<string>();

/** Where failures go (the error log installs itself here). */
export function setStorageErrorReporter(fn: StorageErrorReporter) {
  reporter = fn;
}

function report(key: string, reason: ReadFailure, error: unknown) {
  const id = `${reason}\u0000${key}`;
  if (reported.has(id)) return;
  reported.add(id);
  // A parse error may quote the stored text, so only a storage error keeps its message.
  const detail = reason === 'read' ? String((error as Error | null)?.message ?? error).slice(0, 160) : '';
  try {
    reporter({ op: 'read', key, reason, detail });
  } catch {
    // reporting must never break a read
  }
}

/** Storage errors that mean "no room left" on Android (SQLite), iOS and the web (localStorage quota). */
const FULL = /quota|exceeded|full|no space|not enough space|SQLITE_FULL|code 13\b|too large|too big/i;

function reportWrite(key: string, error: unknown): WriteFailure {
  const text = `${(error as Error | null)?.name ?? ''} ${String((error as Error | null)?.message ?? error)}`;
  const reason: WriteFailure = FULL.test(text) ? 'full' : 'other';
  const id = `write:${reason}\u0000${key}`;
  if (!reported.has(id)) {
    reported.add(id);
    try {
      reporter({ op: 'write', key, reason, detail: text.trim().slice(0, 160) });
    } catch {
      // reporting must never break the app
    }
  }
  return reason;
}

const wroteFine = (key: string) => {
  reported.delete(`write:full\u0000${key}`);
  reported.delete(`write:other\u0000${key}`);
};

const readFine = (key: string) => {
  reported.delete(`read\u0000${key}`);
  reported.delete(`corrupt\u0000${key}`);
};

/** Reads a key and says exactly what happened. Never throws. */
export async function readJSON<T>(key: string): Promise<ReadResult<T>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (error) {
    report(key, 'read', error);
    return { status: 'failed', reason: 'read' };
  }
  if (raw == null || raw === '') {
    readFine(key);
    return { status: 'missing' };
  }
  try {
    const value = JSON.parse(raw) as T;
    readFine(key);
    return { status: 'ok', value };
  } catch (error) {
    report(key, 'corrupt', error);
    return { status: 'failed', reason: 'corrupt' };
  }
}

/**
 * For the pengguna's records and anything that is saved back: null ONLY when nothing is stored.
 * A read that failed throws, so the caller can never continue as if the data were empty.
 */
export async function loadJSONOrThrow<T>(key: string): Promise<T | null> {
  const res = await readJSON<T>(key);
  if (res.status === 'failed') throw new StorageReadError(key, res.reason);
  return res.status === 'ok' ? res.value : null;
}

/**
 * Lenient read: null when nothing is stored AND when the read failed (the failure is reported, not hidden).
 * Only for small values where falling back to the default is harmless (theme, language, "seen" flags).
 * Never use it for something that is written back afterwards: use readJSON or loadJSONOrThrow.
 */
export async function loadJSON<T>(key: string): Promise<T | null> {
  const res = await readJSON<T>(key);
  return res.status === 'ok' ? res.value : null;
}

/* ---------------- writing: a save that failed is never passed off as saved ---------------- */

export type WriteResult = { ok: true } | { ok: false; reason: WriteFailure };

/** Saves a key and says what happened. Never throws; a failure is reported (error log) and returned. */
export async function writeJSON(key: string, value: unknown): Promise<WriteResult> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    wroteFine(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: reportWrite(key, error) };
  }
}

/**
 * For the pengguna's records and the sync bookkeeping: throws StorageWriteError when the save did not happen,
 * so the caller cannot carry on as if it had.
 */
export async function saveJSONOrThrow(key: string, value: unknown): Promise<void> {
  const res = await writeJSON(key, value);
  if (!res.ok) throw new StorageWriteError(key, res.reason);
}

/**
 * Lenient save for small values where losing the write is harmless (theme, language, "seen" flags).
 * Never throws, so it is safe to call without awaiting. Returns false when the save failed; the failure is
 * reported, not hidden. Records must use saveJSONOrThrow (or services/cloud-sync saveKey).
 */
export async function saveJSON(key: string, value: unknown): Promise<boolean> {
  return (await writeJSON(key, value)).ok;
}

/* ---------------- how much room WaKira is using ---------------- */

export type StorageUsage = {
  /** Everything WaKira keeps in this storage, in bytes (close estimate: one byte per character). */
  total: number;
  /** This user's own data. */
  records: number;
  /** Sync bookkeeping and copies kept aside by sync or restore (.bak / .base / __sync). */
  copies: number;
  /** Damaged copies kept aside (see setAsideIfCorrupt). */
  damaged: number;
  /** The single largest stored value. */
  largest: number;
  /** Keys that could not be read while measuring (their size is not in the totals). */
  unreadable: number;
};
export type UsageLevel = 'ok' | 'warn' | 'critical';

const MB = 1024 * 1024;
/**
 * What the storage behind AsyncStorage can hold. Android: the library's database is capped at 6 MB unless the
 * app raises it, and one value larger than about 2 MB can no longer be read back. Web: the browser gives
 * localStorage about 5 MB. iPhone has no fixed cap (only free space), so there is nothing to compare with.
 */
export function storageLimits(os: string): { total: number | null; perValue: number | null } {
  if (os === 'android') return { total: 6 * MB, perValue: 2 * MB };
  if (os === 'web') return { total: 5 * MB, perValue: null };
  return { total: null, perValue: null };
}

/** 'warn' from 70% of a limit, 'critical' from 90%. Always 'ok' where there is no fixed limit. */
export function usageLevel(usage: Pick<StorageUsage, 'total' | 'largest'>, os: string): UsageLevel {
  const { total, perValue } = storageLimits(os);
  const share = Math.max(total ? usage.total / total : 0, perValue ? usage.largest / perValue : 0);
  return share >= 0.9 ? 'critical' : share >= 0.7 ? 'warn' : 'ok';
}

/** Measures what is stored. Reads every key once; a key that cannot be read is counted, not thrown. */
export async function measureStorage(userId: string | null): Promise<StorageUsage> {
  const usage: StorageUsage = { total: 0, records: 0, copies: 0, damaged: 0, largest: 0, unreadable: 0 };
  const prefix = userId ? userKey(userId, '') : null;
  for (const key of await AsyncStorage.getAllKeys()) {
    let size: number;
    try {
      size = key.length + ((await AsyncStorage.getItem(key))?.length ?? 0);
    } catch {
      usage.unreadable++;
      continue;
    }
    usage.total += size;
    usage.largest = Math.max(usage.largest, size);
    if (!prefix || !key.startsWith(prefix)) continue;
    const name = key.slice(prefix.length);
    if (isRecoveryKey(name)) usage.damaged += size;
    else if (name.startsWith('__sync:') || name.endsWith('.bak') || name.endsWith('.base')) usage.copies += size;
    else usage.records += size;
  }
  return usage;
}

/* ---------------- recovery: a damaged value is moved aside, never thrown away ---------------- */

/** Damaged copies live under `u:<userId>:__recovery:<key>@<time>`. Backups and sync skip them. */
export const RECOVERY_PREFIX = '__recovery:';
export const isRecoveryKey = (key: string) => key.startsWith(RECOVERY_PREFIX);

/**
 * If `key` holds text that is not valid JSON, copies that text unchanged to `asideKey`, checks the copy,
 * and only then clears `key` so the dataset can start again. A value that reads fine is left alone.
 * Throws when storage fails at any step; in that case `key` still holds what it held.
 */
export async function setAsideIfCorrupt(key: string, asideKey: string): Promise<'aside' | 'readable' | 'missing'> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null || raw === '') return 'missing';
  try {
    JSON.parse(raw);
    return 'readable';
  } catch {
    // damaged: keep it
  }
  await AsyncStorage.setItem(asideKey, raw);
  if ((await AsyncStorage.getItem(asideKey)) !== raw) throw new Error('storage: the damaged copy could not be kept aside');
  await AsyncStorage.removeItem(key);
  readFine(key);
  return 'aside';
}

/** Same, for one of a user's own keys. Returns where the damaged copy went (null when there was nothing damaged). */
export async function setAsideUserKey(userId: string, key: string): Promise<string | null> {
  const asideKey = userKey(userId, `${RECOVERY_PREFIX}${key}@${Date.now()}`);
  return (await setAsideIfCorrupt(userKey(userId, key), asideKey)) === 'aside' ? asideKey : null;
}

/** The damaged copies kept on this phone for one user (full storage keys). */
export async function listSetAside(userId: string): Promise<string[]> {
  const prefix = userKey(userId, RECOVERY_PREFIX);
  return (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix));
}

/** The damaged copies with their text, for handing them to the pengguna as a file. Copies that cannot be read are skipped. */
export async function readSetAside(userId: string): Promise<{ name: string; raw: string }[]> {
  const out: { name: string; raw: string }[] = [];
  for (const key of await listSetAside(userId)) {
    const raw = await AsyncStorage.getItem(key).catch(() => null);
    if (raw != null) out.push({ name: safeKeyName(key), raw });
  }
  return out;
}

/** Padam SEMUA data milik satu pengguna (untuk "Padam akaun"). */
export async function removeUserData(userId: string) {
  const prefix = `u:${userId}:`;
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(prefix));
  if (mine.length > 0) await AsyncStorage.multiRemove(mine);
}
