import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinFlowModal, type PinPurpose } from '@/components/pin-flow-modal';
import { ScreenHeader } from '@/components/screen-header';
import { Row, Section } from '@/components/settings-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppLock } from '@/context/AppLockContext';
import { useAuth } from '@/context/AuthContext';
import type { LinkedLogin, SocialProvider } from '@/context/auth-shared';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { TIMEOUT_CHOICES } from '@/services/app-lock';

/** App lock (PIN and fingerprint / face), password and signed-in devices. */
export default function SecurityScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { cloud, signOutOthers, getLogins, linkProvider, unlinkProvider } = useAuth();
  const [logins, setLogins] = useState<LinkedLogin[] | null>(null);
  const lock = useAppLock();
  const [flow, setFlow] = useState<PinPurpose | null>(null);
  const [busy, setBusy] = useState(false);
  const muted = { color: colors.textSecondary };

  const reload = useCallback(() => {
    getLogins()
      .then(setLogins)
      .catch(() => setLogins(null));
  }, [getLogins]);
  useEffect(() => {
    if (cloud) reload();
  }, [cloud, reload]);

  const has = (p: LinkedLogin['provider']) => !!logins?.some((l) => l.provider === p);
  const nameOf = (p: SocialProvider) => (p === 'google' ? t('more.security.loginGoogle') : t('more.security.loginApple'));

  async function connect(p: SocialProvider) {
    setBusy(true);
    const res = await linkProvider(p);
    setBusy(false);
    if (!res.ok) {
      if (res.error) Alert.alert(t('more.security.signInFail'), res.error);
      return;
    }
    reload();
    Alert.alert(t('more.security.connectedDone', { name: nameOf(p) }));
  }

  function disconnect(p: SocialProvider) {
    Alert.alert(t('more.security.disconnectTitle', { name: nameOf(p) }), t('more.security.disconnectBody', { name: nameOf(p) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('more.security.disconnect'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const res = await unlinkProvider(p);
          setBusy(false);
          if (!res.ok) return Alert.alert(t('more.security.signInFail'), res.error);
          reload();
        },
      },
    ]);
  }

  const providerRow = (p: SocialProvider, first?: boolean) => {
    const on = has(p);
    return (
      <Row
        first={first}
        icon={p === 'google' ? 'logo-google' : 'logo-apple'}
        label={nameOf(p)}
        subtitle={on ? t('more.security.connected') : t('more.security.notConnected')}
        value={on ? t('more.security.disconnect') : t('more.security.connect')}
        onPress={busy || logins === null ? undefined : () => (on ? disconnect(p) : void connect(p))}
      />
    );
  };

  async function toggleBiometric(on: boolean) {
    if (on && !(await lock.confirmBiometric())) return; // only switch on once it has worked once
    await lock.setBiometric(on);
  }

  function confirmOthers() {
    Alert.alert(t('more.security.othersTitle'), t('more.security.othersBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('more.security.othersConfirm'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const res = await signOutOthers();
          setBusy(false);
          Alert.alert(res.ok ? t('more.security.othersDone') : t('more.security.othersFail'), res.ok ? undefined : res.error);
        },
      },
    ]);
  }

  const timeoutLabel = (m: number) => (m === 0 ? t('more.security.timeoutNow') : t('more.security.timeoutMin', { n: m }));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader title={t('more.security.title')} />

          <Section title={t('more.security.lock')} footer={lock.supported ? t('more.security.lockFooter') : t('more.security.lockWeb')}>
            <Row
              first
              icon="lock-closed-outline"
              label={t('more.security.lockLabel')}
              subtitle={lock.enabled ? t('more.security.lockOn') : t('more.security.lockOff')}
              right={
                <Switch
                  disabled={!lock.supported}
                  value={lock.enabled}
                  onValueChange={(on) => setFlow(on ? 'set' : 'disable')}
                  trackColor={{ true: colors.accent }}
                />
              }
            />
            {lock.enabled ? (
              <>
                {lock.biometricAvailable ? (
                  <Row
                    icon="finger-print-outline"
                    label={t('more.security.biometric')}
                    subtitle={t('more.security.biometricSub')}
                    right={<Switch value={lock.biometric} onValueChange={(on) => void toggleBiometric(on)} trackColor={{ true: colors.accent }} />}
                  />
                ) : null}
                <View style={[styles.pad, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                  <ThemedText>{t('more.security.timeout')}</ThemedText>
                  <ThemedText type="small" style={muted}>{t('more.security.timeoutSub')}</ThemedText>
                  <View style={styles.chips}>
                    {TIMEOUT_CHOICES.map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => void lock.setTimeoutMin(m)}
                        style={[styles.chip, { backgroundColor: lock.timeoutMin === m ? colors.accent : colors.background }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: lock.timeoutMin === m }}
                      >
                        <ThemedText type="small" style={{ color: lock.timeoutMin === m ? '#FFFFFF' : colors.text }}>{timeoutLabel(m)}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Row icon="keypad-outline" label={t('more.security.changePin')} onPress={() => setFlow('change')} />
                <Row icon="lock-closed" label={t('more.security.lockNow')} onPress={lock.lockNow} />
              </>
            ) : null}
          </Section>

          {cloud ? (
            <Section title={t('more.security.logins')} footer={t('more.security.loginsFooter')}>
              <Row first icon="mail-outline" label={t('more.security.loginEmail')} subtitle={logins === null ? t('common.loading') : has('email') ? t('more.security.connected') : t('more.security.notConnected')} />
              {providerRow('google')}
              {Platform.OS === 'ios' ? providerRow('apple') : null}
            </Section>
          ) : null}

          <Section title={t('more.security.account')} footer={cloud ? t('more.security.accountFooter') : undefined}>
            <Row first icon="key-outline" label={t('more.security.changePassword')} subtitle={t('more.security.changePasswordSub')} onPress={() => router.push('/more/change-password')} />
            {cloud ? (
              <Row
                icon="phone-portrait-outline"
                label={t('more.security.others')}
                subtitle={busy ? t('common.loading') : t('more.security.othersSub')}
                onPress={busy ? undefined : confirmOthers}
              />
            ) : null}
          </Section>
        </ScrollView>
      </SafeAreaView>
      {flow ? <PinFlowModal key={flow} purpose={flow} onClose={() => setFlow(null)} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  pad: { padding: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.two },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
});
