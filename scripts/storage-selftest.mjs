#!/usr/bin/env node
/**
 * Self-test for data safety when stored records cannot be read (H1, 3.8.1). Run: npm run storage:test
 *
 * It runs the app's REAL code (src/services/storage.ts, storage-health.ts, cloud-sync.ts, backup.ts and the
 * usePersistedState hook, rendered by React) against an in-memory AsyncStorage that can be told to fail.
 * The rule under test: a read that failed is never treated as "no data", so nothing is ever saved over it.
 * Needs Node 22.18+ (it loads the .ts files directly). See scripts/storage-check/hooks.mjs for the fakes.
 */
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';

import AsyncStorage, { disk, failing, resetStorage, writes } from '@react-native-async-storage/async-storage';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { collectBackup, restoreBackup } from '@/services/backup';
import { flushAll, initialPull, reloadAll, restoreBackups, saveKey } from '@/services/cloud-sync';
import {
  listSetAside,
  loadJSON,
  measureStorage,
  saveJSON,
  StorageWriteError,
  usageLevel,
  loadJSONOrThrow,
  readJSON,
  setAsideIfCorrupt,
  setStorageErrorReporter,
  StorageReadError,
  userKey,
} from '@/services/storage';
import { getStorageHealth, retrySaves, retryStorage, startFresh } from '@/services/storage-health';
import { setFakeCloud } from '@/services/supabase';

/* ---------- a minimal stand-in for the screen, so React runs the hook's effects for real ---------- */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const noop = () => {};
const fakeDocument = { nodeType: 9, addEventListener: noop, removeEventListener: noop, activeElement: null, body: null };
globalThis.window = { HTMLIFrameElement: class {} }; // set AFTER react-dom loaded, so it does not look for a real browser
fakeDocument.defaultView = globalThis.window;
const fakeContainer = () => ({ nodeType: 1, nodeName: 'DIV', tagName: 'DIV', namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: fakeDocument, addEventListener: noop, removeEventListener: noop });

/** Lets every pending storage call, promise and React effect finish. */
const settle = async () => {
  for (let i = 0; i < 12; i++) await React.act(async () => { await new Promise((r) => setTimeout(r, 1)); });
};

/** Mounts a component that only calls usePersistedState and exposes what it returned. */
async function mount(props) {
  const seen = { renders: 0 };
  function Probe(p) {
    const [value, set, hydrated] = usePersistedState(p.k, p.initial, p.uid);
    Object.assign(seen, { value, set, hydrated });
    seen.renders++;
    return null;
  }
  const root = createRoot(fakeContainer());
  let current = props;
  const draw = async (next) => {
    current = { ...current, ...next };
    await React.act(async () => root.render(React.createElement(Probe, current)));
    await settle();
  };
  await draw({});
  return {
    seen,
    rerender: draw,
    edit: async (next) => {
      await React.act(async () => seen.set(next));
      await settle();
    },
    unmount: async () => {
      await React.act(async () => root.unmount());
      await settle();
    },
  };
}

/* ---------- helpers ---------- */
const TX = [{ id: 't1', title: 'SECRET-PAYEE', amount: 12.5 }, { id: 't2', title: 'Gaji', amount: 3000 }];
const NEW = { id: 't3', title: 'Kopi', amount: 6 };
const CORRUPT = '[{"id":"t1","title":"SECRET-PAYEE","amount":12.5},{"id":"t2","tit'; // a save that was cut off half-way
let n = 0;
const newUser = () => `user${++n}`;
const dataKey = (uid, key = 'transactions') => userKey(uid, key);
const writesTo = (key) => writes.filter(([, k]) => k === key);
const issuesOf = (uid) => getStorageHealth().issues.filter((i) => i.userId === uid);

const reports = [];
setStorageErrorReporter((e) => reports.push(e));

