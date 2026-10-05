import React, { useMemo, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { DEFAULT_ACCENT, hexToHsl, hslToHex, tone } from './palette';
import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useLoop, useSweep } from './shared';

const VIEW = '0 0 330 196';

// Stars (fixed positions so the card looks the same every time)
const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 83) % 330,
  y: 4 + ((i * 47) % 110),
  r: 0.4 + ((i * 13) % 10) / 14,
  o: 0.35 + ((i * 29) % 10) / 16,
  group: i % 2,
}));

// Light rays hanging from the front curtain
const RAYS = Array.from({ length: 14 }, (_, k) => ({
  x: -6 + k * 25 + ((k * 7) % 9),
  seed: (k * 37) % 25,
}));

// Glints on the lake: [x, y, width]
const SHIMMER: [number, number, number][] = [
  [30, 150, 120], [150, 153, 90], [60, 159, 70], [190, 162, 60], [20, 168, 50],
  [120, 172, 80], [230, 177, 40], [70, 184, 60], [170, 190, 50],
];

// Pine trees along the shore: [x, base y, half width, height]
const PINES: [number, number, number, number][] = [
  [6, 145, 10, 30], [18, 145, 8, 24], [28, 145, 7, 18],
  [226, 146, 7, 20], [236, 146, 9, 28], [300, 146, 9, 30], [312, 146, 7, 22], [322, 146, 8, 26],
];

function Stars({ group, duration, from, to }: { group: number; duration: number; from: number; to: number }) {
  const t = useLoop(duration);
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid slice">
        {STARS.filter((s) => s.group === group).map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.o} />
        ))}
      </Svg>
    </Animated.View>
  );
}

type RibbonProps = {
  id: string;
  color: string;
  fringe: string;
  edge: string;
  base: number;
  amp: number;
  duration: number;
  dx: number;
  dy: number;
  rays?: boolean;
};

