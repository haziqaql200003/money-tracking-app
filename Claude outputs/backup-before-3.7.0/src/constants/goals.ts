import type { IconName } from '@/constants/categories';
import type { TKey } from '@/i18n';

/**
 * Looks a savings goal can have. The first one is the default. `label` is the stored English value; show
 * `t(labelKey)` instead.
 */
export const GOAL_PRESETS: { icon: IconName; color: string; label: string; labelKey: TKey }[] = [
  { icon: 'shield-checkmark', color: '#2ECC71', label: 'Emergency', labelKey: 'plan.goal.preset.emergency' }, // i18n-ignore: stored value; shown via labelKey
  { icon: 'airplane', color: '#5B8DEF', label: 'Travel', labelKey: 'plan.goal.preset.travel' }, // i18n-ignore: stored value; shown via labelKey
  { icon: 'home', color: '#7C5CFC', label: 'Home', labelKey: 'plan.goal.preset.home' }, // i18n-ignore: stored value; shown via labelKey
  { icon: 'car', color: '#FF9F43', label: 'Car', labelKey: 'plan.goal.preset.car' }, // i18n-ignore: stored value; shown via labelKey
  { icon: 'school', color: '#0EA5E9', label: 'Study', labelKey: 'plan.goal.preset.study' }, // i18n-ignore: stored value; shown via labelKey
  { icon: 'gift', color: '#F0529C', label: 'Gift', labelKey: 'plan.goal.preset.gift' }, // i18n-ignore: stored value; shown via labelKey
  { icon: 'laptop', color: '#14B8A6', label: 'Gadget', labelKey: 'plan.goal.preset.gadget' }, // i18n-ignore: stored value; shown via labelKey
  { icon: 'star', color: '#EAB308', label: 'Other', labelKey: 'plan.goal.preset.other' }, // i18n-ignore: stored value; shown via labelKey
];
