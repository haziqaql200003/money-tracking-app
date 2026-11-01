// Runs the brain's test conversations (scripts/brain-eval/cases.ts) with fake records.
//   node scripts/brain-eval.mjs          summary
//   node scripts/brain-eval.mjs --show   also print every answer
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'brain-eval-')), 'run.mjs');
execFileSync('npx', ['esbuild', 'scripts/brain-eval/run.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${out}`, '--log-level=error', '--alias:@=./src', '--external:react-native', '--define:__DEV__=false'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
try {
  execFileSync('node', [out, ...process.argv.slice(2)], { stdio: 'inherit' });
} catch {
  process.exit(1); // the failures are already printed above
}
