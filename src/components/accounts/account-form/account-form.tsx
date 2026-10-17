import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { AccountCard } from '@/components/accounts/account-card';
import { ThemedText } from '@/components/ui/themed-text';
import { SheetHeader } from '@/components/ui/sheet-header';
import { DEFAULT_ACCOUNT_ICON } from '@/constants/accounts';
import type { IconName } from '@/constants/categories';
import { CARD_COLORS, DEFAULT_COLOR, DEFAULT_DESIGN, normalizeDesign, type CardDesign } from '@/constants/card-styles';
import { Spacing } from '@/constants/theme';
import type { Account, AccountType } from '@/context/TransactionsContext';
import { ADJUSTMENT_WINDOW_MS, useTransactions } from '@/context/TransactionsContext';
import { useAuth } from '@/context/AuthContext';
import { useUndo } from '@/context/UndoContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';
import { Alert } from '@/services/dialog';
import { formatMoney } from '@/utils/currency';

import { BalanceSection } from './balance-section';
import { TYPE_OPTIONS, type CustomType } from './constants';
import { LookSection } from './look-section';
import { styles } from './styles';
import { TypePicker } from './type-picker';

type Props = {
  onClose: () => void;
  /** An existing account to edit/delete. Omit (or null) to create a new one. */
  editingAccount?: Account | null;
  /** Open the balance-adjustment history for an account (lives in the modal shell so it survives closing the sheet). */
  onOpenAdjustments: (accountId: string) => void;
};

/**
 * The add / edit account form. It is remounted every time the sheet opens, so every field starts from the
 * account being edited (or the defaults) through its useState initialiser.
 */