let passed = 0;
const test = async (name, fn) => {
  resetStorage();
  setFakeCloud(null);
  reports.length = 0;
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}\n${e.stack}`);
    process.exitCode = 1;
  }
};

/* ================= storage.ts ================= */

await test('readJSON tells missing, ok, corrupt and failed-read apart', async () => {
  disk.set('good', JSON.stringify(TX));
  disk.set('bad', CORRUPT);
  disk.set('locked', JSON.stringify(TX));
  failing.get.add('locked');
  assert.deepEqual(await readJSON('nothing'), { status: 'missing' });
  assert.deepEqual(await readJSON('good'), { status: 'ok', value: TX });
  assert.deepEqual(await readJSON('bad'), { status: 'failed', reason: 'corrupt' });
  assert.deepEqual(await readJSON('locked'), { status: 'failed', reason: 'read' });
  assert.equal(writes.length, 0, 'reading never writes');
});

await test('loadJSONOrThrow: null only when nothing is stored; a failed read throws', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), CORRUPT);
  assert.equal(await loadJSONOrThrow(dataKey(uid, 'never-saved')), null);
  await assert.rejects(loadJSONOrThrow(dataKey(uid)), (e) => e instanceof StorageReadError && e.reason === 'corrupt' && e.key === dataKey(uid));
  failing.get.add(dataKey(uid));
  await assert.rejects(loadJSONOrThrow(dataKey(uid)), (e) => e instanceof StorageReadError && e.reason === 'read');
});

await test('failures are reported once, with no stored text and no user id', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), CORRUPT);
  assert.equal(await loadJSON(dataKey(uid)), null); // the lenient read still returns null...
  await loadJSON(dataKey(uid));
  assert.equal(reports.length, 1, '...but the failure is reported, once'); // ...and is no longer silent
  assert.equal(reports[0].reason, 'corrupt');
  const err = await loadJSONOrThrow(dataKey(uid)).catch((e) => e);
  const logged = JSON.stringify(reports.map((r) => ({ ...r, key: undefined }))) + err.message;
  assert.ok(!logged.includes('SECRET'), 'no record text in the log');
  assert.ok(!err.message.includes(uid), 'no user id in the error message');
});

await test('setAsideIfCorrupt keeps damaged text byte for byte and leaves readable data alone', async () => {
  disk.set('bad', CORRUPT);
  disk.set('good', JSON.stringify(TX));
  assert.equal(await setAsideIfCorrupt('good', 'aside-good'), 'readable');
  assert.equal(disk.get('good'), JSON.stringify(TX));
  assert.equal(await setAsideIfCorrupt('none', 'aside-none'), 'missing');
  assert.equal(await setAsideIfCorrupt('bad', 'aside-bad'), 'aside');
  assert.equal(disk.get('aside-bad'), CORRUPT);
  assert.equal(disk.has('bad'), false);
});

await test('setAsideIfCorrupt changes nothing when the damaged copy cannot be kept (storage full)', async () => {
  disk.set('bad', CORRUPT);
  failing.set.add('aside-bad');
  await assert.rejects(setAsideIfCorrupt('bad', 'aside-bad'));
  assert.equal(disk.get('bad'), CORRUPT, 'the original is still there');
});

/* ================= usePersistedState (phone-only mode) ================= */

await test('1. first-time installation: defaults shown, loaded, nothing written until the first change', async () => {
  const uid = newUser();
  const h = await mount({ k: 'transactions', initial: [], uid });
  assert.deepEqual(h.seen.value, []);
  assert.equal(h.seen.hydrated, true);
  assert.equal(writes.length, 0);
  assert.equal(issuesOf(uid).length, 0);
  await h.edit((prev) => [NEW, ...prev]);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), [NEW]);
  await h.unmount();
});

await test('2. successful read: stored records are shown and a change is saved on top of them', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  const h = await mount({ k: 'transactions', initial: [], uid });
  assert.deepEqual(h.seen.value, TX);
  assert.equal(h.seen.hydrated, true);
  assert.equal(writes.length, 0, 'loading does not write');
  await h.edit((prev) => [NEW, ...prev]);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), [NEW, ...TX]);
  await h.unmount();
});

await test('3. missing storage key next to other stored keys: defaults, loaded, other keys untouched', async () => {
  const uid = newUser();
  disk.set(dataKey(uid, 'accounts'), JSON.stringify([{ id: 'a1' }]));
  const h = await mount({ k: 'transactions', initial: [], uid });
  assert.equal(h.seen.hydrated, true);
  assert.deepEqual(h.seen.value, []);
  assert.equal(writes.length, 0);
  assert.equal(disk.get(dataKey(uid, 'accounts')), JSON.stringify([{ id: 'a1' }]));
  await h.unmount();
});

await test('4. corrupted JSON: not loaded, reported as damaged, stored text untouched', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), CORRUPT);
  const h = await mount({ k: 'transactions', initial: [], uid });
  assert.equal(h.seen.hydrated, false, 'a failed read is never marked as loaded');
  assert.deepEqual(issuesOf(uid).map((i) => [i.key, i.reason, i.storageKey]), [['transactions', 'corrupt', dataKey(uid)]]);
  assert.equal(disk.get(dataKey(uid)), CORRUPT);
  assert.equal(writes.length, 0);
  await h.unmount();
  assert.equal(issuesOf(uid).length, 0, 'the warning goes away with its owner');
});

await test('5. storage read exception: not loaded, reported, nothing written', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  failing.get.add(dataKey(uid));
  const h = await mount({ k: 'transactions', initial: [], uid });
  assert.equal(h.seen.hydrated, false);
  assert.deepEqual(issuesOf(uid).map((i) => i.reason), ['read']);
  assert.equal(writes.length, 0);
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX));
  await h.unmount();
});

await test('6. failed read followed by rerenders: still not loaded, still nothing written', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  failing.get.add(dataKey(uid));
  const h = await mount({ k: 'transactions', initial: [], uid });
  const before = h.seen.renders;
  for (let i = 0; i < 5; i++) await h.rerender({ initial: [] }); // a new [] each time, as screens pass it
  assert.ok(h.seen.renders > before);
  assert.equal(h.seen.hydrated, false);
  assert.equal(writes.length, 0);
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX));
  await h.unmount();
});

await test('7. no empty data is written after a failed read, even when the app tries to change it', async () => {
  for (const kind of ['read', 'corrupt']) {
    const uid = newUser();
    const original = kind === 'corrupt' ? CORRUPT : JSON.stringify(TX);
    disk.set(dataKey(uid), original);
    if (kind === 'read') failing.get.add(dataKey(uid));
    const h = await mount({ k: 'transactions', initial: [], uid });
    const blockedBefore = getStorageHealth().blockedEdits;
    await h.edit((prev) => [NEW, ...prev]); // "add a record"
    await h.edit([]); // "clear everything"
    await h.rerender({});
    assert.equal(disk.get(dataKey(uid)), original, `${kind}: stored value is exactly what it was`);
    assert.deepEqual(writesTo(dataKey(uid)), [], `${kind}: no write reached the key`);
    assert.deepEqual(h.seen.value, [], `${kind}: the refused change is not shown as if it were saved`);
    assert.equal(getStorageHealth().blockedEdits, blockedBefore + 2, `${kind}: each refused change is announced`);
    await h.unmount();
  }
});

await test('Try again after a temporary failure loads the real records and saving works again', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  failing.get.add(dataKey(uid));
  const h = await mount({ k: 'transactions', initial: [], uid });
  assert.equal(h.seen.hydrated, false);
  failing.get.clear(); // storage works again
  await React.act(async () => retryStorage(uid));
  await settle();
  assert.equal(h.seen.hydrated, true);
  assert.deepEqual(h.seen.value, TX);
  assert.equal(issuesOf(uid).length, 0);
  assert.equal(writes.length, 0);
  await h.edit((prev) => [NEW, ...prev]);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), [NEW, ...TX]);
  await h.unmount();
});

await test('Try again that fails again keeps the warning and still writes nothing', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), CORRUPT);
  const h = await mount({ k: 'transactions', initial: [], uid });
  await React.act(async () => retryStorage(uid));
  await settle();
  assert.equal(h.seen.hydrated, false);
  assert.equal(issuesOf(uid).length, 1);
  assert.equal(disk.get(dataKey(uid)), CORRUPT);
  assert.equal(writes.length, 0);
  await h.unmount();
});

await test('recovery: the damaged copy is kept aside unchanged, then the dataset starts again', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), CORRUPT);
  const h = await mount({ k: 'transactions', initial: [], uid });
  let res;
  await React.act(async () => { res = await startFresh(uid); });
  await settle();
  assert.deepEqual(res, { aside: 1, failed: 0 });
  const aside = await listSetAside(uid);
  assert.equal(aside.length, 1);
  assert.equal(disk.get(aside[0]), CORRUPT, 'byte for byte');
  assert.equal(h.seen.hydrated, true);
  assert.deepEqual(h.seen.value, []);
  assert.equal(issuesOf(uid).length, 0);
  await h.edit((prev) => [NEW, ...prev]);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), [NEW]);
  assert.equal(disk.get(aside[0]), CORRUPT);
  await h.unmount();
});

await test('recovery never touches a dataset that only failed to read (its value may be fine)', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  failing.get.add(dataKey(uid));
  const h = await mount({ k: 'transactions', initial: [], uid });
  let res;
  await React.act(async () => { res = await startFresh(uid); });
  await settle();
  assert.deepEqual(res, { aside: 0, failed: 0 });
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX));
  assert.equal(writes.length, 0);
  assert.equal(h.seen.hydrated, false);
  await h.unmount();
});

await test('recovery that cannot keep the damaged copy (storage full) changes nothing', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), CORRUPT);
  failing.set.add((k) => k.includes('__recovery:'));
  const h = await mount({ k: 'transactions', initial: [], uid });
  let res;
  await React.act(async () => { res = await startFresh(uid); });
  await settle();
  assert.deepEqual(res, { aside: 0, failed: 1 });
  assert.equal(disk.get(dataKey(uid)), CORRUPT);
  assert.equal(h.seen.hydrated, false);
  await h.unmount();
});

await test('a healthy screen whose later re-read fails stops saving and keeps what it shows', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  const h = await mount({ k: 'transactions', initial: [], uid });
  assert.equal(h.seen.hydrated, true);
  failing.get.add(dataKey(uid));
  await React.act(async () => { await reloadAll(uid); }); // what a foreground sync / restore does
  await settle();
  assert.equal(h.seen.hydrated, false);
  assert.deepEqual(h.seen.value, TX, 'the screen is not blanked');
  await h.edit([]);
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX));
  assert.equal(writes.length, 0);
  failing.get.clear();
  await React.act(async () => { await reloadAll(uid); });
  await settle();
  assert.equal(h.seen.hydrated, true, 'a later good re-read recovers by itself');
  await h.unmount();
});

await test('switching to a user whose data cannot be read never leaves the previous user on screen', async () => {
  const a = newUser();
  const b = newUser();
  disk.set(dataKey(a), JSON.stringify(TX));
  disk.set(dataKey(b), CORRUPT);
  const h = await mount({ k: 'transactions', initial: [], uid: a });
  assert.deepEqual(h.seen.value, TX);
  await h.rerender({ uid: b });
  assert.equal(h.seen.hydrated, false);
  assert.deepEqual(h.seen.value, []);
  assert.equal(disk.get(dataKey(a)), JSON.stringify(TX));
  assert.equal(disk.get(dataKey(b)), CORRUPT);
  await h.unmount();
});

await test('signed out (no user): defaults, nothing read as an error, nothing written', async () => {
  const h = await mount({ k: 'transactions', initial: [], uid: null });
  await h.edit([NEW]);
  assert.equal(h.seen.hydrated, false);
  assert.equal(writes.length, 0);
  assert.equal(getStorageHealth().issues.length, 0);
  await h.unmount();
});

/* ================= cloud mode: the cloud's copy must not replace an unreadable phone copy ================= */

const cloudWith = (value) => new Map([['transactions', { value, updated_at: '2026-06-01T00:00:00.000Z' }]]);

for (const [kind, arrange] of [
  ['damaged records', (uid) => disk.set(dataKey(uid), CORRUPT)],
  ['unreadable records', (uid) => { disk.set(dataKey(uid), JSON.stringify(TX)); failing.get.add(dataKey(uid)); }],
  ['unreadable sync bookkeeping', (uid) => {
    disk.set(dataKey(uid), JSON.stringify(TX));
    disk.set(dataKey(uid, '__sync:transactions'), JSON.stringify({ base: null, dirty: true, editedAt: '2026-06-02T00:00:00.000Z' }));
    failing.get.add(dataKey(uid, '__sync:transactions'));
  }],
]) {
  await test(`cloud: ${kind} on the phone are not replaced by the cloud's copy`, async () => {
    const uid = newUser();
    arrange(uid);
    const before = new Map(disk);
    setFakeCloud(cloudWith([{ id: 'old-cloud-copy' }]));
    const h = await mount({ k: 'transactions', initial: [], uid });
    assert.equal(h.seen.hydrated, false);
    assert.equal(issuesOf(uid).length, 1);
    assert.deepEqual([...disk], [...before], 'the phone holds exactly what it held');
    assert.equal(writes.length, 0);
    await h.edit([]);
    assert.equal(writes.length, 0);
    await h.unmount();
  });
}

