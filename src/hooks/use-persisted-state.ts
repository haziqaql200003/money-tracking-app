import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

import { loadJSON, saveJSON, userKey } from '@/services/storage';

/**
 * Seperti useState, tetapi dimuat/disimpan ke AsyncStorage ikut pengguna.
 * userId null (belum login) => kembali ke nilai awal, tiada apa disimpan.
 *
 * Elemen ketiga (`hydrated`) menjadi true selepas data tersimpan siap dimuat.
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
    loadJSON<T>(userKey(userId, key)).then((stored) => {
      if (cancelled) return;
      setValue(stored ?? initialRef.current);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, key]);

  useEffect(() => {
    if (hydrated && userId) saveJSON(userKey(userId, key), value);
  }, [value, hydrated, userId, key]);

  return [value, setValue, hydrated];
}