import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, PanResponder, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Touches that start this far below the top of the sheet (the handle and the header) can drag it down. */
const GRAB_ZONE = 88;
/** Drag further than this, or flick down, and the sheet closes. */
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.9;

/**
 * The box of a bottom sheet that can be pulled down to close, like iOS sheets.
 * Only the top strip (handle + title row) starts a drag, so scrolling the form and moving sliders inside still work.
 */
export function DragSheet({ visible, onClose, style, children }: Props) {
  const colors = useTheme();
  const box = useRef<View>(null);
  // Mutable bits the gesture reads later (never during render): where the sheet's top is, and what closes it.
  const [live] = useState(() => ({ y: new Animated.Value(0), top: 0 }));
  const y = live.y;
  // The gesture only bumps this counter; the effect below does the closing, so it always calls the latest onClose.
  const [closeTick, setCloseTick] = useState(0);
  const handledTick = useRef(0);

  useEffect(() => {
    if (closeTick > handledTick.current) {
      handledTick.current = closeTick;
      onClose();
    }
  }, [closeTick, onClose]);

  // Every time the sheet opens it starts in place again.
  useEffect(() => {
    if (visible) y.setValue(0);
  }, [visible, y]);

  const [pan] = useState(() => {
    const springBack = () => Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    const grab = (y0: number, dx: number, dy: number) => dy > 6 && Math.abs(dy) > Math.abs(dx) * 1.2 && y0 - live.top < GRAB_ZONE;
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => grab(g.y0, g.dx, g.dy),
      onMoveShouldSetPanResponder: (_, g) => grab(g.y0, g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
          Animated.timing(y, { toValue: Dimensions.get('window').height, duration: 180, useNativeDriver: true }).start(() => setCloseTick((n) => n + 1));
        } else springBack();
      },
      onPanResponderTerminate: springBack,
    });
  });

  return (
    <Animated.View
      ref={box}
      onLayout={() => box.current?.measureInWindow((_x, top) => (live.top = top))}
      style={[{ backgroundColor: colors.background }, style, { transform: [{ translateY: y }] }]}
      {...pan.panHandlers}
    >
      {children}
    </Animated.View>
  );
}
