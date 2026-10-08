import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Shown once to an account that started with Google / Apple, before anything else. Same consent as the sign-up form. */
export default function ConsentScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { acceptConsent, signOut } = useAuth();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!agree || busy) return;
    setBusy(true);
    setError(null);
    const res = await acceptConsent();
    setBusy(false);
    if (!res.ok) setError(res.error || t('more.security.consent.fail'));
    // On success the root layout moves on by itself.
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.icon, { backgroundColor: `${colors.accent}26` }]}>
            <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
          </View>
          <ThemedText type="subtitle">{t('more.security.consent.title')}</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, marginTop: 8, marginBottom: Spacing.four }}>{t('more.security.consent.intro')}</ThemedText>

          <Pressable style={styles.row} onPress={() => setAgree((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
            <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={24} color={agree ? colors.accent : colors.textSecondary} />
            <ThemedText type="small" style={styles.flex}>
              {t('auth.register.consentBefore')}
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }} onPress={() => router.push('/privacy')}>
                {t('auth.register.consentLink')}
              </ThemedText>
              {t('auth.register.consentAfter')}
            </ThemedText>
          </Pressable>

          {error ? <ThemedText type="small" style={{ color: colors.negative, marginBottom: Spacing.two }}>{error}</ThemedText> : null}

          <Pressable
            onPress={submit}
            disabled={!agree || busy}
            style={[styles.button, { backgroundColor: agree && !busy ? colors.accent : colors.backgroundSelected }]}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.buttonText, !(agree && !busy) && { color: colors.textSecondary }]}>{t('more.security.consent.agree')}</ThemedText>
          </Pressable>
          <Pressable onPress={signOut} style={styles.decline} accessibilityRole="button">
            <ThemedText type="small" style={{ color: colors.accent }}>{t('more.security.consent.decline')}</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, paddingTop: Spacing.six },
  icon: { width: 56, height: 56, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.three },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: Spacing.three },
  button: { padding: 16, borderRadius: Radius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
  decline: { alignItems: 'center', padding: Spacing.three },
});
