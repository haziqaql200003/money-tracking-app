import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { PasswordRules } from '@/components/password-rules';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { checkPassword } from '@/utils/password';

const CODE_LEN = 6;
const RESEND_WAIT = 45;

/** Enter the 6-digit code from the e-mail: confirms a new account, or (mode "reset") sets a new password. */
export default function VerifyScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { email = '', mode = 'signup' } = useLocalSearchParams<{ email?: string; mode?: string }>();
  const reset = mode === 'reset';
  const { verifyCode, resendCode, requestPasswordReset, resetPassword } = useAuth();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_WAIT);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const check = checkPassword(password, [email]);
  const match = password.length > 0 && password === confirm;
  const canSubmit = code.length === CODE_LEN && (!reset || (check.ok && match)) && !busy;

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
    if (wait > 0) return;
    setError(null);
    const res = reset ? await requestPasswordReset(email) : await resendCode(email);
    if (res.ok) {
      setInfo(t('auth.verify.resent'));
      setWait(RESEND_WAIT);
    } else setError(res.error);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenHeader title="" />
            <Text style={[styles.title, { color: colors.text }]}>{reset ? t('auth.verify.titleReset') : t('ob.verify.title')}</Text>
            <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>
              {t('ob.verify.sent')} <Text style={{ color: colors.text, fontWeight: '700' }}>{email}</Text>
            </Text>

            {/* One hidden field holds the digits; the boxes only draw them. iOS can fill the code from the e-mail. */}
            <Pressable onPress={() => input.current?.focus()} style={styles.boxes} accessibilityLabel={t('auth.verify.code')}>
              {Array.from({ length: CODE_LEN }, (_, i) => {
                const ch = code[i] ?? '';
                const active = i === Math.min(code.length, CODE_LEN - 1);
                return (
                  <View key={i} style={[styles.box, { backgroundColor: colors.backgroundElement, borderColor: active ? colors.accent : ch ? colors.accentSoft : colors.divider }]}>
                    <Text style={[styles.digit, { color: colors.text }]}>{ch}</Text>
                  </View>
                );
              })}
              <TextInput
                ref={input}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, CODE_LEN))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={CODE_LEN}
                autoFocus
                caretHidden
                style={styles.hidden}
              />
            </Pressable>

            {reset ? (
              <View style={{ marginTop: Spacing.four }}>
                <AuthField label={t('auth.verify.newPassword')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
                <AuthField label={t('auth.register.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
                <PasswordRules check={check} typed={password.length > 0} match={match} />
              </View>
            ) : null}

            {error ? <Text style={[Type.label, { color: colors.negative, marginTop: Spacing.three }]}>{error}</Text> : null}
            {info ? <Text style={[Type.label, { color: colors.positive, marginTop: Spacing.three }]}>{info}</Text> : null}

            <View style={styles.links}>
              {!reset ? (
                <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
                  <Text style={[Type.label, { color: colors.accent }]}>{t('ob.verify.changeEmail')}</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable onPress={resend} disabled={wait > 0} hitSlop={8} accessibilityRole="button">
                <Text style={[Type.label, { color: wait > 0 ? colors.textSecondary : colors.accent }]}>
                  {wait > 0 ? t('ob.verify.resendIn', { s: wait }) : t('auth.verify.resend')}
                </Text>
              </Pressable>
            </View>
            <Text style={[Type.caption, styles.hint, { color: colors.textSecondary }]}>{t('auth.verify.spamHint')}</Text>
          </ScrollView>
          <View style={styles.footer}>
            <Button label={reset ? t('auth.verify.submitReset') : t('auth.verify.submitSignup')} onPress={submit} disabled={!canSubmit} loading={busy} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  lead: { marginTop: Spacing.two, marginBottom: Spacing.four },
  boxes: { flexDirection: 'row', gap: 8 },
  box: { flex: 1, height: 58, borderRadius: Radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  digit: { fontSize: 24, fontWeight: '800' },
  hidden: { ...StyleSheet.absoluteFill, opacity: 0.02, color: 'transparent' },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.four },
  hint: { marginTop: Spacing.three },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
});
