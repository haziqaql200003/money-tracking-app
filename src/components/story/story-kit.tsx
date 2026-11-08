import { useEffect, useState, type ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  ZoomIn,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Small animated building blocks shared by the three story reports. */

/** The receipt look used to have a typewriter font; since 3.7.0 the whole app uses Manrope, with even-width digits. */
export const MONO = 'Manrope_500Medium';

/** Slides up and fades in, `delay` ms after the slide opens. */
export function Rise({ delay = 0, style, children }: { delay?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(650)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Grows from small with a little bounce. */
export function Pop({ delay = 0, style, children }: { delay?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Animated.View entering={ZoomIn.delay(delay).duration(520).springify().damping(13)} style={style}>
      {children}
    </Animated.View>
  );
}

/** A number that counts up from 0 to `value` once, then stays. */
export function CountUp({ value, format, duration = 1300, delay = 0, style }: { value: number; format: (n: number) => string; duration?: number; delay?: number; style?: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const step = (now: number) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / duration);
        setShown(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, duration, delay]);
  return <Text style={style}>{format(shown)}</Text>;
}

/** A horizontal bar that fills to `pct` (0-100). */
export function GrowBar({ pct, color, delay = 0, height = 10, track }: { pct: number; color: string; delay?: number; height?: number; track: string }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(Math.max(0, Math.min(100, pct)), { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [pct, delay, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <Animated.View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color }, style]} />
    </Animated.View>
  );
}

/** A vertical column that grows up to `height` px. */
export function GrowCol({ height, color, delay = 0, dashed, radius = 8 }: { height: number; color: string; delay?: number; dashed?: boolean; radius?: number }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(height, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [height, delay, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View
      style={[
        { width: '100%', borderTopLeftRadius: radius, borderTopRightRadius: radius, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
        dashed ? { borderWidth: 2, borderStyle: 'dashed', borderColor: color } : { backgroundColor: color },
        style,
      ]}
    />
  );
}

/** Drifts gently forever: the floating shapes behind a slide. */
export function Drift({ style, dx = 14, dy = -22, duration = 3500, children }: { style?: StyleProp<ViewStyle>; dx?: number; dy?: number; duration?: number; children?: ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [duration, t]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: dx * t.value }, { translateY: dy * t.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Slow spin, for the dashed ring. */
export function Spin({ style, duration = 18000 }: { style?: StyleProp<ViewStyle>; duration?: number }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [duration, r]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={[style, anim]} />;
}

/** A rubber stamp: lands big and tilted, then settles. */
export function Stamp({ delay = 0, rotate = -12, style, children }: { delay?: number; rotate?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withTiming(1, { duration: 650, easing: Easing.out(Easing.back(2.2)) }));
  }, [delay, s]);
  const anim = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value * 2), transform: [{ rotate: `${rotate - 10 * (1 - s.value)}deg` }, { scale: 2.4 - 1.4 * s.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Paper feeding out of a printer slot: the content slides down from behind the top edge once its height is known. */
export function Feed({ duration = 1000, style, children }: { duration?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const p = useSharedValue(0);
  const [h, setH] = useState(0);
  useEffect(() => {
    if (h > 0) p.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [h, duration, p]);
  const anim = useAnimatedStyle(() => ({ opacity: h > 0 ? 1 : 0, transform: [{ translateY: -(1 - p.value) * (h + 12) }] }));
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={anim}>
        {children}
      </Animated.View>
    </View>
  );
}

/** A receipt line being printed: a strip of paper colour slides off it from left to right. */
export function Print({ delay = 0, paper, duration = 420, children }: { delay?: number; paper: string; duration?: number; children: ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.linear }));
  }, [delay, duration, p]);
  const cover = useAnimatedStyle(() => ({ width: `${(1 - p.value) * 100}%` }));
  return (
    <View>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: paper }, cover]} />
    </View>
  );
}

/** Grows along one axis from its start edge (left, or bottom with `axis="y"`, or top with `from="top"`). */
export function Grow({ axis = 'x', from, delay = 0, duration = 1000, style, children }: { axis?: 'x' | 'y'; from?: 'top' | 'bottom'; delay?: number; duration?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [delay, duration, p]);
  const anim = useAnimatedStyle(() => (axis === 'x' ? { transform: [{ scaleX: p.value }] } : { transform: [{ scaleY: p.value }] }));
  const origin = axis === 'x' ? 'left' : from === 'top' ? 'top' : 'bottom';
  return <Animated.View style={[{ transformOrigin: origin }, style, anim]}>{children}</Animated.View>;
}

/** Turns in from a quarter turn back and settles on a diamond (45 degrees). */
export function SpinIn({ delay = 0, style, children }: { delay?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, [delay, p]);
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ rotate: `${-135 + 180 * p.value}deg` }, { scale: 0.4 + 0.6 * p.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A ring that fills to `pct` (0-100). */
export function ProgressRing({ pct, size = 76, stroke = 8, color, track, delay = 0 }: { pct: number; size?: number; stroke?: number; color: string; track: string; delay?: number }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(Math.max(0, Math.min(100, pct)) / 100, { duration: 1400, easing: Easing.out(Easing.cubic) }));
  }, [pct, delay, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${C} ${C}`} animatedProps={props} />
    </Svg>
  );
}
