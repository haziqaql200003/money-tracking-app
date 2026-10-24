import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth/auth-field';
import { PasswordRules } from '@/components/auth/password-rules';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { EMAIL_RE, normEmail, normUsername, validateUsername } from '@/context/auth-shared';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { checkPassword } from '@/utils/password';

/** Offered as the person types the part before @. Anything else can simply be typed out in full. */
const DOMAINS = ['@gmail.com', '@yahoo.com', '@hotmail.com', '@outlook.com', '@icloud.com'];
const PROMISES: { titleKey: TKey; bodyKey: TKey }[] = [
  { titleKey: 'ob.reg.promise1.title', bodyKey: 'ob.reg.promise1.body' },
  { titleKey: 'ob.reg.promise2.title', bodyKey: 'ob.reg.promise2.body' },
  { titleKey: 'ob.reg.promise3.title', bodyKey: 'ob.reg.promise3.body' },
];
const STEPS = 4;

/** Sign up with e-mail, one question per screen: name, e-mail, password, privacy. Then a 6-digit code. */
export default function RegisterScreen() {
  const colors = useTheme();
  const { t, lang } = useT();
  const router = useRouter();
  const { signUp, usernameAvailable } = useAuth();
  const [step, setStep] = useState(0);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [taken, setTaken] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const firstName = first.trim();
  const fullName = `${firstName} ${last.trim()}`.trim();
  const emailOk = EMAIL_RE.test(normEmail(email));
  const check = checkPassword(password, [firstName, last, email]);
  const match = password.length > 0 && password === confirm;

  // E-mail suggestions: "johndoe" or "johndoe@ya" -> johndoe@yahoo.com
  const raw = email.trim();
  const at = raw.indexOf('@');
  const local = at >= 0 ? raw.slice(0, at) : raw;
  const typedDomain = at >= 0 ? raw.slice(at).toLowerCase() : '';
  const suggestions = local && !/\s/.test(local) && !emailOk ? DOMAINS.filter((d) => d.startsWith(typedDomain) && d !== typedDomain) : [];

  const uname = normUsername(username);
  const unameBad = uname ? validateUsername(uname) : null;
  const canNext = [firstName.length >= 2, emailOk && !unameBad && taken !== true, check.ok && match, consent][step] && !busy;

  // Ask the server whether the username is free, a moment after typing stops.
  useEffect(() => {
    if (!uname || validateUsername(uname)) return;
    let alive = true;
    const id = setTimeout(() => {
      void usernameAvailable(uname).then((free) => alive && setTaken(free === null ? false : !free));
    }, 450);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [uname, usernameAvailable]);

  async function next() {
    if (!canNext) return;
    setError(null);
    if (step < STEPS - 1) return setStep(step + 1);
    setBusy(true);
    const res = await signUp({ email, password, displayName: firstName.slice(0, 24), fullName, username: uname || undefined, language: lang, consent });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      // An e-mail that is already taken belongs to step 2.
      if (res.error === t('auth.error.emailTaken') || res.error === t('auth.error.usernameTaken')) setStep(1);
      return;
    }
    if (res.needsCode) router.push({ pathname: '/verify', params: { email: email.trim(), mode: 'signup', name: firstName } });
    // Otherwise the person is signed in and the root layout moves on to the tutorial.
  }

  function back() {
    setError(null);
    if (step === 0) router.back();
    else setStep(step - 1);
  }

  const initials = (firstName[0] ?? '') + (last.trim().replace(/^(bin|binti|bt|b\.)\s+/i, '')[0] ?? '');

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.top}>
            <IconButton icon="chevron-back" onPress={back} label={t('common.back')} />
            <View style={[styles.track, { backgroundColor: colors.divider }]}>
              <View style={[styles.fill, { width: `${((step + 1) / (STEPS + 1)) * 100}%`, backgroundColor: colors.accent }]} />
            </View>
            <Text style={[Type.label, { color: colors.textSecondary, minWidth: 30, textAlign: 'right' }]}>{`${step + 1}/${STEPS + 1}`}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {step === 0 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.reg.nameTitle')}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.reg.nameBody')}</Text>
                <AuthField label={t('ob.reg.first')} value={first} onChangeText={setFirst} placeholder={t('ob.reg.firstPh')} autoFocus textContentType="givenName" autoComplete="given-name" maxLength={40} />
                <AuthField label={t('ob.reg.last')} value={last} onChangeText={setLast} placeholder={t('ob.reg.lastPh')} textContentType="familyName" autoComplete="family-name" maxLength={40} onSubmitEditing={next} />
                {firstName ? (
                  <View style={[styles.preview, { backgroundColor: colors.backgroundElement }]}>
                    <View style={[styles.initials, { backgroundColor: colors.accent }]}>
                      <Text style={[Type.label, { color: '#fff' }]}>{initials.toUpperCase()}</Text>
                    </View>
                    <Text style={[Type.label, { color: colors.textSecondary, flex: 1 }]}>
                      {t('ob.reg.shownAs')} <Text style={{ color: colors.text, fontWeight: '700' }}>{fullName}</Text>
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.reg.emailTitle', { name: firstName })}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.reg.emailBody')}</Text>
                <AuthField
                  label={t('auth.field.email')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  placeholder={t('ob.reg.emailPh')}
                  autoFocus
                  onSubmitEditing={next}
                />
                {suggestions.length > 0 ? (
                  <View style={styles.suggestWrap}>
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>{t('ob.reg.tapToFinish')}</Text>
                    <View style={styles.suggestRow}>
                      {suggestions.map((d) => (
                        <Pressable
                          key={d}
                          onPress={() => setEmail(local + d)}
                          style={({ pressed }) => [styles.suggest, { borderColor: colors.divider, backgroundColor: colors.backgroundElement }, pressed && { opacity: 0.6 }]}
                          accessibilityRole="button"
                        >
                          <Text style={[Type.label, { color: colors.textSecondary }]}>
                            {local}
                            <Text style={{ color: colors.accent, fontWeight: '700' }}>{d}</Text>
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>{t('ob.reg.otherDomain')}</Text>
                  </View>
                ) : null}
                {email.length > 3 && !emailOk && suggestions.length === 0 ? (
                  <Text style={[Type.label, { color: colors.negative }]}>{t('ob.reg.emailBad')}</Text>
                ) : null}
                <AuthField
                  label={t('auth.field.username')}
                  value={username}
                  onChangeText={(v) => {
                    setUsername(v);
                    setTaken(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  placeholder={t('auth.field.usernamePlaceholder')}
                  maxLength={21}
                />
                <Text style={[Type.caption, { color: colors.textSecondary }]}>{t('auth.username.hint')}</Text>
                {uname ? (
                  <Text style={[Type.label, { color: unameBad || taken ? colors.negative : colors.positive }]}>
                    {unameBad ?? (taken === null ? t('auth.username.checking') : taken ? t('auth.username.taken') : t('auth.username.free'))}
                  </Text>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={[styles.title, styles.titleGap, { color: colors.text }]}>{t('ob.reg.pwTitle')}</Text>
                <AuthField label={t('auth.field.password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" textContentType="newPassword" autoComplete="new-password" autoFocus placeholder={t('ob.reg.pwPh')} />
                <AuthField label={t('auth.register.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" textContentType="newPassword" placeholder={t('ob.reg.confirmPh')} onSubmitEditing={next} />
                <PasswordRules check={check} typed={password.length > 0} match={match} />
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('ob.reg.privacyTitle')}</Text>
                <Text style={[Type.body, styles.lead, { color: colors.textSecondary }]}>{t('ob.reg.privacyBody')}</Text>
                {PROMISES.map((p, i) => (
                  <View key={p.titleKey} style={[styles.promise, { backgroundColor: colors.backgroundElement }]}>
                    <View style={[styles.num, { backgroundColor: colors.accentSoft }]}>
                      <Text style={[Type.heading, { color: colors.accent }]}>{i + 1}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={[Type.heading, { color: colors.text }]}>{t(p.titleKey)}</Text>
                      <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{t(p.bodyKey)}</Text>
                    </View>
                  </View>
                ))}
                <Pressable style={styles.consentRow} onPress={() => setConsent((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
                  <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={26} color={consent ? colors.accent : colors.textSecondary} />
                  <Text style={[Type.label, { color: colors.text, flex: 1, fontWeight: '500' }]}>
                    {t('auth.register.consentBefore')}
                    <Text style={{ color: colors.accent, fontWeight: '700' }} onPress={() => router.push('/privacy')}>
                      {t('auth.register.consentLink')}
                    </Text>
                    {t('auth.register.consentAfter')}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {error ? <Text style={[Type.label, { color: colors.negative, marginTop: Spacing.two }]}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button label={step === STEPS - 1 ? t('ob.reg.agreeSignUp') : t('ob.common.continue')} onPress={next} disabled={!canNext} loading={busy} />
            {step === 0 ? (
              <Pressable onPress={() => router.replace('/login')} style={styles.link} accessibilityRole="button">
                <Text style={[Type.label, { color: colors.textSecondary }]}>
                  {t('ob.reg.haveAccount')}{' '}
                  <Text style={{ color: colors.accent, fontWeight: '700' }}>{t('auth.login.submit')}</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  track: { flex: 1, height: 6, borderRadius: Radius.xs, overflow: 'hidden' },
  fill: { height: 6, borderRadius: Radius.xs },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.four },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  lead: { marginTop: Spacing.two, marginBottom: Spacing.four },
  titleGap: { marginBottom: Spacing.four },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.md },
  initials: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  suggestWrap: { gap: 8, marginTop: -Spacing.one },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggest: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1.5 },
  promise: { flexDirection: 'row', gap: 12, padding: Spacing.three, borderRadius: Radius.lg, marginBottom: Spacing.two },
  num: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: Spacing.two },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, gap: 4 },
  link: { alignItems: 'center', paddingVertical: 12 },
});
