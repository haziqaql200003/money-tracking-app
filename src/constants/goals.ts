import type { IconName } from '@/constants/categories';

/** Looks a savings goal can have. The first one is the default. */
export const GOAL_PRESETS: { icon: IconName; color: string; label: string }[] = [
  { icon: 'shield-checkmark', color: '#2ECC71', label: 'Emergency' },
  { icon: 'airplane', color: '#5B8DEF', label: 'Travel' },
  { icon: 'home', color: '#7C5CFC', label: 'Home' },
  { icon: 'car', color: '#FF9F43', label: 'Car' },
  { icon: 'school', color: '#0EA5E9', label: 'Study' },
  { icon: 'gift', color: '#F0529C', label: 'Gift' },
  { icon: 'laptop', color: '#14B8A6', label: 'Gadget' },
  { icon: 'star', color: '#EAB308', label: 'Other' },
];
