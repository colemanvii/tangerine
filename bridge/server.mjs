#!/usr/bin/env node
/*
 * Tangerine bridge — a ChatGPT app (MCP server) and the live TABLET, on the
 * person's own machine.
 *
 *   node bridge/server.mjs            → http://127.0.0.1:4330
 *
 * What it serves
 *   POST /mcp/<key>        MCP over Streamable HTTP (JSON responses). This is
 *                          the URL given to ChatGPT (developer mode → create app/
 *                          connector), through a tunnel the person chooses.
 *   GET  /app/?live        TABLET, reading and writing this bridge's store,
 *                          updating within a second of each relay.
 *   /api/store/…, /api/events   the store and change stream TABLET uses (key required).
 *
 * What it does not do
 *   It cannot read ChatGPT conversations, history or memory. It receives only
 *   what ChatGPT sends in a tool call, and keeps it in private/ on this machine.
 *   No dependency, no telemetry, nothing sent anywhere.
 *
 * The key is a shared secret in the URL: enough for a personal prototype behind
 * a tunnel, not a substitute for OAuth in anything shared. Bind stays 127.0.0.1.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { fileBackend } from './file-store.mjs';
import { createTangerine, ITEM_TYPES } from './tangerine.mjs';

const require = createRequire(import.meta.url);
const { createStore } = require('../core/store.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDGET_URI = 'ui://tangerine/tablet.html';
const WIDGET_MIME = 'text/html;profile=mcp-app';
const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

export function keyFile(dir) { return path.join(dir, 'bridge.key'); }
export function loadKey(dir) {
  const f = keyFile(dir);
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  fs.mkdirSync(dir, { recursive: true });
  const k = crypto.randomBytes(18).toString('base64url');
  fs.writeFileSync(f, k + '\n', { mode: 0o600 });
  return k;
}

const UPDATE_DESCRIPTION = [
  'Keep the person’s world current in Tangerine, their TABLET of projects, people, ideas, decisions, next actions and open questions drawn from this conversation.',
  'Call it, without being asked, at natural pauses: when the person decides something, commits to doing something, finishes something, starts or mentions a project, names a person who matters to their work, has an idea worth keeping, or leaves a question open. Also call it whenever they say “update Tangerine”, “add that to TABLET” or similar.',
  'Send only what is new or changed since your last update, in one call (not one call per item). Use their words for titles where you can; keep titles short.',
  'Every item needs `quote`: the exact words from this conversation that support it, copied verbatim, and `said_by`: "user" if the person said it, "assistant" if you suggested it. Never present your suggestion as their decision or commitment. Do not invent dates: put time words exactly as said (e.g. "by Friday") in `when`.',
  'Use `related` to name existing projects or people an item belongs to. Set `now: true` only when the person says this is the one thing that matters most now; `done: true` when they say an action is finished.',
].join(' ');

const TOOLS = [
  {
    name: 'tangerine_update',
    title: 'Update TABLET',
    description: UPDATE_DESCRIPTION,
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['items'],
      properties: {
        conversation: { type: 'string', description: 'A short, stable name for this ongoing conversation, e.g. "Studio". Reuse the same name every time.' },
        items: {
          type: 'array', minItems: 1, maxItems: 40,
          items: {
            type: 'object', additionalProperties: false, required: ['type', 'title', 'quote', 'said_by'],
            properties: {
              type: { type: 'string', enum: ITEM_TYPES },
              title: { type: 'string', maxLength: 160, description: 'Short title. For an action, start with a verb ("Send the dial file to Moreau").' },
              quote: { type: 'string', minLength: 8, maxLength: 800, description: 'Exact words from this conversation, verbatim.' },
              said_by: { type: 'string', enum: ['user', 'assistant'] },
              related: { type: 'array', items: { type: 'string' }, maxItems: 8, description: 'Titles of projects, people or items this belongs to.' },
              when: { type: 'string', maxLength: 60, description: 'Time words exactly as said, e.g. "by Friday". Omit if none.' },
              now: { type: 'boolean', description: 'True only if the person said this is the one thing that matters most now.' },
              done: { type: 'boolean', description: 'True if the person said this action is finished.' },
            },
          },
        },
      },
    },
    annotations: { title: 'Update TABLET', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    _meta: {
      ui: { resourceUri: WIDGET_URI, visibility: ['model', 'app'] },
      'openai/outputTemplate': WIDGET_URI,
      'openai/toolInvocation/invoking': 'Updating TABLET…',
      'openai/toolInvocation/invoked': 'TABLET updated',
    },
  },
  {
    name: 'tangerine_view',
    title: 'Show TABLET',
    description: 'Show the person’s current picture from Tangerine: NOW, the next few actions, open loops, recent decisions, active projects and people. Use it when they ask what is going on, what is next, what they decided, or to see TABLET. Read-only. Also use it to recall context before answering questions about their projects.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    annotations: { title: 'Show TABLET', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: {
      ui: { resourceUri: WIDGET_URI, visibility: ['model', 'app'] },
      'openai/outputTemplate': WIDGET_URI,
      'openai/toolInvocation/invoking': 'Opening TABLET…',
      'openai/toolInvocation/invoked': 'TABLET',
    },
  },
  {
    name: 'tangerine_undo',
    title: 'Undo a TABLET change',
    description: 'Undo one change from an update (called from the TABLET card in the conversation).',
    inputSchema: { type: 'object', additionalProperties: false, required: ['proposalId'], properties: { proposalId: { type: 'string' } } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: WIDGET_URI, visibility: ['app'] }, 'openai/widgetAccessible': true },
  },
  {
    name: 'tangerine_keep',
    title: 'Keep a suggestion',
    description: 'Place a ChatGPT suggestion on TABLET after all (called from the TABLET card in the conversation).',
    inputSchema: { type: 'object', additionalProperties: false, required: ['proposalId'], properties: { proposalId: { type: 'string' } } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: WIDGET_URI, visibility: ['app'] }, 'openai/widgetAccessible': true },
  },
];

export async function startBridge(opts) {
  const o = Object.assign({ port: Number(process.env.TANGERINE_PORT) || 4330, host: '127.0.0.1', dir: path.join(ROOT, 'private', 'bridge'), publicUrl: process.env.TANGERINE_PUBLIC_URL || null, quiet: false }, opts);
  const key = o.key || loadKey(o.dir);
  const backend = fileBackend(path.join(o.dir, 'tangerine-store.json'));
  const store = createStore(backend);
  const base = () => (o.publicUrl || 'http://' + o.host + ':' + server.address().port).replace(/\/$/, '');
  const tabletUrl = () => base() + '/app/?live&key=' + encodeURIComponent(key);
  const T = createTangerine(store, { tabletUrl: null });
  const widgetHTML = () => fs.readFileSync(path.join(ROOT, 'bridge', 'widget.html'), 'utf8');
  const log = (...a) => { if (!o.quiet) console.log(new Date().toISOString().slice(11, 19), ...a); };

  /* ---------- MCP ---------- */
  async function picture() { const p = await T.picture(); p.tabletUrl = tabletUrl(); return p; }
  const result = (text, structured, isError) => ({ content: [{ type: 'text', text }], structuredContent: structured, ...(isError ? { isError: true } : {}) });

  async function callTool(name, args) {
    if (name === 'tangerine_update') {
      const r = await T.update(args || {});
      if (!r.ok) return result('Tangerine did not update: ' + r.errors.join('; ') + '. Fix these and call again.', { mode: 'error', errors: r.errors }, true);
      const pic = await picture();
      log('update', r.changes.map((c) => c.op + ' ' + c.kind).join(', '));
      return result(T.summarize(pic, r.changes), { mode: 'update', changes: r.changes.map(({ prevStatus, prevNow, ...c }) => c), ...pic });
    }
    if (name === 'tangerine_view') { const pic = await picture(); return result(T.summarize(pic), { mode: 'view', ...pic }); }
    if (name === 'tangerine_undo' || name === 'tangerine_keep') {
      const r = await (name === 'tangerine_undo' ? T.undo(args || {}) : T.keep(args || {}));
      if (!r.ok) return result(r.errors.join('; '), { mode: 'error', errors: r.errors }, true);
      log(name.slice(10), args.proposalId);
      return result(name === 'tangerine_undo' ? 'Undone.' : 'Kept on TABLET.', { mode: 'view', ...(await picture()) });
    }
    return null;
  }

  async function rpc(msg) {
    const { id, method, params } = msg || {};
    const ok = (r) => ({ jsonrpc: '2.0', id, result: r });
    const fail = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
    if (!msg || msg.jsonrpc !== '2.0' || typeof method !== 'string') return fail(-32600, 'Invalid request');
    if (id === undefined) return null; // a notification: nothing to answer
    switch (method) {
      case 'initialize': {
        const asked = params && params.protocolVersion;
        return ok({
          protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
          capabilities: { tools: { listChanged: false }, resources: { listChanged: false }, extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: [WIDGET_MIME] } } },
          serverInfo: { name: 'tangerine', title: 'Tangerine', version: '0.2.0' },
          instructions: 'Tangerine keeps the person’s projects, people, ideas, decisions, next actions and open questions visible on TABLET. Update it with tangerine_update at natural pauses, with verbatim quotes and who said them. Tangerine cannot read this conversation; it only knows what you send.',
        });
      }
      case 'ping': return ok({});
      case 'tools/list': return ok({ tools: TOOLS });
      case 'tools/call': {
        const r = await callTool(params && params.name, params && params.arguments);
        return r ? ok(r) : fail(-32602, 'Unknown tool ' + (params && params.name));
      }
      case 'resources/list': return ok({ resources: [{ uri: WIDGET_URI, name: 'TABLET', description: 'Tangerine’s TABLET, inline in the conversation', mimeType: WIDGET_MIME }] });
      case 'resources/templates/list': return ok({ resourceTemplates: [] });
      case 'resources/read': {
        if (!params || params.uri !== WIDGET_URI) return fail(-32602, 'Unknown resource');
        return ok({ contents: [{ uri: WIDGET_URI, mimeType: WIDGET_MIME, text: widgetHTML(),
          _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] }, prefersBorder: true },
            'openai/widgetDescription': 'TABLET: what changed in Tangerine, and NOW / NEXT / OPEN LOOPS.', 'openai/widgetPrefersBorder': true } }] });
      }
      case 'prompts/list': return ok({ prompts: [] });
      default: return fail(-32601, 'Method not found: ' + method);
    }
  }

  /* ---------- HTTP ---------- */
  const STATIC = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const send = (res, code, body, type, headers) => { res.writeHead(code, Object.assign({ 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' }, headers)); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
  const readBody = (req) => new Promise((ok, no) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 2e6) { no(new Error('too large')); req.destroy(); } }); req.on('end', () => ok(b)); req.on('error', no); });
  const keyOf = (req, url) => req.headers['x-tangerine-key'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || url.searchParams.get('key') || '';
  const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  // Local server: refuse browser requests from other sites (DNS rebinding, CSRF).
  const originOK = (req) => { const og = req.headers.origin; if (!og) return true; try { const u = new URL(og); return u.host === req.headers.host || (o.publicUrl && og === new URL(o.publicUrl).origin); } catch (e) { return false; } };
  const events = new Set();
  backend.onChange((v) => { for (const r of events) r.write('event: change\ndata: ' + v + '\n\n'); });
  const COLL = new Set(backend.collections);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    try {
      if (!originOK(req)) return send(res, 403, { error: 'origin not allowed' });
      // MCP endpoint
      const m = /^\/mcp(?:\/([^/]+))?\/?$/.exec(url.pathname);
      if (m) {
        if (!same(m[1] || keyOf(req, url), key)) return send(res, 401, { error: 'unauthorized' });
        if (req.method === 'GET') return send(res, 405, { error: 'This server does not offer an SSE stream; POST JSON-RPC.' }, 'application/json', { Allow: 'POST' });
        if (req.method === 'DELETE') return send(res, 204, '');
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
        let msg;
        try { msg = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
        const headers = {};
        const isInit = (x) => x && x.method === 'initialize';
        if (Array.isArray(msg) ? msg.some(isInit) : isInit(msg)) headers['Mcp-Session-Id'] = crypto.randomUUID();
        const out = Array.isArray(msg) ? (await Promise.all(msg.map(rpc))).filter(Boolean) : await rpc(msg);
        if (!out || (Array.isArray(out) && !out.length)) return send(res, 202, '', 'text/plain', headers);
        return send(res, 200, out, 'application/json', headers);
      }
      // Store API for the live TABLET
      if (url.pathname === '/api/events' || url.pathname.startsWith('/api/store/') || url.pathname === '/api/info') {
        if (!same(keyOf(req, url), key)) return send(res, 401, { error: 'unauthorized' });
        if (url.pathname === '/api/info') return send(res, 200, { live: true, version: backend.version, store: path.relative(ROOT, backend.file) });
        if (url.pathname === '/api/events') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
          res.write('event: hello\ndata: ' + backend.version + '\n\n');
          events.add(res); const t = setInterval(() => res.write(': keep-alive\n\n'), 25000);
          req.on('close', () => { clearInterval(t); events.delete(res); });
          return;
        }
        const [, , , c, k] = url.pathname.split('/').map(decodeURIComponent);
        if (!COLL.has(c)) return send(res, 404, { error: 'no collection' });
        if (!k && req.method === 'GET') return send(res, 200, await backend.all(c));
        if (k && req.method === 'GET') { const v = await backend.get(c, k); return send(res, 200, v === undefined ? null : v); }
        if (k && req.method === 'PUT') { await backend.put(c, k, JSON.parse(await readBody(req))); return send(res, 200, { ok: true }); }
        if (k && req.method === 'DELETE') { await backend.remove(c, k); return send(res, 200, { ok: true }); }
        return send(res, 405, { error: 'method' });
      }
      // Static: the app, core and design system (code only; no data).
      let p = decodeURIComponent(url.pathname);
      if (p === '/') { res.writeHead(302, { Location: '/app/?live' }); return res.end(); }
      if (p.endsWith('/')) p += 'index.html';
      const allowed = /^\/(app|core|system)\//.test(p) && !p.includes('..') && !p.includes('/tests/');
      const f = path.join(ROOT, p);
      if (!allowed || !fs.existsSync(f) || !fs.statSync(f).isFile()) return send(res, 404, 'Not found', 'text/plain');
      return send(res, 200, fs.readFileSync(f), STATIC[path.extname(f)] || 'application/octet-stream');
    } catch (e) {
      log('error', e.message);
      return send(res, 500, { error: e.message });
    }
  });
  await new Promise((ok) => server.listen(o.port, o.host, ok));
  const info = { url: base(), mcp: base() + '/mcp/' + key, tablet: tabletUrl(), store: backend.file, key };
  return { server, store, tangerine: T, info, close: () => new Promise((ok) => { for (const r of events) r.end(); server.close(ok); }) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const b = await startBridge({});
  console.log(`
  Tangerine bridge · running on this machine only

  TABLET (live)   ${b.info.tablet}
  MCP endpoint    ${b.info.mcp}
  Store           ${path.relative(ROOT, b.info.store)}   (git-ignored; private to you)

  To use it from ChatGPT you must give ChatGPT an https URL for the MCP endpoint,
  e.g. through a tunnel you run and control. That is your decision: see bridge/README.md.
  Nothing has been exposed beyond 127.0.0.1.
`);
}
