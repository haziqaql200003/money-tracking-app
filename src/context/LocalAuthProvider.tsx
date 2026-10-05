/**
 * LOCAL sign-in (used when Supabase is not configured).
 * - Accounts are kept in this phone's AsyncStorage. Passwords are hashed (SHA-256 + salt).
 * - NOT a real login: nothing leaves the phone, so there is no recovery and no sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { CARD_COLORS } from '@/constants/card-styles';
import { setLanguage, t } from '@/i18n';
import { loadJSON, removeUserData, saveJSON } from '@/services/storage';

import {
  AuthContext,
  normEmail,
  notCloud,
  validateSignUp,
  type AuthContextValue,
  type AuthUser,
  type Language,
  type ProfilePatch,
  type StoredUser,
} from './auth-shared';

export const USERS_KEY = 'auth:users';
export const SESSION_KEY = 'auth:session';
export const LANGUAGE_KEY = 'app:language';

export const hashPassword = (salt: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);

export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // The last language used on this phone, so the sign-in screens already speak it.
    loadJSON<Language>(LANGUAGE_KEY).then((saved) => {
      if (saved === 'ms' || saved === 'en') setLanguage(saved);
    });
    Promise.all([AsyncStorage.getItem(USERS_KEY), AsyncStorage.getItem(SESSION_KEY)])
      .then(([u, s]) => {
        if (u) setUsers(JSON.parse(u));
        if (s) setSessionId(s);
      })
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  const persistUsers = useCallback((next: StoredUser[]) => {
    setUsers(next);
    AsyncStorage.setItem(USERS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const startSession = useCallback((id: string) => {
    setSessionId(id);
    AsyncStorage.setItem(SESSION_KEY, id).catch(() => {});
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (input) => {
      const invalid = validateSignUp(input);
      if (invalid) return { ok: false, error: invalid };
      const e = normEmail(input.email);
      if (users.some((u) => u.email === e)) return { ok: false, error: t('auth.error.emailTaken') };

      const salt = Crypto.randomUUID();
      const stored: StoredUser = {
        id: Crypto.randomUUID(),
        email: e,
        salt,
        passwordHash: await hashPassword(salt, input.password),
        displayName: input.displayName.trim(),
        avatarColor: CARD_COLORS[0],
        language: input.language,
        hasOnboarded: false,
        consentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      persistUsers([...users, stored]);
      startSession(stored.id);
      return { ok: true };
    },
    [users, persistUsers, startSession],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const found = users.find((u) => u.email === normEmail(email));
      const bad = { ok: false, error: t('auth.error.badCredentials') } as const;
      if (!found) return bad;
      if ((await hashPassword(found.salt, password)) !== found.passwordHash) return bad;
      startSession(found.id);
      return { ok: true };
    },
    [users, startSession],
  );

  const signOut = useCallback(() => {
    setSessionId(null);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  const updateProfile = useCallback(
    (patch: ProfilePatch) => {
      if (!sessionId) return;
      persistUsers(users.map((u) => (u.id === sessionId ? { ...u, ...patch } : u)));
    },
    [sessionId, users, persistUsers],
  );

  const deleteAccount = useCallback<AuthContextValue['deleteAccount']>(async () => {
    if (!sessionId) return { ok: true };
    const id = sessionId;
    signOut();
    persistUsers(users.filter((u) => u.id !== id));
    await removeUserData(id);
    return { ok: true };
  }, [sessionId, users, signOut, persistUsers]);

  const user = useMemo<AuthUser | null>(() => {
    const s = users.find((u) => u.id === sessionId);
    if (!s) return null;
    const { passwordHash: _h, salt: _s, ...safe } = s;
    return safe;
  }, [users, sessionId]);

  // The signed-in user's language wins, and is remembered for the sign-in screens.
  const userLanguage = user?.language;
  useEffect(() => {
    if (!userLanguage) return;
    setLanguage(userLanguage);
    saveJSON(LANGUAGE_KEY, userLanguage);
  }, [userLanguage]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      cloud: false,
      signUp,
      signIn,
      signOut,
      updateProfile,
      deleteAccount,
      verifyCode: async () => notCloud,
      resendCode: async () => notCloud,
      requestPasswordReset: async () => notCloud,
      resetPassword: async () => notCloud,
      syncNow: async () => true,
      legacyAccounts: [],
      migrationPending: false,
      importLegacy: async () => notCloud,
      skipImport: () => {},
    }),
    [user, isReady, signUp, signIn, signOut, updateProfile, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
