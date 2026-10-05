import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { IconName } from '@/constants/categories';
import { AuroraCard, BatikCard, DirajaCard, GlassCard, SongketCard, TitaniumCard } from '@/components/cards';
import { FlipCard } from '@/components/cards/FlipCard';
import { TiltCard } from '@/components/cards/TiltCard';
import { tone } from '@/components/cards/palette';
import { isLightColor, isProDesign, shade, type CardDesign } from '@/constants/card-styles';
import { formatMoney } from '@/utils/currency';

// Bold bands that cut across the bottom-right corner of the Stripes design.
const BANDS = [
  { y: 120, h: 34, o: 0.12 },
  { y: 162, h: 14, o: 0.18 },
  { y: 184, h: 44, o: 0.08 },
  { y: 236, h: 4, o: 0.32 },
];

const PRO_CARDS = {
  'pro-songket': SongketCard,
  'pro-glass': GlassCard,
  'pro-aurora': AuroraCard,
  'pro-titanium': TitaniumCard,
  'pro-diraja': DirajaCard,
  'pro-batik': BatikCard,
} as const;

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
  last4?: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
};

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
  last4,
  hidden = false,
  onToggleHidden,
}: Props) {
  const ink = inkFor(color);

  if (isProDesign(design)) {
    // Premium cards draw everything themselves (own colours, bank name, masked balance, eye button).
    // The flip button turns the card over to show this month's income and spending.
    const Pro = PRO_CARDS[design];
    return (
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
              style={styles.proInner}
            />
          </TiltCard>
        )}
      </FlipCard>
    );
  }

  return (
    <View style={[styles.card, width ? { width } : styles.stretch]}>
      <CardBackground color={color} design={design} />

      <View style={styles.top}>
        <View style={[styles.iconChip, { backgroundColor: ink.chip }]}>
          <Ionicons name={icon} size={18} color={ink.main} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: ink.main }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: ink.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {last4 ? <Text style={[styles.last4, { color: ink.muted }]}>•••• {last4}</Text> : null}
      </View>

      <View>
        <View style={styles.balanceLabelRow}>
          <Text style={[styles.balanceLabel, { color: ink.muted }]}>BALANCE</Text>
          {onToggleHidden ? (
            <Pressable
              onPress={onToggleHidden}
              hitSlop={12}
              style={[styles.eyeButton, { backgroundColor: ink.chip }]}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
            >
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={16} color={ink.main} />
            </Pressable>
          ) : null}
        </View>
        <Text
          style={[styles.balanceAmount, { color: ink.main }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {hidden ? MASK_BALANCE : signedMoney(balance)}
        </Text>
      </View>

      <View style={[styles.bottom, { borderTopColor: ink.line }]}>
        <View>
          <Text style={[styles.splitLabel, { color: ink.muted }]}>Income</Text>
          <Text style={[styles.splitValue, { color: ink.main }]}>{hidden ? MASK_SPLIT : formatMoney(income)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.splitLabel, { color: ink.muted }]}>Spending</Text>
          <Text style={[styles.splitValue, { color: ink.main }]}>{hidden ? MASK_SPLIT : formatMoney(spending)}</Text>
        </View>
      </View>

      <View pointerEvents="none" style={[styles.rim, { borderColor: ink.rim, borderTopColor: ink.rimTop }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  card: { height: 196, borderRadius: 24, padding: 20, justifyContent: 'space-between', overflow: 'hidden' },
  stretch: { alignSelf: 'stretch' },
  proCard: { height: 196, alignSelf: 'stretch' },
  proInner: { width: '100%', height: '100%', aspectRatio: undefined },
  rim: { ...StyleSheet.absoluteFill, borderRadius: 24, borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 12, fontWeight: '500' },
  last4: { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeButton: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  balanceAmount: { fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 2 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  splitLabel: { fontSize: 12, fontWeight: '500' },
  splitValue: { fontSize: 15, fontWeight: '700', marginTop: 1 },
});
