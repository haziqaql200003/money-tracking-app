import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { ToolSheet } from '@/components/tools/tool-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { FormField, TextField } from '@/components/ui/form-field';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { Alert } from '@/services/dialog';
import { formatErrorLog, getErrorLog } from '@/services/error-log';
import { FEEDBACK_EMAIL, isUnseen, markSeen, refreshFeedback, removeLocalTicket, STATUS_FLOW, submitFeedback, useFeedback, type FeedbackKind, type FeedbackStatus, type Ticket } from '@/services/feedback';
import { CLOUD_ENABLED } from '@/services/supabase';

const ref = (id: string) => `WK-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`; // i18n-ignore: reference code
const clock = (iso: string) => {
  const d = new Date(iso);
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const statusKey = (s: FeedbackStatus) => `fb.s.${s}` as TKey;
const descKey = (s: FeedbackStatus) => `fb.sd.${s}` as TKey;

export default function FeedbackScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { user } = useAuth();
  const { tickets, busy, online } = useFeedback(user?.id ?? null);
  const [composer, setComposer] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const muted = { color: colors.textSecondary };

  useFocusEffect(
    useCallback(() => {
      void refreshFeedback();
    }, []),
  );

  const open = tickets.find((x) => x.id === openId) ?? null;
  const statusColor = (s: FeedbackStatus) => (s === 'done' ? colors.positive : s === 'declined' ? colors.textSecondary : colors.accent);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void refreshFeedback()} />}>
          <ScreenHeader title={t('fb.title')} />
          <ThemedText type="small" style={muted}>{t('fb.intro')}</ThemedText>
          <Button label={t('fb.new')} icon="create-outline" onPress={() => setComposer(true)} style={styles.mt} />
          {!online && CLOUD_ENABLED ? <ThemedText type="small" style={[muted, styles.mt]}>{t('fb.refresh.fail')}</ThemedText> : null}

          <ThemedText style={[Type.heading, styles.h]}>{t('fb.list.title')}</ThemedText>
          {tickets.length === 0 ? <ThemedText type="small" style={muted}>{t('fb.list.empty')}</ThemedText> : null}
          <View style={styles.list}>
            {tickets.map((x) => (
              <Card key={x.id} onPress={() => { setOpenId(x.id); void markSeen(x.id); }} style={styles.gap}>
                <View style={styles.head}>
                  <Ionicons name={x.kind === 'bug' ? 'bug-outline' : 'bulb-outline'} size={18} color={colors.accent} />
                  <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>{x.title}</ThemedText>
                </View>
                <View style={styles.head}>
                  <View style={[styles.pill, { backgroundColor: statusColor(x.status) + '22' }]}>
                    <ThemedText type="small" style={{ color: statusColor(x.status), fontWeight: '700' }}>{x.pending ? t('fb.s.pending') : t(statusKey(x.status))}</ThemedText>
                  </View>
                  <ThemedText type="small" style={[muted, styles.flex]}>{ref(x.id)} · {formatDate(new Date(x.updatedAt))}</ThemedText>
                  {isUnseen(x) ? <View style={[styles.badge, { backgroundColor: colors.accent }]} accessibilityLabel={t('fb.updated')} /> : null}
                </View>
              </Card>
            ))}
          </View>
          <ThemedText type="small" style={[muted, styles.mt]}>{t('fb.privacy')}</ThemedText>
        </ScrollView>
      </SafeAreaView>

      <Composer visible={composer} signedIn={!!user} onClose={() => setComposer(false)} />
      <ToolSheet visible={!!open} title={open ? ref(open.id) : ''} onClose={() => setOpenId(null)}>
        {open ? <Detail ticket={open} onClose={() => setOpenId(null)} /> : null}
      </ToolSheet>
    </ThemedView>
  );
}

