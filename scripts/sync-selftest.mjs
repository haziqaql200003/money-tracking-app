#!/usr/bin/env node
/**
 * Self-test for the sync rules (src/services/sync-core.ts). Run: npm run sync:test
 * Needs Node 22.18+ (it loads the .ts file directly).
 */
import assert from 'node:assert/strict';
import { adoptAll, markEdited, pushIfDirty, reconcile } from '../src/services/sync-core.ts';

// ---- in-memory fakes ----
function makeCloud() {
  const docs = new Map();
  let clock = Date.parse("2026-06-01T00:00:00Z") / 1000;
  const cloud = {
    online: true,
    docs,
    stamp: () => new Date(++clock * 1000).toISOString(),
  };
  cloud.store = {
    async pull(key) {
      if (!cloud.online) throw new Error('offline');
      const d = docs.get(key);
      return d ? { value: structuredClone(d.value), updatedAt: d.updatedAt } : null;
    },
    async push(key, value) {
      if (!cloud.online) throw new Error('offline');
      const updatedAt = cloud.stamp();
      docs.set(key, { value: structuredClone(value), updatedAt });
      return updatedAt;
    },
  };
  return cloud;
}
function makePhone() {
  const data = new Map();
  const meta = new Map();
  return {
    data,
    meta,
    store: {
      async read(k) { return data.has(k) ? structuredClone(data.get(k)) : null; },
      async write(k, v) { data.set(k, structuredClone(v)); },
      async readMeta(k) { return meta.has(k) ? { ...meta.get(k) } : null; },
      async writeMeta(k, m) { meta.set(k, { ...m }); },
    },
  };
}

