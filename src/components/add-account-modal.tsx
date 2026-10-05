import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountCard, CardBackground } from '@/components/account-card';
import { ProCardThumb } from '@/components/cards/thumbs';
import { EvenGrid } from '@/components/even-grid';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CARD_COLORS,
  CARD_DESIGNS,
  DEFAULT_COLOR,
  DEFAULT_DESIGN,
  hslToHex,
  isProDesign,
  isValidHex,
  normalizeDesign,
  PRO_DESIGNS,
  type CardDesign,
} from '@/constants/card-styles';
import { Spacing } from '@/constants/theme';
import type { Account, AccountType } from '@/context/TransactionsContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { ACCOUNT_ICONS, DEFAULT_ACCOUNT_ICON } from '@/constants/accounts';
import type { IconName } from '@/constants/categories';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';
import type { TKey } from '@/i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass an existing account to edit/delete it. Omit (or null) to create a new one. */
  editingAccount?: Account | null;
};

const TYPE_OPTIONS: { type: AccountType; labelKey: TKey; hintKey: TKey }[] = [
  { type: 'bank', labelKey: 'acct.type.bank', hintKey: 'acct.type.bankHint' },
  { type: 'cash', labelKey: 'acct.type.cash', hintKey: 'acct.type.cashHint' },
  { type: 'other', labelKey: 'acct.type.other', hintKey: 'acct.type.otherHint' },
];

type CustomType = { id: string; label: string };
const MAX_CUSTOM_TYPES = 12;

const HUE_STOPS = Array.from({ length: 24 }, (_, i) => hslToHex(i * 15, 72, 50));
const LIGHT_MIN = 25;
const LIGHT_MAX = 75;

// A tappable/draggable colour strip with a marker.
function Strip({
  segments,
  ratio,
  onPick,
}: {
  segments: string[];
  ratio: number;
  onPick: (ratio: number) => void;
}) {
  const [width, setWidth] = useState(0);

  function handle(x: number) {
    if (width <= 0) return;
    onPick(Math.min(Math.max(x / width, 0), 1));
  }

  return (
    <View
      style={styles.stripOuter}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => handle(e.nativeEvent.locationX)}
      onResponderMove={(e) => handle(e.nativeEvent.locationX)}
    >
      <View style={styles.strip} pointerEvents="none">
        {segments.map((c, i) => (
          <View key={`${c}-${i}`} style={[styles.stripSegment, { backgroundColor: c }]} />
        ))}
      </View>
      <View
        pointerEvents="none"
        style={[styles.marker, { left: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }]}
      />
    </View>
  );
}