await test('cloud: sending waiting edits does not crash or mark them sent when the phone copy cannot be read', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  disk.set(dataKey(uid, '__sync:transactions'), JSON.stringify({ base: null, dirty: true, editedAt: '2026-06-02T00:00:00.000Z' }));
  failing.get.add(dataKey(uid));
  setFakeCloud(new Map());
  assert.equal(await flushAll(uid), false);
  assert.equal(JSON.parse(disk.get(dataKey(uid, '__sync:transactions'))).dirty, true, 'still waiting to be sent');
});

await test('cloud: signing in downloads the readable parts and leaves an unreadable phone copy alone', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), CORRUPT);
  const docs = cloudWith([{ id: 'old-cloud-copy' }]);
  docs.set('accounts', { value: [{ id: 'a1' }], updated_at: '2026-06-01T00:00:00.000Z' });
  setFakeCloud(docs);
  assert.deepEqual(await initialPull(uid), { count: 2 }); // sign-in is not blocked
  assert.equal(disk.get(dataKey(uid)), CORRUPT);
  assert.deepEqual(writesTo(dataKey(uid)), []);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid, 'accounts'))), [{ id: 'a1' }]);
});

/* ================= backup and restore ================= */

await test('backup refuses to leave unreadable records out silently, and skips damaged copies kept aside', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  disk.set(dataKey(uid, 'accounts'), JSON.stringify([{ id: 'a1' }]));
  disk.set(dataKey(uid, '__recovery:debts@1'), CORRUPT);
  const ok = await collectBackup(uid, '3.8.1');
  assert.deepEqual(Object.keys(ok.keys).sort(), ['accounts', 'transactions']);
  failing.get.add(dataKey(uid));
  await assert.rejects(collectBackup(uid, '3.8.1'), StorageReadError);
  failing.get.clear();
  disk.set(dataKey(uid), CORRUPT);
  await assert.rejects(collectBackup(uid, '3.8.1'), StorageReadError);
});

