import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProposalCard, type ProposalStatus } from '@/components/ai/proposal-card';
import { useIsDesktop } from '@/components/desktop/use-desktop';
import { TAB_BAR_HEIGHT } from '@/components/glass/glass-tab-bar';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useAiData } from '@/hooks/use-ai-data';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { AiError, askWakira, trimHistory, withoutFiles, type AiErrorCode, type Content } from '@/services/ai/client';
import type { Proposal } from '@/services/ai/engine';
import { Alert } from '@/services/dialog';
import { pickScanFile, ScanError, type ScanErrorCode, type ScanSource } from '@/services/receipt-scan';
import { loadJSON, saveJSON, userKey } from '@/services/storage';
import { toDateKey } from '@/utils/dates';
import type { ScrollViewRef } from '@/utils/rn-refs';

type CardState = { p: Proposal; status: ProposalStatus; savedId?: string };
type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  file?: 'image' | 'pdf';
  cards?: CardState[];
  checked?: boolean;
  /** Set on an error reply: the message to send again. */
  retry?: string;
};
type Stored = { v: 1; messages: ChatMsg[]; history: Content[] };

const KEEP_MESSAGES = 60;
const AI_ERR: Record<AiErrorCode, TKey> = {
  unavailable: 'ai.err.unavailable',
  limit: 'ai.err.limit',
  setup: 'ai.err.setup',
  busy: 'ai.err.busy',
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
const SUGGEST: TKey[] = ['ai.suggest.where', 'ai.suggest.forecast', 'ai.suggest.habits', 'ai.suggest.budget', 'ai.suggest.compare', 'ai.suggest.transfer', 'ai.suggest.record'];

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
  const { addTransaction, addTransfer, deleteTransaction, deleteTransfer } = useTransactions();

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

  const userId = user?.id ?? null;
  const storeKey = userId ? userKey(userId, 'ai:chat') : null;

  // Load the saved chat for this pengguna.
  useEffect(() => {
    let alive = true;
    if (!storeKey) return;
    void loadJSON<Stored>(storeKey).then((s) => {
      if (!alive) return;
      if (s?.v === 1) {
        setMessages(s.messages ?? []);
        setHistory(s.history ?? []);
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
    void saveJSON(storeKey, { v: 1, messages: messages.slice(-KEEP_MESSAGES), history: trimHistory(withoutFiles(history)) } satisfies Stored);
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

  const bubble = (m: ChatMsg) => {
    const mine = m.role === 'user';
    const pending = m.cards?.filter((c) => c.status === 'pending').length ?? 0;
    return (
      <View key={m.id} style={[styles.msg, mine ? styles.mine : styles.theirs]}>
        <View style={[styles.bubble, mine ? { backgroundColor: colors.accent } : { backgroundColor: colors.backgroundElement }]}>
          {m.file ? (
            <View style={styles.fileTag}>
              <Ionicons name={m.file === 'pdf' ? 'document-text-outline' : 'image-outline'} size={14} color={mine ? colors.onAccent : colors.textSecondary} />
              <ThemedText type="small" style={{ color: mine ? colors.onAccent : colors.textSecondary }}>{m.file === 'pdf' ? t('ai.filePdf') : t('ai.fileImage')}</ThemedText>
            </View>
          ) : null}
          {m.text ? <ThemedText selectable style={mine ? { color: colors.onAccent } : undefined}>{m.text}</ThemedText> : null}
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
        </View>
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
        <ScreenHeader title={t('ai.title')} right={messages.length ? <IconButton icon="trash-outline" label={t('ai.clear')} onPress={clear} /> : undefined} />

        {!cloud || !user ? (
          <View style={[styles.bubble, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small" style={muted}>{t('ai.needCloud')}</ThemedText>
          </View>
        ) : (
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              <View style={[styles.msg, styles.theirs]}>
                <View style={[styles.bubble, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText>{t('ai.hello')}</ThemedText>
                </View>
              </View>

              {messages.length === 0 && loaded ? (
                <View style={styles.suggest}>
                  <ThemedText type="smallBold" style={muted}>{t('ai.suggestTitle')}</ThemedText>
                  {[...explain, ...SUGGEST.map((k) => t(k))].map((s) => (
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
                    <ThemedText type="small" style={muted}>{t('ai.thinking')}</ThemedText>
                  </View>
                </View>
              ) : null}

              <ThemedText type="small" style={[muted, styles.footer]}>{t('ai.footer')}</ThemedText>
            </ScrollView>

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
                  maxLength={1000}
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
  suggest: { gap: Spacing.two },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: Radius.md },
  pressed: { opacity: 0.7 },
  footer: { textAlign: 'center', fontSize: 11 },
  composer: { borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: 8, gap: 8 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.md },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  round: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 120, minHeight: 40, fontSize: 16, paddingVertical: 9, paddingHorizontal: 4 },
});
