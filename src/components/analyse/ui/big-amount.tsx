import type { StyleProp, TextStyle } from 'react-native';

import { useCountUp, useMotionAllowed } from '@/components/analyse/ui/motion';
import { MONEY_MASK } from '@/components/ui/money';
import { Text } from '@/components/ui/text';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** The three amount sizes Faham uses: hero 40, card 20, row 14. */
const SIZES = {
  hero: { value: 40, line: 44, prefix: 20, weight: '800' as const, spacing: -1.2 },
  card: { value: 20, line: 26, prefix: 13, weight: '800' as const, spacing: -0.3 },
  row: { value: 14, line: 20, prefix: 14, weight: '800' as const, spacing: 0 },
};

const whole = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = {
  amount: number;
  size?: keyof typeof SIZES;
  /** Show sen (two decimals). Off for hero and card figures, on for record rows. */
  sen?: boolean;
  /** '+' / '−' in front, for changes. */
  signed?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  /** Count up to the figure when it first shows or changes (hero figures only). Off with Reduce Motion. */
  countUp?: boolean;
};

/**
 * An amount with a smaller, quieter "RM" in front and even-width digits, so figures line up and the number reads first.
 * Honours Hide amounts like <Money>.
 */
export function BigAmount({ amount, size = 'card', sen, signed, color, style, countUp }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const motion = useMotionAllowed();
  const live = useCountUp(amount, !!countUp && motion && !hideAmounts);
  const s = SIZES[size];
  const ink = color ?? colors.text;
  const sign = signed ? (amount > 0 ? '+' : amount < 0 ? '−' : '') : amount < 0 ? '−' : '';
  const fmt = sen ? cents : whole;
  const digits = fmt.format(Math.abs(live));
  // Screen readers always hear the final figure, never a number on its way up.
  const label = `${sign}RM ${fmt.format(Math.abs(amount))}`;
  const prefixColor = color ? ink : colors.textSecondary;

  if (hideAmounts) {
    return (
      <Text style={[{ fontSize: s.value, lineHeight: s.line, fontWeight: s.weight, color: ink }, style]} accessibilityLabel={t('home.ui.amountHidden')}>
        {MONEY_MASK}
      </Text>
    );
  }
  return (
    <Text
      style={[{ fontSize: s.value, lineHeight: s.line, fontWeight: s.weight, letterSpacing: s.spacing, color: ink, fontVariant: ['tabular-nums'] }, style]}
      accessibilityLabel={label}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      <Text style={{ fontSize: s.prefix, fontWeight: '700', color: prefixColor, letterSpacing: 0 }}>{`${sign}RM `}</Text>
      {digits}
    </Text>
  );
}
