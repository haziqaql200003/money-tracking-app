#!/usr/bin/env node
/**
 * WaKira i18n audit. Run:  npm run i18n:audit            (everything)
 *                          npm run i18n:audit -- --files "src/app/(auth)"   (only paths containing this text)
 *                          npm run i18n:audit -- --json   (machine readable)
 *
 * 1. HARDCODED  User-facing text written straight into screens instead of t('...').
 *               Add `// i18n-ignore` on (or just above) a line that is deliberately not translated.
 * 2. DICTIONARY Keys must start with their file's prefix, be unique, have identical {placeholders} in EN and MS,
 *               plural pairs (.one/.other) must be complete, no empty values.
 * 3. ROJAK      English words inside Malay text, or Malay words inside English text (heuristic word lists;
 *               brand and proper names are allowed, see ALLOW).
 * Exit code 1 when anything is found, so it can run in CI or a pre-commit hook.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const filesArg = args.includes('--files') ? args[args.indexOf('--files') + 1] : null;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

/* ---------- 1. hardcoded text ---------- */
const UI_PROPS = new Set([
  'title', 'label', 'placeholder', 'subtitle', 'footer', 'header', 'description', 'hint', 'message', 'text',
  'accessibilityLabel', 'accessibilityHint', 'emptyText', 'headerTitle', 'tabBarLabel', 'confirmLabel', 'cancelLabel',
]);
const UI_FIELDS = new Set(['label', 'title', 'subtitle', 'text', 'description', 'hint', 'body', 'message', 'footer', 'name']);
const LETTERS = /[A-Za-z]{2,}/;
const hardcoded = [];

