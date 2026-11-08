import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { normaliseRange } from '@/utils/faham-period';
import type { Window } from '@/utils/insights';

type Props = {
  visible: boolean;
  /** The range shown when the sheet opens. */
  initial: Window;
  todayKey: string;
  onClose: () => void;
  onApply: (range: Window) => void;
};

/** Picks a custom from..to for Faham. Dates after today cannot be chosen, and a reversed pair is put in order. */
export function PeriodSheet({ visible, initial, todayKey, onClose, onApply }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [shownFor, setShownFor] = useState(visible);

  // Start from the current range each time the sheet opens.
  if (visible !== shownFor) {
    setShownFor(visible);
    if (visible) {
      setFrom(initial.from);
      setTo(initial.to);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('plan.analyse.custom.title')}
      footer={<Button label={t('plan.analyse.custom.apply')} onPress={() => onApply(normaliseRange({ from, to }, todayKey))} fullWidth />}
    >
      <View style={styles.body}>
        <View style={styles.field}>
          <ThemedText type="smallBold">{t('plan.analyse.custom.from')}</ThemedText>
          <DateField value={from} onChange={setFrom} maxToday />
        </View>
        <View style={styles.field}>
          <ThemedText type="smallBold">{t('plan.analyse.custom.to')}</ThemedText>
          <DateField value={to} onChange={setTo} maxToday />
        </View>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t('plan.analyse.custom.note')}
        </ThemedText>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: Spacing.two },
  field: { gap: Spacing.one },
});
