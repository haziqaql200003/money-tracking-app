import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small flags that belong to this phone, not to an account (they are never synced):
 * - the Kira / Faham / Rancang story has been read to the end;
 * - which accounts have already been opened on this phone (to spot a new phone or a reinstall);
 * - the Home walkthrough has been seen.
 */
const INTRO_KEY = 'app:introSeen';
const deviceKey = (userId: string) => `app:deviceSeen:${userId}`;
const coachKey = (userId: string) => `app:coachSeen:${userId}`;

async function getFlag(key: string) {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    return false;
  }
}
function setFlag(key: string, on: boolean) {
  (on ? AsyncStorage.setItem(key, '1') : AsyncStorage.removeItem(key)).catch(() => {});
}

export const introSeen = () => getFlag(INTRO_KEY);
export const markIntroSeen = () => setFlag(INTRO_KEY, true);
/** After an account is deleted the app starts again as if it was just installed. */
export const resetIntro = () => setFlag(INTRO_KEY, false);

export const deviceSeen = (userId: string) => getFlag(deviceKey(userId));
export const markDeviceSeen = (userId: string) => setFlag(deviceKey(userId), true);

export const coachSeen = (userId: string) => getFlag(coachKey(userId));
export const setCoachSeen = (userId: string, on: boolean) => setFlag(coachKey(userId), on);

/** The tutorial's "Import Excel or CSV" choice: Home opens the import screen once the tutorial is done. */
const IMPORT_KEY = 'app:pendingImport';
export const setPendingImport = () => setFlag(IMPORT_KEY, true);
export async function takePendingImport() {
  const on = await getFlag(IMPORT_KEY);
  if (on) setFlag(IMPORT_KEY, false);
  return on;
}
