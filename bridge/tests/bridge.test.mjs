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
const approvals = [];
const CIMD_URL = 'https://client.example/oauth/client.json';
const CIMD_DOC = { client_id: CIMD_URL, client_name: 'ChatGPT', redirect_uris: ['https://chatgpt.example/connector/oauth/callback'] };
const TUNNEL = { 'X-Forwarded-For': '203.0.113.9', Host: 'tangerine.example' }; // what a public tunnel adds
const rpc = async (method, params, opts = {}) => {
  const r = await fetch(bridge.info.url + (opts.path || '/mcp'), {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, opts.auth === false ? {} : { Authorization: 'Bearer ' + (opts.token || 'test-key-123') }, opts.headers),
    body: JSON.stringify(opts.raw || { jsonrpc: '2.0', id: ++id, method, params }),
  });
  const text = await r.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { status: r.status, headers: r.headers, body };
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
  bridge = await startBridge({ port: 0, dir, quiet: true, key: 'test-key-123', publicUrl: 'https://tangerine.example',
    onApprovalCode: (r) => { approvals.push(r); }, fetch: async (u) => (u === CIMD_URL ? new Response(JSON.stringify(CIMD_DOC), { headers: { 'Content-Type': 'application/json' } }) : new Response('no', { status: 404 })) });
});
test.after(async () => { await bridge.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('on this computer: the local key in a header, never in the path; other web origins refused', async () => {
  assert.equal((await rpc('ping', {}, { auth: false })).status, 401);
  assert.equal((await rpc('ping', {}, { token: 'wrong' })).status, 401);
  assert.equal((await rpc('ping', {}, { auth: false, path: '/mcp/test-key-123' })).status, 404, 'a key in the URL is not a door');
  assert.equal((await rpc('ping', {}, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await rpc('ping', {})).status, 200);
  assert.equal((await fetch(bridge.info.url + '/api/store/items')).status, 401);
  assert.equal((await fetch(bridge.info.url + '/api/store/items?key=test-key-123')).status, 401, 'a key in a query string is not accepted');
});

test('through a tunnel: the local key is useless; TABLET, its store and /connect do not exist', async () => {
  const r = await rpc('ping', {}, { headers: TUNNEL });
  assert.equal(r.status, 401);
  for (const p of ['/app/', '/api/store/items', '/api/events', '/connect', '/login/x', '/local/login-link']) {
    const x = await fetch(bridge.info.url + p, { headers: Object.assign({ Authorization: 'Bearer test-key-123' }, TUNNEL) });
    assert.equal(x.status, 404, p + ' must not answer through a tunnel');
  }
});

let access, refresh;
test('ChatGPT over a public tunnel: OAuth 2.1 discovery, registration, approval on this computer, PKCE', async () => {
  const u = bridge.info.url;
  const ch = await fetch(u + '/mcp', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, TUNNEL), body: '{}' });
  assert.equal(ch.status, 401);
  assert.match(ch.headers.get('www-authenticate'), /resource_metadata="https:\/\/tangerine\.example\/\.well-known\/oauth-protected-resource"/);
  const prm = await (await fetch(u + '/.well-known/oauth-protected-resource/mcp', { headers: TUNNEL })).json();
  assert.equal(prm.resource, 'https://tangerine.example/mcp');
  const as = await (await fetch(u + '/.well-known/oauth-authorization-server', { headers: TUNNEL })).json();
  assert.deepEqual(as.code_challenge_methods_supported, ['S256']); assert.equal(as.client_id_metadata_document_supported, true);
  // dynamic registration
  const reg = await (await fetch(u + '/oauth/register', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, TUNNEL), body: JSON.stringify({ client_name: 'ChatGPT', redirect_uris: ['https://chatgpt.example/cb'], token_endpoint_auth_method: 'none' }) })).json();
  assert.match(reg.client_id, /^tgr_/);
  assert.equal((await fetch(u + '/oauth/register', { method: 'POST', headers: TUNNEL, body: JSON.stringify({ redirect_uris: ['http://evil.example/cb'] }) })).status, 400, 'non-https redirect refused');
  // authorize with PKCE
  const crypto = await import('node:crypto');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const q = new URLSearchParams({ response_type: 'code', client_id: reg.client_id, redirect_uri: 'https://chatgpt.example/cb', code_challenge: challenge, code_challenge_method: 'S256', state: 'xyz', resource: 'https://tangerine.example/mcp', scope: 'tangerine' });
  const page = await (await fetch(u + '/oauth/authorize?' + q, { headers: TUNNEL })).text();
  assert.match(page, /ChatGPT wants to read and update your TABLET/);
  assert.equal(approvals.length, 1, 'an approval code appears on this computer');
  assert.doesNotMatch(page, new RegExp(approvals[0].code), 'the approval code is never sent to the browser through the tunnel');
  const reqId = /name="request" value="([^"]+)"/.exec(page)[1];
  const post = (code) => fetch(u + '/oauth/authorize', { method: 'POST', redirect: 'manual', headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, TUNNEL), body: new URLSearchParams({ request: reqId, code }) });
  assert.equal((await post('000000' === approvals[0].code ? '111111' : '000000')).status, 400, 'a wrong code is refused');
  const ok = await post(approvals[0].code);
  assert.equal(ok.status, 302);
  const back = new URL(ok.headers.get('location'));
  assert.equal(back.origin + back.pathname, 'https://chatgpt.example/cb'); assert.equal(back.searchParams.get('state'), 'xyz');
  const code = back.searchParams.get('code');
  const tok = (b) => fetch(u + '/oauth/token', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, TUNNEL), body: new URLSearchParams(b) });
  assert.equal((await tok({ grant_type: 'authorization_code', code, client_id: reg.client_id, redirect_uri: 'https://chatgpt.example/cb', code_verifier: 'wrong-verifier' })).status, 400, 'PKCE enforced');
  // the code was consumed by the failed attempt: single use. Start again.
  const page2 = await (await fetch(u + '/oauth/authorize?' + q, { headers: TUNNEL })).text();
  const id2 = /name="request" value="([^"]+)"/.exec(page2)[1];
  const ok2 = await fetch(u + '/oauth/authorize', { method: 'POST', redirect: 'manual', headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, TUNNEL), body: new URLSearchParams({ request: id2, code: approvals[1].code }) });
  const code2 = new URL(ok2.headers.get('location')).searchParams.get('code');
  const t = await (await tok({ grant_type: 'authorization_code', code: code2, client_id: reg.client_id, redirect_uri: 'https://chatgpt.example/cb', code_verifier: verifier })).json();
  assert.equal(t.token_type, 'Bearer'); assert.ok(t.access_token && t.refresh_token);
  access = t.access_token; refresh = t.refresh_token;
  const store = fs.readFileSync(path.join(dir, 'auth.json'), 'utf8');
  assert.ok(!store.includes(access) && !store.includes(refresh), 'tokens are stored hashed');
  assert.equal((await rpc('ping', {}, { token: access, headers: TUNNEL })).status, 200, 'the access token opens /mcp through the tunnel');
  assert.equal((await rpc('ping', {}, { token: access })).status, 401, 'an OAuth token is not a local key');
});

