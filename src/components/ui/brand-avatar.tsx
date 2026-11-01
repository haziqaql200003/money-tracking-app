import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BRAND_LOGOS } from '@/constants/brand-logos';
import { brandBadge } from '@/constants/brands';
import { isLightColor } from '@/constants/card-styles';

type Props = {
  /** A provider, bank or e-wallet name as typed ("SPayLater", "maybank", "Kedai Ali"). */
  name: string | undefined | null;
  size?: number;
  /** Red ring: something with this company is overdue. */
  alert?: boolean;
  alertColor?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A company's logo when one was added (see constants/brand-logos.ts), otherwise its letter on its colour.
 * Names WaKira does not know get their first letters on a colour picked from the name.
 */
export function BrandAvatar({ name, size = 36, alert, alertColor = '#C13B2D', style }: Props) {
  const badge = brandBadge(name);
  const logo = badge.brand ? BRAND_LOGOS[badge.brand.id] : undefined;
  const radius = size / 2;
  const ring = alert ? { borderWidth: 2, borderColor: alertColor } : null;
  if (logo) {
    return (
      <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: '#FFFFFF' }, ring, style]}>
        <Image source={logo} style={{ width: size * 0.8, height: size * 0.8, borderRadius: radius }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  const ink = isLightColor(badge.color) ? '#1A1A1A' : '#FFFFFF';
  const letters = badge.short.length;
  const fontSize = size * (letters >= 3 ? 0.3 : letters === 2 ? 0.38 : 0.46);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: badge.color }, ring, style]}>
      <Text style={[styles.letter, { color: ink, fontSize }]} numberOfLines={1} allowFontScaling={false}>
        {badge.short}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letter: { fontWeight: '800', letterSpacing: -0.3 },
});
