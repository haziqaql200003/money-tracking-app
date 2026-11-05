import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  name: string;
  size?: number;
  /** 'owe' = you owe them (red), 'owed' = they owe you (green), 'done' = settled (grey). */
  tone: 'owe' | 'owed' | 'done';
  /** A coloured ring around the circle, for the big one on a detail page. */
  ring?: boolean;
};

/** A person's first letter on a soft circle that shows who owes whom. */
export function PersonAvatar({ name, size = 40, tone, ring }: Props) {
  const colors = useTheme();
  const fg = tone === 'owe' ? colors.negative : tone === 'owed' ? colors.positive : colors.textSecondary;
  const bg = tone === 'done' ? colors.backgroundSelected : `${fg}22`;
  const letter = (name.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase();
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        ring && { borderWidth: 2, borderColor: fg },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.letter, { color: fg, fontSize: size * 0.42 }]} allowFontScaling={false}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '800' },
});
