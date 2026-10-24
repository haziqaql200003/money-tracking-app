import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const THUMB = 52;
/** Past this share of the track, letting go confirms. */
const CONFIRM_AT = 0.82;

type Props = {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
};

/**
 * "Slide to complete": drag the knob across the track to confirm something that moves money.
 * A deliberate gesture instead of a tap, so it cannot be done by accident. Screen readers get a Confirm action.
 */
export function SlideToConfirm({ label, onConfirm, disabled }: Props) {
  const colors = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const [max, setMax] = useState(0);
  // What the gesture needs when the finger lifts. Written after each render, read only inside the handlers.
  const [done, setDone] = useState(false);

  // Rebuilt when the track is measured or the callback changes, so the handlers always see current values.
  const pan = useMemo(() => {
    const back = () => Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();
    const active = () => !disabled && !done;
    return PanResponder.create({
      onStartShouldSetPanResponder: active,
      onMoveShouldSetPanResponder: active,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(Math.min(Math.max(0, g.dx), max)),
      onPanResponderRelease: (_, g) => {
        if (max > 0 && g.dx >= max * CONFIRM_AT) {
          setDone(true);
          Animated.timing(x, { toValue: max, duration: 90, useNativeDriver: false }).start(() => onConfirm());
        } else back();
      },
      onPanResponderTerminate: back,
    });
  }, [x, max, disabled, done, onConfirm]);

  const fillWidth = Animated.add(x, THUMB);
  const hint = x.interpolate({ inputRange: [0, Math.max(1, max * 0.5)], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View
      style={[styles.track, { backgroundColor: colors.backgroundSelected, opacity: disabled ? 0.5 : 1 }]}
      onLayout={(e) => setMax(Math.max(0, e.nativeEvent.layout.width - THUMB - 8))}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: 'activate', label }]} // i18n-ignore: action id
      onAccessibilityAction={() => !disabled && !done && onConfirm()}
    >
      <Animated.View style={[styles.fill, { backgroundColor: colors.accent, width: fillWidth }]} />
      <Animated.View style={[styles.labelWrap, { opacity: hint }]} pointerEvents="none">
        <ThemedText style={{ fontWeight: '700', color: colors.textSecondary, textAlign: 'center' }} numberOfLines={2}>{label}</ThemedText>
      </Animated.View>
      <Animated.View {...pan.panHandlers} style={[styles.thumb, { backgroundColor: colors.background, transform: [{ translateX: x }] }]}>
        <Ionicons name="chevron-forward" size={22} color={colors.accent} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: THUMB + 8, borderRadius: Radius.pill, justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radius.pill, opacity: 0.9 },
  // Starts after the thumb so the words are never hidden under it.
  labelWrap: { position: 'absolute', left: THUMB + 12, right: 12, alignItems: 'center' },
  thumb: { position: 'absolute', left: 4, width: THUMB, height: THUMB, borderRadius: THUMB / 2, alignItems: 'center', justifyContent: 'center' },
});
