/**
 * Companies WaKira recognises by name: PayLater and loan providers, banks and e-wallets.
 * Used to group debts by provider and to show each company's logo (or its letter when no logo was added).
 *
 * - `aliases`: other ways people type the name. Matching ignores case, spaces and symbols.
 * - `short`: the letter(s) shown when there is no logo file yet.
 * - `color`: background behind the letter. Approximate brand colours; adjust freely.
 * - Logos: see src/constants/brand-logos.ts and assets/brands/README.txt.
 */

export type BrandKind = 'paylater' | 'loan' | 'bank' | 'ewallet';

/**
 * Late payment charge, a TEMPLATE to check with each provider before relying on it.
 * - `flat`: a fixed charge per late bill.
 * - `capAtDue`: the charge is never more than the overdue amount ("RM10 or the bill, whichever is lower").
 * - `graceDays`: days after the due date before the charge applies (0 when not stated).
 */
export type LateFeeRule = {
  flat: number;
  capAtDue?: boolean;
  graceDays: number;
  /** Where the figure came from and when it was read, so it can be checked again. */
  source: string;
  checked: string;
};

export type Brand = {
  id: string;
  name: string;
  kind: BrandKind;
  short: string;
  color: string;
  aliases: string[];
  lateFee?: LateFeeRule;
};

/* Late fee figures read on 2026-10-25. All need checking with the provider: terms change. */
const STASHAWAY = 'stashaway.my/r/best-buy-now-pay-later-malaysia (31 Jul 2026)'; // i18n-ignore: source note
const LOWYAT_TIKTOK = 'lowyat.net/2024/339373/tiktok-paylater-fee (16 Dec 2024)'; // i18n-ignore: source note

