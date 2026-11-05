import { Text, type StyleProp, type TextStyle } from 'react-native';

import { tabularNums, Type } from '@/constants/theme';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatMoney } from '@/utils/currency';

export const MONEY_MASK = 'RM ••••';

type Props = {
  amount: number;
  /** Pass 'credit' / 'debit' to colour the value and prefix + / -. Omit for a neutral balance. */
  kind?: 'credit' | 'debit';
  size?: keyof Pick<typeof Type, 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption'>;
  /** Overrides the global Hide amounts setting. */
  hidden?: boolean;
  style?: StyleProp<TextStyle>;
};

/**
 * The one way to show an amount: tabular digits, optional income/spending colour,
 * and it honours Hide amounts everywhere without each screen re-implementing the mask.
 */
export function Money({ amount, kind, size = 'body', hidden, style }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const { hideAmounts } = usePrivacy();
  const masked = hidden ?? hideAmounts;
  const color = kind === 'credit' ? colors.positive : kind === 'debit' ? colors.negative : colors.text;
  const negative = !kind && amount < 0;

  return (
    <Text
      style={[Type[size], tabularNums, { color }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      accessibilityLabel={masked ? t('home.ui.amountHidden') : undefined}
    >
      {masked ? MONEY_MASK : `${negative ? '-' : ''}${formatMoney(amount, kind ? { signed: true, type: kind } : undefined)}`}
    </Text>
  );
}

