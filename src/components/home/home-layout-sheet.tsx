import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { HOME_WIDGETS, useHomeLayout } from '@/components/home/home-layout';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

/** Settings for Home's sections: on / off and order (3.7.0, Home A5). */
export function HomeLayoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const colors = useTheme();
  const { order, hidden, toggle, move, reset } = useHomeLayout();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('home.layout.title')}>
      <ThemedText type="small" style={[styles.sub, { color: colors.textSecondary }]}>
        {t('home.layout.sub')}
      </ThemedText>
      <View style={[styles.list, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        {order.map((id, i) => {
          const meta = HOME_WIDGETS.find((w) => w.id === id)!;
          const on = !hidden.includes(id);
          return (
            <View key={id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
              <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={18} color={on ? colors.accent : colors.textSecondary} />
              <ThemedText type="smallBold" style={[styles.name, !on && { color: colors.textSecondary }]} numberOfLines={2}>
                {t(meta.labelKey)}
              </ThemedText>
              <Pressable
                onPress={() => move(id, -1)}
                disabled={i === 0}
                hitSlop={6}
                style={[styles.arrow, { borderColor: colors.divider }, i === 0 && styles.dim]}
                accessibilityRole="button"
                accessibilityLabel={`${t('home.layout.up')}: ${t(meta.labelKey)}`}
              >
                <Ionicons name="chevron-up" size={16} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => move(id, 1)}
                disabled={i === order.length - 1}
                hitSlop={6}
                style={[styles.arrow, { borderColor: colors.divider }, i === order.length - 1 && styles.dim]}
                accessibilityRole="button"
                accessibilityLabel={`${t('home.layout.down')}: ${t(meta.labelKey)}`}
              >
                <Ionicons name="chevron-down" size={16} color={colors.text} />
              </Pressable>
              <Switch value={on} onValueChange={() => toggle(id)} trackColor={{ true: colors.accent }} accessibilityLabel={t(meta.labelKey)} />
            </View>
          );
        })}
      </View>
      <Pressable onPress={reset} style={styles.reset} accessibilityRole="button">
        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
          {t('home.layout.reset')}
        </ThemedText>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sub: { marginBottom: Spacing.three },
  list: { borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  name: { flex: 1 },
  arrow: { width: 32, height: 32, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
  reset: { alignItems: 'center', paddingVertical: Spacing.three },
});
