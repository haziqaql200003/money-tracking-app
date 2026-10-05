/**
 * Sync core: the rules that decide whether the phone or the cloud wins, with no React Native
 * or Supabase in it so they can be tested in plain Node (scripts/sync-selftest.mjs).
 *
 * Model: every stored key (transactions, accounts, plan_goals, ...) is one JSON document.
 * Each key keeps a little meta record next to it on the phone:
 *   base     = the cloud's `updated_at` stamp from the last time this phone and the cloud agreed
 *   dirty    = the phone changed it since then and the cloud has not received it yet
 *   editedAt = when the phone last changed it
 * The cloud stamps `updated_at` itself (server clock), so two phones with different clocks cannot
 * confuse each other. A phone's own clock is only used to break a tie when BOTH sides changed.
 */

export type Meta = { base: string | null; dirty: boolean; editedAt: string };
export type RemoteDoc = { value: unknown; updatedAt: string };

export interface RemoteStore {
  /** null when the cloud has no document for this key. Throws when the cloud cannot be reached. */
  pull(key: string): Promise<RemoteDoc | null>;
  /** Saves the document and returns the stamp the server gave it. Throws when it cannot be reached. */
  push(key: string, value: unknown): Promise<string>;
}

export interface LocalStore {
  read(key: string): Promise<unknown | null>;
  write(key: string, value: unknown): Promise<void>;
  readMeta(key: string): Promise<Meta | null>;
  writeMeta(key: string, meta: Meta): Promise<void>;
}

export type ReconcileSource = 'local' | 'remote' | 'offline';
export type ReconcileResult = { value: unknown | null; source: ReconcileSource };

/** The phone changed `key`: store it and remember that the cloud has not seen it yet. */
export async function markEdited(local: LocalStore, key: string, value: unknown, now: string): Promise<void> {
  const meta = await local.readMeta(key);
  await local.write(key, value);
  await local.writeMeta(key, { base: meta?.base ?? null, dirty: true, editedAt: now });
}

/** Send the phone's copy to the cloud. Safe to call again; does nothing when nothing is waiting. */
export async function pushIfDirty(local: LocalStore, remote: RemoteStore, key: string): Promise<'pushed' | 'clean' | 'failed'> {
  const meta = await local.readMeta(key);
  if (!meta?.dirty) return 'clean';
  const value = await local.read(key);
  if (value === null) return 'clean';
  try {
    const stamp = await remote.push(key, value);
    // The user may have edited again while the request was in flight: then it stays dirty.
    const now = await local.readMeta(key);
    const stillSame = !!now && now.editedAt === meta.editedAt;
    await local.writeMeta(key, { base: stamp, dirty: !stillSame, editedAt: now?.editedAt ?? meta.editedAt });
    return 'pushed';
  } catch {
    return 'failed';
  }
}

/**
 * Compare the phone and the cloud for one key and make them agree.
 * Returns the value the app should show (null = nothing stored anywhere).
 */
export async function reconcile(local: LocalStore, remote: RemoteStore, key: string): Promise<ReconcileResult> {
  const value = await local.read(key);
  const meta = await local.readMeta(key);

  let doc: RemoteDoc | null;
  try {
    doc = await remote.pull(key);
  } catch {
    return { value, source: 'offline' };
  }

  const adopt = async (d: RemoteDoc): Promise<ReconcileResult> => {
    await local.write(key, d.value);
    await local.writeMeta(key, { base: d.updatedAt, dirty: false, editedAt: d.updatedAt });
    return { value: d.value, source: 'remote' };
  };
  const keepAndPush = async (): Promise<ReconcileResult> => {
    // Make sure there is a dirty marker, then send.
    if (!meta?.dirty) await local.writeMeta(key, { base: meta?.base ?? null, dirty: true, editedAt: meta?.editedAt ?? new Date().toISOString() });
    await pushIfDirty(local, remote, key);
    return { value, source: 'local' };
  };

  if (!doc) {
    // Nothing in the cloud yet. If the phone has something, upload it.
    if (value === null) return { value: null, source: 'local' };
    return keepAndPush();
  }

  // The cloud has a copy.
  if (value === null) return adopt(doc);

  if (!meta) return adopt(doc); // phone has data but never synced it: protect what is in the cloud

  if (!meta.dirty) {
    return meta.base === doc.updatedAt ? { value, source: 'local' } : adopt(doc);
  }

  // The phone has unsent edits.
  if (meta.base === doc.updatedAt) return keepAndPush(); // cloud untouched since: just send
  // Both sides changed since they last agreed. The more recent edit wins.
  return Date.parse(meta.editedAt) >= Date.parse(doc.updatedAt) ? keepAndPush() : adopt(doc);
}

/** Pull every document the cloud holds for this user (first sign-in on a phone). */
export async function adoptAll(
  local: LocalStore,
  docs: { key: string; value: unknown; updatedAt: string }[],
): Promise<number> {
  let n = 0;
  for (const d of docs) {
    const meta = await local.readMeta(d.key);
    if (meta?.dirty) continue; // never overwrite unsent edits
    await local.write(d.key, d.value);
    await local.writeMeta(d.key, { base: d.updatedAt, dirty: false, editedAt: d.updatedAt });
    n++;
  }
  return n;
}