// One aurora curtain: bright lower edge, a pink-violet fringe fading upward, optional rays
function Ribbon({ id, color, fringe, edge, base, amp, duration, dx, dy, rays }: RibbonProps) {
  const t = useLoop(duration);
  const wave = `C 300 ${base - amp}, 250 ${base + amp}, 200 ${base - amp * 0.4} S 100 ${base + amp * 0.9}, 50 ${base - amp * 0.6} S -10 ${base + amp * 0.3}, -20 ${base}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ribbon,
        {
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dy, -dy] }) },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="-20 0 360 196" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgLinearGradient id={`rb-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={base + amp}>
            <Stop offset="0" stopColor={fringe} stopOpacity="0" />
            <Stop offset="0.4" stopColor={fringe} stopOpacity="0.14" />
            <Stop offset="0.75" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0.9" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`ry-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={edge} stopOpacity="0" />
            <Stop offset="1" stopColor={edge} stopOpacity="0.3" />
          </SvgLinearGradient>
        </Defs>
        <Path d={`M-20 0 L340 0 L340 ${base} ${wave} Z`} fill={`url(#rb-${id})`} />
        {rays
          ? RAYS.map((r, k) => (
              <Rect key={k} x={r.x} y={12 + r.seed} width={1.2} height={Math.max(8, base - amp + 4 - r.seed)} fill={`url(#ry-${id})`} />
            ))
          : null}
        <Path d={`M340 ${base} ${wave}`} fill="none" stroke={edge} strokeWidth={0.8} opacity={0.35} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Aurora Borealis: northern lights dancing over snowy peaks, a still lake that mirrors them,
 * pines on the shore and a small cabin with a warm light on. Stars twinkle and the odd
 * shooting star crosses the sky.
 */
export function AuroraCard({
  bank,
  icon,
  balance,
  last4,
  hidden,
  onToggleHidden,
  income,
  spending,
  side = 'front',
  onFlip,
  accent = DEFAULT_ACCENT.aurora,
  style,
}: WakiraCardProps) {
  const back = side === 'back';
  const [width, setWidth] = useState(330);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const shimmer = useLoop(4200);
  const flicker = useLoop(1900);
  const shoot = useSweep(900, 6500);

  const k = accent.replace('#', '');
  const c = useMemo(() => {
    const h = hexToHsl(accent).h;
    const blue = hslToHex(h + 45, 85, 62);
    const lift = (hex: string) => tone(hex, 0, -10, 22);
    return {
      main: accent,
      blue,
      fringe: hslToHex(h + 130, 85, 70),
      edgeMain: lift(accent),
      edgeBlue: lift(blue),
      sky: [hslToHex(h + 60, 70, 4), hslToHex(h + 50, 60, 10), hslToHex(h + 10, 55, 15)],
      peak: [hslToHex(h + 45, 40, 28), hslToHex(h + 50, 50, 11)],
      snow: hslToHex(h, 60, 92),
      ridge: hslToHex(h + 45, 60, 7),
      lake: [hslToHex(h + 10, 65, 8), hslToHex(h + 50, 70, 4)],
      shore: hslToHex(h + 50, 70, 4),
    };
  }, [accent]);

  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  const shimmerO = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1, 0.7] });
  const glow = flicker.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [1, 0.82, 0.95, 0.78] });
  const shootX = shoot.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.25, width * 0.2] });
  const shootY = shoot.interpolate({ inputRange: [0, 1], outputRange: [22, -14] });
  const shootO = shoot.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View style={[styles.card, { backgroundColor: c.sky[0] }, style]} onLayout={onLayout}>
      {/* Night sky and the glow along the horizon */}
      <Svg style={StyleSheet.absoluteFill} viewBox={VIEW} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgLinearGradient id={`au-sky-${k}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.sky[0]} />
            <Stop offset="0.55" stopColor={c.sky[1]} />
            <Stop offset="0.72" stopColor={c.sky[2]} />
          </SvgLinearGradient>
          <RadialGradient id={`au-hz-${k}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={c.main} stopOpacity="0.28" />
            <Stop offset="1" stopColor={c.main} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="330" height="196" fill={`url(#au-sky-${k})`} />
        <Ellipse cx="165" cy="128" rx="190" ry="34" fill={`url(#au-hz-${k})`} />
      </Svg>

      <Stars group={0} duration={3000} from={0.35} to={1} />
      <Stars group={1} duration={3700} from={1} to={0.3} />

      {/* Shooting star */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: shootO, transform: [{ translateX: shootX }, { translateY: shootY }] }]}
      >
        <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <SvgLinearGradient id={`au-ss-${k}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.95" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M236 22 L282 6" stroke={`url(#au-ss-${k})`} strokeWidth={1.2} strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* Aurora curtains (back to front) */}
      <Ribbon id={`${k}-3`} color={c.blue} fringe={c.fringe} edge={c.edgeBlue} base={60} amp={20} duration={15000} dx={12} dy={4} />
      <Ribbon id={`${k}-2`} color={c.main} fringe={c.fringe} edge={c.edgeMain} base={92} amp={16} duration={12000} dx={14} dy={5} />
      <Ribbon id={`${k}-1`} color={c.main} fringe={c.fringe} edge={c.edgeMain} base={78} amp={22} duration={9000} dx={16} dy={6} rays />

      {/* Mountains, lake, pines and the cabin */}
      <Svg style={StyleSheet.absoluteFill} viewBox={VIEW} preserveAspectRatio="xMidYMid slice" pointerEvents="none">
        <Defs>
          <SvgLinearGradient id={`au-peak-${k}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.peak[0]} />
            <Stop offset="1" stopColor={c.peak[1]} />
          </SvgLinearGradient>
          <SvgLinearGradient id={`au-lake-${k}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.lake[0]} />
            <Stop offset="1" stopColor={c.lake[1]} />
          </SvgLinearGradient>
          <SvgLinearGradient id={`au-refl-${k}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.main} stopOpacity="0.45" />
            <Stop offset="1" stopColor={c.main} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M0 132 L30 112 L52 120 L84 92 L112 116 L138 104 L170 124 L200 98 L232 118 L262 100 L298 122 L330 108 L330 145 L0 145 Z"
          fill={`url(#au-peak-${k})`}
        />
        <Path
          d="M84 92 L74 100 L80 99 L86 103 L92 98 L98 101 Z M200 98 L190 106 L197 105 L202 109 L208 104 L214 107 Z M262 100 L253 107 L259 106 L264 110 L270 105 L276 108 Z"
          fill={c.snow}
          opacity={0.85}
        />
        <Path
          d="M0 140 L40 126 L70 134 L110 122 L150 136 L190 128 L230 138 L270 126 L330 136 L330 146 L0 146 Z"
          fill={c.ridge}
        />
        <Rect y="145" width="330" height="51" fill={`url(#au-lake-${k})`} />
        <Rect y="146" width="330" height="50" fill={`url(#au-refl-${k})`} opacity={0.55} />
        <G fill={c.shore}>
          {PINES.map(([x, y, w, h]) => (
            <Path key={x} d={`M${x} ${y - h} L${x + w} ${y} L${x - w} ${y} Z`} />
          ))}
          <Rect x="258" y="134" width="20" height="12" />
          <Path d="M255 135 L268 125 L281 135 Z" />
        </G>
      </Svg>

      {/* Light dancing on the water */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: shimmerO, transform: [{ translateX: shimmerX }] }]}
      >
        <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid slice">
          {SHIMMER.map(([x, y, w], i) => (
            <Rect key={i} x={x} y={y} width={w} height={0.7} rx={0.35} fill="#E8FFF8" opacity={0.28 - i * 0.02} />
          ))}
        </Svg>
      </Animated.View>

      {/* The cabin's warm window and its reflection */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glow }]}>
        <Svg width="100%" height="100%" viewBox={VIEW} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <RadialGradient id={`au-win-${k}`} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#FFC66B" stopOpacity="0.9" />
              <Stop offset="1" stopColor="#FFC66B" stopOpacity="0" />
            </RadialGradient>
            <SvgLinearGradient id={`au-wref-${k}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFC66B" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#FFC66B" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx="266" cy="140" rx="14" ry="10" fill={`url(#au-win-${k})`} />
          <Rect x="263" y="137.5" width="5" height="4" fill="#FFD27A" />
          <Rect x="263" y="147" width="5" height="26" fill={`url(#au-wref-${k})`} />
        </Svg>
      </Animated.View>

      {/* Shade so the numbers stay readable (even across the card on the back) */}
      <LinearGradient
        colors={back ? ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.35)'] : ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
        locations={[0, back ? 1 : 0.6]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <CardContent
        bank={bank}
        icon={icon}
        balance={balance}
        last4={last4}
        hidden={hidden}
        onToggleHidden={onToggleHidden}
        income={income}
        spending={spending}
        side={side}
        onFlip={onFlip}
        color="#FFFFFF"
        subColor="rgba(255,255,255,0.78)"
        tier="BOREALIS"
      />

      <View pointerEvents="none" style={styles.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  ribbon: { position: 'absolute', left: -16, right: -16, top: 0, bottom: 0 },
  border: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
});
