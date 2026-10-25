// Run: node experiments/001-fear/tests/store.test.js
// Proves the nonnegotiable rule: nothing but an explicit edit or delete from the person changes their material.
const assert = require('assert');
const HavenStore = require('../store.js');
const HavenConnect = require('../connect.js');

(async () => {
  const store = HavenStore.createStore(HavenStore.memoryBackend());
  const original = 'I have drafted the letter four times.\n\n  Is caution   fear in better clothes?';
  const e = await store.add('writing', { body: original });

  // Kept byte for byte, including spacing.
  assert.strictEqual(store.current(await store.get(e.id)).body, original);

  // What the app reads is frozen; nothing downstream can mutate it in place.
  const read = await store.get(e.id);
  assert.throws(() => { 'use strict'; read.revisions[0].body = 'changed'; });
  assert.strictEqual(store.current(await store.get(e.id)).body, original);

  // Connection suggestions read text and return references only.
  const before = JSON.stringify(await store.list());
  const s = HavenConnect.suggest({ id: 'mt-25-25', text: 'And I was afraid, and went and hid thy talent in the earth', themes: ['withholding'], keywords: 'caution' }, await store.list(), (x) => store.current(x).body, []);
  assert.ok(s.length === 1 && s[0].why.themes.length >= 1, 'expected a suggestion with reasons');
  assert.strictEqual(JSON.stringify(await store.list()), before);

  // Revision and deletion require the person's explicit authority.
  await assert.rejects(store.revise(e.id, { body: 'tidied' }));
  await assert.rejects(store.revise(e.id, { body: 'tidied' }, 'assistant'));
  await assert.rejects(store.remove(e.id));
  assert.strictEqual((await store.get(e.id)).revisions.length, 1);

  // An explicit edit adds a revision; the earlier words remain.
  const edited = await store.revise(e.id, { body: 'My new words.' }, HavenStore.USER_EDIT);
  assert.strictEqual(edited.revisions.length, 2);
  assert.strictEqual(edited.revisions[0].body, original);

  // Collected passages keep the source's text and cannot be revised at all.
  const c = await store.add('collected', { body: 'Fear thou not; for I am with thee' }, { anchor: 'isa-41-10' });
  await assert.rejects(store.revise(c.id, { body: 'x' }, HavenStore.USER_EDIT));

  // Import never overwrites an existing entry.
  const dump = await store.exportAll();
  dump.entries[0] = Object.assign({}, dump.entries[0], { revisions: [{ at: 'x', body: 'overwritten' }] });
  assert.strictEqual(await store.importAll(dump), 0);
  assert.strictEqual(store.current(await store.get(e.id)).body, 'My new words.');

  // Deletion only on request, and it takes its connections with it.
  await store.connect('mt-25-25', e.id, 'mine');
  await store.remove(e.id, HavenStore.USER_DELETE);
  assert.strictEqual(await store.get(e.id), undefined);
  assert.strictEqual((await store.links()).length, 0);

  console.log('store: all immutability checks passed');
})().catch((err) => { console.error(err); process.exit(1); });
