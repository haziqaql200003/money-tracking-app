/**
 * FASA A: AUTH SIMULASI (setempat sahaja).
 * - Akaun disimpan dalam AsyncStorage peranti ini. Bukan selamat untuk produksi.
 * - Kata laluan di-hash (SHA-256 + salt) supaya tidak disimpan sebagai teks biasa,
 *   tetapi ini TIDAK setara dengan auth sebenar. Fasa B: ganti dengan Supabase/Firebase Auth.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { CARD_COLORS } from '@/constants/card-styles';
import { removeUserData } from '@/services/storage';

const USERS_KEY = 'auth:users';
const SESSION_KEY = 'auth:session';

export type Goal = 'save' | 'debt' | 'budget' | 'track';
export type Language = 'ms' | 'en';

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  avatarColor: string;
  language: Language;
  goal?: Goal;
  hasOnboarded: boolean;
  consentAt: string; // bila pengguna bersetuju dengan Notis Privasi
  createdAt: string;
};

export type AuthUser = Omit<StoredUser, 'passwordHash' | 'salt'>;
export type ProfilePatch = Partial<Pick<AuthUser, 'displayName' | 'avatarColor' | 'language' | 'goal' | 'hasOnboarded'>>;
type Result = { ok: true } | { ok: false; error: string };

type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  language: Language;
  consent: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  signUp: (input: SignUpInput) => Promise<Result>;
  signIn: (email: string, password: string) => Promise<Result>;
  signOut: () => void;
  updateProfile: (patch: ProfilePatch) => void;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normEmail = (e: string) => e.trim().toLowerCase();
const hash = (salt: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
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
    async ({ email, password, displayName, language, consent }) => {
      const e = normEmail(email);
      if (!EMAIL_RE.test(e)) return { ok: false, error: 'Format email tidak sah.' };
      if (displayName.trim().length < 2) return { ok: false, error: 'Sila masukkan nama paparan.' };
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
        return { ok: false, error: 'Kata laluan mesti sekurang-kurangnya 8 aksara, ada huruf dan nombor.' };
      if (!consent) return { ok: false, error: 'Sila setuju dengan Notis Privasi untuk teruskan.' };
      if (users.some((u) => u.email === e)) return { ok: false, error: 'Email ini sudah didaftarkan.' };

      const salt = Crypto.randomUUID();
      const stored: StoredUser = {
        id: Crypto.randomUUID(),
        email: e,
        salt,
        passwordHash: await hash(salt, password),
        displayName: displayName.trim(),
        avatarColor: CARD_COLORS[0],
        language,
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
      const bad = { ok: false, error: 'Email atau kata laluan tidak betul.' } as const;
      if (!found) return bad;
      if ((await hash(found.salt, password)) !== found.passwordHash) return bad;
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

  const deleteAccount = useCallback(async () => {
    if (!sessionId) return;
    const id = sessionId;
    signOut();
    persistUsers(users.filter((u) => u.id !== id));
    await removeUserData(id);
  }, [sessionId, users, signOut, persistUsers]);

  const user = useMemo<AuthUser | null>(() => {
    const s = users.find((u) => u.id === sessionId);
    if (!s) return null;
    const { passwordHash: _h, salt: _s, ...safe } = s;
    return safe;
  }, [users, sessionId]);

  const value = useMemo(
    () => ({ user, isReady, signUp, signIn, signOut, updateProfile, deleteAccount }),
    [user, isReady, signUp, signIn, signOut, updateProfile, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
