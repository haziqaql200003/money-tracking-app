import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TransactionForm } from '@/components/transactions/transaction-form/transaction-form';
import { DragSheet } from '@/components/ui/drag-sheet';
import { Radius, Spacing } from '@/constants/theme';
import type { Transaction } from '@/context/TransactionsContext';
import { useOpenEpoch } from '@/hooks/use-open-epoch';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Add mode: called on save. */
  onSave?: (t: Omit<Transaction, 'id'>) => void;
  /** Pass an existing transaction for Edit mode (shows a Delete button in the header). */
  editingTransaction?: Transaction | null;
};

export function AddTransactionModal({ visible, onClose, onSave, editingTransaction }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const epoch = useOpenEpoch(visible);

  return (
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
          {/* Remounted on every open, so the form starts from the transaction (or the defaults) with no reset code. */}
          <TransactionForm key={epoch} onClose={onClose} onSave={onSave} editingTransaction={editingTransaction} />
        </DragSheet>
      </KeyboardAvoidingView>
    </Modal>
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
