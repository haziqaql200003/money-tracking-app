import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { passwordOk } from '@/context/auth-shared';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

export default function ChangePasswordScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { cloud, changePassword, signOutOthers, hasPassword } = useAuth();
  const [hasPw, setHasPw] = useState(true);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [others, setOthers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    hasPassword().then((v) => alive && setHasPw(v));
    return () => {
      alive = false;
    };
  }, [hasPassword]);

  const canSubmit = (!hasPw || !!current) && !!next && !!again && !busy && !saved;

  async function submit() {
    if (!canSubmit) return;
    if (!passwordOk(next)) return setError(t('auth.error.passwordWeak'));
    if (next !== again) return setError(t('more.security.pw.mismatch'));
    setBusy(true);
    setError(null);
    const res = await changePassword(current, next);
    if (res.ok && cloud && others) await signOutOthers();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSaved(true);
    setCurrent('');
    setNext('');
    setAgain('');
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenHeader title={hasPw ? t('more.security.changePassword') : t('more.security.pw.setTitle')} />
            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.four }}>
              {hasPw ? t('more.security.pw.intro') : t('more.security.pw.setIntro')}
            </ThemedText>

            {hasPw ? <AuthField label={t('more.security.pw.current')} value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" /> : null}
            <AuthField label={t('more.security.pw.new')} value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
            <AuthField label={t('more.security.pw.again')} value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" onSubmitEditing={submit} />

            {cloud ? (
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <ThemedText>{t('more.security.pw.others')}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('more.security.pw.othersSub')}</ThemedText>
                </View>
                <Switch value={others} onValueChange={setOthers} trackColor={{ true: colors.accent }} />
              </View>
            ) : null}

            {error ? (
              <ThemedText type="small" style={{ color: colors.negative, marginBottom: Spacing.two }}>{error}</ThemedText>
            ) : null}
            {saved ? (
              <ThemedText type="small" style={{ color: colors.positive, marginBottom: Spacing.two }}>{t('more.security.pw.done')}</ThemedText>
            ) : null}

            {saved ? (
              <Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.accent }]} accessibilityRole="button">
                <ThemedText style={styles.buttonText}>{t('common.done')}</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                disabled={!canSubmit}
                onPress={submit}
                style={[styles.button, { backgroundColor: colors.accent, opacity: canSubmit ? 1 : 0.5 }]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.buttonText}>{busy ? t('common.loading') : t('more.security.pw.save')}</ThemedText>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.three },
  button: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: Radius.md, marginTop: Spacing.two },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});
