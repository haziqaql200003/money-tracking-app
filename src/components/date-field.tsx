import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate, mondayIndex, weekdayShort } from '@/i18n/format';
import { toDateKey } from '@/utils/dates';

type Props = {
  /** YYYY-MM-DD */
  value: string;
  onChange: (iso: string) => void;
  /** Highlight colour for the selected quick chip. */
  accent?: string;
  /** Show the Today / Yesterday shortcuts. */
  showQuick?: boolean;
  /** Stop the user picking a date after today (use for things that already happened). */
  maxToday?: boolean;
};

function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function display(iso: string) {
  const d = parse(iso);
  return `${weekdayShort(mondayIndex(d))}, ${formatDate(d)}`;
}

export function DateField({ value, onChange, accent, showQuick = false, maxToday = false }: Props) {
  const { t, lang } = useT();
  const colors = useTheme();
  const isDark = useColorScheme() === 'dark';
  const [open, setOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const highlight = accent ?? colors.accent;
  const maximumDate = maxToday ? new Date() : undefined;

  function openPicker() {
    setPickerDate(parse(value));
    setOpen(true);
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'set' && selected) onChange(toDateKey(selected));
      return;
    }
    if (selected) setPickerDate(selected);
  }

  function quick(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    onChange(toDateKey(d));
    setOpen(false);
  }

  return (
    <View>
      {showQuick ? (
        <View style={styles.quickRow}>
          {([
            { id: 'today', label: t('common.today'), offset: 0 },
            { id: 'yesterday', label: t('common.yesterday'), offset: -1 },
          ] as const).map(({ id, label, offset }) => {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            const active = value === toDateKey(d);
            return (
              <Pressable
                key={id}
                style={[
                  styles.quick,
                  {
                    borderColor: active ? highlight : colors.divider,
                    backgroundColor: active ? colors.backgroundSelected : colors.backgroundElement,
                  },
                ]}
                onPress={() => quick(offset)}
              >
                <ThemedText type="small" style={active ? { fontWeight: '600' } : undefined}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Pressable
        style={[styles.row, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        onPress={openPicker}
      >
        <View style={styles.rowInner}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <ThemedText>{display(value)}</ThemedText>
        </View>
        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
          {t('home.date.pick')}
        </ThemedText>
      </Pressable>

      {open && Platform.OS === 'ios' ? (
        <View style={[styles.iosCard, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
          <View style={styles.iosToolbar}>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t('common.cancel')}
              </ThemedText>
            </Pressable>
            <ThemedText type="smallBold">{t('home.date.select')}</ThemedText>
            <Pressable
              onPress={() => {
                onChange(toDateKey(pickerDate));
                setOpen(false);
              }}
              hitSlop={8}
            >
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                {t('common.done')}
              </ThemedText>
            </Pressable>
          </View>
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="spinner"
            onChange={onPickerChange}
            themeVariant={isDark ? 'dark' : 'light'}
            locale={lang === 'ms' ? 'ms-MY' : 'en-GB'}
            maximumDate={maximumDate}
          />
        </View>
      ) : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker value={parse(value)} mode="date" display="default" onChange={onPickerChange} maximumDate={maximumDate} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  quick: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iosCard: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginTop: Spacing.two },
  iosToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});