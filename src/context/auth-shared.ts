/**
 * Shared by both sign-in modes (see AuthContext.tsx):
 *  - LocalAuthProvider: accounts live on this phone only (used when Supabase is not configured)
 *  - CloudAuthProvider: real accounts + synced data in Supabase
 */
import { createContext, useContext } from 'react';

import { t } from '@/i18n';

export type Goal = 'save' | 'debt' | 'budget' | 'track';
export type Language = 'ms' | 'en';

/** Account record of the old, phone-only sign-in (also what gets imported into a cloud account). */
export type StoredUser = {
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

/** `needsCode`: the server e-mailed a 6-digit code that must be entered before the account is active. */
export type Result = { ok: true; needsCode?: boolean } | { ok: false; error: string };

export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  language: Language;
  consent: boolean;
};

export type LegacyAccount = { id: string; email: string; displayName: string };

export type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  /** true when accounts and data live in Supabase */
  cloud: boolean;
  signUp: (input: SignUpInput) => Promise<Result>;
  signIn: (email: string, password: string) => Promise<Result>;
  signOut: () => void;
  updateProfile: (patch: ProfilePatch) => void;
  deleteAccount: () => Promise<Result>;

  // cloud only (the local provider answers with an error)
  verifyCode: (email: string, code: string) => Promise<Result>;
  resendCode: (email: string) => Promise<Result>;
  requestPasswordReset: (email: string) => Promise<Result>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<Result>;
  syncNow: () => Promise<boolean>;

  // moving an old phone-only account into the cloud account
  legacyAccounts: LegacyAccount[];
  migrationPending: boolean;
  importLegacy: (localId: string, password: string) => Promise<Result>;
  skipImport: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normEmail = (e: string) => e.trim().toLowerCase();
export const passwordOk = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

/** Checks every sign-up field. Returns the error text, or null when all is fine. */
export function validateSignUp({ email, password, displayName, consent }: SignUpInput): string | null {
  if (!EMAIL_RE.test(normEmail(email))) return t('auth.error.emailInvalid');
  if (displayName.trim().length < 2) return t('auth.error.nameRequired');
  if (!passwordOk(password)) return t('auth.error.passwordWeak');
  if (!consent) return t('auth.error.consentRequired');
  return null;
}

export const notCloud: Result = { ok: false, error: 'Cloud is not set up.' }; // i18n-ignore (developer-only case)
