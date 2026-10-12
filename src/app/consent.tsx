import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { LinkedLogin } from '@/context/auth-shared';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/**
 * Shown once to an account that started with Google / Apple, before anything else: what we received from them,
 * and the same Privacy Notice consent as the sign-up form. Then the tutorial.
 */
export default function ConsentScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { user, acceptConsent, signOut, getLogins } = useAuth();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logins, setLogins] = useState<LinkedLogin[]>([]);

  useEffect(() => {
    let alive = true;
    getLogins()
      .then((l) => alive && setLogins(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [getLogins]);

  const provider = logins.find((l) => l.provider !== 'email')?.provider;
  const providerName = provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : '';
  const email = user?.email ?? '';
  const hiddenEmail = /privaterelay\.appleid\.com$/i.test(email);
  const first = (user?.displayName ?? '').split(' ')[0];

  async function submit() {
    if (!agree || busy) return;
    setBusy(true);
    setError(null);
    const res = await acceptConsent();
    setBusy(false);
    if (!res.ok) setError(res.error || t('more.security.consent.fail'));
    // On success the root layout moves on to the tutorial by itself.
  }

  const rows: { label: string; value: string; muted?: boolean }[] = [
    { label: t('ob.consent.name'), value: user?.fullName || user?.displayName || t('ob.consent.nameLater'), muted: !(user?.fullName || user?.displayName) },
    { label: t('auth.field.email'), value: email },
  ];
  if (providerName) rows.push({ label: t('ob.consent.signInWith'), value: providerName });

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? colors.accent }]}>
            <Text style={styles.avatarText}>{(first[0] ?? 'W').toUpperCase()}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{first ? t('ob.consent.hello', { name: first }) : t('ob.consent.helloNoName')}</Text>
          <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.consent.received', { provider: providerName || 'Google / Apple' })}</Text>

          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            {rows.map((r, i) => (
              <View key={r.label} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{r.label}</Text>
                <Text style={[Type.label, styles.value, { color: r.muted ? colors.warning : colors.text }]} numberOfLines={2}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>

          {hiddenEmail ? (
            <View style={[styles.note, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
              <Text style={[Type.label, { color: colors.accent, flex: 1, fontWeight: '500' }]}>{t('ob.consent.hiddenEmail')}</Text>
            </View>
          ) : null}

          <Pressable style={styles.agree} onPress={() => setAgree((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
            <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={26} color={agree ? colors.accent : colors.textSecondary} />
            <Text style={[Type.label, { color: colors.text, flex: 1, fontWeight: '500' }]}>
              {t('auth.register.consentBefore')}
              <Text style={{ color: colors.accent, fontWeight: '700' }} onPress={() => router.push('/privacy')}>
                {t('auth.register.consentLink')}
              </Text>
              {t('auth.register.consentAfter')}
            </Text>
          </Pressable>

          {error ? <Text style={[Type.label, { color: colors.negative, marginTop: Spacing.two }]}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button label={t('ob.consent.agree')} onPress={submit} disabled={!agree} loading={busy} />
          <Pressable onPress={signOut} style={styles.decline} accessibilityRole="button">
            <Text style={[Type.label, { color: colors.textSecondary }]}>{t('more.security.consent.decline')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, paddingTop: Spacing.five },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.three },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  lead: { marginTop: Spacing.two, marginBottom: Spacing.three },
  card: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 50, paddingVertical: 8 },
  value: { flex: 1, textAlign: 'right' },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: Radius.md, marginTop: Spacing.three, alignItems: 'flex-start' },
  agree: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: Spacing.four },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  decline: { alignItems: 'center', padding: Spacing.three },
});
