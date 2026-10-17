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
 *
 * 3.1.0: lists of records with an `id` (transactions, accounts, debts, goals...) are MERGED when both sides
 * changed, record by record, against the copy both last agreed on (kept on the phone as `<key>.base`):
 * a record added on either side is kept, a record changed on one side takes that change, a record deleted on one
 * side and untouched on the other is deleted. Only a record changed on BOTH sides falls back to "newer edit wins",
 * and a record deleted on one side but edited on the other is kept. Other values (settings objects, numbers)
 * still follow "newer edit wins" as a whole. A push only lands when the cloud still holds the copy the phone last
 * saw (pushIf); otherwise the phone merges first, so one device can no longer silently overwrite another.
 */

export type Meta = { base: string | null; dirty: boolean; editedAt: string };
export type RemoteDoc = { value: unknown; updatedAt: string };

export interface RemoteStore {
  /** null when the cloud has no document for this key. Throws when the cloud cannot be reached. */
  pull(key: string): Promise<RemoteDoc | null>;
  /** Saves the document and returns the stamp the server gave it. Throws when it cannot be reached. */
  push(key: string, value: unknown): Promise<string>;
  /**
   * Saves only if the cloud still holds the copy stamped `base` (null = the cloud has none yet).
   * Returns the new stamp, or null when someone else saved in between. Throws when it cannot be reached.
   * Optional: a store without it falls back to push (the old behaviour).
   */
  pushIf?(key: string, value: unknown, base: string | null): Promise<string | null>;
}

export interface LocalStore {
  read(key: string): Promise<unknown | null>;
  write(key: string, value: unknown): Promise<void>;
  readMeta(key: string): Promise<Meta | null>;
  writeMeta(key: string, meta: Meta): Promise<void>;
}

/** 'merged': both sides changed and the result combines them (the app must show the new value). */
export type ReconcileSource = 'local' | 'remote' | 'offline' | 'merged';
export type ReconcileResult = { value: unknown | null; source: ReconcileSource };

/** Where the phone's own copy is kept when the cloud's copy replaces it. */
export const backupKeyOf = (key: string) => `${key}.bak`;
/** The copy the phone and the cloud last agreed on (needed to tell an edit from a deletion when merging). */
export const baseKeyOf = (key: string) => `${key}.base`;

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Rec = { id: string | number } & Record<string, unknown>;
/** A list of records that each carry an id, i.e. something that can be merged record by record. */
export function isRecordList(v: unknown): v is Rec[] {
  return (
    Array.isArray(v) &&
    v.every((x) => !!x && typeof x === 'object' && !Array.isArray(x) && (typeof (x as Rec).id === 'string' || typeof (x as Rec).id === 'number'))
  );
}

/**
 * Three-way merge of two record lists. `base` is what both sides last agreed on (null when unknown: then nothing
 * counts as deleted, so a record is only ever added or updated, never lost). `localWins` breaks a tie when the
 * same record changed on both sides. Order: the phone's order, with records only the cloud has placed after the
 * record they follow in the cloud's list.
 */
export function mergeRecordLists(base: Rec[] | null, local: Rec[], remote: Rec[], localWins: boolean): Rec[] {
  const key = (r: Rec) => String(r.id);
  const B = new Map((base ?? []).map((r) => [key(r), r]));
  const L = new Map(local.map((r) => [key(r), r]));
  const R = new Map(remote.map((r) => [key(r), r]));
  const pick = (id: string): Rec | null => {
    const b = B.get(id);
    const l = L.get(id);
    const r = R.get(id);
    if (l && r) {
      if (sameJson(l, r)) return l;
      if (b && sameJson(l, b)) return r; // only the cloud changed it
      if (b && sameJson(r, b)) return l; // only the phone changed it
      return localWins ? l : r; // changed on both sides
    }
    if (l && !r) {
      if (!base) return l; // nothing to compare with: keep it
      if (!b) return l; // added on the phone
      return sameJson(l, b) ? null : l; // deleted in the cloud; kept if the phone edited it meanwhile
    }
    if (r && !l) {
      if (!base) return r;
      if (!b) return r; // added in the cloud
      return sameJson(r, b) ? null : r; // deleted on the phone; kept if the cloud edited it meanwhile
    }
    return null;
  };

  const out: Rec[] = [];
  const placed = new Set<string>();
  for (const l of local) {
    const id = key(l);
    const v = pick(id);
    placed.add(id);
    if (v) out.push(v);
  }
  // Records only the cloud has: insert after the record that precedes them in the cloud's list.
  let after: string | null = null;
  for (const r of remote) {
    const id = key(r);
    if (!placed.has(id)) {
      placed.add(id);
      const v = pick(id);
      if (v) {
        const at = after === null ? 0 : out.findIndex((x) => key(x) === after) + 1;
        out.splice(at <= 0 && after !== null ? out.length : at, 0, v);
      }
    }
    after = id;
  }
  return out;
}

/** Merge when both sides changed; null when the value cannot be merged (then "newer edit wins" applies). */
function mergeValues(base: unknown, local: unknown, remote: unknown, localWins: boolean): unknown | null {
  if (!isRecordList(local) || !isRecordList(remote)) return null;
  return mergeRecordLists(isRecordList(base) ? base : null, local, remote, localWins);
}