await test('restore from file: unreadable current data stops the restore before anything is replaced', async () => {
  const uid = newUser();
  disk.set(dataKey(uid, 'accounts'), JSON.stringify([{ id: 'a1' }]));
  disk.set(dataKey(uid), JSON.stringify(TX));
  failing.get.add(dataKey(uid));
  const backup = { app: 'WaKira', format: 1, appVersion: '3.8.0', exportedAt: '', keys: { accounts: [{ id: 'fromFile' }], transactions: [NEW] } };
  await assert.rejects(restoreBackup(uid, backup), StorageReadError);
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX));
  assert.equal(disk.get(dataKey(uid, 'accounts')), JSON.stringify([{ id: 'a1' }]), 'not even the readable parts were replaced');
  assert.equal(writes.length, 0, 'nothing at all was written');
});

await test('restore from file: damaged current data is kept aside as it is, then the restore goes ahead', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), CORRUPT);
  const backup = { app: 'WaKira', format: 1, appVersion: '3.8.0', exportedAt: '', keys: { transactions: [NEW] } };
  assert.equal(await restoreBackup(uid, backup), 1);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), [NEW]);
  const aside = await listSetAside(uid);
  assert.equal(aside.length, 1);
  assert.equal(disk.get(aside[0]), CORRUPT);
});

