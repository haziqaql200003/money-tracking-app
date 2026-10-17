import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { resolveDialog, subscribeDialogs, type DialogButton, type DialogRequest } from '@/services/dialog';

/**
 * Draws the alerts raised through services/dialog on the web (phones use the system alert and never reach this).
 * One dialog at a time, oldest first. Escape or a tap outside counts as the cancel button when there is one.
 */
export function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  useEffect(() => subscribeDialogs(setQueue), []);
  if (Platform.OS !== 'web') return null;
  const current = queue[0];
  if (!current) return null;
  return <WebDialog key={current.id} dialog={current} />;
}

function WebDialog({ dialog }: { dialog: DialogRequest }) {
  const colors = useTheme();
  const { t } = useT();
  const buttons: DialogButton[] = dialog.buttons.length > 0 ? dialog.buttons : [{ text: t('common.ok') }];
  const cancel = buttons.find((b) => b.style === 'cancel');
  // Cancel sits on the left, the action on the right, as on iPhone.
  const ordered = [...buttons.filter((b) => b.style === 'cancel'), ...buttons.filter((b) => b.style !== 'cancel')];
  const dismiss = () => resolveDialog(dialog.id, cancel ?? (buttons.length === 1 ? buttons[0] : undefined));

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={dismiss} accessibilityLabel={cancel?.text}>
        <Pressable style={[styles.card, { backgroundColor: colors.backgroundElement }]} onPress={() => {}} accessibilityRole="alert">
          <Text style={[styles.title, { color: colors.text }]}>{dialog.title}</Text>
          {dialog.message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{dialog.message}</Text> : null}
          <View style={styles.row}>
            {ordered.map((b, i) => {
              const destructive = b.style === 'destructive';
              const isCancel = b.style === 'cancel';
              const filled = !isCancel && !destructive;
              return (
                <Pressable
                  key={`${b.text ?? ''}-${i}`}
                  onPress={() => resolveDialog(dialog.id, b)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    filled && { backgroundColor: colors.accent },
                    destructive && { backgroundColor: colors.negative },
                    isCancel && { backgroundColor: colors.backgroundSelected },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: isCancel ? colors.text : colors.onAccent }]} numberOfLines={1}>
                    {b.text ?? t('common.ok')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: 380, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two },
  title: { fontSize: FontSize.heading, fontWeight: '700' },
  message: { fontSize: FontSize.body, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.three },
  button: { minWidth: 96, paddingVertical: 10, paddingHorizontal: Spacing.three, borderRadius: Radius.md, alignItems: 'center' },
  buttonText: { fontSize: FontSize.label, fontWeight: '700' },
});
