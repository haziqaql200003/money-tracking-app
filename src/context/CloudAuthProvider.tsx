/**
 * CLOUD sign-in (used when EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY are set).
 * - Real accounts in Supabase Auth: e-mail + password, 6-digit e-mail codes for confirming the address
 *   and for resetting a forgotten password.
 * - The signed-in user is cached on the phone, so the app opens (and works) offline.
 * - Data is synced by usePersistedState + services/cloud-sync.
 * - An old phone-only account can be imported once into a brand-new cloud account.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { isAuthRetryableFetchError, type AuthError, type Session } from '@supabase/supabase-js';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CARD_COLORS } from '@/constants/card-styles';
import { setLanguage, t } from '@/i18n';
import { flushAll, forgetUser, initialPull, reloadAll, startForegroundSync } from '@/services/cloud-sync';
import { loadJSON, removeUserData, saveJSON } from '@/services/storage';
import { OAUTH_REDIRECT, parseAuthUrl } from '@/services/social-auth';
import { supabase } from '@/services/supabase';

import {
  AuthContext,
  EMAIL_RE,
  normEmail,
  passwordOk,
  validateSignUp,
  type AuthContextValue,
  type AuthUser,
  type Language,
  type LegacyAccount,
  type LinkedLogin,
  type ProfilePatch,
  type Result,
  type StoredUser,
} from './auth-shared';
import { hashPassword, LANGUAGE_KEY, SESSION_KEY, USERS_KEY } from './LocalAuthProvider';

WebBrowser.maybeCompleteAuthSession();

const CACHED_USER_KEY = 'auth:cloudUser';
const pendingPatchKey = (id: string) => `auth:profilePending:${id}`;
const dismissedKey = (id: string) => `auth:importDismissed:${id}`;

const sb = () => {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
};

/** Turns a Supabase error into a sentence in the user's language. */
function explain(error: AuthError | { code?: string; message?: string; name?: string }): string {
  const code = (error as { code?: string }).code;
  const msg = (error.message ?? '').toLowerCase();
  if (isAuthRetryableFetchError(error) || msg.includes('network request failed') || msg.includes('failed to fetch')) return t('auth.error.network');
  switch (code) {
    case 'invalid_credentials':
      return t('auth.error.badCredentials');
    case 'user_already_exists':
    case 'email_exists':
      return t('auth.error.emailTaken');
    case 'weak_password':
      return t('auth.error.passwordWeak');
    case 'otp_expired':
    case 'validation_failed':
      return t('auth.error.codeInvalid');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return t('auth.error.rateLimit');
    case 'same_password':
      return t('auth.error.samePassword');
    case 'signup_disabled':
    case 'email_provider_disabled':
      return t('auth.error.signupDisabled');
    case 'provider_disabled':
    case 'validation_failed_provider':
      return t('more.security.err.providerOff');
    case 'manual_linking_disabled':
      return t('more.security.err.linkingOff');
    case 'identity_already_exists':
      return t('more.security.err.alreadyUsed');
    case 'single_identity_not_deletable':
      return t('more.security.err.lastLogin');
    case 'email_address_invalid':
      return t('auth.error.emailInvalid');
    default: {
      if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid'))) return t('auth.error.codeInvalid');
      if (msg.includes('invalid login credentials')) return t('auth.error.badCredentials');
      if (msg.includes('sending') && msg.includes('email')) return t('auth.error.emailSend');
      // While developing (Expo Go / dev build) show what Supabase really said, so the cause is easy to find.
      if (__DEV__) {
        console.warn('[cloud] auth error', error);
        return `${t('auth.error.generic')} [${code ?? (error as { status?: number }).status ?? 'no code'}: ${error.message ?? ''}]`;
      }
      return t('auth.error.generic');
    }
  }
}

type ProfileRow = {
  display_name: string | null;
  avatar_color: string | null;
  language: string | null;
  goal: string | null;
  has_onboarded: boolean | null;
  consent_at: string | null;
  created_at: string | null;
};

const toColumns = (p: ProfilePatch) => ({
  ...(p.displayName !== undefined && { display_name: p.displayName }),
  ...(p.avatarColor !== undefined && { avatar_color: p.avatarColor }),
  ...(p.language !== undefined && { language: p.language }),
  ...(p.goal !== undefined && { goal: p.goal }),
  ...(p.hasOnboarded !== undefined && { has_onboarded: p.hasOnboarded }),
});

