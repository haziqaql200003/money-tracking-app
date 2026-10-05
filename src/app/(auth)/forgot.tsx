import { useRouter } from 'expo-router';
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

export default function ForgotPasswordScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = !!email.trim() && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = await requestPasswordReset(email);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else router.replace({ pathname: '/verify', params: { email: email.trim(), mode: 'reset' } });
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenHeader title={t('auth.forgot.title')} />
            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.four }}>
              {t('auth.forgot.intro')}
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
              onSubmitEditing={submit}
            />

            {error ? (
              <ThemedText type="small" style={{ color: colors.negative, marginBottom: Spacing.two }}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable onPress={submit} disabled={!canSubmit} style={[styles.button, { backgroundColor: canSubmit ? colors.accent : colors.backgroundSelected }]}>
              <ThemedText style={[styles.buttonText, !canSubmit && { color: colors.textSecondary }]}>
                {busy ? t('auth.forgot.sending') : t('auth.forgot.send')}
              </ThemedText>
            </Pressable>
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
});
