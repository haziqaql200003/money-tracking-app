import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { hslToHex } from './palette';
import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useLoop } from './shared';

export type SpectrumVariant = 'classic' | 'pulse' | 'cyber' | 'neon';

type Gradient = readonly [string, string, ...string[]];

/** Tempo of the built-in groove (120 BPM). One loop is two beats. */
const LOOP_MS = 1000;
const STEPS = 9; // points per loop; steps 0, 4 and 8 land on the beat
const STEP_INPUT = Array.from({ length: STEPS }, (_, j) => j / (STEPS - 1));
const BEAT_IN = [0, 0.1, 0.45, 0.5, 0.6, 0.95, 1];
const BEAT_OUT = [1, 0.6, 0.45, 1, 0.6, 0.45, 1];

const pct = (n: number) => `${n}%` as `${number}%`;
const noise = (a: number) => Math.abs(Math.sin(a * 12.9898 + 78.233) * 43758.5453) % 1;
const hue = (h: number, l = 60) => hslToHex(h, 100, l);
const RAINBOW = Array.from({ length: 7 }, (_, i) => hue(330 + (i * 360) / 7)) as unknown as Gradient;
const RING = [...RAINBOW, RAINBOW[0]] as unknown as Gradient;

/** A 0 -> 1 clock that repeats forever at a steady speed. */
function useClock(duration: number) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    return () => anim.stop();
  }, [value, duration]);
  return value;
}

/** Equaliser levels: low columns (left) kick on the beat, high ones (right) flicker. */
function makeLevels(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const bass = 1 - i / n;
    const levels = STEP_INPUT.map((_, j) => Math.min(1, 0.15 + noise(i * 31 + j * 7) * 0.55 + (j % 4 === 0 ? 0.35 * bass : 0)));
    levels[STEPS - 1] = levels[0];
    return { levels, envLow: 0.7 + noise(i) * 0.15, flip: i % 2 === 0 };
  });
}

/** A wave drawn across two card widths (660 units) so it can slide one width and loop without a jump. */
function wavePath(cy: number, amp: number, cycles: number, phase: number, step = 3) {
  let d = '';
  for (let x = 0; x <= 660; x += step) d += `${x ? 'L' : 'M'}${x} ${(cy + amp * Math.sin((2 * Math.PI * cycles * x) / 330 + phase)).toFixed(1)} `;
  return d;
}

// ---------------- Classic: bouncing RGB bars over a flowing rainbow wave ----------------
const CLASSIC_BARS = makeLevels(26);
const CLASSIC_COLORS = CLASSIC_BARS.map((_, i) => hue(330 + (i * 360) / 26));
const WAVE_A = wavePath(140, 14, 3, 0);
const WAVE_B = wavePath(140, 9, 3, 1.6);

function ClassicBar({ clock, sway, levels, envLow, flip, color }: { clock: Animated.Value; sway: Animated.Value; levels: number[]; envLow: number; flip: boolean; color: string }) {
  const beat = clock.interpolate({ inputRange: STEP_INPUT, outputRange: levels });
  const env = sway.interpolate({ inputRange: [0, 1], outputRange: flip ? [envLow, 1] : [1, envLow] });
  return <Animated.View style={[styles.bar, { backgroundColor: color, shadowColor: color, transform: [{ scaleY: Animated.multiply(beat, env) }] }]} />;
}

function ClassicLayer({ w, clock, sway }: { w: number; clock: Animated.Value; sway: Animated.Value }) {
  const flow = useClock(6000);
  const pulse = clock.interpolate({ inputRange: BEAT_IN, outputRange: BEAT_OUT });
  const flowX = flow.interpolate({ inputRange: [0, 1], outputRange: [0, -w] });
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.glow, { opacity: Animated.multiply(pulse, 0.34) }]}>
        <LinearGradient colors={RAINBOW} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <LinearGradient colors={['#07060D', 'rgba(7,6,13,0)']} pointerEvents="none" style={styles.glow} />
      <Animated.View pointerEvents="none" style={[styles.wide, { width: w * 2, transform: [{ translateX: flowX }] }]}>
        <Svg width="100%" height="100%" viewBox="0 0 660 196" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id="spc-wave" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="660" y2="0">
              {[...RAINBOW, ...RAINBOW, RAINBOW[0]].map((c, i, a) => (
                <Stop key={i} offset={i / (a.length - 1)} stopColor={c} />
              ))}
            </SvgLinearGradient>
          </Defs>
          <Path d={WAVE_A} fill="none" stroke="url(#spc-wave)" strokeWidth={2} opacity={0.55} />
          <Path d={WAVE_B} fill="none" stroke="url(#spc-wave)" strokeWidth={1.2} opacity={0.35} />
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={styles.bars}>
        {CLASSIC_BARS.map((b, i) => (
          <ClassicBar key={i} clock={clock} sway={sway} levels={b.levels} envLow={b.envLow} flip={b.flip} color={CLASSIC_COLORS[i]} />
        ))}
      </View>
    </>
  );
}

