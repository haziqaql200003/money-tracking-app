/* Reanimated shared values are written with `.value =` inside worklets; the compiler lint rule can't tell. */
/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useColorScheme, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Glass, hasNativeGlass } from '@/components/glass/glass';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** One node per slot. Each slot handles its own taps (Pressable) and calls `onSelect`. */
  slots: ReactNode[];
  /** The slot the glass lens currently rests on. */
  index: number;
  height: number;
  radius: number;
  /** Gap between the lens and the track edge. */
  inset?: number;
  /** Slots the lens may not rest on (e.g. an action button in the middle of a tab bar). */
  disabled?: number[];
  /** Called when the lens settles on a different slot after being dragged. */
  onSelect: (index: number) => void;
  /** Track surface drawn behind the lens (a Glass pill, a solid fill, …). */
  background?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const GLIDE = { damping: 17, stiffness: 230, mass: 0.9 } as const;
const POP = { damping: 14, stiffness: 260, mass: 0.7 } as const;

/**
 * A row of slots with a glass "lens" under the active one, like the iOS 26 toggle thumb.
 * - Touch down: the lens swells straight away (before you move).
 * - Tap a slot: it glides there and stretches a little in the direction of travel.
 * - Hold and drag sideways: it follows your finger, squashes/stretches with speed, rubber-bands at the ends,
 *   and settles on the slot your momentum points to.
 * The drag only activates for a horizontal move and gives up on a vertical one, so lists keep scrolling.
 */
export function SlidingGlassTrack({ slots, index, height, radius, inset = 4, disabled, onSelect, background, style }: Props) {
  const colors = useTheme();
  const dark = useColorScheme() === 'dark';
  const count = slots.length;

  const [width, setWidth] = useState(0);
  const slotW = width / count;
  const thumbW = Math.max(0, slotW - inset * 2);
  const thumbH = height - inset * 2;
  const disabledKey = (disabled ?? []).join(',');

  const x = useSharedValue(0);
  const pressed = useSharedValue(0); // 0 → 1 while a finger is down
  const speed = useSharedValue(0); // |velocity| of the drag, smoothed
  const bump = useSharedValue(0); // little stretch when a tap moves the lens
  const dragging = useSharedValue(false);
  const startX = useSharedValue(0);
  const placed = useSharedValue(false);

  // The latest index/onSelect for the JS callback fired from the gesture.
  const [live] = useState(() => ({ index, onSelect }));
  useEffect(() => {
    Object.assign(live, { index, onSelect });
  });

  useEffect(() => {
    if (width === 0) return;
    const target = index * slotW + inset;
    if (!placed.value) {
      placed.value = true;
      x.value = target;
      return;
    }
    if (dragging.value) return;
    x.value = withSpring(target, GLIDE);
    bump.value = withSequence(withTiming(1, { duration: 110 }), withSpring(0, POP));
  }, [index, width, slotW, inset, x, placed, dragging, bump]);

  const pan = useMemo(() => {
    const min = inset;
    const max = (count - 1) * slotW + inset;
    const blocked = disabledKey ? disabledKey.split(',').map(Number) : [];
    const choose = (i: number) => {
      if (i !== live.index) live.onSelect(i);
    };

    return Gesture.Pan()
      .activeOffsetX([-5, 5])
      .failOffsetY([-14, 14])
      .onBegin(() => {
        pressed.value = withSpring(1, POP);
      })
      .onStart(() => {
        dragging.value = true;
        startX.value = x.value;
      })
      .onUpdate((e) => {
        const raw = startX.value + e.translationX;
        // Rubber band past the ends instead of a hard stop.
        const next = raw < min ? min + (raw - min) * 0.25 : raw > max ? max + (raw - max) * 0.25 : raw;
        x.value = next;
        speed.value = withTiming(Math.abs(e.velocityX), { duration: 80 });
      })
      .onEnd((e) => {
        const projected = Math.max(min, Math.min(max, x.value + e.velocityX * 0.1)) + thumbW / 2;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < count; i++) {
          if (blocked.indexOf(i) !== -1) continue;
          const d = Math.abs(i * slotW + inset + thumbW / 2 - projected);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        x.value = withSpring(best * slotW + inset, { ...GLIDE, velocity: e.velocityX });
        scheduleOnRN(choose, best);
      })
      .onFinalize(() => {
        dragging.value = false;
        pressed.value = withSpring(0, POP);
        speed.value = withSpring(0, POP);
      });
  }, [count, slotW, thumbW, inset, disabledKey, live, x, pressed, speed, dragging, startX]);

  const thumbStyle = useAnimatedStyle(() => {
    const s = Math.min(speed.value / 3200, 0.22) + bump.value * 0.12;
    return {
      transform: [
        { translateX: x.value },
        { scaleX: 1 + pressed.value * 0.14 + s },
        { scaleY: 1 + pressed.value * 0.12 - s * 0.35 },
      ],
    };
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <GestureHandlerRootView style={[{ height }, style]} onLayout={onLayout}>
      <GestureDetector gesture={pan}>
        <Animated.View style={styles.fill} collapsable={false}>
          {background ? <View style={StyleSheet.absoluteFill}>{background}</View> : null}

          {width > 0 ? (
            <Animated.View pointerEvents="none" style={[styles.thumb, { top: inset, width: thumbW, height: thumbH }, thumbStyle]}>
              {hasNativeGlass() ? (
                <Glass variant="clear" interactive radius={radius - inset} tint={`${colors.accent}33`} style={styles.fill} />
              ) : (
                <View
                  style={[
                    styles.fill,
                    styles.fallbackThumb,
                    {
                      borderRadius: radius - inset,
                      backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.96)',
                      borderColor: dark ? 'rgba(255,255,255,0.22)' : 'rgba(20,26,46,0.06)',
                    },
                  ]}
                />
              )}
            </Animated.View>
          ) : null}

          <View style={styles.row}>
            {slots.map((slot, i) => (
              <View key={i} style={styles.slot}>
                {slot}
              </View>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  thumb: { position: 'absolute', left: 0 },
  fill: { flex: 1 },
  fallbackThumb: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#0C1020',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  row: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  slot: { flex: 1 },
});
