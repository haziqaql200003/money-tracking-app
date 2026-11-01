import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { FeedItem } from '@/utils/insight-feed';

/**
 * The door to "Ask WaKira" at the top of the Insight tab: insights and the assistant work as one.
 * Each warning in the feed becomes a ready question ("Explain: ..."). Works on the phone alone; harder questions and photos/PDFs go to the AI server when signed in.
 */
export function AskWakiraCard({ feed }: { feed: FeedItem[] }) {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();

  const open = (q?: string) => router.push((q ? { pathname: '/more/ai', params: { q } } : '/more/ai') as Href);
  const chips = [
    ...feed
      .filter((f) => f.tone === 'warn' || f.tone === 'bad')
      .slice(0, 1)
      .map((f) => t('ai.suggest.explain', { title: f.title })),
    t('ai.suggest.where'),
    t('ai.suggest.forecast'),
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="sparkles" size={18} color={colors.accent} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{t('ai.entry.title')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('ai.entry.body')}</ThemedText>
        </View>
      </View>
      <Pressable
        onPress={() => open()}
        accessibilityRole="button"
        accessibilityLabel={t('ai.entry.title')}
        style={({ pressed }) => [styles.fakeInput, { backgroundColor: colors.backgroundSelected }, pressed && styles.pressed]}
      >
        <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]}>{t('ai.entry.input')}</ThemedText>
        <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
        <Ionicons name="arrow-up-circle" size={22} color={colors.accent} />
      </Pressable>
      <View style={styles.chips}>
        {chips.map((c) => (
          <Pressable key={c} onPress={() => open(c)} accessibilityRole="button" style={({ pressed }) => [styles.chip, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: colors.accent }} numberOfLines={1}>{c}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, padding: 18, marginBottom: Spacing.three, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  fakeInput: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: Radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, maxWidth: '100%' },
  pressed: { opacity: 0.7 },
});
