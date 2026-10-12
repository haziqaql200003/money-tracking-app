import { useEffect, useRef, useState } from 'react';
import { PanResponder, type View } from 'react-native';

/** Turns a touch position inside the chart (x, y in px, plus the chart's size) into the index it points at. */
export type Locate = (x: number, y: number, width: number, height: number) => number;

/**
 * Press and drag along a chart to move a cursor over it ("scrubbing").
 *
 * - A tap picks the spot under the finger straight away.
 * - Moving sideways locks the gesture to the chart, so the page does not scroll while you read the trend.
 * - Moving up or down hands the gesture back to the page, so you can still scroll past a chart.
 * - The pick stays after you let go, until you touch somewhere else.
 *
 * Put `bind.ref`, `bind.onLayout` and `bind.panHandlers` on the View that is exactly the plot area.
 */
export function useScrub(count: number, locate: Locate, initial: number | null = null) {
  const [index, setIndex] = useState<number | null>(initial);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(0);
  const ref = useRef<View>(null);
  // Everything the gesture needs later lives in a closure, so render code never touches mutable values.
  const [live] = useState(() => {
    const m = { left: 0, top: 0, w: 0, h: 0, count: 0, locked: false, locate: null as Locate | null };
    return {
      sync: (c: number, l: Locate) => {
        m.count = c;
        m.locate = l;
      },
      size: (w: number, h: number) => {
        m.w = w;
        m.h = h;
      },
      measure: (view: View | null) => {
        view?.measureInWindow((x, y) => {
          m.left = x;
          m.top = y;
        });
      },
      lock: (v: boolean) => {
        m.locked = v;
      },
      isLocked: () => m.locked,
      at: (x0: number, y0: number, dx: number, dy: number): number | null => {
        if (!m.locate || m.count <= 0 || m.w <= 0) return null;
        const x = Math.min(m.w, Math.max(0, x0 + dx - m.left));
        const y = Math.min(m.h, Math.max(0, y0 + dy - m.top));
        return Math.min(m.count - 1, Math.max(0, m.locate(x, y, m.w, m.h)));
      },
    };
  });

  useEffect(() => {
    live.sync(count, locate);
  });

  const [pan] = useState(() => {
    const pick = (x0: number, y0: number, dx: number, dy: number) => {
      const i = live.at(x0, y0, dx, dy);
      if (i !== null) setIndex(i);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => {
        live.lock(false);
        setDragging(true);
        pick(g.x0, g.y0, 0, 0);
      },
      onPanResponderMove: (_, g) => {
        if (!live.isLocked() && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2) live.lock(true);
        pick(g.x0, g.y0, g.dx, g.dy);
      },
      // Vertical movement lets the page scroll take over; sideways movement keeps it.
      onPanResponderTerminationRequest: () => !live.isLocked(),
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    });
  });

  const bind = {
    ref,
    collapsable: false,
    onLayout: (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      live.size(e.nativeEvent.layout.width, e.nativeEvent.layout.height);
      setWidth(e.nativeEvent.layout.width);
      live.measure(ref.current);
    },
    // The page may have scrolled since layout, so measure again when a touch begins.
    onTouchStart: () => live.measure(ref.current),
    ...pan.panHandlers,
  };

  return { index, setIndex, dragging, width, bind };
}
