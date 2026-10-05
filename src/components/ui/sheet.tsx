import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Right-hand header action, e.g. a Save text button. Cancel is always on the left. */
  right?: ReactNode;
  /** Pinned under the scrolling content, e.g. the main Save button. */
  footer?: ReactNode;
  children: ReactNode;
};

const SLOT = 72;

/**
 * Bottom sheet shared by every form: backdrop, handle, header (Cancel · title · action),
 * scrolling body and an optional pinned footer. Replaces the frame each modal rebuilt itself.
 */
export function Sheet({ visible, onClose, title, right, footer, children }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel={t('common.close')} />

        <View
          style={[
            styles.box,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <View style={styles.header}>
            <View style={[styles.slot, { alignItems: 'flex-start' }]}>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                <Text style={[Type.label, { color: colors.accent }]}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <Text style={[Type.heading, styles.title, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            <View style={[styles.slot, { alignItems: 'flex-end' }]}>{right}</View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  box: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '92%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.three },
  slot: { width: SLOT, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
  footer: { paddingTop: Spacing.three },
});
