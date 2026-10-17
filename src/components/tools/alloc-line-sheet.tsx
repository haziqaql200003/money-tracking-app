import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { ThemedText } from '@/components/ui/themed-text';
import { ToolSheet } from '@/components/tools/tool-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { FormField, TextField } from '@/components/ui/form-field';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePlan } from '@/context/PlanContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { categoryName } from '@/i18n/data';
import { newLineId, type AllocKind, type AllocLine } from '@/utils/allocation';

type Props = {
  visible: boolean;
  /** The line being changed, or null to add one. */
  line: AllocLine | null;
  onSave: (line: AllocLine) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

const KINDS: { id: AllocKind; key: 'alloc.kind.goal' | 'alloc.kind.category' | 'alloc.kind.custom' }[] = [
  { id: 'goal', key: 'alloc.kind.goal' },
  { id: 'category', key: 'alloc.kind.category' },
  { id: 'custom', key: 'alloc.kind.custom' },
];

/** Add or change one line of the salary plan: a goal, a budget category, or your own label. */
function LineForm({ line, onSave, onRemove, onClose }: Omit<Props, 'visible'>) {
  const colors = useTheme();
  const { t } = useT();
  const { goals } = usePlan();
  const { expenseCategories } = useCategories();
  const [kind, setKind] = useState<AllocKind>(line?.kind ?? 'category');
  const [refId, setRefId] = useState<string | undefined>(line?.refId);
  const [label, setLabel] = useState(line?.label ?? '');
  const [amount, setAmount] = useState(line ? String(line.amount) : '');
  const [tried, setTried] = useState(false);

  const value = parseFloat(amount.replace(',', '.'));
  const amountOk = Number.isFinite(value) && value > 0;
  const options = kind === 'goal' ? goals.filter((g) => !g.paused).map((g) => ({ id: g.id, name: g.name })) : kind === 'category' ? expenseCategories.map((c) => ({ id: c.id, name: categoryName(c) })) : [];
  const errAmount = tried && !amountOk ? t('alloc.err.amount') : undefined;
  const errRef = tried && kind !== 'custom' && !refId ? t('alloc.err.ref') : undefined;
  const errLabel = tried && kind === 'custom' && !label.trim() ? t('alloc.err.label') : undefined;

  function save() {
    setTried(true);
    if (!amountOk || (kind !== 'custom' && !refId) || (kind === 'custom' && !label.trim())) return;
    onSave({ id: line?.id ?? newLineId(), kind, refId: kind === 'custom' ? undefined : refId, label: kind === 'custom' ? label.trim() : undefined, amount: Math.round(value * 100) / 100 });
  }

  return (
    <ToolSheet visible title={line ? t('alloc.edit.title') : t('alloc.add.title')} onClose={onClose}>
      <FormField label={t('alloc.f.kind')}>
        <View style={styles.chips}>
          {KINDS.map((k) => (
            <Chip key={k.id} size="sm" label={t(k.key)} active={kind === k.id} onPress={() => { setKind(k.id); setRefId(undefined); }} />
          ))}
        </View>
      </FormField>
      {kind === 'custom' ? (
        <TextField label={t('alloc.f.label')} value={label} onChangeText={setLabel} maxLength={40} error={errLabel} />
      ) : (
        <FormField label={t('alloc.f.ref')} error={errRef}>
          {options.length === 0 ? <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('alloc.kind.none')}</ThemedText> : null}
          <View style={styles.chips}>
            {options.map((o) => (
              <Chip key={o.id} size="sm" label={o.name} active={refId === o.id} onPress={() => setRefId(o.id)} />
            ))}
          </View>
        </FormField>
      )}
      <FormField label={t('alloc.f.amount')} error={errAmount}>
        <AmountInput
          value={amount}
          onChange={setAmount}
          style={[Type.heading, styles.amount, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: errAmount ? colors.negative : colors.divider }]}
          placeholderTextColor={colors.textSecondary}
        />
      </FormField>
      <Button label={t('alloc.save')} onPress={save} />
      {line ? <Button label={t('alloc.delete')} variant="danger" onPress={() => onRemove(line.id)} /> : null}
    </ToolSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amount: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 12 },
});

/** Add or change one line of the salary plan. The form starts fresh every time it opens. */
export function AllocLineSheet(props: Props) {
  return props.visible ? <LineForm line={props.line} onSave={props.onSave} onRemove={props.onRemove} onClose={props.onClose} /> : null;
}
