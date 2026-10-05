import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

import { loadKey, noteLoaded, registerReloader, saveKey } from '@/services/cloud-sync';
import { loadJSON, userKey } from '@/services/storage';
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
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  userId: string | null,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const initialRef = useRef(initial);
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    if (!userId) {
      setValue(initialRef.current);
      return;
    }

    // Show `next` (or the default when nothing is stored) without counting it as an edit.
    const apply = (next: T | null) => {
      const shown = next ?? initialRef.current;
      noteLoaded(userId, key, shown);
      setValue((prev) => (JSON.stringify(prev) === JSON.stringify(shown) ? prev : shown));
    };

    loadJSON<T>(userKey(userId, key)).then(async (stored) => {
      if (cancelled) return;
      apply(stored);
      if (CLOUD_ENABLED) {
        const res = await loadKey<T>(userId, key);
        if (cancelled) return;
        if (res.source === 'remote') apply(res.value);
      }
      setHydrated(true);
    });

    // Lets a foreground sync / account import refresh this value later.
    const unregister = registerReloader(userId, key, async () => {
      const res = await loadKey<T>(userId, key);
      if (!cancelled) apply(res.value);
    });

    return () => {
      cancelled = true;
      unregister();
    };
  }, [userId, key]);

  useEffect(() => {
    if (hydrated && userId) void saveKey(userId, key, value);
  }, [value, hydrated, userId, key]);

  return [value, setValue, hydrated];
}