export function AddAccountModal({ visible, onClose, editingAccount }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { addAccount, updateAccount, deleteAccount } = useTransactions();
  const isEditing = !!editingAccount;

  const [name, setName] = useState('');
  const { user } = useAuth();
  const [customTypes, setCustomTypes] = usePersistedState<CustomType[]>('account-custom-types', [], user?.id ?? null);
  const [type, setType] = useState<AccountType>('bank');
  const [typeLabel, setTypeLabel] = useState<string | null>(null);
  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [provider, setProvider] = useState('');
  const [last4, setLast4] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [design, setDesign] = useState<CardDesign>(DEFAULT_DESIGN);
  const [color, setColor] = useState(DEFAULT_COLOR.bank);
  const [colorTouched, setColorTouched] = useState(false);
  const [icon, setIcon] = useState<IconName>(DEFAULT_ACCOUNT_ICON.bank);
  const [iconTouched, setIconTouched] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [hue, setHue] = useState(220);
  const [light, setLight] = useState(50);
  const [hexInput, setHexInput] = useState(DEFAULT_COLOR.bank);

  // Reset/populate the form whenever the modal opens or the target account changes.
  useEffect(() => {
    if (!visible) return;
    if (editingAccount) {
      const c = editingAccount.color ?? DEFAULT_COLOR[editingAccount.type] ?? DEFAULT_COLOR.other;
      setName(accountName(editingAccount));
      setType(editingAccount.type);
      setTypeLabel(editingAccount.typeLabel ?? null);
      setProvider(editingAccount.provider ?? '');
      setLast4(editingAccount.last4 ?? '');
      setInitialBalance(String(editingAccount.initialBalance));
      setDesign(normalizeDesign(editingAccount.design));
      setColor(c);
      setColorTouched(true);
      setShowCustom(!CARD_COLORS.includes(c));
      setIcon(editingAccount.icon);
      setIconTouched(true);
    } else {
      setName('');
      setType('bank');
      setTypeLabel(null);
      setProvider('');
      setLast4('');
      setInitialBalance('0');
      setDesign(DEFAULT_DESIGN);
      setColor(DEFAULT_COLOR.bank);
      setColorTouched(false);
      setShowCustom(false);
      setIcon(DEFAULT_ACCOUNT_ICON.bank);
      setIconTouched(false);
    }
    setAddingType(false);
    setNewTypeName('');
    setHue(220);
    setLight(50);
  }, [visible, editingAccount]);

  // Keep the hex box in sync when the colour changes from swatches/strips.
  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const typeOption = TYPE_OPTIONS.find((o) => o.type === type)!;
  const showBankFields = type !== 'cash';
  const trimmedName = name.trim();
  const parsedBalance = parseFloat(initialBalance.replace(',', '.'));
  const balanceValid = Number.isFinite(parsedBalance);
  const last4Valid = last4.length === 0 || last4.length === 4;
  const canSave = trimmedName.length > 0 && balanceValid && last4Valid;
  const isCustomColor = !CARD_COLORS.includes(color);

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

  const newTypeTrimmed = newTypeName.trim();
  const newTypeClash =
    newTypeTrimmed.length > 0 &&
    ([...TYPE_OPTIONS.map((o) => t(o.labelKey)), ...customTypes.map((c) => c.label)] as string[]).some(
      (l) => l.toLowerCase() === newTypeTrimmed.toLowerCase(),
    );

  function addCustomType() {
    if (!newTypeTrimmed || newTypeClash || customTypes.length >= MAX_CUSTOM_TYPES) return;
    setCustomTypes((prev) => [...prev, { id: Date.now().toString(), label: newTypeTrimmed }]);
    selectCustomType(newTypeTrimmed);
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
          if (typeLabel === c.label) selectType('other');
        },
      },
    ]);
  }

  function pickColor(hex: string) {
    setColor(hex);
    setColorTouched(true);
  }

  function pickIcon(next: IconName) {
    setIcon(next);
    setIconTouched(true);
  }

  function onHexChange(text: string) {
    const cleaned = ('#' + text.replace(/[^0-9a-fA-F]/g, '')).slice(0, 7).toUpperCase();
    setHexInput(cleaned);
    if (isValidHex(cleaned)) pickColor(cleaned);
  }

  function handleSave() {
    if (!canSave) return;
    const payload = {
      // An untouched default name ('Bank', 'Cash') keeps its stored English form so it follows the language.
      name: editingAccount && trimmedName === accountName(editingAccount) ? editingAccount.name : trimmedName,
      type,
      typeLabel: typeLabel ?? undefined,
      icon,
      initialBalance: parsedBalance,
      color,
      design,
      provider: showBankFields ? provider.trim() || undefined : undefined,
      last4: showBankFields ? last4 || undefined : undefined,
    };

    if (isEditing && editingAccount) {
      updateAccount(editingAccount.id, payload);
    } else {
      addAccount(payload);
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

        <ThemedView
          style={[
            styles.modalBox,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <SheetHeader
            title={isEditing ? t('acct.add.titleEdit') : t('acct.add.titleNew')}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
            }
          />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <AccountCard
              title={trimmedName || t('acct.add.previewName')}
              subtitle={previewSubtitle}
              icon={icon}
              balance={balanceValid ? parsedBalance : 0}
              income={0}
              spending={0}
              color={color}
              design={design}
              last4={showBankFields && last4.length === 4 ? last4 : undefined}
            />

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.add.design')}
            </ThemedText>
            <View style={styles.designRow}>
              {CARD_DESIGNS.map((d) => {
                const active = design === d.id;
                return (
                  <Pressable key={d.id} style={styles.designItem} onPress={() => setDesign(d.id)}>
                    <View
                      style={[
                        styles.designThumb,
                        { borderColor: active ? colors.accent : colors.divider, borderWidth: active ? 2 : 1 },
                      ]}
                    >
                      <CardBackground color={color} design={d.id} />
                    </View>
                    <ThemedText
                      type="small"
                      style={{ color: active ? colors.text : colors.textSecondary, fontWeight: active ? '600' : '500' }}
                    >
                      {t(d.labelKey)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.add.premium')}
            </ThemedText>
            <View style={styles.proGrid}>
              {[0, 3].map((from) => {
                const row = PRO_DESIGNS.slice(from, from + 3);
                return (
                  <View key={from} style={styles.designRow}>
                    {row.map((d) => {
                      const active = design === d.id;
                      return (
                        <Pressable key={d.id} style={styles.designItem} onPress={() => setDesign(d.id)}>
                          <View
                            style={[
                              styles.designThumb,
                              { borderColor: active ? colors.accent : colors.divider, borderWidth: active ? 2 : 1 },
                            ]}
                          >
                            <ProCardThumb design={d.id} />
                          </View>
                          <ThemedText
                            type="small"
                            style={{ color: active ? colors.text : colors.textSecondary, fontWeight: active ? '600' : '500' }}
                          >
                            {d.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                    {Array.from({ length: 3 - row.length }, (_, i) => (
                      <View key={`pad${i}`} style={styles.designItem} />
                    ))}
                  </View>
                );
              })}
            </View>

            {isProDesign(design) ? (
              <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
                {t('acct.add.premiumNote')}
              </ThemedText>
            ) : (
              <>
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.add.colour')}
            </ThemedText>
            <EvenGrid columns={5} rowGap={12}>
              {CARD_COLORS.map((c) => {
                const active = color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      pickColor(c);
                      setShowCustom(false);
                    }}
                    style={[styles.swatch, { backgroundColor: c }, active && { borderColor: colors.text }]}
                    accessibilityLabel={t('acct.add.colourA11y', { color: c })}
                  />
                );
              })}
            </EvenGrid>
            <Pressable
              onPress={() => setShowCustom((v) => !v)}
              style={[
                styles.customButton,
                { backgroundColor: colors.backgroundElement, borderColor: isCustomColor || showCustom ? colors.text : colors.divider },
              ]}
              accessibilityLabel={t('acct.add.customColour')}
            >
              <Ionicons name="color-palette" size={18} color={isCustomColor ? color : colors.textSecondary} />
              <ThemedText type="small" style={{ fontWeight: '600' }}>
                {t('acct.add.customColour')}
              </ThemedText>
            </Pressable>

            {showCustom ? (
              <View style={[styles.customPanel, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('acct.add.colour')}
                </ThemedText>
                <Strip
                  segments={HUE_STOPS}
                  ratio={hue / 360}
                  onPick={(r) => {
                    const h = Math.round(r * 359);
                    setHue(h);
                    pickColor(hslToHex(h, 72, light));
                  }}
                />
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('acct.add.shade')}
                </ThemedText>
                <Strip
                  segments={Array.from({ length: 12 }, (_, i) =>
                    hslToHex(hue, 72, LIGHT_MIN + ((LIGHT_MAX - LIGHT_MIN) * i) / 11),
                  )}
                  ratio={(light - LIGHT_MIN) / (LIGHT_MAX - LIGHT_MIN)}
                  onPick={(r) => {
                    const l = Math.round(LIGHT_MIN + r * (LIGHT_MAX - LIGHT_MIN));
                    setLight(l);
                    pickColor(hslToHex(hue, 72, l));
                  }}
                />
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('acct.add.hex')}
                </ThemedText>
                <TextInput
                  style={[styles.hexInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
                  value={hexInput}
                  onChangeText={onHexChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                />
              </View>
            ) : null}
              </>
            )}

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
                    onPress={() => selectType(opt.type)}
                  >
                    <View style={styles.chipInner}>
                      <Ionicons name={DEFAULT_ACCOUNT_ICON[opt.type]} size={16} color={active ? '#fff' : colors.text} />
                      <ThemedText type="small" style={active ? { color: '#fff', fontWeight: '600' } : { color: colors.text }}>
                        {t(opt.labelKey)}
                      </ThemedText>
                    </View>
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
                    onPress={() => selectCustomType(c.label)}
                    onLongPress={() => removeCustomType(c)}
                    accessibilityHint={t('acct.add.removeTypeHint')}
                  >
                    <View style={styles.chipInner}>
                      <Ionicons name="pricetag" size={16} color={active ? '#fff' : colors.text} />
                      <ThemedText type="small" style={active ? { color: '#fff', fontWeight: '600' } : { color: colors.text }}>
                        {c.label}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
              {customTypes.length < MAX_CUSTOM_TYPES ? (
                <Pressable
                  style={[styles.chip, { backgroundColor: colors.backgroundElement, borderColor: addingType ? colors.text : colors.divider }]}
                  onPress={() => setAddingType((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={t('acct.add.addTypeA11y')}
                >
                  <View style={styles.chipInner}>
                    <Ionicons name={addingType ? 'close' : 'add'} size={18} color={colors.text} />
                  </View>
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

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.add.icon')}
            </ThemedText>
            <View style={[styles.iconBox, { backgroundColor: colors.backgroundElement }]}>
              <EvenGrid columns={6} rowGap={8}>
                {ACCOUNT_ICONS.map((n) => {
                  const active = n === icon;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => pickIcon(n)}
                      style={[styles.iconCell, active && { backgroundColor: `${color}26`, borderColor: color }]}
                      accessibilityLabel={t('acct.add.iconA11y', { name: n })}
                    >
                      <Ionicons name={n} size={20} color={active ? color : colors.textSecondary} />
                    </Pressable>
                  );
                })}
              </EvenGrid>
            </View>

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

            {showBankFields ? (
              <>
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

                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('acct.add.last4')}
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
                {!last4Valid ? (
                  <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                    {t('acct.add.last4Error')}
                  </ThemedText>
                ) : null}
              </>
            ) : null}

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {t('acct.add.startBalance')}
            </ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={initialBalance}
              onChangeText={setInitialBalance}
              keyboardType="decimal-pad"
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

            {isEditing ? (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('acct.add.delete')}</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </ThemedView>
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
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sheetTitle: { fontSize: 18 },
  fieldLabel: { marginBottom: Spacing.one, marginTop: Spacing.three },
  helper: { marginTop: Spacing.one, textAlign: 'center' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  infoBox: { borderRadius: 12, padding: Spacing.three, marginTop: Spacing.three, gap: 6 },
  infoLine: { lineHeight: 19 },
  designRow: { flexDirection: 'row', gap: Spacing.two },
  proGrid: { gap: 12 },
  designItem: { flex: 1, alignItems: 'center', gap: 6 },
  designThumb: { width: '100%', aspectRatio: 84 / 54, borderRadius: 12, overflow: 'hidden' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderColor: 'transparent', borderWidth: 3 },
  customButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  customPanel: { borderRadius: 12, padding: Spacing.three, marginTop: Spacing.three, gap: 8 },
  stripOuter: { height: 28, justifyContent: 'center' },
  strip: { height: 16, borderRadius: 8, overflow: 'hidden', flexDirection: 'row' },
  stripSegment: { flex: 1 },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    marginLeft: -3,
    borderRadius: 3,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.45)',
  },
  hexInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 16,
    letterSpacing: 1,
  },
  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.four, marginBottom: Spacing.two },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteButton: { padding: 14, alignItems: 'center', marginBottom: Spacing.three },
  addTypeRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two, alignItems: 'center' },
  addTypeInput: { flex: 1, marginTop: 0 },
  addTypeButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  chipInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  iconBox: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4, marginBottom: Spacing.one },
  iconCell: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
});