// ---------------- Pulse: four crossing neon waves that swell on every beat ----------------
const PULSE_WAVES = [
  { h: 28, amp: 33, cycles: 1, ph: 0, dir: 1, ms: 7000 },
  { h: 135, amp: 25, cycles: 2, ph: 1.3, dir: -1, ms: 9000 },
  { h: 200, amp: 31, cycles: 1, ph: 2.4, dir: 1, ms: 11000 },
  { h: 285, amp: 23, cycles: 3, ph: 3.1, dir: -1, ms: 8000 },
].map((wv) => {
  const line = wavePath(63, wv.amp, wv.cycles, wv.ph);
  // Filled band between the wave and its centre line.
  return { ...wv, line, fill: `M0 63 L${line.slice(1)} L660 63 Z`, color: hue(wv.h, 62) };
});

function PulseWave({ w, wave }: { w: number; wave: (typeof PULSE_WAVES)[number] }) {
  const t = useClock(wave.ms);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: wave.dir > 0 ? [0, -w] : [-w, 0] });
  const id = `spp-${wave.h}`;
  return (
    <Animated.View pointerEvents="none" style={[styles.wide, { width: w * 2, transform: [{ translateX }] }]}>
      <Svg width="100%" height="100%" viewBox="0 0 660 126" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={wave.color} stopOpacity="0.16" />
            <Stop offset="0.5" stopColor={wave.color} stopOpacity="0.02" />
            <Stop offset="1" stopColor={wave.color} stopOpacity="0.16" />
          </SvgLinearGradient>
        </Defs>
        <Path d={wave.fill} fill={`url(#${id})`} />
        <Path d={wave.line} fill="none" stroke={wave.color} strokeWidth={7} strokeOpacity={0.12} />
        <Path d={wave.line} fill="none" stroke={wave.color} strokeWidth={3.5} strokeOpacity={0.3} />
        <Path d={wave.line} fill="none" stroke={wave.color} strokeWidth={1.8} />
      </Svg>
    </Animated.View>
  );
}

function PulseLayer({ w, clock }: { w: number; clock: Animated.Value }) {
  const scaleY = clock.interpolate({ inputRange: BEAT_IN, outputRange: BEAT_OUT.map((b) => 0.55 + 0.45 * b) });
  return (
    <Animated.View pointerEvents="none" style={[styles.waveBand, { transform: [{ scaleY }] }]}>
      {PULSE_WAVES.map((wv) => (
        <PulseWave key={wv.h} w={w} wave={wv} />
      ))}
    </Animated.View>
  );
}

// ---------------- Cyber: LED-block equaliser ----------------
const CY_COLS = 28;
const CY_ROWS = 11;
const CYBER_LEVELS = makeLevels(CY_COLS);
const CY_W = CY_COLS * 10 - 2;
const CY_H = CY_ROWS * 10 - 2;
const CY_LIT = Array.from({ length: CY_COLS * CY_ROWS }, (_, k) => {
  const i = k % CY_COLS;
  const r = Math.floor(k / CY_COLS);
  return { x: i * 10, y: CY_H - (r + 1) * 10 + 2, color: hue(330 + (i * 360) / CY_COLS, 50 + r * 2.5) };
});

function CyberColumn({ i, colH, clock, sway }: { i: number; colH: number; clock: Animated.Value; sway: Animated.Value }) {
  const lv = CYBER_LEVELS[i];
  const beat = clock.interpolate({ inputRange: STEP_INPUT, outputRange: lv.levels });
  const env = sway.interpolate({ inputRange: [0, 1], outputRange: lv.flip ? [lv.envLow, 1] : [1, lv.envLow] });
  // A dark cover slides up to uncover the lit blocks below it.
  const translateY = Animated.multiply(Animated.multiply(beat, env), -colH);
  return (
    <View style={[styles.cyCol, { left: pct((i * 10 * 100) / CY_W), width: pct((8 * 100) / CY_W) }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.cyCover, { transform: [{ translateY }] }]} />
    </View>
  );
}

