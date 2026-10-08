import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

type Props = {
  label: string;
  /** Shown under the label when the financial month is not a calendar month, e.g. "25 Sep - 24 Oct". */
  range?: string;
  isCurrent: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
};

// Fixed row height: the "Back to this month" caption appearing/disappearing
// no longer nudges the chevrons or the content underneath.
export function MonthSwitcher({ label, range, isCurrent, canPrev, canNext, onPrev, onNext, onReset }: Props) {
  const { t } = useT();
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrev}
        disabled={!canPrev}
        hitSlop={8}
        style={[styles.button, { backgroundColor: colors.backgroundElement, opacity: canPrev ? 1 : 0.35 }]}
        accessibilityLabel={t('home.month.previous')}
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
      </Pressable>

      <Pressable style={styles.center} onPress={onReset} disabled={isCurrent}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {!isCurrent ? (
          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
            {t('home.month.backToCurrent')}
          </ThemedText>
        ) : range ? (
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {range}
          </ThemedText>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onNext}
        disabled={!canNext}
        hitSlop={8}
        style={[styles.button, { backgroundColor: colors.backgroundElement, opacity: canNext ? 1 : 0.35 }]}
        accessibilityLabel={t('home.month.next')}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, marginBottom: Spacing.three },
  button: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: FontSize.body, lineHeight: 22, fontWeight: '700' },
});
