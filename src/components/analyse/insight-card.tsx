import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import type { Insight, Severity } from '@/utils/insight-engine';

type Props = {
  insight: Insight;
  /** The module button ("Open budgets"), when there is one. */
  go?: { label: string; onPress: () => void } | null;
  /** Opens the records behind the finding, when it is about a category. */
  onRecords?: () => void;
  onDismiss: () => void;
};

const SEVERITY_ICON: Record<Severity, keyof typeof Ionicons.glyphMap> = {
  critical: 'warning',
  attention: 'alert-circle-outline',
  opportunity: 'bulb-outline',
  positive: 'trending-up',
};

/**
 * One insight: severity badge, OBSERVATION (title, body), then on request the EVIDENCE (numbers, period, method,
 * confidence), the RECOMMENDATION (tip) and the way to act on it.
 */
export function InsightCard({ insight: it, go, onRecords, onDismiss }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const tone: Record<Severity, string> = { critical: colors.negative, attention: colors.warning, opportunity: colors.accent, positive: colors.positive };
  const c = tone[it.severity];
  const muted = { color: colors.textSecondary };
  const hasEvidence = (it.evidence?.length ?? 0) > 0 || !!it.how || !!it.period;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: `${c}1F` }]}>
          <Ionicons name={SEVERITY_ICON[it.severity]} size={13} color={c} />
          <ThemedText type="small" style={[styles.badgeText, { color: c }]}>{t(`fc.sev.${it.severity}` as TKey)}</ThemedText>
        </View>
        <ThemedText type="small" style={[muted, styles.flex]} numberOfLines={1}>{t(`fc.cat.${it.category}` as TKey)}</ThemedText>
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('fc.ui.dismiss')}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ThemedText type="smallBold" style={styles.title}>{it.title}</ThemedText>
      <ThemedText type="small" style={muted}>{it.body}</ThemedText>

      {hasEvidence ? (
        <Pressable onPress={() => setOpen((v) => !v)} style={styles.toggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{open ? t('fc.ui.hideEvidence') : t('fc.ui.evidence')}</ThemedText>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accent} />
        </Pressable>
      ) : null}

      {open ? (
        <View style={[styles.evidence, { backgroundColor: colors.backgroundSelected }]}>
          {it.evidence?.map((e, i) => (
            <View key={`${e.label}-${i}`} style={styles.evRow}>
              <ThemedText type="small" style={[muted, styles.flex]}>{e.label}</ThemedText>
              <ThemedText type="smallBold" style={tabularNums}>{e.value}</ThemedText>
            </View>
          ))}
          {it.period ? (
            <View style={styles.evRow}>
              <ThemedText type="small" style={[muted, styles.flex]}>{t('fc.ui.period')}</ThemedText>
              <ThemedText type="small" style={styles.periodText}>{it.period}</ThemedText>
            </View>
          ) : null}
          {it.how ? (
            <ThemedText type="small" style={muted}>
              <ThemedText type="smallBold" style={muted}>{t('fc.ui.how')}: </ThemedText>
              {it.how}
            </ThemedText>
          ) : null}
          <ThemedText type="small" style={muted}>
            {t(`fc.conf.${it.confidence}` as TKey)}
            {it.confidence === 'low' ? ` · ${t('fc.ui.lowConf')}` : ''}
          </ThemedText>
          {onRecords ? (
            <Pressable onPress={onRecords} style={styles.toggle} accessibilityRole="button">
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('fc.go.records')}</ThemedText>
              <Ionicons name="chevron-forward" size={14} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {it.action ? (
        <View style={[styles.tip, { backgroundColor: colors.backgroundSelected }]}>
          <Ionicons name="bulb-outline" size={15} color={colors.accent} style={styles.tipIcon} />
          <ThemedText type="small" style={styles.flex}>{it.action}</ThemedText>
        </View>
      ) : null}

      {go ? (
        <Pressable
          onPress={go.onPress}
          style={({ pressed }) => [styles.goButton, { backgroundColor: colors.accentSoft }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{go.label}</ThemedText>
          <Ionicons name="arrow-forward" size={14} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  badgeText: { fontSize: FontSize.caption, fontWeight: '700' },
  title: { fontSize: FontSize.body },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  evidence: { borderRadius: Radius.md, padding: 12, gap: 8 },
  evRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  periodText: { flexShrink: 1, textAlign: 'right' },
  tip: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Radius.md },
  tipIcon: { marginTop: 1 },
  goButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill },
});
