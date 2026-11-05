import { useEffect, useState } from 'react';

import type { FeedbackKind, FeedbackStatus } from '@/services/feedback';
import { supabase } from '@/services/supabase';

/**
 * Staff tools: reading and answering everyone's feedback. Who is staff is decided only in Supabase
 * (table `staff`, set from the SQL editor, see supabase/005_staff_inbox.sql). The app only asks "am I staff?";
 * every read and change is checked again on the server, so a modified app gains nothing.
 */
export type StaffRole = 'admin' | 'superadmin';

export type InboxItem = {
  id: string;
  kind: FeedbackKind;
  title: string;
  body: string;
  status: FeedbackStatus;
  devNote: string;
  fixedIn: string;
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  platform: string;
  osVersion: string;
  language: string;
  reporter: string;
};

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export async function fetchStaffRole(): Promise<StaffRole | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('staff').select('role').maybeSingle();
    if (error || !data) return null;
    return data.role === 'admin' || data.role === 'superadmin' ? data.role : null;
  } catch {
    return null;
  }
}

/** The signed-in person's staff role, or null for everybody else (including when offline). */
export function useStaffRole(userId: string | null): StaffRole | null {
  const [found, setFound] = useState<{ userId: string; role: StaffRole | null } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void fetchStaffRole().then((role) => {
      if (alive) setFound({ userId, role });
    });
    return () => {
      alive = false;
    };
  }, [userId]);
  return userId && found?.userId === userId ? found.role : null;
}

/** All reports, newest first. null = could not load (offline, or not staff). */
export async function listInbox(): Promise<InboxItem[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('staff_feedback_list');
    if (error || !Array.isArray(data)) return null;
    return (data as Row[]).map((r) => ({
      id: str(r.id),
      kind: r.kind === 'suggestion' ? 'suggestion' : 'bug',
      title: str(r.title),
      body: str(r.body),
      status: str(r.status) as FeedbackStatus,
      devNote: str(r.dev_note),
      fixedIn: str(r.fixed_in),
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
      appVersion: str(r.app_version),
      platform: str(r.platform),
      osVersion: str(r.os_version),
      language: str(r.language),
      reporter: str(r.reporter),
    }));
  } catch {
    return null;
  }
}

export async function updateInbox(id: string, patch: { status: FeedbackStatus; note: string; fixedIn: string }): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('staff_feedback_update', { p_id: id, p_status: patch.status, p_note: patch.note, p_fixed_in: patch.fixedIn });
    return !error;
  } catch {
    return false;
  }
}

/** How many reports are still "received" (nobody has looked yet). 0 for non-staff. */
export function useNewReportCount(role: StaffRole | null): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!role) return;
    let alive = true;
    void listInbox().then((items) => {
      if (alive && items) setCount(items.filter((i) => i.status === 'received').length);
    });
    return () => {
      alive = false;
    };
  }, [role]);
  return role ? count : 0;
}
