import { statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const isFile = (c) => { try { return statSync(c).isFile(); } catch { return false; } };
// Maps '@/x' to src/x(.ts/.tsx) and adds missing extensions, so the app's pure utils load in plain Node.
const SRC = fileURLToPath(new URL('../../src', import.meta.url));
export async function resolve(spec, ctx, next) {
  let p = null;
  if (spec.startsWith('@/')) p = SRC + '/' + spec.slice(2);
  else if (spec.startsWith('.') && ctx.parentURL?.startsWith('file:')) p = fileURLToPath(new URL(spec, ctx.parentURL));
  if (p) for (const c of [p, p + '.ts', p + '.tsx', p + '/index.ts']) if (isFile(c)) return next(pathToFileURL(c).href, ctx);
  return next(spec, ctx);
}
