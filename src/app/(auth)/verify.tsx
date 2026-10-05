import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Enter the 6-digit code from the e-mail: confirms a new account, or (mode "reset") sets a new password. */
export default function VerifyScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { email = '', mode = 'signup' } = useLocalSearchParams<{ email?: string; mode?: string }>();
  const reset = mode === 'reset';
  const { verifyCode, resendCode, requestPasswordReset, resetPassword } = useAuth();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mismatch = reset && confirm.length > 0 && confirm !== password;
  const canSubmit = code.trim().length >= 6 && (!reset || (password.length > 0 && password === confirm)) && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = reset ? await resetPassword(email, code, password) : await verifyCode(email, code);
    setBusy(false);
    if (!res.ok) setError(res.error);
    // On success the root layout moves on to the app by itself.
  }

  async function resend() {
    setError(null);
    const res = reset ? await requestPasswordReset(email) : await resendCode(email);
    if (res.ok) setInfo(t('auth.verify.resent'));
    else setError(res.error);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenHeader title={reset ? t('auth.verify.titleReset') : t('auth.verify.titleSignup')} />
            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.four }}>
              {t(reset ? 'auth.verify.introReset' : 'auth.verify.introSignup', { email })}
            </ThemedText>

            <AuthField
              label={t('auth.verify.code')}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              placeholder={t('auth.verify.codePlaceholder')}
              maxLength={8}
            />
            {reset ? (
              <>
                <AuthField label={t('auth.verify.newPassword')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
                <AuthField label={t('auth.register.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
                {mismatch ? (
                  <ThemedText type="small" style={{ color: colors.negative, marginTop: -Spacing.two, marginBottom: Spacing.three }}>
                    {t('auth.register.mismatch')}
                  </ThemedText>
                ) : null}
              </>
            ) : null}

            {error ? (
              <ThemedText type="small" style={{ color: colors.negative, marginBottom: Spacing.two }}>
                {error}
              </ThemedText>
            ) : null}
            {info ? (
              <ThemedText type="small" style={{ color: colors.positive, marginBottom: Spacing.two }}>
                {info}
              </ThemedText>
            ) : null}

            <Pressable onPress={submit} disabled={!canSubmit} style={[styles.button, { backgroundColor: canSubmit ? colors.accent : colors.backgroundSelected }]}>
              <ThemedText style={[styles.buttonText, !canSubmit && { color: colors.textSecondary }]}>
                {busy ? t('auth.login.wait') : reset ? t('auth.verify.submitReset') : t('auth.verify.submitSignup')}
              </ThemedText>
            </Pressable>

            <Pressable onPress={resend} hitSlop={8} style={styles.resend}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                {t('auth.verify.resend')}
              </ThemedText>
            </Pressable>
            <ThemedText type="small" style={[styles.hint, { color: colors.textSecondary }]}>
              {t('auth.verify.spamHint')}
            </ThemedText>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  button: { padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resend: { alignSelf: 'center', marginTop: Spacing.four },
  hint: { textAlign: 'center', marginTop: Spacing.two },
});