function auditSource(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lines = text.split(/\r?\n/);
  const isConst = /src\/(constants|utils|services|context)\//.test(rel(file));

  const ignored = (node) => {
    const ln = sf.getLineAndCharacterOfPosition(node.getStart()).line;
    return /i18n-ignore/.test(lines[ln] ?? '') || /i18n-ignore/.test(lines[ln - 1] ?? '');
  };
  const report = (node, kind, value) => {
    if (ignored(node)) return;
    const ln = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    hardcoded.push({ file: rel(file), line: ln, kind, text: value.replace(/\s+/g, ' ').trim().slice(0, 80) });
  };
  const isHex = (v) => /^#[0-9A-Fa-f]{3,8}$/.test(v);
  const strOf = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const v = node.text.replace(/\s+/g, ' ').trim();
      if (LETTERS.test(v)) report(node, 'jsx-text', v);
    } else if (ts.isJsxAttribute(node) && node.initializer && UI_PROPS.has(node.name.getText())) {
      const v = strOf(node.initializer) ?? (ts.isJsxExpression(node.initializer) ? strOf(node.initializer.expression) : null);
      if (v && LETTERS.test(v)) report(node, `prop ${node.name.getText()}`, v);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression.getText();
      if (/^Alert\.alert$/.test(callee) || /^Share\.share$/.test(callee)) {
        node.arguments.forEach((a) => {
          const v = strOf(a);
          if (v && LETTERS.test(v)) report(a, callee, v);
        });
        const opts = node.arguments[2];
        if (opts && ts.isArrayLiteralExpression(opts))
          opts.elements.forEach((el) => {
            if (ts.isObjectLiteralExpression(el))
              el.properties.forEach((p) => {
                if (ts.isPropertyAssignment(p) && p.name.getText() === 'text') {
                  const v = strOf(p.initializer);
                  if (v && LETTERS.test(v)) report(p, 'alert button', v);
                }
              });
          });
      }
    } else if (ts.isPropertyAssignment(node) && UI_FIELDS.has(node.name.getText())) {
      const v = strOf(node.initializer);
      // Objects in screens/components/constants that carry wording (e.g. { key, label }). Skip tiny ids.
      if (v && !isHex(v) && LETTERS.test(v) && (v.includes(' ') || /^[A-Z]/.test(v) || isConst || file.endsWith('.tsx'))) report(node, `field ${node.name.getText()}`, v);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/* ---------- 2/3. dictionaries ---------- */
function readDict(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const out = [];
  const visit = (n) => {
    if (ts.isPropertyAssignment(n) && (ts.isStringLiteral(n.name) || ts.isIdentifier(n.name))) {
      const v = n.initializer;
      if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v))
        out.push({ key: n.name.text, value: v.text, line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1 });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const I18N = path.join(SRC, 'i18n');
const NAMESPACES = fs.readdirSync(path.join(I18N, 'en')).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace('.ts', ''));
const problems = [];
const seen = new Map();
const stats = {};

const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

// Words that mean the text is in the other language. Short on purpose: precision over recall.
const MALAY = new Set('yang dan untuk dengan ini itu anda tidak sila akaun belanja pendapatan baki jumlah tarikh simpan batal padam tambah kembali seterusnya semua hari bulan tahun lagi atau kepada dalam daripada telah akan sudah belum boleh mahu perlu kata laluan tetapan'.split(' '));
const ENGLISH = new Set('the and for with this that your you not please account expense income balance amount date save cancel delete add back next all day month year more or to from in on of is are will have has can need want password settings transaction transactions budget goal'.split(' '));
// Proper names and loanwords that are fine in both languages.
const ALLOW = new Set('wakira rm pro csv pdf wifi ok face id touch songket batik diraja titanium glass aurora kira faham rancang email android ios'.split(' '));
const words = (s) => s.toLowerCase().replace(/\{\w+\}/g, ' ').match(/[a-z]+/g) ?? [];

for (const ns of NAMESPACES) {
  const enFile = path.join(I18N, 'en', `${ns}.ts`);
  const msFile = path.join(I18N, 'ms', `${ns}.ts`);
  if (!fs.existsSync(msFile)) {
    problems.push({ type: 'dictionary', file: rel(enFile), line: 1, msg: `missing ms/${ns}.ts` });
    continue;
  }
  const en = readDict(enFile);
  const ms = new Map(readDict(msFile).map((e) => [e.key, e]));
  stats[ns] = en.length;
  for (const e of en) {
    if (!e.key.startsWith(`${ns}.`) && !(ns === 'acct' && /^(cat|sub)\./.test(e.key)))
      problems.push({ type: 'dictionary', file: rel(enFile), line: e.line, msg: `key "${e.key}" should start with "${ns}."` });
    if (seen.has(e.key)) problems.push({ type: 'dictionary', file: rel(enFile), line: e.line, msg: `duplicate key "${e.key}" (also in ${seen.get(e.key)})` });
    seen.set(e.key, ns);
    const m = ms.get(e.key);
    if (!m) { problems.push({ type: 'dictionary', file: rel(msFile), line: 1, msg: `missing ms for "${e.key}"` }); continue; }
    if (!e.value.trim() || !m.value.trim()) problems.push({ type: 'dictionary', file: rel(msFile), line: m.line, msg: `empty text for "${e.key}"` });
    if (ph(e.value) !== ph(m.value)) problems.push({ type: 'dictionary', file: rel(msFile), line: m.line, msg: `placeholders differ for "${e.key}": en {${ph(e.value)}} vs ms {${ph(m.value)}}` });
    if (e.key.endsWith('.one') && !en.some((x) => x.key === e.key.replace(/\.one$/, '.other')))
      problems.push({ type: 'dictionary', file: rel(enFile), line: e.line, msg: `"${e.key}" has no ".other"` });
    // rojak
    const bad = words(m.value).filter((w) => ENGLISH.has(w) && !ALLOW.has(w) && !MALAY.has(w));
    if (bad.length) problems.push({ type: 'rojak', file: rel(msFile), line: m.line, msg: `English word(s) in Malay text "${e.key}": ${[...new Set(bad)].join(', ')}  →  ${m.value.slice(0, 60)}` });
    const bad2 = words(e.value).filter((w) => MALAY.has(w) && !ALLOW.has(w) && !ENGLISH.has(w));
    if (bad2.length) problems.push({ type: 'rojak', file: rel(enFile), line: e.line, msg: `Malay word(s) in English text "${e.key}": ${[...new Set(bad2)].join(', ')}  →  ${e.value.slice(0, 60)}` });
  }
  for (const k of ms.keys()) if (!en.some((e) => e.key === k)) problems.push({ type: 'dictionary', file: rel(msFile), line: ms.get(k).line, msg: `ms has "${k}" but en does not` });
}

const sources = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes(`${path.sep}i18n${path.sep}`) && (!filesArg || rel(f).includes(filesArg)));
sources.forEach(auditSource);

const hardByFile = hardcoded.reduce((m, h) => ((m[h.file] = (m[h.file] ?? 0) + 1), m), {});
const total = hardcoded.length + problems.length;

if (JSON_OUT) {
  console.log(JSON.stringify({ stats, hardcoded, problems, total }, null, 2));
} else {
  console.log(`\nWaKira i18n audit  (${sources.length} source files, ${Object.values(stats).reduce((a, b) => a + b, 0)} keys: ${Object.entries(stats).map(([k, v]) => `${k} ${v}`).join(', ')})\n`);
  if (problems.length) {
    console.log(`DICTIONARY / ROJAK  (${problems.length})`);
    problems.forEach((p) => console.log(`  ${p.type.padEnd(10)} ${p.file}:${p.line}  ${p.msg}`));
    console.log();
  }
  if (hardcoded.length) {
    console.log(`HARDCODED TEXT  (${hardcoded.length} in ${Object.keys(hardByFile).length} files)`);
    for (const [f, n] of Object.entries(hardByFile).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(3)}  ${f}`);
      hardcoded.filter((h) => h.file === f).slice(0, filesArg ? 200 : 3).forEach((h) => console.log(`         :${h.line} [${h.kind}] ${h.text}`));
    }
    console.log();
  }
  console.log(total === 0 ? 'OK: nothing to translate.' : `${total} issue(s).`);
}
process.exit(total === 0 ? 0 : 1);
