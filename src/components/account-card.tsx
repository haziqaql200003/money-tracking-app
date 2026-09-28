import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { isLightColor, shade, type CardDesign } from '@/constants/card-styles';
import { formatMoney } from '@/utils/currency';

const STRIPES = Array.from({ length: 17 }, (_, i) => -60 + i * 10);

function inkFor(color: string) {
  return isLightColor(color)
    ? { main: '#111827', muted: 'rgba(17,24,39,0.65)', chip: 'rgba(17,24,39,0.12)', line: 'rgba(17,24,39,0.25)', deco: 'rgba(17,24,39,0.07)' }
    : { main: '#FFFFFF', muted: 'rgba(255,255,255,0.7)', chip: 'rgba(255,255,255,0.2)', line: 'rgba(255,255,255,0.3)', deco: 'rgba(255,255,255,0.08)' };
}

export function CardBackground({ color, design }: { color: string; design: CardDesign }) {
  const ink = inkFor(color);

  if (design === 'solid') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />;
  }

  return (
    <>
      <LinearGradient
        colors={[shade(color, 0.12), shade(color, -0.4)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {design === 'aurora' && (
        <>
          <View style={[styles.circleLarge, { backgroundColor: ink.deco }]} />
          <View style={[styles.circleSmall, { backgroundColor: ink.deco }]} />
        </>
      )}
      {design === 'stripes' && (
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 60" preserveAspectRatio="none">
          {STRIPES.map((x) => (
            <Line key={x} x1={x} y1={60} x2={x + 60} y2={0} stroke={ink.deco} strokeWidth={1.4} />
          ))}
        </Svg>
      )}
    </>
  );
}

function signedMoney(amount: number) {
  return (amount < 0 ? '-' : '') + formatMoney(amount);
}

type Props = {
  width?: number; // omit to stretch to the parent's width
  title: string;
  subtitle: string;
  icon: string;
  balance: number;
  income: number;
  spending: number;
  color: string;
  design: CardDesign;
  last4?: string;
};

export function AccountCard({ width, title, subtitle, icon, balance, income, spending, color, design, last4 }: Props) {
  const ink = inkFor(color);

  return (
    <View style={[styles.card, width ? { width } : styles.stretch]}>
      <CardBackground color={color} design={design} />

      <View style={styles.top}>
        <View style={[styles.iconChip, { backgroundColor: ink.chip }]}>
          <Text style={styles.iconText}>{icon}</Text>
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
        <Text style={[styles.balanceLabel, { color: ink.muted }]}>BALANCE</Text>
        <Text
          style={[styles.balanceAmount, { color: ink.main }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {signedMoney(balance)}
        </Text>
      </View>

      <View style={[styles.bottom, { borderTopColor: ink.line }]}>
        <View>
          <Text style={[styles.splitLabel, { color: ink.muted }]}>Income</Text>
          <Text style={[styles.splitValue, { color: ink.main }]}>{formatMoney(income)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.splitLabel, { color: ink.muted }]}>Spending</Text>
          <Text style={[styles.splitValue, { color: ink.main }]}>{formatMoney(spending)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  card: {
    height: 196,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stretch: { alignSelf: 'stretch' },
  circleLarge: {
    position: 'absolute',
    width: '62%',
    aspectRatio: 1,
    borderRadius: 999,
    top: '-38%',
    right: '-16%',
  },
  circleSmall: {
    position: 'absolute',
    width: '40%',
    aspectRatio: 1,
    borderRadius: 999,
    bottom: '-30%',
    left: '-8%',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 12, fontWeight: '500' },
  last4: { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  balanceLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  balanceAmount: { fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 2 },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  splitLabel: { fontSize: 12, fontWeight: '500' },
  splitValue: { fontSize: 15, fontWeight: '700', marginTop: 1 },
});