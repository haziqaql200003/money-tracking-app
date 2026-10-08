/**
 * Hermes (React Native) has no WebCrypto, so supabase-js falls back to a weaker "plain" PKCE challenge
 * and prints "WebCrypto API is not supported". This adds just the two pieces it looks for, backed by expo-crypto.
 * Import it once, before the Supabase client is created.
 */
import * as Crypto from 'expo-crypto';

type Shim = { getRandomValues?: unknown; subtle?: unknown };
const g = globalThis as unknown as { crypto?: Shim };

if (!g.crypto) g.crypto = {};
const c = g.crypto;

if (typeof c.getRandomValues !== 'function') {
  c.getRandomValues = <T extends ArrayBufferView>(array: T): T => Crypto.getRandomValues(array as never) as unknown as T;
}

if (!c.subtle) {
  c.subtle = {
    digest: (algorithm: string | { name: string }, data: BufferSource) => {
      const name = (typeof algorithm === 'string' ? algorithm : algorithm.name).toUpperCase().replace('-', '');
      const map: Record<string, Crypto.CryptoDigestAlgorithm> = {
        SHA1: Crypto.CryptoDigestAlgorithm.SHA1,
        SHA256: Crypto.CryptoDigestAlgorithm.SHA256,
        SHA384: Crypto.CryptoDigestAlgorithm.SHA384,
        SHA512: Crypto.CryptoDigestAlgorithm.SHA512,
      };
      const algo = map[name];
      if (!algo) return Promise.reject(new Error(`Unsupported digest: ${name}`));
      return Crypto.digest(algo, data);
    },
  };
}