await test('"Restore older copy": a kept-aside copy that cannot be read is not deleted', async () => {
  const uid = newUser();
  const bak = dataKey(uid, 'transactions.bak');
  disk.set(bak, JSON.stringify(TX));
  failing.get.add(bak);
  assert.equal(await restoreBackups(uid), 0);
  assert.equal(disk.get(bak), JSON.stringify(TX));
  failing.get.clear();
  assert.equal(await restoreBackups(uid), 1);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), TX);
  assert.equal(disk.has(bak), false);
});

/* ================= H2: a save that fails is never passed off as saved ================= */

const unsavedOf = (uid) => getStorageHealth().unsaved.filter((i) => i.userId === uid);
const FULL_ERROR = (k) => k.endsWith(':transactions'); // the fake's write error says "storage is full"

await test('saveJSON no longer hides a failed write: it returns false and reports it, without the value', async () => {
  failing.set.add('flag');
  assert.equal(await saveJSON('flag', { note: 'SECRET-PAYEE' }), false);
  assert.equal(await saveJSON('other', true), true);
  assert.deepEqual(reports.map((r) => [r.op, r.key, r.reason]), [['write', 'flag', 'full']]);
  assert.ok(!JSON.stringify(reports).includes('SECRET'));
});

await test('H2: a change that cannot be saved stays on screen, is listed as not saved, and the app keeps working', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  const h = await mount({ k: 'transactions', initial: [], uid });
  failing.set.add(FULL_ERROR);
  await h.edit((prev) => [NEW, ...prev]);
  assert.deepEqual(h.seen.value, [NEW, ...TX], 'the change is still on screen');
  assert.equal(h.seen.hydrated, true, 'the app stays usable');
  assert.deepEqual(unsavedOf(uid).map((i) => [i.key, i.reason]), [['transactions', 'full']]);
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX), 'what was saved before is unchanged');
  // a further change while storage is still full: still listed once, still nothing lost on screen
  await h.edit((prev) => prev.filter((t) => t.id !== 't2'));
  assert.equal(unsavedOf(uid).length, 1);
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX));
  await h.unmount();
  assert.equal(unsavedOf(uid).length, 0);
});

