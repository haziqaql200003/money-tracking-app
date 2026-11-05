/**
 * Storage for the app lock. Everything here stays on THIS phone (Keychain / Keystore through SecureStore):
 * it is never part of the synced settings, so a PIN set on one device does not exist on another.
 * The PIN itself is never stored, only a salted hash.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_KEY = 'wakira.lock.pin';
const CFG_KEY = 'wakira.lock.cfg';
const FAIL_KEY = 'wakira.lock.fail';

export const PIN_LENGTH = 6;
/** Minutes the app may sit in the background before it locks again. 0 = every time. */
export const TIMEOUT_CHOICES = [0, 1, 5, 15] as const;
export type LockConfig = { enabled: boolean; biometric: boolean; timeoutMin: number };
export const NO_LOCK: LockConfig = { enabled: false, biometric: false, timeoutMin: 1 };

/** SecureStore has no web build, so the lock is a phone-only feature. */
export const lockSupported = Platform.OS !== 'web';

async function read<T>(key: string): Promise<T | null> {
  if (!lockSupported) return null;
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
async function write(key: string, value: unknown) {
  if (!lockSupported) return;
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}
async function remove(key: string) {
  if (!lockSupported) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // nothing to remove
  }
}

const hashPin = (salt: string, pin: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

export async function loadLock(): Promise<LockConfig> {
  const [cfg, pin] = await Promise.all([read<LockConfig>(CFG_KEY), read<{ salt: string; hash: string }>(PIN_KEY)]);
  // A config without a PIN would lock the user out of nothing, so treat it as off.
  if (!cfg || !pin) return NO_LOCK;
  return { enabled: !!cfg.enabled, biometric: !!cfg.biometric, timeoutMin: TIMEOUT_CHOICES.includes(cfg.timeoutMin as 0) ? cfg.timeoutMin : 1 };
}

export async function saveConfig(cfg: LockConfig) {
  await write(CFG_KEY, cfg);
}

/** Stores a new PIN (hashed) and the config that goes with it. */
export async function savePin(pin: string, cfg: LockConfig) {
  const salt = Crypto.randomUUID();
  await write(PIN_KEY, { salt, hash: await hashPin(salt, pin) });
  await write(CFG_KEY, cfg);
  await remove(FAIL_KEY);
}

export async function clearLock() {
  await Promise.all([remove(PIN_KEY), remove(CFG_KEY), remove(FAIL_KEY)]);
}

export type PinCheck = { ok: true } | { ok: false; waitMs: number; left: number };

const BATCH = 5;
const BASE_WAIT_MS = 30_000;
const MAX_WAIT_MS = 15 * 60_000;

/** Seconds the keypad stays locked after a run of wrong PINs (0 when free to try). */
export async function waitLeft(): Promise<number> {
  const f = await read<{ count: number; until: number }>(FAIL_KEY);
  return f ? Math.max(0, f.until - Date.now()) : 0;
}

/** Checks a PIN. Every 5th wrong try in a row locks the keypad for longer (30 s, 1 min, 2 min ... up to 15 min). */
export async function checkPin(pin: string): Promise<PinCheck> {
  const stored = await read<{ salt: string; hash: string }>(PIN_KEY);
  const fail = (await read<{ count: number; until: number }>(FAIL_KEY)) ?? { count: 0, until: 0 };
  const now = Date.now();
  if (fail.until > now) return { ok: false, waitMs: fail.until - now, left: 0 };
  if (stored && (await hashPin(stored.salt, pin)) === stored.hash) {
    if (fail.count) await remove(FAIL_KEY);
    return { ok: true };
  }
  const count = fail.count + 1;
  const batches = Math.floor(count / BATCH);
  const waitMs = count % BATCH === 0 ? Math.min(MAX_WAIT_MS, BASE_WAIT_MS * 2 ** (batches - 1)) : 0;
  await write(FAIL_KEY, { count, until: waitMs ? now + waitMs : 0 });
  return { ok: false, waitMs, left: BATCH - (count % BATCH) };
}