let passed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}\n${e.stack}`);
    process.exitCode = 1;
  }
};

await test('new phone adopts what the cloud has', async () => {
  const cloud = makeCloud();
  await cloud.store.push('tx', [1, 2, 3]);
  const phone = makePhone();
  const r = await reconcile(phone.store, cloud.store, 'tx');
  assert.deepEqual(r.value, [1, 2, 3]);
  assert.equal(r.source, 'remote');
  assert.equal(phone.meta.get('tx').dirty, false);
});

await test('edit on the phone is uploaded and the phone becomes clean', async () => {
  const cloud = makeCloud();
  const phone = makePhone();
  await markEdited(phone.store, 'tx', [1], new Date().toISOString());
  assert.equal(phone.meta.get('tx').dirty, true);
  assert.equal(await pushIfDirty(phone.store, cloud.store, 'tx'), 'pushed');
  assert.deepEqual(cloud.docs.get('tx').value, [1]);
  assert.equal(phone.meta.get('tx').dirty, false);
  assert.equal(phone.meta.get('tx').base, cloud.docs.get('tx').updatedAt);
});

await test('edit made while the push is in flight stays dirty', async () => {
  const cloud = makeCloud();
  const phone = makePhone();
  await markEdited(phone.store, 'tx', [1], '2026-01-01T00:00:00.000Z');
  const slow = { ...cloud.store, async push(k, v) { const s = await cloud.store.push(k, v); await markEdited(phone.store, 'tx', [1, 2], '2026-01-01T00:00:05.000Z'); return s; } };
  await pushIfDirty(phone.store, slow, 'tx');
  assert.equal(phone.meta.get('tx').dirty, true);
  assert.deepEqual(phone.data.get('tx'), [1, 2]);
  await pushIfDirty(phone.store, cloud.store, 'tx');
  assert.deepEqual(cloud.docs.get('tx').value, [1, 2]);
  assert.equal(phone.meta.get('tx').dirty, false);
});

await test('offline: keeps the phone copy, stays dirty, uploads later', async () => {
  const cloud = makeCloud();
  const phone = makePhone();
  cloud.online = false;
  await markEdited(phone.store, 'tx', ['a'], new Date().toISOString());
  assert.equal(await pushIfDirty(phone.store, cloud.store, 'tx'), 'failed');
  const r = await reconcile(phone.store, cloud.store, 'tx');
  assert.equal(r.source, 'offline');
  assert.deepEqual(r.value, ['a']);
  assert.equal(phone.meta.get('tx').dirty, true);
  cloud.online = true;
  const r2 = await reconcile(phone.store, cloud.store, 'tx');
  assert.equal(r2.source, 'local');
  assert.deepEqual(cloud.docs.get('tx').value, ['a']);
  assert.equal(phone.meta.get('tx').dirty, false);
});

await test('second phone sees the first phone\'s change', async () => {
  const cloud = makeCloud();
  const a = makePhone();
  const b = makePhone();
  await markEdited(a.store, 'tx', ['one'], new Date().toISOString());
  await pushIfDirty(a.store, cloud.store, 'tx');
  await reconcile(b.store, cloud.store, 'tx'); // b downloads
  await markEdited(a.store, 'tx', ['one', 'two'], new Date().toISOString());
  await pushIfDirty(a.store, cloud.store, 'tx');
  const r = await reconcile(b.store, cloud.store, 'tx');
  assert.equal(r.source, 'remote');
  assert.deepEqual(r.value, ['one', 'two']);
});

await test('clean phone with an unchanged cloud does nothing', async () => {
  const cloud = makeCloud();
  const phone = makePhone();
  await markEdited(phone.store, 'k', 1, new Date().toISOString());
  await pushIfDirty(phone.store, cloud.store, 'k');
  const r = await reconcile(phone.store, cloud.store, 'k');
  assert.equal(r.source, 'local');
});

await test('both changed: the newer edit wins (phone newer)', async () => {
  const cloud = makeCloud();
  const a = makePhone();
  const b = makePhone();
  await markEdited(a.store, 'k', 'v1', '2026-01-01T00:00:00.000Z');
  await pushIfDirty(a.store, cloud.store, 'k');
  await reconcile(b.store, cloud.store, 'k');
  // a pushes v2 (server time ~1970 in this fake), b edits later (2099)
  await markEdited(a.store, 'k', 'v2', '2026-01-02T00:00:00.000Z');
  await pushIfDirty(a.store, cloud.store, 'k');
  await markEdited(b.store, 'k', 'v3-b', '2099-01-01T00:00:00.000Z');
  const r = await reconcile(b.store, cloud.store, 'k');
  assert.equal(r.source, 'local');
  assert.equal(cloud.docs.get('k').value, 'v3-b');
});

await test('both changed: the newer edit wins (cloud newer)', async () => {
  const cloud = makeCloud();
  const a = makePhone();
  const b = makePhone();
  await markEdited(a.store, 'k', 'v1', '2026-01-01T00:00:00.000Z');
  await pushIfDirty(a.store, cloud.store, 'k');
  await reconcile(b.store, cloud.store, 'k');
  await markEdited(b.store, 'k', 'old-b', '1999-01-01T00:00:00.000Z'); // b edited long ago (clock way behind)
  await markEdited(a.store, 'k', 'v2', '2026-01-02T00:00:00.000Z');
  await pushIfDirty(a.store, cloud.store, 'k');
  const r = await reconcile(b.store, cloud.store, 'k');
  assert.equal(r.source, 'remote');
  assert.equal(r.value, 'v2');
});

await test('phone data that was never synced does not overwrite the cloud', async () => {
  const cloud = makeCloud();
  await cloud.store.push('k', 'cloud');
  const phone = makePhone();
  await phone.store.write('k', 'stray'); // value but no meta
  const r = await reconcile(phone.store, cloud.store, 'k');
  assert.equal(r.value, 'cloud');
});

await test('imported (migrated) data uploads when the cloud is empty', async () => {
  const cloud = makeCloud();
  const phone = makePhone();
  await phone.store.write('transactions', [{ id: 1 }]);
  await phone.store.writeMeta('transactions', { base: null, dirty: true, editedAt: new Date().toISOString() });
  const r = await reconcile(phone.store, cloud.store, 'transactions');
  assert.equal(r.source, 'local');
  assert.deepEqual(cloud.docs.get('transactions').value, [{ id: 1 }]);
  assert.equal(phone.meta.get('transactions').dirty, false);
});

await test('nothing anywhere stays null and writes nothing', async () => {
  const cloud = makeCloud();
  const phone = makePhone();
  const r = await reconcile(phone.store, cloud.store, 'none');
  assert.equal(r.value, null);
  assert.equal(cloud.docs.size, 0);
});

await test('adoptAll downloads everything but skips unsent edits', async () => {
  const phone = makePhone();
  await markEdited(phone.store, 'b', 'mine', new Date().toISOString());
  const n = await adoptAll(phone.store, [
    { key: 'a', value: 1, updatedAt: '2026-01-01T00:00:00.000Z' },
    { key: 'b', value: 'theirs', updatedAt: '2026-01-01T00:00:00.000Z' },
  ]);
  assert.equal(n, 1);
  assert.equal(phone.data.get('a'), 1);
  assert.equal(phone.data.get('b'), 'mine');
});

await test('a never-synced phone copy is kept aside when the cloud replaces it', async () => {
  const cloud = makeCloud();
  await cloud.store.push('plan_goals', []);
  const phone = makePhone();
  await phone.store.write('plan_goals', [{ id: 'g1' }]); // value but no meta
  const r = await reconcile(phone.store, cloud.store, 'plan_goals');
  assert.deepEqual(r.value, []);
  assert.deepEqual(phone.data.get('plan_goals.bak'), [{ id: 'g1' }]);
});

await test('a normal newer cloud copy does not leave a backup', async () => {
  const cloud = makeCloud();
  const phone = makePhone();
  await phone.store.write('k', 'old');
  const stamp = await cloud.store.push('k', 'old');
  await phone.store.writeMeta('k', { base: stamp, dirty: false, editedAt: stamp });
  await cloud.store.push('k', 'new');
  const r = await reconcile(phone.store, cloud.store, 'k');
  assert.equal(r.value, 'new');
  assert.equal(phone.data.has('k.bak'), false);
});

await test('adoptAll keeps a never-synced phone copy aside', async () => {
  const phone = makePhone();
  await phone.store.write('a', 'mine');
  await adoptAll(phone.store, [{ key: 'a', value: 'theirs', updatedAt: '2026-01-01T00:00:00.000Z' }]);
  assert.equal(phone.data.get('a'), 'theirs');
  assert.equal(phone.data.get('a.bak'), 'mine');
});

console.log(process.exitCode ? '\nSync self-test FAILED' : `\nSync self-test OK (${passed} tests)`);
