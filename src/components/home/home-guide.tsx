import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useState, type RefObject } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountModal } from '@/components/accounts/add-account-modal';
import { TAB_BAR_HEIGHT } from '@/components/glass/glass-tab-bar';
import { GoalFormModal } from '@/components/goals/goal-form-modal';
import { Button } from '@/components/ui/button';
import { WhatsNewPopup } from '@/components/home/whats-new-popup';
import type { IconName } from '@/constants/categories';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useAddRecord } from '@/context/AddRecordContext';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useUpdates } from '@/context/UpdatesContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { coachSeen, deviceSeen, markDeviceSeen, setCoachSeen, takePendingImport } from '@/services/intro';

type Rect = { x: number; y: number; w: number; h: number };
type Tip = { target: 'cards' | number; titleKey: TKey; bodyKey: TKey; action?: 'account' | 'goal'; actionKey?: TKey };

/** Tab slots in the floating tab bar: 0 Home, 1 Transactions, 2 +, 3 Analyse, 4 More. */
const TIPS: Tip[] = [
  { target: 2, titleKey: 'ob.coach.add.title', bodyKey: 'ob.coach.add.body' },
  { target: 'cards', titleKey: 'ob.coach.cards.title', bodyKey: 'ob.coach.cards.body', action: 'account', actionKey: 'ob.coach.cards.try' },
  { target: 3, titleKey: 'ob.coach.analyse.title', bodyKey: 'ob.coach.analyse.body' },
  { target: 4, titleKey: 'ob.coach.plan.title', bodyKey: 'ob.coach.plan.body', action: 'goal', actionKey: 'ob.coach.plan.try' },
  { target: 'cards', titleKey: 'ob.coach.eye.title', bodyKey: 'ob.coach.eye.body' },
];

type Phase = 'loading' | 'welcomeBack' | 'coach' | 'idle';

/**
 * Everything Home does to help someone start:
 * - "Welcome back" when an existing account opens on a new phone or after a reinstall;
 * - the walkthrough (spotlight on the real buttons), with two tips that open the real forms;
 * - the "Start here" card, whose items tick themselves from the data;
 * - the What's New popup after an update, when nothing else is on screen.
 */
