/**
 * Reads a spreadsheet file into plain rows of text. No UI and no React Native, so it can be tested in Node.
 * CSV/TSV: any of , ; tab | as the separator. Excel: .xlsx only (open an old .xls once in Excel and Save As .xlsx).
 */
import { unzipSync, strFromU8 } from 'fflate';

export type Table = { name: string; rows: string[][] };

export const MAX_ROWS = 20000;

/* ---------------- CSV ---------------- */

function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
  let best = ',';
  let bestCount = -1;
  for (const d of [',', ';', '\t', '|']) {
    let count = 0;
    let quoted = false;
    for (const ch of firstLines) {
      if (ch === '"') quoted = !quoted;
      else if (ch === d && !quoted) count++;
    }
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delim = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
      if (rows.length > MAX_ROWS) break;
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

/* ---------------- XLSX ---------------- */

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

const attr = (tag: string, name: string): string | undefined => {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag);
  return m ? decodeXml(m[1]) : undefined;
};

/** All text pieces inside an <si> / <is> block, joined (rich text is split over several <t>). */
const textOf = (xml: string) => {
  let out = '';
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out += decodeXml(m[1]);
  return out;
};

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/** Excel stores dates as day counts from 1899-12-30. */
export function serialToIso(serial: number): string {
  const ms = Math.floor(serial) * 86400000 + Date.UTC(1899, 11, 30);
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const looksLikeDateFormat = (code: string) => {
  const c = code.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, '').toLowerCase();
  return /[dmy]/.test(c) && !/[#0?]/.test(c.replace(/[dmyhs:./\\\- ,am/p]/g, ''));
};

function readStyles(xml: string | undefined): Set<number> {
  const dateStyles = new Set<number>();
  if (!xml) return dateStyles;
  const customDate = new Set<number>();
  const fmtRe = /<numFmt\s[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = fmtRe.exec(xml))) {
    const id = Number(attr(m[0], 'numFmtId'));
    const code = attr(m[0], 'formatCode') ?? '';
    if (looksLikeDateFormat(code)) customDate.add(id);
  }
  const xfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
  if (xfs) {
    const xfRe = /<xf\s[^>]*?(?:\/>|>)/g;
    let i = 0;
    while ((m = xfRe.exec(xfs[1]))) {
      const id = Number(attr(m[0], 'numFmtId') ?? 0);
      if (BUILTIN_DATE_FORMATS.has(id) || customDate.has(id)) dateStyles.add(i);
      i++;
    }
  }
  return dateStyles;
}

export function parseXlsx(bytes: Uint8Array): Table[] {
  const files = unzipSync(bytes, {
    filter: (f) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+\.xml)$/.test(f.name),
  });
  const read = (path: string) => (files[path] ? strFromU8(files[path]) : undefined);
  const workbook = read('xl/workbook.xml');
  if (!workbook) throw new Error('not-xlsx');

  const rels = new Map<string, string>();
  const relRe = /<Relationship\s[^>]*>/g;
  const relsXml = read('xl/_rels/workbook.xml.rels') ?? '';
  let m: RegExpExecArray | null;
  while ((m = relRe.exec(relsXml))) {
    const id = attr(m[0], 'Id');
    const target = attr(m[0], 'Target');
    if (id && target) rels.set(id, target.replace(/^\/?(xl\/)?/, 'xl/'));
  }

  const shared: string[] = [];
  const sstXml = read('xl/sharedStrings.xml');
  if (sstXml) {
    const siRe = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
    while ((m = siRe.exec(sstXml))) shared.push(textOf(m[1]));
  }
  const dateStyles = readStyles(read('xl/styles.xml'));

  const tables: Table[] = [];
  const sheetRe = /<sheet\s[^>]*>/g;
  let order = 0;
  while ((m = sheetRe.exec(workbook))) {
    order++;
    const name = attr(m[0], 'name') ?? `Sheet${order}`;
    const rid = attr(m[0], 'r:id');
    const path = (rid && rels.get(rid)) || `xl/worksheets/sheet${order}.xml`;
    const xml = read(path);
    if (!xml) continue;
    const rows: string[][] = [];
    const rowRe = /<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(xml))) {
      const cells: string[] = [];
      const cellRe = /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rm[1]))) {
        const head = cm[1];
        const body = cm[2] ?? '';
        const ref = attr(head, 'r');
        const type = attr(head, 't');
        const style = Number(attr(head, 's') ?? 0);
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let value = '';
        if (type === 's') value = shared[Number(v)] ?? '';
        else if (type === 'inlineStr') value = textOf(body);
        else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
        else if (v !== undefined) {
          const decoded = decodeXml(v);
          value = type === 'str' || type === 'e' ? decoded : dateStyles.has(style) && Number.isFinite(Number(decoded)) ? serialToIso(Number(decoded)) : decoded;
        }
        const idx = ref ? colIndex(ref) : cells.length;
        while (cells.length < idx) cells.push('');
        cells[idx] = value.trim();
      }
      rows.push(cells);
      if (rows.length > MAX_ROWS) break;
    }
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    const cleaned = rows.map((r) => [...r, ...Array(width - r.length).fill('')]).filter((r) => r.some((c) => c !== ''));
    if (cleaned.length > 0) tables.push({ name, rows: cleaned });
  }
  return tables;
}

/** Zip files start with "PK". Used to tell .xlsx from text no matter what the file is called. */
export const isZip = (b: Uint8Array) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b;

/** UTF-8 first; when the bytes are not valid UTF-8 (older Excel CSVs) read them as Latin-1/Windows-1252. */
export function decodeText(bytes: Uint8Array): string {
  const utf8 = strFromU8(bytes);
  if (!utf8.includes('\uFFFD')) return utf8;
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
}

export function readTables(bytes: Uint8Array, fileName: string): Table[] {
  if (isZip(bytes)) return parseXlsx(bytes);
  if (/\.xls$/i.test(fileName)) throw new Error('old-xls');
  const rows = parseCsv(decodeText(bytes));
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  return rows.length ? [{ name: fileName, rows: rows.map((r) => [...r, ...Array(width - r.length).fill('')]) }] : [];
}
