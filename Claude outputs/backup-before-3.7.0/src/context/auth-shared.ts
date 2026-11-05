/**
 * Shared by both sign-in modes (see AuthContext.tsx):
 *  - LocalAuthProvider: accounts live on this phone only (used when Supabase is not configured)
 *  - CloudAuthProvider: real accounts + synced data in Supabase
 */
import { createContext, useContext } from 'react';

import { t } from '@/i18n';
import { checkPassword } from '@/utils/password';

export type Goal = 'save' | 'debt' | 'budget' | 'track';
export type Language = 'ms' | 'en';

/** Account record of the old, phone-only sign-in (also what gets imported into a cloud account). */
export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  /** Full name as typed at sign-up (first + last) or handed over by Google / Apple. displayName is the short name shown in the app. */
  fullName?: string;
  /** Optional sign-in name (3-20 characters, see USERNAME_RE). Unique. */
  username?: string;
  avatarColor: string;
  language: Language;
  goal?: Goal;
  hasOnboarded: boolean;
  consentAt: string; // bila pengguna bersetuju dengan Notis Privasi
  createdAt: string;
};

export type AuthUser = Omit<StoredUser, 'passwordHash' | 'salt'>;
export type SocialProvider = 'google' | 'apple';
/** A sign-in method attached to the account. */
export type LinkedLogin = { provider: SocialProvider | 'email'; email?: string };

export type ProfilePatch = Partial<Pick<AuthUser, 'displayName' | 'avatarColor' | 'language' | 'goal' | 'hasOnboarded'>>;

/** `needsCode`: the server e-mailed a 6-digit code that must be entered before the account is active. */
export type Result = { ok: true; needsCode?: boolean; /** E-mail to confirm, when signing in with a username. */ email?: string } | { ok: false; error: string };

export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  /** First and last name together. */
  fullName?: string;
  /** Optional. */
  username?: string;
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
  /** `identifier` is an e-mail address or a username. */
  signIn: (identifier: string, password: string) => Promise<Result>;
  /** Sets or changes the username (empty = remove). Fails with a readable error when taken or invalid. */
  setUsername: (username: string) => Promise<Result>;
  /** Cloud: asks the server. Local: checks this phone. null = could not check (offline); the server decides at sign-up. */
  usernameAvailable: (username: string) => Promise<boolean | null>;
  signOut: () => void;
  updateProfile: (patch: ProfilePatch) => void;
  deleteAccount: () => Promise<Result>;
  /** True when `password` is this account's password (asked again before something that cannot be undone). */
  verifyPassword: (password: string) => Promise<boolean>;
  /** Checks the current password, then sets a new one. */
  changePassword: (current: string, next: string) => Promise<Result>;
  /** Cloud only: ends the sign-in on every other device and keeps this one. */
  signOutOthers: () => Promise<Result>;
  /** Cloud only. An empty `error` means the person closed the sheet, so nothing should be shown. */
  signInWithProvider: (provider: SocialProvider) => Promise<Result>;
  /** Adds Google / Apple to the account that is signed in now. */
  linkProvider: (provider: SocialProvider) => Promise<Result>;
  unlinkProvider: (provider: SocialProvider) => Promise<Result>;
  /** Every way this account can sign in. */
  getLogins: () => Promise<LinkedLogin[]>;
  /** False for an account that only ever signed in with Google / Apple. */
  hasPassword: () => Promise<boolean>;
  /** Records the Privacy Notice consent for an account that started with Google / Apple. */
  acceptConsent: () => Promise<Result>;

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
/** 3-20 characters: lower-case letters, digits, dot, underscore; starts with a letter. */
export const USERNAME_RE = /^[a-z][a-z0-9_.]{2,19}$/;
export const normUsername = (u: string) => u.trim().toLowerCase().replace(/^@/, '');
const RESERVED = ['admin', 'administrator', 'superadmin', 'staff', 'support', 'help', 'wakira', 'owner', 'root', 'system', 'moderator', 'developer', 'dev', 'team', 'official', 'null', 'undefined'];
export const usernameReserved = (u: string) => RESERVED.includes(u);
/** Returns an error text, or null when the username is acceptable. */
export function validateUsername(raw: string): string | null {
  const u = normUsername(raw);
  if (!USERNAME_RE.test(u)) return t('auth.error.usernameInvalid');
  if (usernameReserved(u)) return t('auth.error.usernameReserved');
  return null;
}
/** 8+ characters with a letter and a number, and not easy to guess (see utils/password). */
export const passwordOk = (p: string, personal: string[] = []) => checkPassword(p, personal).ok;

/** Checks every sign-up field. Returns the error text, or null when all is fine. */
export function validateSignUp({ email, password, displayName, fullName, consent, username }: SignUpInput): string | null {
  if (!EMAIL_RE.test(normEmail(email))) return t('auth.error.emailInvalid');
  if (username?.trim()) {
    const bad = validateUsername(username);
    if (bad) return bad;
  }
  if (displayName.trim().length < 2) return t('auth.error.nameRequired');
  if (!passwordOk(password, [displayName, fullName ?? '', email])) return t('auth.error.passwordWeak');
  if (!consent) return t('auth.error.consentRequired');
  return null;
}

export const notCloud: Result = { ok: false, error: 'Cloud is not set up.' }; // i18n-ignore (developer-only case)