function CyberLayer({ h, clock, sway }: { h: number; clock: Animated.Value; sway: Animated.Value }) {
  const colH = Math.max(1, h * 0.6 - 14);
  return (
    <View pointerEvents="none" style={styles.cyBox}>
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CY_W} ${CY_H}`} preserveAspectRatio="none">
        {CY_LIT.map((b, k) => (
          <Rect key={k} x={b.x} y={b.y} width={8} height={8} fill={b.color} />
        ))}
      </Svg>
      {CYBER_LEVELS.map((_, i) => (
        <CyberColumn key={i} i={i} colH={colH} clock={clock} sway={sway} />
      ))}
      {/* Faint unlit blocks on top, so the whole grid always shows */}
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${CY_W} ${CY_H}`} preserveAspectRatio="none">
        {CY_LIT.map((b, k) => (
          <Rect key={k} x={b.x} y={b.y} width={8} height={8} fill="#FFFFFF" opacity={0.06} />
        ))}
      </Svg>
    </View>
  );
}

// ---------------- Neon: silk threads of light with floating sparks ----------------
const NEON_THREADS = Array.from({ length: 16 }, (_, s) => {
  const amp = 28 * (0.75 + 0.25 * Math.sin(s));
  let d = '';
  for (let x = 0; x <= 660; x += 4) {
    const y = 63 + amp * Math.sin((2 * Math.PI * x) / 330 + s * 0.22) + 9 * Math.sin((2 * Math.PI * 3 * x) / 330 + s * 0.4);
    d += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)} `;
  }
  return d;
});
const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  x: noise(i) * 100,
  size: 2 + noise(i + 3) * 2.5,
  ms: 5000 + noise(i + 7) * 5000,
  color: hue(330 + noise(i + 5) * 360, 70),
  start: noise(i + 11),
}));

function Spark({ h, spark }: { h: number; spark: (typeof SPARKS)[number] }) {
  const t = useClock(spark.ms);
  // Each spark starts at its own point in the loop so they do not rise together.
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [h * (1 - spark.start), h * (1 - spark.start) - h] });
  const opacity = t.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [0, 0.9, 0.4, 0.9, 0] });
  return (
    <Animated.View
      style={[styles.spark, { left: pct(spark.x), width: spark.size, height: spark.size, backgroundColor: spark.color, shadowColor: spark.color, opacity, transform: [{ translateY }] }]}
    />
  );
}

function NeonLayer({ w, h }: { w: number; h: number }) {
  const flow = useClock(9000);
  const sway = useLoop(3200);
  const translateX = flow.interpolate({ inputRange: [0, 1], outputRange: [0, -w] });
  const scaleY = sway.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.12] });
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.waveBand, { transform: [{ scaleY }] }]}>
        <Animated.View style={[styles.wide, { width: w * 2, transform: [{ translateX }] }]}>
          <Svg width="100%" height="100%" viewBox="0 0 660 126" preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id="spn-thread" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="660" y2="0">
                {[...RAINBOW, ...RAINBOW, RAINBOW[0]].map((c, i, a) => (
                  <Stop key={i} offset={i / (a.length - 1)} stopColor={c} />
                ))}
              </SvgLinearGradient>
            </Defs>
            {NEON_THREADS.map((d, i) => (
              <Path key={`g${i}`} d={d} fill="none" stroke="url(#spn-thread)" strokeWidth={3} strokeOpacity={0.1} />
            ))}
            {NEON_THREADS.map((d, i) => (
              <Path key={i} d={d} fill="none" stroke="url(#spn-thread)" strokeWidth={0.9} strokeOpacity={0.6} />
            ))}
          </Svg>
        </Animated.View>
      </Animated.View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {SPARKS.map((s, i) => (
          <Spark key={i} h={h} spark={s} />
        ))}
      </View>
    </>
  );
}

const TIER: Record<SpectrumVariant, string> = {
  classic: 'CLASSIC', // i18n-ignore: tier name
  pulse: 'PULSE', // i18n-ignore: tier name
  cyber: 'CYBER', // i18n-ignore: tier name
  neon: 'NEON', // i18n-ignore: tier name
};
const RIM: Record<SpectrumVariant, number> = { classic: 1.5, pulse: 2.5, cyber: 1.5, neon: 2 };

/**
 * Spectrum series (3.6.0): neon music cards on a black body with a spinning RGB rim.
 * Classic = bouncing bars, Pulse = crossing waves, Cyber = LED blocks, Neon = threads of light.
 */
export function SpectrumCard({
  variant = 'classic',
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
  style,
}: WakiraCardProps & { variant?: SpectrumVariant }) {
  const back = side === 'back';
  const rim = RIM[variant];
  const [size, setSize] = useState({ w: 330, h: 196 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const clock = useClock(LOOP_MS);
  const spin = useClock(5000);
  const sway = useLoop(3400);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ring = Math.ceil(Math.sqrt(size.w * size.w + size.h * size.h));
  const innerW = size.w - rim * 2;
  const innerH = size.h - rim * 2;

  const layer = useMemo(() => {
    if (variant === 'pulse') return <PulseLayer w={innerW} clock={clock} />;
    if (variant === 'cyber') return <CyberLayer h={innerH} clock={clock} sway={sway} />;
    if (variant === 'neon') return <NeonLayer w={innerW} h={innerH} />;
    return <ClassicLayer w={innerW} clock={clock} sway={sway} />;
  }, [variant, innerW, innerH, clock, sway]);

  return (
    <View style={[styles.card, style]} onLayout={onLayout}>
      {/* RGB rim: a rainbow spinning behind the card, showing only along the edge */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: ring, height: ring, left: (size.w - ring) / 2, top: (size.h - ring) / 2, transform: [{ rotate }] }}
      >
        <LinearGradient colors={RING} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={[styles.inner, { top: rim, left: rim, right: rim, bottom: rim, borderRadius: CARD_RADIUS - rim }]}>
        <LinearGradient colors={['#0D0A18', '#05050A']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        {layer}
        {/* Soft fade at the right edge so waves do not stop with a hard line */}
        <LinearGradient colors={['rgba(5,5,10,0)', 'rgba(5,5,10,0.6)']} start={{ x: 0.8, y: 0.5 }} end={{ x: 1, y: 0.5 }} pointerEvents="none" style={StyleSheet.absoluteFill} />
        {/* Shade so the numbers stay readable (across the whole card on the back) */}
        <LinearGradient
          colors={back ? ['rgba(5,5,10,0.72)', 'rgba(5,5,10,0.5)'] : ['rgba(5,5,10,0.55)', 'rgba(5,5,10,0)']}
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
          subColor="rgba(255,255,255,0.82)"
          tier={TIER[variant]}
        />
      </View>
    </View>
  );
}

/** Static mini preview for the design picker (the real cards animate). */
export function SpectrumThumbArt({ variant }: { variant: SpectrumVariant }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#07060D' }]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 62" preserveAspectRatio="none">
        {variant === 'classic'
          ? Array.from({ length: 16 }, (_, i) => {
              const hgt = 8 + noise(i + 1) * 22;
              return <Rect key={i} x={6 + i * 5.6} y={52 - hgt} width={3} height={hgt} rx={1.2} fill={hue(330 + i * 22)} />;
            })
          : null}
        {variant === 'pulse'
          ? PULSE_WAVES.map((wv) => {
              let d = '';
              for (let x = 0; x <= 100; x += 4) d += `${x ? 'L' : 'M'}${x} ${(40 + 10 * Math.sin((2 * Math.PI * wv.cycles * x) / 100 + wv.ph)).toFixed(1)} `;
              return <Path key={wv.h} d={d} fill="none" stroke={wv.color} strokeWidth={1.4} />;
            })
          : null}
        {variant === 'cyber'
          ? Array.from({ length: 14 }, (_, i) => {
              const lit = 2 + Math.round(noise(i + 2) * 5);
              return Array.from({ length: 7 }, (__, r) => (
                <Rect key={`${i}-${r}`} x={4 + i * 6.6} y={54 - (r + 1) * 5.4} width={5} height={4.4} fill={r < lit ? hue(330 + i * 26) : 'rgba(255,255,255,0.07)'} />
              ));
            })
          : null}
        {variant === 'neon' ? (
          <>
            {Array.from({ length: 7 }, (_, k) => {
              let d = '';
              for (let x = 0; x <= 100; x += 4) d += `${x ? 'L' : 'M'}${x} ${(40 + 9 * Math.sin((2 * Math.PI * x) / 100 + k * 0.3) + 3 * Math.sin((2 * Math.PI * 2.7 * x) / 100 + k * 0.4)).toFixed(1)} `;
              return <Path key={k} d={d} fill="none" stroke={hue(330 + k * 50, 65)} strokeWidth={0.6} />;
            })}
            {Array.from({ length: 12 }, (_, i) => (
              <Circle key={i} cx={noise(i) * 100} cy={noise(i + 50) * 62} r={0.8} fill={hue(330 + noise(i + 9) * 360, 70)} />
            ))}
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase, backgroundColor: '#05050A' },
  inner: { position: 'absolute', overflow: 'hidden' },
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  wide: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  waveBand: { position: 'absolute', left: 0, right: 0, top: '34%', height: '64%', overflow: 'hidden' },
  bars: { position: 'absolute', left: 14, right: 14, top: '58%', height: '36%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { width: 5, height: '100%', borderRadius: 3, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  cyBox: { position: 'absolute', left: 14, right: 14, top: '40%', bottom: 14 },
  cyCol: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  cyCover: { backgroundColor: '#07060D' },
  spark: { position: 'absolute', top: 0, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
});
