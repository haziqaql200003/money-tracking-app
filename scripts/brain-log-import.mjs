// Turns the [brain] lines from the Metro terminal into training examples you can review.
//
//   1. Use Ask WaKira in a dev build / Expo Go. Every message prints a line like:
//        LOG  [brain] "Show purchases under RM20" answered on phone find 0.97
//   2. Copy those lines into ml/brain-log.txt (any other text in the file is ignored).
//   3. node scripts/brain-log-import.mjs            (or: node scripts/brain-log-import.mjs path/to/log.txt)
//      New messages are added to ml/real_messages.tsv as "?<intent>  <message>" (the intent the brain chose).
//   4. Open ml/real_messages.tsv. For each line starting with "?": fix the intent if the brain was wrong, then delete
//      the "?". Lines still starting with "?" are not used. Intents: expense income transfer where find balance
//      forecast habits budget compare transfers_list help greet thanks other advice explain
//   5. cd ml && python train.py     (retrains with your reviewed messages), then node scripts/brain-check.mjs
//      and node scripts/brain-eval.mjs.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2] ?? 'ml/brain-log.txt';
const out = 'ml/real_messages.tsv';
if (!existsSync(src)) {
  console.error(`No log file at ${src}. Paste the [brain] lines from the Metro terminal into it first.`);
  process.exit(1);
}

const HEADER = '# intent<TAB>message. A line starting with "?" is not reviewed yet and is not used for training. "\\n" = new line.\n';
if (!existsSync(out)) writeFileSync(out, HEADER);
const known = new Set(
  readFileSync(out, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('\t').slice(1).join('\t')),
);

// [brain] "<message as JSON string>" answered on phone <intent> <p>    |    [brain] "<message>" -> server (low) <intent> <p>
const LINE = /\[brain\]\s+("(?:[^"\\]|\\.)*")\s+(?:answered on phone|->\s*server\s*\(\w+\))\s+(\w+)\s+[\d.]+/;
let added = 0;
let skipped = 0;
for (const raw of readFileSync(src, 'utf8').split(/\r?\n/)) {
  const m = raw.match(LINE);
  if (!m) continue;
  let text;
  try {
    text = JSON.parse(m[1]);
  } catch {
    continue;
  }
  const flat = String(text).replace(/\t/g, ' ').replace(/\r?\n/g, '\\n').trim();
  if (!flat || known.has(flat)) {
    skipped++;
    continue;
  }
  known.add(flat);
  appendFileSync(out, `?${m[2]}\t${flat}\n`);
  added++;
}
console.log(`Added ${added} new message(s) to ${out} (${skipped} already there). Review the lines starting with "?" before training.`);
