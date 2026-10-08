import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinPad } from '@/components/pin-pad';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppLock } from '@/context/AppLockContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { PIN_LENGTH } from '@/services/app-lock';

export type PinPurpose = 'set' | 'change' | 'disable';
type Step = 'old' | 'new' | 'confirm';

/** Asks for digits in the right order: set (new, again), change (old, new, again) or turn off (old). Mount it only while open. */
export function PinFlowModal({ purpose, onClose }: { purpose: PinPurpose; onClose: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { enable, disable, changePin, verifyPin } = useAppLock();
  const [step, setStep] = useState<Step>(purpose === 'set' ? 'new' : 'old');
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [wait, setWait] = useState(false);
  const busy = useRef(false);

  const title = purpose === 'disable' ? t('more.security.pinOffTitle') : step === 'old' ? t('more.security.pinOld') : step === 'new' ? t('more.security.pinNew') : t('more.security.pinAgain');

  async function done(next: string) {
    if (busy.current) return;
    busy.current = true;
    try {
      if (step === 'old') {
        const res = await verifyPin(next);
        if (!res.ok) {
          setWait(res.waitMs > 0);
          setProblem(res.waitMs > 0 ? t('more.security.waitShort', { s: Math.ceil(res.waitMs / 1000) }) : t('more.security.wrongPin', { n: res.left }));
          setTimeout(() => setPin(''), 350);
          return;
        }
        if (purpose === 'disable') {
          await disable();
          onClose();
          return;
        }
        setStep('new');
        setPin('');
        return;
      }
      if (step === 'new') {
        setFirst(next);
        setStep('confirm');
        setPin('');
        return;
      }
      if (next !== first) {
        setProblem(t('more.security.pinMismatch'));
        setStep('new');
        setFirst('');
        setTimeout(() => setPin(''), 350);
        return;
      }
      if (purpose === 'set') await enable(next);
      else await changePin(next);
      onClose();
    } finally {
      busy.current = false;
    }
  }

  function onChange(next: string) {
    setProblem(null);
    setWait(false);
    setPin(next);
    if (next.length === PIN_LENGTH) void done(next);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safe}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <View style={styles.top}>
            <ThemedText type="subtitle" style={styles.center}>{title}</ThemedText>
            <ThemedText type="small" style={[styles.center, { color: problem ? colors.negative : colors.textSecondary, minHeight: 36 }]}>
              {problem ?? t('more.security.pinDigits', { n: PIN_LENGTH })}
            </ThemedText>
          </View>
          <PinPad value={pin} onChange={onChange} error={!!problem} disabled={wait} />
          <View style={styles.spacer} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: Spacing.four },
  close: { alignSelf: 'flex-end', padding: Spacing.two },
  top: { alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  spacer: { height: Spacing.four },
});
