import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, type JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { IconName } from '@/constants/categories';
import { AuroraCard, SpectrumCard, TitaniumCard, TitaniumSeriesCard, type SpectrumVariant, type TitaniumKind, type WakiraCardProps } from '@/components/cards';
import { CardExtras, type CardSide } from '@/components/cards/shared';
import { BrandAvatar } from '@/components/ui/brand-avatar';
import { FlipCard } from '@/components/cards/FlipCard';
import { TiltCard } from '@/components/cards/TiltCard';
import { tone } from '@/components/cards/palette';
import { isLightColor, isProDesign, shade, type CardDesign, type ProCardDesign, type TitaniumFinish } from '@/constants/card-styles';
import { useProfile } from '@/context/ProfileContext';
import { useT } from '@/i18n';
import { formatMoney } from '@/utils/currency';

import { FontSize, Radius } from '@/constants/theme';
import { fitFontSize } from '@/utils/fit-font';

// Bold bands that cut across the bottom-right corner of the Stripes design.
const BANDS = [
  { y: 120, h: 34, o: 0.12 },
  { y: 162, h: 14, o: 0.18 },
  { y: 184, h: 44, o: 0.08 },
  { y: 236, h: 4, o: 0.32 },
];

type ProProps = WakiraCardProps & { finish?: TitaniumFinish };
function spectrum(variant: SpectrumVariant) {
  const Card = (p: ProProps) => <SpectrumCard {...p} variant={variant} />;
  Card.displayName = `SpectrumCard.${variant}`;
  return Card;
}
function titanium(kind: TitaniumKind) {
  const Card = (p: ProProps) => <TitaniumSeriesCard {...p} kind={kind} />;
  Card.displayName = `TitaniumSeriesCard.${kind}`;
  return Card;
}

/** Every premium design that can be shown (3.6.0). Retired designs are mapped to Titanium Contour by normalizeDesign. */
const PRO_CARDS: Record<ProCardDesign, (p: ProProps) => JSX.Element> = {
  'pro-spectrum-classic': spectrum('classic'),
  'pro-spectrum-pulse': spectrum('pulse'),
  'pro-spectrum-cyber': spectrum('cyber'),
  'pro-spectrum-neon': spectrum('neon'),
  'pro-aurora': (p) => <AuroraCard {...p} />,
  'pro-titanium': (p) => <TitaniumCard {...p} />,
  'pro-ti-contour': titanium('contour'),
  'pro-ti-flux': titanium('flux'),
  'pro-ti-reserve': titanium('reserve'),
  'pro-ti-deco': titanium('deco'),
};

function inkFor(color: string) {
  return isLightColor(color)
    ? { main: '#111827', muted: 'rgba(17,24,39,0.65)', chip: 'rgba(17,24,39,0.12)', line: 'rgba(17,24,39,0.25)', deco: 'rgba(17,24,39,0.07)', rim: 'rgba(17,24,39,0.12)', rimTop: 'rgba(17,24,39,0.22)' }
    : { main: '#FFFFFF', muted: 'rgba(255,255,255,0.7)', chip: 'rgba(255,255,255,0.2)', line: 'rgba(255,255,255,0.3)', deco: 'rgba(255,255,255,0.08)', rim: 'rgba(255,255,255,0.14)', rimTop: 'rgba(255,255,255,0.35)' };
}

/**
 * Backgrounds for the free designs. They stay still (only Premium cards move), but each one has
 * depth: soft light, a sheen at the top and shapes drawn from the account's own colour.
 */
