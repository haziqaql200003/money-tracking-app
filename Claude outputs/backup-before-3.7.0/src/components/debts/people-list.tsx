import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/debts/debt-ui';
import { TypeTabs } from '@/components/transactions/month-glance';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { ThemedText } from '@/components/ui/themed-text';
import { isLightColor } from '@/constants/card-styles';
import { FontSize, Radius, Spacing, tabularNums } from '@/constants/theme';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { dayNumber, dueText } from '@/utils/bills';
import { formatMoney } from '@/utils/currency';
import { toDateKey } from '@/utils/dates';
import { iouDone, iouLeft, iouOverdue, iouPaid, iouTotals, type Iou } from '@/utils/ious';

const MASK = 'RM ••••'; // i18n-ignore

type Filter = 'all' | 'owe' | 'owed' | 'done';

type Props = {
  ious: Iou[];
  /** Tap the row: the full page for that person. */
  onOpen: (iou: Iou) => void;
  /** Tap Pay / Receive: the quick pop-up. */
  onPay: (iou: Iou) => void;
};

/** Money with people: net on top, tabs by who owes whom, then what needs attention and what is coming up. */
export function PeopleList({ ious, onOpen, onPay }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const today = toDateKey(new Date());
  const [filter, setFilter] = useState<Filter>('all');

  const open = ious.filter((i) => !iouDone(i));
  const done = ious.filter(iouDone);
  const sum = iouTotals(ious);
  const net = Math.round((sum.owed - sum.owe) * 100) / 100;
  const total = sum.owe + sum.owed;
  const owePart = total > 0 ? (sum.owe / total) * 100 : 0;
  const people = new Set(open.map((i) => i.person.trim().toLowerCase())).size;
  const ink = isLightColor(colors.accent) ? '#1A1A1A' : '#FFFFFF';

  const shown = filter === 'done' ? done : open.filter((i) => filter === 'all' || i.direction === filter);
  // Late first, then by due date; ones with no date come last.
  const byDue = (a: Iou, b: Iou) => (a.dueDate ?? '9999') < (b.dueDate ?? '9999') ? -1 : (a.dueDate ?? '9999') > (b.dueDate ?? '9999') ? 1 : a.person.localeCompare(b.person);
  const late = filter === 'done' ? [] : shown.filter((i) => iouOverdue(i, today)).sort(byDue);
  const rest = filter === 'done' ? [...shown].sort((a, b) => a.person.localeCompare(b.person)) : shown.filter((i) => !iouOverdue(i, today)).sort(byDue);

  return (
    <View>
      <View style={[styles.hero, { backgroundColor: colors.accent }]}>
        <View style={styles.heroTop}>
          <ThemedText type="small" style={{ color: ink, opacity: 0.8 }}>{t('debt.iou.net')}</ThemedText>
          <ThemedText type="small" style={{ color: ink, opacity: 0.8 }}>{t('debt.iou.people', { count: people })}</ThemedText>
        </View>
        <ThemedText style={[styles.heroAmount, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {hideAmounts ? MASK : `${net > 0 ? '+' : net < 0 ? '-' : ''}${formatMoney(Math.abs(net))}`}
        </ThemedText>
        <View style={styles.heroSplit}>
          <ThemedText type="small" style={{ color: ink }}>{t('debt.iou.tag.owe')} <ThemedText type="smallBold" style={{ color: ink }}>{money(sum.owe)}</ThemedText></ThemedText>
          <ThemedText type="small" style={{ color: ink }}>{t('debt.iou.tag.owed')} <ThemedText type="smallBold" style={{ color: ink }}>{money(sum.owed)}</ThemedText></ThemedText>
        </View>
        {total > 0 ? (
          <View style={styles.splitBar}>
            {sum.owe > 0 ? <View style={{ flex: owePart, backgroundColor: '#F4A79C', borderRadius: 3 }} /> : null}
            {sum.owed > 0 ? <View style={{ flex: 100 - owePart, backgroundColor: '#8FE0BC', borderRadius: 3, marginLeft: sum.owe > 0 ? 2 : 0 }} /> : null}
          </View>
        ) : null}
      </View>

      <TypeTabs
        items={[
          { key: 'all' as Filter, label: t('debt.iou.tab.all'), count: open.length },
          { key: 'owe' as Filter, label: t('debt.iou.tab.owe'), count: open.filter((i) => i.direction === 'owe').length },
          { key: 'owed' as Filter, label: t('debt.iou.tab.owed'), count: open.filter((i) => i.direction === 'owed').length },
          { key: 'done' as Filter, label: t('debt.iou.tab.done'), count: done.length },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {ious.length === 0 ? <ThemedText type="small" style={[styles.empty, { color: colors.textSecondary }]}>{t('debt.iou.empty')}</ThemedText> : null}

      {late.length > 0 ? (
        <>
          <ThemedText type="small" style={[styles.sectionTitle, { color: colors.negative }]}>{t('debt.iou.sec.attention').toUpperCase()}</ThemedText>
          <View style={[styles.list, { backgroundColor: colors.backgroundElement }]}>
            {late.map((i, n) => <PersonRow key={i.id} iou={i} first={n === 0} today={today} onOpen={onOpen} onPay={onPay} />)}
          </View>
        </>
      ) : null}
      {rest.length > 0 ? (
        <>
          {filter !== 'done' && late.length > 0 ? <ThemedText type="small" style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('debt.iou.sec.upcoming').toUpperCase()}</ThemedText> : null}
          <View style={[styles.list, { backgroundColor: colors.backgroundElement, marginTop: late.length > 0 ? 0 : Spacing.three }]}>
            {rest.map((i, n) => <PersonRow key={i.id} iou={i} first={n === 0} today={today} onOpen={onOpen} onPay={onPay} />)}
          </View>
        </>
      ) : null}
    </View>
  );
}

function PersonRow({ iou, first, today, onOpen, onPay }: { iou: Iou; first: boolean; today: string; onOpen: (i: Iou) => void; onPay: (i: Iou) => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { hideAmounts } = usePrivacy();
  const money = (n: number) => (hideAmounts ? MASK : formatMoney(n));
  const done = iouDone(iou);
  const incoming = iou.direction === 'owed';
  const overdue = iouOverdue(iou, today);
  const paid = iouPaid(iou);
  const tone = done ? colors.textSecondary : incoming ? colors.positive : colors.negative;
  const sub = iou.dueDate
    ? `${dueText(dayNumber(iou.dueDate) - dayNumber(today))}${iou.note ? ` · ${iou.note}` : ''}`
    : iou.note || t('debt.iou.noDue');
  return (
    <Pressable
      onPress={() => onOpen(iou)}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${iou.person}, ${money(iouLeft(iou))}`}
    >
      <PersonAvatar name={iou.person} size={42} tone={done ? 'done' : incoming ? 'owed' : 'owe'} />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <ThemedText style={styles.name} numberOfLines={1}>{iou.person}</ThemedText>
          {!done ? (
            <View style={[styles.tag, { backgroundColor: `${tone}22` }]}>
              <ThemedText type="small" style={{ color: tone, fontWeight: '800', fontSize: FontSize.micro }}>{t(incoming ? 'debt.iou.tag.owed' : 'debt.iou.tag.owe')}</ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" style={{ color: overdue ? colors.negative : colors.textSecondary, fontWeight: overdue ? '700' : '500' }} numberOfLines={1}>
          {done ? iou.note || t('debt.iou.settled') : sub}
        </ThemedText>
        {!done && paid > 0 ? <ProgressBar percent={(paid / iou.amount) * 100} color={colors.positive} /> : null}
      </View>
      <View style={styles.right}>
        <ThemedText style={[styles.amount, { color: tone }]} numberOfLines={1}>{done ? money(iou.amount) : money(iouLeft(iou))}</ThemedText>
        {!done ? (
          <Pressable
            onPress={() => onPay(iou)}
            hitSlop={6}
            style={[styles.pill, { backgroundColor: colors.accentSoft }]}
            accessibilityRole="button"
            accessibilityLabel={`${t(incoming ? 'debt.iou.pillReceive' : 'debt.iou.pillPay')} ${iou.person}`}
          >
            <ThemedText type="small" style={{ color: colors.accent, fontWeight: '800' }}>{t(incoming ? 'debt.iou.pillReceive' : 'debt.iou.pillPay')}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.xl, padding: Spacing.three, gap: 4, marginBottom: Spacing.three },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  heroAmount: { fontSize: 32, lineHeight: 40, fontWeight: '800', ...tabularNums },
  heroSplit: { flexDirection: 'row', gap: Spacing.three, marginTop: 2 },
  splitBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: Spacing.two },
  empty: { paddingVertical: Spacing.three },
  sectionTitle: { fontWeight: '800', letterSpacing: 0.4, marginTop: Spacing.three, marginBottom: Spacing.two },
  list: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: FontSize.label, fontWeight: '700', flexShrink: 1 },
  tag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: Radius.sm },
  right: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  amount: { fontSize: FontSize.label, fontWeight: '800', ...tabularNums },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.pill },
});
