import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { Text } from '@/components/ui/text';

/** Roughly how wide one character of a bold title is, as a share of the font size (Plus Jakarta / system bold). */
const CHAR_WIDTH = 0.6;
/** Never smaller than this share of the normal size; past it the title is cut with "…" as before. */
const MIN_SCALE = 0.72;

/**
 * A one-line page title that gets smaller instead of being cut when the buttons beside it leave little room on a
 * phone ("Transacti…", "Accounts & asse…" in 3.9.0). Measures the space it has, so it works the same on iOS,
 * Android and the web (adjustsFontSizeToFit is native only) (3.9.1).
 */
export function FitTitle({ title, fontSize, lineHeight, style }: { title: string; fontSize: number; lineHeight: number; style?: StyleProp<TextStyle> }) {
  const [width, setWidth] = useState(0);
  const needed = title.length * CHAR_WIDTH * fontSize;
  const scale = width > 0 && needed > width ? Math.max(MIN_SCALE, width / needed) : 1;
  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Text style={[style, { fontSize: Math.round(fontSize * scale), lineHeight: Math.round(lineHeight * scale) }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0, justifyContent: 'center' },
});
