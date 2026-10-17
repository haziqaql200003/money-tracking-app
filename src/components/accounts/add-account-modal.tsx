import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountForm } from '@/components/accounts/account-form/account-form';
import { AdjustmentsModal } from '@/components/transactions/adjustments-modal';
import { DragSheet } from '@/components/ui/drag-sheet';
import { Radius, Spacing } from '@/constants/theme';
import type { Account } from '@/context/TransactionsContext';
import { useOpenEpoch } from '@/hooks/use-open-epoch';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass an existing account to edit/delete it. Omit (or null) to create a new one. */
  editingAccount?: Account | null;
};

export function AddAccountModal({ visible, onClose, editingAccount }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const epoch = useOpenEpoch(visible);
  const [adjView, setAdjView] = useState<string | null>(null);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

          <DragSheet visible={visible} onClose={onClose}
            style={[
              styles.modalBox,
              { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
            {/* Remounted on every open, so the form starts from the account (or the defaults) with no reset effect. */}
            <AccountForm key={epoch} onClose={onClose} editingAccount={editingAccount} onOpenAdjustments={setAdjView} />
            {visible ? <AdjustmentsModal visible={!!adjView} onClose={() => setAdjView(null)} accountId={adjView} /> : null}
          </DragSheet>
        </KeyboardAvoidingView>
      </Modal>
      {/* After saving, the sheet is closed: the Change button on the undo bar opens the adjustment on its own. */}
      {!visible ? <AdjustmentsModal visible={!!adjView} onClose={() => setAdjView(null)} accountId={adjView} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalBox: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: { width: 36, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing.three },
});
