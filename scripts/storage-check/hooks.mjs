import { statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Loads the app's real storage code in plain Node: '@/x' maps to src/x, and the three things that only exist on a
// phone (AsyncStorage, react-native, the Supabase client) are replaced by small fakes the tests can control.
const isFile = (c) => { try { return statSync(c).isFile(); } catch { return false; } };
const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const fake = (name) => new URL(`./${name}`, import.meta.url).href;
const FAKES = {
  '@react-native-async-storage/async-storage': fake('fake-async-storage.mjs'),
  'react-native': fake('fake-react-native.mjs'),
  '@/services/supabase': fake('fake-supabase.mjs'),
};
export async function resolve(spec, ctx, next) {
  if (FAKES[spec]) return { url: FAKES[spec], shortCircuit: true };
  let p = null;
  if (spec.startsWith('@/')) p = SRC + '/' + spec.slice(2);
  else if (spec.startsWith('.') && ctx.parentURL?.startsWith('file:')) p = fileURLToPath(new URL(spec, ctx.parentURL));
  if (p) for (const c of [p, p + '.ts', p + '.tsx', p + '/index.ts']) if (isFile(c)) return next(pathToFileURL(c).href, ctx);
  return next(spec, ctx);
}