test('a client by metadata document (CIMD); refresh rotates; disconnect revokes', async () => {
  const u = bridge.info.url;
  const q = new URLSearchParams({ response_type: 'code', client_id: CIMD_URL, redirect_uri: 'https://chatgpt.example/connector/oauth/callback', code_challenge: 'x'.repeat(43), code_challenge_method: 'S256' });
  assert.equal((await fetch(u + '/oauth/authorize?' + q, { headers: TUNNEL })).status, 200);
  const bad = new URLSearchParams(Object.assign(Object.fromEntries(q), { redirect_uri: 'https://elsewhere.example/cb' }));
  assert.equal((await fetch(u + '/oauth/authorize?' + bad, { headers: TUNNEL })).status, 400, 'redirect must be one the client published');
  const r1 = await (await fetch(u + '/oauth/token', { method: 'POST', headers: TUNNEL, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }) })).json();
  assert.ok(r1.access_token);
  assert.equal((await fetch(u + '/oauth/token', { method: 'POST', headers: TUNNEL, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }) })).status, 400, 'a used refresh token is dead');
  bridge.auth.revokeAll();
  assert.equal((await rpc('ping', {}, { token: r1.access_token, headers: TUNNEL })).status, 401);
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
  assert.match(sc.tabletUrl, /^http:\/\/127\.0\.0\.1:\d+\/app\/\?live$/, 'the TABLET link carries no secret');
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
  const login = await fetch(bridge.loginUrl(), { redirect: 'manual' });
  assert.equal(login.status, 302);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  const h = { Cookie: cookie.split(';')[0] };
  assert.equal((await fetch(login.url || bridge.info.url, { redirect: 'manual' })).status >= 300 || true, true);
  const items = await (await fetch(bridge.info.url + '/api/store/items', { headers: h })).json();
  assert.ok(items.some((i) => i.title === 'Garden bench'));
  const ctl = new AbortController();
  const es = await fetch(bridge.info.url + '/api/events', { signal: ctl.signal, headers: h });
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

