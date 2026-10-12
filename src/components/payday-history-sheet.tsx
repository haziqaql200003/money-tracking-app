import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { RULE_START, type PaydayRuleEntry } from '@/utils/cycle';
import { toDateKey } from '@/utils/dates';

type Props = { visible: boolean; onClose: () => void };
type Kind = 'fixed' | 'eom' | 'none';

const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const dateToKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Payday over time. A change of job (or of how you are paid) starts a new rule on a date you choose; earlier
 * months keep the rule they had. Leaving a job with no new one yet: choose "No regular salary", which uses plain
 * calendar months until the next job.
 */
export function PaydayHistorySheet({ visible, onClose }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { payday, paydayEom, paydayAdjust, paydayHistory, paydayFrom, changePayday, undoPaydayChange } = useSettings();

  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<Kind>('eom');
  const [day, setDay] = useState(25);
  const [adjust, setAdjust] = useState(true);
  const [from, setFrom] = useState(toDateKey(new Date()));
  const [picking, setPicking] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const current: PaydayRuleEntry = { from: paydayFrom ?? RULE_START, day: payday, eom: paydayEom, adjust: paydayAdjust };
  const rules = [...paydayHistory, current];
  const dateText = (key: string) => formatDate(keyToDate(key));

  const ruleText = (r: PaydayRuleEntry) => {
    const base = r.eom ? t('more.profile.paydayEomValue') : r.day <= 1 ? t('more.profile.paydayCalendar') : t('more.profile.paydayValue', { day: r.day });
    return r.adjust ? `${base} · ${t('more.profile.paydayAdjust')}` : base;
  };

  const valid = from > current.from;

  function save() {
    if (!valid) return;
    changePayday({ from, day: kind === 'fixed' ? day : 1, eom: kind === 'eom', adjust: kind === 'none' ? false : adjust });
    setAdding(false);
  }

  function onDateChange(event: DateTimePickerEvent, chosen?: Date) {
    if (Platform.OS === 'android') {
      setPicking(false);
      if (event.type === 'set' && chosen) setFrom(dateToKey(chosen));
      return;
    }
    if (chosen) setPickerDate(chosen);
  }

  const kinds: { key: Kind; label: string }[] = [
    { key: 'eom', label: t('more.profile.hist.kindEom') },
    { key: 'fixed', label: t('more.profile.hist.kindFixed') },
    { key: 'none', label: t('more.profile.hist.kindNone') },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title={t('more.profile.hist.title')}>
      <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
        {t('more.profile.hist.intro')}
      </ThemedText>

      <Card padding={0} style={styles.block}>
        {rules.map((r, i) => (
          <View key={`${r.from}-${i}`} style={[styles.row, i < rules.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={styles.flex}>
              <ThemedText>{ruleText(r)}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {r.from === RULE_START ? t('more.profile.hist.always') : t('more.profile.hist.since', { date: dateText(r.from) })}
                {i === rules.length - 1 ? ` · ${t('more.profile.hist.now')}` : ''}
              </ThemedText>
            </View>
          </View>
        ))}
      </Card>

      {adding ? (
        <Card style={styles.block}>
          <ThemedText type="smallBold">{t('more.profile.hist.newRule')}</ThemedText>
          <View style={styles.kindRow}>
            {kinds.map((k) => {
              const active = kind === k.key;
              return (
                <Pressable
                  key={k.key}
                  onPress={() => setKind(k.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.kind, { borderColor: active ? colors.accent : colors.divider, backgroundColor: active ? colors.backgroundSelected : colors.background }]}
                >
                  <ThemedText type="small" style={{ color: active ? colors.accent : colors.textSecondary, fontWeight: '700', textAlign: 'center' }}>
                    {k.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {kind === 'none' ? (
            <ThemedText type="small" style={[styles.help, { color: colors.textSecondary }]}>
              {t('more.profile.hist.noneHelp')}
            </ThemedText>
          ) : null}

          {kind === 'fixed' ? (
            <View style={styles.stepRow}>
              <ThemedText style={styles.flex}>{t('more.profile.paydayDay')}</ThemedText>
              <Pressable onPress={() => setDay((d) => Math.max(2, d - 1))} style={[styles.stepBtn, { backgroundColor: colors.background }]} accessibilityRole="button" accessibilityLabel={t('more.profile.paydayDown')}>
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>
              <ThemedText style={styles.stepNumber}>{day}</ThemedText>
              <Pressable onPress={() => setDay((d) => Math.min(28, d + 1))} style={[styles.stepBtn, { backgroundColor: colors.background }]} accessibilityRole="button" accessibilityLabel={t('more.profile.paydayUp')}>
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
            </View>
          ) : null}

          {kind !== 'none' ? (
            <View style={styles.stepRow}>
              <View style={styles.flex}>
                <ThemedText>{t('more.profile.paydayAdjust')}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('more.profile.paydayAdjustSub')}
                </ThemedText>
              </View>
              <Switch value={adjust} onValueChange={setAdjust} trackColor={{ true: colors.accent }} />
            </View>
          ) : null}

          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('more.profile.hist.from')}
          </ThemedText>
          <Pressable
            style={[styles.dateRow, { borderColor: colors.divider, backgroundColor: colors.background }]}
            onPress={() => {
              setPickerDate(keyToDate(from));
              setPicking(true);
            }}
          >
            <View style={styles.dateLeft}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <ThemedText>{dateText(from)}</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              {t('tx.add.pickDate')}
            </ThemedText>
          </Pressable>
          {picking && Platform.OS === 'ios' ? (
            <View style={[styles.pickerCard, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
              <View style={styles.pickerBar}>
                <Pressable onPress={() => setPicking(false)} hitSlop={8}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('common.cancel')}</ThemedText>
                </Pressable>
                <ThemedText type="smallBold">{t('tx.add.selectDate')}</ThemedText>
                <Pressable
                  onPress={() => {
                    setFrom(dateToKey(pickerDate));
                    setPicking(false);
                  }}
                  hitSlop={8}
                >
                  <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('common.done')}</ThemedText>
                </Pressable>
              </View>
              <DateTimePicker value={pickerDate} mode="date" display="spinner" onChange={onDateChange} themeVariant={isDark ? 'dark' : 'light'} />
            </View>
          ) : null}
          {picking && Platform.OS === 'android' ? <DateTimePicker value={keyToDate(from)} mode="date" display="default" onChange={onDateChange} /> : null}

          <ThemedText type="small" style={[styles.help, { color: valid ? colors.textSecondary : colors.negative }]}>
            {valid ? t('more.profile.hist.fromHelp') : t('more.profile.hist.fromInvalid', { date: dateText(current.from) })}
          </ThemedText>
          <View style={styles.buttons}>
            <Button label={t('common.save')} onPress={save} disabled={!valid} style={styles.flex} />
            <Button label={t('common.cancel')} variant="secondary" onPress={() => setAdding(false)} style={styles.flex} />
          </View>
        </Card>
      ) : (
        <View style={styles.buttons}>
          <Button label={t('more.profile.hist.add')} onPress={() => setAdding(true)} style={styles.flex} />
          {paydayHistory.length > 0 ? <Button label={t('more.profile.hist.undo')} variant="secondary" onPress={undoPaydayChange} style={styles.flex} /> : null}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: 12 },
  flex: { flex: 1 },
  kindRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  kind: { flex: 1, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: Radius.md, borderWidth: 1 },
  help: { marginTop: Spacing.two },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  stepBtn: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { minWidth: 28, textAlign: 'center', fontWeight: '700' },
  label: { marginTop: Spacing.three, marginBottom: Spacing.one },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 14 },
  dateLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerCard: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginTop: Spacing.two },
  pickerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  buttons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
});
