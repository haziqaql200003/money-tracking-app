/**
 * App lock: a PIN (and optionally Face ID / fingerprint) asked for when WaKira opens and when it comes back
 * from the background. Per phone, never synced. Mounted with `key={user id}` so a different account starts clean.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { t } from '@/i18n';
import { NO_LOCK, checkPin, clearLock, loadLock, lockSupported, saveConfig, savePin, type LockConfig, type PinCheck } from '@/services/app-lock';

type AppLockValue = {
  /** false until the saved lock has been read; the screen stays covered meanwhile */
  ready: boolean;
  supported: boolean;
  enabled: boolean;
  locked: boolean;
  biometric: boolean;
  /** the phone has a fingerprint / face sensor with something enrolled */
  biometricAvailable: boolean;
  timeoutMin: number;
  /** Starts the lock with a new PIN. */
  enable: (pin: string) => Promise<void>;
  /** Turns the lock off (the caller has already checked the PIN). */
  disable: () => Promise<void>;
  changePin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<PinCheck>;
  /** Tries the PIN on the lock screen and opens the app when right. */
  unlock: (pin: string) => Promise<PinCheck>;
  unlockWithBiometric: () => Promise<boolean>;
  /** Asks for the fingerprint / face once. Used before switching biometrics on. */
  confirmBiometric: () => Promise<boolean>;
  setBiometric: (on: boolean) => Promise<void>;
  setTimeoutMin: (min: number) => Promise<void>;
  lockNow: () => void;
};

const AppLockContext = createContext<AppLockValue | undefined>(undefined);

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!lockSupported);
  const [cfg, setCfg] = useState<LockConfig>(NO_LOCK);
  const [locked, setLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const leftAt = useRef<number | null>(null);
  const prompting = useRef(false); // the system fingerprint sheet briefly backgrounds the app on some phones

  useEffect(() => {
    if (!lockSupported) return;
    let alive = true;
    (async () => {
      const [saved, hw, enrolled] = await Promise.all([
        loadLock(),
        LocalAuthentication.hasHardwareAsync().catch(() => false),
        LocalAuthentication.isEnrolledAsync().catch(() => false),
      ]);
      if (!alive) return;
      setCfg(saved);
      setLocked(saved.enabled);
      setBiometricAvailable(hw && enrolled);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Lock again when the app has been away for longer than the chosen time.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        if (!prompting.current) leftAt.current = Date.now();
      } else if (state === 'active') {
        const away = leftAt.current;
        leftAt.current = null;
        if (cfg.enabled && away !== null && Date.now() - away >= cfg.timeoutMin * 60_000) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [cfg.enabled, cfg.timeoutMin]);

  const enable = useCallback(async (pin: string) => {
    const next: LockConfig = { ...NO_LOCK, enabled: true, timeoutMin: cfg.timeoutMin };
    await savePin(pin, next);
    setCfg(next);
  }, [cfg.timeoutMin]);

  const disable = useCallback(async () => {
    await clearLock();
    setCfg(NO_LOCK);
    setLocked(false);
  }, []);

  const changePin = useCallback(async (pin: string) => {
    await savePin(pin, cfg);
  }, [cfg]);

  const unlock = useCallback(async (pin: string) => {
    const res = await checkPin(pin);
    if (res.ok) setLocked(false);
    return res;
  }, []);

  const confirmBiometric = useCallback(async () => {
    prompting.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('more.security.bioPrompt'),
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: true,
      });
      return res.success;
    } catch {
      return false;
    } finally {
      // The OS can report the return to the app a moment late, so keep ignoring it briefly.
      setTimeout(() => {
        prompting.current = false;
      }, 600);
    }
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    const ok = await confirmBiometric();
    if (ok) setLocked(false);
    return ok;
  }, [confirmBiometric]);

  const setBiometric = useCallback(async (on: boolean) => {
    const next = { ...cfg, biometric: on };
    await saveConfig(next);
    setCfg(next);
  }, [cfg]);

  const setTimeoutMin = useCallback(async (min: number) => {
    const next = { ...cfg, timeoutMin: min };
    await saveConfig(next);
    setCfg(next);
  }, [cfg]);

  const lockNow = useCallback(() => {
    if (cfg.enabled) setLocked(true);
  }, [cfg.enabled]);

  const value = useMemo<AppLockValue>(
    () => ({
      ready,
      supported: lockSupported,
      enabled: cfg.enabled,
      locked: cfg.enabled && locked,
      biometric: cfg.biometric && biometricAvailable,
      biometricAvailable,
      timeoutMin: cfg.timeoutMin,
      enable,
      disable,
      changePin,
      verifyPin: checkPin,
      unlock,
      unlockWithBiometric,
      confirmBiometric,
      setBiometric,
      setTimeoutMin,
      lockNow,
    }),
    [ready, cfg, locked, biometricAvailable, enable, disable, changePin, unlock, unlockWithBiometric, confirmBiometric, setBiometric, setTimeoutMin, lockNow],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}
