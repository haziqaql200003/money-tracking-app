import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { CATEGORY_COLORS, FALLBACK_EXPENSE_ID, FALLBACK_INCOME_ID } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { accountName, categoryName } from '@/i18n/data';
import { formatMoney } from '@/utils/currency';
import { dayLabel } from '@/utils/dates';
import { buildImportContext } from '@/utils/import/build-context';
import { detectColumns, detectDateOrder, emptyMapping, type DateOrder, type Mapping, type Role } from '@/utils/import/columns';
import {
  analyze,
  finalize,
  unmatchedAccounts,
  unmatchedCategories,
  type AccountChoice,
  type CategoryChoice,
} from '@/utils/import/plan';
import { readTables, type Table } from '@/utils/import/table';

type Step = 'start' | 'columns' | 'review' | 'done';
type Result = { count: number; transactionIds: string[]; categoryIds: string[]; accountIds: string[] };

const ROLE_ORDER: Role[] = ['date', 'title', 'amount', 'debit', 'credit', 'type', 'category', 'subcategory', 'account'];
const MAX_UNMATCHED_AUTO_CREATE = 12;
const MAX_ACCOUNTS_AUTO_CREATE = 5;

/** Example file people can open in Excel and fill in. Dates are written year-month-day so no program misreads them. */
const TEMPLATE = [
  'Date,Description,Category,Subcategory,Account,Type,Amount',
  '2026-01-03,Nasi lemak,Food & Drinks,Breakfast,Bank,Expense,6.50',
  '2026-01-05,Monthly salary,Salary,Salary,Bank,Income,4500.00',
  '2026-01-07,Petrol,Transport,Petrol / Fuel,Cash,Expense,50.00',
].join('\n'); // i18n-ignore: sample data for a spreadsheet