function Detail({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const muted = { color: colors.textSecondary };
  const declined = ticket.status === 'declined';
  const reached = STATUS_FLOW.indexOf(ticket.status);
  const events = [...ticket.events].reverse();

  function remove() {
    Alert.alert(t('fb.remove.confirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('fb.remove'), style: 'destructive', onPress: () => { void removeLocalTicket(ticket.id); onClose(); } },
    ]);
  }

  return (
    <>
      <View style={{ gap: 4 }}>
        <ThemedText style={Type.heading}>{ticket.title}</ThemedText>
        {ticket.body ? <ThemedText type="small" style={muted}>{ticket.body}</ThemedText> : null}
      </View>

      {!declined ? (
        <View style={styles.stepper}>
          {STATUS_FLOW.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={[styles.stepDot, { backgroundColor: !ticket.pending && i <= reached ? colors.accent : colors.backgroundSelected }]}>
                {!ticket.pending && i <= reached ? <Ionicons name="checkmark" size={12} color={colors.onAccent} /> : null}
              </View>
              <ThemedText type="small" style={[styles.stepLabel, { color: !ticket.pending && i <= reached ? colors.text : colors.textSecondary }]} numberOfLines={2}>{t(statusKey(s))}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <ThemedText type="smallBold">{t('fb.timeline.title')}</ThemedText>
      {ticket.pending ? (
        <TimelineItem first color={colors.warning} title={t('fb.s.pending')} body={CLOUD_ENABLED ? t('fb.pending') : t('fb.pending.local')} at={ticket.createdAt} last />
      ) : (
        events.map((e, i) => (
          <TimelineItem
            key={`${e.status}-${e.at}-${i}`}
            first={i === 0}
            last={i === events.length - 1}
            color={e.status === 'done' ? colors.positive : e.status === 'declined' ? colors.textSecondary : colors.accent}
            title={t(statusKey(e.status))}
            body={[t(descKey(e.status)), e.note ? `${t('fb.devNote')}: ${e.note}` : '', e.fixedIn ? t('fb.fixedIn', { version: e.fixedIn }) : ''].filter(Boolean).join('\n')}
            at={e.at}
          />
        ))
      )}
      {ticket.pending ? <Button label={t('fb.remove')} variant="danger" onPress={remove} /> : null}
      {FEEDBACK_EMAIL && ticket.pending ? <Button label={t('fb.email')} variant="secondary" icon="mail-outline" onPress={() => void emailTicket(ticket.kind, ticket.title, ticket.body, t)} /> : null}
    </>
  );
}

function TimelineItem({ title, body, at, color, first, last }: { title: string; body: string; at: string; color: string; first: boolean; last: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.tl}>
      <View style={styles.tlRail}>
        <View style={[styles.tlDot, { backgroundColor: first ? color : colors.divider }]} />
        {!last ? <View style={[styles.tlLine, { backgroundColor: colors.divider }]} /> : null}
      </View>
      <View style={styles.tlBody}>
        <ThemedText type="smallBold" style={first ? { color } : undefined}>{title}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>{body}</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: 12 }}>{clock(at)}</ThemedText>
      </View>
    </View>
  );
}

async function emailTicket(kind: FeedbackKind, title: string, body: string, t: ReturnType<typeof useT>['t'], log?: string) {
  const subject = t('fb.email.subject', { version: Constants.expoConfig?.version ?? '', kind: t(kind === 'bug' ? 'fb.kind.bug' : 'fb.kind.suggestion'), title });
  const text = `${body}\n\n---\nWaKira ${Constants.expoConfig?.version ?? ''}`.concat(log ? `\n\n${log}` : ''); // i18n-ignore: signature line
  try {
    await Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text.slice(0, 1800))}`);
  } catch {
    // no mail app
  }
}

function Composer({ visible, signedIn, onClose }: { visible: boolean; signedIn: boolean; onClose: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [withLog, setWithLog] = useState(false);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);

  const titleOk = title.trim().length >= 3;
  const bodyOk = body.trim().length >= 5;

  async function logText() {
    if (!withLog || kind !== 'bug') return '';
    const list = await getErrorLog();
    return list.length ? formatErrorLog(list) : '';
  }

  async function send() {
    setTried(true);
    if (!titleOk || !bodyOk || sending) return;
    setSending(true);
    const log = await logText();
    await submitFeedback({ kind, title, body: log ? `${body.trim()}\n\n${log}`.slice(0, 4000) : body });
    setSending(false);
    setTitle('');
    setBody('');
    setTried(false);
    onClose();
    Alert.alert(t('fb.sent'));
  }

  async function email() {
    setTried(true);
    if (!titleOk || !bodyOk) return;
    await emailTicket(kind, title, body, t, await logText());
  }

  return (
    <ToolSheet visible={visible} title={t('fb.new')} onClose={onClose}>
      <FormField label={t('fb.f.kind')}>
        <View style={styles.row}>
          <Chip label={t('fb.kind.bug')} icon="bug-outline" active={kind === 'bug'} onPress={() => setKind('bug')} />
          <Chip label={t('fb.kind.suggestion')} icon="bulb-outline" active={kind === 'suggestion'} onPress={() => setKind('suggestion')} />
        </View>
      </FormField>
      <TextField label={t('fb.f.title')} value={title} onChangeText={setTitle} maxLength={120} error={tried && !titleOk ? t('fb.err.title') : undefined} />
      <FormField label={t('fb.f.body')} error={tried && !bodyOk ? t('fb.err.body') : undefined}>
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={3000}
          placeholder={kind === 'bug' ? t('fb.f.body.bug') : t('fb.f.body.suggestion')}
          placeholderTextColor={colors.textSecondary}
          style={[Type.body, styles.area, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
        />
      </FormField>
      {kind === 'bug' ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{t('fb.f.log')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('fb.f.logHint')}</ThemedText>
          </View>
          <Switch value={withLog} onValueChange={setWithLog} />
        </View>
      ) : null}
      {signedIn ? (
        <Button label={t('fb.send')} icon="send-outline" loading={sending} onPress={() => void send()} />
      ) : (
        <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('fb.signin')}</ThemedText>
      )}
      {FEEDBACK_EMAIL ? <Button label={t('fb.email')} variant="secondary" icon="mail-outline" onPress={() => void email()} /> : null}
      <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('fb.privacy')}</ThemedText>
    </ToolSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  mt: { marginTop: Spacing.three },
  h: { marginTop: Spacing.four, marginBottom: Spacing.two },
  list: { gap: Spacing.two },
  gap: { gap: Spacing.two },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.lg },
  badge: { width: 10, height: 10, borderRadius: 5 },
  area: { minHeight: 110, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 12, textAlignVertical: 'top' },
  stepper: { flexDirection: 'row' },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 11, textAlign: 'center' },
  tl: { flexDirection: 'row', gap: 12 },
  tlRail: { alignItems: 'center', width: 14 },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  tlLine: { width: 2, flex: 1, marginTop: 2 },
  tlBody: { flex: 1, paddingBottom: Spacing.three, gap: 2 },
});