export const BRANDS: Brand[] = [
  // PayLater (buy now, pay later)
  { id: 'spaylater', name: 'SPayLater', kind: 'paylater', short: 'S', color: '#EE4D2D', aliases: ['shopee paylater', 'shopee', 'spay later'], lateFee: { flat: 10, capAtDue: true, graceDays: 0, source: STASHAWAY, checked: '2026-10-25' } }, // i18n-ignore: brand
  { id: 'tiktok-paylater', name: 'TikTok PayLater', kind: 'paylater', short: 'T', color: '#111111', aliases: ['tiktok', 'tiktok pay later', 'tiktokpaylater'], lateFee: { flat: 10, graceDays: 0, source: LOWYAT_TIKTOK, checked: '2026-10-25' } }, // i18n-ignore: brand
  { id: 'atome', name: 'Atome', kind: 'paylater', short: 'A', color: '#C8F31D', aliases: ['atome paylater'], lateFee: { flat: 23, capAtDue: true, graceDays: 0, source: STASHAWAY, checked: '2026-10-25' } }, // i18n-ignore: brand
  { id: 'grab-paylater', name: 'Grab PayLater', kind: 'paylater', short: 'G', color: '#00B14F', aliases: ['grab', 'grab pay later', 'paylater by grab'], lateFee: { flat: 10, graceDays: 0, source: STASHAWAY, checked: '2026-10-25' } }, // i18n-ignore: brand
  { id: 'lazada-paylater', name: 'Lazada PayLater', kind: 'paylater', short: 'L', color: '#0F146D', aliases: ['lazada', 'laz paylater'] }, // i18n-ignore: brand
  { id: 'boost-payflex', name: 'Boost PayFlex', kind: 'paylater', short: 'B', color: '#EE2E24', aliases: ['payflex', 'boost paylater'] }, // i18n-ignore: brand
  { id: 'ryt-paylater', name: 'Ryt PayLater', kind: 'paylater', short: 'R', color: '#5B2BE0', aliases: ['ryt', 'ryt bank paylater'] }, // i18n-ignore: brand
  { id: 'rhb-paylater', name: 'RHB PayLater', kind: 'paylater', short: 'R', color: '#0067B1', aliases: ['rhb pay later'] }, // i18n-ignore: brand
  // Loans and financing
  { id: 'sloan', name: 'SLoan', kind: 'loan', short: 'SL', color: '#EE4D2D', aliases: ['shopee loan', 's loan'] }, // i18n-ignore: brand
  { id: 'tiktok-financing', name: 'TikTok Financing', kind: 'loan', short: 'TF', color: '#111111', aliases: ['tiktok loan'] }, // i18n-ignore: brand
  { id: 'aeon-credit', name: 'AEON Credit', kind: 'loan', short: 'AE', color: '#B60081', aliases: ['aeon', 'aeon credit service'] }, // i18n-ignore: brand
  // Banks
  { id: 'maybank', name: 'Maybank', kind: 'bank', short: 'M', color: '#FFC72C', aliases: ['malayan banking', 'mae', 'maybank2u'] }, // i18n-ignore: brand
  { id: 'cimb', name: 'CIMB', kind: 'bank', short: 'C', color: '#EC1D23', aliases: ['cimb bank', 'cimb clicks', 'octo'] }, // i18n-ignore: brand
  { id: 'public-bank', name: 'Public Bank', kind: 'bank', short: 'PB', color: '#E31837', aliases: ['pbb', 'pbe', 'public bank berhad'] }, // i18n-ignore: brand
  { id: 'rhb', name: 'RHB', kind: 'bank', short: 'R', color: '#0067B1', aliases: ['rhb bank'] }, // i18n-ignore: brand
  { id: 'hong-leong', name: 'Hong Leong Bank', kind: 'bank', short: 'HL', color: '#003F87', aliases: ['hlb', 'hong leong'] }, // i18n-ignore: brand
  { id: 'ambank', name: 'AmBank', kind: 'bank', short: 'Am', color: '#ED1C24', aliases: ['am bank', 'amonline'] }, // i18n-ignore: brand
  { id: 'bank-islam', name: 'Bank Islam', kind: 'bank', short: 'BI', color: '#B5005B', aliases: ['bimb', 'go by bank islam'] }, // i18n-ignore: brand
  { id: 'bank-rakyat', name: 'Bank Rakyat', kind: 'bank', short: 'BR', color: '#0B3D91', aliases: ['rakyat'] }, // i18n-ignore: brand
  { id: 'bsn', name: 'BSN', kind: 'bank', short: 'BSN', color: '#00529C', aliases: ['bank simpanan nasional'] }, // i18n-ignore: brand
  { id: 'affin', name: 'Affin Bank', kind: 'bank', short: 'Af', color: '#004B93', aliases: ['affin', 'affinalways'] }, // i18n-ignore: brand
  { id: 'alliance', name: 'Alliance Bank', kind: 'bank', short: 'Al', color: '#00599C', aliases: ['alliance'] }, // i18n-ignore: brand
  { id: 'bank-muamalat', name: 'Bank Muamalat', kind: 'bank', short: 'Mu', color: '#5C2D91', aliases: ['muamalat'] }, // i18n-ignore: brand
  { id: 'mbsb', name: 'MBSB Bank', kind: 'bank', short: 'MB', color: '#00A19A', aliases: ['mbsb'] }, // i18n-ignore: brand
  { id: 'agrobank', name: 'Agrobank', kind: 'bank', short: 'Ag', color: '#00843D', aliases: ['agro bank', 'bank pertanian'] }, // i18n-ignore: brand
  { id: 'ocbc', name: 'OCBC', kind: 'bank', short: 'O', color: '#E3000F', aliases: ['ocbc bank'] }, // i18n-ignore: brand
  { id: 'hsbc', name: 'HSBC', kind: 'bank', short: 'H', color: '#DB0011', aliases: ['hsbc bank'] }, // i18n-ignore: brand
  { id: 'uob', name: 'UOB', kind: 'bank', short: 'U', color: '#005EB8', aliases: ['uob bank'] }, // i18n-ignore: brand
  { id: 'standard-chartered', name: 'Standard Chartered', kind: 'bank', short: 'SC', color: '#0072AA', aliases: ['stanchart', 'scb'] }, // i18n-ignore: brand
  { id: 'gxbank', name: 'GXBank', kind: 'bank', short: 'GX', color: '#6A2DBE', aliases: ['gx bank', 'gx'] }, // i18n-ignore: brand
  { id: 'aeon-bank', name: 'AEON Bank', kind: 'bank', short: 'AE', color: '#B60081', aliases: [] }, // i18n-ignore: brand
  { id: 'boost-bank', name: 'Boost Bank', kind: 'bank', short: 'B', color: '#EE2E24', aliases: [] }, // i18n-ignore: brand
  { id: 'ryt-bank', name: 'Ryt Bank', kind: 'bank', short: 'R', color: '#5B2BE0', aliases: [] }, // i18n-ignore: brand
  // E-wallets
  { id: 'tng', name: "Touch 'n Go eWallet", kind: 'ewallet', short: 'TnG', color: '#005ABB', aliases: ['tng', 'touch n go', 'touchngo', 'tng ewallet'] }, // i18n-ignore: brand
  { id: 'grabpay', name: 'GrabPay', kind: 'ewallet', short: 'G', color: '#00B14F', aliases: ['grab pay'] }, // i18n-ignore: brand
  { id: 'boost', name: 'Boost', kind: 'ewallet', short: 'B', color: '#EE2E24', aliases: ['boost ewallet'] }, // i18n-ignore: brand
  { id: 'shopeepay', name: 'ShopeePay', kind: 'ewallet', short: 'SP', color: '#EE4D2D', aliases: ['shopee pay'] }, // i18n-ignore: brand
  { id: 'bigpay', name: 'BigPay', kind: 'ewallet', short: 'BP', color: '#1E2B4F', aliases: ['big pay'] }, // i18n-ignore: brand
  { id: 'setel', name: 'Setel', kind: 'ewallet', short: 'St', color: '#00A9E0', aliases: [] }, // i18n-ignore: brand
  { id: 'mae', name: 'MAE', kind: 'ewallet', short: 'MAE', color: '#FFC72C', aliases: ['mae by maybank'] }, // i18n-ignore: brand
];

