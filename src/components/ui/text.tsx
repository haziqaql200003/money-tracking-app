import { createContext, useContext, type ComponentRef, type Ref } from 'react';
import {
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

/** The font files, loaded once in app/_layout.tsx. */
export const FONT_FILES = {
  Manrope_400Regular: require('../../../assets/fonts/Manrope_400Regular.ttf'),
  Manrope_500Medium: require('../../../assets/fonts/Manrope_500Medium.ttf'),
  Manrope_600SemiBold: require('../../../assets/fonts/Manrope_600SemiBold.ttf'),
  Manrope_700Bold: require('../../../assets/fonts/Manrope_700Bold.ttf'),
  Manrope_800ExtraBold: require('../../../assets/fonts/Manrope_800ExtraBold.ttf'),
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
  if (!nested || flat.fontWeight != null || flat.fontFamily != null) {
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
  const element = <RNText ref={ref} {...rest} style={[style, adapt(style, scale, nested)]} />;
  return nested ? element : <InText.Provider value={true}>{element}</InText.Provider>;
}

export type TextInput = ComponentRef<typeof RNTextInput>;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- same as Text above
export function TextInput({ style, ref, ...rest }: TextInputProps & { ref?: Ref<TextInput> }) {
  const appScale = useTextScale();
  const scale = rest.allowFontScaling === false ? 1 : appScale;
  return <RNTextInput ref={ref} {...rest} style={[style, adapt(style as StyleProp<TextStyle>, scale, false)]} />;
}
