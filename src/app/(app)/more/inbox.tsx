import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ToolSheet } from '@/components/tools/tool-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { FormField, TextField } from '@/components/ui/form-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { CURRENT_VERSION } from '@/constants/changelog';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { Alert } from '@/services/dialog';
import type { FeedbackStatus } from '@/services/feedback';
import { listInbox, updateInbox, useStaffRole, type InboxItem } from '@/services/staff';

const STATUSES: FeedbackStatus[] = ['received', 'reviewing', 'planned', 'in_progress', 'done', 'declined'];
const statusKey = (s: FeedbackStatus) => `fb.s.${s}` as TKey;
const ref = (id: string) => `WK-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`; // i18n-ignore: reference code
type Filter = 'all' | 'new' | 'open' | 'closed';
const inFilter = (s: FeedbackStatus, f: Filter) =>
  f === 'all' || (f === 'new' && s === 'received') || (f === 'open' && (s === 'reviewing' || s === 'planned' || s === 'in_progress')) || (f === 'closed' && (s === 'done' || s === 'declined'));

/** Staff only (see supabase/005_staff_inbox.sql). Everyone else sees an empty screen, and the server refuses anyway. */
export default function InboxScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { user } = useAuth();
  const role = useStaffRole(user?.id ?? null);
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>('new');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    const res = await listInbox();
    setBusy(false);
    setFailed(res === null);
    if (res) setItems(res);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter((i) => inFilter(i.status, filter) && (!q || `${i.title} ${i.body} ${i.reporter}`.toLowerCase().includes(q)));
  const open = (items ?? []).find((i) => i.id === openId) ?? null;
  const muted = { color: colors.textSecondary };
  const statusColor = (s: FeedbackStatus) => (s === 'done' ? colors.positive : s === 'declined' ? colors.textSecondary : colors.accent);
  const count = (f: Filter) => (items ?? []).filter((i) => inFilter(i.status, f)).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void refresh()} />}>
          <ScreenHeader title={t('inbox.title')} />
          {role ? <ThemedText type="small" style={muted}>{t(role === 'superadmin' ? 'inbox.role.superadmin' : 'inbox.role.admin')}</ThemedText> : null}

          <View style={styles.chips}>
            {(['new', 'open', 'closed', 'all'] as Filter[]).map((f) => (
              <Chip key={f} size="sm" label={`${t(`inbox.filter.${f}` as TKey)} · ${count(f)}`} active={filter === f} onPress={() => setFilter(f)} />
            ))}
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('inbox.search')}
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={t('inbox.search')}
            style={[Type.body, styles.search, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}
          />

          {failed ? <ThemedText type="small" style={[muted, styles.mt]}>{t('inbox.loadFail')}</ThemedText> : null}
          {!failed && items && shown.length === 0 ? <ThemedText type="small" style={[muted, styles.mt]}>{t('inbox.empty')}</ThemedText> : null}
          <View style={styles.list}>
            {shown.map((x) => (
              <Card key={x.id} onPress={() => setOpenId(x.id)} style={styles.gap}>
                <View style={styles.row}>
                  <Ionicons name={x.kind === 'bug' ? 'bug-outline' : 'bulb-outline'} size={18} color={colors.accent} />
                  <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>{x.title}</ThemedText>
                </View>
                <View style={styles.row}>
                  <View style={[styles.pill, { backgroundColor: statusColor(x.status) + '22' }]}>
                    <ThemedText type="small" style={{ color: statusColor(x.status), fontWeight: '700' }}>{t(statusKey(x.status))}</ThemedText>
                  </View>
                  <ThemedText type="small" style={[muted, styles.flex]} numberOfLines={1}>{x.reporter} · {formatDate(new Date(x.createdAt))}</ThemedText>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <ToolSheet visible={!!open} title={open ? ref(open.id) : ''} onClose={() => setOpenId(null)}>
        {open ? <Reply key={open.id} item={open} onSaved={() => void refresh()} /> : null}
      </ToolSheet>
    </ThemedView>
  );
}

function Reply({ item, onSaved }: { item: InboxItem; onSaved: () => void }) {
  const colors = useTheme();
  const { t } = useT();
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [note, setNote] = useState(item.devNote);
  const [fixedIn, setFixedIn] = useState(item.fixedIn);
  const [saving, setSaving] = useState(false);
  const muted = { color: colors.textSecondary };
  const changed = status !== item.status || note.trim() !== item.devNote || fixedIn.trim() !== item.fixedIn;

  async function save() {
    setSaving(true);
    const ok = await updateInbox(item.id, { status, note, fixedIn });
    setSaving(false);
    Alert.alert(ok ? t('inbox.saved') : t('inbox.saveFail'));
    if (ok) onSaved();
  }

  return (
    <>
      <View style={{ gap: 4 }}>
        <ThemedText style={Type.heading}>{item.title}</ThemedText>
        <ThemedText type="small" style={muted}>{t('inbox.by', { name: item.reporter })} · {formatDate(new Date(item.createdAt))}</ThemedText>
        <ThemedText type="small" style={muted}>{t('inbox.meta', { version: item.appVersion || '?', platform: item.platform || '?', os: item.osVersion, lang: item.language })}</ThemedText>
      </View>

      <ThemedText type="smallBold" style={styles.mt}>{t('inbox.details')}</ThemedText>
      <ThemedText type="small" style={muted} selectable>{item.body || t('inbox.noDetails')}</ThemedText>

      <FormField label={t('inbox.status')} style={styles.mt}>
        <View style={styles.chips}>
          {STATUSES.map((s) => (
            <Chip key={s} size="sm" label={t(statusKey(s))} active={status === s} onPress={() => setStatus(s)} />
          ))}
        </View>
      </FormField>

      <TextField label={t('inbox.note')} value={note} onChangeText={setNote} placeholder={t('inbox.notePlaceholder')} multiline maxLength={1000} style={styles.mt} />
      <TextField label={t('inbox.fixedIn')} value={fixedIn} onChangeText={setFixedIn} placeholder={CURRENT_VERSION} maxLength={20} autoCapitalize="none" style={styles.mt} />
      <View style={styles.chips}>
        <Chip size="sm" label={t('inbox.useCurrent', { version: CURRENT_VERSION })} onPress={() => setFixedIn(CURRENT_VERSION)} />
      </View>

      <Button label={t('inbox.save')} icon="paper-plane-outline" onPress={() => void save()} loading={saving} disabled={!changed} style={styles.mt} />
      {!changed ? <ThemedText type="small" style={[muted, styles.mt]}>{t('inbox.unchanged')}</ThemedText> : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  mt: { marginTop: Spacing.three },
  list: { gap: Spacing.two, marginTop: Spacing.three },
  gap: { gap: Spacing.two },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: 12, marginTop: Spacing.three },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.lg },
});