await test('H2: Try again after room is freed saves the change and clears the notice', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  const h = await mount({ k: 'transactions', initial: [], uid });
  failing.set.add(FULL_ERROR);
  await h.edit((prev) => [NEW, ...prev]);
  assert.equal(unsavedOf(uid).length, 1);
  await React.act(async () => retrySaves(uid)); // still full
  await settle();
  assert.equal(unsavedOf(uid).length, 1);
  failing.set.clear();
  await React.act(async () => retrySaves(uid));
  await settle();
  assert.equal(unsavedOf(uid).length, 0);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), [NEW, ...TX]);
  await h.unmount();
});

await test('H2: the next change after a failed save is written in full (nothing is skipped as "already saved")', async () => {
  const uid = newUser();
  const h = await mount({ k: 'transactions', initial: [], uid });
  failing.set.add(FULL_ERROR);
  await h.edit([NEW]);
  failing.set.clear();
  await h.edit([NEW, TX[0]]);
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), [NEW, TX[0]]);
  assert.equal(unsavedOf(uid).length, 0);
  await h.unmount();
});

await test('H2 cloud: an edit that did not reach storage is not marked as waiting to be sent', async () => {
  const uid = newUser();
  setFakeCloud(new Map());
  failing.set.add(FULL_ERROR);
  assert.deepEqual(await saveKey(uid, 'transactions', [NEW]), { ok: false, reason: 'full' });
  assert.equal(disk.has(dataKey(uid, '__sync:transactions')), false);
  failing.set.clear();
  assert.deepEqual(await saveKey(uid, 'transactions', [NEW]), { ok: true }, 'the same value is written on the next attempt');
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid))), [NEW]);
  assert.equal(JSON.parse(disk.get(dataKey(uid, '__sync:transactions'))).dirty, true);
});

