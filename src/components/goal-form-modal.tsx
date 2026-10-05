import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/category-icon';
import { DateField } from '@/components/date-field';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { IconName } from '@/constants/categories';
import { GOAL_PRESETS } from '@/constants/goals';
import { Spacing } from '@/constants/theme';
import { usePlan } from '@/context/PlanContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { toDateKey } from '@/utils/dates';
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
  const { addGoal, updateGoal, deleteGoal } = usePlan();

  const startPreset = Math.max(0, GOAL_PRESETS.findIndex((p) => p.icon === editing?.icon));
  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing ? String(editing.target) : '');
  const [preset, setPreset] = useState(startPreset);
  const [hasDeadline, setHasDeadline] = useState(!!editing?.deadline);
  const [deadline, setDeadline] = useState(editing?.deadline ?? defaultDeadline());

  const targetNumber = parseFloat(target.replace(',', '.'));
  const today = toDateKey(new Date());
  const deadlineValid = !hasDeadline || deadline > today || (!!editing && deadline === editing.deadline);
  const valid = name.trim().length > 0 && Number.isFinite(targetNumber) && targetNumber > 0 && deadlineValid;

  function save() {
    if (!valid) return;
    const look = GOAL_PRESETS[preset];
    const data = {
      name: name.trim(),
      target: Math.round(targetNumber * 100) / 100,
      deadline: hasDeadline ? deadline : undefined,
      icon: look.icon as string,
      color: look.color,
    };
    if (editing) updateGoal(editing.id, data);
    else addGoal(data);
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
