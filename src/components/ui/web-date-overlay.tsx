import { createElement } from 'react';
import { Platform } from 'react-native';

type Props = {
  /** YYYY-MM-DD */
  value: string;
  onChange: (iso: string) => void;
  /** Latest date that can be picked (YYYY-MM-DD). */
  max?: string;
};

/**
 * Web only: the browser's own calendar. Phones have a native date picker, but the web has none, so a date row stayed
 * dead there. This sits invisibly over the row, so the row looks the same and a click opens the browser calendar.
 * On a phone it renders nothing.
 */
export function WebDateOverlay({ value, onChange, max }: Props) {
  if (Platform.OS !== 'web') return null;
  return createElement('input', {
    type: 'date',
    value,
    max,
    'aria-label': 'Date', // i18n-ignore: hidden native control, the visible row carries the words
    onChange: (e: { target: { value: string } }) => {
      if (e.target.value) onChange(e.target.value);
    },
    onClick: (e: { currentTarget: { showPicker?: () => void } }) => {
      try {
        e.currentTarget.showPicker?.();
      } catch {
        // Some browsers refuse; the field still opens on its own icon.
      }
    },
    style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 0, padding: 0, margin: 0 },
  });
}
