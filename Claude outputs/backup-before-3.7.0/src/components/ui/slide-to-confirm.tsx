import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { Glass } from '@/components/glass/glass';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';

const TRACK = 64;
/** Gap between the knob and the track edge, the same on all four sides. */
const INSET = 5;
const THUMB = TRACK - INSET * 2;
/** Past this share of the track, letting go confirms. */
const CONFIRM_AT = 0.82;

type Props = {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
};

/**
 * "Slide to complete": drag the round knob across the glass track to confirm something that moves money.
 * A deliberate gesture instead of a tap, so it cannot be done by accident. Screen readers get a Confirm action.
 * The knob is a perfect circle sitting the same distance from every edge; the coloured fill always ends just behind it.
 */
export function SlideToConfirm({ label, onConfirm, disabled }: Props) {
  const colors = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const [grow] = useState(() => new Animated.Value(0));
  const [max, setMax] = useState(0);
  const [done, setDone] = useState(false);

  // Rebuilt when the track is measured or the callback changes, so the handlers always see current values.
  const pan = useMemo(() => {
    const back = () => {
      Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
      Animated.spring(grow, { toValue: 0, useNativeDriver: false, bounciness: 8 }).start();
    };
    const active = () => !disabled && !done;
    return PanResponder.create({
      onStartShouldSetPanResponder: active,
      onMoveShouldSetPanResponder: active,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => Animated.spring(grow, { toValue: 1, useNativeDriver: false, speed: 30, bounciness: 6 }).start(),
      onPanResponderMove: (_, g) => x.setValue(Math.min(Math.max(0, g.dx), max)),
      onPanResponderRelease: (_, g) => {
        if (max > 0 && g.dx >= max * CONFIRM_AT) {
          setDone(true);
          Animated.timing(x, { toValue: max, duration: 110, useNativeDriver: false }).start(() => onConfirm());
        } else back();
      },
      onPanResponderTerminate: back,
    });
  }, [x, grow, max, disabled, done, onConfirm]);

  // The fill ends INSET past the knob, so the knob has the same margin inside it as inside the empty track.
  const fillWidth = Animated.add(x, THUMB + INSET * 2);
  const fillOpacity = x.interpolate({ inputRange: [0, 18], outputRange: [0, 1], extrapolate: 'clamp' });
  const hint = x.interpolate({ inputRange: [0, Math.max(1, max * 0.45)], outputRange: [1, 0], extrapolate: 'clamp' });
  const scale = grow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  return (
    <View
      style={[styles.track, { opacity: disabled ? 0.5 : 1 }]}
      onLayout={(e) => setMax(Math.max(0, e.nativeEvent.layout.width - THUMB - INSET * 2))}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: 'activate', label }]} // i18n-ignore: action id
      onAccessibilityAction={() => !disabled && !done && onConfirm()}
    >
      <Glass radius={TRACK / 2} style={StyleSheet.absoluteFill} />
      <Animated.View
        pointerEvents="none"
        style={[styles.fill, { backgroundColor: colors.accent, width: fillWidth, opacity: fillOpacity }]}
      />
      <Animated.View style={[styles.labelWrap, { opacity: hint }]} pointerEvents="none">
        <ThemedText style={styles.label} numberOfLines={1}>{label}</ThemedText>
      </Animated.View>
      <Animated.View {...pan.panHandlers} style={[styles.thumb, { transform: [{ translateX: x }, { scale }] }]}>
        <Ionicons name={done ? 'checkmark' : 'chevron-forward'} size={24} color={colors.accent} />
      </Animated.View>
    </View>
  );
}

const thumbShadow: ViewStyle =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 2px 8px rgba(0,0,0,0.22)' } as unknown as ViewStyle)
    : { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 };

const styles = StyleSheet.create({
  track: { height: TRACK, borderRadius: TRACK / 2, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, height: TRACK, borderRadius: TRACK / 2 },
  // Starts after the knob so the words are never hidden under it.
  labelWrap: { position: 'absolute', left: THUMB + INSET * 2, right: 16, top: 0, height: TRACK, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700', textAlign: 'center', opacity: 0.75 },
  thumb: {
    position: 'absolute',
    left: INSET,
    top: INSET,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...thumbShadow,
  },
});
