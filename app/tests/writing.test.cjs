// node --test app/tests/*.test.cjs — drafts, honest verification, validated restore
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, memoryBackend, validateBackup, USER_EDIT } = require('../../core/store.js');

const fresh = () => createStore(memoryBackend());
const withoutSHA = async (fn) => {
  const d = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
  try { return await fn(); } finally { Object.defineProperty(globalThis, 'crypto', d); }
};

test('drafts are saved apart from originals and keep their start time', async () => {
  const s = fresh();
  const a = await s.saveDraft({ key: 'new:1', title: 'T', body: 'one' });
  const b = await s.saveDraft({ key: 'new:1', title: 'T', body: 'one two' });
  assert.equal(b.startedAt, a.startedAt);
  assert.equal((await s.getDraft('new:1')).body, 'one two');
  assert.equal((await s.sources()).length, 0, 'a draft is not an original');
  assert.equal((await s.saveDraft({ key: 'x', kind: 'collected' })).kind, 'writing', 'a draft is never collected material');
  await s.discardDraft('new:1');
  assert.equal(await s.getDraft('new:1'), undefined);
});

test('verification never claims success it cannot check', async () => {
  const s = fresh();
  const kept = await s.keepSource({ kind: 'writing', title: 'A', body: 'b' });
  assert.equal((await s.verifySource(kept.id)).status, 'intact');
  await withoutSHA(async () => {
    const v = await s.verifySource(kept.id);
    assert.equal(v.status, 'unavailable'); assert.equal(v.intact, null);
    const lan = await s.keepSource({ kind: 'writing', title: 'B', body: 'c' });
    assert.equal(lan.revisions[0].sha256, null);
    assert.equal((await s.verifySource(lan.id)).status, 'unfingerprinted');
  });
});

test('export includes drafts; a copy restores into an empty browser', async () => {
  const a = fresh();
  await a.keepSource({ kind: 'writing', title: 'Essay', body: 'kept' });
  await a.saveDraft({ key: 'new:9', title: 'Unfinished', body: 'half' });
  const dump = JSON.parse(JSON.stringify(await a.exportAll()));
  assert.equal(dump.drafts.length, 1);
  const b = fresh();
  const r = await b.restore(dump);
  assert.equal(r.ok, true); assert.equal(r.added, 1); assert.equal(r.drafts, 1);
  assert.equal(JSON.stringify(await b.sources()), JSON.stringify(await a.sources()));
  assert.equal((await b.getDraft('new:9')).body, 'half');
});

test('invalid or altered copies are rejected and nothing is written', async () => {
  const s = fresh();
  for (const bad of [null, [], { format: 'other' }, { format: 'tangerine/foundation-001', sources: 'x', items: [], links: [], derived: [] }]) {
    assert.equal((await validateBackup(bad)).ok, false);
  }
  const src = fresh();
  await src.keepSource({ kind: 'writing', title: 'A', body: 'true words' });
  const dump = JSON.parse(JSON.stringify(await src.exportAll()));
  dump.sources[0].revisions[0].body = 'altered words';
  dump.sources.push({ id: 'ok', kind: 'note', revisions: [{ n: 1, at: 'x', title: 'Fine', body: 'fine' }] });
  const r = await s.restore(dump);
  assert.equal(r.ok, false); assert.match(r.errors.join(' '), /does not match its fingerprint/);
  assert.equal((await s.sources()).length, 0, 'all or nothing');
  const dup = JSON.parse(JSON.stringify(await src.exportAll()));
  dup.sources.push(dup.sources[0]);
  assert.match((await s.restore(dup)).errors.join(' '), /repeats the id/);
});

test('restore never overwrites: later revisions append, differences sit beside', async () => {
  const s = fresh();
  const mine = await s.keepSource({ kind: 'writing', title: 'Essay', body: 'v1' });
  // A copy taken later, after a second revision elsewhere.
  const other = createStore(memoryBackend());
  await other.restore(JSON.parse(JSON.stringify(await s.exportAll())));
  await other.reviseSource(mine.id, { body: 'v2' }, USER_EDIT);
  const ahead = JSON.parse(JSON.stringify(await other.exportAll()));
  const dry = await s.restore(ahead, { dryRun: true });
  assert.equal(dry.extended, 1);
  assert.equal((await s.getSource(mine.id)).revisions.length, 1, 'a dry run writes nothing');
  await s.restore(ahead);
  assert.deepEqual((await s.getSource(mine.id)).revisions.map((r) => r.body), ['v1', 'v2']);

  // Meanwhile this browser revised differently: the copy's version goes beside it.
  await s.reviseSource(mine.id, { body: 'v3 here' }, USER_EDIT);
  await other.reviseSource(mine.id, { body: 'v3 there' }, USER_EDIT);
  const r = await s.restore(JSON.parse(JSON.stringify(await other.exportAll())));
  assert.equal(r.separate, 1);
  const all = await s.sources();
  assert.equal(all.length, 2);
  assert.deepEqual((await s.getSource(mine.id)).revisions.map((x) => x.body), ['v1', 'v2', 'v3 here']);
  const copy = all.find((x) => x.id !== mine.id);
  assert.equal(copy.restoredFrom, mine.id);
  assert.equal(copy.revisions[2].body, 'v3 there');

  // Restoring the same copy again changes nothing more.
  const again = await s.restore(JSON.parse(JSON.stringify(await s.exportAll())));
  assert.equal(again.added + again.extended + again.separate, 0);
});

test('a differing draft in a copy is added beside the one here', async () => {
  const s = fresh();
  await s.saveDraft({ key: 'new:1', title: 'Essay', body: 'here' });
  const copy = { format: 'tangerine/foundation-001', sources: [], items: [], links: [], derived: [],
    drafts: [{ key: 'new:1', title: 'Essay', body: 'there', savedAt: '2026-11-09T10:00:00Z' }] };
  const r = await s.restore(copy);
  assert.equal(r.draftsSeparate, 1);
  const ds = await s.drafts();
  assert.deepEqual(ds.map((d) => d.body).sort(), ['here', 'there']);
  assert.equal((await s.getDraft('new:1')).body, 'here');
});

test('restoring does not duplicate a link that joins the same two items', async () => {
  const s = fresh();
  const a = await s.addItem({ kind: 'idea', title: 'A', id: 'a' });
  const b = await s.addItem({ kind: 'idea', title: 'B', id: 'b' });
  await s.link(a.id, b.id, 'here');
  const copy = { format: 'tangerine/foundation-001', sources: [], items: [], derived: [],
    links: [{ id: 'other-id', a: 'b', b: 'a', note: 'there', at: 'x' }, { id: 'l2', a: 'a', b: 'c', note: '', at: 'x' }] };
  const r = await s.restore(copy);
  assert.equal(r.links, 1);
  assert.equal((await s.links()).length, 2);
});
