import { useIsFocused } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ReactNode } from 'react';
import { Animated, GestureResponderEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { CARD_RADIUS } from './shared';
import { gyroX, gyroY, useGyro, useGyroEnabled, useMotionAllowed } from './motion';

const MAX_TILT_DEG = 14;
const SPRING = { useNativeDriver: true, speed: 14, bounciness: 9 } as const;

type Props = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Makes a card feel physical: it tilts in 3D under your finger and springs back on release,
 * and it also leans gently with the phone (gyro). Touch is only observed, never claimed, so the
 * carousel still scrolls and the eye button / card tap still work.
 */
export function TiltCard({ style, children }: Props) {
  const allowed = useMotionAllowed();
  const focused = useIsFocused();
  const gyroEnabled = useGyroEnabled();
  useGyro(allowed && focused && gyroEnabled);

  const [touchX] = useState(() => new Animated.Value(0));
  const [touchY] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(0));
  const box = useRef<View>(null);
  const frame = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const measure = () =>
    box.current?.measureInWindow((x, y, w, h) => {
      frame.current = { x, y, w, h };
    });

  const aim = (e: GestureResponderEvent) => {
    const f = frame.current;
    if (!f || f.w === 0 || f.h === 0) return;
    const nx = ((e.nativeEvent.pageX - f.x) / f.w) * 2 - 1;
    const ny = ((e.nativeEvent.pageY - f.y) / f.h) * 2 - 1;
    touchX.setValue(Math.max(-1, Math.min(1, nx)));
    touchY.setValue(Math.max(-1, Math.min(1, ny)));
  };

  const release = () => {
    frame.current = null;
    Animated.parallel([
      Animated.spring(touchX, { toValue: 0, ...SPRING }),
      Animated.spring(touchY, { toValue: 0, ...SPRING }),
      Animated.spring(press, { toValue: 0, ...SPRING }),
    ]).start();
  };

  const rotateY = Animated.add(touchX, gyroX).interpolate({
    inputRange: [-1.6, 1.6],
    outputRange: [`-${MAX_TILT_DEG * 1.6}deg`, `${MAX_TILT_DEG * 1.6}deg`],
    extrapolate: 'clamp',
  });
  // Touching the top edge pushes the top away from you (positive rotateX), hence the minus on touch.
  const rotateX = Animated.subtract(gyroY, touchY).interpolate({
    inputRange: [-1.6, 1.6],
    outputRange: [`-${MAX_TILT_DEG * 1.6}deg`, `${MAX_TILT_DEG * 1.6}deg`],
    extrapolate: 'clamp',
  });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });
  // A bright diagonal band that slides across the card as it tilts. Brighter while pressed.
  const glareX = Animated.add(touchX, gyroX).interpolate({ inputRange: [-1.6, 1.6], outputRange: [-170, 170], extrapolate: 'clamp' });
  const glareOpacity = press.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <Animated.View
      ref={box}
      style={[
        styles.wrap,
        style,
        { transform: [{ perspective: 900 }, { rotateX }, { rotateY }, { scale }] },
      ]}
      onTouchStart={(e) => {
        if (!allowed) return;
        measure();
        Animated.spring(press, { toValue: 1, ...SPRING }).start();
        // measureInWindow answers asynchronously; aim again on the first move.
        aim(e);
      }}
      onTouchMove={(e) => allowed && aim(e)}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      {children}
      {allowed ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glareOpacity }]}>
          <Animated.View style={[styles.glare, { transform: [{ translateX: glareX }, { rotate: '18deg' }] }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: CARD_RADIUS, overflow: 'hidden' },
  glare: { position: 'absolute', top: '-30%', bottom: '-30%', left: '22%', width: '56%' },
});
