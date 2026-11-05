/**
 * Malaysian public holidays by state, and which states have a Friday-Saturday weekend.
 * Used only to move a payday to the working day before it, so the exact name of a holiday does not matter.
 *
 * Coverage: 2026 and 2027. Outside those years only weekends are skipped.
 * Islamic holidays (Hari Raya, Hari Raya Haji, Awal Muharram, Maulidur Rasul, Awal Ramadan, Isra Mi'raj, Nuzul Quran)
 * follow the moon, so these are the announced or expected dates and can move by a day.
 * Replacement days are listed as separate dates. When a new year is gazetted, add a block and ship an update.
 *
 * Sources compared in October 2026: calendar-malaysia.com (2026 and 2027, with states), quickhr.co and
 * expatliving.net (2026 by state), hono.ai and yomly.com (2026 federal), ecentral.my (2027 federal), Wikipedia
 * (weekends and replacement rules). Where they disagreed the entry follows calendar-malaysia.com; the known
 * disagreements are Hari Hol Pahang (12, 20 or 22 May 2026) and the Sultan of Pahang's birthday (30 or 31 Jul 2026).
 */

export type MyStateCode = 'JHR' | 'KDH' | 'KTN' | 'MLK' | 'NSN' | 'PHG' | 'PRK' | 'PLS' | 'PNG' | 'SBH' | 'SWK' | 'SGR' | 'TRG' | 'KUL' | 'LBN' | 'PJY';

export const MY_STATES: { code: MyStateCode; name: string; friSat: boolean }[] = [
  { code: 'JHR', name: 'Johor', friSat: false }, // i18n-ignore: place name
  { code: 'KDH', name: 'Kedah', friSat: true }, // i18n-ignore: place name
  { code: 'KTN', name: 'Kelantan', friSat: true }, // i18n-ignore: place name
  { code: 'MLK', name: 'Melaka', friSat: false }, // i18n-ignore: place name
  { code: 'NSN', name: 'Negeri Sembilan', friSat: false }, // i18n-ignore: place name
  { code: 'PHG', name: 'Pahang', friSat: false }, // i18n-ignore: place name
  { code: 'PRK', name: 'Perak', friSat: false }, // i18n-ignore: place name
  { code: 'PLS', name: 'Perlis', friSat: false }, // i18n-ignore: place name
  { code: 'PNG', name: 'Pulau Pinang', friSat: false }, // i18n-ignore: place name
  { code: 'SBH', name: 'Sabah', friSat: false }, // i18n-ignore: place name
  { code: 'SWK', name: 'Sarawak', friSat: false }, // i18n-ignore: place name
  { code: 'SGR', name: 'Selangor', friSat: false }, // i18n-ignore: place name
  { code: 'TRG', name: 'Terengganu', friSat: true }, // i18n-ignore: place name
  { code: 'KUL', name: 'Kuala Lumpur', friSat: false }, // i18n-ignore: place name
  { code: 'LBN', name: 'Labuan', friSat: false }, // i18n-ignore: place name
  { code: 'PJY', name: 'Putrajaya', friSat: false }, // i18n-ignore: place name
];

const FT: MyStateCode[] = ['KUL', 'LBN', 'PJY'];

type Entry = { d: string; /** Observed only in these states. Omitted = every state. */ in?: MyStateCode[]; /** Every state except these. */ not?: MyStateCode[] };

const NEW_YEAR_NOT: MyStateCode[] = ['JHR', 'KDH', 'KTN', 'PLS', 'TRG'];
const NUZUL_IN: MyStateCode[] = ['KTN', 'PHG', 'PRK', 'PLS', 'PNG', 'SGR', 'TRG', ...FT];
const THAIPUSAM: MyStateCode[] = ['JHR', 'KDH', 'NSN', 'PRK', 'PNG', 'SGR', 'KUL', 'PJY'];
const ISRA: MyStateCode[] = ['KDH', 'NSN', 'PLS', 'TRG'];

