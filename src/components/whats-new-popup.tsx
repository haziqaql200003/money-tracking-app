import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { entryText, releaseTitle } from '@/constants/changelog';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useUpdates } from '@/context/UpdatesContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/**
 * Opens by itself once after an update. Big updates (the first or second number changed) get a highlight
 * dialog with one call to action; small ones get a short sheet. Silent releases show nothing (badge only).
 */
export function WhatsNewPopup({ visible, onTry }: { visible: boolean; /** "Try it now" on a big update. */ onTry?: () => void }) {
  const colors = useTheme();
  const { t, lang } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { popup, release, markUpdateSeen, currentVersion } = useUpdates();
  const show = visible && !!release && (popup === 'major' || popup === 'minor');
  if (!show || !release) return null;
  // The short key points when the release has them, else its full lines.
  const points = release.highlights?.length ? release.highlights.map((h) => (lang === 'ms' ? h.ms : h.text)) : release.changes.map((c) => entryText(c, lang));

  function seeAll() {
    markUpdateSeen();
    router.push('/more/whats-new');
  }

  if (popup === 'major') {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={markUpdateSeen} statusBarTranslucent>
        <View style={[styles.dim, { backgroundColor: colors.overlay }]}>
          <View style={[styles.dialog, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.head, { backgroundColor: colors.accent }]}>
              <View style={styles.headCircle} />
              <View style={styles.mark}>
                <Ionicons name="wallet" size={22} color={colors.accent} />
              </View>
              <Pressable onPress={markUpdateSeen} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
              <View style={styles.headText}>
                <Text style={[Type.overline, styles.onAccentDim]}>{t('ob.news.big')}</Text>
                <Text style={styles.version}>{currentVersion}</Text>
              </View>
            </View>
            <View style={styles.body}>
              <Text style={[Type.title, { color: colors.text }]}>{releaseTitle(release, lang)}</Text>
              {points.slice(0, 3).map((p, i) => (
                <View key={i} style={styles.line}>
                  <Ionicons name="sparkles" size={14} color={colors.accent} style={styles.lineIcon} />
                  <Text style={[Type.label, { color: colors.textSecondary, flex: 1, fontWeight: '500' }]} numberOfLines={3}>
                    {p}
                  </Text>
                </View>
              ))}
              <Button
                label={onTry ? t('ob.news.try') : t('common.done')}
                onPress={() => {
                  markUpdateSeen();
                  onTry?.();
                }}
                style={{ marginTop: Spacing.two }}
              />
              <Pressable onPress={seeAll} style={styles.ghost} accessibilityRole="button">
                <Text style={[Type.label, { color: colors.textSecondary }]}>{t('ob.news.seeAllChanges')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={markUpdateSeen} statusBarTranslucent>
      <Pressable style={[styles.fill, { backgroundColor: colors.overlay }]} onPress={markUpdateSeen} accessibilityLabel={t('common.close')} />
      <View style={[styles.sheet, { backgroundColor: colors.backgroundElement, paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={[styles.handle, { backgroundColor: colors.divider }]} />
        <View style={styles.sheetHead}>
          <View style={[styles.sheetIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="sparkles" size={22} color="#fff" />
          </View>
          <View style={styles.flex}>
            <Text style={[Type.label, { color: colors.accent }]}>{t('ob.news.version', { v: currentVersion })}</Text>
            <Text style={[Type.title, { color: colors.text }]}>{t('more.whatsNew.title')}</Text>
          </View>
        </View>
        {points.slice(0, 4).map((p, i) => (
          <View key={i} style={styles.sheetRow}>
            <View style={[styles.tick, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="checkmark" size={15} color={colors.accent} />
            </View>
            <Text style={[Type.label, { color: colors.text, flex: 1, fontWeight: '500' }]}>{p}</Text>
          </View>
        ))}
        <View style={styles.sheetButtons}>
          <Button label={t('ob.news.seeAll')} variant="secondary" onPress={seeAll} fullWidth={false} style={styles.flex} />
          <Button label={t('ob.news.ok')} onPress={markUpdateSeen} fullWidth={false} style={styles.flex} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dim: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  dialog: { borderRadius: Radius.xl, overflow: 'hidden' },
  head: { height: 170, padding: 20, justifyContent: 'flex-end', overflow: 'hidden' },
  headCircle: { position: 'absolute', right: -50, top: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
  mark: { position: 'absolute', left: 20, top: 20, width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: 16, top: 16, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headText: { gap: 2 },
  onAccentDim: { color: 'rgba(255,255,255,0.85)' },
  version: { color: '#fff', fontSize: 42, lineHeight: 46, fontWeight: '800' },
  body: { padding: 20, gap: 10 },
  line: { flexDirection: 'row', gap: 8 },
  lineIcon: { marginTop: 3 },
  ghost: { height: 44, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: 22, paddingTop: 12, gap: 14 },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tick: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
