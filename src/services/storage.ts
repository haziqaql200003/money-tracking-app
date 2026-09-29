import AsyncStorage from '@react-native-async-storage/async-storage';

// Semua data pengguna diasingkan dengan prefix `u:<userId>:`.
export const userKey = (userId: string, key: string) => `u:${userId}:${key}`;

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Simulasi sahaja: abaikan ralat tulis.
  }
}

/** Padam SEMUA data milik satu pengguna (untuk "Padam akaun"). */
export async function removeUserData(userId: string) {
  const prefix = `u:${userId}:`;
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(prefix));
  if (mine.length > 0) await AsyncStorage.multiRemove(mine);
}