const columnLetter = (i: number) => {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export default function ImportScreen() {
  const colors = useTheme();
  const { t, tp } = useT();
  const router = useRouter();
  const { categories, addCategories, deleteCategory } = useCategories();
  const { selectableAccounts: accounts, transactions, addTransactions, deleteTransactions, addAccounts, deleteAccount } = useTransactions();

  const [step, setStep] = useState<Step>('start');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fileName, setFileName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(-1);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping());
  const [dateOrder, setDateOrder] = useState<DateOrder>('dmy');
  const [positiveIs, setPositiveIs] = useState<'expense' | 'income'>('expense');

  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [categoryChoices, setCategoryChoices] = useState<Record<string, CategoryChoice>>({});
  const [accountChoices, setAccountChoices] = useState<Record<string, AccountChoice>>({});
  const [defaultAccountId, setDefaultAccountId] = useState(accounts[0]?.id ?? '');

  const [result, setResult] = useState<Result | null>(null);

  const table = tables[sheetIndex];
  const rows = useMemo(() => table?.rows ?? [], [table]);
  const ctx = useMemo(
    () => buildImportContext(categories, accounts, transactions, { expense: FALLBACK_EXPENSE_ID, income: FALLBACK_INCOME_ID }),
    [categories, accounts, transactions],
  );

  const analysis = useMemo(
    () => (step === 'start' || rows.length === 0 ? null : analyze(rows, headerRow, mapping, { dateOrder, positiveIs, skipDuplicates }, ctx)),
    [step, rows, headerRow, mapping, dateOrder, positiveIs, skipDuplicates, ctx],
  );

  const unmatchedCats = useMemo(() => (analysis ? unmatchedCategories(analysis.parsed, ctx) : []), [analysis, ctx]);
  const unmatchedAccs = useMemo(() => (analysis ? unmatchedAccounts(analysis.parsed, ctx) : []), [analysis, ctx]);

  const effectiveCategoryChoices = useMemo(() => {
    const out: Record<string, CategoryChoice> = {};
    for (const u of unmatchedCats) out[u.key] = categoryChoices[u.key] ?? (unmatchedCats.length <= MAX_UNMATCHED_AUTO_CREATE ? 'new' : 'fallback');
    return out;
  }, [unmatchedCats, categoryChoices]);
  const effectiveAccountChoices = useMemo(() => {
    const out: Record<string, AccountChoice> = {};
    for (const u of unmatchedAccs) out[u.key] = accountChoices[u.key] ?? (unmatchedAccs.length <= MAX_ACCOUNTS_AUTO_CREATE ? 'new' : 'default');
    return out;
  }, [unmatchedAccs, accountChoices]);

  const final = useMemo(
    () =>
      step === 'review' && analysis
        ? finalize(analysis.parsed, ctx, { categories: effectiveCategoryChoices, accounts: effectiveAccountChoices, defaultAccountId }, skipDuplicates)
        : null,
    [step, analysis, ctx, effectiveCategoryChoices, effectiveAccountChoices, defaultAccountId, skipDuplicates],
  );

  const hasAmount = mapping.amount >= 0 || mapping.debit >= 0 || mapping.credit >= 0;
  const canReview = mapping.date >= 0 && hasAmount && !!analysis && analysis.parsed.length > 0;

  /* ---------------- actions ---------------- */

  function loadSheet(list: Table[], index: number) {
    const tb = list[index];
    const detected = detectColumns(tb.rows);
    const dateValues = detected.mapping.date >= 0 ? tb.rows.slice(detected.headerRow + 1).map((r) => r[detected.mapping.date] ?? '') : [];
    setSheetIndex(index);
    setHeaderRow(detected.headerRow);
    setMapping(detected.mapping);
    setDateOrder(detectDateOrder(dateValues));
    setCategoryChoices({});
    setAccountChoices({});
  }

  async function pickFile() {
    setError(null);
    setBusy(true);
    try {
      const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
      if (picked.canceled || !picked.result) return;
      const file = picked.result;
      const bytes = await file.bytes();
      const list = readTables(bytes, file.name);
      if (list.length === 0) {
        setError(t('imp.error.empty'));
        return;
      }
      setFileName(file.name);
      setTables(list);
      loadSheet(list, 0);
      setStep('columns');
    } catch (e) {
      setError(e instanceof Error && e.message === 'old-xls' ? t('imp.error.oldXls') : t('imp.error.read'));
    } finally {
      setBusy(false);
    }
  }

  async function shareTemplate() {
    try {
      await Share.share({ message: TEMPLATE, title: 'wakira-import-example.csv' /* i18n-ignore */ });
    } catch {
      // sheet dismissed
    }
  }

  function setRole(role: Role, column: number) {
    setMapping((prev) => ({ ...prev, [role]: column }));
  }

  function toggleHeader(on: boolean) {
    const detected = detectColumns(rows);
    setHeaderRow(on ? Math.max(detected.headerRow, 0) : -1);
  }

  function runImport() {
    if (!final) return;
    const catIds = final.newCategories.length
      ? addCategories(
          final.newCategories.map((c, i) => ({
            name: c.name,
            icon: 'pricetag' as const,
            color: CATEGORY_COLORS[(categories.length + i) % CATEGORY_COLORS.length],
            kind: c.kind,
            subcategories: [],
            monthlyLimit: 0,
          })),
        )
      : [];
    const accIds = final.newAccounts.length
      ? addAccounts(final.newAccounts.map((a) => ({ name: a.name, type: 'bank' as const, icon: 'business' as const, initialBalance: 0 })))
      : [];
    const catMap = new Map(final.newCategories.map((c, i) => [c.key, catIds[i]]));
    const accMap = new Map(final.newAccounts.map((a, i) => [a.key, accIds[i]]));
    const resolve = (ref: string, map: Map<string, string>) => (ref.startsWith('new:') ? (map.get(ref.slice(4)) ?? ref) : ref);
    const ids = addTransactions(
      final.drafts.map((d) => ({
        title: d.title,
        date: d.date,
        categoryId: resolve(d.categoryRef, catMap),
        subcategory: d.subcategory,
        amount: d.amount,
        type: d.type,
        accountId: resolve(d.accountRef, accMap),
      })),
    );
    setResult({ count: ids.length, transactionIds: ids, categoryIds: catIds, accountIds: accIds });
    setStep('done');
  }

  function undoImport() {
    if (!result) return;
    deleteTransactions(result.transactionIds);
    result.accountIds.forEach((id) => deleteAccount(id));
    result.categoryIds.forEach((id) => deleteCategory(id));
    setResult(null);
    setStep('start');
    setTables([]);
  }

  /* ---------------- small pieces ---------------- */

  const columnLabel = (c: number) => {
    const header = headerRow >= 0 ? (rows[headerRow]?.[c] ?? '').trim() : '';
    return header ? header : t('imp.columnN', { n: columnLetter(c) });
  };
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);

  const card = [styles.card, { backgroundColor: colors.backgroundElement }];
  const muted = { color: colors.textSecondary };

  const categoryLabel = (id: string) => {
    const c = categories.find((x) => x.id === id);
    return c ? categoryName(c) : id;
  };

  /* ---------------- screens ---------------- */

  const startView = (
    <>
      <View style={card}>
        <Ionicons name="document-text-outline" size={30} color={colors.accent} />
        <ThemedText style={styles.cardTitle}>{t('imp.start.heading')}</ThemedText>
        <ThemedText type="small" style={muted}>
          {t('imp.start.body')}
        </ThemedText>
        <Button label={t('imp.start.pick')} icon="folder-open-outline" onPress={pickFile} loading={busy} style={styles.gapTop} />
        {error ? (
          <ThemedText type="small" style={{ color: colors.negative, marginTop: Spacing.two }}>
            {error}
          </ThemedText>
        ) : null}
      </View>
      <View style={card}>
        <ThemedText type="smallBold">{t('imp.start.formatsTitle')}</ThemedText>
        <ThemedText type="small" style={muted}>
          {t('imp.start.formats')}
        </ThemedText>
        <ThemedText type="small" style={[muted, styles.gapTop]}>
          {t('imp.start.privacy')}
        </ThemedText>
        <Button label={t('imp.start.template')} variant="secondary" size="sm" icon="share-outline" onPress={shareTemplate} style={styles.gapTop} />
      </View>
    </>
  );

  const columnsView = (
    <>
      <View style={card}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {fileName}
        </ThemedText>
        <ThemedText type="small" style={muted}>
          {t('imp.columns.intro')}
        </ThemedText>
        {tables.length > 1 ? (
          <>
            <ThemedText type="smallBold" style={styles.gapTop}>
              {t('imp.columns.sheet')}
            </ThemedText>
            <ChipRow>
              {tables.map((tb, i) => (
                <Chip key={`${tb.name}-${i}`} label={tb.name} active={i === sheetIndex} onPress={() => loadSheet(tables, i)} />
              ))}
            </ChipRow>
          </>
        ) : null}
        <ThemedText type="smallBold" style={styles.gapTop}>
          {t('imp.columns.header')}
        </ThemedText>
        <ChipRow>
          <Chip label={t('imp.yes')} active={headerRow >= 0} onPress={() => toggleHeader(true)} />
          <Chip label={t('imp.no')} active={headerRow < 0} onPress={() => toggleHeader(false)} />
        </ChipRow>
      </View>

      <View style={card}>
        {ROLE_ORDER.map((role) => (
          <View key={role} style={styles.roleBlock}>
            <ThemedText type="smallBold">
              {t(`imp.role.${role}` as const)}
              {role === 'date' ? ` · ${t('imp.required')}` : ''}
            </ThemedText>
            <ChipRow>
              <Chip label={t('imp.none')} active={mapping[role] < 0} onPress={() => setRole(role, -1)} />
              {Array.from({ length: width }, (_, c) => (
                <Chip key={c} label={columnLabel(c)} active={mapping[role] === c} onPress={() => setRole(role, c)} />
              ))}
            </ChipRow>
          </View>
        ))}
        <ThemedText type="small" style={muted}>
          {t('imp.columns.amountHelp')}
        </ThemedText>
      </View>

      <View style={card}>
        <ThemedText type="smallBold">{t('imp.columns.dateFormat')}</ThemedText>
        <ChipRow>
          <Chip label={t('imp.columns.dayFirst')} active={dateOrder === 'dmy'} onPress={() => setDateOrder('dmy')} />
          <Chip label={t('imp.columns.monthFirst')} active={dateOrder === 'mdy'} onPress={() => setDateOrder('mdy')} />
        </ChipRow>
        {mapping.amount >= 0 && mapping.type < 0 && mapping.debit < 0 && mapping.credit < 0 ? (
          <>
            <ThemedText type="smallBold" style={styles.gapTop}>
              {t('imp.columns.positiveIs')}
            </ThemedText>
            <ChipRow>
              <Chip label={t('imp.columns.spending')} active={positiveIs === 'expense'} onPress={() => setPositiveIs('expense')} />
              <Chip label={t('imp.columns.earning')} active={positiveIs === 'income'} onPress={() => setPositiveIs('income')} />
            </ChipRow>
          </>
        ) : null}
      </View>

      <View style={card}>
        <ThemedText type="smallBold">{t('imp.columns.preview')}</ThemedText>
        {rows.slice(headerRow + 1, headerRow + 4).map((r, i) => (
          <ThemedText key={i} type="small" style={muted} numberOfLines={1}>
            {r.filter(Boolean).join(' · ')}
          </ThemedText>
        ))}
        {analysis ? (
          <ThemedText type="small" style={[styles.gapTop, { color: canReview ? colors.positive : colors.warning }]}>
            {canReview
              ? tp('imp.columns.ready', analysis.parsed.length)
              : mapping.date < 0 || !hasAmount
                ? t('imp.columns.needMore')
                : t('imp.columns.noneReadable')}
            {analysis.problems.length > 0 ? ` · ${tp('imp.columns.problems', analysis.problems.length)}` : ''}
          </ThemedText>
        ) : null}
      </View>

      <Button label={t('imp.columns.next')} onPress={() => setStep('review')} disabled={!canReview} />
    </>
  );

  const reviewView = analysis && final ? (
    <>
      <View style={card}>
        <ThemedText style={styles.big}>{tp('imp.review.toImport', final.drafts.length)}</ThemedText>
        {analysis.parsed.some((p) => p.duplicate) ? (
          <>
            <ThemedText type="small" style={[muted, styles.gapTop]}>
              {tp('imp.review.duplicates', analysis.parsed.filter((p) => p.duplicate).length)}
            </ThemedText>
            <ChipRow>
              <Chip label={t('imp.review.skipThem')} active={skipDuplicates} onPress={() => setSkipDuplicates(true)} />
              <Chip label={t('imp.review.importAnyway')} active={!skipDuplicates} onPress={() => setSkipDuplicates(false)} />
            </ChipRow>
          </>
        ) : null}
        {analysis.problems.length > 0 ? (
          <View style={styles.gapTop}>
            <ThemedText type="smallBold" style={{ color: colors.warning }}>
              {tp('imp.review.problems', analysis.problems.length)}
            </ThemedText>
            {analysis.problems.slice(0, 4).map((p) => (
              <ThemedText key={p.line} type="small" style={muted}>
                {t('imp.review.problemLine', { line: p.line, reason: p.reason === 'date' ? t('imp.review.badDate') : t('imp.review.badAmount') })}
              </ThemedText>
            ))}
            {analysis.problems.length > 4 ? (
              <ThemedText type="small" style={muted}>
                {t('imp.review.moreProblems', { n: analysis.problems.length - 4 })}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>

      {unmatchedCats.length > 0 ? (
        <View style={card}>
          <ThemedText style={styles.cardTitle}>{t('imp.review.catsTitle')}</ThemedText>
          <ThemedText type="small" style={muted}>
            {t('imp.review.catsBody')}
          </ThemedText>
          {unmatchedCats.map((u) => {
            const choice = effectiveCategoryChoices[u.key];
            const options = categories.filter((c) => c.kind === u.kind && c.id !== (u.kind === 'income' ? FALLBACK_INCOME_ID : FALLBACK_EXPENSE_ID));
            return (
              <View key={u.key} style={styles.roleBlock}>
                <ThemedText type="smallBold">
                  {u.text} · {tp('imp.review.records', u.count)}
                </ThemedText>
                <ChipRow>
                  <Chip label={t('imp.review.create', { name: u.text })} active={choice === 'new'} onPress={() => setCategoryChoices((p) => ({ ...p, [u.key]: 'new' }))} />
                  <Chip
                    label={categoryLabel(u.kind === 'income' ? FALLBACK_INCOME_ID : FALLBACK_EXPENSE_ID)}
                    active={choice === 'fallback'}
                    onPress={() => setCategoryChoices((p) => ({ ...p, [u.key]: 'fallback' }))}
                  />
                  {options.map((c) => (
                    <Chip key={c.id} label={categoryName(c)} active={choice === c.id} onPress={() => setCategoryChoices((p) => ({ ...p, [u.key]: c.id }))} />
                  ))}
                </ChipRow>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={card}>
        <ThemedText style={styles.cardTitle}>{t('imp.review.accountsTitle')}</ThemedText>
        <ThemedText type="small" style={muted}>
          {t('imp.review.defaultAccount')}
        </ThemedText>
        <ChipRow>
          {accounts.map((a) => (
            <Chip key={a.id} label={accountName(a)} active={defaultAccountId === a.id} onPress={() => setDefaultAccountId(a.id)} />
          ))}
        </ChipRow>
        {unmatchedAccs.map((u) => {
          const choice = effectiveAccountChoices[u.key];
          return (
            <View key={u.key} style={styles.roleBlock}>
              <ThemedText type="smallBold">
                {u.text} · {tp('imp.review.records', u.count)}
              </ThemedText>
              <ChipRow>
                <Chip label={t('imp.review.create', { name: u.text })} active={choice === 'new'} onPress={() => setAccountChoices((p) => ({ ...p, [u.key]: 'new' }))} />
                <Chip label={t('imp.review.useDefault')} active={choice === 'default'} onPress={() => setAccountChoices((p) => ({ ...p, [u.key]: 'default' }))} />
                {accounts.map((a) => (
                  <Chip key={a.id} label={accountName(a)} active={choice === a.id} onPress={() => setAccountChoices((p) => ({ ...p, [u.key]: a.id }))} />
                ))}
              </ChipRow>
            </View>
          );
        })}
      </View>

      {final.drafts.length > 0 ? (
        <View style={card}>
          <ThemedText type="smallBold">{t('imp.review.sample')}</ThemedText>
          {final.drafts.slice(0, 5).map((d, i) => {
            const newCat = final.newCategories.find((c) => `new:${c.key}` === d.categoryRef);
            return (
              <View key={i} style={styles.sampleRow}>
                <View style={styles.flex}>
                  <ThemedText numberOfLines={1}>{d.title || '—'}</ThemedText>
                  <ThemedText type="small" style={muted} numberOfLines={1}>
                    {dayLabel(d.date)} · {newCat ? newCat.name : categoryLabel(d.categoryRef)}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: d.type === 'credit' ? colors.positive : colors.text, fontWeight: '700' }}>
                  {formatMoney(d.amount, { signed: true, type: d.type })}
                </ThemedText>
              </View>
            );
          })}
        </View>
      ) : (
        <ThemedText style={[muted, styles.center]}>{t('imp.review.nothing')}</ThemedText>
      )}

      <Button label={tp('imp.review.importBtn', final.drafts.length)} onPress={runImport} disabled={final.drafts.length === 0} />
    </>
  ) : null;

  const doneView = result ? (
    <View style={[card, styles.doneCard]}>
      <Ionicons name="checkmark-circle" size={44} color={colors.positive} />
      <ThemedText style={styles.cardTitle}>{t('imp.done.title')}</ThemedText>
      <ThemedText style={styles.center}>{tp('imp.done.added', result.count)}</ThemedText>
      {result.categoryIds.length + result.accountIds.length > 0 ? (
        <ThemedText type="small" style={[muted, styles.center]}>
          {t('imp.done.created', { cats: result.categoryIds.length, accs: result.accountIds.length })}
        </ThemedText>
      ) : null}
      <Button label={t('imp.done.finish')} onPress={() => router.back()} style={styles.gapTop} />
      <Button label={t('imp.done.undo')} variant="danger" onPress={undoImport} style={styles.gapTop} />
      <ThemedText type="small" style={[muted, styles.center]}>
        {t('imp.done.undoHint')}
      </ThemedText>
    </View>
  ) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title={t('imp.title')} />
          {step === 'start' ? startView : null}
          {step === 'columns' ? columnsView : null}
          {step === 'review' ? reviewView : null}
          {step === 'done' ? doneView : null}
          {step === 'columns' || step === 'review' ? (
            <Pressable onPress={() => setStep(step === 'review' ? 'columns' : 'start')} style={styles.back} accessibilityRole="button">
              <ThemedText type="small" style={{ color: colors.accent }}>
                {t('imp.stepBack')}
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130, gap: 0 },
  flex: { flex: 1 },
  card: { borderRadius: 20, padding: 20, marginBottom: Spacing.three, gap: 6 },
  doneCard: { alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  big: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  gapTop: { marginTop: Spacing.three },
  center: { textAlign: 'center' },
  chipRow: { gap: 8, paddingVertical: 6, paddingRight: 8 },
  roleBlock: { marginTop: Spacing.two },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  back: { alignItems: 'center', paddingVertical: Spacing.three },
});
