import { useEffect, useRef, useState } from 'react';
import { FadeIn, FadeOut } from 'react-native-reanimated';

import { useMotionAllowed } from '@/components/cards/motion';

/**
 * Faham motion (3.8.1). Short and quiet, and all of it switches off when the phone's Reduce Motion setting is on:
 * then content simply appears and numbers show their final value at once.
 */
export { useMotionAllowed };

/** A short cross-fade for content that changes in place (a new tab, period or section). Undefined = no animation. */
export function fadeIn(allowed: boolean, ms = 220) {
  return allowed ? FadeIn.duration(ms) : undefined;
}
export function fadeOut(allowed: boolean, ms = 150) {
  return allowed ? FadeOut.duration(ms) : undefined;
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/**
 * Counts a number up to `target` over `ms` (ease-out), then follows later changes from wherever it is.
 * Starts at 0 on first show. With `on` false it returns `target` straight away.
 */
export function useCountUp(target: number, on: boolean, ms = 650): number {
  const [shown, setShown] = useState(on ? 0 : target);
  const from = useRef(on ? 0 : target);
  useEffect(() => {
    if (!on) return;
    const start = from.current;
    if (start === target) return;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      const v = start + (target - start) * easeOut(p);
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, on, ms]);
  return on ? shown : target;
}
