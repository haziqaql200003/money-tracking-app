import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/category-icon';
import { DateField } from '@/components/date-field';
import { SheetHeader } from '@/components/sheet-header';
import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { IconName } from '@/constants/categories';
import { GOAL_PRESETS } from '@/constants/goals';
import { Spacing } from '@/constants/theme';
import { usePlan } from '@/context/PlanContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName } from '@/i18n/data';
import { toDateKey } from '@/utils/dates';
import { formatMoney } from '@/utils/currency';
import { nextCreditDue } from '@/utils/debts';
import { emergencyTarget, snapshotOf } from '@/utils/insight-feed';
import { looksLikeSavings } from '@/utils/saved';
import type { SavingsGoal } from '@/utils/goals';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pass an existing goal to edit it. */
  editing?: SavingsGoal | null;
};

export function GoalFormModal({ visible, onClose, editing }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <ThemedView
          style={[styles.box, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          <SheetHeader
            title={editing ? t('plan.goalForm.edit') : t('plan.goalForm.new')}
            left={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
            }
          />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {visible ? <GoalForm key={editing?.id ?? 'new'} editing={editing} onDone={onClose} /> : null}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GoalForm({ editing, onDone }: { editing?: SavingsGoal | null; onDone: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { addGoal, updateGoal, deleteGoal, setGoalAutoSave } = usePlan();
  const { selectableAccounts, recurringRules, transactions } = useTransactions();
  const { hideAmounts } = usePrivacy();
  const existingRule = editing?.recurringId ? recurringRules.find((r) => r.id === editing.recurringId) : undefined;

  const startPreset = Math.max(0, GOAL_PRESETS.findIndex((p) => p.icon === editing?.icon));
  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing ? String(editing.target) : '');
  const [preset, setPreset] = useState(startPreset);
  const [hasDeadline, setHasDeadline] = useState(!!editing?.deadline);
  const [deadline, setDeadline] = useState(editing?.deadline ?? defaultDeadline());
  const [monthly, setMonthly] = useState(editing?.monthly ? String(editing.monthly) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const defaultTo = editing?.accountId ?? selectableAccounts.find((a) => looksLikeSavings(a))?.id ?? '';
  const [toId, setToId] = useState(defaultTo);
  const [autoOn, setAutoOn] = useState(!!existingRule);
  const [fromId, setFromId] = useState(existingRule?.accountId ?? selectableAccounts.find((a) => a.id !== defaultTo)?.id ?? '');
  const [day, setDay] = useState(existingRule ? String(Math.min(28, Number(existingRule.startDate.slice(8, 10)))) : '25');
  const [paused, setPaused] = useState(!!editing?.paused);
  const [useBalance, setUseBalance] = useState(!!editing?.useBalance);
  const [startAmount, setStartAmount] = useState(editing?.startAmount ? String(editing.startAmount) : '');

  const targetNumber = parseFloat(target.replace(',', '.'));
  const today = toDateKey(new Date());
  const emergency = emergencyTarget(snapshotOf(transactions, today));
  const deadlineValid = !hasDeadline || deadline > today || (!!editing && deadline === editing.deadline);
  const monthlyN = parseFloat(monthly.replace(',', '.'));
  const startN = parseFloat(startAmount.replace(',', '.'));
  const startOk = !startAmount.trim() || (Number.isFinite(startN) && startN >= 0);
  const monthlyOk = !monthly.trim() || (Number.isFinite(monthlyN) && monthlyN > 0);
  const dayN = Math.round(parseFloat(day));
  const autoOk = !autoOn || (monthlyN > 0 && !!toId && !!fromId && fromId !== toId && dayN >= 1 && dayN <= 28);
  const valid = name.trim().length > 0 && Number.isFinite(targetNumber) && targetNumber > 0 && deadlineValid && monthlyOk && startOk && autoOk;

  function useEmergencyTemplate() {
    setName(t('plan.goalForm.emergencyName'));
    setPreset(0);
    if (emergency > 0) setTarget(String(emergency));
  }

  function save() {
    if (!valid) return;
    const look = GOAL_PRESETS[preset];
    const data = {
      name: name.trim(),
      target: Math.round(targetNumber * 100) / 100,
      deadline: hasDeadline ? deadline : undefined,
      icon: look.icon as string,
      color: look.color,
      monthly: monthlyN > 0 ? Math.round(monthlyN * 100) / 100 : undefined,
      accountId: toId || undefined,
      useBalance: useBalance && !!toId ? true : undefined,
      startAmount: startN > 0 ? Math.round(startN * 100) / 100 : undefined,
      note: note.trim() || undefined,
      paused: editing ? paused : undefined,
    };
    const goalId = editing ? editing.id : addGoal(data);
    if (editing) updateGoal(editing.id, data);
    const wantAuto = autoOn && monthlyN > 0;
    if (wantAuto || existingRule) {
      setGoalAutoSave({
        goalId,
        name: data.name,
        monthly: data.monthly ?? 0,
        recurringId: editing?.recurringId,
        cfg: wantAuto ? { fromAccountId: fromId, toAccountId: toId, firstDate: nextCreditDue(dayN, toDateKey(new Date())) } : null,
      });
    }
    onDone();
  }

  function remove() {
    if (!editing) return;
    Alert.alert(t('plan.goalForm.deleteTitle'), t('plan.goalForm.deleteBody', { name: editing.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteGoal(editing.id);
          onDone();
        },
      },
    ]);
  }

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }];

  return (
    <View>
      {!editing ? (
        <Pressable
          onPress={useEmergencyTemplate}
          style={[styles.template, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
          accessibilityRole="button"
        >
          <Ionicons name="shield-checkmark" size={20} color="#2ECC71" />
          <View style={styles.templateText}>
            <ThemedText type="smallBold">{t('plan.goalForm.emergencyBtn')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {emergency > 0 ? t('plan.goalForm.emergencyHint', { amount: hideAmounts ? 'RM ••••' /* i18n-ignore */ : formatMoney(emergency) }) : t('plan.goalForm.emergencyHintNone')}
            </ThemedText>
          </View>
        </Pressable>
      ) : null}

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.goalForm.whatFor')}
      </ThemedText>
      <TextInput
        style={inputStyle}
        placeholder={t('plan.goalForm.namePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
        maxLength={40}
        autoFocus={!editing}
      />

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.goalForm.target')}
      </ThemedText>
      <TextInput
        style={inputStyle}
        placeholder="0.00"
        placeholderTextColor={colors.textSecondary}
        value={target}
        onChangeText={setTarget}
        keyboardType="decimal-pad"
      />

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.goalForm.look')}
      </ThemedText>
      <View style={styles.presets}>
        {GOAL_PRESETS.map((p, i) => (
          <Pressable
            key={p.icon}
            onPress={() => setPreset(i)}
            style={[styles.preset, i === preset && { borderColor: p.color, backgroundColor: `${p.color}1A` }]}
            accessibilityRole="button"
            accessibilityState={{ selected: i === preset }}
            accessibilityLabel={t(p.labelKey)}
          >
            <CategoryIcon icon={p.icon as IconName} color={p.color} size={38} />
          </Pressable>
        ))}
      </View>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.goalForm.monthly')}
      </ThemedText>
      <TextInput
        style={inputStyle}
        placeholder={t('plan.goalForm.monthlyPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={monthly}
        onChangeText={setMonthly}
        keyboardType="decimal-pad"
      />
      {!monthlyOk ? (
        <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
          {t('plan.goalForm.monthlyBad')}
        </ThemedText>
      ) : null}

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.goalForm.start')}
      </ThemedText>
      <TextInput
        style={inputStyle}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
        value={startAmount}
        onChangeText={setStartAmount}
        keyboardType="decimal-pad"
      />
      <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: Spacing.one }}>
        {t('plan.goalForm.startSub')}
      </ThemedText>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.goalForm.account')}
      </ThemedText>
      <View style={styles.presets}>
        <Chip label={t('plan.goalForm.noAccount')} active={!toId} onPress={() => setToId('')} />
        {selectableAccounts.map((a) => (
          <Chip key={a.id} label={accountName(a)} active={a.id === toId} onPress={() => setToId(a.id)} />
        ))}
      </View>

      <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
        {t('plan.goalForm.note')}
      </ThemedText>
      <TextInput
        style={inputStyle}
        placeholder={t('plan.goalForm.notePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={note}
        onChangeText={setNote}
        maxLength={80}
      />

      <View style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.flex}>
          <ThemedText>{t('plan.goalForm.setDeadline')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('plan.goalForm.setDeadlineSub')}
          </ThemedText>
        </View>
        <Switch value={hasDeadline} onValueChange={setHasDeadline} trackColor={{ true: colors.accent }} />
      </View>
      {hasDeadline ? (
        <View style={styles.dateBlock}>
          <DateField value={deadline} onChange={setDeadline} />
          {!deadlineValid ? (
            <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
              {t('plan.goalForm.pickDate')}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {toId ? (
        <View style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.flex}>
            <ThemedText>{t('plan.goalForm.useBalance')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.goalForm.useBalanceSub')}
            </ThemedText>
          </View>
          <Switch value={useBalance} onValueChange={setUseBalance} trackColor={{ true: colors.accent }} />
        </View>
      ) : null}
      <View style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.flex}>
          <ThemedText>{t('plan.goalForm.auto')}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('plan.goalForm.autoSub')}
          </ThemedText>
        </View>
        <Switch value={autoOn} onValueChange={setAutoOn} trackColor={{ true: colors.accent }} />
      </View>
      {autoOn ? (
        <>
          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('plan.goalForm.autoFrom')}
          </ThemedText>
          <View style={styles.presets}>
            {selectableAccounts
              .filter((a) => a.id !== toId)
              .map((a) => (
                <Chip key={a.id} label={accountName(a)} active={a.id === fromId} onPress={() => setFromId(a.id)} />
              ))}
          </View>
          <ThemedText type="small" style={[styles.label, { color: colors.textSecondary }]}>
            {t('plan.goalForm.autoDay')}
          </ThemedText>
          <TextInput style={inputStyle} value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} />
          {!autoOk ? (
            <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.one }}>
              {t('plan.goalForm.autoNeeds')}
            </ThemedText>
          ) : null}
        </>
      ) : null}

      {editing ? (
        <View style={[styles.switchRow, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.flex}>
            <ThemedText>{t('plan.goalForm.pause')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.goalForm.pauseSub')}
            </ThemedText>
          </View>
          <Switch value={paused} onValueChange={setPaused} trackColor={{ true: colors.accent }} />
        </View>
      ) : null}

      <Pressable
        style={[styles.saveButton, { backgroundColor: valid ? colors.accent : colors.backgroundSelected }]}
        onPress={save}
        disabled={!valid}
      >
        <ThemedText style={[styles.saveText, !valid && { color: colors.textSecondary }]}>{editing ? t('plan.goalForm.saveChanges') : t('plan.goalForm.create')}</ThemedText>
      </Pressable>

      {editing ? (
        <Pressable style={styles.textButton} onPress={remove}>
          <ThemedText style={{ color: colors.negative, fontWeight: '600' }}>{t('plan.goalForm.delete')}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** One year from today: a sensible starting point for a deadline. */
function defaultDeadline() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return toDateKey(d);
}

const styles = StyleSheet.create({
  template: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.two },
  templateText: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  box: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  flex: { flex: 1 },
  label: { marginBottom: Spacing.one, marginTop: Spacing.three },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 14, fontSize: 17 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  preset: { padding: 4, borderRadius: 26, borderWidth: 2, borderColor: 'transparent' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, borderRadius: 14, marginTop: Spacing.three },
  dateBlock: { marginTop: Spacing.two },
  saveButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: Spacing.four },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  textButton: { padding: 14, alignItems: 'center' },
});
