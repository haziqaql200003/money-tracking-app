import type { Ionicons } from '@expo/vector-icons';

import type { TKey } from '@/i18n';

/**
 * Individual tax reliefs a person can claim with receipts, as listed by LHDN for Year of Assessment 2025.
 * Limits change from year to year: the screen says so and points to LHDN. Reliefs that need no receipt (the
 * RM9,000 for yourself, child reliefs) are shown as a note, not tracked.
 */
export const TAX_YEAR_NOTE = 'YA2025'; // i18n-ignore: official name of the assessment year

type IconName = keyof typeof Ionicons.glyphMap;

export type ReliefGroup = 'medical' | 'eduSelf';

export type ReliefDef = {
  id: string;
  /** Own limit in RM. null = no limit (a rebate such as zakat). */
  cap: number | null;
  /** Reliefs of one group also share a bigger limit (see GROUP_CAPS). */
  group?: ReliefGroup;
  /** A rebate takes off the tax itself, ringgit for ringgit, instead of the income the tax is worked out on. */
  rebate?: boolean;
  icon: IconName;
  nameKey: TKey;
  hintKey: TKey;
};

export const GROUP_CAPS: Record<ReliefGroup, number> = { medical: 10000, eduSelf: 7000 };

export const RELIEFS: ReliefDef[] = [
  { id: 'parents', cap: 8000, icon: 'people-outline', nameKey: 'tax.r.parents', hintKey: 'tax.h.parents' },
  { id: 'medical', cap: 10000, group: 'medical', icon: 'medkit-outline', nameKey: 'tax.r.medical', hintKey: 'tax.h.medical' },
  { id: 'medCheck', cap: 1000, group: 'medical', icon: 'fitness-outline', nameKey: 'tax.r.medCheck', hintKey: 'tax.h.medCheck' },
  { id: 'vaccine', cap: 1000, group: 'medical', icon: 'bandage-outline', nameKey: 'tax.r.vaccine', hintKey: 'tax.h.vaccine' },
  { id: 'dental', cap: 1000, group: 'medical', icon: 'happy-outline', nameKey: 'tax.r.dental', hintKey: 'tax.h.dental' },
  { id: 'childDev', cap: 6000, group: 'medical', icon: 'heart-outline', nameKey: 'tax.r.childDev', hintKey: 'tax.h.childDev' },
  { id: 'eduSelf', cap: 7000, group: 'eduSelf', icon: 'school-outline', nameKey: 'tax.r.eduSelf', hintKey: 'tax.h.eduSelf' },
  { id: 'upskill', cap: 2000, group: 'eduSelf', icon: 'rocket-outline', nameKey: 'tax.r.upskill', hintKey: 'tax.h.upskill' },
  { id: 'lifestyle', cap: 2500, icon: 'book-outline', nameKey: 'tax.r.lifestyle', hintKey: 'tax.h.lifestyle' },
  { id: 'sports', cap: 1000, icon: 'barbell-outline', nameKey: 'tax.r.sports', hintKey: 'tax.h.sports' },
  { id: 'childcare', cap: 3000, icon: 'balloon-outline', nameKey: 'tax.r.childcare', hintKey: 'tax.h.childcare' },
  { id: 'breastfeed', cap: 1000, icon: 'water-outline', nameKey: 'tax.r.breastfeed', hintKey: 'tax.h.breastfeed' },
  { id: 'sspn', cap: 8000, icon: 'wallet-outline', nameKey: 'tax.r.sspn', hintKey: 'tax.h.sspn' },
  { id: 'epf', cap: 4000, icon: 'business-outline', nameKey: 'tax.r.epf', hintKey: 'tax.h.epf' },
  { id: 'lifeIns', cap: 3000, icon: 'shield-checkmark-outline', nameKey: 'tax.r.lifeIns', hintKey: 'tax.h.lifeIns' },
  { id: 'prs', cap: 3000, icon: 'time-outline', nameKey: 'tax.r.prs', hintKey: 'tax.h.prs' },
  { id: 'eduMedIns', cap: 4000, icon: 'umbrella-outline', nameKey: 'tax.r.eduMedIns', hintKey: 'tax.h.eduMedIns' },
  { id: 'socso', cap: 350, icon: 'construct-outline', nameKey: 'tax.r.socso', hintKey: 'tax.h.socso' },
  { id: 'spouse', cap: 4000, icon: 'heart-circle-outline', nameKey: 'tax.r.spouse', hintKey: 'tax.h.spouse' },
  { id: 'equipment', cap: 6000, icon: 'accessibility-outline', nameKey: 'tax.r.equipment', hintKey: 'tax.h.equipment' },
  { id: 'ev', cap: 2500, icon: 'flash-outline', nameKey: 'tax.r.ev', hintKey: 'tax.h.ev' },
  { id: 'housing', cap: 7000, icon: 'home-outline', nameKey: 'tax.r.housing', hintKey: 'tax.h.housing' },
  { id: 'zakat', cap: null, rebate: true, icon: 'moon-outline', nameKey: 'tax.r.zakat', hintKey: 'tax.h.zakat' },
];

/** Marginal rates (%) for a resident, to pick from when estimating the tax saved. */
export const MARGINAL_RATES = [0, 1, 3, 6, 11, 19, 25, 26, 28, 30] as const;

/** Resident individual tax bands: chargeable income above `over` pays `rate` % on the part above it. */
export const TAX_BANDS: { over: number; rate: number }[] = [
  { over: 0, rate: 0 },
  { over: 5000, rate: 1 },
  { over: 20000, rate: 3 },
  { over: 35000, rate: 6 },
  { over: 50000, rate: 11 },
  { over: 70000, rate: 19 },
  { over: 100000, rate: 25 },
  { over: 400000, rate: 26 },
  { over: 600000, rate: 28 },
  { over: 2000000, rate: 30 },
];
