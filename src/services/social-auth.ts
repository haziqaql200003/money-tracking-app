/** Helpers for signing in with Google / Apple. Kept free of React so they can be tested on their own. */
import * as Linking from 'expo-linking';

export type SocialProvider = 'google' | 'apple';

/** Where the browser sends the user back to. Must be listed under Authentication > URL Configuration > Redirect URLs in Supabase. */
export const OAUTH_REDIRECT = Linking.createURL('auth-callback');

/** Reads the `code` (or the error) from the address the browser came back with. Looks at both ?query and #fragment. */
export function parseAuthUrl(url: string): { code?: string; error?: string } {
  const out: Record<string, string> = {};
  const grab = (part: string) => {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const i = pair.indexOf('=');
      const k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
      const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      out[k] = v;
    }
  };
  const hash = url.indexOf('#');
  const head = hash < 0 ? url : url.slice(0, hash);
  const q = head.indexOf('?');
  if (q >= 0) grab(head.slice(q + 1));
  if (hash >= 0) grab(url.slice(hash + 1));
  const error = out.error_description || out.error;
  return { code: out.code, error: error || undefined };
}
