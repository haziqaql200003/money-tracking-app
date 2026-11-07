import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionCard } from '@/components/ai/action-card';
import { AiVisual } from '@/components/ai/ai-visual';
import { ProposalCard, type ProposalStatus } from '@/components/ai/proposal-card';
import { ShortcutForm, type ShortcutFormMode } from '@/components/ai/shortcut-form';
import { ShortcutsSheet } from '@/components/ai/shortcuts-sheet';
import { useIsDesktop } from '@/components/desktop/use-desktop';
import { TAB_BAR_HEIGHT } from '@/components/glass/glass-tab-bar';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/context/CategoriesContext';
import { useDebts } from '@/context/DebtsContext';
import { usePlan } from '@/context/PlanContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useAiData } from '@/hooks/use-ai-data';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { accountName, categoryName } from '@/i18n/data';
import { AiError, askWakira, trimHistory, withoutFiles, type AiErrorCode, type Content } from '@/services/ai/client';
import { EMPTY_MEMORY, think, type ActionProposal, type Memory, type Visual } from '@/services/ai/brain';
import { validAction } from '@/services/ai/brain/actions';
import { validateVisuals } from '@/services/ai/brain/types';
import type { Proposal } from '@/services/ai/engine';
import { MAX_SHORTCUTS, missingSlots, runText, shortcutId, TEMPLATES, validShortcuts, type FillContext, type Shortcut, type Template } from '@/services/ai/shortcuts';
import { Alert } from '@/services/dialog';
import { pickScanFile, ScanError, type ScanErrorCode, type ScanSource } from '@/services/receipt-scan';
import { loadJSON, saveJSON, userKey } from '@/services/storage';
import { toDateKey } from '@/utils/dates';
import type { ScrollViewRef } from '@/utils/rn-refs';

type CardState = { p: Proposal; status: ProposalStatus; savedId?: string };
type ActionState = { a: ActionProposal; status: ProposalStatus; savedId?: string };
type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  file?: 'image' | 'pdf';
  cards?: CardState[];
  /** Set-ups for Hutang, budgets, goals and recurring bills. */
  actions?: ActionState[];
  /** Charts the brain asked for (data only; drawn by AiVisual). */
  visuals?: Visual[];
  /** Follow-up questions shown as buttons under the latest answer. */
  chips?: string[];
  checked?: boolean;
  /** Set on an error reply: the message to send again. */
  retry?: string;
};
type Stored = { v: 1; messages: ChatMsg[]; history: Content[]; memory?: Memory };

const KEEP_MESSAGES = 60;
const AI_ERR: Record<AiErrorCode, TKey> = {
  unavailable: 'ai.err.unavailable',
  limit: 'ai.err.limit',
  setup: 'ai.err.setup',
  busy: 'ai.err.busy',
  server: 'ai.err.server',
  cannotRead: 'ai.err.cannotRead',
  tooLarge: 'ai.err.tooLarge',
  network: 'ai.err.network',
  empty: 'ai.err.empty',
};
const SCAN_ERR: Record<ScanErrorCode, TKey> = {
  unavailable: 'scan.errUnavailable',
  permission: 'scan.errPermission',
  tooLarge: 'scan.errTooLarge',
  limit: 'scan.errLimit',
  unreadable: 'scan.errUnreadable',
  openFail: 'scan.errOpen',
  setup: 'scan.errSetup',
  busy: 'scan.errBusy',
  network: 'scan.errNetwork',
};
/** Questions offered on an empty chat. Each one is a tested template (scripts/brain-eval runs them all). */
const SUGGEST_IDS = ['where', 'compare', 'bills', 'saveMore', 'balance'];
/** Templates shown as big tiles on an empty chat. */
const QUICK_IDS = ['expense', 'receipt', 'income', 'transfer'];
type Glyph = keyof typeof Ionicons.glyphMap;

let msgCounter = 0;
const msgId = () => `m${Date.now().toString(36)}${(msgCounter++).toString(36)}`;

/** The AI often writes light markdown; the bubbles show plain text. */
const plain = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim();

