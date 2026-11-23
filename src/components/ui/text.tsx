import { createContext, useCallback, useContext, useLayoutEffect, useRef, type ComponentRef, type Ref } from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useTextScale } from '@/context/text-size';

/**
 * WaKira's one typeface (3.7.0): Manrope, the same on iPhone, Android and web.
 * Every screen imports Text and TextInput from here instead of 'react-native', so:
 *  - the font is always Manrope, in the face that matches the fontWeight (400 to 800);
 *  - every size follows Settings > Text size (Small / Medium / Large).
 * Custom fonts ignore fontWeight on Android, so the weight is turned into the matching face here.
 * Pass allowFontScaling={false} for text that must keep its exact size (amounts fitted inside a card).
 */
export const FONT_FACES = {
  400: 'Manrope_400Regular',
  500: 'Manrope_500Medium',
  600: 'Manrope_600SemiBold',
  700: 'Manrope_700Bold',
  800: 'Manrope_800ExtraBold',
} as const;

/**
 * Display faces used only by the story reports: Space Grotesk for the monthly story's big numbers,
 * DM Serif Display for the songket annual wrap. A Text that sets one of these as fontFamily keeps it.
 */
export const STORY_FACES = {
  grotesk: 'SpaceGrotesk_700Bold',
  serif: 'DMSerifDisplay_400Regular',
} as const;
const STORY_FACE_SET = new Set<string>(Object.values(STORY_FACES));

/** The font files, loaded once in app/_layout.tsx. */
export const FONT_FILES = {
  Manrope_400Regular: require('../../../assets/fonts/Manrope_400Regular.ttf'),
  Manrope_500Medium: require('../../../assets/fonts/Manrope_500Medium.ttf'),
  Manrope_600SemiBold: require('../../../assets/fonts/Manrope_600SemiBold.ttf'),
  Manrope_700Bold: require('../../../assets/fonts/Manrope_700Bold.ttf'),
  Manrope_800ExtraBold: require('../../../assets/fonts/Manrope_800ExtraBold.ttf'),
  SpaceGrotesk_700Bold: require('../../../assets/fonts/SpaceGrotesk_700Bold.ttf'),
  DMSerifDisplay_400Regular: require('../../../assets/fonts/DMSerifDisplay_400Regular.ttf'),
};

/** The Manrope face for a fontWeight. Weights below 400 use Regular, 900 uses ExtraBold. */
export function faceFor(weight: TextStyle['fontWeight'] | undefined): string {
  const w = weight === 'bold' ? 700 : weight == null || weight === 'normal' ? 400 : Number(weight) || 400;
  if (w >= 800) return FONT_FACES[800];
  if (w >= 700) return FONT_FACES[700];
  if (w >= 600) return FONT_FACES[600];
  if (w >= 500) return FONT_FACES[500];
  return FONT_FACES[400];
}

/** React Native's default font size when a style sets none. */
const BASE_SIZE = 14;

/** True inside another Text: nested text inherits its parent's face and size unless it sets its own. */
const InText = createContext(false);

function adapt(style: StyleProp<TextStyle>, scale: number, nested: boolean): TextStyle {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const out: { -readonly [K in keyof TextStyle]?: TextStyle[K] } = {};
  if (flat.fontFamily != null && STORY_FACE_SET.has(flat.fontFamily)) {
    out.fontFamily = flat.fontFamily;
    out.fontWeight = 'normal';
  } else if (!nested || flat.fontWeight != null || flat.fontFamily != null) {
    out.fontFamily = faceFor(flat.fontWeight);
    out.fontWeight = 'normal';
  }
  if (flat.fontSize != null) out.fontSize = flat.fontSize * scale;
  else if (!nested && scale !== 1) out.fontSize = BASE_SIZE * scale;
  if (flat.lineHeight != null) out.lineHeight = flat.lineHeight * scale;
  return out;
}

// The instance type of Text, so `useRef<Text>(null)` keeps working after the import moved here.
export type Text = ComponentRef<typeof RNText>;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- a value and its instance type share the name, like in react-native
export function Text({ style, ref, ...rest }: TextProps & { ref?: Ref<Text> }) {
  const nested = useContext(InText);
  const appScale = useTextScale();
  const scale = rest.allowFontScaling === false ? 1 : appScale;
  const adapted = adapt(style, scale, nested);
  const fitRef = useWebFit(
    Platform.OS === 'web' && !!rest.adjustsFontSizeToFit && rest.numberOfLines === 1,
    rest.minimumFontScale ?? 0.5,
    ref,
    rest.children,
  );
  const element = <RNText ref={fitRef} {...rest} style={[style, adapted]} />;
  return nested ? element : <InText.Provider value={true}>{element}</InText.Provider>;
}

/** Passes the element on to a ref given by the caller (function or object ref). */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/**
 * Web only: adjustsFontSizeToFit is an iOS/Android feature, so on the web a fitted amount was cut with "…"
 * ("+RM 3,000.…"). This shrinks the text until it fits its box, down to minimumFontScale (3.9.1).
 * Works on the DOM node directly so it causes no extra render; re-checks when the text or the box size changes.
 */
function useWebFit(enabled: boolean, minScale: number, outerRef: Ref<Text> | undefined, children: unknown): Ref<Text> | undefined {
  const node = useRef<HTMLElement | null>(null);
  const base = useRef<number | null>(null);

  const fit = useCallback(() => {
    const el = node.current;
    if (!el) return;
    el.style.removeProperty('font-size');
    el.style.removeProperty('line-height');
    const cs = window.getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight);
    if (!size || el.clientWidth === 0) return;
    base.current = size;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    const ratio = Math.max(minScale, (el.clientWidth / el.scrollWidth) * 0.98);
    el.style.fontSize = `${size * ratio}px`;
    if (lh) el.style.lineHeight = `${lh * ratio}px`;
  }, [minScale]);

  useLayoutEffect(() => {
    if (!enabled) return;
    fit();
    const el = node.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // Watch the parent: the text's own width follows its font size, the parent's follows the screen.
    const watched = el.parentElement ?? el;
    let last = watched.clientWidth;
    const ro = new ResizeObserver(() => {
      if (watched.clientWidth === last) return;
      last = watched.clientWidth;
      fit();
    });
    ro.observe(watched);
    return () => ro.disconnect();
  }, [enabled, fit, children]);

  const setRef = useCallback(
    (el: Text | null) => {
      node.current = el as unknown as HTMLElement | null;
      assignRef(outerRef, el);
    },
    [outerRef],
  );
  return enabled ? setRef : outerRef;
}

export type TextInput = ComponentRef<typeof RNTextInput>;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- same as Text above
export function TextInput({ style, ref, ...rest }: TextInputProps & { ref?: Ref<TextInput> }) {
  const appScale = useTextScale();
  const scale = rest.allowFontScaling === false ? 1 : appScale;
  return <RNTextInput ref={ref} {...rest} style={[style, adapt(style as StyleProp<TextStyle>, scale, false)]} />;
}
