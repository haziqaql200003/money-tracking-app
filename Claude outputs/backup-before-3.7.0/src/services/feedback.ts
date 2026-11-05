import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { getLanguage } from '@/i18n';
import { CLOUD_ENABLED, supabase } from '@/services/supabase';

/**
 * Bug reports and suggestions, with a status you can follow like a parcel.
 * Tickets live in the Supabase table `feedback` (see supabase/003_feedback.sql). Each one is saved on this phone
 * first, so nothing is lost when offline, and is sent as soon as the cloud is reachable. The developer changes the
 * status in Supabase; every change adds a step to the timeline, which this service fetches back.
 * Nothing but what the person typed (plus app version, platform and language) is sent.
 */
export type FeedbackKind = 'bug' | 'suggestion';
export type FeedbackStatus = 'received' | 'reviewing' | 'planned' | 'in_progress' | 'done' | 'declined';
/** The steps shown in order; "declined" replaces the rest. */
export const STATUS_FLOW: FeedbackStatus[] = ['received', 'reviewing', 'planned', 'in_progress', 'done'];

export type TicketEvent = { status: FeedbackStatus; note: string | null; fixedIn: string | null; at: string };
export type Ticket = {
  id: string;
  kind: FeedbackKind;
  title: string;
  body: string;
  status: FeedbackStatus;
  devNote: string | null;
  fixedIn: string | null;
  createdAt: string;
  updatedAt: string;
  events: TicketEvent[];
  /** Saved on this phone, not sent yet. */
  pending: boolean;
  appVersion: string;
  platform: string;
  osVersion: string;
  language: string;
};

type Store = { tickets: Ticket[]; seen: Record<string, string> };
type Snapshot = { userId: string | null; tickets: Ticket[]; unseen: number; busy: boolean; online: boolean };

const keyOf = (userId: string) => `wakira.feedback.${userId}`; // i18n-ignore: storage key (kept out of backups on purpose)
const EMPTY: Snapshot = { userId: null, tickets: [], unseen: 0, busy: false, online: CLOUD_ENABLED };

let state: Snapshot = EMPTY;
let seen: Record<string, string> = {};
const listeners = new Set<() => void>();

function emit(patch: Partial<Snapshot>) {
  const next = { ...state, ...patch };
  next.unseen = next.tickets.filter((t) => !t.pending && (seen[t.id] ?? '') < t.updatedAt).length;
  state = next;
  listeners.forEach((l) => l());
}

async function persist() {
  if (!state.userId) return;
  try {
    const s: Store = { tickets: state.tickets, seen };
    await AsyncStorage.setItem(keyOf(state.userId), JSON.stringify(s));
  } catch {
    // best effort
  }
}

export function uuid() {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Loads this person's tickets from the phone. Call when the signed-in person changes. */
export async function loadFeedback(userId: string | null) {
  if (state.userId === userId) return;
  if (!userId) {
    seen = {};
    state = { ...EMPTY };
    listeners.forEach((l) => l());
    return;
  }
  let stored: Store = { tickets: [], seen: {} };
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    if (raw) stored = JSON.parse(raw) as Store;
  } catch {
    // start empty
  }
  seen = stored.seen ?? {};
  emit({ userId, tickets: stored.tickets ?? [] });
}

export const isUnseen = (t: Ticket) => !t.pending && (seen[t.id] ?? '') < t.updatedAt;

const sortTickets = (list: Ticket[]) => [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

async function push(ticket: Ticket): Promise<boolean> {
  if (!supabase || !state.userId) return false;
  const { error } = await supabase.from('feedback').insert({
    id: ticket.id,
    user_id: state.userId,
    kind: ticket.kind,
    title: ticket.title,
    body: ticket.body,
    app_version: ticket.appVersion,
    platform: ticket.platform,
    os_version: ticket.osVersion,
    language: ticket.language,
  });
  // 23505 = already there (an earlier try got through): fine.
  return !error || error.code === '23505';
}

/** Sends tickets waiting on this phone, then fetches every ticket and its timeline. Safe to call often. */
export async function refreshFeedback(): Promise<void> {
  if (!state.userId || state.busy) return;
  emit({ busy: true });
  try {
    if (supabase) {
      for (const t of state.tickets.filter((x) => x.pending)) {
        if (await push(t)) state = { ...state, tickets: state.tickets.map((x) => (x.id === t.id ? { ...x, pending: false } : x)) };
      }
      const { data, error } = await supabase.from('feedback').select('*, feedback_events(status, note, fixed_in, created_at)').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      const remote: Ticket[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        kind: r.kind as FeedbackKind,
        title: String(r.title),
        body: String(r.body ?? ''),
        status: r.status as FeedbackStatus,
        devNote: (r.dev_note as string | null) ?? null,
        fixedIn: (r.fixed_in as string | null) ?? null,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
        pending: false,
        appVersion: String(r.app_version ?? ''),
        platform: String(r.platform ?? ''),
        osVersion: String(r.os_version ?? ''),
        language: String(r.language ?? ''),
        events: ((r.feedback_events as { status: FeedbackStatus; note: string | null; fixed_in: string | null; created_at: string }[]) ?? [])
          .map((e) => ({ status: e.status, note: e.note, fixedIn: e.fixed_in, at: e.created_at }))
          .sort((a, b) => (a.at < b.at ? -1 : 1)),
      }));
      const ids = new Set(remote.map((t) => t.id));
      const waiting = state.tickets.filter((t) => t.pending && !ids.has(t.id));
      emit({ tickets: sortTickets([...waiting, ...remote]), online: true });
      await persist();
    }
  } catch {
    emit({ online: false });
  } finally {
    emit({ busy: false });
  }
}

export type FeedbackDraft = { kind: FeedbackKind; title: string; body: string };

/** Saves the ticket on this phone at once and tries to send it. */
export async function submitFeedback(draft: FeedbackDraft): Promise<Ticket | null> {
  if (!state.userId) return null;
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: uuid(),
    kind: draft.kind,
    title: draft.title.trim(),
    body: draft.body.trim(),
    status: 'received',
    devNote: null,
    fixedIn: null,
    createdAt: now,
    updatedAt: now,
    events: [],
    pending: true,
    appVersion: Constants.expoConfig?.version ?? '',
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    language: getLanguage(),
  };
  seen[ticket.id] = now;
  emit({ tickets: sortTickets([ticket, ...state.tickets]) });
  await persist();
  void refreshFeedback();
  return ticket;
}

export async function markSeen(id: string) {
  const t = state.tickets.find((x) => x.id === id);
  if (!t || (seen[id] ?? '') >= t.updatedAt) return;
  seen = { ...seen, [id]: t.updatedAt };
  emit({});
  await persist();
}

export async function removeLocalTicket(id: string) {
  const t = state.tickets.find((x) => x.id === id);
  if (!t?.pending) return; // only a ticket that was never sent can be removed
  emit({ tickets: state.tickets.filter((x) => x.id !== id) });
  await persist();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => state;

/** The tickets of the signed-in person, live. Also loads them when the person changes. */
export function useFeedback(userId: string | null): Snapshot {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void loadFeedback(userId);
  }, [userId]);
  return snap;
}

export const FEEDBACK_EMAIL = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL?.trim() || '';