/** "Ask WaKira": a chat that reads, explains and records the pengguna's money. Opened from Analyse > Insight. */
export default function AiScreen() {
  const colors = useTheme();
  const { t, lang } = useT();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { user, cloud } = useAuth();
  const insets = useSafeAreaInsets();
  const desktop = useIsDesktop();
  const todayKey = toDateKey(new Date());
  const data = useAiData(todayKey);
  const { addTransaction, updateTransaction, addTransfer, deleteTransaction, deleteTransfer, addRecurring, deleteRecurring, selectableAccounts } = useTransactions();
  const { createInstalment, addIou } = useDebts();
  const { updateCategory, getCategory } = useCategories();
  const { addGoal, deleteGoal } = usePlan();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [history, setHistory] = useState<Content[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<{ data: string; mediaType: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  /** What the pengguna did with the cards since the last message, told to the AI with the next one. */
  const [appNotes, setAppNotes] = useState<string[]>([]);
  const scrollRef = useRef<ScrollViewRef>(null);
  const askedQ = useRef(false);
  /** The brain's short-term memory: a question waiting for an answer, and what the last answer was about. */
  const memoryRef = useRef<Memory>(EMPTY_MEMORY);
  /** The pengguna's own shortcuts, kept on this phone. */
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [shortcutsLoaded, setShortcutsLoaded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<ShortcutFormMode | null>(null);
  /** A short line above the message box ("Saved to your shortcuts."), gone after a moment. */
  const [notice, setNotice] = useState<string | null>(null);

  const userId = user?.id ?? null;
  // Signed in: the chat is kept per pengguna. Phone-only: one local chat. Either way it never leaves this phone.
  const storeKey = userId ? userKey(userId, 'ai:chat') : 'ai:chat:local';
  const online = cloud && !!user;
  const shortcutKey = userId ? userKey(userId, 'ai:shortcuts') : 'ai:shortcuts:local';
  const fillCtx: FillContext = {
    lang,
    todayKey,
    accountName: (id) => {
      const a = selectableAccounts.find((x) => x.id === id);
      return a ? accountName(a) : undefined;
    },
    categoryName: (id) => {
      const c = getCategory(id);
      return c ? categoryName(c) : undefined;
    },
  };

  useEffect(() => {
    let alive = true;
    void loadJSON<unknown>(shortcutKey).then((v) => {
      if (!alive) return;
      setShortcuts(validShortcuts(v));
      setShortcutsLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [shortcutKey]);

  useEffect(() => {
    if (shortcutsLoaded) void saveJSON(shortcutKey, shortcuts);
  }, [shortcutsLoaded, shortcutKey, shortcuts]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  // Load the saved chat for this pengguna.
  useEffect(() => {
    let alive = true;
    if (!storeKey) return;
    void loadJSON<Stored>(storeKey).then((s) => {
      if (!alive) return;
      if (s?.v === 1) {
        setMessages(s.messages ?? []);
        setHistory(s.history ?? []);
        memoryRef.current = s.memory ?? EMPTY_MEMORY;
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [storeKey]);

  // Keep it on this phone only (files are never kept).
  useEffect(() => {
    if (!loaded || !storeKey) return;
    void saveJSON(storeKey, { v: 1, messages: messages.slice(-KEEP_MESSAGES), history: trimHistory(withoutFiles(history)), memory: memoryRef.current } satisfies Stored);
  }, [loaded, storeKey, messages, history]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  async function ensureConsent(): Promise<boolean> {
    if (!userId) return false;
    const key = userKey(userId, 'ai:consent');
    if (await loadJSON<boolean>(key)) return true;
    return new Promise<boolean>((resolve) => {
      Alert.alert(t('ai.consentTitle'), t('ai.consentBody'), [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        {
          text: t('ai.consentOk'),
          onPress: () => {
            void saveJSON(key, true);
            resolve(true);
          },
        },
      ]);
    });
  }

  async function send(override?: string) {
    if (busy) return;
    const text = (override ?? input).trim();
    if (!text && !file) return;

    // 1. WaKira's own brain answers on the phone: no server, no quota, works offline.
    if (!file) {
      const local = think({ text, data, t, memory: memoryRef.current });
      // Dev only: shows in the Metro terminal what the brain decided, so slow server answers can be traced.
      if (__DEV__) console.log('[brain]', JSON.stringify(text), local.handled ? 'answered on phone' : `-> server (${local.reason})`, local.intent, local.p.toFixed(2));
      memoryRef.current = local.memory;
      if (local.handled) {
        setMessages((m) => [
          ...m,
          { id: msgId(), role: 'user', text },
          {
            id: msgId(),
            role: 'assistant',
            text: local.text,
            cards: local.proposals.length ? local.proposals.map((p) => ({ p, status: 'pending' as const })) : undefined,
            visuals: local.visuals.length ? local.visuals : undefined,
            actions: local.actions.length ? local.actions.map((a) => ({ a, status: 'pending' as const })) : undefined,
            chips: local.chips.length ? local.chips : undefined,
            checked: local.checked,
          },
        ]);
        setHistory((h) => [...h, { role: 'user', parts: [{ text }] }, { role: 'model', parts: [{ text: local.text }] }]);
        setInput('');
        return;
      }
      // 2. Not something the brain knows (or not sure): ask the AI server, when signed in.
      if (!online) {
        setMessages((m) => [...m, { id: msgId(), role: 'user', text }, { id: msgId(), role: 'assistant', text: t('ai.b.unknownTip') }]);
        setInput('');
        return;
      }
    } else if (!online) {
      Alert.alert(t('ai.err.title'), t('ai.needCloud'));
      return;
    }
    if (!(await ensureConsent())) return;

    const sentFile = file;
    const shown: ChatMsg = { id: msgId(), role: 'user', text, file: sentFile ? (sentFile.mediaType === 'application/pdf' ? 'pdf' : 'image') : undefined };
    setMessages((m) => [...m, shown]);
    setInput('');
    setFile(null);
    setBusy(true);
    const notes = appNotes;
    setAppNotes([]);
    try {
      const res = await askWakira({
        history,
        text: notes.length ? `[App note: ${notes.join('; ')}]\n${text}` : text,
        file: sentFile,
        data,
        lang,
      });
      setHistory((h) => [...h, ...res.added]);
      setMessages((m) => [
        ...m,
        {
          id: msgId(),
          role: 'assistant',
          text: plain(res.text) || (res.proposals.length ? t('ai.checkCards') : t('ai.emptyReply')),
          cards: res.proposals.length ? res.proposals.map((p) => ({ p, status: 'pending' as const })) : undefined,
          checked: res.toolsUsed.some((n) => !n.startsWith('propose_')),
        },
      ]);
    } catch (e) {
      const code: AiErrorCode = e instanceof AiError ? e.code : 'network';
      const detail = e instanceof AiError && e.detail ? `\n${t('scan.errCode', { code: e.detail })}` : '';
      setAppNotes(notes); // not delivered, keep for the next try
      setMessages((m) => [...m, { id: msgId(), role: 'assistant', text: t(AI_ERR[code]) + detail, retry: sentFile ? undefined : text }]);
    } finally {
      setBusy(false);
    }
  }

  // Opened with a question (from the Insight tab): ask it once the chat is loaded.
  useEffect(() => {
    if (!loaded || !q || askedQ.current) return;
    askedQ.current = true;
    void send(String(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, q]);

  function attach() {
    if (!online) {
      Alert.alert(t('ai.err.title'), t('ai.needCloud'));
      return;
    }
    const pickFrom = async (source: ScanSource) => {
      try {
        const picked = await pickScanFile(source);
        if (picked?.data) setFile(picked);
      } catch (e) {
        const code: ScanErrorCode = e instanceof ScanError ? e.code : 'openFail';
        Alert.alert(t('ai.err.title'), t(SCAN_ERR[code]));
      }
    };
    Alert.alert(t('ai.attachTitle'), t('ai.attachMsg'), [
      { text: t('scan.camera'), onPress: () => void pickFrom('camera') },
      { text: t('scan.gallery'), onPress: () => void pickFrom('gallery') },
      { text: t('scan.pdf'), onPress: () => void pickFrom('pdf') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function setCard(msg: string, index: number, patch: Partial<CardState>) {
    setMessages((m) => m.map((x) => (x.id === msg && x.cards ? { ...x, cards: x.cards.map((c, i) => (i === index ? { ...c, ...patch } : c)) } : x)));
  }

  const describe = (p: Proposal) => (p.kind === 'transaction' ? `"${p.tx.title}" RM${p.tx.amount}` : `transfer RM${p.tr.amount}`);

  function save(msg: string, index: number, p: Proposal) {
    const ids = new Set(data.accounts.map((a) => a.id));
    const ok = p.kind === 'transaction' ? ids.has(p.tx.accountId) : ids.has(p.tr.fromAccountId) && ids.has(p.tr.toAccountId);
    if (!ok) {
      Alert.alert(t('ai.err.title'), t('ai.card.gone'));
      return;
    }
    const savedId = p.kind === 'transaction' ? addTransaction(p.tx) : addTransfer(p.tr);
    setCard(msg, index, { p, status: 'saved', savedId });
    setAppNotes((n) => [...n, `pengguna saved ${describe(p)}`]);
  }

  function skip(msg: string, index: number, p: Proposal) {
    setCard(msg, index, { status: 'skipped' });
    setAppNotes((n) => [...n, `pengguna skipped ${describe(p)}`]);
  }

  function undo(msg: string, index: number, c: CardState) {
    if (c.status === 'saved' && c.savedId) {
      if (c.p.kind === 'transaction') deleteTransaction(c.savedId);
      else deleteTransfer(c.savedId);
      setAppNotes((n) => [...n, `pengguna undid saving ${describe(c.p)}`]);
    }
    setCard(msg, index, { status: 'pending', savedId: undefined });
  }

  function saveAll(m: ChatMsg) {
    m.cards?.forEach((c, i) => {
      if (c.status === 'pending') save(m.id, i, c.p);
    });
  }

  function setAction(msg: string, index: number, patch: Partial<ActionState>) {
    setMessages((m) => m.map((x) => (x.id === msg && x.actions ? { ...x, actions: x.actions.map((c, i) => (i === index ? { ...c, ...patch } : c)) } : x)));
  }

  /** Saves a set-up into its module. Each one is checked again first (an account may have been deleted since). */
  function saveAction(msg: string, index: number, a: ActionProposal) {
    const accountOk = (id: string) => data.accounts.some((x) => x.id === id);
    if (!validAction(a) || (a.kind === 'instalment' && !accountOk(a.input.payFromAccountId)) || (a.kind === 'recurring' && !accountOk(a.rule.accountId)) || (a.kind === 'breakdown' && !data.transactions.some((x) => x.id === a.txId))) {
      Alert.alert(t('ai.err.title'), t('ai.card.gone'));
      return;
    }
    let savedId: string | undefined;
    switch (a.kind) {
      case 'instalment':
        createInstalment(a.input);
        break;
      case 'iou':
        addIou(a.input);
        break;
      case 'budget':
        updateCategory(a.categoryId, { monthlyLimit: a.limit });
        break;
      case 'goal':
        savedId = addGoal(a.input);
        break;
      case 'recurring':
        savedId = addRecurring(a.rule);
        break;
      case 'breakdown':
        updateTransaction(a.txId, { items: a.items, amount: a.amount });
        break;
    }
    setAction(msg, index, { status: 'saved', savedId });
    setAppNotes((n) => [...n, `pengguna saved: ${a.title}`]);
  }

  const canUndoAction = (c: ActionState) => c.a.kind === 'budget' || c.a.kind === 'breakdown' || ((c.a.kind === 'goal' || c.a.kind === 'recurring') && !!c.savedId);

  function undoAction(msg: string, index: number, c: ActionState) {
    if (c.a.kind === 'budget') updateCategory(c.a.categoryId, { monthlyLimit: c.a.previous });
    else if (c.a.kind === 'breakdown') updateTransaction(c.a.txId, { items: c.a.previousItems, amount: c.a.previousAmount });
    else if (c.a.kind === 'goal' && c.savedId) deleteGoal(c.savedId);
    else if (c.a.kind === 'recurring' && c.savedId) deleteRecurring(c.savedId);
    setAction(msg, index, { status: 'pending', savedId: undefined });
  }

  /** Runs a saved shortcut: straight away when nothing is missing, otherwise the form asks for the rest. */
  function runShortcut(sc: Shortcut) {
    setSheetOpen(false);
    const text = missingSlots(sc.text, sc.values, sc.literal).length === 0 ? runText(sc, fillCtx) : null;
    if (text) void send(text);
    else setForm({ kind: 'run', shortcut: sc });
  }

  function openTemplate(tpl: Template) {
    setSheetOpen(false);
    setForm({ kind: 'template', template: tpl });
  }

  function saveShortcut(sc: Shortcut) {
    setShortcuts((list) => (list.some((x) => x.id === sc.id) ? list.map((x) => (x.id === sc.id ? sc : x)) : [...list, sc].slice(-MAX_SHORTCUTS)));
    setForm(null);
    setNotice(t('ai.sc.savedToast'));
  }

  /** Long-press on something the pengguna sent: put it back to edit, or keep it as a one-tap shortcut. */
  function messageMenu(m: ChatMsg) {
    if (m.role !== 'user' || !m.text) return;
    Alert.alert(t('ai.msg.menuTitle'), m.text.length > 120 ? `${m.text.slice(0, 117)}…` : m.text, [
      { text: t('ai.msg.edit'), onPress: () => setInput(m.text) },
      {
        text: t('ai.msg.saveShortcut'),
        onPress: () => {
          if (shortcuts.length >= MAX_SHORTCUTS) {
            Alert.alert(t('ai.sc.title'), t('ai.sc.full', { n: MAX_SHORTCUTS }));
            return;
          }
          const first = m.text.split('\n')[0].trim();
          saveShortcut({ id: shortcutId(), name: first.length > 28 ? `${first.slice(0, 27)}…` : first, icon: 'chatbubble-ellipses-outline', text: m.text, values: {}, literal: true, created: Date.now() });
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function clear() {
    Alert.alert(t('ai.clearTitle'), t('ai.clearMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('ai.clearOk'),
        style: 'destructive',
        onPress: () => {
          setMessages([]);
          setHistory([]);
          setAppNotes([]);
          memoryRef.current = EMPTY_MEMORY;
        },
      },
    ]);
  }

  const muted = { color: colors.textSecondary };
  const bottomGap = keyboard || desktop ? Spacing.two : TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + 10;
  const explain = data.feed
    .filter((f) => f.tone === 'warn' || f.tone === 'bad')
    .slice(0, 2)
    .map((f) => t('ai.suggest.explain', { title: f.title }));

  const lastAssistantId = [...messages].reverse().find((x) => x.role === 'assistant')?.id;

  const bubble = (m: ChatMsg) => {
    const mine = m.role === 'user';
    const pending = m.cards?.filter((c) => c.status === 'pending').length ?? 0;
    // Charts are data; anything malformed (for example from an old saved chat) is dropped, the text still shows.
    const visuals = validateVisuals(m.visuals);
    return (
      <View key={m.id} style={[styles.msg, mine ? styles.mine : styles.theirs]}>
        <Pressable
          onLongPress={mine ? () => messageMenu(m) : undefined}
          delayLongPress={350}
          disabled={!mine}
          accessibilityHint={mine ? t('ai.msg.menuTitle') : undefined}
          style={[styles.bubble, mine ? { backgroundColor: colors.accent } : { backgroundColor: colors.backgroundElement }]}
        >
          {m.file ? (
            <View style={styles.fileTag}>
              <Ionicons name={m.file === 'pdf' ? 'document-text-outline' : 'image-outline'} size={14} color={mine ? colors.onAccent : colors.textSecondary} />
              <ThemedText type="small" style={{ color: mine ? colors.onAccent : colors.textSecondary }}>{m.file === 'pdf' ? t('ai.filePdf') : t('ai.fileImage')}</ThemedText>
            </View>
          ) : null}
          {m.text ? <ThemedText selectable={!mine} style={mine ? { color: colors.onAccent } : undefined}>{m.text}</ThemedText> : null}
          {m.checked ? (
            <View style={styles.fileTag}>
              <Ionicons name="phone-portrait-outline" size={12} color={colors.textSecondary} />
              <ThemedText type="small" style={[muted, styles.tiny]}>{t('ai.checked')}</ThemedText>
            </View>
          ) : null}
          {m.retry ? (
            <Pressable onPress={() => void send(m.retry)} accessibilityRole="button" style={[styles.retry, { backgroundColor: colors.accentSoft }]}>
              <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('ai.err.retry')}</ThemedText>
            </Pressable>
          ) : null}
        </Pressable>
        {visuals.length ? (
          <View style={styles.cards}>
            {visuals.map((v, i) => (
              <AiVisual key={`${m.id}-v${i}`} visual={v} />
            ))}
          </View>
        ) : null}
        {m.chips?.length && m.id === lastAssistantId && !busy ? (
          <View style={styles.chips}>
            {m.chips.map((c) => (
              <Pressable key={c} onPress={() => void send(c)} accessibilityRole="button" style={({ pressed }) => [styles.chip, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]}>
                <ThemedText type="small" style={{ color: colors.accent }}>{c}</ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
        {m.actions?.length ? (
          <View style={styles.cards}>
            {m.actions.map((c, i) => (
              <ActionCard
                key={c.a.ref}
                action={c.a}
                status={c.status}
                canUndo={canUndoAction(c)}
                onSave={() => saveAction(m.id, i, c.a)}
                onSkip={() => setAction(m.id, i, { status: 'skipped' })}
                onUndo={() => undoAction(m.id, i, c)}
              />
            ))}
          </View>
        ) : null}
        {m.cards?.length ? (
          <View style={styles.cards}>
            {m.cards.map((c, i) => (
              <ProposalCard
                key={c.p.ref}
                proposal={c.p}
                status={c.status}
                onSave={(p) => save(m.id, i, p)}
                onSkip={() => skip(m.id, i, c.p)}
                onUndo={() => undo(m.id, i, c)}
              />
            ))}
            {pending >= 2 ? (
              <Pressable onPress={() => saveAll(m)} accessibilityRole="button" style={[styles.saveAll, { backgroundColor: colors.accent }]}>
                <Ionicons name="checkmark-done" size={16} color={colors.onAccent} />
                <ThemedText type="smallBold" style={{ color: colors.onAccent }}>{t('ai.card.saveAll', { n: pending })}</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScreenHeader
          title={t('ai.title')}
          right={
            <View style={styles.headerActions}>
              <IconButton icon="flash-outline" label={t('ai.sc.open')} onPress={() => setSheetOpen(true)} />
              {messages.length ? <IconButton icon="trash-outline" label={t('ai.clear')} onPress={clear} /> : null}
            </View>
          }
        />

        {(
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              // An empty chat stays at the top (greeting and quick start); a conversation follows the newest message.
              onContentSizeChange={() => messages.length > 0 && scrollRef.current?.scrollToEnd({ animated: true })}
            >
              <View style={[styles.msg, styles.theirs]}>
                <View style={[styles.bubble, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText>{t('ai.hello')}</ThemedText>
                </View>
              </View>

              {messages.length === 0 && loaded ? (
                <View style={styles.suggest}>
                  <ThemedText type="smallBold" style={muted}>{t('ai.sc.quickStart')}</ThemedText>
                  <View style={styles.quickGrid}>
                    {TEMPLATES.filter((x) => QUICK_IDS.includes(x.id)).map((tpl) => (
                      <Pressable
                        key={tpl.id}
                        onPress={() => openTemplate(tpl)}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.quickTile, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }, pressed && styles.pressed]}
                      >
                        <View style={[styles.quickIcon, { backgroundColor: colors.accentSoft }]}>
                          <Ionicons name={tpl.icon as Glyph} size={18} color={colors.accent} />
                        </View>
                        <ThemedText type="smallBold" numberOfLines={2} style={styles.flex}>{t(tpl.labelKey)}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable onPress={() => setSheetOpen(true)} accessibilityRole="button" style={({ pressed }) => [styles.allShortcuts, pressed && styles.pressed]}>
                    <Ionicons name="flash-outline" size={14} color={colors.accent} />
                    <ThemedText type="smallBold" style={{ color: colors.accent }}>{t('ai.sc.all')}</ThemedText>
                  </Pressable>

                  <ThemedText type="smallBold" style={[muted, styles.sectionGap]}>{t('ai.suggestTitle')}</ThemedText>
                  {[...explain, ...TEMPLATES.filter((x) => SUGGEST_IDS.includes(x.id)).map((x) => t(x.msgKey))].map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => void send(s)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.suggestion, { backgroundColor: colors.accentSoft }, pressed && styles.pressed]}
                    >
                      <ThemedText type="small" style={[styles.flex, { color: colors.accent }]}>{s}</ThemedText>
                      <Ionicons name="arrow-up" size={14} color={colors.accent} />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {messages.map(bubble)}

              {busy ? (
                <View style={[styles.msg, styles.theirs]}>
                  <View style={[styles.bubble, styles.thinking, { backgroundColor: colors.backgroundElement }]}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <ThemedText type="small" style={muted}>{t('ai.thinkingServer')}</ThemedText>
                  </View>
                </View>
              ) : null}

              <ThemedText type="small" style={[muted, styles.footer]}>{t('ai.footer')}</ThemedText>
            </ScrollView>

            {notice ? (
              <View style={[styles.notice, { backgroundColor: colors.accentSoft }]} accessibilityLiveRegion="polite">
                <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                <ThemedText type="small" style={{ color: colors.accent }}>{notice}</ThemedText>
              </View>
            ) : null}
            {!keyboard && messages.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.barScroll} contentContainerStyle={styles.bar}>
                <Pressable
                  onPress={() => setSheetOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('ai.sc.open')}
                  style={({ pressed }) => [styles.barChip, { backgroundColor: colors.accent }, pressed && styles.pressed]}
                >
                  <Ionicons name="flash" size={14} color={colors.onAccent} />
                  <ThemedText type="smallBold" style={{ color: colors.onAccent }}>{t('ai.sc.title')}</ThemedText>
                </Pressable>
                {shortcuts.map((sc) => (
                  <Pressable
                    key={sc.id}
                    onPress={() => runShortcut(sc)}
                    disabled={busy}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.barChip, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }, styles.barChipLine, pressed && styles.pressed]}
                  >
                    <Ionicons name={sc.icon as Glyph} size={14} color={colors.accent} />
                    <ThemedText type="small" numberOfLines={1} style={styles.barText}>{sc.name}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={[styles.composer, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
              {file ? (
                <View style={[styles.fileChip, { backgroundColor: colors.backgroundSelected }]}>
                  <Ionicons name={file.mediaType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={16} color={colors.accent} />
                  <ThemedText type="small" style={styles.flex}>{file.mediaType === 'application/pdf' ? t('ai.filePdf') : t('ai.fileImage')}</ThemedText>
                  <Pressable onPress={() => setFile(null)} accessibilityRole="button" accessibilityLabel={t('ai.removeFile')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.inputRow}>
                <Pressable onPress={attach} disabled={busy} accessibilityRole="button" accessibilityLabel={t('ai.attach')} style={[styles.round, { backgroundColor: colors.backgroundSelected }]}>
                  <Ionicons name="add" size={22} color={colors.text} />
                </Pressable>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder={t('ai.placeholder')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={4000}
                  style={[styles.input, { color: colors.text }]}
                />
                <Pressable
                  onPress={() => void send()}
                  disabled={busy || (!input.trim() && !file)}
                  accessibilityRole="button"
                  accessibilityLabel={t('ai.send')}
                  style={[styles.round, { backgroundColor: colors.accent, opacity: busy || (!input.trim() && !file) ? 0.4 : 1 }]}
                >
                  <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
                </Pressable>
              </View>
            </View>
            <View style={{ height: bottomGap }} />
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      <ShortcutsSheet
        visible={sheetOpen}
        shortcuts={shortcuts}
        ctx={fillCtx}
        onClose={() => setSheetOpen(false)}
        onRun={runShortcut}
        onEdit={(sc) => {
          setSheetOpen(false);
          setForm({ kind: 'edit', shortcut: sc });
        }}
        onDelete={(sc) => setShortcuts((list) => list.filter((x) => x.id !== sc.id))}
        onTemplate={openTemplate}
      />
      <ShortcutForm
        mode={form}
        ctx={fillCtx}
        shortcutCount={shortcuts.length}
        onClose={() => setForm(null)}
        onSend={(text) => {
          setForm(null);
          void send(text);
        }}
        onSaveShortcut={saveShortcut}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  flex: { flex: 1 },
  list: { gap: Spacing.three, paddingBottom: Spacing.three },
  msg: { maxWidth: '88%', gap: Spacing.two },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  bubble: { borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tiny: { fontSize: 11 },
  retry: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  cards: { gap: Spacing.two, alignSelf: 'stretch', minWidth: 280 },
  saveAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill },
  suggest: { gap: Spacing.two },
  sectionGap: { marginTop: Spacing.two },
  headerActions: { flexDirection: 'row', gap: Spacing.two },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quickTile: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  quickIcon: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  allShortcuts: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, marginBottom: Spacing.two },
  barScroll: { flexGrow: 0, marginBottom: Spacing.two },
  bar: { gap: 6, paddingRight: Spacing.two },
  barChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill },
  barChipLine: { borderWidth: StyleSheet.hairlineWidth },
  barText: { maxWidth: 160 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: Radius.md },
  pressed: { opacity: 0.7 },
  footer: { textAlign: 'center', fontSize: 11 },
  composer: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: 8, gap: 8 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.md },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  round: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 120, minHeight: 40, fontSize: 16, paddingVertical: 9, paddingHorizontal: 4 },
});