await test('H2 cloud: when the phone cannot store the cloud copy, it keeps its own copy and still opens', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  disk.set(dataKey(uid, '__sync:transactions'), JSON.stringify({ base: 'older', dirty: false, editedAt: 'older' }));
  setFakeCloud(cloudWith([{ id: 'newer-cloud-copy' }]));
  failing.set.add(FULL_ERROR);
  const h = await mount({ k: 'transactions', initial: [], uid });
  assert.equal(h.seen.hydrated, true);
  assert.deepEqual(h.seen.value, TX);
  assert.equal(issuesOf(uid).length, 0, 'not reported as unreadable');
  assert.equal(JSON.parse(disk.get(dataKey(uid, '__sync:transactions'))).base, 'older', 'not recorded as agreed');
  await h.unmount();
});

await test('H2 restore from file: no room to keep the current data aside => nothing is replaced', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  failing.set.add((k) => k.endsWith('.bak'));
  const backup = { app: 'WaKira', format: 1, appVersion: '3.8.0', exportedAt: '', keys: { transactions: [NEW] } };
  await assert.rejects(restoreBackup(uid, backup), (e) => e instanceof StorageWriteError && e.partial === false);
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX));
});

await test('H2 restore from file: a part that cannot be saved is reported, and keeps its current data', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), JSON.stringify(TX));
  failing.set.add((k) => k === dataKey(uid));
  const backup = { app: 'WaKira', format: 1, appVersion: '3.8.0', exportedAt: '', keys: { accounts: [{ id: 'fromFile' }], transactions: [NEW] } };
  await assert.rejects(restoreBackup(uid, backup), (e) => e instanceof StorageWriteError && e.partial === true);
  assert.equal(disk.get(dataKey(uid)), JSON.stringify(TX));
  assert.deepEqual(JSON.parse(disk.get(dataKey(uid, 'accounts'))), [{ id: 'fromFile' }]);
});

await test('H2 "Restore older copy": a copy that cannot be put back is kept', async () => {
  const uid = newUser();
  const bak = dataKey(uid, 'transactions.bak');
  disk.set(bak, JSON.stringify(TX));
  failing.set.add((k) => k === dataKey(uid));
  assert.equal(await restoreBackups(uid), 0);
  assert.equal(disk.get(bak), JSON.stringify(TX));
});

await test('H2: storage use is measured by kind, and the warning levels follow the phone limits', async () => {
  const uid = newUser();
  disk.set(dataKey(uid), 'x'.repeat(1000));
  disk.set(dataKey(uid, 'transactions.base'), 'x'.repeat(400));
  disk.set(dataKey(uid, '__sync:transactions'), 'x'.repeat(50));
  disk.set(dataKey(uid, '__recovery:debts@1'), 'x'.repeat(200));
  disk.set('app:language', '"ms"');
  disk.set(dataKey(uid, 'locked'), 'x'.repeat(9999));
  failing.get.add(dataKey(uid, 'locked'));
  const u = await measureStorage(uid);
  const k = (name) => dataKey(uid, name).length;
  assert.equal(u.records, 1000 + k('transactions'));
  assert.equal(u.copies, 400 + k('transactions.base') + 50 + k('__sync:transactions'));
  assert.equal(u.damaged, 200 + k('__recovery:debts@1'));
  assert.equal(u.total, u.records + u.copies + u.damaged + 'app:language'.length + 4);
  assert.equal(u.unreadable, 1);
  assert.equal(writes.length, 0, 'measuring never writes');
  const MB = 1024 * 1024;
  assert.equal(usageLevel({ total: 1 * MB, largest: 0.5 * MB }, 'android'), 'ok');
  assert.equal(usageLevel({ total: 4.3 * MB, largest: 1 * MB }, 'android'), 'warn');
  assert.equal(usageLevel({ total: 2 * MB, largest: 1.9 * MB }, 'android'), 'critical', 'one value near the 2 MB read limit');
  assert.equal(usageLevel({ total: 5.5 * MB, largest: 1 * MB }, 'android'), 'critical');
  assert.equal(usageLevel({ total: 4.6 * MB, largest: 4 * MB }, 'web'), 'critical');
  assert.equal(usageLevel({ total: 500 * MB, largest: 100 * MB }, 'ios'), 'ok', 'no fixed limit on iPhone');
});

void AsyncStorage;
if (process.exitCode) console.error('\nStorage self-test FAILED');
else console.log(`\nStorage self-test OK (${passed} tests)`);
