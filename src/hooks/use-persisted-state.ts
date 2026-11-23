import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { loadKey, noteLoaded, registerReloader, saveKey } from '@/services/cloud-sync';
import { loadJSONOrThrow, userKey } from '@/services/storage';
import { clearReadIssue, clearSaveIssue, noteBlockedEdit, reportReadIssue, reportSaveIssue } from '@/services/storage-health';
import { CLOUD_ENABLED } from '@/services/supabase';

/**
 * Seperti useState, tetapi dimuat/disimpan ikut pengguna.
 * - Mod setempat: AsyncStorage di phone ini sahaja.
 * - Mod cloud (Supabase dihidupkan): phone tetap sumber pertama (offline-first); selepas itu data
 *   diselaraskan dengan cloud di belakang tabir. Peraturan siapa menang ada di services/sync-core.ts.
 * userId null (belum login) => kembali ke nilai awal, tiada apa disimpan.
 *
 * Elemen ketiga (`hydrated`) menjadi true selepas data tersimpan siap dimuat DAN diselaraskan.
 * Kod yang menjana data automatik (cth. transaksi berulang) mesti tunggu
 * nilai ini, kalau tidak hasilnya akan ditimpa oleh data yang dimuat kemudian.
 *
 * Data safety (3.8.1): "nothing stored" and "could not read" are different things.
 * - Nothing stored  => the default is shown and `hydrated` becomes true (first install).
 * - Could not read  => `hydrated` stays false, nothing is saved, and changes are refused, so the stored value is
 *   never replaced by an empty one. The failure is listed in services/storage-health (warning + Try again).
 * - Could not save  => the change stays on screen, the dataset is listed as "not saved yet" in
 *   services/storage-health (notice + Try again), and the next change or a retry saves it again.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  userId: string | null,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const initialRef = useRef(initial);
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  // Raised by "Try again": reads the stored value once more.
  const [attempt, setAttempt] = useState(0);
  // Raised by "Try again" after a failed save: saves the current value once more.
  const [saveAttempt, setSaveAttempt] = useState(0);
  // Set while the stored value cannot be read; a change made then would not be saved, so it is refused.
  const unreadable = useRef<{ userId: string; key: string } | null>(null);
  // Whose data (or defaults) the value currently holds, so one user's data is never left on screen for another.
  const shownScope = useRef<string | null>(null);

  // When the user or the key changes, start over in the same render (React's "adjust state while rendering"
  // pattern), so the save effect below can never write the old value under the new key.
  const scope = `${userId ?? ''}\u0000${key}`;
  const [lastScope, setLastScope] = useState(scope);
  if (lastScope !== scope) {
    setLastScope(scope);
    setHydrated(false);
    if (!userId) setValue(initial);
  }

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;

    // Show `next` (or the default when nothing is stored) without counting it as an edit.
    const apply = (next: T | null) => {
      const shown = next ?? initialRef.current;
      shownScope.current = scope;
      noteLoaded(userId, key, shown);
      setValue((prev) => (JSON.stringify(prev) === JSON.stringify(shown) ? prev : shown));
    };
    const loaded = () => {
      unreadable.current = null;
      clearReadIssue(userId, key);
      setHydrated(true);
    };
    // The stored value exists but could not be read. It is NOT loaded: the save effect stays off and the value is
    // never registered as "what was loaded", so nothing can be written over it.
    const failed = (error: unknown) => {
      unreadable.current = { userId, key };
      setHydrated(false);
      if (shownScope.current !== scope) {
        shownScope.current = scope;
        setValue(initialRef.current);
      }
      reportReadIssue(userId, key, error, () => setAttempt((n) => n + 1));
    };

    const load = async () => {
      const stored = await loadJSONOrThrow<T>(userKey(userId, key));
      if (cancelled) return;
      apply(stored);
      if (CLOUD_ENABLED) {
        const res = await loadKey<T>(userId, key);
        if (cancelled) return;
        if (res.source === 'remote' || res.source === 'merged') apply(res.value);
      }
      loaded();
    };
    load().catch((error) => {
      if (!cancelled) failed(error);
    });

    // Lets a foreground sync / account import refresh this value later.
    const unregister = registerReloader(userId, key, async () => {
      try {
        const res = await loadKey<T>(userId, key);
        if (cancelled) return;
        apply(res.value);
        loaded();
      } catch (error) {
        if (!cancelled) failed(error);
      }
    });

    return () => {
      cancelled = true;
      unregister();
      unreadable.current = null;
      clearReadIssue(userId, key);
    };
  }, [userId, key, scope, attempt]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    let superseded = false;
    void saveKey(userId, key, value).then((res) => {
      if (superseded) return; // a newer value is being saved; that save decides
      if (res.ok) clearSaveIssue(userId, key);
      else reportSaveIssue(userId, key, res.reason, () => setSaveAttempt((n) => n + 1));
    });
    return () => {
      superseded = true;
    };
  }, [value, hydrated, userId, key, saveAttempt]);

  // Leaving (sign-out, another user, screen gone): its "not saved yet" notice goes with it.
  useEffect(() => {
    if (!userId) return;
    return () => clearSaveIssue(userId, key);
  }, [userId, key]);

  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    const blocked = unreadable.current;
    if (blocked) {
      // It could not be saved, so it is not shown as if it had been: the pengguna is told instead.
      noteBlockedEdit(blocked.userId, blocked.key);
      return;
    }
    setValue(next);
  }, []);

  return [value, set, hydrated];
}
