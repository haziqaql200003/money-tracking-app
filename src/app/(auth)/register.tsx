import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth, type Language } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';

const LANGS: { key: Language; label: string }[] = [
  { key: 'ms', label: 'Bahasa Melayu' },
  { key: 'en', label: 'English' },
];

export default function RegisterScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [language, setLanguage] = useState<Language>('ms');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !!displayName && !!email && !!password && password === confirm && consent && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = await signUp({ email, password, displayName, language, consent });
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenHeader title="Daftar akaun" />

            <AuthField label="Nama paparan" value={displayName} onChangeText={setDisplayName} maxLength={24} placeholder="Cth: Aqil" />
            <AuthField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="nama@contoh.com"
            />
            <AuthField
              label="Kata laluan (min 8 aksara, ada huruf & nombor)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <AuthField label="Sahkan kata laluan" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
            {mismatch ? (
              <ThemedText type="small" style={{ color: colors.negative, marginTop: -Spacing.two, marginBottom: Spacing.three }}>
                Kata laluan tidak sepadan
              </ThemedText>
            ) : null}

            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.one }}>
              Bahasa
            </ThemedText>
            <View style={styles.chipRow}>
              {LANGS.map((l) => {
                const active = language === l.key;
                return (
                  <Pressable
                    key={l.key}
                    onPress={() => setLanguage(l.key)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.accent : colors.backgroundElement, borderColor: active ? colors.accent : colors.divider },
                    ]}
                  >
                    <ThemedText type="small" style={active ? { color: '#fff', fontWeight: '600' } : { color: colors.textSecondary }}>
                      {l.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.consentRow} onPress={() => setConsent((v) => !v)} accessibilityRole="checkbox">
              <Ionicons
                name={consent ? 'checkbox' : 'square-outline'}
                size={24}
                color={consent ? colors.accent : colors.textSecondary}
              />
              <ThemedText type="small" style={styles.flex}>
                Saya telah membaca dan bersetuju dengan{' '}
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }} onPress={() => router.push('/privacy')}>
                  Notis Privasi
                </ThemedText>{' '}
                dan membenarkan data saya diproses seperti dinyatakan.
              </ThemedText>
            </Pressable>

            {error ? (
              <ThemedText type="small" style={{ color: colors.negative, marginBottom: Spacing.two }}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable onPress={submit} disabled={!canSubmit} style={[styles.button, { backgroundColor: canSubmit ? colors.accent : colors.backgroundSelected }]}>
              <ThemedText style={[styles.buttonText, !canSubmit && { color: colors.textSecondary }]}>
                {busy ? 'Sila tunggu...' : 'Daftar'}
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
  chipRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.four },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: Spacing.three },
  button: { padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
