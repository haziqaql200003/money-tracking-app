import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { DEFAULT_ACCOUNT_ICON } from '@/constants/accounts';
import { Spacing } from '@/constants/theme';
import type { AccountType } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { Alert } from '@/services/dialog';

import { MAX_CUSTOM_TYPES, TYPE_OPTIONS, type CustomType } from './constants';
import { styles } from './styles';

type Props = {
  type: AccountType;
  typeLabel: string | null;
  customTypes: CustomType[];
  setCustomTypes: (updater: (prev: CustomType[]) => CustomType[]) => void;
  onSelectType: (next: AccountType) => void;
  onSelectCustom: (label: string) => void;
};

/** The account-type chips, the user's own types (long-press to remove) and the "add a type" row. */
export function TypePicker({ type, typeLabel, customTypes, setCustomTypes, onSelectType, onSelectCustom }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const typeOption = TYPE_OPTIONS.find((o) => o.type === type)!;

  const newTypeTrimmed = newTypeName.trim();
  const newTypeClash =
    newTypeTrimmed.length > 0 &&
    ([...TYPE_OPTIONS.map((o) => t(o.labelKey)), ...customTypes.map((c) => c.label)] as string[]).some(
      (l) => l.toLowerCase() === newTypeTrimmed.toLowerCase(),
    );

  function addCustomType() {
    if (!newTypeTrimmed || newTypeClash || customTypes.length >= MAX_CUSTOM_TYPES) return;
    setCustomTypes((prev) => [...prev, { id: Date.now().toString(), label: newTypeTrimmed }]);
    onSelectCustom(newTypeTrimmed);
    setNewTypeName('');
    setAddingType(false);
  }

  function removeCustomType(c: CustomType) {
    Alert.alert(t('acct.add.removeTypeTitle'), t('acct.add.removeTypeMsg', { label: c.label }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          setCustomTypes((prev) => prev.filter((x) => x.id !== c.id));
          if (typeLabel === c.label) onSelectType('other');
        },
      },
    ]);
  }

  return (
    <>
      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('acct.add.type')}
      </ThemedText>
      <View style={styles.chipRow}>
        {TYPE_OPTIONS.map((opt) => {
          const active = type === opt.type && typeLabel === null;
          return (
            <Pressable
              key={opt.type}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.accent : colors.backgroundElement,
                  borderColor: active ? colors.accent : colors.divider,
                },
              ]}
              onPress={() => onSelectType(opt.type)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={DEFAULT_ACCOUNT_ICON[opt.type]} size={16} color={active ? '#fff' : colors.text} />
              <ThemedText
                type="small"
                numberOfLines={1}
                style={[styles.chipLabel, active ? { color: '#fff', fontWeight: '600' } : { color: colors.text }]}
              >
                {t(opt.labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
        {customTypes.map((c) => {
          const active = typeLabel === c.label;
          return (
            <Pressable
              key={c.id}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.accent : colors.backgroundElement,
                  borderColor: active ? colors.accent : colors.divider,
                },
              ]}
              onPress={() => onSelectCustom(c.label)}
              onLongPress={() => removeCustomType(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityHint={t('acct.add.removeTypeHint')}
            >
              <Ionicons name="pricetag" size={16} color={active ? '#fff' : colors.text} />
              <ThemedText
                type="small"
                numberOfLines={1}
                style={[styles.chipLabel, active ? { color: '#fff', fontWeight: '600' } : { color: colors.text }]}
              >
                {c.label}
              </ThemedText>
            </Pressable>
          );
        })}
        {customTypes.length < MAX_CUSTOM_TYPES ? (
          <Pressable
            style={[styles.chip, styles.chipIconOnly, { backgroundColor: colors.backgroundElement, borderColor: addingType ? colors.text : colors.divider }]}
            onPress={() => setAddingType((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={t('acct.add.addTypeA11y')}
          >
            <Ionicons name={addingType ? 'close' : 'add'} size={18} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {addingType ? (
        <View style={styles.addTypeRow}>
          <TextInput
            style={[styles.input, styles.addTypeInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            value={newTypeName}
            onChangeText={setNewTypeName}
            placeholder={t('acct.add.typePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            maxLength={20}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={addCustomType}
          />
          <Pressable
            onPress={addCustomType}
            disabled={!newTypeTrimmed || newTypeClash}
            style={[styles.addTypeButton, { backgroundColor: newTypeTrimmed && !newTypeClash ? colors.accent : colors.backgroundSelected }]}
            accessibilityRole="button"
            accessibilityLabel={t('acct.add.saveTypeA11y')}
          >
            <ThemedText type="small" style={{ color: newTypeTrimmed && !newTypeClash ? '#fff' : colors.textSecondary, fontWeight: '600' }}>
              {t('common.add')}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      {addingType && newTypeClash ? (
        <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
          {t('acct.add.typeExists')}
        </ThemedText>
      ) : null}
      <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
        {typeLabel ? t('acct.add.customTypeNote') : t(typeOption.hintKey)}
      </ThemedText>
    </>
  );
}
