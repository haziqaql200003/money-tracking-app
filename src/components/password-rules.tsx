import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import type { PasswordCheck } from '@/utils/password';

const WEAK_KEY: Record<NonNullable<PasswordCheck['weakness']>, TKey> = {
  common: 'ob.pw.weakCommon',
  sequence: 'ob.pw.weakSequence',
  repeat: 'ob.pw.weakRepeat',
  personal: 'ob.pw.weakPersonal',
};

/** Strength meter plus a checklist that turns green as the person types. `match` adds the "both the same" line. */
export function PasswordRules({ check, typed, match }: { check: PasswordCheck; typed: boolean; match?: boolean }) {
  const colors = useTheme();
  const { t } = useT();
  const meterColor = check.score >= 3 ? colors.positive : check.score === 2 ? colors.warning : colors.negative;
  const rows: { ok: boolean; label: string }[] = [
    { ok: check.longEnough, label: t('ob.pw.ruleLength') },
    { ok: check.hasLetter, label: t('ob.pw.ruleLetter') },
    { ok: check.hasNumber, label: t('ob.pw.ruleNumber') },
    { ok: typed && !check.weakness, label: check.weakness ? t(WEAK_KEY[check.weakness]) : t('ob.pw.ruleGuess') },
  ];
  if (match !== undefined) rows.push({ ok: match, label: t('ob.pw.ruleMatch') });

  return (
    <View style={styles.wrap}>
      <View style={styles.meter}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.seg, { backgroundColor: typed && check.score >= i ? meterColor : colors.divider }]} />
        ))}
      </View>
      {rows.map((r) => (
        <View key={r.label} style={styles.row}>
          <View style={[styles.tick, { backgroundColor: r.ok ? colors.positive : colors.backgroundSelected }]}>
            <Ionicons name="checkmark" size={13} color={r.ok ? '#fff' : colors.textSecondary} />
          </View>
          <Text style={[Type.label, { color: r.ok ? colors.text : colors.textSecondary, flex: 1 }]}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 9, marginBottom: 12 },
  meter: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  seg: { flex: 1, height: 6, borderRadius: Radius.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
