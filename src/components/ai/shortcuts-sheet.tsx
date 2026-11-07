import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { previewText, TEMPLATES, type FillContext, type Shortcut, type Template, type TemplateGroup } from '@/services/ai/shortcuts';
import { Alert } from '@/services/dialog';

type Props = {
  visible: boolean;
  shortcuts: Shortcut[];
  ctx: FillContext;
  onClose: () => void;
  onRun: (s: Shortcut) => void;
  onEdit: (s: Shortcut) => void;
  onDelete: (s: Shortcut) => void;
  onTemplate: (t: Template) => void;
};

type Glyph = keyof typeof Ionicons.glyphMap;
const GROUPS: { id: TemplateGroup; labelKey: TKey }[] = [
  { id: 'record', labelKey: 'ai.sc.g.record' },
  { id: 'plan', labelKey: 'ai.sc.g.plan' },
  { id: 'ask', labelKey: 'ai.sc.g.ask' },
];

/** The pengguna's own shortcuts on top (one tap to run), then every template grouped by what it does. */
export function ShortcutsSheet({ visible, shortcuts, ctx, onClose, onRun, onEdit, onDelete, onTemplate }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const muted = { color: colors.textSecondary };

  const more = (s: Shortcut) =>
    Alert.alert(s.name, undefined, [
      ...(s.literal ? [] : [{ text: t('ai.sc.edit'), onPress: () => onEdit(s) }]),
      {
        text: t('ai.sc.delete'),
        style: 'destructive' as const,
        onPress: () =>
          Alert.alert(t('ai.sc.deleteTitle', { name: s.name }), undefined, [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('ai.sc.delete'), style: 'destructive', onPress: () => onDelete(s) },
          ]),
      },
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('ai.sc.title')}>
      <View style={styles.body}>
        <View style={styles.section}>
          <ThemedText style={[Type.overline, muted]}>{t('ai.sc.mine')}</ThemedText>
          {shortcuts.length === 0 ? (
            <View style={[styles.empty, { borderColor: colors.divider }]}>
              <Ionicons name="bookmark-outline" size={18} color={colors.textSecondary} />
              <ThemedText type="small" style={[styles.flex, muted]}>{t('ai.sc.emptyMine')}</ThemedText>
            </View>
          ) : (
            <View style={[styles.list, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
              {shortcuts.map((s, i) => (
                <View key={s.id} style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
                  <Pressable onPress={() => onRun(s)} onLongPress={() => more(s)} accessibilityRole="button" style={({ pressed }) => [styles.itemMain, pressed && styles.pressed]}>
                    <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                      <Ionicons name={s.icon as Glyph} size={18} color={colors.accent} />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold" numberOfLines={1}>{s.name}</ThemedText>
                      <ThemedText type="small" style={muted} numberOfLines={2}>{previewText(s.text, s.values, ctx, s.literal)}</ThemedText>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => more(s)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('ai.sc.edit')} style={styles.more}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {GROUPS.map((g) => (
          <View key={g.id} style={styles.section}>
            <ThemedText style={[Type.overline, muted]}>{t(g.labelKey)}</ThemedText>
            <View style={styles.grid}>
              {TEMPLATES.filter((x) => x.group === g.id).map((tpl) => (
                <Pressable
                  key={tpl.id}
                  onPress={() => onTemplate(tpl)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.tile, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }, pressed && styles.pressed]}
                >
                  <Ionicons name={tpl.icon as Glyph} size={20} color={colors.accent} />
                  <ThemedText type="small" style={[styles.tileText, { color: colors.text }]} numberOfLines={2}>{t(tpl.labelKey)}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: Spacing.four, paddingBottom: Spacing.three },
  section: { gap: Spacing.two },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  list: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center' },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 12 },
  more: { paddingHorizontal: 14, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: '48%', minHeight: 64, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 6, justifyContent: 'space-between' },
  tileText: { fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
