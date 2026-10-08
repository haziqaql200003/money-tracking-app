import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Shown once after the first cloud sign-in when this phone still has an old phone-only account. */
export default function MigrateScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { legacyAccounts, importLegacy, skipImport } = useAuth();
  const [chosen, setChosen] = useState(legacyAccounts[0]?.id ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = !!chosen && !!password && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = await importLegacy(chosen, password);
    setBusy(false);
    if (!res.ok) setError(res.error);
    // On success the root layout moves on by itself.
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText style={styles.title}>{t('auth.migrate.title')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.four }}>
              {t('auth.migrate.intro')}
            </ThemedText>

            {legacyAccounts.length > 1 ? (
              <>
                <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.one }}>
                  {t('auth.migrate.account')}
                </ThemedText>
                <View style={styles.list}>
                  {legacyAccounts.map((a) => {
                    const active = a.id === chosen;
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => setChosen(a.id)}
                        style={[styles.account, { backgroundColor: active ? colors.accent : colors.backgroundElement, borderColor: active ? colors.accent : colors.divider }]}
                      >
                        <ThemedText type="smallBold" style={active ? { color: '#fff' } : undefined}>
                          {a.displayName}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: active ? '#fff' : colors.textSecondary }}>
                          {a.email}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : legacyAccounts[0] ? (
              <View style={[styles.account, { backgroundColor: colors.backgroundElement, borderColor: colors.divider, marginBottom: Spacing.four }]}>
                <ThemedText type="smallBold">{legacyAccounts[0].displayName}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {legacyAccounts[0].email}
                </ThemedText>
              </View>
            ) : null}

            <AuthField label={t('auth.migrate.password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" onSubmitEditing={submit} />

            {error ? (
              <ThemedText type="small" style={{ color: colors.negative, marginBottom: Spacing.two }}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable onPress={submit} disabled={!canSubmit} style={[styles.button, { backgroundColor: canSubmit ? colors.accent : colors.backgroundSelected }]}>
              <ThemedText style={[styles.buttonText, !canSubmit && { color: colors.textSecondary }]}>
                {busy ? t('auth.migrate.wait') : t('auth.migrate.submit')}
              </ThemedText>
            </Pressable>

            <Pressable onPress={skipImport} hitSlop={8} style={styles.skip} disabled={busy}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                {t('auth.migrate.skip')}
              </ThemedText>
            </Pressable>
            <ThemedText type="small" style={[styles.hint, { color: colors.textSecondary }]}>
              {t('auth.migrate.skipHint')}
            </ThemedText>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, paddingTop: Spacing.six },
  title: { fontSize: FontSize.largeTitle, lineHeight: 36, fontWeight: '700', marginBottom: Spacing.two },
  list: { gap: Spacing.two, marginBottom: Spacing.four },
  account: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  button: { padding: 16, borderRadius: Radius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
  skip: { alignSelf: 'center', marginTop: Spacing.four },
  hint: { textAlign: 'center', marginTop: Spacing.two },
});
