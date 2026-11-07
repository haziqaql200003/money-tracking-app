import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/ui/amount-input';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Sheet } from '@/components/ui/sheet';
import { TextInput } from '@/components/ui/text';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { accountName, categoryName } from '@/i18n/data';
import {
  bakeValues,
  fillTemplate,
  MAX_SHORTCUTS,
  missingSlots,
  shortcutId,
  slotsOf,
  type FillContext,
  type Shortcut,
  type SlotName,
  type SlotValues,
  type Template,
} from '@/services/ai/shortcuts';

/** What the form was opened for: a template to fill, a saved shortcut that still needs an answer, or editing one. */
export type ShortcutFormMode = { kind: 'template'; template: Template } | { kind: 'run'; shortcut: Shortcut } | { kind: 'edit'; shortcut: Shortcut };

type Props = {
  mode: ShortcutFormMode | null;
  ctx: FillContext;
  shortcutCount: number;
  onClose: () => void;
  onSend: (text: string) => void;
  onSaveShortcut: (s: Shortcut) => void;
};

const PROVIDERS = ['SPayLater', 'Atome', 'Grab PayLater', 'TikTok PayLater', 'Boost PayFlex'];
const MONTH_CHOICES = ['3', '6', '12', '24'];

/**
 * Fill in a template (or the missing parts of a saved shortcut) and see the exact message before it is sent.
 * The message goes through the normal chat, so nothing is saved until the pengguna taps Save on the card it makes.
 */
export function ShortcutForm({ mode, ctx, shortcutCount, onClose, onSend, onSaveShortcut }: Props) {
  // A fresh body per opening keeps the form's answers from leaking into the next one.
  const key = mode ? (mode.kind === 'template' ? `t:${mode.template.id}` : `${mode.kind}:${mode.shortcut.id}`) : 'none';
  return (
    <Body
      key={key}
      mode={mode}
      ctx={ctx}
      shortcutCount={shortcutCount}
      onClose={onClose}
      onSend={onSend}
      onSaveShortcut={onSaveShortcut}
    />
  );
}

