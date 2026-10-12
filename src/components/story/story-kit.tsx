import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Small animated building blocks shared by the three story reports. */

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

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
export function Stamp({ delay = 0, style, children }: { delay?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withTiming(1, { duration: 650, easing: Easing.out(Easing.back(2.2)) }));
  }, [delay, s]);
  const anim = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value * 2), transform: [{ rotate: '-12deg' }, { scale: 2.4 - 1.4 * s.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
