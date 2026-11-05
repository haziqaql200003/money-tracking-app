import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, AppState } from 'react-native';

/**
 * One shared gyro feed for every premium card on screen (-1..1 on each axis, 0 = neutral).
 * It is reference counted: the sensor only runs while at least one card asks for it, and stops
 * when the app goes to the background.
 */
const FULL_TILT_DEG = 32; // phone tilt (degrees) that gives full card tilt
const RECENTER = 0.03; // how fast "neutral" follows the phone, so any resting angle becomes flat

export const gyroX = new Animated.Value(0);
export const gyroY = new Animated.Value(0);

let users = 0;
let sensor: { remove: () => void } | null = null;
let appStateSub: { remove: () => void } | null = null;
let base: { beta: number; gamma: number } | null = null;
let smooth = { x: 0, y: 0 };

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

function stopSensor() {
  sensor?.remove();
  sensor = null;
  base = null;
  smooth = { x: 0, y: 0 };
  gyroX.setValue(0);
  gyroY.setValue(0);
}

async function startSensor() {
  if (sensor) return;
  try {
    if (!(await DeviceMotion.isAvailableAsync()) || users === 0 || sensor) return;
    DeviceMotion.setUpdateInterval(33);
    sensor = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return;
      const deg = 180 / Math.PI;
      const beta = rotation.beta * deg;
      const gamma = rotation.gamma * deg;
      if (!base) base = { beta, gamma };
      base.beta += (beta - base.beta) * RECENTER;
      base.gamma += (gamma - base.gamma) * RECENTER;
      // The card counter-rotates, so it feels like it floats while the phone moves around it.
      const x = clamp(-(gamma - base.gamma) / FULL_TILT_DEG);
      const y = clamp(-(beta - base.beta) / FULL_TILT_DEG);
      smooth = { x: smooth.x + (x - smooth.x) * 0.35, y: smooth.y + (y - smooth.y) * 0.35 };
      gyroX.setValue(smooth.x);
      gyroY.setValue(smooth.y);
    });
  } catch {
    // No sensor (simulator, web, permission refused): the cards still react to touch.
  }
}

function acquire() {
  users += 1;
  if (users === 1) {
    startSensor();
    appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') startSensor();
      else stopSensor();
    });
  }
  return () => {
    users -= 1;
    if (users === 0) {
      appStateSub?.remove();
      appStateSub = null;
      stopSensor();
    }
  };
}

/** True unless the person turned on "Reduce Motion" in their phone settings. */
export function useMotionAllowed() {
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => alive && setAllowed(!reduce));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduce) => setAllowed(!reduce));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return allowed;
}

/** Keeps the shared gyro running while `active` is true. */
export function useGyro(active: boolean) {
  useEffect(() => (active ? acquire() : undefined), [active]);
}


// ---- "Phone motion" preference (device-wide, off by default: it is a lot of movement for some people) ----
const GYRO_KEY = 'wakira:card-gyro';
let gyroOn = false;
const listeners = new Set<() => void>();

AsyncStorage.getItem(GYRO_KEY)
  .then((v) => {
    if (v === 'on' && !gyroOn) {
      gyroOn = true;
      listeners.forEach((l) => l());
    }
  })
  .catch(() => {});

export function setGyroEnabled(next: boolean) {
  gyroOn = next;
  AsyncStorage.setItem(GYRO_KEY, next ? 'on' : 'off').catch(() => {});
  listeners.forEach((l) => l());
}

export function useGyroEnabled() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => gyroOn,
    () => false,
  );
}
