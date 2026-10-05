import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_NAME, MOTTO, SLOGAN_KEY } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export default function LoginScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { signIn, cloud } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await signIn(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else if (res.needsCode) router.push({ pathname: '/verify', params: { email: email.trim(), mode: 'signup' } }); // address not confirmed yet
    // Kalau berjaya, Stack.Protected di _layout akan alihkan skrin secara automatik.
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.logo, { backgroundColor: colors.accent }]}>
              <Ionicons name="wallet" size={30} color="#fff" />
            </View>
            <ThemedText style={styles.title}>{APP_NAME}</ThemedText>
            <ThemedText style={[styles.motto, { color: colors.accent }]}>{MOTTO}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.four }}>
              {t(SLOGAN_KEY)}
            </ThemedText>

            <AuthField
              label={t('auth.field.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder={t('auth.field.emailPlaceholder')}
            />
            <AuthField
              label={t('auth.field.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              placeholder={t('auth.login.passwordPlaceholder')}
              onSubmitEditing={submit}
            />

            {error ? (
              <ThemedText type="small" style={{ color: colors.negative, marginBottom: Spacing.two }}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={() => (cloud ? router.push('/forgot') : Alert.alert(t('auth.login.forgotTitle'), t('auth.login.forgotMessage')))}
              hitSlop={8}
              style={styles.forgot}
            >
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                {t('auth.login.forgotLink')}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={submit}
              disabled={busy || !email || !password}
              style={[styles.button, { backgroundColor: !busy && email && password ? colors.accent : colors.backgroundSelected }]}
            >
              <ThemedText style={[styles.buttonText, (busy || !email || !password) && { color: colors.textSecondary }]}>
                {busy ? t('auth.login.wait') : t('auth.login.submit')}
              </ThemedText>
            </Pressable>

            <View style={styles.footer}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t('auth.login.noAccount')}{' '}
              </ThemedText>
              <Pressable onPress={() => router.push('/register')} hitSlop={8}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                  {t('auth.login.register')}
                </ThemedText>
              </Pressable>
            </View>

            {cloud ? null : (
              <ThemedText type="small" style={[styles.sim, { color: colors.textSecondary }]}>
                {t('auth.login.simulation')}
              </ThemedText>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.four, paddingTop: Spacing.six },
  logo: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.four },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  motto: { fontSize: 16, lineHeight: 22, fontWeight: '700', marginBottom: 4 },
  forgot: { alignSelf: 'flex-end', marginBottom: Spacing.three },
  button: { padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.four },
  sim: { textAlign: 'center', marginTop: Spacing.four, fontSize: 12, lineHeight: 16 },
});