/** Lowercase letters and digits only, so "SPay Later", "spaylater" and "S-PayLater" all match. */
export const brandKey = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const INDEX = new Map<string, Brand>();
for (const b of BRANDS) {
  for (const n of [b.name, b.id, ...b.aliases]) {
    const k = brandKey(n);
    if (k && !INDEX.has(k)) INDEX.set(k, b);
  }
}

/** The company a typed name refers to, if WaKira knows it. */
export function findBrand(text: string | undefined | null): Brand | undefined {
  if (!text) return undefined;
  return INDEX.get(brandKey(text));
}

/** Provider names offered as quick picks in the debt form. */
export const providerChoices = (kind: 'installment' | 'loan' | 'credit') =>
  BRANDS.filter((b) => (kind === 'loan' ? b.kind === 'loan' : b.kind === 'paylater')).map((b) => b.name);

/** Colours for names WaKira does not know, picked from the name so the same name always gets the same colour. */
const FALLBACK_COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#0D9488', '#4F46E5', '#B45309', '#475569'];

/** What to draw for a name: the known brand's letter and colour, or the first letters of the name. */
export function brandBadge(text: string | undefined | null): { short: string; color: string; brand?: Brand } {
  const brand = findBrand(text);
  if (brand) return { short: brand.short, color: brand.color, brand };
  const clean = (text ?? '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const short = (words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0, 1)).toUpperCase() || '?';
  let h = 0;
  for (const ch of brandKey(clean)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { short, color: FALLBACK_COLORS[h % FALLBACK_COLORS.length] };
}
