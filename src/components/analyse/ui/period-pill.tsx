import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { formatMonthYear } from '@/i18n/format';
import { rangeLabel, type FahamPeriod } from '@/utils/faham-period';

type Props = {
  period: FahamPeriod;
  /** Opens the period sheet. */
  onOpen: () => void;
  /** Moves one cycle back (-1) or forward (+1). Only given for single-cycle periods. */
  onStep?: (dir: -1 | 1) => void;
  canPrev?: boolean;
  canNext?: boolean;
};

/** "October 2026" for a cycle key '2026-10'. */
export function cycleName(key: string): string {
  return formatMonthYear(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1));
}

/** The pill's main line: the month for one cycle, else the period's name. */
export function periodName(p: FahamPeriod, t: (k: TKey, params?: Record<string, string | number>) => string): string {
  if (p.cycleKey) return cycleName(p.cycleKey);
  return t(`plan.analyse.pill.${p.preset}` as TKey);
}

/**
 * The Faham period control (3.8.1): one pill with the month (or period) and its dates. Tap it for the period sheet;
 * for a single month, the arrows (or a swipe across the pill) step one payday cycle back or forward.
 */
export function PeriodPill({ period, onOpen, onStep, canPrev = true, canNext = true }: Props) {
  const colors = useTheme();
  const { t } = useT();
  // Swipe across the pill itself: left = later month, right = earlier month. Kept off the page so charts can still scroll.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_e, g) => {
          if (!onStep) return;
          if (g.dx <= -40 && canNext) onStep(1);
          else if (g.dx >= 40 && canPrev) onStep(-1);
        },
      }),
    [onStep, canPrev, canNext],
  );

  const single = !!onStep;
  const sub = period.live && period.cycleKey ? t('plan.analyse.pill.soFar', { range: rangeLabel(period.window) }) : rangeLabel(period.window);
  const name = periodName(period, t);

  const arrow = (dir: -1 | 1, enabled: boolean) => (
    <Pressable
      onPress={() => enabled && onStep?.(dir)}
      disabled={!enabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t(dir < 0 ? 'plan.analyse.pill.prev' : 'plan.analyse.pill.next')}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [styles.arrow, { backgroundColor: colors.backgroundElement, borderColor: colors.border }, pressed && styles.pressed]}
    >
      <Ionicons name={dir < 0 ? 'chevron-back' : 'chevron-forward'} size={18} color={enabled ? colors.text : colors.divider} />
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {single ? arrow(-1, canPrev) : null}
      <View style={styles.flex} {...(single ? pan.panHandlers : {})}>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${sub}`}
          accessibilityHint={t('plan.analyse.pill.open')}
          style={({ pressed }) => [styles.pill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }, pressed && styles.pressed]}
        >
          <View style={styles.texts}>
            <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
              {name}
            </ThemedText>
            <ThemedText type="small" style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
              {sub}
            </ThemedText>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>
      {single ? arrow(1, canNext) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  arrow: { width: 44, height: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 48, borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  texts: { alignItems: 'center', flexShrink: 1 },
  name: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  sub: { fontSize: 11, lineHeight: 14 },
  pressed: { opacity: 0.8 },
});
