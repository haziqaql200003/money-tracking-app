import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { SocialProvider } from '@/context/auth-shared';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** "Continue with Google / Apple". Shown only when accounts live in the cloud. Apple appears on iPhone only. */
export function SocialButtons({ onError }: { onError: (message: string | null) => void }) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const { t } = useT();
  const { cloud, signInWithProvider } = useAuth();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [appleOk, setAppleOk] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => alive && setAppleOk(ok))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!cloud) return null;

  async function go(provider: SocialProvider) {
    if (busy) return;
    setBusy(provider);
    onError(null);
    const res = await signInWithProvider(provider);
    setBusy(null);
    if (!res.ok && res.error) onError(res.error); // empty error = the person closed the sheet
    // Success: the root layout moves on by itself.
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
        <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('more.security.continueWith')}</ThemedText>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      </View>

      {appleOk ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={14}
          style={styles.apple}
          onPress={() => void go('apple')}
        />
      ) : null}

      <Pressable
        disabled={!!busy}
        onPress={() => void go('google')}
        style={({ pressed }) => [styles.google, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        {busy === 'google' ? <ActivityIndicator color={colors.text} /> : <Ionicons name="logo-google" size={20} color={colors.text} />}
        <ThemedText style={styles.googleText}>{t('more.security.googleBtn')}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.four, gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  apple: { height: 50, width: '100%' },
  google: { height: 50, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleText: { fontWeight: '600', fontSize: FontSize.body },
});