export function AccountForm({ onClose, editingAccount, onOpenAdjustments }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const { addAccount, updateAccount, deleteAccount, adjustAccountBalance, removeAdjustment, accountBalance } = useTransactions();
  const { offer } = useUndo();
  const { user } = useAuth();
  const isEditing = !!editingAccount;
  const editColor = editingAccount ? editingAccount.color ?? DEFAULT_COLOR[editingAccount.type] ?? DEFAULT_COLOR.other : null;

  const [name, setName] = useState(editingAccount ? accountName(editingAccount) : '');
  const [customTypes, setCustomTypes] = usePersistedState<CustomType[]>('account-custom-types', [], user?.id ?? null);
  const [type, setType] = useState<AccountType>(editingAccount ? editingAccount.type : 'bank');
  const [typeLabel, setTypeLabel] = useState<string | null>(editingAccount?.typeLabel ?? null);
  const [provider, setProvider] = useState(editingAccount?.provider ?? '');
  const [last4, setLast4] = useState(editingAccount?.last4 ?? '');
  const [initialBalance, setInitialBalance] = useState('');
  const [adjustTo, setAdjustTo] = useState('');
  const [adjustZero, setAdjustZero] = useState(false);
  const [adjustNote, setAdjustNote] = useState('');
  const [design, setDesign] = useState<CardDesign>(editingAccount ? normalizeDesign(editingAccount.design) : DEFAULT_DESIGN);
  const [color, setColor] = useState(editColor ?? DEFAULT_COLOR.bank);
  const [colorTouched, setColorTouched] = useState(isEditing);
  const [icon, setIcon] = useState<IconName>(editingAccount ? editingAccount.icon : DEFAULT_ACCOUNT_ICON.bank);
  const [iconTouched, setIconTouched] = useState(isEditing);

  const typeOption = TYPE_OPTIONS.find((o) => o.type === type)!;
  const showBankFields = type !== 'cash';
  const trimmedName = name.trim();
  const parsedStart = parseFloat(initialBalance) || 0;
  const currentBalance = editingAccount ? accountBalance(editingAccount.id) : 0;
  const adjustTyped = parseFloat(adjustTo);
  const adjustTarget = adjustZero ? 0 : Number.isFinite(adjustTyped) && adjustTyped > 0 ? adjustTyped : null;
  const adjustDelta = adjustTarget === null ? 0 : Math.round((adjustTarget - currentBalance) * 100) / 100;
  const previewBalance = isEditing ? (adjustTarget ?? currentBalance) : parsedStart;
  const adjustmentCount = editingAccount?.adjustments?.length ?? 0;
  const last4Valid = last4.length === 0 || last4.length === 4;
  const canSave = trimmedName.length > 0 && last4Valid;

  const previewSubtitle = [showBankFields ? provider.trim() : '', typeLabel ?? t(typeOption.labelKey)].filter(Boolean).join(' · ');

  function selectType(next: AccountType) {
    setType(next);
    setTypeLabel(null);
    if (!colorTouched) setColor(DEFAULT_COLOR[next]);
    if (!iconTouched) setIcon(DEFAULT_ACCOUNT_ICON[next]);
  }

  function selectCustomType(label: string) {
    setType('other');
    setTypeLabel(label);
    if (!colorTouched) setColor(DEFAULT_COLOR.other);
    if (!iconTouched) setIcon(DEFAULT_ACCOUNT_ICON.other);
  }

  function pickColor(hex: string) {
    setColor(hex);
    setColorTouched(true);
  }

  function pickIcon(next: IconName) {
    setIcon(next);
    setIconTouched(true);
  }

  function handleSave() {
    if (!canSave) return;
    const payload = {
      // An untouched default name ('Bank', 'Cash') keeps its stored English form so it follows the language.
      name: editingAccount && trimmedName === accountName(editingAccount) ? editingAccount.name : trimmedName,
      type,
      typeLabel: typeLabel ?? undefined,
      icon,
      color,
      design,
      provider: showBankFields ? provider.trim() || undefined : undefined,
      last4: showBankFields ? last4 || undefined : undefined,
    };

    if (isEditing && editingAccount) {
      updateAccount(editingAccount.id, payload);
      if (adjustTarget !== null && adjustDelta !== 0) {
        const accId = editingAccount.id;
        const adjId = adjustAccountBalance(accId, adjustTarget, adjustNote);
        if (adjId) {
          offer(
            t('acct.adj.done', { amount: formatMoney(adjustDelta, { signed: true, type: adjustDelta > 0 ? 'credit' : 'debit' }) }),
            () => removeAdjustment(accId, adjId),
            { durationMs: ADJUSTMENT_WINDOW_MS, actionLabel: t('common.edit'), onAction: () => onOpenAdjustments(accId) },
          );
        }
      }
    } else {
      addAccount({ ...payload, initialBalance: parsedStart });
    }
    onClose();
  }

  function handleDelete() {
    if (!editingAccount) return;
    Alert.alert(
      t('acct.add.deleteTitle'),
      t('acct.add.deleteMsg', { name: accountName(editingAccount) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
    <>
      <SheetHeader
        title={isEditing ? t('acct.add.titleEdit') : t('acct.add.titleNew')}
        left={
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
              {t('common.cancel')}
            </ThemedText>
          </Pressable>
        }
        right={
          isEditing ? (
            <Pressable onPress={handleDelete} hitSlop={12} accessibilityLabel={t('acct.add.deleteA11y')}>
              <Ionicons name="trash-outline" size={20} color={colors.negative} />
            </Pressable>
          ) : null
        }
      />


      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AccountCard
          title={trimmedName || t('acct.add.previewName')}
          subtitle={previewSubtitle}
          icon={icon}
          balance={previewBalance}
          income={0}
          spending={0}
          color={color}
          design={design}
          last4={showBankFields && last4.length === 4 ? last4 : undefined}
        />
        {/* ── Details ── */}
        <ThemedText type="smallBold" style={[styles.section, { color: colors.textSecondary }]}>
          {t('acct.add.secDetails')}
        </ThemedText>
        <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {t('common.name')}
        </ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
          placeholder={t('acct.add.namePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

      <TypePicker
        type={type}
        typeLabel={typeLabel}
        customTypes={customTypes}
        setCustomTypes={setCustomTypes}
        onSelectType={selectType}
        onSelectCustom={selectCustomType}
      />

        {showBankFields ? (
          <>
            <View style={styles.pairRow}>
              <View style={styles.pairWide}>
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('acct.add.provider')}
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                  placeholder={t('acct.add.providerPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={provider}
                  onChangeText={setProvider}
                />
              </View>
              <View style={styles.pairNarrow}>
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {t('acct.add.last4Short')}
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                  placeholder="1234"
                  placeholderTextColor={colors.textSecondary}
                  value={last4}
                  onChangeText={(v) => setLast4(v.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>
            {!last4Valid ? (
              <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                {t('acct.add.last4Error')}
              </ThemedText>
            ) : null}
          </>
        ) : null}

      <BalanceSection
        isEditing={isEditing}
        currentBalance={currentBalance}
        adjustTo={adjustTo}
        setAdjustTo={setAdjustTo}
        adjustZero={adjustZero}
        setAdjustZero={setAdjustZero}
        adjustTarget={adjustTarget}
        adjustDelta={adjustDelta}
        adjustNote={adjustNote}
        setAdjustNote={setAdjustNote}
        adjustmentCount={adjustmentCount}
        onOpenHistory={() => editingAccount && onOpenAdjustments(editingAccount.id)}
        initialBalance={initialBalance}
        setInitialBalance={setInitialBalance}
      />

      <LookSection
        design={design}
        setDesign={setDesign}
        color={color}
        pickColor={pickColor}
        icon={icon}
        pickIcon={pickIcon}
        initialShowCustom={!!editColor && !CARD_COLORS.includes(editColor)}
        scrollToDesign={editingAccount ? normalizeDesign(editingAccount.design) : undefined}
      />

        <View style={[styles.infoBox, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">{t('acct.add.infoTitle')}</ThemedText>
          <ThemedText type="small" style={[styles.infoLine, { color: colors.textSecondary }]}>
            • {t('acct.add.info1')}
          </ThemedText>
          <ThemedText type="small" style={[styles.infoLine, { color: colors.textSecondary }]}>
            • {t('acct.add.info2')}
          </ThemedText>
          <ThemedText type="small" style={[styles.infoLine, { color: colors.textSecondary }]}>
            • {t('acct.add.info3')}
          </ThemedText>
        </View>

        <Pressable
          style={[styles.saveButton, { backgroundColor: canSave ? colors.accent : colors.backgroundSelected }]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <ThemedText style={[styles.saveButtonText, !canSave && { color: colors.textSecondary }]}>
            {isEditing ? t('acct.add.saveChanges') : t('acct.add.submit')}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </>
  );
}
