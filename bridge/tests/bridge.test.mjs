// node --test bridge/tests/
// Drives the bridge over HTTP the way ChatGPT does: MCP JSON-RPC to /mcp/<key>.
// Fixtures are fictional (this repository is public).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startBridge } from '../server.mjs';

let bridge, dir, id = 0;
const rpc = async (method, params, opts = {}) => {
  const r = await fetch(bridge.info.url + (opts.path || '/mcp/' + bridge.info.key), {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, opts.headers),
    body: JSON.stringify(opts.raw || { jsonrpc: '2.0', id: ++id, method, params }),
  });
  return { status: r.status, headers: r.headers, body: r.status === 202 ? null : await r.json() };
};
const call = async (name, args) => (await rpc('tools/call', { name, arguments: args })).body.result;

const FIRST = {
  conversation: 'Studio',
  items: [
    { type: 'project', title: 'Garden bench', quote: 'I want to build a garden bench from the old oak boards.', said_by: 'user' },
    { type: 'person', title: 'Marta Ilić', quote: 'my neighbour Marta Ilić has a planer I can borrow', said_by: 'user', related: ['Garden bench'] },
    { type: 'decision', title: 'Oil finish, not varnish', quote: "I've decided on an oil finish, not varnish.", said_by: 'user', related: ['Garden bench'] },
    { type: 'action', title: 'Ask Marta for the planer', quote: "I'll ask Marta for the planer on Saturday.", said_by: 'user', related: ['Marta Ilić', 'Garden bench'], when: 'on Saturday' },
    { type: 'action', title: 'Sketch the joinery at full size', quote: 'You could sketch the joinery at full size first.', said_by: 'assistant', related: ['Garden bench'] },
    { type: 'question', title: 'Mortise and tenon, or dowels?', quote: 'Should the legs be mortise and tenon, or dowels?', said_by: 'user', related: ['Garden bench'] },
  ],
};

test.before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tangerine-bridge-'));
  bridge = await startBridge({ port: 0, dir, quiet: true, key: 'test-key-123' });
});
test.after(async () => { await bridge.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('the endpoint refuses anyone without the key, and other web origins', async () => {
  assert.equal((await rpc('ping', {}, { path: '/mcp/wrong' })).status, 401);
  assert.equal((await rpc('ping', {}, { path: '/mcp' })).status, 401);
  assert.equal((await rpc('ping', {}, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await rpc('ping', {}, { path: '/mcp', headers: { Authorization: 'Bearer test-key-123' } })).status, 200);
  assert.equal((await fetch(bridge.info.url + '/api/store/items')).status, 401);
});

test('initialize: MCP over Streamable HTTP, with the MCP Apps extension', async () => {
  const r = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] } } }, clientInfo: { name: 'test-host', version: '1' } });
  assert.equal(r.status, 200);
  assert.ok(r.headers.get('mcp-session-id'));
  assert.equal(r.body.result.protocolVersion, '2025-06-18');
  assert.ok(r.body.result.capabilities.tools);
  assert.match(r.body.result.instructions, /cannot read this conversation/);
  assert.equal((await rpc(null, null, { raw: { jsonrpc: '2.0', method: 'notifications/initialized' } })).status, 202);
});

test('tools: update and view for the model; undo and keep for the inline view only', async () => {
  const { tools } = (await rpc('tools/list', {})).body.result;
  const t = Object.fromEntries(tools.map((x) => [x.name, x]));
  assert.deepEqual(Object.keys(t).sort(), ['tangerine_keep', 'tangerine_undo', 'tangerine_update', 'tangerine_view']);
  assert.equal(t.tangerine_view.annotations.readOnlyHint, true);
  assert.equal(t.tangerine_update.annotations.readOnlyHint, false);
  for (const n of Object.keys(t)) assert.equal(t[n]._meta.ui.resourceUri, 'ui://tangerine/tablet.html');
  assert.deepEqual(t.tangerine_undo._meta.ui.visibility, ['app']);
  assert.match(t.tangerine_update.description, /verbatim/);
  assert.deepEqual(t.tangerine_update.inputSchema.properties.items.items.properties.said_by.enum, ['user', 'assistant']);
});

