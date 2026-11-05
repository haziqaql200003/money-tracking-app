import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/ui/text';

import { Chip } from '@/components/ui/chip';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { accountName, categoryName, subcategoryName } from '@/i18n/data';
import type { Proposal } from '@/services/ai/engine';
import { formatMoney } from '@/utils/currency';
import { dayLabel } from '@/utils/dates';

export type ProposalStatus = 'pending' | 'saved' | 'skipped';

type Props = {
  proposal: Proposal;
  status: ProposalStatus;
  onSave: (p: Proposal) => void;
  onSkip: () => void;
  onUndo: () => void;
};

const MASK = 'RM ••••';

/** A record the assistant prepared. Nothing is saved until the pengguna taps Save; they can change it first. */
export function ProposalCard({ proposal, status, onSave, onSkip, onUndo }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const { selectableAccounts } = useTransactions();
  const { expenseCategories, incomeCategories, getCategory } = useCategories();
  const [draft, setDraft] = useState<Proposal>(proposal);
  const [editing, setEditing] = useState(false);
  const [amountText, setAmountText] = useState(String(proposal.kind === 'transaction' ? proposal.tx.amount : proposal.tr.amount));

  const muted = { color: colors.textSecondary };
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const accLabel = (id: string) => {
    const a = selectableAccounts.find((x) => x.id === id);
    return a ? accountName(a) : '—';
  };

  const setAmount = (text: string) => {
    setAmountText(text);
    const n = Math.round(Number(text.replace(',', '.')) * 100) / 100;
    if (!Number.isFinite(n)) return;
    setDraft((d) => (d.kind === 'transaction' ? { ...d, tx: { ...d.tx, amount: n } } : { ...d, tr: { ...d.tr, amount: n } }));
  };

  const amount = draft.kind === 'transaction' ? draft.tx.amount : draft.tr.amount;
  const valid = amount > 0 && (draft.kind === 'transaction' ? selectableAccounts.some((a) => a.id === draft.tx.accountId) : draft.tr.fromAccountId !== draft.tr.toAccountId && [draft.tr.fromAccountId, draft.tr.toAccountId].every((id) => selectableAccounts.some((a) => a.id === id)));

  const header = (() => {
    if (draft.kind === 'transfer') {
      return {
        icon: 'swap-horizontal' as const,
        tone: colors.accent,
        label: t('ai.card.transfer'),
        title: `${accLabel(draft.tr.fromAccountId)} → ${accLabel(draft.tr.toAccountId)}`,
        meta: [dayLabel(draft.tr.date), draft.tr.note].filter(Boolean).join(' · '),
        amount: money(draft.tr.amount),
      };
    }
    const tx = draft.tx;
    const cat = getCategory(tx.categoryId);
    const income = tx.type === 'credit';
    return {
      icon: (cat?.icon ?? (income ? 'arrow-down' : 'arrow-up')) as keyof typeof Ionicons.glyphMap,
      tone: income ? colors.positive : colors.negative,
      label: income ? t('ai.card.income') : t('ai.card.expense'),
      title: tx.title,
      meta: [cat ? categoryName(cat) : '', tx.subcategory ? subcategoryName(tx.subcategory) : '', accLabel(tx.accountId), dayLabel(tx.date), tx.items?.length ? t('ai.card.items', { n: tx.items.length }) : '']
        .filter(Boolean)
        .join(' · '),
      amount: `${income ? '+' : '-'}${money(tx.amount)}`,
    };
  })();

  const cats = draft.kind === 'transaction' ? (draft.tx.type === 'credit' ? incomeCategories : expenseCategories) : [];

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }, status !== 'pending' && styles.dim]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${header.tone}1F` }]}>
          <Ionicons name={header.icon} size={18} color={header.tone} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="small" style={muted}>{header.label}</ThemedText>
          <ThemedText type="smallBold" numberOfLines={2}>{header.title}</ThemedText>
          <ThemedText type="small" style={muted} numberOfLines={2}>{header.meta}</ThemedText>
        </View>
        <ThemedText type="smallBold" style={{ color: header.tone }}>{header.amount}</ThemedText>
      </View>

      {status === 'pending' && draft.notes.length ? (
        <View style={styles.notes}>
          {draft.notes.map((n) => (
            <View key={n} style={styles.note}>
              <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
              <ThemedText type="small" style={[styles.flex, { color: colors.warning }]}>{t(`ai.note.${n}` as TKey)}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {status === 'pending' && editing ? (
        <View style={[styles.editor, { borderTopColor: colors.divider }]}>
          {draft.kind === 'transaction' ? (
            <>
              <ThemedText type="small" style={muted}>{t('ai.card.title')}</ThemedText>
              <TextInput
                value={draft.tx.title}
                onChangeText={(v) => setDraft((d) => (d.kind === 'transaction' ? { ...d, tx: { ...d.tx, title: v.slice(0, 60) } } : d))}
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSelected }]}
                placeholderTextColor={colors.textSecondary}
              />
            </>
          ) : null}
          <ThemedText type="small" style={muted}>{t('ai.card.amount')}</ThemedText>
          <TextInput
            value={amountText}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSelected }]}
          />
          {draft.kind === 'transaction' ? (
            <>
              <ThemedText type="small" style={muted}>{t('ai.card.category')}</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {cats.map((c) => (
                  <Chip
                    key={c.id}
                    size="sm"
                    icon={c.icon}
                    label={categoryName(c)}
                    active={draft.tx.categoryId === c.id}
                    onPress={() => setDraft((d) => (d.kind === 'transaction' ? { ...d, tx: { ...d.tx, categoryId: c.id, subcategory: c.subcategories[0] ?? '' }, notes: d.notes.filter((n) => n !== 'categoryGuessed' && n !== 'categoryFromHistory') } : d))}
                  />
                ))}
              </ScrollView>
              {(getCategory(draft.tx.categoryId)?.subcategories.length ?? 0) > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {(getCategory(draft.tx.categoryId)?.subcategories ?? []).map((s) => (
                    <Chip key={s} size="sm" label={subcategoryName(s)} active={draft.tx.subcategory === s} onPress={() => setDraft((d) => (d.kind === 'transaction' ? { ...d, tx: { ...d.tx, subcategory: s } } : d))} />
                  ))}
                </ScrollView>
              ) : null}
              <ThemedText type="small" style={muted}>{t('ai.card.account')}</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {selectableAccounts.map((a) => (
                  <Chip key={a.id} size="sm" label={accountName(a)} active={draft.tx.accountId === a.id} onPress={() => setDraft((d) => (d.kind === 'transaction' ? { ...d, tx: { ...d.tx, accountId: a.id }, notes: d.notes.filter((n) => n !== 'accountGuessed') } : d))} />
                ))}
              </ScrollView>
            </>
          ) : (
            (['fromAccountId', 'toAccountId'] as const).map((side) => (
              <View key={side} style={styles.gap}>
                <ThemedText type="small" style={muted}>{side === 'fromAccountId' ? t('ai.card.from') : t('ai.card.to')}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {selectableAccounts.map((a) => (
                    <Chip key={a.id} size="sm" label={accountName(a)} active={draft.tr[side] === a.id} onPress={() => setDraft((d) => (d.kind === 'transfer' ? { ...d, tr: { ...d.tr, [side]: a.id } } : d))} />
                  ))}
                </ScrollView>
              </View>
            ))
          )}
          {!(amount > 0) ? <ThemedText type="small" style={{ color: colors.negative }}>{t('ai.card.badAmount')}</ThemedText> : null}
        </View>
      ) : null}

      {status === 'pending' ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => valid && onSave(draft)}
            disabled={!valid}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: !valid ? 0.4 : pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="checkmark" size={16} color={colors.onAccent} />
            <ThemedText type="smallBold" style={{ color: colors.onAccent }}>{t('ai.card.save')}</ThemedText>
          </Pressable>
          <Pressable onPress={() => setEditing((v) => !v)} accessibilityRole="button" style={[styles.secondary, { backgroundColor: colors.accentSoft }]}>
            <ThemedText type="smallBold" style={{ color: colors.accent }}>{editing ? t('ai.card.done') : t('ai.card.change')}</ThemedText>
          </Pressable>
          <Pressable onPress={onSkip} accessibilityRole="button" style={styles.ghost}>
            <ThemedText type="small" style={muted}>{t('ai.card.skip')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Ionicons name={status === 'saved' ? 'checkmark-circle' : 'remove-circle-outline'} size={16} color={status === 'saved' ? colors.positive : colors.textSecondary} />
          <ThemedText type="small" style={[styles.flex, { color: status === 'saved' ? colors.positive : colors.textSecondary }]}>
            {status === 'saved' ? t('ai.card.saved') : t('ai.card.skipped')}
          </ThemedText>
          <Pressable onPress={onUndo} accessibilityRole="button" hitSlop={8}>
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '700' }}>{t('ai.card.undo')}</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 6 },
  card: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 10 },
  dim: { opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  notes: { gap: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editor: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6 },
  input: { borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  chips: { gap: 6, paddingVertical: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  primary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill },
  secondary: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill },
  ghost: { paddingHorizontal: 8, paddingVertical: 9 },
});
