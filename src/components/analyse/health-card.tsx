import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScoreRing } from '@/components/charts/score-ring';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { formatMoney } from '@/utils/currency';
import { MIN_MEASURED, type Dimension, type Health, type Indicator } from '@/utils/health';
import { p1 } from '@/utils/percent';

const MASK = 'RM ••••';

type Props = { health: Health; savingsTarget: number };

/**
 * Financial health: the overall result (only when at least 3 of 5 areas can be measured), then each area with its
 * score, what it is based on, how it is worked out, and either a tip or what is missing to measure it.
 */
export function HealthCard({ health, savingsTarget }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const [open, setOpen] = useState<string | null>(null);
  const muted = { color: colors.textSecondary };
  const colorOf = (s: number | null) => (s === null ? colors.textSecondary : s >= 70 ? colors.positive : s >= 40 ? colors.warning : colors.negative);
  const overallColor = health.overall === null ? colors.textSecondary : health.overall >= 80 ? colors.positive : health.overall >= 60 ? colors.accent : health.overall >= 40 ? colors.warning : colors.negative;

  const value = (ind: Indicator) => {
    switch (ind.unit) {
      case 'rm':
        return hideAmounts ? MASK : formatMoney(ind.value);
      case 'pct':
        return `${p1(ind.value)}%`;
      case 'months':
        return t('fc.h.unit.months', { n: p1(ind.value) });
      default:
        return ind.of !== undefined ? t('fc.h.unit.of', { n: ind.value, of: ind.of }) : String(ind.value);
    }
  };

  const row = (d: Dimension, i: number) => {
    const isOpen = open === d.id;
    const c = colorOf(d.score);
    return (
      <View key={d.id} style={[i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
        <Pressable
          onPress={() => setOpen(isOpen ? null : d.id)}
          style={({ pressed }) => [styles.dimRow, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
        >
          <View style={styles.flex}>
            <View style={styles.dimHead}>
              <ThemedText type="smallBold" style={styles.flex}>{t(`fc.h.dim.${d.id}` as TKey)}</ThemedText>
              <ThemedText type="small" style={{ color: c, fontWeight: '700' }}>
                {d.score === null ? t('fc.h.status.missing') : `${d.score} · ${t(`fc.h.status.${d.status}` as TKey)}`}
              </ThemedText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
              {d.score !== null ? <View style={[styles.fill, { width: `${Math.max(2, d.score)}%`, backgroundColor: c }]} /> : null}
            </View>
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        </Pressable>
        {isOpen ? (
          <View style={styles.detail}>
            <ThemedText type="small" style={muted}>{t(`fc.h.${d.id}.how` as TKey, { target: savingsTarget })}</ThemedText>
            {d.indicators.length > 0 ? (
              <View style={[styles.indicators, { backgroundColor: colors.backgroundSelected }]}>
                {d.indicators.map((ind) => (
                  <View key={ind.id} style={styles.indRow}>
                    <ThemedText type="small" style={[muted, styles.flex]}>{t(`fc.h.ind.${ind.id}` as TKey)}</ThemedText>
                    <ThemedText type="smallBold" style={tabularNums}>{value(ind)}</ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
            {d.score === null ? (
              <View style={[styles.tip, { backgroundColor: colors.backgroundSelected }]}>
                <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} style={styles.tipIcon} />
                <ThemedText type="small" style={styles.flex}>{t(`fc.h.miss.${d.missing}` as TKey)}</ThemedText>
              </View>
            ) : (
              <>
                <ThemedText type="small">{t(`fc.h.explain.${d.status}` as TKey)}</ThemedText>
                {d.status !== 'strong' ? (
                  <View style={[styles.tip, { backgroundColor: colors.backgroundSelected }]}>
                    <Ionicons name="bulb-outline" size={15} color={colors.accent} style={styles.tipIcon} />
                    <ThemedText type="small" style={styles.flex}>{t(`fc.h.${d.id}.tip` as TKey, { target: savingsTarget })}</ThemedText>
                  </View>
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.top}>
        {health.overall !== null ? (
          <ScoreRing value={health.overall} color={overallColor} size={84} stroke={10} />
        ) : (
          <View style={[styles.emptyRing, { borderColor: colors.backgroundSelected }]}>
            <ThemedText style={[styles.emptyNum, muted]}>—</ThemedText>
          </View>
        )}
        <View style={[styles.flex, { gap: 2 }]}>
          <ThemedText type="small" style={muted}>{t('fc.h.title')}</ThemedText>
          {health.overall !== null && health.grade ? (
            <>
              <ThemedText style={[styles.grade, { color: overallColor }]}>{t(`fc.score.grade.${health.grade}` as TKey)}</ThemedText>
              <ThemedText type="small" style={muted}>{t('fc.h.basedOn', { n: health.measured })}</ThemedText>
            </>
          ) : (
            <ThemedText type="small">{t('fc.h.notEnough', { n: health.measured, min: MIN_MEASURED })}</ThemedText>
          )}
        </View>
      </View>
      {health.weakest && health.overall !== null && health.overall < 90 ? (
        <ThemedText type="small">
          <ThemedText type="smallBold">{t('fc.h.focus')}: </ThemedText>
          {t(`fc.h.dim.${health.weakest}` as TKey)}
        </ThemedText>
      ) : null}
      <View>{health.dimensions.map(row)}</View>
      <ThemedText type="small" style={[muted, styles.note]}>{t('fc.h.notCredit')}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emptyRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
  emptyNum: { fontSize: FontSize.title, fontWeight: '800' },
  grade: { fontSize: FontSize.title, fontWeight: '800' },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 12 },
  dimHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: 6 },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: Radius.pill },
  detail: { gap: 10, paddingBottom: 12 },
  indicators: { borderRadius: Radius.md, padding: 12, gap: 8 },
  indRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tip: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Radius.md },
  tipIcon: { marginTop: 1 },
  note: { fontSize: FontSize.caption, lineHeight: 16 },
});
