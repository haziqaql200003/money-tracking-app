import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { ActionProposal } from '@/services/ai/brain';

import type { ProposalStatus } from './proposal-card';

const ICON: Record<ActionProposal['kind'], keyof typeof Ionicons.glyphMap> = {
  instalment: 'card-outline',
  iou: 'people-outline',
  budget: 'pie-chart-outline',
  goal: 'flag-outline',
  recurring: 'repeat-outline',
  breakdown: 'list-outline',
};

/**
 * A set-up the assistant prepared for another part of WaKira (Hutang, budgets, goals, recurring).
 * Nothing changes until the pengguna taps Save. Undo is offered where the change can be reversed cleanly.
 */
export function ActionCard({ action, status, canUndo, onSave, onSkip, onUndo }: { action: ActionProposal; status: ProposalStatus; canUndo: boolean; onSave: () => void; onSkip: () => void; onUndo: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const done = status !== 'pending';
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border, opacity: status === 'skipped' ? 0.6 : 1 }]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={ICON[action.kind]} size={16} color={colors.accent} />
        </View>
        <ThemedText type="smallBold" style={styles.flex}>{action.title}</ThemedText>
        {done ? (
          <ThemedText type="small" style={{ color: status === 'saved' ? colors.positive : colors.textSecondary }}>
            {status === 'saved' ? t('ai.b.act.saved') : t('ai.b.act.skipped')}
          </ThemedText>
        ) : null}
      </View>
      {action.summary.map((r) => (
        <View key={r.label} style={styles.row}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>{r.label}</ThemedText>
          <ThemedText type="small" style={styles.value} numberOfLines={2}>
            {hideAmounts && /RM/.test(r.value) ? 'RM ••••' : r.value}
          </ThemedText>
        </View>
      ))}
      {action.notes.map((n) => (
        <ThemedText key={n} type="small" style={[styles.note, { color: colors.textSecondary }]}>{n}</ThemedText>
      ))}
      <View style={styles.buttons}>
        {status === 'pending' ? (
          <>
            <Pressable onPress={onSkip} accessibilityRole="button" style={[styles.btn, { backgroundColor: colors.backgroundSelected }]}>
              <ThemedText type="smallBold">{t('ai.card.skip')}</ThemedText>
            </Pressable>
            <Pressable onPress={onSave} accessibilityRole="button" style={[styles.btn, { backgroundColor: colors.accent }]}>
              <ThemedText type="smallBold" style={{ color: colors.onAccent }}>{t('ai.card.save')}</ThemedText>
            </Pressable>
          </>
        ) : status === 'saved' && canUndo ? (
          <Pressable onPress={onUndo} accessibilityRole="button" style={[styles.btn, { backgroundColor: colors.backgroundSelected }]}>
            <ThemedText type="smallBold">{t('ai.card.undo')}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: 2 },
  badge: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  value: { flex: 1, textAlign: 'right' },
  note: { fontSize: 12, marginTop: 2 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: 4 },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill },
});
