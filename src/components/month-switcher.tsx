import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  isCurrent: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
};

// Fixed row height: the "Back to this month" caption appearing/disappearing
// no longer nudges the chevrons or the content underneath.
export function MonthSwitcher({ label, isCurrent, canPrev, canNext, onPrev, onNext, onReset }: Props) {
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrev}
        disabled={!canPrev}
        hitSlop={8}
        style={[styles.button, { backgroundColor: colors.backgroundElement, opacity: canPrev ? 1 : 0.35 }]}
        accessibilityLabel="Previous month"
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
      </Pressable>

      <Pressable style={styles.center} onPress={onReset} disabled={isCurrent}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {!isCurrent ? (
          <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
            Back to this month
          </ThemedText>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onNext}
        disabled={!canNext}
        hitSlop={8}
        style={[styles.button, { backgroundColor: colors.backgroundElement, opacity: canNext ? 1 : 0.35 }]}
        accessibilityLabel="Next month"
      >
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, marginBottom: Spacing.three },
  button: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
});
