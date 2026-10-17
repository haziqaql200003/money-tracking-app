import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, FontSize, ThemeColor, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        (type === 'link' || type === 'linkPrimary') && { color: theme.accent },
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: { ...Type.label, fontWeight: '500' },
  smallBold: { ...Type.label, fontWeight: '700' },
  default: Type.body,
  // Tab screen titles (Transaksi, Faham, Lagi).
  title: Type.largeTitle,
  // Dialog and lock screen titles.
  subtitle: Type.title,
  link: { ...Type.label, fontWeight: '600' },
  linkPrimary: { ...Type.label, fontWeight: '600' },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: FontSize.caption,
  },
});
