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
import { useTheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { ACCOUNT_ICONS, DEFAULT_ACCOUNT_ICON } from '@/constants/accounts';
import type { IconName } from '@/constants/categories';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass an existing account to edit/delete it. Omit (or null) to create a new one. */
  editingAccount?: Account | null;
};

const TYPE_OPTIONS: { type: AccountType; label: string; hint: string }[] = [
  { type: 'bank', label: 'Bank', hint: 'Savings, current or a bank card account.' },
  { type: 'cash', label: 'Cash', hint: 'Physical money in your wallet or at home.' },
  { type: 'other', label: 'Other', hint: 'E-wallets (TNG, Boost), investments or anything else.' },
];

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
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { addAccount, updateAccount, deleteAccount } = useTransactions();
  const isEditing = !!editingAccount;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
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
      setName(editingAccount.name);
      setType(editingAccount.type);
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
    setHue(220);
    setLight(50);
  }, [visible, editingAccount]);

  // Keep the hex box in sync when the colour changes from swatches/strips.
  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const typeOption = TYPE_OPTIONS.find((t) => t.type === type)!;
  const showBankFields = type !== 'cash';
  const trimmedName = name.trim();
  const parsedBalance = parseFloat(initialBalance.replace(',', '.'));
  const balanceValid = Number.isFinite(parsedBalance);
  const last4Valid = last4.length === 0 || last4.length === 4;
  const canSave = trimmedName.length > 0 && balanceValid && last4Valid;
  const isCustomColor = !CARD_COLORS.includes(color);

  const previewSubtitle = [showBankFields ? provider.trim() : '', typeOption.label].filter(Boolean).join(' · ');

  function selectType(next: AccountType) {
    setType(next);
    if (!colorTouched) setColor(DEFAULT_COLOR[next]);
    if (!iconTouched) setIcon(DEFAULT_ACCOUNT_ICON[next]);
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
      name: trimmedName,
      type,
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
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

        <ThemedView
          style={[
            styles.modalBox,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <SheetHeader
            title={isEditing ? 'Edit account' : 'New account'}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  Cancel
                </ThemedText>
              </Pressable>
            }
          />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <AccountCard
              title={trimmedName || 'Account name'}
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
                        {opt.label}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
              {typeOption.hint}
            </ThemedText>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Icon
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
                      accessibilityLabel={`Icon ${n}`}
                    >
                      <Ionicons name={n} size={20} color={active ? color : colors.textSecondary} />
                    </Pressable>
                  );
                })}
              </EvenGrid>
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Name
            </ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
              placeholder="e.g. Maybank Savings, Wallet"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            {showBankFields ? (
              <>
                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Provider (optional)
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                  placeholder="e.g. Maybank, CIMB, TNG eWallet"
                  placeholderTextColor={colors.textSecondary}
                  value={provider}
                  onChangeText={setProvider}
                />

                <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Last 4 digits (optional)
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
                  placeholder="1234"
                  placeholderTextColor={colors.textSecondary}
                  value={last4}
                  onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                {!last4Valid ? (
                  <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
                    Enter all 4 digits, or leave it empty
                  </ThemedText>
                ) : null}
              </>
            ) : null}

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Starting balance (RM)
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
              <ThemedText type="smallBold">Before you add</ThemedText>
              <ThemedText type="small" style={[styles.infoLine, { color: colors.textSecondary }]}>
                • Starting balance is the amount in this account today. Only transactions you record after this will change it.
              </ThemedText>
              <ThemedText type="small" style={[styles.infoLine, { color: colors.textSecondary }]}>
                • Only the last 4 digits are kept. Never enter your full account or card number.
              </ThemedText>
              <ThemedText type="small" style={[styles.infoLine, { color: colors.textSecondary }]}>
                • You can edit the look, or delete the card, any time from the Home screen or More → Assets.
              </ThemedText>
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Design
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
                      {d.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Premium
            </ThemedText>
            <View style={styles.designRow}>
              {PRO_DESIGNS.map((d) => {
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
            </View>

            {isProDesign(design) ? (
              <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
                Premium cards use their own colours, so the colour picker is hidden.
              </ThemedText>
            ) : (
              <>
            <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Colour
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
                    accessibilityLabel={`Colour ${c}`}
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
              accessibilityLabel="Custom colour"
            >
              <Ionicons name="color-palette" size={18} color={isCustomColor ? color : colors.textSecondary} />
              <ThemedText type="small" style={{ fontWeight: '600' }}>
                Custom colour
              </ThemedText>
            </Pressable>

            {showCustom ? (
              <View style={[styles.customPanel, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Colour
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
                  Shade
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
                  Hex code
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
  chipInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  iconBox: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4, marginBottom: Spacing.one },
  iconCell: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
});
