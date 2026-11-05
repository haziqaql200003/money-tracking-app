import React, { useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, G, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { TitaniumFinish } from '@/constants/card-styles';

import { CARD_RADIUS, CardContent, WakiraCardProps, cardBase, useSweep } from './shared';

export type TitaniumKind = 'contour' | 'flux' | 'reserve' | 'deco';

type Finish = {
  /** Brushed-metal body, light to dark. */
  base: [string, string, string];
  /** Colour of the engraved lines. */
  line: string;
  /** Highlight (hex + strength) for the top glow and the gliding band of light. */
  hi: string;
  hiAlpha: number;
  text: string;
  sub: string;
  /** Bevelled rim: lit edge, shaded edge. */
  edge: [string, string];
};

export const FINISHES: Record<TitaniumFinish, Finish> = {
  graphite: { base: ['#2B2B30', '#141417', '#0A0A0C'], line: '#A3A3AD', hi: '#FFFFFF', hiAlpha: 0.2, text: '#E8E8EC', sub: 'rgba(200,200,208,0.72)', edge: ['#9A9AA3', '#2A2A2F'] },
  champagne: { base: ['#2C2721', '#16130F', '#0B0A08'], line: '#CDAE70', hi: '#FFE6B4', hiAlpha: 0.26, text: '#F1DFB8', sub: 'rgba(220,196,150,0.75)', edge: ['#D8B878', '#3A2F1E'] },
  rose: { base: ['#2D2423', '#161111', '#0B0909'], line: '#D49C88', hi: '#FFCDBE', hiAlpha: 0.26, text: '#F3D5CB', sub: 'rgba(225,180,165,0.75)', edge: ['#E0A690', '#3B2722'] },
  silver: { base: ['#3A3C42', '#202227', '#121317'], line: '#D7DAE0', hi: '#FFFFFF', hiAlpha: 0.32, text: '#F4F5F8', sub: 'rgba(220,224,232,0.78)', edge: ['#ECEEF2', '#4A4C52'] },
  midnight: { base: ['#1D2333', '#0F1320', '#080A12'], line: '#93A6CB', hi: '#BED2FF', hiAlpha: 0.24, text: '#E2E8F6', sub: 'rgba(175,190,220,0.75)', edge: ['#A3B5D8', '#1E2536'] },
};

/** Swatch colours for the finish picker (lit side, dark side). */
export const FINISH_SWATCH: Record<TitaniumFinish, [string, string]> = {
  graphite: ['#55555C', '#141417'],
  champagne: ['#E2C68A', '#5A4626'],
  rose: ['#E7B3A0', '#5C3A31'],
  silver: ['#F0F2F6', '#6A6D74'],
  midnight: ['#7F93BD', '#141A2B'],
};

const noise = (a: number) => Math.abs(Math.sin(a * 12.9898 + 78.233) * 43758.5453) % 1;

// Brushed grain: fine horizontal lines, each with a fixed pseudo-random brightness.
const GRAIN = Array.from({ length: 163 }, (_, i) => {
  const n = noise(i);
  return { y: i * 1.2, light: n > 0.5, o: n * 0.07 };
});

type Line = { d: string; w: number; o: number; dy?: number };

// ---- Patterns (geometry is fixed; the finish only changes colour) ----
function contourLines(): Line[] {
  const out: Line[] = [];
  const loops = (cx: number, cy: number, n: number, start: number, step: number, seed: number) => {
    for (let i = 0; i < n; i++) {
      let d = '';
      for (let k = 0; k <= 72; k++) {
        const a = (k / 72) * Math.PI * 2;
        const r = start + i * step + 6 * Math.sin(3 * a + i * 0.35 + seed) + 4 * Math.sin(5 * a - i * 0.2 + seed * 2) + 3 * Math.sin(2 * a + seed);
        d += `${k ? 'L' : 'M'}${(cx + r * Math.cos(a) * 1.25).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} `;
      }
      out.push({ d: d + 'Z', w: 0.7, o: 0.42 });
    }
  };
  loops(70, 190, 16, 14, 9, 0.4);
  loops(300, 10, 11, 10, 9, 1.7);
  return out;
}

function reserveLines(): Line[] {
  const out: Line[] = [];
  for (let k = 0; k < 9; k++) {
    const o = k * 3.2;
    out.push({ d: `M${110 + o} -10 L${300 + o} 210`, w: 0.6, o: 0.5 });
    out.push({ d: `M${40 + o} 210 L${250 + o} -10`, w: 0.6, o: 0.5 });
  }
  out.push({ d: 'M0 64 L330 64', w: 0.6, o: 0.6 }, { d: 'M0 150 L330 150', w: 0.5, o: 0.35 });
  return out;
}

const FLUX_TOP = 'M-10 70 C 80 40, 140 140, 220 110 S 320 40, 350 60';
const FLUX_BOT = 'M-10 170 C 90 150, 150 205, 230 176 S 320 130, 350 142';
function fluxLines(): Line[] {
  const out: Line[] = [];
  for (let k = 1; k <= 6; k++) {
    out.push({ d: FLUX_TOP, w: 0.5, o: 0.4 - k * 0.04, dy: 12 + k * 4 });
    out.push({ d: FLUX_BOT, w: 0.5, o: 0.36 - k * 0.04, dy: -10 - k * 4 });
  }
  return out;
}

function decoLines(): Line[] {
  const out: Line[] = [];
  for (let k = 0; k < 6; k++) out.push({ d: `M340 ${66 - k * 11} L${262 + k * 7} 98 L340 ${130 + k * 11}`, w: 0.7, o: 0.75 - k * 0.07 });
  out.push({ d: 'M10 10 H320 V186 H10 Z', w: 0.7, o: 0.45 }, { d: 'M15 15 H315 V181 H15 Z', w: 0.5, o: 0.3 });
  const corners: [number, number, number, number][] = [[10, 10, 1, 1], [320, 10, -1, 1], [10, 186, 1, -1], [320, 186, -1, -1]];
  corners.forEach(([x, y, dx, dy]) => {
    out.push({ d: `M${x + dx * 26} ${y} L${x} ${y + dy * 26}`, w: 0.6, o: 0.55 });
    out.push({ d: `M${x + dx * 36} ${y} L${x} ${y + dy * 36}`, w: 0.5, o: 0.35 });
  });
  return out;
}

const LINES: Record<TitaniumKind, Line[]> = {
  contour: contourLines(),
  flux: fluxLines(),
  reserve: reserveLines(),
  deco: decoLines(),
};

/** The engraved pattern on its own (also used by the small picker previews). */
export function TitaniumPattern({ kind, finish }: { kind: TitaniumKind; finish: TitaniumFinish }) {
  const f = FINISHES[finish];
  const gid = `fx-${finish}`;
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
      {kind === 'flux' ? (
        <>
          <Defs>
            <SvgLinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity="0.7" />
              <Stop offset="0.5" stopColor={f.line} stopOpacity="0.28" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0.5" />
            </SvgLinearGradient>
          </Defs>
          <Path d={FLUX_TOP} fill="none" stroke={`url(#${gid})`} strokeWidth={16} strokeLinecap="round" />
          <Path d={FLUX_BOT} fill="none" stroke={`url(#${gid})`} strokeWidth={12} strokeLinecap="round" />
        </>
      ) : null}
      {LINES[kind].map((l, i) => (
        // Engraved line: a dark groove with a thin highlight just below it.
        <G key={i} transform={l.dy ? `translate(0 ${l.dy})` : undefined}>
          <Path d={l.d} fill="none" stroke="#000000" strokeOpacity={0.55} strokeWidth={l.w + 0.5} />
          <Path d={l.d} fill="none" stroke={f.line} strokeOpacity={Math.max(0.05, l.o)} strokeWidth={l.w} transform="translate(0 0.6)" />
        </G>
      ))}
    </Svg>
  );
}

