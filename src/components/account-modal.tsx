import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/context/ProfileContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useCategories } from '@/context/CategoriesContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AccountModal({ visible, onClose }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { displayName, setDisplayName } = useProfile();
  const { resetAllData } = useTransactions();
  const { resetCategories } = useCategories();

  const [name, setName] = useState(displayName);

  useEffect(() => {
    if (visible) setName(displayName);
  }, [visible, displayName]);

  function handleSave() {
    const trimmed = name.trim();
    if (trimmed) setDisplayName(trimmed);
    onClose();
  }

  function handleReset() {
    Alert.alert(
      'Reset all data?',
      'This clears every transaction and account back to the sample data. Useful for testing — this cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { resetAllData(); resetCategories(); onClose(); } },
      ],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <ThemedView
          style={[styles.modalBox, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <View style={styles.sheetHeader}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>Account</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>Close</ThemedText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.avatarRow}>
              <View style={[styles.avatarLarge, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText style={styles.avatarLetter}>{(name || '?').charAt(0).toUpperCase()}</ThemedText>
              </View>
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Display name
            </ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
            />

            <Pressable style={[styles.saveButton, { backgroundColor: colors.accent }]} onPress={handleSave}>
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.two }}>
              Money Tracker · MVP build
            </ThemedText>

            <Pressable style={styles.resetButton} onPress={handleReset}>
              <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>Reset all data</ThemedText>
            </Pressable>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalBox: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  sheetTitle: { fontSize: 18 },
  avatarRow: { alignItems: 'center', marginBottom: Spacing.four },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 28, fontWeight: '700' },
  fieldLabel: { marginBottom: Spacing.one },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 14, fontSize: 16, marginBottom: Spacing.three },
  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: Spacing.four },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.three },
  resetButton: { padding: 14, alignItems: 'center', marginBottom: Spacing.three },
});