test('the inline view is an MCP Apps resource with no outside connections', async () => {
  const { contents } = (await rpc('resources/read', { uri: 'ui://tangerine/tablet.html' })).body.result;
  assert.equal(contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.match(contents[0].text, /ui\/initialize/);
  assert.match(contents[0].text, /ui\/notifications\/tool-result/);
  assert.doesNotMatch(contents[0].text, /<script[^>]+src=|<link[^>]+href=|https?:\/\/(?!www\.w3\.org)/);
  assert.deepEqual(contents[0]._meta.ui.csp, { connectDomains: [], resourceDomains: [] });
});

let first;
test('an update: what you said goes on TABLET; what ChatGPT suggested waits', async () => {
  first = await call('tangerine_update', FIRST);
  assert.ok(!first.isError);
  const sc = first.structuredContent;
  const by = (op) => sc.changes.filter((c) => c.op === op).map((c) => c.title).sort();
  assert.deepEqual(by('added'), ['Ask Marta for the planer', 'Garden bench', 'Marta Ilić', 'Mortise and tenon, or dowels?', 'Oil finish, not varnish'].sort());
  assert.deepEqual(by('suggested'), ['Sketch the joinery at full size']);
  assert.match(first.content[0].text, /5 added, 1 held as suggestions/);
  const items = await bridge.store.items();
  const act = items.find((i) => i.title === 'Ask Marta for the planer');
  assert.equal(act.when, 'on Saturday'); assert.equal(act.basis, 'you'); assert.equal(act.origin, 'conversation');
  assert.equal(act.evidence[0].quote, "I'll ask Marta for the planer on Saturday.");
  const links = await bridge.store.links();
  const bench = items.find((i) => i.title === 'Garden bench');
  assert.ok(links.some((l) => [l.a, l.b].includes(act.id) && [l.a, l.b].includes(bench.id)), 'action linked to its project');
  const src = (await bridge.store.sources())[0];
  assert.equal(src.kind, 'conversation'); assert.equal(src.conversation.via, 'chatgpt-app');
  assert.match(src.provenance, /did not see the full conversation/);
  assert.equal(sc.next[0].title, 'Ask Marta for the planer');
  assert.match(sc.tabletUrl, /\/app\/\?live&key=test-key-123$/);
});

test('a later update in the same conversation updates, completes and re-focuses — without duplicates', async () => {
  const r = await call('tangerine_update', { conversation: 'Studio', items: [
    { type: 'action', title: 'Ask Marta for the planer', quote: 'Marta said yes, I picked up the planer this morning.', said_by: 'user', done: true },
    { type: 'project', title: 'Garden bench', quote: 'The bench is the one thing this week.', said_by: 'user', now: true },
  ] });
  const ops = r.structuredContent.changes.map((c) => c.op + ':' + c.title).sort();
  assert.deepEqual(ops, ['done:Ask Marta for the planer', 'updated:Garden bench']);
  const items = await bridge.store.items();
  assert.equal(items.filter((i) => i.title === 'Garden bench').length, 1);
  assert.equal(items.find((i) => i.title === 'Ask Marta for the planer').status, 'done');
  assert.equal(items.find((i) => i.now).title, 'Garden bench');
  assert.equal(r.structuredContent.now.title, 'Garden bench');
});

test('undo from the inline view: a new card comes off; an update gives back only what it added', async () => {
  const q = first.structuredContent.changes.find((c) => c.title === 'Mortise and tenon, or dowels?');
  const r = await call('tangerine_undo', { proposalId: q.proposalId });
  assert.ok(!r.isError);
  assert.ok(!(await bridge.store.items()).some((i) => i.title === q.title));
  const last = (await bridge.store.proposals()).filter((p) => p.state === 'accepted').pop();
  const done = (await bridge.store.proposals()).find((p) => p.title === 'Ask Marta for the planer' && p.state === 'accepted' && !p.created);
  await call('tangerine_undo', { proposalId: done.id });
  const act = (await bridge.store.items()).find((i) => i.title === 'Ask Marta for the planer');
  assert.equal(act.status, 'open', 'undoing "done" reopens it');
  assert.equal(act.evidence.length, 1, 'only the evidence that update added is removed');
  assert.ok(last);
});

test('keep a suggestion after all', async () => {
  const s = first.structuredContent.changes.find((c) => c.op === 'suggested');
  const r = await call('tangerine_keep', { proposalId: s.proposalId });
  assert.ok(!r.isError);
  const it = (await bridge.store.items()).find((i) => i.title === 'Sketch the joinery at full size');
  assert.equal(it.basis, 'chatgpt', 'still labelled as ChatGPT’s suggestion');
});

test('a malformed update is refused with reasons ChatGPT can fix, and writes nothing', async () => {
  const before = (await bridge.store.sources()).length;
  const r = await call('tangerine_update', { items: [{ type: 'task', title: '', quote: 'hi', said_by: 'me' }] });
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /type must be one of[\s\S]*quote is required[\s\S]*said_by/);
  assert.equal((await bridge.store.sources()).length, before);
});

