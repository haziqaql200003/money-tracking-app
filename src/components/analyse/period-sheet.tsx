import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { monthShort } from '@/i18n/format';
import { cycleOf } from '@/utils/cycle';
import { normaliseRange, rangeLabel, resolvePeriod, type FahamPeriod, type PeriodChoice, type PeriodPreset } from '@/utils/faham-period';

type Props = {
  visible: boolean;
  /** The period showing when the sheet opens. */
  period: FahamPeriod;
  todayKey: string;
  onClose: () => void;
  onApply: (choice: PeriodChoice) => void;
};

/** The lengths offered in the sheet. "1M" stands for one payday month, picked in the grid below it. */
const LENGTHS: readonly PeriodPreset[] = ['1M', '3M', '6M', '12M', 'YTD', 'custom'];
const FIRST_YEAR = 2015;
const pad = (n: number) => String(n).padStart(2, '0');

function choiceOf(p: FahamPeriod): PeriodChoice {
  if (p.preset === 'cycle') return { preset: 'cycle', cycleKey: p.cycleKey };
  if (p.preset === 'custom') return { preset: 'custom', custom: p.window };
  return { preset: p.preset };
}

/**
 * Picks the Faham period (3.8.1): a length (one month, 3, 6 or 12 months, this year, or your own dates), and for one
 * month a grid of the year's payday months. Months still to come cannot be picked; the running one says "so far".
 */
export function PeriodSheet({ visible, period, todayKey, onClose, onApply }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const nowKey = cycleOf(todayKey);
  const [draft, setDraft] = useState<PeriodChoice>(() => choiceOf(period));
  const [year, setYear] = useState(Number((period.cycleKey ?? nowKey).slice(0, 4)));
  const [from, setFrom] = useState(period.window.from);
  const [to, setTo] = useState(period.window.to);
  const [shownFor, setShownFor] = useState(visible);

  // Start from the period on screen each time the sheet opens.
  if (visible !== shownFor) {
    setShownFor(visible);
    if (visible) {
      setDraft(choiceOf(period));
      setYear(Number((period.cycleKey ?? nowKey).slice(0, 4)));
      setFrom(period.window.from);
      setTo(period.window.to);
    }
  }

  const single = draft.preset === '1M' || draft.preset === 'cycle';
  const pickedKey = draft.preset === 'cycle' ? draft.cycleKey : draft.preset === '1M' ? nowKey : null;
  const custom = draft.preset === 'custom' ? normaliseRange({ from, to }, todayKey) : null;
  const preview = resolvePeriod(draft.preset, todayKey, custom, draft.cycleKey);
  const nowYear = Number(nowKey.slice(0, 4));

  const pickLength = (k: PeriodPreset) => setDraft({ preset: k });
  const pickMonth = (key: string) => setDraft(key === nowKey ? { preset: '1M' } : { preset: 'cycle', cycleKey: key });
  const apply = () => onApply(draft.preset === 'custom' ? { preset: 'custom', custom } : draft);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('plan.analyse.sheet.title')}
      footer={<Button label={t('plan.analyse.sheet.apply')} onPress={apply} fullWidth />}
    >
      <View style={styles.body}>
        <View style={styles.chips}>
          {LENGTHS.map((k) => (
            <Chip key={k} size="sm" label={t(`plan.analyse.sheet.len.${k}` as TKey)} active={k === '1M' ? single : draft.preset === k} onPress={() => pickLength(k)} />
          ))}
        </View>

        {single ? (
          <View style={styles.block}>
            <View style={styles.yearRow}>
              <Pressable
                onPress={() => setYear((y) => Math.max(FIRST_YEAR, y - 1))}
                disabled={year <= FIRST_YEAR}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('plan.analyse.sheet.prevYear')}
                style={styles.yearBtn}
              >
                <Ionicons name="chevron-back" size={18} color={year <= FIRST_YEAR ? colors.divider : colors.text} />
              </Pressable>
              <ThemedText type="smallBold" style={styles.year}>
                {t('plan.analyse.sheet.cycles', { year })}
              </ThemedText>
              <Pressable
                onPress={() => setYear((y) => Math.min(nowYear, y + 1))}
                disabled={year >= nowYear}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('plan.analyse.sheet.nextYear')}
                style={styles.yearBtn}
              >
                <Ionicons name="chevron-forward" size={18} color={year >= nowYear ? colors.divider : colors.text} />
              </Pressable>
            </View>
            <View style={styles.grid}>
              {Array.from({ length: 12 }, (_, m) => {
                const key = `${year}-${pad(m + 1)}`;
                const future = key > nowKey;
                const on = key === pickedKey;
                const running = key === nowKey;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (!future) pickMonth(key);
                    }}
                    disabled={future}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: future }}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: on ? colors.accent : future ? 'transparent' : colors.backgroundElement,
                        borderColor: future ? colors.divider : on ? colors.accent : colors.border,
                      },
                      future && styles.future,
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: on ? colors.onAccent : future ? colors.textSecondary : colors.text }}>
                      {monthShort(m)}
                    </ThemedText>
                    {running ? (
                      <ThemedText type="small" style={[styles.soFar, { color: on ? colors.onAccent : colors.textSecondary }]}>
                        {t('plan.analyse.sheet.soFar')}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {draft.preset === 'custom' ? (
          <View style={styles.block}>
            <View style={styles.field}>
              <ThemedText type="smallBold">{t('plan.analyse.custom.from')}</ThemedText>
              <DateField value={from} onChange={setFrom} maxToday />
            </View>
            <View style={styles.field}>
              <ThemedText type="smallBold">{t('plan.analyse.custom.to')}</ThemedText>
              <DateField value={to} onChange={setTo} maxToday />
            </View>
          </View>
        ) : null}

        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {t('plan.analyse.sheet.preview', { range: rangeLabel(preview.window), prev: rangeLabel(preview.previous) })}
        </ThemedText>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  block: { gap: Spacing.two },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  yearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  year: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cell: { width: '22%', flexGrow: 1, minHeight: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.one },
  future: { borderStyle: 'dashed' },
  soFar: { fontSize: 10, lineHeight: 12 },
  field: { gap: Spacing.one },
});
