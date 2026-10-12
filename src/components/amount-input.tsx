import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { centsFromValue, displayForValue, valueFromTyped } from '@/utils/amount-input';

type Props = {
  /** Plain decimal string ("1000.00") or "" for zero. */
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<TextStyle>;
} & Pick<TextInputProps, 'placeholder' | 'placeholderTextColor' | 'onBlur' | 'accessibilityLabel' | 'textAlign' | 'autoFocus'>;

// Style keys that belong to the text itself. Everything else (padding, border, size, background) stays on the box.
const TEXT_KEYS = ['color', 'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'fontVariant'] as const;

/**
 * "1000.50" -> "100050", and also "15" -> "1500" (a value saved without decimals, e.g. when editing).
 * Empty for zero. This is what the hidden field holds, so what the phone types is always exactly what we store.
 */
const digitsOf = (value: string) => {
  const cents = centsFromValue(value);
  return cents > 0 ? String(cents) : '';
};

/**
 * Money field where digits slide in from the right (1 > 0.01, 10 > 0.10, 100 > 1.00) and thousands get a comma.
 *
 * The visible amount is plain text. The real input sits invisibly on top and holds only the digits. Because the
 * keyboard's text and our stored value are always the same, the phone never has to correct the field after a key
 * press, which is what made the old field flicker while typing.
 */
export function AmountInput({ value, onChange, style, placeholder = '0.00', placeholderTextColor, textAlign, onBlur, accessibilityLabel, autoFocus }: Props) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const box: Record<string, unknown> = {};
  const text: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if ((TEXT_KEYS as readonly string[]).includes(k)) text[k] = v;
    else box[k] = v;
  }
  const shown = displayForValue(value);
  const align = (textAlign ?? text.textAlign ?? 'left') as TextStyle['textAlign'];

  return (
    // The box itself opens the keyboard. iOS does not pass taps to a view that is fully see-through,
    // so the hidden field alone could not be tapped on an iPhone.
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={[box, styles.box, focused && { borderColor: colors.accent }]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={[text, { textAlign: align, color: shown ? (text.color as string | undefined) : placeholderTextColor }]}
      >
        {shown || placeholder}
      </Text>
      <TextInput
        ref={input}
        value={digitsOf(value)}
        onChangeText={(typed) => onChange(valueFromTyped(typed, value))}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        keyboardType="number-pad"
        inputMode="numeric"
        caretHidden
        selectTextOnFocus={false}
        maxLength={11}
        autoFocus={autoFocus}
        contextMenuHidden
        autoCorrect={false}
        accessibilityLabel={accessibilityLabel}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { justifyContent: 'center', overflow: 'hidden' },
  // Covers the whole box but shows nothing. Not 0: iOS skips views under 0.01 when it looks for what was tapped.
  hidden: { ...StyleSheet.absoluteFill, opacity: 0.02, color: 'transparent' },
});