async function agreed(local: LocalStore, key: string, value: unknown, stamp: string, editedAt = stamp) {
  if (isRecordList(value)) await local.write(baseKeyOf(key), value);
  await local.writeMeta(key, { base: stamp, dirty: false, editedAt });
}

/** The phone changed `key`: store it and remember that the cloud has not seen it yet. */
export async function markEdited(local: LocalStore, key: string, value: unknown, now: string): Promise<void> {
  const meta = await local.readMeta(key);
  await local.write(key, value);
  await local.writeMeta(key, { base: meta?.base ?? null, dirty: true, editedAt: now });
}

/**
 * Send the phone's copy to the cloud. Safe to call again; does nothing when nothing is waiting.
 * 'merged': the cloud had changed meanwhile, so the two were merged first; the phone now holds the merged copy
 * and the screens should reload it.
 */
export async function pushIfDirty(local: LocalStore, remote: RemoteStore, key: string): Promise<'pushed' | 'merged' | 'clean' | 'failed'> {
  const meta = await local.readMeta(key);
  if (!meta?.dirty) return 'clean';
  let value = await local.read(key);
  if (value === null) return 'clean';
  let merged = false;
  try {
    let stamp: string | null;
    if (remote.pushIf) {
      stamp = await remote.pushIf(key, value, meta.base);
      if (stamp === null) {
        // Someone else saved since this phone last looked: combine, then try once more against their copy.
        const doc = await remote.pull(key);
        const base = await local.read(baseKeyOf(key));
        const localWins = !doc || Date.parse(meta.editedAt) >= Date.parse(doc.updatedAt);
        const m = doc ? mergeValues(base, value, doc.value, localWins) : null;
        if (doc && m === null && !localWins) {
          // Not mergeable and the cloud's edit is newer: take the cloud's, keep ours aside.
          await local.write(backupKeyOf(key), value);
          await local.write(key, doc.value);
          await agreed(local, key, doc.value, doc.updatedAt);
          return 'merged';
        }
        if (m !== null) {
          value = m;
          merged = true;
          await local.write(key, value);
        }
        stamp = await remote.pushIf(key, value, doc ? doc.updatedAt : null);
        if (stamp === null) {
          // Refused twice. If the cloud's copy has not moved, the refusal is not a real conflict (for example a
          // stamp that does not compare equal): save plainly rather than never saving. Otherwise try later.
          const again = await remote.pull(key);
          if ((again?.updatedAt ?? null) !== (doc?.updatedAt ?? null)) return 'failed';
          stamp = await remote.push(key, value);
        }
      }
    } else {
      stamp = await remote.push(key, value);
    }
    // The user may have edited again while the request was in flight: then it stays dirty.
    const now = await local.readMeta(key);
    const stillSame = !!now && now.editedAt === meta.editedAt;
    if (stillSame) await agreed(local, key, value, stamp, now?.editedAt ?? meta.editedAt);
    else await local.writeMeta(key, { base: stamp, dirty: true, editedAt: now?.editedAt ?? meta.editedAt });
    return merged ? 'merged' : 'pushed';
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

  const adopt = async (d: RemoteDoc, risky = false): Promise<ReconcileResult> => {
    // The cloud's copy is about to replace something the phone holds that the cloud never saw: keep that copy aside.
    if (risky && value !== null && !sameJson(value, d.value)) await local.write(backupKeyOf(key), value);
    await local.write(key, d.value);
    await agreed(local, key, d.value, d.updatedAt);
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

  if (!meta) return adopt(doc, true); // phone has data but never synced it: protect what is in the cloud (and keep the phone's copy aside)

  if (!meta.dirty) {
    if (meta.base === doc.updatedAt) {
      // Already in agreement. Phones updated from before 3.1.0 have no merge base yet: record it now.
      if (isRecordList(value) && (await local.read(baseKeyOf(key))) === null) await local.write(baseKeyOf(key), value);
      return { value, source: 'local' };
    }
    return adopt(doc);
  }

  // The phone has unsent edits.
  if (meta.base === doc.updatedAt) return keepAndPush(); // cloud untouched since: just send
  // Both sides changed since they last agreed.
  const localWins = Date.parse(meta.editedAt) >= Date.parse(doc.updatedAt);
  const m = mergeValues(await local.read(baseKeyOf(key)), value, doc.value, localWins);
  if (m !== null) {
    await local.write(key, m);
    // Base is now the cloud's copy: the merged list is our edit on top of it.
    await local.writeMeta(key, { base: doc.updatedAt, dirty: true, editedAt: meta.editedAt });
    if (isRecordList(doc.value)) await local.write(baseKeyOf(key), doc.value);
    const r = await pushIfDirty(local, remote, key);
    const shown = r === 'merged' ? await local.read(key) : m;
    return { value: shown, source: 'merged' };
  }
  // Not a record list: the more recent edit wins.
  return localWins ? keepAndPush() : adopt(doc, true);
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
    const existing = await local.read(d.key);
    if (!meta && existing !== null && !sameJson(existing, d.value)) await local.write(backupKeyOf(d.key), existing);
    await local.write(d.key, d.value);
    await agreed(local, d.key, d.value, d.updatedAt);
    n++;
  }
  return n;
}
