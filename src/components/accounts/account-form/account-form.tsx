import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { TextInput } from '@/components/ui/text';

import { AccountCard } from '@/components/accounts/account-card';
import { BrandAvatar } from '@/components/ui/brand-avatar';
import { AmountInput } from '@/components/ui/amount-input';
import { ThemedText } from '@/components/ui/themed-text';
import { SheetHeader } from '@/components/ui/sheet-header';
import { DEFAULT_ACCOUNT_ICON } from '@/constants/accounts';
import { findBrand } from '@/constants/brands';
import type { IconName } from '@/constants/categories';
import { CARD_COLORS, DEFAULT_COLOR, DEFAULT_DESIGN, isTitaniumSeries, normalizeDesign, normalizeFinish, type CardDesign, type TitaniumFinish } from '@/constants/card-styles';
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
import { accountKindLabel } from '@/utils/account-groups';
import { formatMoney } from '@/utils/currency';

import { BalanceSection } from './balance-section';
import type { CustomType } from './constants';
import { LookSection } from './look-section';
import { ProviderPicker, type ProviderChoice } from './provider-picker';
import { styles } from './styles';
import { TypePicker } from './type-picker';

/** The type a provider suggests: banks are bank accounts, e-wallets are e-wallets, anything else is "other". */
function typeForBrand(kind: string): AccountType {
  if (kind === 'bank') return 'bank';
  if (kind === 'ewallet') return 'ewallet';
  return 'other';
}

type Props = {
  onClose: () => void;
  /** An existing account to edit/delete. Omit (or null) to create a new one. */
  editingAccount?: Account | null;
  /** Open the balance-adjustment history for an account (lives in the modal shell so it survives closing the sheet). */
  onOpenAdjustments: (accountId: string) => void;
  /** New account for a provider already chosen (the "add to Maybank" link): start at the details step. */
  initialProvider?: string;
};

/** New account: 0 pick the provider, 1 details and balance, 2 the card's look. Editing shows one page ('edit'). */
type Step = 0 | 1 | 2 | 'edit' | 'pick';

/**
 * The add / edit account form. It is remounted every time the sheet opens, so every field starts from the
 * account being edited (or the defaults) through its useState initialiser.
 */