export const MY_HOLIDAYS: Entry[] = [
  // ---- 2026, every state ----
  { d: '2026-01-01', not: NEW_YEAR_NOT },
  { d: '2026-02-17' },
  { d: '2026-02-18' },
  { d: '2026-03-20' },
  { d: '2026-03-21' },
  { d: '2026-03-22' },
  { d: '2026-03-23' },
  { d: '2026-05-01' },
  { d: '2026-05-27' },
  { d: '2026-05-31' },
  { d: '2026-06-01' },
  { d: '2026-06-02' },
  { d: '2026-06-17' },
  { d: '2026-08-25' },
  { d: '2026-08-31' },
  { d: '2026-09-16' },
  { d: '2026-11-08', not: ['SWK'] },
  { d: '2026-11-09', not: ['KDH', 'KTN', 'SWK', 'TRG'] },
  { d: '2026-12-25' },
  // ---- 2026, by state ----
  { d: '2026-01-14', in: ['NSN'] },
  { d: '2026-01-17', in: ISRA },
  { d: '2026-02-01', in: THAIPUSAM },
  { d: '2026-02-01', in: FT },
  { d: '2026-02-02', in: ['JHR', 'NSN', 'PRK', 'PNG', 'SGR', 'KUL', 'PJY', 'LBN'] },
  { d: '2026-02-03', in: ['KUL', 'PJY'] },
  { d: '2026-02-19', in: ['JHR', 'KDH'] },
  { d: '2026-02-20', in: ['MLK'] },
  { d: '2026-03-04', in: ['TRG'] },
  { d: '2026-03-07', in: NUZUL_IN },
  { d: '2026-03-30', in: ['SBH'] },
  { d: '2026-04-03', in: ['SBH', 'SWK'] },
  { d: '2026-04-26', in: ['TRG'] },
  { d: '2026-05-03', in: ['KDH', 'KTN', 'TRG'] },
  { d: '2026-05-12', in: ['PHG'] },
  { d: '2026-05-17', in: ['PLS'] },
  { d: '2026-05-18', in: ['PLS'] },
  { d: '2026-05-26', in: ['KTN', 'TRG'] },
  { d: '2026-05-28', in: ['KDH', 'KTN', 'PLS', 'TRG'] },
  { d: '2026-05-30', in: ['LBN', 'SBH'] },
  { d: '2026-05-31', in: ['LBN', 'SBH'] },
  { d: '2026-06-01', in: ['SWK'] },
  { d: '2026-06-02', in: ['SWK'] },
  { d: '2026-06-21', in: ['KDH'] },
  { d: '2026-07-07', in: ['PNG'] },
  { d: '2026-07-11', in: ['PNG'] },
  { d: '2026-07-21', in: ['JHR'] },
  { d: '2026-07-22', in: ['SWK'] },
  { d: '2026-07-30', in: ['PHG'] },
  { d: '2026-08-24', in: ['MLK'] },
  { d: '2026-09-29', in: ['KTN'] },
  { d: '2026-09-30', in: ['KTN'] },
  { d: '2026-10-10', in: ['SWK'] },
  { d: '2026-11-06', in: ['PRK'] },
  { d: '2026-12-11', in: ['SGR'] },
  { d: '2026-12-24', in: ['SBH'] },
  // ---- 2027, every state ----
  { d: '2027-01-01', not: NEW_YEAR_NOT },
  { d: '2027-02-06' },
  { d: '2027-02-07' },
  { d: '2027-03-10' },
  { d: '2027-03-11' },
  { d: '2027-05-01' },
  { d: '2027-05-17' },
  { d: '2027-05-20' },
  { d: '2027-06-06' },
  { d: '2027-06-07' },
  { d: '2027-08-15' },
  { d: '2027-08-31' },
  { d: '2027-09-16' },
  { d: '2027-10-28', not: ['SWK'] },
  { d: '2027-12-25' },
  // ---- 2027, by state ----
  { d: '2027-01-06', in: ISRA },
  { d: '2027-01-14', in: ['NSN'] },
  { d: '2027-01-22', in: THAIPUSAM },
  { d: '2027-02-01', in: FT },
  { d: '2027-02-08', in: ['JHR', 'KDH'] },
  { d: '2027-02-20', in: ['MLK'] },
  { d: '2027-02-24', in: NUZUL_IN },
  { d: '2027-03-04', in: ['TRG'] },
  { d: '2027-03-23', in: ['JHR'] },
  { d: '2027-03-26', in: ['SBH', 'SWK'] },
  { d: '2027-03-30', in: ['SBH'] },
  { d: '2027-04-26', in: ['TRG'] },
  { d: '2027-05-02', in: ['PHG'] },
  { d: '2027-05-16', in: ['KTN', 'TRG'] },
  { d: '2027-05-17', in: ['PLS'] },
  { d: '2027-05-18', in: ['KDH', 'KTN', 'PLS', 'TRG'] },
  { d: '2027-05-30', in: ['LBN', 'SBH'] },
  { d: '2027-05-31', in: ['LBN', 'SBH'] },
  { d: '2027-06-01', in: ['SWK'] },
  { d: '2027-06-02', in: ['SWK'] },
  { d: '2027-06-20', in: ['KDH'] },
  { d: '2027-07-07', in: ['PNG'] },
  { d: '2027-07-10', in: ['PNG', 'JHR'] },
  { d: '2027-07-22', in: ['SWK'] },
  { d: '2027-07-30', in: ['PHG'] },
  { d: '2027-08-24', in: ['MLK'] },
  { d: '2027-09-29', in: ['KTN'] },
  { d: '2027-09-30', in: ['KTN'] },
  { d: '2027-10-09', in: ['SWK'] },
  { d: '2027-11-05', in: ['PRK'] },
  { d: '2027-12-11', in: ['SGR'] },
  { d: '2027-12-24', in: ['SBH'] },
  { d: '2027-12-26', in: ISRA },
];

export const HOLIDAY_YEARS = [2026, 2027] as const;

export type Region = { country: 'MY' | 'OTHER'; state: MyStateCode | null };

/** Dates that are public holidays for this region. Other countries have no list yet. */
export function holidaysFor(region: Region): Set<string> {
  const out = new Set<string>();
  if (region.country !== 'MY') return out;
  for (const e of MY_HOLIDAYS) {
    const state = region.state;
    const ok = e.in ? (state ? e.in.includes(state) : false) : e.not ? (state ? !e.not.includes(state) : true) : true;
    if (ok) out.add(e.d);
  }
  return out;
}

/** True when the weekend is Friday and Saturday. */
export const isFriSatState = (region: Region) => region.country === 'MY' && !!region.state && MY_STATES.some((s) => s.code === region.state && s.friSat);