export function CardBackground({ color, design }: { color: string; design: CardDesign }) {
  const ink = inkFor(color);
  const key = `${design}-${color.replace('#', '')}`;

  if (design === 'solid') {
    return (
      <>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
        <LinearGradient
          colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.14)']}
          locations={[0, 0.45, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={`sheen-${key}`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.14" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="330" cy="0" rx="220" ry="120" fill={`url(#sheen-${key})`} />
        </Svg>
      </>
    );
  }

  if (design === 'gradient') {
    return (
      <>
        <LinearGradient
          colors={[tone(color, -12, 0, 10), color, tone(color, 25, 0, -18)]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="xMidYMid slice">
          <Circle cx={300} cy={40} r={70} fill="none" stroke={ink.main} strokeOpacity={0.1} strokeWidth={18} />
          <Circle cx={300} cy={40} r={120} fill="none" stroke={ink.main} strokeOpacity={0.07} strokeWidth={14} />
          <Circle cx={300} cy={40} r={165} fill="none" stroke={ink.main} strokeOpacity={0.05} strokeWidth={10} />
        </Svg>
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
          locations={[0, 0.45]}
          style={StyleSheet.absoluteFill}
        />
      </>
    );
  }

  if (design === 'stripes') {
    return (
      <>
        <LinearGradient
          colors={[shade(color, 0.06), shade(color, -0.32)]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="xMidYMid slice">
          <G transform="rotate(-35 250 150)">
            {BANDS.map((b) => (
              <Rect key={b.y} x={120} y={b.y} width={400} height={b.h} fill={ink.main} fillOpacity={b.o} />
            ))}
          </G>
        </Svg>
      </>
    );
  }

  // 'aurora': a soft mesh of light in nearby shades of the account colour
  return (
    <>
      <LinearGradient
        colors={[shade(color, 0.12), shade(color, -0.4)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`m1-${key}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={tone(color, 40, 10, 10)} stopOpacity="0.75" />
            <Stop offset="0.7" stopColor={tone(color, 40, 10, 10)} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`m2-${key}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={tone(color, -35, 10, 8)} stopOpacity="0.55" />
            <Stop offset="0.7" stopColor={tone(color, -35, 10, 8)} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`m3-${key}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="303" cy="0" rx="190" ry="150" fill={`url(#m1-${key})`} />
        <Ellipse cx="0" cy="196" rx="200" ry="160" fill={`url(#m2-${key})`} />
        <Ellipse cx="59" cy="0" rx="160" ry="110" fill={`url(#m3-${key})`} />
      </Svg>
    </>
  );
}

function signedMoney(amount: number) {
  return (amount < 0 ? '-' : '') + formatMoney(amount);
}

const MASK_BALANCE = 'RM ••••••';
const MASK_SPLIT = 'RM ••••';

type Props = {
  width?: number;
  title: string;
  subtitle: string;
  icon: IconName;
  balance: number;
  income: number;
  spending: number;
  color: string;
  design: CardDesign;
  /** Titanium Metallic finish (only used by the Titanium series). */
  finish?: TitaniumFinish;
  last4?: string;
  /** Bank or e-wallet name: its logo goes on the card (3.7.0). */
  provider?: string;
  /** Name printed on the card. Defaults to the profile name. */
  holder?: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
};

/**
 * An account as a physical card (3.7.0, Home concept A5b): the bank's logo, the holder's name and the last four digits
 * on the front, this month's money in and out on the back. Every design tilts under the finger (and with the phone when
 * "Tilt with phone" is on) and turns over with the flip button. Premium designs draw their own art.
 */
export function AccountCard({
  width,
  title,
  subtitle,
  icon,
  balance,
  income,
  spending,
  color,
  design,
  finish,
  last4,
  provider,
  holder,
  hidden = false,
  onToggleHidden,
}: Props) {
  const { displayName } = useProfile();
  const name = (holder ?? displayName ?? '').trim();
  const extras = useMemo(() => ({ provider: provider?.trim() || undefined, holder: name || undefined }), [provider, name]);

  if (isProDesign(design)) {
    const Pro = PRO_CARDS[design];
    return (
      <CardExtras.Provider value={extras}>
        <FlipCard style={width ? { width } : styles.stretch}>
          {(side, flip) => (
            <TiltCard style={styles.proCard}>
              <Pro
                bank={title}
                icon={icon}
                balance={balance}
                last4={last4}
                hidden={hidden}
                onToggleHidden={onToggleHidden}
                income={income}
                spending={spending}
                side={side}
                onFlip={flip}
                finish={finish}
                style={styles.proInner}
              />
            </TiltCard>
          )}
        </FlipCard>
      </CardExtras.Provider>
    );
  }

  return (
    <FlipCard style={width ? { width } : styles.stretch}>
      {(side, flip) => (
        <TiltCard style={styles.freeCard}>
          <FreeCardFace
            side={side}
            onFlip={flip}
            width={width}
            title={title}
            subtitle={subtitle}
            icon={icon}
            balance={balance}
            income={income}
            spending={spending}
            color={color}
            design={design}
            last4={last4}
            provider={extras.provider}
            holder={extras.holder}
            hidden={hidden}
            onToggleHidden={onToggleHidden}
          />
        </TiltCard>
      )}
    </FlipCard>
  );
}

type FaceProps = Omit<Props, 'finish'> & { side: CardSide; onFlip: () => void };

function FreeCardFace({ side, onFlip, width, title, subtitle, icon, balance, income, spending, color, design, last4, provider, holder, hidden = false, onToggleHidden }: FaceProps) {
  const { t } = useT();
  const ink = inkFor(color);
  const back = side === 'back';
  // Fixed, worked-out size instead of adjustsFontSizeToFit (which could shrink the number to a speck on iOS).
  const balanceText = hidden ? MASK_BALANCE : signedMoney(balance);
  const balanceSize = fitFontSize(balanceText, (width ?? 330) - 40, FontSize.display, 0.6);
  const buttons = (
    <>
      {onToggleHidden ? (
        <Pressable
          onPress={onToggleHidden}
          hitSlop={12}
          style={[styles.roundButton, { backgroundColor: ink.chip }]}
          accessibilityRole="button"
          accessibilityLabel={hidden ? t('acct.card.showAmounts') : t('acct.card.hideAmounts')}
        >
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={15} color={ink.main} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={onFlip}
        hitSlop={12}
        style={[styles.roundButton, { backgroundColor: ink.chip }]}
        accessibilityRole="button"
        accessibilityLabel={back ? t('acct.card.flipToBalance') : t('acct.card.flipToSplit')}
      >
        <Ionicons name="swap-horizontal-outline" size={15} color={ink.main} />
      </Pressable>
    </>
  );

  if (back) {
    return (
      <View style={styles.card}>
        <CardBackground color={color} design={design} />
        <View style={[StyleSheet.absoluteFill, styles.backShade]} />
        <View style={styles.stripe} />
        <View style={styles.backBody}>
          <View style={styles.labelRow}>
            <Text allowFontScaling={false} style={[styles.balanceLabel, { color: ink.muted }]}>{t('acct.card.thisMonth').toUpperCase()}</Text>
            {buttons}
          </View>
          <View style={styles.split}>
            <View style={styles.flex}>
              <Text allowFontScaling={false} style={[styles.splitLabel, { color: ink.muted }]}>{t('acct.card.income')}</Text>
              <Text allowFontScaling={false} style={[styles.splitValue, { color: ink.main }]} numberOfLines={1}>
                {hidden ? MASK_SPLIT : formatMoney(income)}
              </Text>
            </View>
            <View style={[styles.splitDivider, { backgroundColor: ink.line }]} />
            <View style={styles.flex}>
              <Text allowFontScaling={false} style={[styles.splitLabel, { color: ink.muted }]}>{t('acct.card.spending')}</Text>
              <Text allowFontScaling={false} style={[styles.splitValue, { color: ink.main }]} numberOfLines={1}>
                {hidden ? MASK_SPLIT : formatMoney(spending)}
              </Text>
            </View>
          </View>
        </View>
        <View pointerEvents="none" style={[styles.rim, { borderColor: ink.rim, borderTopColor: ink.rimTop }]} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <CardBackground color={color} design={design} />

      <View style={styles.top}>
        {provider ? (
          <BrandAvatar name={provider} size={36} style={styles.logo} />
        ) : (
          <View style={[styles.iconChip, { backgroundColor: ink.chip }]}>
            <Ionicons name={icon} size={18} color={ink.main} />
          </View>
        )}
        <View style={styles.flex}>
          <Text allowFontScaling={false} style={[styles.title, { color: ink.main }]} numberOfLines={1}>
            {title}
          </Text>
          <Text allowFontScaling={false} style={[styles.subtitle, { color: ink.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="wifi" size={18} color={ink.muted} style={styles.contactless} />
      </View>

      <View>
        <View style={styles.labelRow}>
          <Text allowFontScaling={false} style={[styles.balanceLabel, { color: ink.muted }]}>{t('acct.card.balance').toUpperCase()}</Text>
          {buttons}
        </View>
        <Text allowFontScaling={false} style={[styles.balanceAmount, { color: ink.main, fontSize: balanceSize }]} numberOfLines={1}>
          {balanceText}
        </Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.flex}>
          {holder ? (
            <Text allowFontScaling={false} style={[styles.holder, { color: ink.main }]} numberOfLines={1}>
              {holder.toUpperCase()}
            </Text>
          ) : null}
          <Text allowFontScaling={false} style={[styles.number, { color: ink.muted }]}>
            {last4 ? `•••• ${last4}` : '•••• ••••'}
          </Text>
        </View>
        {/* i18n-ignore: wordmark */}
        <Text allowFontScaling={false} style={[styles.wordmark, { color: ink.muted }]}>WAKIRA</Text>
      </View>

      <View pointerEvents="none" style={[styles.rim, { borderColor: ink.rim, borderTopColor: ink.rimTop }]} />
    </View>
  );
}

const CARD_HEIGHT = 196;

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { height: CARD_HEIGHT, borderRadius: 24, padding: 20, justifyContent: 'space-between', overflow: 'hidden' },
  stretch: { alignSelf: 'stretch' },
  proCard: { height: CARD_HEIGHT, alignSelf: 'stretch' },
  freeCard: { height: CARD_HEIGHT, alignSelf: 'stretch' },
  proInner: { width: '100%', height: '100%', aspectRatio: undefined },
  rim: { ...StyleSheet.absoluteFill, borderRadius: 24, borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  iconChip: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  contactless: { transform: [{ rotate: '90deg' }] },
  title: { fontSize: FontSize.body, fontWeight: '700' },
  subtitle: { fontSize: FontSize.caption, fontWeight: '500' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundButton: { width: 26, height: 26, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: FontSize.micro, fontWeight: '600', letterSpacing: 1.5 },
  balanceAmount: { fontSize: FontSize.display, lineHeight: 40, fontWeight: '700', marginTop: 2 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  holder: { fontSize: FontSize.micro, fontWeight: '700', letterSpacing: 2 },
  number: { fontSize: FontSize.label, fontWeight: '600', letterSpacing: 2.5, marginTop: 1 },
  wordmark: { fontSize: FontSize.micro, fontWeight: '700', letterSpacing: 3 },
  backShade: { backgroundColor: 'rgba(0,0,0,0.28)' },
  stripe: { position: 'absolute', left: 0, right: 0, top: 22, height: 32, backgroundColor: 'rgba(8,8,10,0.88)' },
  backBody: { flex: 1, justifyContent: 'flex-end', gap: 10 },
  split: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  splitDivider: { width: StyleSheet.hairlineWidth, height: 36 },
  splitLabel: { fontSize: FontSize.caption, fontWeight: '500' },
  splitValue: { fontSize: FontSize.heading, fontWeight: '700', marginTop: 2 },
});