export function AccountForm({ onClose, editingAccount, onOpenAdjustments, initialProvider }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const { addAccount, updateAccount, deleteAccount, adjustAccountBalance, removeAdjustment, accountBalance } = useTransactions();
  const { offer } = useUndo();
  const { user } = useAuth();
  const isEditing = !!editingAccount;
  const editColor = editingAccount ? editingAccount.color ?? DEFAULT_COLOR[editingAccount.type] ?? DEFAULT_COLOR.other : null;
  const startBrand = !editingAccount && initialProvider ? findBrand(initialProvider) : undefined;
  const startType: AccountType = startBrand ? typeForBrand(startBrand.kind) : initialProvider ? 'other' : 'bank';

  const [step, setStep] = useState<Step>(isEditing ? 'edit' : initialProvider ? 1 : 0);
  const [name, setName] = useState(editingAccount ? accountName(editingAccount) : '');
  const [nameTouched, setNameTouched] = useState(isEditing);
  const [customTypes, setCustomTypes] = usePersistedState<CustomType[]>('account-custom-types', [], user?.id ?? null);
  const [type, setType] = useState<AccountType>(editingAccount ? editingAccount.type : startType);
  const [typeLabel, setTypeLabel] = useState<string | null>(editingAccount?.typeLabel ?? null);
  // Once the person picks a type themselves (Savings, say), choosing a provider afterwards no longer changes it.
  const [typeTouched, setTypeTouched] = useState(isEditing);
  const [provider, setProvider] = useState(editingAccount?.provider ?? initialProvider ?? '');
  const [typingProvider, setTypingProvider] = useState(false);
  const [last4, setLast4] = useState(editingAccount?.last4 ?? '');
  const [initialBalance, setInitialBalance] = useState('');
  const [adjustTo, setAdjustTo] = useState('');
  const [adjustZero, setAdjustZero] = useState(false);
  const [adjustNote, setAdjustNote] = useState('');
  const [design, setDesign] = useState<CardDesign>(editingAccount ? normalizeDesign(editingAccount.design) : DEFAULT_DESIGN);
  const [finish, setFinish] = useState<TitaniumFinish>(normalizeFinish(editingAccount?.finish));
  const [color, setColor] = useState(editColor ?? startBrand?.color ?? DEFAULT_COLOR[startType]);
  const [colorTouched, setColorTouched] = useState(isEditing);
  const [icon, setIcon] = useState<IconName>(editingAccount ? editingAccount.icon : startBrand?.kind === 'ewallet' ? 'phone-portrait' : DEFAULT_ACCOUNT_ICON[startType]);
  const [iconTouched, setIconTouched] = useState(isEditing);

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
  const brand = findBrand(provider);
  const providerName = brand?.name ?? provider.trim();
  const kindLabel = typeLabel ?? accountKindLabel({ type, provider });

  const previewSubtitle = [showBankFields ? providerName : '', kindLabel].filter(Boolean).join(' · ');

  // The ScrollView is keyed by the step, so each step opens at the top.
  const goTo = (next: Step) => setStep(next);

  function selectType(next: AccountType) {
    setType(next);
    setTypeLabel(null);
    setTypeTouched(true);
    if (!colorTouched && !brand) setColor(DEFAULT_COLOR[next]);
    if (!iconTouched) setIcon(DEFAULT_ACCOUNT_ICON[next]);
  }

  function selectCustomType(label: string) {
    setType('other');
    setTypeLabel(label);
    setTypeTouched(true);
    if (!colorTouched && !brand) setColor(DEFAULT_COLOR.other);
    if (!iconTouched) setIcon(DEFAULT_ACCOUNT_ICON.other);
  }

  /** A provider sets the type, colour, icon and a suggested name, unless the person already changed them. */
  function pickProvider(choice: ProviderChoice) {
    setTypingProvider(false);
    if (choice.kind === 'brand') {
      const b = choice.brand;
      // A type the person already chose stays: "Simpanan" then "Maybank" is a Maybank savings account.
      const nextType: AccountType = typeTouched ? type : typeForBrand(b.kind);
      setProvider(b.name);
      if (!isEditing && !typeTouched) {
        setType(nextType);
        setTypeLabel(null);
      }
      if (!colorTouched) setColor(b.color);
      if (!iconTouched) setIcon(DEFAULT_ACCOUNT_ICON[nextType]);
      if (!nameTouched) setName(nextType === 'savings' ? `${b.name} ${t('acct.type.savings')}` : b.name);
    } else if (choice.kind === 'cash' || choice.kind === 'savings') {
      const nextType: AccountType = choice.kind;
      setProvider('');
      setType(nextType);
      setTypeLabel(null);
      setTypeTouched(true);
      if (!colorTouched) setColor(DEFAULT_COLOR[nextType]);
      if (!iconTouched) setIcon(DEFAULT_ACCOUNT_ICON[nextType]);
      if (!nameTouched) setName(t(nextType === 'cash' ? 'acct.type.cash' : 'acct.type.savings'));
    } else {
      setProvider(choice.name);
      if (!choice.name) setTypingProvider(true);
      if (!isEditing && !typeTouched) {
        setType('other');
        setTypeLabel(null);
      }
      if (!colorTouched) setColor(DEFAULT_COLOR.other);
      if (!iconTouched) setIcon(DEFAULT_ACCOUNT_ICON.other);
      if (!nameTouched && choice.name) setName(choice.name);
    }
    goTo(isEditing ? 'edit' : 1);
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
      // Only the Titanium Metallic series keeps a finish.
      finish: isTitaniumSeries(design) ? finish : undefined,
      provider: showBankFields ? providerName || undefined : undefined,
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

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }];
  const label = (text: string, first = false) => (
    <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }, first && { marginTop: 0 }]}>
      {text}
    </ThemedText>
  );

  /** The chosen provider as a dropdown-style row. Tapping it opens the picker again. */
  const providerRow = (
    <Pressable
      onPress={() => goTo(isEditing ? 'pick' : 0)}
      style={({ pressed }) => [styles.providerRow, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={t('acct.step.changeProvider')}
    >
      {providerName ? (
        <BrandAvatar name={providerName} size={40} />
      ) : (
        <View style={[styles.providerIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      )}
      <View style={styles.providerText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {providerName || kindLabel}
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }} numberOfLines={1}>
          {providerName ? kindLabel : t('acct.step.noProvider')}
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>
        {t('acct.step.change')}
      </ThemedText>
      <Ionicons name="chevron-down" size={16} color={colors.accent} />
    </Pressable>
  );

  /** Typing a provider's name when it is not in the list. */
  const typedProvider =
    typingProvider || (provider && !brand) ? (
      <>
        {label(t('acct.add.provider'))}
        <TextInput
          style={inputStyle}
          placeholder={t('acct.add.providerPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={provider}
          onChangeText={setProvider}
          maxLength={30}
          autoFocus={typingProvider && !provider}
        />
      </>
    ) : null;

  const nameField = (
    <>
      {label(t('acct.step.name'))}
      <TextInput
        style={inputStyle}
        placeholder={t('acct.add.namePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setNameTouched(true);
        }}
        maxLength={40}
      />
    </>
  );

  const last4Field = showBankFields ? (
    <>
      {label(t('acct.add.last4'))}
      <TextInput
        style={[...inputStyle, styles.last4Input]}
        placeholder="1234"
        placeholderTextColor={colors.textSecondary}
        value={last4}
        onChangeText={(v) => setLast4(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
      />
      <ThemedText type="small" style={{ color: last4Valid ? colors.textSecondary : colors.negative, marginTop: Spacing.one }}>
        {last4Valid ? t('acct.step.last4Hint') : t('acct.add.last4Error')}
      </ThemedText>
    </>
  ) : null;

  const card = (
    <AccountCard
      title={trimmedName || t('acct.add.previewName')}
      subtitle={previewSubtitle}
      icon={icon}
      balance={previewBalance}
      income={0}
      spending={0}
      color={color}
      design={design}
      finish={finish}
      last4={showBankFields && last4.length === 4 ? last4 : undefined}
      provider={showBankFields ? providerName || undefined : undefined}
    />
  );

  const primary = (text: string, onPress: () => void, enabled = true) => (
    <Pressable
      style={[styles.saveButton, { backgroundColor: enabled ? colors.accent : colors.backgroundSelected }]}
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
    >
      <ThemedText style={[styles.saveButtonText, !enabled && { color: colors.textSecondary }]}>{text}</ThemedText>
    </Pressable>
  );

  const stepNo = typeof step === 'number' ? step : -1;
  const headerLeft =
    step === 0 || step === 'edit' ? (
      <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
          {t('common.cancel')}
        </ThemedText>
      </Pressable>
    ) : (
      <Pressable onPress={() => goTo(step === 'pick' ? 'edit' : ((stepNo - 1) as Step))} hitSlop={12} accessibilityRole="button">
        <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
          {t('common.back')}
        </ThemedText>
      </Pressable>
    );
  const headerRight =
    step === 'edit' ? (
      <Pressable onPress={handleDelete} hitSlop={12} accessibilityLabel={t('acct.add.deleteA11y')}>
        <Ionicons name="trash-outline" size={20} color={colors.negative} />
      </Pressable>
    ) : stepNo >= 0 ? (
      <ThemedText type="small" style={{ color: colors.textSecondary }}>
        {t('acct.step.of', { n: stepNo + 1, total: 3 })}
      </ThemedText>
    ) : null;

  return (
    <>
      <SheetHeader title={isEditing ? t('acct.add.titleEdit') : t('acct.add.titleNew')} left={headerLeft} right={headerRight} />
      {stepNo >= 0 ? (
        <View style={styles.progress}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.progressBar, { backgroundColor: i <= stepNo ? colors.accent : colors.backgroundSelected }]} />
          ))}
        </View>
      ) : null}

      <ScrollView key={String(step)} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 0 || step === 'pick' ? (
          <>
            <ThemedText style={styles.stepTitle}>{t('acct.step.pickTitle')}</ThemedText>
            <ThemedText type="small" style={[styles.stepSub, { color: colors.textSecondary }]}>
              {t('acct.step.pickSub')}
            </ThemedText>
            <ProviderPicker onPick={pickProvider} current={provider} hideNoProvider={step === 'pick'} />
            {step === 'pick' && provider ? (
              <Pressable
                onPress={() => {
                  setProvider('');
                  goTo('edit');
                }}
                style={styles.clearProvider}
                accessibilityRole="button"
              >
                <ThemedText type="small" style={{ color: colors.negative, fontWeight: '600' }}>
                  {t('acct.step.removeProvider')}
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            {providerRow}
            {typedProvider}
            <TypePicker
              type={type}
              typeLabel={typeLabel}
              customTypes={customTypes}
              setCustomTypes={setCustomTypes}
              onSelectType={selectType}
              onSelectCustom={selectCustomType}
            />
            {nameField}
            {label(t('acct.step.balanceNow'))}
            <AmountInput
              value={initialBalance}
              onChange={setInitialBalance}
              style={[...inputStyle, styles.bigAmount]}
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel={t('acct.step.balanceNow')}
            />
            <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
              {t('acct.step.balanceHint')}
            </ThemedText>
            {last4Field}
            {primary(t('acct.step.nextLook'), () => goTo(2), canSave)}
            <Pressable onPress={handleSave} disabled={!canSave} style={styles.secondary} accessibilityRole="button">
              <ThemedText type="small" style={{ color: canSave ? colors.accent : colors.textSecondary, fontWeight: '700' }}>
                {t('acct.step.saveNow')}
              </ThemedText>
            </Pressable>
          </>
        ) : null}

        {step === 2 ? (
          <>
            {card}
            <LookSection
              design={design}
              setDesign={setDesign}
              finish={finish}
              setFinish={setFinish}
              color={color}
              pickColor={pickColor}
              icon={icon}
              pickIcon={pickIcon}
              initialShowCustom={false}
            />
            <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary, textAlign: 'left' }]}>
              {brand ? t('acct.step.brandColour') : t('acct.add.info3')}
            </ThemedText>
            {primary(t('acct.add.submit'), handleSave, canSave)}
          </>
        ) : null}

        {step === 'edit' ? (
          <>
            {card}
            <ThemedText type="smallBold" style={[styles.section, { color: colors.textSecondary }]}>
              {t('acct.add.secDetails')}
            </ThemedText>
            {showBankFields ? (
              <>
                {label(t('acct.step.provider'))}
                {providerRow}
                {typedProvider}
              </>
            ) : null}
            {nameField}
            <TypePicker
              type={type}
              typeLabel={typeLabel}
              customTypes={customTypes}
              setCustomTypes={setCustomTypes}
              onSelectType={selectType}
              onSelectCustom={selectCustomType}
            />
            {last4Field}
            <BalanceSection
              isEditing
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
              finish={finish}
              setFinish={setFinish}
              color={color}
              pickColor={pickColor}
              icon={icon}
              pickIcon={pickIcon}
              initialShowCustom={!!editColor && !CARD_COLORS.includes(editColor)}
              scrollToDesign={editingAccount ? normalizeDesign(editingAccount.design) : undefined}
            />
            {primary(t('acct.add.saveChanges'), handleSave, canSave)}
          </>
        ) : null}
        <View style={{ height: Spacing.four }} />
      </ScrollView>
    </>
  );
}