/** Name from the sign-up form, or the one Google / Apple handed over. */
function metaName(meta: Record<string, unknown>): string {
  for (const k of ['display_name', 'full_name', 'name']) {
    const v = meta[k];
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 24);
  }
  return '';
}

function buildUser(id: string, email: string, row: Partial<ProfileRow> | null, meta: Record<string, unknown>): AuthUser {
  const lang = (row?.language ?? meta.language) === 'en' ? 'en' : 'ms';
  const goal = row?.goal;
  return {
    id,
    email,
    displayName: row?.display_name || metaName(meta),
    avatarColor: row?.avatar_color || CARD_COLORS[0],
    language: lang,
    goal: goal === 'save' || goal === 'debt' || goal === 'budget' || goal === 'track' ? goal : undefined,
    hasOnboarded: !!row?.has_onboarded,
    consentAt: row?.consent_at ?? (typeof meta.consent_at === 'string' ? meta.consent_at : ''),
    createdAt: row?.created_at ?? new Date().toISOString(),
  };
}

async function readLegacyUsers(): Promise<StoredUser[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [legacyAccounts, setLegacyAccounts] = useState<LegacyAccount[]>([]);
  const [migrationPending, setMigrationPending] = useState(false);

  // Used only inside event handlers, never during render.
  const completing = useRef(new Map<string, Promise<Result>>());
  const holdSignIn = useRef(false); // true while a password reset is half-way, so the app does not jump ahead
  const userRef = useRef<AuthUser | null>(null);

  const commitUser = useCallback((next: AuthUser | null) => {
    userRef.current = next;
    setUser(next);
    if (next) saveJSON(CACHED_USER_KEY, next);
    else AsyncStorage.removeItem(CACHED_USER_KEY).catch(() => {});
  }, []);

  /** Sends profile edits that could not reach the server earlier, then reads the latest profile. */
  const refreshProfile = useCallback(
    async (id: string, email: string, meta: Record<string, unknown>) => {
      try {
        const pending = await loadJSON<ProfilePatch>(pendingPatchKey(id));
        if (pending) {
          const { error: e1 } = await sb().from('profiles').update(toColumns(pending)).eq('id', id);
          if (!e1) await AsyncStorage.removeItem(pendingPatchKey(id));
        }
        const { data, error } = await sb().from('profiles').select('*').eq('id', id).maybeSingle();
        if (error || !data) return;
        if (userRef.current?.id !== id) return;
        const stillPending = await loadJSON<ProfilePatch>(pendingPatchKey(id));
        commitUser({ ...buildUser(id, email, data as ProfileRow, meta), ...stillPending });
      } catch {
        // offline: keep the cached profile
      }
    },
    [commitUser],
  );

  /** Everything that must happen after the server accepted the password / code, before the app opens. */
  const completeSignIn = useCallback(
    (session: Session): Promise<Result> => {
      const id = session.user.id;
      const running = completing.current.get(id);
      if (running) return running;
      const job = (async (): Promise<Result> => {
        try {
          const { count } = await initialPull(id); // the first sign-in on a phone needs the network
          const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
          const { data } = await sb().from('profiles').select('*').eq('id', id).maybeSingle();
          const pending = await loadJSON<ProfilePatch>(pendingPatchKey(id));
          const built = { ...buildUser(id, session.user.email ?? '', (data as ProfileRow | null) ?? null, meta), ...pending };

          const legacy = await readLegacyUsers();
          const dismissed = await loadJSON<boolean>(dismissedKey(id));
          setLegacyAccounts(legacy.map((u) => ({ id: u.id, email: u.email, displayName: u.displayName })));
          setMigrationPending(legacy.length > 0 && count === 0 && !dismissed);

          commitUser(built);
          return { ok: true };
        } catch (e) {
          if (__DEV__) console.warn('[cloud] sign-in could not finish. Did you run supabase/001_wakira_init.sql?', e);
          await sb().auth.signOut().catch(() => {});
          const why = explain(e as AuthError);
          return { ok: false, error: why.startsWith(t('auth.error.generic')) ? t('auth.error.syncFailed') + (__DEV__ ? ` [${(e as Error).message}]` : '') : why };
        } finally {
          completing.current.delete(id);
        }
      })();
      completing.current.set(id, job);
      return job;
    },
    [commitUser],
  );

  /* ---- start-up: show the cached user at once (works offline), confirm with the server in the background ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [cached, lang] = await Promise.all([loadJSON<AuthUser>(CACHED_USER_KEY), loadJSON<Language>(LANGUAGE_KEY)]);
      if (!alive) return;
      if (lang === 'ms' || lang === 'en') setLanguage(lang);
      if (cached) {
        userRef.current = cached;
        setUser(cached);
        const legacy = await readLegacyUsers();
        const dismissed = await loadJSON<boolean>(dismissedKey(cached.id));
        setLegacyAccounts(legacy.map((u) => ({ id: u.id, email: u.email, displayName: u.displayName })));
        // Re-offer the import only if nothing has been decided yet and the cloud account is still empty on this phone.
        setMigrationPending(!dismissed && legacy.length > 0 && !!(await loadJSON<boolean>(`auth:importOffered:${cached.id}`)));
      }
      setIsReady(true);

      const { data, error } = await sb().auth.getSession();
      if (!alive) return;
      if (data.session) void refreshProfile(data.session.user.id, data.session.user.email ?? '', data.session.user.user_metadata ?? {});
      else if (cached && !error) commitUser(null); // the server no longer knows this session (signed out elsewhere / deleted)
    })();

    const { data: sub } = sb().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (!holdSignIn.current) {
          userRef.current = null;
          setUser(null);
          AsyncStorage.removeItem(CACHED_USER_KEY).catch(() => {});
        }
      } else if (event === 'SIGNED_IN' && session && !holdSignIn.current && userRef.current?.id !== session.user.id) {
        // Never call Supabase straight from inside this callback: it can deadlock.
        setTimeout(() => {
          if (userRef.current?.id !== session.user.id) void completeSignIn(session);
        }, 0);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [commitUser, completeSignIn, refreshProfile]);

  // Remember that an import was offered, so closing the app does not lose the prompt.
  useEffect(() => {
    if (user && migrationPending) saveJSON(`auth:importOffered:${user.id}`, true);
  }, [user, migrationPending]);

  // The signed-in user's language wins, and is remembered for the sign-in screens.
  const userLanguage = user?.language;
  useEffect(() => {
    if (!userLanguage) return;
    setLanguage(userLanguage);
    saveJSON(LANGUAGE_KEY, userLanguage);
  }, [userLanguage]);

  // Sync again every time the app comes back to the front.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    return startForegroundSync(userId);
  }, [userId]);

  /* ---- actions ---- */

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (input) => {
      const invalid = validateSignUp(input);
      if (invalid) return { ok: false, error: invalid };
      const { data, error } = await sb().auth.signUp({
        email: normEmail(input.email),
        password: input.password,
        options: { data: { display_name: input.displayName.trim(), language: input.language, consent_at: new Date().toISOString() } },
      });
      if (error) return { ok: false, error: explain(error) };
      if (data.user && data.user.identities?.length === 0) return { ok: false, error: t('auth.error.emailTaken') }; // Supabase hides existing accounts this way
      if (data.session) return completeSignIn(data.session);
      return { ok: true, needsCode: true }; // "Confirm email" is on in Supabase: a code was e-mailed
    },
    [completeSignIn],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const e = normEmail(email);
      const { data, error } = await sb().auth.signInWithPassword({ email: e, password });
      if (error) {
        if ((error as { code?: string }).code === 'email_not_confirmed') {
          await sb().auth.resend({ type: 'signup', email: e });
          return { ok: true, needsCode: true };
        }
        return { ok: false, error: explain(error) };
      }
      return completeSignIn(data.session);
    },
    [completeSignIn],
  );

  const verifyCode = useCallback<AuthContextValue['verifyCode']>(
    async (email, code) => {
      const { data, error } = await sb().auth.verifyOtp({ email: normEmail(email), token: code.trim(), type: 'signup' });
      if (error) return { ok: false, error: explain(error) };
      if (!data.session) return { ok: false, error: t('auth.error.generic') };
      return completeSignIn(data.session);
    },
    [completeSignIn],
  );

  const resendCode = useCallback<AuthContextValue['resendCode']>(async (email) => {
    const { error } = await sb().auth.resend({ type: 'signup', email: normEmail(email) });
    return error ? { ok: false, error: explain(error) } : { ok: true };
  }, []);

  const requestPasswordReset = useCallback<AuthContextValue['requestPasswordReset']>(async (email) => {
    const e = normEmail(email);
    if (!EMAIL_RE.test(e)) return { ok: false, error: t('auth.error.emailInvalid') };
    const { error } = await sb().auth.resetPasswordForEmail(e);
    return error ? { ok: false, error: explain(error) } : { ok: true };
  }, []);

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(
    async (email, code, newPassword) => {
      if (!passwordOk(newPassword)) return { ok: false, error: t('auth.error.passwordWeak') };
      holdSignIn.current = true; // finish changing the password before the app opens
      try {
        const { data, error } = await sb().auth.verifyOtp({ email: normEmail(email), token: code.trim(), type: 'recovery' });
        if (error) return { ok: false, error: explain(error) };
        const { error: upErr } = await sb().auth.updateUser({ password: newPassword });
        if (upErr) {
          await sb().auth.signOut().catch(() => {});
          return { ok: false, error: explain(upErr) };
        }
        holdSignIn.current = false;
        if (!data.session) return { ok: false, error: t('auth.error.generic') };
        return await completeSignIn(data.session);
      } finally {
        holdSignIn.current = false;
      }
    },
    [completeSignIn],
  );

  const signOut = useCallback(() => {
    const id = userRef.current?.id;
    // Close the screen at once, then hand any unsent edits to the server before the token is thrown away.
    commitUser(null);
    setMigrationPending(false);
    void (async () => {
      if (id) {
        await Promise.race([flushAll(id), new Promise((r) => setTimeout(r, 4000))]).catch(() => {});
        forgetUser(id);
      }
      await sb().auth.signOut().catch(() => {});
    })();
  }, [commitUser]);

  const updateProfile = useCallback(
    (patch: ProfilePatch) => {
      const current = userRef.current;
      if (!current) return;
      commitUser({ ...current, ...patch });
      void (async () => {
        const merged = { ...((await loadJSON<ProfilePatch>(pendingPatchKey(current.id))) ?? {}), ...patch };
        await saveJSON(pendingPatchKey(current.id), merged); // kept until the server confirms
        const { error } = await sb().from('profiles').update(toColumns(merged)).eq('id', current.id);
        if (!error) await AsyncStorage.removeItem(pendingPatchKey(current.id));
      })();
    },
    [commitUser],
  );

  const deleteAccount = useCallback<AuthContextValue['deleteAccount']>(async () => {
    const current = userRef.current;
    if (!current) return { ok: true };
    const { error } = await sb().rpc('delete_my_account');
    if (error) return { ok: false, error: explain(error) };
    commitUser(null);
    forgetUser(current.id);
    await removeUserData(current.id);
    await AsyncStorage.multiRemove([pendingPatchKey(current.id), dismissedKey(current.id), `auth:importOffered:${current.id}`]).catch(() => {});
    await sb().auth.signOut({ scope: 'local' }).catch(() => {});
    return { ok: true };
  }, [commitUser]);

  const getLogins = useCallback<AuthContextValue['getLogins']>(async () => {
    const [{ data: idData }, { data: userData }] = await Promise.all([sb().auth.getUserIdentities(), sb().auth.getUser()]);
    const out: LinkedLogin[] = [];
    for (const i of idData?.identities ?? []) {
      if (i.provider === 'google' || i.provider === 'apple' || i.provider === 'email') {
        out.push({ provider: i.provider, email: (i.identity_data as { email?: string } | undefined)?.email });
      }
    }
    // A password set later on a Google / Apple account is listed in app_metadata even when there is no email identity.
    const providers = ((userData.user?.app_metadata as { providers?: string[] } | undefined)?.providers ?? []) as string[];
    if (providers.includes('email') && !out.some((o) => o.provider === 'email')) out.push({ provider: 'email', email: userData.user?.email });
    return out;
  }, []);

  const hasPassword = useCallback<AuthContextValue['hasPassword']>(async () => {
    try {
      return (await getLogins()).some((l) => l.provider === 'email');
    } catch {
      return true; // offline: ask for the current password, which is the safe default
    }
  }, [getLogins]);

  const changePassword = useCallback<AuthContextValue['changePassword']>(async (current, next) => {
    const email = userRef.current?.email;
    if (!email) return { ok: false, error: t('auth.error.generic') };
    if (!passwordOk(next)) return { ok: false, error: t('auth.error.passwordWeak') };
    if (current === next) return { ok: false, error: t('auth.error.samePassword') };
    // Prove it is really the owner: the current password must still sign in.
    // An account that only ever used Google / Apple has no password yet, so there is nothing to check.
    if (await hasPassword()) {
      const check = await sb().auth.signInWithPassword({ email, password: current });
      if (check.error) {
        const code = (check.error as { code?: string }).code;
        return { ok: false, error: code === 'invalid_credentials' ? t('more.security.pw.wrongCurrent') : explain(check.error) };
      }
    }
    const { error } = await sb().auth.updateUser({ password: next });
    if (error) return { ok: false, error: explain(error) };
    return { ok: true };
  }, [hasPassword]);

  const signOutOthers = useCallback<AuthContextValue['signOutOthers']>(async () => {
    const { error } = await sb().auth.signOut({ scope: 'others' });
    return error ? { ok: false, error: explain(error) } : { ok: true };
  }, []);

  /** Opens the browser for Google (or Apple on Android), then returns the one-time code. '' means the person closed it. */
  const browserCode = useCallback(async (url: string): Promise<{ code?: string; error?: string; cancelled?: boolean }> => {
    const res = await WebBrowser.openAuthSessionAsync(url, OAUTH_REDIRECT);
    if (res.type !== 'success') return { cancelled: true };
    const parsed = parseAuthUrl(res.url);
    if (parsed.error) return { error: parsed.error };
    return parsed.code ? { code: parsed.code } : { error: t('auth.error.generic') };
  }, []);

  const signInWithProvider = useCallback<AuthContextValue['signInWithProvider']>(
    async (provider) => {
      try {
        let session: Session | null = null;
        let appleName = '';
        if (provider === 'apple' && Platform.OS === 'ios') {
          const raw = Crypto.randomUUID() + Crypto.randomUUID();
          const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
          let cred: AppleAuthentication.AppleAuthenticationCredential;
          try {
            cred = await AppleAuthentication.signInAsync({
              requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
              nonce: hashed,
            });
          } catch (e) {
            if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return { ok: false, error: '' };
            throw e;
          }
          if (!cred.identityToken) return { ok: false, error: t('auth.error.generic') };
          // Apple only tells us the name the very first time, so keep it now.
          appleName = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
          const { data, error } = await sb().auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: raw });
          if (error) return { ok: false, error: explain(error) };
          session = data.session;
        } else {
          const { data, error } = await sb().auth.signInWithOAuth({
            provider,
            options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true, queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined },
          });
          if (error || !data.url) return { ok: false, error: error ? explain(error) : t('auth.error.generic') };
          const got = await browserCode(data.url);
          if (got.cancelled) return { ok: false, error: '' };
          if (!got.code) return { ok: false, error: got.error ?? t('auth.error.generic') };
          const ex = await sb().auth.exchangeCodeForSession(got.code);
          if (ex.error) return { ok: false, error: explain(ex.error) };
          session = ex.data.session;
        }
        if (!session) return { ok: false, error: t('auth.error.generic') };
        const res = await completeSignIn(session);
        if (res.ok && appleName && !userRef.current?.displayName) updateProfile({ displayName: appleName.slice(0, 24) });
        return res;
      } catch (e) {
        return { ok: false, error: explain(e as AuthError) };
      }
    },
    [browserCode, completeSignIn, updateProfile],
  );

  const linkProvider = useCallback<AuthContextValue['linkProvider']>(
    async (provider) => {
      try {
        const { data, error } = await sb().auth.linkIdentity({
          provider,
          options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true },
        });
        if (error || !data.url) return { ok: false, error: error ? explain(error) : t('auth.error.generic') };
        const got = await browserCode(data.url);
        if (got.cancelled) return { ok: false, error: '' };
        if (!got.code) return { ok: false, error: got.error ?? t('auth.error.generic') };
        const ex = await sb().auth.exchangeCodeForSession(got.code);
        if (ex.error) return { ok: false, error: explain(ex.error) };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: explain(e as AuthError) };
      }
    },
    [browserCode],
  );

  const unlinkProvider = useCallback<AuthContextValue['unlinkProvider']>(async (provider) => {
    const { data, error } = await sb().auth.getUserIdentities();
    if (error) return { ok: false, error: explain(error) };
    const identity = data.identities.find((i) => i.provider === provider);
    if (!identity) return { ok: true };
    const res = await sb().auth.unlinkIdentity(identity);
    return res.error ? { ok: false, error: explain(res.error) } : { ok: true };
  }, []);

  const acceptConsent = useCallback<AuthContextValue['acceptConsent']>(async () => {
    const current = userRef.current;
    if (!current) return { ok: false, error: t('auth.error.generic') };
    const { error } = await sb().rpc('record_consent');
    if (error) return { ok: false, error: explain(error) };
    commitUser({ ...current, consentAt: new Date().toISOString() });
    return { ok: true };
  }, [commitUser]);

  const syncNow = useCallback(async () => {
    const id = userRef.current?.id;
    if (!id) return true;
    const ok = await flushAll(id);
    await reloadAll(id);
    return ok;
  }, []);

  const skipImport = useCallback(() => {
    const id = userRef.current?.id;
    if (id) saveJSON(dismissedKey(id), true);
    setMigrationPending(false);
  }, []);

  const importLegacy = useCallback<AuthContextValue['importLegacy']>(
    async (localId, password) => {
      const cloudId = userRef.current?.id;
      if (!cloudId) return { ok: false, error: t('auth.error.generic') };
      const legacy = (await readLegacyUsers()).find((u) => u.id === localId);
      if (!legacy) return { ok: false, error: t('auth.error.generic') };
      if ((await hashPassword(legacy.salt, password)) !== legacy.passwordHash) return { ok: false, error: t('auth.migrate.wrongPassword') };

      // Copy every stored document across and mark it as "not yet in the cloud".
      const prefix = `u:${localId}:`;
      const now = new Date().toISOString();
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix) && !k.startsWith(`${prefix}__sync:`));
      const pairs = await AsyncStorage.multiGet(keys);
      const writes: [string, string][] = [];
      for (const [k, raw] of pairs) {
        if (raw === null) continue;
        const rest = k.slice(prefix.length);
        writes.push([`u:${cloudId}:${rest}`, raw]);
        writes.push([`u:${cloudId}:__sync:${rest}`, JSON.stringify({ base: null, dirty: true, editedAt: now })]);
      }
      if (writes.length) await AsyncStorage.multiSet(writes);

      // Keep the card colour, goal and "already did the tutorial" from the old profile.
      updateProfile({ avatarColor: legacy.avatarColor, goal: legacy.goal, hasOnboarded: legacy.hasOnboarded });

      // Remove the old phone-only account: it now lives in the cloud.
      const remaining = (await readLegacyUsers()).filter((u) => u.id !== localId);
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(remaining));
      if ((await AsyncStorage.getItem(SESSION_KEY)) === localId) await AsyncStorage.removeItem(SESSION_KEY);
      await removeUserData(localId);

      setLegacyAccounts(remaining.map((u) => ({ id: u.id, email: u.email, displayName: u.displayName })));
      setMigrationPending(false);
      saveJSON(dismissedKey(cloudId), true);

      await reloadAll(cloudId); // the screens re-read the imported data and upload it
      void flushAll(cloudId);
      return { ok: true };
    },
    [updateProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      cloud: true,
      signUp,
      signIn,
      signOut,
      updateProfile,
      deleteAccount,
      changePassword,
      signOutOthers,
      signInWithProvider,
      linkProvider,
      unlinkProvider,
      getLogins,
      hasPassword,
      acceptConsent,
      verifyCode,
      resendCode,
      requestPasswordReset,
      resetPassword,
      syncNow,
      legacyAccounts,
      migrationPending,
      importLegacy,
      skipImport,
    }),
    [user, isReady, signUp, signIn, signOut, updateProfile, deleteAccount, changePassword, signOutOthers, signInWithProvider, linkProvider, unlinkProvider, getLogins, hasPassword, acceptConsent, verifyCode, resendCode, requestPasswordReset, resetPassword, syncNow, legacyAccounts, migrationPending, importLegacy, skipImport],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
