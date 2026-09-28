import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Account, AccountType } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass an existing account to edit/delete it. Omit (or null) to create a new one. */
  editingAccount?: Account | null;
};

const TYPE_OPTIONS: { type: AccountType; label: string; icon: string }[] = [
  { type: 'bank', label: 'Bank', icon: '🏦' },
  { type: 'cash', label: 'Cash', icon: '💵' },
  { type: 'other', label: 'Other', icon: '💼' },
];

export function AddAccountModal({ visible, onClose, editingAccount }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { addAccount, updateAccount, deleteAccount } = useTransactions();
  const isEditing = !!editingAccount;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [initialBalance, setInitialBalance] = useState('0');

  // Reset/populate the form whenever the modal opens or the target account changes.
  useEffect(() => {
    if (!visible) return;
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setInitialBalance(String(editingAccount.initialBalance));
    } else {
      setName('');
      setType('bank');
      setInitialBalance('0');
    }
  }, [visible, editingAccount]);

  const trimmedName = name.trim();
  const parsedBalance = parseFloat(initialBalance.replace(',', '.'));
  const balanceValid = Number.isFinite(parsedBalance);
  const canSave = trimmedName.length > 0 && balanceValid;

  function handleSave() {
    if (!canSave) return;
    const icon = TYPE_OPTIONS.find((t) => t.type === type)!.icon;

    if (isEditing && editingAccount) {
      updateAccount(editingAccount.id, { name: trimmedName, type, icon, initialBalance: parsedBalance });
    } else {
      addAccount({ name: trimmedName, type, icon, initialBalance: parsedBalance });
    }
    onClose();
  }

  function handleDelete() {
    if (!editingAccount) return;
    Alert.alert(
      'Delete account?',
      `This removes "${editingAccount.name}" and every transaction tied to it. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAccount(editingAccount.id);
            onClose();
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <ThemedView
          style={[
            styles.modalBox,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <View style={styles.sheetHeader}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {isEditing ? 'Edit account' : 'New account'}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                Cancel
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Name
            </ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
              placeholder="e.g. Maybank, CIMB, Wallet"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Type
            </ThemedText>
            <View style={styles.chipRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = type === opt.type;
                return (
                  <Pressable
                    key={opt.type}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.accent : colors.backgroundElement, borderColor: active ? colors.accent : colors.divider },
                    ]}
                    onPress={() => setType(opt.type)}
                  >
                    <ThemedText type="small" style={active ? { color: '#fff', fontWeight: '600' } : { color: colors.text }}>
                      {opt.icon} {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {isEditing ? 'Starting balance' : 'Starting balance (RM)'}
            </ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={initialBalance}
              onChangeText={setInitialBalance}
              keyboardType="decimal-pad"
            />
            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.three }}>
              The balance this account had before you started tracking transactions in it.
            </ThemedText>

            <Pressable
              style={[styles.saveButton, { backgroundColor: canSave ? colors.accent : colors.backgroundSelected }]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <ThemedText style={[styles.saveButtonText, !canSave && { color: colors.textSecondary }]}>
                {isEditing ? 'Save changes' : 'Add account'}
              </ThemedText>
            </Pressable>

            {isEditing ? (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>Delete account</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </ThemedView>
      </View>
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
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  sheetTitle: { fontSize: 18 },
  fieldLabel: { marginBottom: Spacing.one, marginTop: Spacing.three },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.two },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteButton: { padding: 14, alignItems: 'center', marginBottom: Spacing.three },
});