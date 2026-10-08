/* eslint-disable react-hooks/immutability */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '@/i18n';

import type { IconName } from '@/constants/categories';

export type SwipeAction = {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  onPress: () => void;
};

type Props = {
  children: ReactNode;
  /** Shown when the row is swiped left. The last one is the "go all the way" action. */
  rightActions?: SwipeAction[];
  /** Run when the row is swiped all the way left. Normally the same as the last right action. */
  onFullSwipe?: () => void;
  /** Run when the row is pulled to the right past a short distance (then the row springs back). */
  leftAction?: SwipeAction;
  /** Must match what is behind the row, so the actions stay hidden until it slides. */
  background: string;
  disabled?: boolean;
};

const ACTION_W = 76;
const SPRING = { damping: 22, stiffness: 260, mass: 0.8 };

/** A row you can swipe like WhatsApp: a little reveals buttons, all the way runs the last one. */
export function SwipeRow({ children, rightActions = [], onFullSwipe, leftAction, background, disabled }: Props) {
  const { t } = useT();
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState(false);

  const total = rightActions.length * ACTION_W;
  const fullAt = Math.max(total + 60, width * 0.55);

  // Latest callbacks for the gesture, which runs outside React's render.
  const [live] = useState(() => ({ onFullSwipe, leftAction, setOpen }));
  useEffect(() => {
    Object.assign(live, { onFullSwipe, leftAction });
  });

  const pan = useMemo(() => {
    const fire = () => live.onFullSwipe?.();
    const fireLeft = () => live.leftAction?.onPress();
    const mark = (v: boolean) => live.setOpen(v);
    return Gesture.Pan()
      .enabled(!disabled && (total > 0 || !!leftAction))
      .activeOffsetX([-10, 10])
      .failOffsetY([-12, 12])
      .onStart(() => {
        start.value = x.value;
      })
      .onUpdate((e) => {
        const raw = start.value + e.translationX;
        const maxRight = leftAction ? 130 : 0;
        const minLeft = total > 0 ? -Math.max(width, total) : 0;
        x.value = raw > maxRight ? maxRight + (raw - maxRight) * 0.2 : raw < minLeft ? minLeft : raw;
      })
      .onEnd((e) => {
        if (x.value > 90 && leftAction) {
          scheduleOnRN(fireLeft);
          x.value = withSpring(0, SPRING);
          scheduleOnRN(mark, false);
          return;
        }
        if (total > 0 && onFullSwipe && (x.value < -fullAt || (e.velocityX < -1400 && x.value < -total * 0.6))) {
          x.value = withTiming(-width, { duration: 150 });
          scheduleOnRN(fire);
          // If the row is still there afterwards (a confirmation was cancelled), bring it back.
          x.value = withDelay(350, withSpring(0, SPRING));
          scheduleOnRN(mark, false);
          return;
        }
        if (total > 0 && (x.value < -total * 0.4 || e.velocityX < -700)) {
          x.value = withSpring(-total, SPRING);
          scheduleOnRN(mark, true);
        } else {
          x.value = withSpring(0, SPRING);
          scheduleOnRN(mark, false);
        }
      });
  }, [disabled, total, leftAction, onFullSwipe, width, fullAt, live, x, start]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ width: Math.max(total, -x.value) }));
  const leftStyle = useAnimatedStyle(() => ({ width: Math.max(0, x.value), opacity: Math.min(1, Math.max(0, x.value) / 70) }));

  function close() {
    x.value = withSpring(0, SPRING);
    setOpen(false);
  }

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {leftAction ? (
        <Animated.View style={[styles.leftBox, { backgroundColor: leftAction.color }, leftStyle]}>
          <Ionicons name={leftAction.icon} size={22} color="#fff" />
        </Animated.View>
      ) : null}
      {total > 0 ? (
        <Animated.View style={[styles.rightBox, rightStyle]}>
          {rightActions.map((a, i) => {
            const last = i === rightActions.length - 1;
            return (
              <Pressable
                key={a.key}
                onPress={() => {
                  close();
                  a.onPress();
                }}
                style={[styles.action, { backgroundColor: a.color }, last ? styles.actionLast : { width: ACTION_W }]}
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                <Ionicons name={a.icon} size={20} color="#fff" />
                <Text style={styles.actionText} numberOfLines={1}>
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: background }, rowStyle]}>
          {children}
          {open ? <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('common.close')} /> : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  rightBox: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row' },
  leftBox: { position: 'absolute', left: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  action: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  actionLast: { flex: 1, minWidth: ACTION_W },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