const TIER: Record<TitaniumKind, string> = {
  contour: 'CONTOUR', // i18n-ignore: tier name
  flux: 'FLUX', // i18n-ignore: tier name
  reserve: 'RESERVE', // i18n-ignore: tier name
  deco: 'DECO', // i18n-ignore: tier name
};

/**
 * Titanium Metallic series (3.6.0): brushed titanium with no chip, an engraved pattern per design,
 * a bevelled rim and a soft band of light that glides across now and then. Comes in five finishes.
 */
export function TitaniumSeriesCard({
  kind,
  finish = 'graphite',
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
}: WakiraCardProps & { kind: TitaniumKind; finish?: TitaniumFinish }) {
  const f = FINISHES[finish] ?? FINISHES.graphite;
  const [width, setWidth] = useState(330);
  const sweep = useSweep(2800, 5600);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-180, width + 40] });
  const glowId = `tis-hi-${finish}`;

  return (
    <View style={[styles.card, { backgroundColor: f.base[1] }, style]} onLayout={onLayout}>
      <LinearGradient colors={f.base} locations={[0, 0.45, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />

      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 330 196" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <RadialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={f.hi} stopOpacity={f.hiAlpha} />
            <Stop offset="1" stopColor={f.hi} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {GRAIN.map((g) => (
          <Rect key={g.y} x="0" y={g.y} width="330" height="0.6" fill={g.light ? '#FFFFFF' : '#000000'} opacity={g.o} />
        ))}
        <Ellipse cx="100" cy="-24" rx="300" ry="110" fill={`url(#${glowId})`} />
      </Svg>

      <TitaniumPattern kind={kind} finish={finish} />

      {/* Band of light gliding across */}
      <Animated.View pointerEvents="none" style={[styles.sweep, { transform: [{ translateX }, { rotate: '12deg' }] }]}>
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

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
        color={f.text}
        subColor={f.sub}
        tier={TIER[kind]}
        engraved
      />

      {/* Bevelled rim: lit along the top and left, shaded along the bottom and right */}
      <View
        pointerEvents="none"
        style={[styles.rim, { borderTopColor: f.edge[0], borderLeftColor: f.edge[0], borderBottomColor: f.edge[1], borderRightColor: f.edge[1] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  sweep: { position: 'absolute', top: -40, bottom: -40, width: 120 },
  rim: { ...StyleSheet.absoluteFill, borderRadius: CARD_RADIUS, borderWidth: 1, opacity: 0.8 },
});