test('view: the current picture, readable by the model and the inline view', async () => {
  const r = await call('tangerine_view', {});
  assert.equal(r.structuredContent.mode, 'view');
  assert.match(r.content[0].text, /NOW: Garden bench/);
  assert.match(r.content[0].text, /PROJECTS: Garden bench/);
  assert.equal(r.structuredContent.counts.project, 1);
});

test('TABLET reads the same store, and hears about changes as they happen', async () => {
  const h = { 'X-Tangerine-Key': 'test-key-123' };
  const items = await (await fetch(bridge.info.url + '/api/store/items', { headers: h })).json();
  assert.ok(items.some((i) => i.title === 'Garden bench'));
  const ctl = new AbortController();
  const es = await fetch(bridge.info.url + '/api/events?key=test-key-123', { signal: ctl.signal });
  const reader = es.body.getReader();
  let seen = '';
  const got = (async () => { while (!/event: change/.test(seen)) { const { value } = await reader.read(); seen += new TextDecoder().decode(value); } })();
  await call('tangerine_update', { conversation: 'Studio', items: [{ type: 'idea', title: 'Carve the date under the seat', quote: 'Maybe I carve the date under the seat.', said_by: 'user' }] });
  await got; ctl.abort();
  assert.match(seen, /event: change/);
  assert.equal((await fetch(bridge.info.url + '/app/tests/prototype.e2e.cjs')).status, 404, 'tests are not served');
  assert.equal((await fetch(bridge.info.url + '/private/bridge/tangerine-store.json')).status, 404, 'the store file is not served');
});

test('backfill from the export: once, then only what is new; it merges with what ChatGPT relayed', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const Capture = require('../../core/capture.js');
  const Demo = require('../../app/demo.js');
  const turns = Capture.parseText(Demo.SAMPLE_CONVERSATION).map((t, i) => ({ ...t, t: new Date(Date.UTC(2026, 10, 1, 9, i)).toISOString() }));
  const T = bridge.tangerine;
  const r1 = await T.backfill({ turns, thread: 'Studio', title: 'Studio (export)' });
  assert.equal(r1.kept, 11);
  assert.ok(r1.changes.filter((c) => c.op === 'added').length >= 8);
  assert.ok(r1.changes.some((c) => c.op === 'suggested' && c.said === 'chatgpt'), 'ChatGPT’s suggestions wait');
  const src = await bridge.store.getSource(r1.sourceId);
  assert.equal(src.conversation.via, 'export'); assert.equal(src.madeOn, '2026-11-01', 'the export’s own dates are kept');
  const r2 = await T.backfill({ turns: turns.concat({ role: 'user', text: 'I need to book the van for Saturday.', t: null }), thread: 'Studio', title: 'Studio (export)' });
  assert.equal(r2.kept, 1); assert.equal(r2.seen, 11);
  assert.ok(r2.changes.some((c) => c.op === 'added' && c.title === 'Book the van for Saturday'));
});
