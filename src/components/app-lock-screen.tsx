import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinPad } from '@/components/pin-pad';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppLock } from '@/context/AppLockContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { PIN_LENGTH, waitLeft } from '@/services/app-lock';

/** Covers the whole app while it is locked. Rendered above the navigator so nothing underneath can be tapped. */
export function AppLockScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { user, signOut } = useAuth();
  const { ready, locked, biometric, unlock, unlockWithBiometric } = useAppLock();
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [left, setLeft] = useState(0); // tries before the next wait
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);
  const busy = useRef(false);

  const covered = !!user && (!ready || locked);

  // Ask for the fingerprint as soon as the lock appears.
  useEffect(() => {
    if (locked && biometric) void unlockWithBiometric();
  }, [locked, biometric, unlockWithBiometric]);

  // Pick up a wait that was still running when the app was closed.
  useEffect(() => {
    if (!locked) return;
    let alive = true;
    waitLeft().then((ms) => {
      if (alive && ms > 0) {
        setUntil(Date.now() + ms);
        setNow(Date.now());
      }
    });
    return () => {
      alive = false;
    };
  }, [locked]);

  // Tick once a second while the keypad is waiting.
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);

  if (!covered) return null;
  if (!ready) return <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: colors.background }]} />;

  const waitSec = Math.max(0, Math.ceil((until - now) / 1000));

  async function submit(next: string) {
    if (busy.current) return;
    busy.current = true;
    const res = await unlock(next);
    busy.current = false;
    if (res.ok) {
      setPin('');
      setWrong(false);
      setUntil(0);
      return;
    }
    setWrong(true);
    setLeft(res.left);
    if (res.waitMs > 0) {
      setUntil(Date.now() + res.waitMs);
      setNow(Date.now());
    }
    setTimeout(() => setPin(''), 350);
  }

  function onChange(next: string) {
    setWrong(false);
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  }

  function forgot() {
    Alert.alert(t('more.security.forgotTitle'), t('more.security.forgotBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('more.security.forgotConfirm'), style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: colors.background }]} accessibilityViewIsModal>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <View style={[styles.lock, { backgroundColor: `${colors.accent}26` }]}>
            <Ionicons name="lock-closed" size={26} color={colors.accent} />
          </View>
          <ThemedText type="subtitle" style={styles.title}>{t('more.security.lockTitle')}</ThemedText>
          <ThemedText type="small" style={{ color: waitSec > 0 || wrong ? colors.negative : colors.textSecondary, textAlign: 'center', minHeight: 36 }}>
            {waitSec > 0
              ? t('more.security.wait', { s: waitSec })
              : wrong
                ? t('more.security.wrongPin', { n: left })
                : user
                  ? t('more.security.lockSub', { name: user.displayName })
                  : ''}
          </ThemedText>
        </View>
        <PinPad
          value={pin}
          onChange={onChange}
          disabled={waitSec > 0}
          error={wrong}
          corner={
            biometric ? (
              <Pressable onPress={() => void unlockWithBiometric()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('more.security.useBiometric')}>
                <Ionicons name="finger-print" size={32} color={colors.accent} />
              </Pressable>
            ) : null
          }
        />
        <Pressable onPress={forgot} style={styles.forgot} accessibilityRole="button">
          <ThemedText type="small" style={{ color: colors.accent }}>{t('more.security.forgot')}</ThemedText>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { zIndex: 1000, elevation: 1000 },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: Spacing.four },
  top: { alignItems: 'center', gap: 8 },
  lock: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { textAlign: 'center' },
  forgot: { padding: Spacing.two },
});
