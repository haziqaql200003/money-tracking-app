import { useEffect, useRef } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { Alert } from '@/services/dialog';
import { retryStorage, startFresh, useStorageHealth } from '@/services/storage-health';

/**
 * Tells the pengguna when WaKira could not read some of their records (see services/storage-health).
 * Draws nothing itself: it uses the same alert as the rest of the app, one at a time.
 * - Try again: reads the records once more.
 * - Other options (only when the stored text itself is damaged): keep the damaged copy aside and start those
 *   records again. Asked twice, because the records then begin from the cloud copy or empty.
 */
export function StorageGuard() {
  const { user } = useAuth();
  const { t } = useT();
  const health = useStorageHealth();
  const userId = user?.id ?? null;

  const mine = userId ? health.issues.filter((i) => i.userId === userId) : [];
  const signature = mine.map((i) => `${i.storageKey}:${i.reason}`).sort().join('|');
  const damaged = mine.some((i) => i.reason === 'corrupt');
  const blockedEdits = health.blockedEdits;

  const open = useRef(false);
  const seenBlocked = useRef(blockedEdits);

  useEffect(() => {
    const refused = blockedEdits !== seenBlocked.current;
    seenBlocked.current = blockedEdits;
    if (!userId || signature === '' || open.current) return;
    open.current = true;
    const close = () => {
      open.current = false;
    };

    const askStartFresh = () => {
      open.current = true;
      Alert.alert(t('common.storageFreshTitle'), t('common.storageFreshBody'), [
        { text: t('common.cancel'), style: 'cancel', onPress: close },
        {
          text: t('common.storageFreshGo'),
          style: 'destructive',
          onPress: () => {
            close();
            void startFresh(userId).then((res) => {
              if (res.failed > 0) Alert.alert(t('common.storageTitle'), t('common.storageFreshFailed'));
            });
          },
        },
      ]);
    };

    const retry = {
      text: t('common.storageRetry'),
      onPress: () => {
        close();
        retryStorage(userId);
      },
    };
    if (refused) {
      Alert.alert(t('common.storageUnsavedTitle'), `${t('common.storageBody')}\n\n${t('common.storageUnsavedBody')}`, [
        { text: t('common.ok'), style: 'cancel', onPress: close },
        retry,
      ]);
      return;
    }
    Alert.alert(t('common.storageTitle'), `${t('common.storageBody')}\n\n${t('common.storageReadOnly')}`, [
      { text: t('common.storageLater'), style: 'cancel', onPress: close },
      ...(damaged ? [{ text: t('common.storageOptions'), onPress: askStartFresh }] : []),
      retry,
    ]);
  }, [userId, signature, damaged, blockedEdits, t]);

  return null;
}
