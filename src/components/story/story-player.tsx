import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';

export type StorySlide = {
  key: string;
  bg: string;
  fg: string;
  /** Drawn behind the content (shapes, patterns). */
  backdrop?: ReactNode;
  content: ReactNode;
  /** The last slide has its own buttons, so taps there are not used to move on. */
  final?: boolean;
};

type Props = { visible: boolean; onClose: () => void; title: string; slides: StorySlide[]; duration?: number; onShare?: () => void };

/**
 * Full-screen stories: bars across the top, tap right for the next one, tap left to go back, hold to pause.
 * Each slide is mounted fresh when it opens, so its entrance animations play every time.
 */
export function StoryPlayer({ visible, onClose, title, slides, duration = 7000, onShare }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [openedFor, setOpenedFor] = useState(false);
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const remaining = useRef(duration);

  // Start from the first slide every time the player opens.
  if (visible && !openedFor) {
    setOpenedFor(true);
    setIndex(0);
  }
  if (!visible && openedFor) setOpenedFor(false);

  const count = slides.length;
  const i = Math.min(index, Math.max(0, count - 1));
  const slide = slides[i];
  const last = i === count - 1;

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function run(ms: number) {
    clear();
    startedAt.current = Date.now();
    remaining.current = ms;
    progress.value = withTiming(1, { duration: ms, easing: Easing.linear });
    timer.current = setTimeout(() => setIndex((x) => Math.min(x + 1, count - 1)), ms);
  }

  useEffect(() => {
    if (!visible) return;
    progress.value = 0;
    if (!last) run(duration);
    else progress.value = 1;
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, visible, last, duration]);

  function go(d: number) {
    clear();
    setIndex((x) => Math.max(0, Math.min(count - 1, x + d)));
  }
  function pause() {
    if (last) return;
    clear();
    cancelAnimation(progress);
    remaining.current = Math.max(300, remaining.current - (Date.now() - startedAt.current));
  }
  function resume() {
    if (last || timer.current) return;
    run(remaining.current);
  }

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  if (!slide) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: slide.bg }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {slide.backdrop}
        </View>

        <Animated.View key={slide.key} entering={FadeIn.duration(250)} style={[styles.content, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + (slide.final ? 96 : 24) }]} pointerEvents={slide.final ? 'box-none' : 'none'}>
          {slide.content}
        </Animated.View>

        {slide.final ? (
          <View style={[styles.actions, { bottom: insets.bottom + 20 }]}>
            {onShare ? (
              <Pressable onPress={onShare} style={[styles.primary, { backgroundColor: slide.fg }]} accessibilityRole="button">
                <Ionicons name="share-outline" size={18} color={slide.bg} />
                <Text style={[styles.primaryText, { color: slide.bg }]}>{t('rpt.share')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setIndex(0)} style={[styles.secondary, { borderColor: hexA(slide.fg, 0.45) }]} accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: slide.fg }]}>{t('rpt.replay')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!slide.final ? (
          <View style={[StyleSheet.absoluteFill, styles.zones]}>
            <Pressable style={styles.left} onPress={() => go(-1)} onLongPress={pause} onPressOut={resume} delayLongPress={220} accessibilityRole="button" accessibilityLabel={t('rpt.prev')} />
            <Pressable style={styles.right} onPress={() => go(1)} onLongPress={pause} onPressOut={resume} delayLongPress={220} accessibilityRole="button" accessibilityLabel={t('rpt.next')} />
          </View>
        ) : null}

        <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
          <View style={styles.bars} pointerEvents="none">
            {slides.map((s, j) => (
              <View key={s.key} style={[styles.bar, { backgroundColor: hexA(slide.fg, 0.28) }]}>
                {j < i ? <View style={[styles.barFill, { width: '100%', backgroundColor: slide.fg }]} /> : null}
                {j === i ? <Animated.View style={[styles.barFill, { backgroundColor: slide.fg }, fill]} /> : null}
              </View>
            ))}
          </View>
          <View style={styles.head}>
            <Text style={[styles.title, { color: slide.fg }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel={t('rpt.close')}>
              <Ionicons name="close" size={26} color={slide.fg} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** '#RRGGBB' + alpha -> rgba(). */
export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 26 },
  zones: { flexDirection: 'row' },
  left: { width: '32%', height: '100%' },
  right: { flex: 1, height: '100%' },
  top: { position: 'absolute', left: 12, right: 12, gap: 10 },
  bars: { flexDirection: 'row', gap: 3 },
  bar: { flex: 1, height: 3, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 3 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  title: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4, flex: 1 },
  actions: { position: 'absolute', left: 22, right: 22, flexDirection: 'row', gap: 10 },
  primary: { flex: 1.4, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryText: { fontSize: 16, fontWeight: '800' },
  secondary: { flex: 1, height: 54, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '700' },
});
