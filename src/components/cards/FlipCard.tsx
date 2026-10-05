import { useState, type ReactNode } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

import { useMotionAllowed } from './motion';
import type { CardSide } from './shared';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** Render the card for the current side. Call `flip` to turn it over. */
  children: (side: CardSide, flip: () => void) => ReactNode;
};

/**
 * Turns a card over like a coin. The card is drawn once: it spins to edge-on (invisible), the face
 * is swapped there, and it spins the rest of the way. That keeps it to one set of animations
 * instead of rendering a front and a back at the same time.
 */
export function FlipCard({ style, children }: Props) {
  const allowed = useMotionAllowed();
  const [side, setSide] = useState<CardSide>('front');
  const [angle] = useState(() => new Animated.Value(0));
  const [busy] = useState(() => ({ current: false }));

  const flip = () => {
    if (busy.current) return;
    if (!allowed) {
      setSide((s) => (s === 'front' ? 'back' : 'front'));
      return;
    }
    Object.assign(busy, { current: true });
    Animated.timing(angle, {
      toValue: 90,
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setSide((s) => (s === 'front' ? 'back' : 'front'));
      angle.setValue(-90);
      Animated.timing(angle, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        Object.assign(busy, { current: false });
      });
    });
  };

  const rotateY = angle.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });

  return (
    <Animated.View style={[style, { transform: [{ perspective: 900 }, { rotateY }] }]}>
      {children(side, flip)}
    </Animated.View>
  );
}
