// Checks that the TypeScript copy of the brain gives the same answers as the Python training code.
//   node scripts/brain-check.mjs
// Run it after retraining (python ml/train.py) or after changing src/services/ai/brain/featurize.ts.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = 'src/services/ai/brain';
const tmp = mkdtempSync(join(tmpdir(), 'brain-'));
const entry = join(tmp, 'entry.ts');
writeFileSync(entry, `export { featurize } from '${process.cwd().replace(/\\/g, '/')}/${dir}/featurize';\nexport { classifyIntent } from '${process.cwd().replace(/\\/g, '/')}/${dir}/intent';\n`);
const out = join(tmp, 'out.mjs');
execFileSync('npx', ['esbuild', entry, '--bundle', '--platform=node', '--format=esm', `--outfile=${out}`, '--log-level=error', '--alias:@=./src'], { stdio: 'inherit', shell: process.platform === 'win32' });
const { featurize, classifyIntent } = await import(pathToFileURL(out).href);

let bad = 0;
for (const row of JSON.parse(readFileSync(`${dir}/parity.json`, 'utf8'))) {
  const got = featurize(row.text);
  const same = got.length === row.features.length && got.every((f, i) => f === row.features[i]);
  if (!same) {
    bad++;
    console.error(`FEATURES DIFFER for ${JSON.stringify(row.text)}`);
  }
}
for (const row of JSON.parse(readFileSync(`${dir}/parity-intent.json`, 'utf8'))) {
  const g = classifyIntent(row.text);
  // The exported model drops tiny weights, so allow a small difference in confidence.
  if (g.intent !== row.best || Math.abs(g.p - row.p) > 0.05) {
    bad++;
    console.error(`INTENT DIFFERS for ${JSON.stringify(row.text)}: python ${row.best} ${row.p}, typescript ${g.intent} ${g.p.toFixed(3)}`);
  }
}
console.log(bad ? `${bad} difference(s)` : 'OK: TypeScript and Python agree.');
process.exit(bad ? 1 : 0);