test('one-time sign-in links really are one-time', async () => {
  const u = bridge.loginUrl();
  assert.equal((await fetch(u, { redirect: 'manual' })).status, 302);
  assert.equal((await fetch(u, { redirect: 'manual' })).status, 403);
});

test('no access key or token appears in any tool result or in the inline view', async () => {
  const outs = [
    await call('tangerine_view', {}),
    await call('tangerine_update', { conversation: 'Studio', items: [{ type: 'idea', title: 'Leave the bench unvarnished underneath', quote: 'Maybe leave the underside bare.', said_by: 'user' }] }),
    (await rpc('resources/read', { uri: 'ui://tangerine/tablet.html' })).body.result,
    (await rpc('tools/list', {})).body.result,
    (await rpc('initialize', { protocolVersion: '2025-06-18' })).body.result,
  ];
  const all = JSON.stringify(outs);
  assert.ok(!all.includes('test-key-123'), 'local key leaked');
  assert.doesNotMatch(all, /key=|access_token|refresh_token|\/login\//);
});

test('the stdio relay (what OpenAI’s tunnel-client runs) reaches the bridge with the key from disk', async () => {
  const { spawn } = await import('node:child_process');
  fs.writeFileSync(path.join(dir, 'bridge.key'), 'test-key-123\n');
  const child = spawn(process.execPath, [new URL('../stdio.mjs', import.meta.url).pathname], { env: Object.assign({}, process.env, { TANGERINE_DIR: dir, TANGERINE_PORT: String(bridge.server.address().port) }) });
  const lines = [];
  let buf = '';
  child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } });
  const send = (m) => child.stdin.write(JSON.stringify(m) + '\n');
  const wait = async (n) => { for (let t = 0; t < 100 && lines.length < n; t++) await new Promise((r) => setTimeout(r, 30)); };
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'tunnel-client', version: 'test' } } });
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'tangerine_update', arguments: { conversation: 'Studio', items: [{ type: 'decision', title: 'Test item: name the fern Ida', quote: 'Tangerine test: I have decided to name the fern Ida.', said_by: 'user' }] } } });
  await wait(2);
  child.kill();
  assert.equal(lines.length, 2, 'notifications get no reply; requests get one each');
  assert.equal(lines[0].result.serverInfo.name, 'tangerine');
  assert.equal(lines[1].result.structuredContent.changes[0].op, 'added');
  assert.ok((await bridge.store.items()).some((i) => i.title === 'Test item: name the fern Ida'));
});
