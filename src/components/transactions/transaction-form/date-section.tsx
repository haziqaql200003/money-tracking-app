import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { WebDateOverlay } from '@/components/ui/web-date-overlay';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

import { dateKeyFromToday, formatDisplayDate, parseDateString, toDateString } from './helpers';
import { styles } from './styles';

type Props = { date: string; setDate: (iso: string) => void; typeAccent: string };

/** Today / Yesterday shortcuts plus a date picker (native spinner on iOS, dialog on Android, browser calendar on web). */
export function DateSection({ date, setDate, typeAccent }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const isDark = useColorScheme() === 'dark';
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  function setQuickDate(offsetDays: number) {
    setDate(dateKeyFromToday(offsetDays));
    setShowDatePicker(false);
  }

  function openDatePicker() {
    setPickerDate(parseDateString(date));
    setShowDatePicker(true);
  }

  function confirmDatePicker() {
    setDate(toDateString(pickerDate));
    setShowDatePicker(false);
  }

  function cancelDatePicker() {
    setShowDatePicker(false);
  }

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selected) {
        setDate(toDateString(selected));
      }
      return;
    }
    if (selected) setPickerDate(selected);
  }

  return (
    <>
      {/* Date */}
      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('common.date')}
      </ThemedText>
      <View style={styles.dateQuickRow}>
        {([
          { key: 'today', label: t('common.today'), offset: 0 },
          { key: 'yesterday', label: t('common.yesterday'), offset: -1 },
        ] as const).map(({ key, label, offset }) => {
          const iso = dateKeyFromToday(offset);
          const active = date === iso;
          return (
            <Pressable
              key={key}
              style={[
                styles.dateQuick,
                {
                  borderColor: active ? typeAccent : colors.divider,
                  backgroundColor: active ? colors.backgroundSelected : colors.backgroundElement,
                },
              ]}
              onPress={() => setQuickDate(offset)}
            >
              <ThemedText type="small" style={active ? { fontWeight: '600' } : undefined}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={[styles.dateRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        onPress={openDatePicker}
      >
        <View style={styles.chipInner}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <ThemedText>{formatDisplayDate(date)}</ThemedText>
        </View>
        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
          {t('tx.add.pickDate')}
        </ThemedText>
        <WebDateOverlay value={date} onChange={setDate} max={toDateString(new Date())} />
      </Pressable>

      {showDatePicker && Platform.OS === 'ios' ? (
        <View style={[styles.iosPickerCard, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
          <View style={styles.iosPickerToolbar}>
            <Pressable onPress={cancelDatePicker} hitSlop={8}>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                {t('common.cancel')}
              </ThemedText>
            </Pressable>
            <ThemedText type="smallBold">{t('tx.add.selectDate')}</ThemedText>
            <Pressable onPress={confirmDatePicker} hitSlop={8}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
                {t('common.done')}
              </ThemedText>
            </Pressable>
          </View>
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="spinner"
            onChange={onDateChange}
            themeVariant={isDark ? 'dark' : 'light'}
            maximumDate={new Date()}
          />
        </View>
      ) : null}

      {showDatePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parseDateString(date)}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      ) : null}
    </>
  );
}
