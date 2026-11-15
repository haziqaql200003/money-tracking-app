import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { severityTone, soft, StatusChip, SEVERITY_ICON } from '@/components/analyse/ui/status-chip';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/ui/themed-text';
import { FontSize, Radius, Spacing, tabularNums, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { COOLDOWN_DAYS, type Insight, type InsightState, type Severity } from '@/utils/insight-engine';

/* ---------------- one row (to-do list, all insights) ---------------- */

/** Severity icon, title and one line of the finding. Tapping opens its evidence; the optional chip acts on it. */
export function InsightRow({ insight: it, onPress, chip, first }: { insight: Insight; onPress: () => void; chip?: { label: string; onPress: () => void } | null; first?: boolean }) {
  const colors = useTheme();
  const c = severityTone(colors, it.severity);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`${it.title}. ${it.body}`}
    >
      <View style={[styles.rowIcon, { backgroundColor: soft(colors, c, 0.16) }]}>
        <Ionicons name={SEVERITY_ICON[it.severity]} size={17} color={c} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>{it.title}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>{it.body}</ThemedText>
      </View>
      {chip ? (
        <Pressable onPress={chip.onPress} hitSlop={6} style={[styles.rowChip, { backgroundColor: colors.accentSoft }]} accessibilityRole="button" accessibilityLabel={chip.label}>
          <ThemedText type="small" style={[styles.rowChipText, { color: colors.accent }]}>{chip.label}</ThemedText>
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

/* ---------------- all insights ---------------- */

export type SeverityFilter = 'all' | Severity;
const FILTERS: SeverityFilter[] = ['all', 'critical', 'attention', 'opportunity', 'positive'];

type ListProps = {
  tab: 'all' | 'history';
  onTab: (t: 'all' | 'history') => void;
  filter: SeverityFilter;
  onFilter: (f: SeverityFilter) => void;
  shown: Insight[];
  hidden: Insight[];
  showHidden: boolean;
  onToggleHidden: () => void;
  onOpen: (it: Insight) => void;
  onRestore: (key: string) => void;
  history: [string, InsightState['history'][string]][];
  dateText: (k: string) => string;
};

/** Every current insight with severity filters, the hidden ones, and a History tab of findings that no longer apply. */
export function InsightList(p: ListProps) {
  const colors = useTheme();
  const { t } = useT();
  const muted = { color: colors.textSecondary };
  const count = (f: SeverityFilter) => (f === 'all' ? p.shown.length : p.shown.filter((x) => x.severity === f).length);
  const rows = p.filter === 'all' ? p.shown : p.shown.filter((x) => x.severity === p.filter);
  const box = [styles.box, { backgroundColor: colors.backgroundElement }];

  return (
    <View>
      <View style={[styles.tabs, { backgroundColor: colors.backgroundElement }]} accessibilityRole="tablist">
        {(['all', 'history'] as const).map((k) => (
          <Pressable key={k} onPress={() => p.onTab(k)} style={[styles.tab, p.tab === k && { backgroundColor: colors.background }]} accessibilityRole="tab" accessibilityState={{ selected: p.tab === k }}>
            <ThemedText type="smallBold" style={{ color: p.tab === k ? colors.text : colors.textSecondary }}>
              {k === 'all' ? t('plan.ins.list.all') : t('fc.ui.history')}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {p.tab === 'all' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
            {FILTERS.map((f) => (
              <Chip key={f} size="sm" label={`${f === 'all' ? t('plan.ins.filter.all') : t(`fc.sev.${f}` as TKey)} ${count(f)}`} active={p.filter === f} onPress={() => p.onFilter(f)} />
            ))}
          </ScrollView>
          {rows.length === 0 ? (
            <View style={box}>
              <ThemedText type="small" style={muted}>{p.shown.length === 0 ? t('fc.insight.none') : t('plan.ins.filter.none')}</ThemedText>
            </View>
          ) : (
            <View style={[box, styles.listBox]}>
              {rows.map((it, i) => (
                <InsightRow key={it.key} insight={it} first={i === 0} onPress={() => p.onOpen(it)} />
              ))}
            </View>
          )}

          {/* Hidden for now: they come back after their cooldown, or at once if they get more serious */}
          {p.hidden.length > 0 ? (
            <>
              <Pressable onPress={p.onToggleHidden} style={styles.more} accessibilityRole="button" accessibilityState={{ expanded: p.showHidden }}>
                <ThemedText type="small" style={muted}>{p.showHidden ? t('fc.ui.hideHidden') : t('fc.ui.hidden', { n: p.hidden.length })}</ThemedText>
              </Pressable>
              {p.showHidden ? (
                <View style={box}>
                  {p.hidden.map((h) => (
                    <View key={h.key} style={styles.histRow}>
                      <ThemedText type="small" style={styles.flex} numberOfLines={2}>{h.title}</ThemedText>
                      <Pressable onPress={() => p.onRestore(h.key)} hitSlop={8} accessibilityRole="button">
                        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('fc.ui.restore')}</ThemedText>
                      </Pressable>
                    </View>
                  ))}
                  <ThemedText type="small" style={muted}>{t('fc.ui.cooldown')}</ThemedText>
                </View>
              ) : null}
            </>
          ) : null}
        </>
      ) : p.history.length === 0 ? (
        <View style={box}>
          <ThemedText type="small" style={muted}>{t('plan.ins.history.none')}</ThemedText>
        </View>
      ) : (
        <View style={box}>
          {p.history.map(([k, h]) => (
            <View key={k} style={styles.histItem}>
              <StatusChip severity={h.severity} />
              <ThemedText type="small">{h.title}</ThemedText>
              <ThemedText type="small" style={muted}>{t('fc.ui.firstSeen', { date: p.dateText(h.first), date2: p.dateText(h.last) })}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ---------------- one insight: its evidence ---------------- */

type DetailProps = {
  insight: Insight;
  go: { label: string; onPress: () => void } | null;
  onRecords?: () => void;
  onWhatIf?: () => void;
  onHide: () => void;
};

/** OBSERVATION, EVIDENCE (numbers, period, method, confidence), RECOMMENDATION, and the ways to act on it. */
export function InsightDetail({ insight: it, go, onRecords, onWhatIf, onHide }: DetailProps) {
  const colors = useTheme();
  const { t } = useT();
  const muted = { color: colors.textSecondary };
  const box = [styles.box, { backgroundColor: colors.backgroundElement }];
  const hasNumbers = (it.evidence?.length ?? 0) > 0 || !!it.period;

  return (
    <View>
      <View style={styles.detailHead}>
        <StatusChip severity={it.severity} />
        <ThemedText type="small" style={muted}>{t(`fc.cat.${it.category}` as TKey)}</ThemedText>
      </View>
      <ThemedText style={[Type.title, styles.detailTitle]} accessibilityRole="header">{it.title}</ThemedText>
      <ThemedText style={[styles.detailBody, muted]}>{it.body}</ThemedText>

      {hasNumbers ? (
        <View style={[box, styles.listBox]}>
          {it.evidence?.map((e, i) => (
            <View key={`${e.label}-${i}`} style={[styles.evRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <ThemedText type="small" style={[muted, styles.flex]}>{e.label}</ThemedText>
              <ThemedText type="smallBold" style={[tabularNums, styles.evValue]}>{e.value}</ThemedText>
            </View>
          ))}
          {it.period ? (
            <View style={[styles.evRow, (it.evidence?.length ?? 0) > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <ThemedText type="small" style={[muted, styles.flex]}>{t('fc.ui.period')}</ThemedText>
              <ThemedText type="small" style={styles.evValue}>{it.period}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {it.how ? (
        <View style={styles.block}>
          <ThemedText type="small" style={[muted, styles.caps]}>{t('fc.ui.how')}</ThemedText>
          <ThemedText type="small">{it.how}</ThemedText>
        </View>
      ) : null}
      <View style={styles.block}>
        <ThemedText type="small">
          {t(`fc.conf.${it.confidence}` as TKey)}
          {it.confidence === 'low' ? ` · ${t('fc.ui.lowConf')}` : ''}
        </ThemedText>
      </View>

      {it.action ? (
        <View style={[styles.tip, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="bulb-outline" size={16} color={colors.accent} style={styles.tipIcon} />
          <ThemedText type="small" style={styles.flex}>{it.action}</ThemedText>
        </View>
      ) : null}

      <View style={styles.actions}>
        {go ? <Button label={go.label} icon="arrow-forward" onPress={go.onPress} /> : null}
        {onWhatIf ? <Button label={t('plan.ins.tryWhatIf')} icon="flask-outline" variant={go ? 'secondary' : 'primary'} onPress={onWhatIf} /> : null}
        {onRecords ? <Button label={t('fc.go.records')} icon="list" variant="secondary" onPress={onRecords} /> : null}
        <Button label={t('plan.ins.hideFor', { n: COOLDOWN_DAYS[it.severity] })} icon="eye-off-outline" variant="ghost" onPress={onHide} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowChip: { borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  rowChipText: { fontSize: FontSize.caption, fontWeight: '800' },

  tabs: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3, marginBottom: Spacing.three },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.pill },
  chipScroll: { marginBottom: Spacing.three },
  chips: { gap: Spacing.two, paddingRight: Spacing.two },
  box: { borderRadius: Radius.lg, padding: 16, marginBottom: Spacing.three, gap: 10 },
  listBox: { paddingVertical: 4, gap: 0 },
  more: { alignItems: 'center', paddingVertical: 10, marginBottom: Spacing.two },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  histItem: { gap: 4, paddingBottom: 6 },

  detailHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  detailTitle: { marginBottom: Spacing.two },
  detailBody: { fontSize: FontSize.body, lineHeight: 22, marginBottom: Spacing.three },
  evRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingVertical: 12 },
  evValue: { flexShrink: 1, textAlign: 'right' },
  block: { gap: 4, marginBottom: Spacing.three },
  caps: { textTransform: 'uppercase', letterSpacing: 0.6, fontSize: FontSize.micro, fontWeight: '700' },
  tip: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: Radius.md, marginBottom: Spacing.three },
  tipIcon: { marginTop: 1 },
  actions: { gap: Spacing.two, marginTop: Spacing.one },
});
