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

export type StorageErrorEvent = { op: 'read'; key: string; reason: ReadFailure; detail: string };
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

export async function saveJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Simulasi sahaja: abaikan ralat tulis.
  }
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

/** Padam SEMUA data milik satu pengguna (untuk "Padam akaun"). */
export async function removeUserData(userId: string) {
  const prefix = `u:${userId}:`;
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(prefix));
  if (mine.length > 0) await AsyncStorage.multiRemove(mine);
}
