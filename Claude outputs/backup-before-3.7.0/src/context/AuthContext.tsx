/**
 * Entry point for sign-in. Everything else in the app keeps importing `useAuth` from here.
 * Which provider runs is decided once, by whether Supabase is configured in `.env`.
 */
import type { ReactNode } from 'react';

import { CLOUD_ENABLED } from '@/services/supabase';

import { CloudAuthProvider } from './CloudAuthProvider';
import { LocalAuthProvider } from './LocalAuthProvider';

export { useAuth } from './auth-shared';
export type { AuthContextValue, AuthUser, Goal, Language, LegacyAccount, ProfilePatch, Result, SignUpInput } from './auth-shared';

export function AuthProvider({ children }: { children: ReactNode }) {
  return CLOUD_ENABLED ? <CloudAuthProvider>{children}</CloudAuthProvider> : <LocalAuthProvider>{children}</LocalAuthProvider>;
}
