import { useSyncExternalStore } from 'react';

import { loadJSON, saveJSON } from '@/services/storage';

/**
 * Text size for the whole app (3.7.0): Settings > Appearance > Text size.
 * It belongs to this phone (like light / dark), so the sign-in screens follow it too.
 * Every Text and TextInput in the app reads it through src/components/ui/text.tsx.
 */
export type TextSize = 'small' | 'medium' | 'large';

export const TEXT_SIZES: TextSize[] = ['small', 'medium', 'large'];

/** How much every font size and line height is multiplied by. Medium = the sizes as designed. */
export const TEXT_SCALE: Record<TextSize, number> = { small: 0.9, medium: 1, large: 1.15 };

const KEY = 'app:textSize';
const isTextSize = (v: unknown): v is TextSize => v === 'small' || v === 'medium' || v === 'large';

let current: TextSize = 'medium';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

loadJSON<string>(KEY)
  .then((v) => {
    if (isTextSize(v) && v !== current) {
      current = v;
      notify();
    }
  })
  .catch(() => {});

export function setTextSize(next: TextSize) {
  if (next === current) return;
  current = next;
  saveJSON(KEY, next);
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useTextSize(): TextSize {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

export function useTextScale(): number {
  return TEXT_SCALE[useTextSize()];
}
