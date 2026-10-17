import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * A small crash diary kept on this device only: the last errors the app hit, with when, where and the first lines
 * of the stack. No amounts, names or records are written, and nothing is sent anywhere by itself. A tester can
 * share it from More > About > Error log, so a bug on someone else's phone can still be traced.
 */
export type ErrorEntry = { at: string; message: string; stack: string; fatal: boolean; platform: string; version: string };

const KEY = 'wakira.errorlog';
const MAX = 20;
let installed = false;

export async function getErrorLog(): Promise<ErrorEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ErrorEntry[]) : [];
  } catch {
    return [];
  }
}

export async function clearErrorLog() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

export async function recordError(error: unknown, fatal = false) {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const entry: ErrorEntry = {
      at: new Date().toISOString(),
      message: e.message.slice(0, 300),
      stack: (e.stack ?? '').split('\n').slice(0, 12).join('\n').slice(0, 1500),
      fatal,
      platform: `${Platform.OS} ${String(Platform.Version ?? '')}`.trim(),
      version: Constants.expoConfig?.version ?? '?',
    };
    const list = await getErrorLog();
    await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...list].slice(0, MAX)));
  } catch {
    // never let the diary itself crash the app
  }
}

/** Plain text for sharing. */
export function formatErrorLog(list: ErrorEntry[]): string {
  return list
    .map((e) => `[${e.at}] ${e.fatal ? 'FATAL ' : ''}WaKira ${e.version} · ${e.platform}\n${e.message}\n${e.stack}`) // i18n-ignore: technical log
    .join('\n\n');
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler(): GlobalHandler; setGlobalHandler(h: GlobalHandler): void };

/** Starts recording uncaught errors. Safe to call more than once. */
export function installErrorLog() {
  if (installed) return;
  installed = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (ev) => void recordError(ev.error ?? ev.message, true));
    window.addEventListener('unhandledrejection', (ev) => void recordError(ev.reason, false));
    return;
  }
  const eu = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!eu) return;
  const previous = eu.getGlobalHandler();
  eu.setGlobalHandler((error, isFatal) => {
    void recordError(error, !!isFatal);
    previous(error, isFatal);
  });
}