function Body({ mode, ctx, shortcutCount, onClose, onSend, onSaveShortcut }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { selectableAccounts } = useTransactions();
  const { expenseCategories } = useCategories();

  const template = mode?.kind === 'template' ? mode.template : null;
  const shortcut = mode && mode.kind !== 'template' ? mode.shortcut : null;
  const text = template ? t(template.msgKey) : (shortcut?.text ?? '');
  const title = template ? t(template.labelKey) : (shortcut?.name ?? '');
  const editing = mode?.kind === 'edit';

  const [values, setValues] = useState<SlotValues>(() => ({ ...(shortcut?.values ?? {}) }));
  const [saving, setSaving] = useState(editing);
  const [name, setName] = useState(shortcut?.name ?? '');

  const slots = slotsOf(text);
  const message = fillTemplate(text, values, ctx);
  const missing = missingSlots(text, values);
  // Running a saved shortcut: the keyboard opens on the one thing it still needs (usually the amount).
  const [focusSlot] = useState<SlotName | undefined>(() => (mode?.kind === 'run' ? missingSlots(text, shortcut?.values ?? {})[0] : undefined));
  const set = (k: SlotName, v: string) => setValues((x) => ({ ...x, [k]: v }));
  const muted = { color: colors.textSecondary };
  const fieldLabel = (k: SlotName) => t(`ai.sc.f.${k}` as TKey);

  const save = () => {
    if (!editing && shortcutCount >= MAX_SHORTCUTS) return;
    const fallback = values.title?.trim() || title;
    onSaveShortcut({
      // Editing keeps the same shortcut; saving from a template or a run makes a new one.
      id: editing && shortcut ? shortcut.id : shortcutId(),
      name: (name.trim() || fallback).slice(0, 40),
      icon: shortcut?.icon ?? template?.icon ?? 'flash-outline',
      text,
      values: bakeValues(values, ctx.todayKey),
      template: shortcut?.template ?? template?.id,
      created: editing && shortcut ? shortcut.created : Date.now(),
    });
  };

  const accountChips = (k: SlotName, required: boolean) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
      {selectableAccounts.map((a) => (
        <Chip
          key={a.id}
          size="sm"
          label={accountName(a)}
          active={values[k] === a.id}
          // An optional account can be cleared by tapping it again.
          onPress={() => set(k, values[k] === a.id && !required ? '' : a.id)}
        />
      ))}
    </ScrollView>
  );

  const input = (k: SlotName, placeholder?: string, multiline = false) => (
    <TextInput
      autoFocus={focusSlot === k}
      value={values[k] ?? ''}
      onChangeText={(v) => set(k, v)}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      multiline={multiline}
      style={[styles.input, multiline && styles.multi, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
    />
  );

  const field = (k: SlotName, required: boolean) => {
    switch (k) {
      case 'amount':
        return (
          <AmountInput
            autoFocus={focusSlot === 'amount'}
            value={values.amount ?? ''}
            onChange={(v) => set('amount', v)}
            style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            placeholderTextColor={colors.textSecondary}
          />
        );
      case 'account':
      case 'from':
      case 'to':
        return accountChips(k, required);
      case 'date':
        return <DateField value={values.date && values.date !== 'today' ? values.date : ctx.todayKey} onChange={(v) => set('date', v)} showQuick maxToday />;
      case 'deadline':
        return (
          <View style={styles.gap}>
            <View style={styles.row}>
              <Chip size="sm" label={t('ai.sc.noDeadline')} active={!values.deadline} onPress={() => set('deadline', '')} />
              <Chip size="sm" label={t('ai.sc.pickDate')} active={!!values.deadline} onPress={() => set('deadline', values.deadline || `${ctx.todayKey.slice(0, 4)}-12-31`)} />
            </View>
            {values.deadline ? <DateField value={values.deadline} onChange={(v) => set('deadline', v)} /> : null}
          </View>
        );
      case 'details':
        return (
          <View style={styles.gap}>
            {input('details', t('ai.sc.p.details'), true)}
            <ThemedText type="small" style={muted}>{t('ai.sc.h.details')}</ThemedText>
          </View>
        );
      case 'months':
        return (
          <View style={styles.row}>
            {MONTH_CHOICES.map((m) => (
              <Chip key={m} size="sm" label={m} active={values.months === m} onPress={() => set('months', m)} />
            ))}
            <TextInput
              value={MONTH_CHOICES.includes(values.months ?? '') ? '' : (values.months ?? '')}
              onChangeText={(v) => set('months', v.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              placeholder="…"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.small, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            />
          </View>
        );
      case 'provider':
        return (
          <View style={styles.gap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
              {PROVIDERS.map((p) => (
                <Chip key={p} size="sm" label={p} active={values.provider === p} onPress={() => set('provider', p)} />
              ))}
            </ScrollView>
            {input('provider', t('ai.sc.p.provider'))}
          </View>
        );
      case 'category':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {expenseCategories.map((c) => (
              <Chip key={c.id} size="sm" icon={c.icon} label={categoryName(c)} active={values.category === c.id} onPress={() => set('category', c.id)} />
            ))}
          </ScrollView>
        );
      case 'person':
        return input('person', t('ai.sc.p.person'));
      default:
        return input(k, k === 'title' ? t('ai.sc.p.title') : undefined);
    }
  };

  const full = !editing && shortcutCount >= MAX_SHORTCUTS;

  const footer = (
    <View style={styles.footer}>
      {saving ? (
        <Pressable
          onPress={save}
          disabled={full}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: full ? 0.4 : pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="bookmark" size={16} color={colors.onAccent} />
          <ThemedText type="smallBold" style={{ color: colors.onAccent }}>{editing ? t('ai.sc.update') : t('ai.sc.saveAs')}</ThemedText>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => message && onSend(message)}
          disabled={!message}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: !message ? 0.4 : pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="arrow-up" size={16} color={colors.onAccent} />
          <ThemedText type="smallBold" style={{ color: colors.onAccent }}>{t('ai.sc.send')}</ThemedText>
        </Pressable>
      )}
      {!editing ? (
        <Pressable onPress={() => setSaving((v) => !v)} accessibilityRole="button" style={[styles.secondary, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={saving ? 'arrow-undo-outline' : 'bookmark-outline'} size={16} color={colors.accent} />
          <ThemedText type="smallBold" style={{ color: colors.accent }}>{saving ? t('ai.sc.send') : t('ai.sc.saveAs')}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Sheet visible={!!mode} onClose={onClose} title={title} footer={footer}>
      <View style={styles.body}>
        {slots.map((s) => (
          <View key={s.name} style={styles.gap}>
            <View style={styles.labelRow}>
              <ThemedText style={[Type.label, { color: colors.text }]}>{fieldLabel(s.name)}</ThemedText>
              {!s.required || s.name === 'date' ? <ThemedText type="small" style={muted}>{t('ai.sc.optional')}</ThemedText> : null}
              {saving && s.required && s.name !== 'date' && !values[s.name]?.trim() ? (
                <ThemedText type="small" style={{ color: colors.accent }}>· {t('ai.sc.asked')}</ThemedText>
              ) : null}
            </View>
            {field(s.name, s.required)}
          </View>
        ))}

        {saving ? (
          <View style={styles.gap}>
            <ThemedText style={[Type.label, { color: colors.text }]}>{t('ai.sc.name')}</ThemedText>
            <TextInput
              value={name}
              onChangeText={(v) => setName(v.slice(0, 40))}
              placeholder={values.title?.trim() || title}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
            />
            <ThemedText type="small" style={muted}>{full ? t('ai.sc.full', { n: MAX_SHORTCUTS }) : t('ai.sc.saveHint')}</ThemedText>
          </View>
        ) : null}

        {/* The exact message, so the pengguna learns how to type it next time. */}
        <View style={[styles.preview, { backgroundColor: colors.accentSoft }]}>
          <ThemedText type="small" style={[styles.previewLabel, { color: colors.accent }]}>{t('ai.sc.preview')}</ThemedText>
          <ThemedText style={{ color: colors.text }}>
            {message ?? t('ai.sc.fillIn', { fields: missing.map(fieldLabel).join(', ') })}
          </ThemedText>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: Spacing.two },
  gap: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  chips: { gap: 6, paddingVertical: 2 },
  input: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  multi: { minHeight: 96, textAlignVertical: 'top' },
  small: { minWidth: 64, paddingVertical: 8 },
  preview: { borderRadius: Radius.md, padding: 12, gap: 4 },
  previewLabel: { fontWeight: '700' },
  footer: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.two },
  primary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: Radius.pill },
  secondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 13, borderRadius: Radius.pill },
});
