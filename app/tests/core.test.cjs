// node --test app/tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, memoryBackend, USER_EDIT, USER_DELETE } = require('../../core/store.js');
const Index = require('../../core/index.js');
const Demo = require('../demo.js');

const fresh = () => createStore(memoryBackend());

test('an original is fingerprinted and returned frozen', async () => {
  const s = fresh();
  const src = await s.keepSource({ kind: 'writing', title: 'A', body: 'First words.' });
  assert.match(src.revisions[0].sha256, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(src) && Object.isFrozen(src.revisions[0]));
  assert.throws(() => { src.revisions[0].body = 'changed'; });
  assert.equal((await s.getSource(src.id)).revisions[0].body, 'First words.');
  assert.equal((await s.verifySource(src.id)).intact, true);
});

test('revision requires the author token and keeps every earlier version', async () => {
  const s = fresh();
  const src = await s.keepSource({ kind: 'note', title: 'N', body: 'one' });
  await assert.rejects(s.reviseSource(src.id, { body: 'two' }));
  await assert.rejects(s.reviseSource(src.id, { body: 'two' }, 'ai'));
  const r = await s.reviseSource(src.id, { body: 'two' }, USER_EDIT);
  assert.deepEqual(r.revisions.map((x) => x.body), ['one', 'two']);
  assert.equal((await s.verifySource(src.id)).intact, true);
});

test('collected material can never be revised; deletion needs the author', async () => {
  const s = fresh();
  const q = await s.keepSource({ kind: 'collected', author: 'Thoreau', body: 'quoted' });
  await assert.rejects(s.reviseSource(q.id, { body: 'x' }, USER_EDIT), /exactly as found/);
  await assert.rejects(s.deleteSource(q.id));
  await s.deleteSource(q.id, USER_DELETE);
  assert.equal(await s.getSource(q.id), undefined);
});

test('the whiteboard references sources and never writes into them', async () => {
  const s = fresh();
  const src = await s.keepSource({ kind: 'writing', title: 'T', body: 'B' });
  const pin = await s.addItem({ kind: 'source', sourceId: src.id, x: 10, y: 10 });
  assert.equal(pin.title, null);
  await s.updateItem(pin.id, { title: 'renamed', x: 99 });
  const after = (await s.items())[0];
  assert.equal(after.title, null);
  assert.equal(after.x, 99);
  const before = JSON.stringify(await s.getSource(src.id));
  const p = await s.addItem({ kind: 'project', title: 'P' });
  await s.link(p.id, pin.id, 'note');
  await s.addBookmark(p.id, { stands: 'a', question: 'b', next: 'c' });
  await s.setNow(p.id);
  await s.removeItem(pin.id);
  assert.equal(JSON.stringify(await s.getSource(src.id)), before);
  assert.equal((await s.links()).length, 0, 'links to a removed item go with it');
  await assert.rejects(s.addItem({ kind: 'source', sourceId: 'missing' }));
});

test('bookmarks are append-only and only one item is now', async () => {
  const s = fresh();
  const a = await s.addItem({ kind: 'project', title: 'A', bookmark: { next: 'first' } });
  const b = await s.addItem({ kind: 'project', title: 'B' });
  await s.addBookmark(a.id, { next: 'second' });
  await s.setNow(a.id); await s.setNow(b.id);
  const items = await s.items();
  assert.deepEqual(items[0].bookmarks.map((x) => x.next), ['first', 'second']);
  assert.deepEqual(items.map((i) => i.now), [false, true]);
});

test('import never overwrites what is kept', async () => {
  const s = fresh();
  const src = await s.keepSource({ kind: 'writing', title: 'Mine', body: 'original' });
  const dump = await s.exportAll();
  dump.sources[0].revisions[0].body = 'tampered';
  dump.sources.push({ ...dump.sources[0], id: 'other' });
  const r = await s.importAll(dump);
  assert.equal(r.added, 1);
  assert.equal((await s.getSource(src.id)).revisions[0].body, 'original');
});

test('index suggestions are explained, read-only and dismissable', async () => {
  const s = fresh();
  await Demo.install(s, new Date('2026-11-08T12:00:00Z'));
  const sources = await s.sources(); const items = await s.items();
  const snapshot = JSON.stringify(sources);
  const project = items.find((i) => i.title === 'Notebook, 80 sheets');
  const rel = Index.related(project, sources, items);
  assert.ok(rel.length > 0);
  assert.equal(rel[0].sourceId, 'demo-src-5');
  assert.match(rel[0].reason, /^Shared words: /);
  await s.dismiss(rel[0].key);
  const again = Index.related(project, sources, items, { dismissed: await s.dismissed() });
  assert.ok(!again.some((r) => r.key === rel[0].key));
  assert.equal(JSON.stringify(await s.sources()), snapshot);
});

test('return finds the same day in an earlier year; demonstration is removable', async () => {
  const s = fresh();
  const today = new Date('2026-11-08T12:00:00Z');
  await Demo.install(s, today);
  const day = Index.onThisDay(await s.sources(), today);
  assert.deepEqual(day.map((x) => x.id), ['demo-src-1']);
  assert.equal(Index.longestResting(await s.items()).title, 'Notebook, 80 sheets');
  assert.ok(Index.search('dial', await s.sources(), await s.items()).some((h) => h.id === 'demo-src-2'));
  await s.keepSource({ kind: 'note', title: 'Mine', body: 'kept' });
  await s.removeDemonstration();
  assert.equal((await s.sources()).length, 1);
  assert.equal((await s.items()).length, 0);
});
