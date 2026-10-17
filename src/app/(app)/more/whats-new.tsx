import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { CHANGELOG, entryText, releaseTitle, type ChangeKind, type Release } from '@/constants/changelog';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useUpdates } from '@/context/UpdatesContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { formatDate } from '@/i18n/format';

const KINDS: { kind: ChangeKind; icon: keyof typeof Ionicons.glyphMap; labelKey: TKey }[] = [
  { kind: 'new', icon: 'sparkles', labelKey: 'more.whatsNew.kind.new' },
  { kind: 'improved', icon: 'trending-up', labelKey: 'more.whatsNew.kind.improved' },
  { kind: 'fixed', icon: 'build', labelKey: 'more.whatsNew.kind.fixed' },
];

// 'YYYY-MM-DD' as a local date (new Date(string) would read it as UTC).
function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Every release as a short card: version, date, title and key points. Tapping it opens the full list of changes. */
export default function WhatsNewScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { markUpdateSeen } = useUpdates();
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    markUpdateSeen();
  }, [markUpdateSeen]);

  function toggle(version: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t('more.whatsNew.title')} />

          {CHANGELOG.map((release, idx) => (
            <ReleaseCard key={release.version} release={release} latest={idx === 0} open={open.has(release.version)} onToggle={() => toggle(release.version)} />
          ))}

          <ThemedText type="small" style={[styles.footer, { color: colors.textSecondary }]}>
            {t('more.whatsNew.caughtUp')}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ReleaseCard({ release, latest, open, onToggle }: { release: Release; latest: boolean; open: boolean; onToggle: () => void }) {
  const colors = useTheme();
  const { t, lang } = useT();
  const counts = KINDS.map((k) => ({ ...k, n: release.changes.filter((c) => c.kind === k.kind).length })).filter((k) => k.n > 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? t('more.whatsNew.hideDetails') : t('more.whatsNew.showDetails')}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <View style={styles.metaRow}>
            <View style={[styles.versionPill, { backgroundColor: latest ? colors.accent : colors.background }]}>
              <ThemedText type="small" style={{ color: latest ? '#fff' : colors.textSecondary, fontWeight: '700' }}>
                v{release.version}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {formatDate(parseDate(release.date), 'long')}
            </ThemedText>
          </View>
          <ThemedText style={styles.title}>{releaseTitle(release, lang)}</ThemedText>
        </View>
        <View style={[styles.chevron, { backgroundColor: colors.background }]}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </View>
      </Pressable>

      {release.highlights?.length ? (
        <View style={styles.highlights}>
          {release.highlights.map((h) => (
            <View key={h.text} style={styles.changeRow}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <ThemedText type="small" style={styles.flex}>
                {lang === 'ms' ? h.ms : h.text}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {!open ? (
        <View style={styles.counts}>
          {counts.map((k) => (
            <View key={k.kind} style={[styles.countChip, { backgroundColor: colors.background }]}>
              <Ionicons name={k.icon} size={12} color={colors.accent} />
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {k.n} {t(k.labelKey)}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.details, { borderTopColor: colors.divider }]}>
          {counts.map((k) => (
            <View key={k.kind} style={styles.group}>
              <View style={styles.groupHead}>
                <Ionicons name={k.icon} size={14} color={colors.accent} />
                <ThemedText type="smallBold" style={{ color: colors.textSecondary }}>
                  {t(k.labelKey)}
                </ThemedText>
              </View>
              {release.changes
                .filter((c) => c.kind === k.kind)
                .map((c) => (
                  <View key={c.text} style={styles.changeRow}>
                    <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
                    <ThemedText type="small" style={styles.flex}>
                      {entryText(c, lang)}
                    </ThemedText>
                  </View>
                ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  pressed: { opacity: 0.7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: 6 },
  versionPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  title: { fontSize: FontSize.heading, lineHeight: 24, fontWeight: '700' },
  chevron: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  highlights: { gap: 6, marginTop: Spacing.two },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.three },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  details: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.three },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  changeRow: { flexDirection: 'row', gap: 10 },
  dot: { width: 5, height: 5, borderRadius: Radius.pill, marginTop: 8 },
  footer: { textAlign: 'center', marginTop: Spacing.two },
});