export function HomeGuide({ cardsRef }: { cardsRef: RefObject<View | null> }) {
  const router = useRouter();
  const focused = useIsFocused();
  const { user } = useAuth();
  const { ready } = useTransactions();
  const updates = useUpdates();
  const uid = user?.id ?? null;

  const [phase, setPhase] = useState<Phase>('loading');
  const [tip, setTip] = useState(0);
  const [modal, setModal] = useState<'account' | 'goal' | null>(null);
  const [cards, setCards] = useState<Rect | null>(null);
  const [starterOn, setStarterOn] = usePersistedState<boolean>('starter_on', false, uid);

  // Runs when Home opens and every time it comes back into view ("Repeat tutorial" in Settings sends people here).
  useEffect(() => {
    if (!uid || !ready || !updates.isReady || !focused) return;
    if (phase === 'coach' || phase === 'welcomeBack') return;
    let alive = true;
    (async () => {
      const [dev, coach, wantImport] = await Promise.all([deviceSeen(uid), coachSeen(uid), takePendingImport()]);
      if (!alive) return;
      if (wantImport) router.push('/more/import');
      if (!dev) {
        if (updates.freshInstall) return setPhase('welcomeBack');
        // Updated from an older version on this same phone: nothing to restore, no automatic tour.
        markDeviceSeen(uid);
        setCoachSeen(uid, true);
        return setPhase('idle');
      }
      setPhase(coach ? 'idle' : 'coach');
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ready, updates.isReady, focused]);

  function startCoach() {
    setTip(0);
    setStarterOn(true);
    setPhase('coach');
  }
  function endCoach() {
    if (uid) setCoachSeen(uid, true);
    setStarterOn(true);
    setPhase('idle');
  }
  function measureCards() {
    cardsRef.current?.measureInWindow((x, y, w, h) => setCards({ x, y, w, h }));
  }

  useEffect(() => {
    if (phase === 'coach') measureCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tip]);

  return (
    <>
      {starterOn ? <StartHere onOpen={setModal} onDismiss={() => setStarterOn(false)} /> : null}

      {phase === 'welcomeBack' && focused ? (
        <WelcomeBack
          name={user?.displayName ?? ''}
          onDone={(tour) => {
            if (uid) markDeviceSeen(uid);
            if (tour) startCoach();
            else endCoach();
          }}
        />
      ) : null}

      {phase === 'coach' && focused && !modal ? (
        <Coach
          index={tip}
          cards={cards}
          onNext={() => (tip >= TIPS.length - 1 ? endCoach() : setTip(tip + 1))}
          onSkip={endCoach}
          onAction={(a) => setModal(a)}
        />
      ) : null}

      <WhatsNewPopup visible={phase === 'idle' && focused} onTry={updates.popup === 'major' ? startCoach : undefined} />

      <AddAccountModal
        visible={modal === 'account'}
        onClose={() => {
          setModal(null);
          if (phase === 'coach' && TIPS[tip].action === 'account') setTip(tip + 1);
        }}
      />
      <GoalFormModal
        visible={modal === 'goal'}
        onClose={() => {
          setModal(null);
          if (phase === 'coach' && TIPS[tip].action === 'goal') setTip(tip + 1);
        }}
      />
    </>
  );
}

/** The spotlight walkthrough. The dim layer is four rectangles around the target, so the real button shows through. */
function Coach({ index, cards, onNext, onSkip, onAction }: { index: number; cards: Rect | null; onNext: () => void; onSkip: () => void; onAction: (a: 'account' | 'goal') => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tip = TIPS[index];

  let r: Rect;
  if (tip.target === 'cards') r = cards ?? { x: 16, y: insets.top + 120, w: W - 32, h: 190 };
  else {
    const barTop = H - (Math.max(insets.bottom, 12) + 2) - TAB_BAR_HEIGHT;
    const slot = (W - 32) / 5;
    const cx = 16 + slot * (tip.target + 0.5);
    const size = tip.target === 2 ? 60 : 56;
    r = { x: cx - size / 2, y: barTop + (TAB_BAR_HEIGHT - size) / 2, w: size, h: size };
  }
  const pad = 6;
  const hole = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
  const below = hole.y + hole.h / 2 < H / 2;
  const dim = { backgroundColor: 'rgba(12,17,31,0.72)' };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onSkip} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <View style={[styles.abs, dim, { left: 0, top: 0, width: W, height: Math.max(0, hole.y) }]} />
        <View style={[styles.abs, dim, { left: 0, top: hole.y + hole.h, width: W, height: Math.max(0, H - hole.y - hole.h) }]} />
        <View style={[styles.abs, dim, { left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }]} />
        <View style={[styles.abs, dim, { left: hole.x + hole.w, top: hole.y, width: Math.max(0, W - hole.x - hole.w), height: hole.h }]} />
        <View pointerEvents="none" style={[styles.abs, styles.ring, { left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: tip.target === 'cards' ? 26 : hole.w / 2 }]} />

        <View style={[styles.abs, styles.card, { backgroundColor: colors.backgroundElement, left: 20, right: 20 }, below ? { top: hole.y + hole.h + 14 } : { bottom: H - hole.y + 14 }]}>
          <Text style={[Type.overline, { color: colors.accent }]}>{t('ob.coach.count', { n: index + 1, total: TIPS.length })}</Text>
          <Text style={[Type.heading, { color: colors.text }]}>{t(tip.titleKey)}</Text>
          <Text style={[Type.label, { color: colors.textSecondary, fontWeight: '500' }]}>{t(tip.bodyKey)}</Text>
          {tip.action && tip.actionKey ? (
            <Button label={t(tip.actionKey)} size="sm" variant="secondary" icon="add" fullWidth onPress={() => onAction(tip.action!)} style={{ marginTop: 6 }} />
          ) : null}
          <View style={styles.cardRow}>
            <Pressable onPress={onSkip} hitSlop={8} style={styles.skip} accessibilityRole="button">
              <Text style={[Type.label, { color: colors.textSecondary }]}>{t('ob.coach.skipAll')}</Text>
            </Pressable>
            <Button label={index === TIPS.length - 1 ? t('ob.coach.done') : t('ob.coach.next')} size="sm" fullWidth={false} onPress={onNext} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** First things to try. Each item opens the real feature and ticks itself once the data shows it was done. */
function StartHere({ onOpen, onDismiss }: { onOpen: (m: 'account' | 'goal') => void; onDismiss: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { openAddRecord } = useAddRecord();
  const { transactions, selectableAccounts, recurringRules } = useTransactions();
  const { goals } = usePlan();
  const { user } = useAuth();
  // Every category starts with a suggested limit, so "done" here means the budgets were opened and looked at.
  const [budgetSeen, setBudgetSeen] = usePersistedState<boolean>('starter_budget', false, user?.id ?? null);

  const items: { key: string; labelKey: TKey; icon: IconName; done: boolean; open: () => void }[] = [
    { key: 'tx', labelKey: 'ob.start.item.tx', icon: 'add-circle-outline', done: transactions.length > 0, open: openAddRecord },
    { key: 'acct', labelKey: 'ob.start.item.acct', icon: 'card-outline', done: selectableAccounts.length > 2, open: () => onOpen('account') },
    { key: 'goal', labelKey: 'ob.start.item.goal', icon: 'flag-outline', done: goals.length > 0, open: () => onOpen('goal') },
    { key: 'salary', labelKey: 'ob.start.item.salary', icon: 'repeat-outline', done: recurringRules.some((r) => r.type === 'credit'), open: () => router.push('/more/recurring') },
    { key: 'budget', labelKey: 'ob.start.item.budget', icon: 'pie-chart-outline', done: budgetSeen, open: () => { setBudgetSeen(true); router.push('/more/budgets'); } },
  ];
  const done = items.filter((i) => i.done).length;
  const all = done === items.length;

  return (
    <View style={[styles.start, { backgroundColor: all ? colors.accentSoft : colors.backgroundElement }]}>
      <View style={styles.startHead}>
        <Text style={[Type.heading, { color: all ? colors.accent : colors.text, flex: 1 }]}>{all ? t('ob.start.allDone') : t('ob.start.title')}</Text>
        {!all ? <Text style={[Type.label, { color: colors.accent }]}>{`${done} / ${items.length}`}</Text> : null}
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      {all ? (
        <Text style={[Type.label, { color: colors.accent, fontWeight: '500' }]}>{t('ob.start.allDoneBody')}</Text>
      ) : (
        <>
          <View style={[styles.progress, { backgroundColor: colors.accentSoft }]}>
            <View style={[styles.progressFill, { width: `${(done / items.length) * 100}%`, backgroundColor: colors.accent }]} />
          </View>
          {items.map((it) => (
            <Pressable key={it.key} onPress={it.open} disabled={it.done} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityState={{ checked: it.done }}>
              <View style={[styles.check, { backgroundColor: it.done ? colors.accent : 'transparent', borderColor: it.done ? colors.accent : colors.divider }]}>
                {it.done ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Ionicons name={it.icon} size={13} color={colors.textSecondary} />}
              </View>
              <Text style={[Type.label, { flex: 1, color: it.done ? colors.textSecondary : colors.text, textDecorationLine: it.done ? 'line-through' : 'none' }]}>{t(it.labelKey)}</Text>
              {!it.done ? <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /> : null}
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

/** An existing account opened on a new phone or after a reinstall: wait for the data, show what came back. */
function WelcomeBack({ name, onDone }: { name: string; onDone: (tour: boolean) => void }) {
  const colors = useTheme();
  const { t } = useT();
  const { cloud, syncNow } = useAuth();
  const { transactions, selectableAccounts, recurringRules } = useTransactions();
  const { goals } = usePlan();
  const [syncing, setSyncing] = useState(cloud);

  useEffect(() => {
    if (!cloud) return;
    let alive = true;
    void syncNow().finally(() => alive && setSyncing(false));
    return () => {
      alive = false;
    };
  }, [cloud, syncNow]);

  const rows: [TKey, number][] = [
    ['ob.back.tx', transactions.length],
    ['ob.back.accounts', selectableAccounts.length],
    ['ob.back.goals', goals.length],
    ['ob.back.recurring', recurringRules.length],
  ];

  return (
    <Modal visible animationType="fade" onRequestClose={() => onDone(false)} statusBarTranslucent>
      <View style={[styles.back, { backgroundColor: colors.background }]}>
        <View style={[styles.backAvatar, { backgroundColor: colors.accent }]}>
          <Text style={styles.backAvatarText}>{(name[0] ?? 'W').toUpperCase()}</Text>
        </View>
        <Text style={[styles.backTitle, { color: colors.text }]}>{t('ob.back.title', { name })}</Text>
        <Text style={[Type.body, { color: colors.textSecondary }]}>{syncing ? t('ob.back.restoring') : t('ob.back.restored')}</Text>
        <View style={[styles.backCard, { backgroundColor: colors.backgroundElement }]}>
          {rows.map(([k, n]) => (
            <View key={k} style={styles.backRow}>
              <View style={[styles.check, { backgroundColor: syncing ? 'transparent' : colors.positive, borderColor: syncing ? colors.divider : colors.positive }]}>
                {syncing ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[Type.label, { color: colors.text, flex: 1 }]}>{t(k)}</Text>
              <Text style={[Type.label, { color: colors.text }]}>{syncing ? '...' : String(n)}</Text>
            </View>
          ))}
        </View>
        {!syncing ? (
          <View style={[styles.note, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="phone-portrait-outline" size={18} color={colors.accent} />
            <Text style={[Type.label, { color: colors.accent, flex: 1, fontWeight: '500' }]}>{t('ob.back.newPhone')}</Text>
          </View>
        ) : null}
        <View style={styles.flex} />
        <Button label={t('ob.back.show')} onPress={() => onDone(true)} disabled={syncing} />
        <Pressable onPress={() => onDone(false)} disabled={syncing} style={styles.skipBig} accessibilityRole="button">
          <Text style={[Type.label, { color: colors.textSecondary }]}>{t('ob.back.skip')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  abs: { position: 'absolute' },
  ring: { borderWidth: 3, borderColor: '#FFFFFF' },
  card: { borderRadius: Radius.lg, padding: 18, gap: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 },
  skip: { paddingVertical: 10 },
  start: { borderRadius: Radius.lg, padding: Spacing.three, gap: 8, marginBottom: Spacing.three },
  startHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progress: { height: 6, borderRadius: Radius.xs, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: Radius.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  back: { flex: 1, padding: Spacing.four, paddingTop: 90, gap: 14 },
  backAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  backAvatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  backTitle: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  backCard: { borderRadius: Radius.lg, padding: Spacing.three, gap: 12 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: Radius.md, alignItems: 'flex-start' },
  skipBig: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
