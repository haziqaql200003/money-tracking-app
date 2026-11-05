/**
 * Supabase client. Cloud mode switches on only when both values exist in `.env`:
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...   (the "anon / publishable" key, safe to ship inside the app)
 * Without them the app runs in the old local-only mode, so nothing breaks before Supabase is set up.
 * NEVER put the service_role key here: it bypasses all security rules.
 */
import 'react-native-url-polyfill/auto';
import './crypto-polyfill';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Accept a pasted API address such as https://xxxx.supabase.co/rest/v1/ and keep only the part Supabase needs.
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const url = (() => {
  if (!rawUrl) return undefined;
  try {
    return new URL(rawUrl).origin;
  } catch {
    return rawUrl;
  }
})();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const CLOUD_ENABLED = !!url && !!anonKey;

/**
 * The web build is pre-rendered in Node (app.json web.output "static"), where there is no window or localStorage.
 * During that render the client gets a storage that remembers nothing and never refreshes the token; in the
 * browser (and on phones) it keeps the session as usual.
 */
const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';
const noStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

export const supabase: SupabaseClient | null = CLOUD_ENABLED
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: isServerRender ? noStorage : AsyncStorage,
        autoRefreshToken: !isServerRender,
        persistSession: !isServerRender,
        detectSessionInUrl: false,
        // Sign in with Google / Apple comes back as a one-time code that only this phone can redeem.
        flowType: 'pkce',
      },
    })
  : null;

// Keep the login token fresh only while the app is in front (Supabase's recommended setup for React Native).
if (supabase && !isServerRender) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
  supabase.auth.startAutoRefresh();
}
