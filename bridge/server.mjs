#!/usr/bin/env node
/*
 * Tangerine bridge — a ChatGPT app (MCP server) and the live TABLET, on the
 * person's own machine.
 *
 *   node bridge/server.mjs            → http://127.0.0.1:4330
 *
 * How ChatGPT reaches it (see bridge/README.md)
 *   A. OpenAI Secure MCP Tunnel (preferred): tunnel-client runs
 *      `node bridge/stdio.mjs`, which relays to this server on loopback with the
 *      local key read from disk. Nothing listens publicly.
 *   B. A public development tunnel (fallback): POST /mcp with an OAuth 2.1 bearer
 *      token. Discovery at /.well-known/oauth-protected-resource; the person
 *      approves with a code shown only on this computer (/connect).
 *
 * What it serves
 *   POST /mcp              MCP over Streamable HTTP (JSON responses).
 *   GET  /app/?live        TABLET (this computer only), reading and writing this
 *                          bridge's store, redrawn within a second of each relay.
 *   GET  /connect          This computer only: approval codes, connections, disconnect.
 *
 * What it does not do
 *   It cannot read ChatGPT conversations, history or memory. It receives only
 *   what ChatGPT sends in a tool call, and keeps it in private/ on this machine.
 *   No dependency, no telemetry, nothing sent anywhere.
 *
 * No access key or token ever appears in a URL, a tool result or the inline
 * view. TABLET, its store API and /connect answer only on this computer, never
 * through a tunnel. Bind stays 127.0.0.1.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { fileBackend } from './file-store.mjs';
import { createTangerine, ITEM_TYPES } from './tangerine.mjs';
import { createAuth, loadKey as loadLocalKey, same } from './auth.mjs';

const require = createRequire(import.meta.url);
const { createStore } = require('../core/store.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDGET_URI = 'ui://tangerine/tablet.html';
const WIDGET_MIME = 'text/html;profile=mcp-app';
const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

export const loadKey = loadLocalKey;

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
  const o = Object.assign({ port: Number(process.env.TANGERINE_PORT) || 4330, host: '127.0.0.1', dir: process.env.TANGERINE_DIR || path.join(ROOT, 'private', 'bridge'),
    publicUrl: process.env.TANGERINE_PUBLIC_URL || null, quiet: false, fetch: globalThis.fetch, onApprovalCode: null }, opts);
  const key = o.key || loadKey(o.dir);
  const backend = fileBackend(path.join(o.dir, 'tangerine-store.json'));
  const store = createStore(backend);
  const log = (...a) => { if (!o.quiet) console.log(new Date().toTimeString().slice(0, 8), ...a); };
  const auth = createAuth(o.dir, { fetch: o.fetch, onApprovalCode: (r) => {
    log(`ChatGPT asks to connect (${r.client}). Approval code: ${r.code}   (also at ${localBase()}/connect)`);
    if (o.onApprovalCode) o.onApprovalCode(r);
  } });
  const localBase = () => 'http://' + o.host + ':' + server.address().port;
  const publicBase = () => (o.publicUrl ? o.publicUrl.replace(/\/$/, '') : null);
  const tabletUrl = () => localBase() + '/app/?live'; // no secret: TABLET signs in with a cookie, on this computer only
  const T = createTangerine(store, { tabletUrl: null });
  const widgetHTML = () => fs.readFileSync(path.join(ROOT, 'bridge', 'widget.html'), 'utf8');
  const KIND = { project: 'project', person: 'person', idea: 'idea', decision: 'decision', action: 'action', question: 'open question' };

  /* ---------- MCP ---------- */
  async function picture() { const p = await T.picture(); p.tabletUrl = tabletUrl(); return p; }
  const result = (text, structured, isError) => ({ content: [{ type: 'text', text }], structuredContent: structured, ...(isError ? { isError: true } : {}) });

  async function callTool(name, args, who) {
    if (name === 'tangerine_update') {
      const r = await T.update(args || {});
      if (!r.ok) { log(`ChatGPT → update refused: ${r.errors.join('; ')}`); return result('Tangerine did not update: ' + r.errors.join('; ') + '. Fix these and call again.', { mode: 'error', errors: r.errors }, true); }
      const pic = await picture();
      log(`ChatGPT → Tangerine (${who})  ` + r.changes.map((c) => `${c.op} ${KIND[c.kind]} “${c.title}”`).join(' · ') + '  → TABLET updated');
      return result(T.summarize(pic, r.changes), { mode: 'update', changes: r.changes.map(({ prevStatus, prevNow, ...c }) => c), ...pic });
    }
    if (name === 'tangerine_view') { log(`ChatGPT → view (${who})`); const pic = await picture(); return result(T.summarize(pic), { mode: 'view', ...pic }); }
    if (name === 'tangerine_undo' || name === 'tangerine_keep') {
      const r = await (name === 'tangerine_undo' ? T.undo(args || {}) : T.keep(args || {}));
      if (!r.ok) return result(r.errors.join('; '), { mode: 'error', errors: r.errors }, true);
      log(`TABLET card in ChatGPT → ${name === 'tangerine_undo' ? 'Undo' : 'Keep'} (${who})  → TABLET updated`);
      return result(name === 'tangerine_undo' ? 'Undone.' : 'Kept on TABLET.', { mode: 'view', ...(await picture()) });
    }
    return null;
  }

  async function rpc(msg, who) {
    const { id, method, params } = msg || {};
    const ok = (r) => ({ jsonrpc: '2.0', id, result: r });
    const fail = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
    if (!msg || msg.jsonrpc !== '2.0' || typeof method !== 'string') return fail(-32600, 'Invalid request');
    if (id === undefined) return null; // a notification: nothing to answer
    switch (method) {
      case 'initialize': {
        const asked = params && params.protocolVersion;
        log(`MCP client connected: ${(params && params.clientInfo && params.clientInfo.name) || 'unknown'} (${who})`);
        return ok({
          protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
          capabilities: { tools: { listChanged: false }, resources: { listChanged: false }, extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: [WIDGET_MIME] } } },
          serverInfo: { name: 'tangerine', title: 'Tangerine', version: '0.3.0' },
          instructions: 'Tangerine keeps the person’s projects, people, ideas, decisions, next actions and open questions visible on TABLET. Update it with tangerine_update at natural pauses, with verbatim quotes and who said them. Tangerine cannot read this conversation; it only knows what you send.',
        });
      }
      case 'ping': return ok({});
      case 'tools/list': return ok({ tools: TOOLS });
      case 'tools/call': {
        const r = await callTool(params && params.name, params && params.arguments, who);
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
  const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' };
  const send = (res, code, body, type, headers) => { res.writeHead(code, Object.assign({ 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' }, SECURITY, headers)); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
  const readBody = (req) => new Promise((ok, no) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 2e6) { no(new Error('too large')); req.destroy(); } }); req.on('end', () => ok(b)); req.on('error', no); });
  const bearer = (req) => (/^Bearer\s+(.+)$/i.exec(req.headers.authorization || '') || [])[1] || '';
  /*
   * Local means: a loopback connection, addressed to this computer, that did not
   * come through a proxy or tunnel. Tunnels connect from loopback too, so their
   * forwarding headers and public Host are what give them away.
   */
  const FORWARDED = ['x-forwarded-for', 'x-forwarded-host', 'forwarded', 'cf-connecting-ip', 'cf-ray', 'x-real-ip', 'ngrok-trace-id', 'x-forwarded-proto'];
  const isLocal = (req) => {
    const ra = req.socket.remoteAddress || '';
    const loop = ra === '127.0.0.1' || ra === '::1' || ra === '::ffff:127.0.0.1';
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    return loop && ['127.0.0.1', 'localhost', '[::1]'].includes(host) && !FORWARDED.some((h) => req.headers[h] !== undefined);
  };
  const originOK = (req) => { const og = req.headers.origin; if (!og) return true; try { const u = new URL(og); return u.host === req.headers.host || (publicBase() && og === new URL(publicBase()).origin); } catch (e) { return false; } };
  const events = new Set();
  backend.onChange((v) => { for (const r of events) r.write('event: change\ndata: ' + v + '\n\n'); });
  const COLL = new Set(backend.collections);
  const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
    <style>body{margin:0;background:#fafbfb;color:#181a1b;font:15px/1.5 "Helvetica Neue",Helvetica,Arial,sans-serif}main{max-width:520px;margin:12vh auto;padding:0 24px}.t{font:10.5px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#868b8d}h1{font:400 30px/1.15 Georgia,serif;margin:8px 0 16px}p{color:#4a4e50}input{font:28px ui-monospace,Menlo,monospace;letter-spacing:.3em;width:9ch;border:0;border-bottom:1px solid #181a1b;background:none;padding:4px 0;margin:8px 0 16px}button{border:1px solid #181a1b;background:#fafbfb;padding:8px 14px;font:inherit;cursor:pointer;margin-right:8px}button.q{border-color:#dfe2e2;color:#4a4e50}.code{font:34px ui-monospace,Menlo,monospace;letter-spacing:.3em;margin:6px 0 2px}.err{border-left:2px solid #f25a28;padding-left:10px}li{margin:10px 0;list-style:none}ul{padding:0}</style></head><body><main>${body}</main></body></html>`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    const local = isLocal(req);
    try {
      if (!originOK(req)) return send(res, 403, { error: 'origin not allowed' });
      const P = url.pathname;

      /* --- OAuth discovery and endpoints (only meaningful with a public URL) --- */
      if (P.startsWith('/.well-known/oauth-protected-resource')) {
        if (!publicBase()) return send(res, 404, { error: 'no public URL configured' });
        return send(res, 200, { resource: publicBase() + '/mcp', authorization_servers: [publicBase()], bearer_methods_supported: ['header'], scopes_supported: ['tangerine'], resource_name: 'Tangerine' });
      }
      if (P === '/.well-known/oauth-authorization-server' || P === '/.well-known/openid-configuration') {
        if (!publicBase()) return send(res, 404, { error: 'no public URL configured' });
        const b = publicBase();
        return send(res, 200, { issuer: b, authorization_endpoint: b + '/oauth/authorize', token_endpoint: b + '/oauth/token', registration_endpoint: b + '/oauth/register',
          response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['tangerine'], client_id_metadata_document_supported: true });
      }
      if (P === '/oauth/register' && req.method === 'POST') {
        if (!publicBase()) return send(res, 404, { error: 'no public URL configured' });
        let b; try { b = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { error: 'invalid_client_metadata' }); }
        const r = auth.register(b);
        if (!r.error) log(`ChatGPT registered as an OAuth client (${r.client_name}).`);
        return send(res, r.error ? 400 : 201, r);
      }
      if (P === '/oauth/authorize') {
        if (!publicBase()) return send(res, 404, 'Not configured', 'text/plain');
        if (req.method === 'GET') {
          const q = Object.fromEntries(url.searchParams);
          const r = await auth.beginAuthorize(q);
          if (r.error) return send(res, 400, page('Tangerine', `<p class="t">Tangerine</p><h1>This connection can’t continue.</h1><p class="err">${esc(r.error_description || r.error)}</p>`), 'text/html; charset=utf-8');
          return send(res, 200, page('Connect Tangerine', `<p class="t">Tangerine · connect</p><h1>${esc(r.client.client_name)} wants to read and update your TABLET.</h1>
            <p>Enter the six-digit code shown by the Tangerine bridge on your computer (in its window, or at <span class="t">127.0.0.1:${server.address().port}/connect</span>). The code never leaves your computer by itself.</p>
            <form method="post" action="/oauth/authorize"><input type="hidden" name="request" value="${esc(r.id)}"><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" autofocus aria-label="Approval code"><br>
            <button type="submit">Allow</button><button class="q" type="submit" name="deny" value="1">Deny</button></form>
            <p class="t" style="text-transform:none;letter-spacing:.02em">Allowing lets this client call Tangerine’s tools: update TABLET, show TABLET, undo. You can disconnect it at any time from /connect on your computer.</p>`), 'text/html; charset=utf-8', { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https:; frame-ancestors 'none'" });
        }
        if (req.method === 'POST') {
          const f = Object.fromEntries(new URLSearchParams(await readBody(req)));
          const r = auth.finishAuthorize(f.request, f.code, f.deny === '1');
          if (r.redirect) { log(f.deny === '1' ? 'Connection denied.' : 'Connection approved. ChatGPT can now reach Tangerine.'); res.writeHead(302, Object.assign({ Location: r.redirect, 'Cache-Control': 'no-store' }, SECURITY)); return res.end(); }
          const again = r.retry ? `<form method="post" action="/oauth/authorize"><input type="hidden" name="request" value="${esc(f.request)}"><input name="code" inputmode="numeric" maxlength="7" autofocus aria-label="Approval code"><br><button type="submit">Allow</button><button class="q" type="submit" name="deny" value="1">Deny</button></form>` : '';
          return send(res, 400, page('Connect Tangerine', `<p class="t">Tangerine · connect</p><h1>Not yet.</h1><p class="err">${esc(r.error)}</p>${again}`), 'text/html; charset=utf-8', { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https:; frame-ancestors 'none'" });
        }
      }
      if (P === '/oauth/token' && req.method === 'POST') {
        if (!publicBase()) return send(res, 404, { error: 'no public URL configured' });
        const raw = await readBody(req);
        const b = /json/.test(req.headers['content-type'] || '') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
        const r = auth.token(b);
        if (!r.error) log(b.grant_type === 'refresh_token' ? 'ChatGPT refreshed its access.' : 'ChatGPT received access (expires in an hour; refreshes itself).');
        return send(res, r.error ? 400 : 200, r);
      }

      /* --- MCP --- */
      if (/^\/mcp\/?$/.test(P)) {
        let who = null;
        if (local && same(bearer(req), key)) who = 'this computer';
        else if (!local && publicBase()) { const g = auth.checkAccess(bearer(req)); if (g) who = g.client_name + ' via tunnel'; }
        if (!who) {
          const h = publicBase() && !local ? { 'WWW-Authenticate': `Bearer resource_metadata="${publicBase()}/.well-known/oauth-protected-resource", scope="tangerine"` + (bearer(req) ? ', error="invalid_token"' : '') } : {};
          return send(res, 401, { error: 'unauthorized' }, 'application/json', h);
        }
        if (req.method === 'GET') return send(res, 405, { error: 'This server does not offer an SSE stream; POST JSON-RPC.' }, 'application/json', { Allow: 'POST' });
        if (req.method === 'DELETE') return send(res, 204, '');
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
        let msg;
        try { msg = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
        const headers = {};
        const isInit = (x) => x && x.method === 'initialize';
        if (Array.isArray(msg) ? msg.some(isInit) : isInit(msg)) headers['Mcp-Session-Id'] = crypto.randomUUID();
        const out = Array.isArray(msg) ? (await Promise.all(msg.map((m) => rpc(m, who)))).filter(Boolean) : await rpc(msg, who);
        if (!out || (Array.isArray(out) && !out.length)) return send(res, 202, '', 'text/plain', headers);
        return send(res, 200, out, 'application/json', headers);
      }

      /* --- Everything below is for this computer only: never through a tunnel. --- */
      if (!local) return send(res, 404, 'Not found', 'text/plain');

      if (P.startsWith('/login/')) {
        const s = auth.useLogin(P.slice(7));
        if (!s) return send(res, 403, page('TABLET', `<p class="t">TABLET</p><h1>This sign-in link has been used or has expired.</h1><p>Run <span class="t">node bridge/open.mjs</span> for a new one.</p>`), 'text/html; charset=utf-8');
        res.writeHead(302, Object.assign({ Location: '/app/?live', 'Set-Cookie': `tangerine_session=${s}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${30 * 86400}`, 'Cache-Control': 'no-store' }, SECURITY));
        return res.end();
      }
      if (P === '/local/login-link' && req.method === 'POST') {
        if (!same(bearer(req), key)) return send(res, 401, { error: 'unauthorized' });
        return send(res, 200, { url: localBase() + '/login/' + auth.loginLink() });
      }
      const signedIn = auth.checkSession(req.headers.cookie);
      if (P === '/connect') {
        if (!signedIn) return send(res, 401, page('Tangerine', `<p class="t">Tangerine</p><h1>Sign in first.</h1><p>Run <span class="t">node bridge/open.mjs</span> on this computer.</p>`), 'text/html; charset=utf-8');
        if (req.method === 'POST') { auth.revokeAll(); log('All ChatGPT connections revoked.'); res.writeHead(303, { Location: '/connect' }); return res.end(); }
        const pend = auth.pending(), conns = auth.connections();
        return send(res, 200, page('Tangerine · connections', `<p class="t">Tangerine · this computer only</p><h1>Connections</h1>
          ${pend.length ? pend.map((x) => `<p class="t">${esc(x.client)} is asking to connect</p><div class="code">${esc(x.code)}</div><p class="t">Enter this in the ChatGPT window · expires ${esc(x.expires.slice(11, 16))} UTC</p>`).join('') : '<p>No one is asking to connect.</p>'}
          <p class="t" style="margin-top:28px">Connected</p><ul>${conns.length ? conns.map((c) => `<li>${esc(c.client)} <span class="t">· until ${esc(c.until.slice(0, 10))}</span></li>`).join('') : '<li>Nothing over a public tunnel.</li>'}</ul>
          <form method="post"><button type="submit" ${conns.length ? '' : 'disabled'}>Disconnect everything</button></form>
          <p class="t" style="text-transform:none;letter-spacing:.02em;margin-top:24px">A connection through OpenAI’s Secure MCP Tunnel is controlled by stopping tunnel-client.</p>
          <p><a href="/app/?live">Open TABLET</a></p>`), 'text/html; charset=utf-8', { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" });
      }
      if (P === '/api/events' || P.startsWith('/api/store/') || P === '/api/info') {
        if (!signedIn && !same(bearer(req) || req.headers['x-tangerine-key'] || '', key)) return send(res, 401, { error: 'unauthorized' });
        if (P === '/api/info') return send(res, 200, { live: true, version: backend.version });
        if (P === '/api/events') {
          res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' }, SECURITY));
          res.write('event: hello\ndata: ' + backend.version + '\n\n');
          events.add(res); const t = setInterval(() => res.write(': keep-alive\n\n'), 25000);
          req.on('close', () => { clearInterval(t); events.delete(res); });
          return;
        }
        const [, , , c, k] = P.split('/').map(decodeURIComponent);
        if (!COLL.has(c)) return send(res, 404, { error: 'no collection' });
        if (!k && req.method === 'GET') return send(res, 200, await backend.all(c));
        if (k && req.method === 'GET') { const v = await backend.get(c, k); return send(res, 200, v === undefined ? null : v); }
        if (k && req.method === 'PUT') { await backend.put(c, k, JSON.parse(await readBody(req))); return send(res, 200, { ok: true }); }
        if (k && req.method === 'DELETE') { await backend.remove(c, k); return send(res, 200, { ok: true }); }
        return send(res, 405, { error: 'method' });
      }
      // Static: the app, core and design system (code only; no data).
      let p = decodeURIComponent(P);
      if (p === '/') { res.writeHead(302, { Location: '/app/?live' }); return res.end(); }
      if (p.endsWith('/')) p += 'index.html';
      const allowed = /^\/(app|core|system)\//.test(p) && !p.includes('..') && !p.includes('/tests/');
      const f = path.join(ROOT, p);
      if (!allowed || !fs.existsSync(f) || !fs.statSync(f).isFile()) return send(res, 404, 'Not found', 'text/plain');
      return send(res, 200, fs.readFileSync(f), STATIC[path.extname(f)] || 'application/octet-stream');
    } catch (e) {
      log('error', e.message);
      return send(res, 500, { error: 'internal error' });
    }
  });
  await new Promise((ok) => server.listen(o.port, o.host, ok));
  const info = { url: localBase(), mcp: localBase() + '/mcp', publicMcp: publicBase() ? publicBase() + '/mcp' : null, tablet: tabletUrl(), store: backend.file, key };
  return { server, store, tangerine: T, auth, info, loginUrl: () => localBase() + '/login/' + auth.loginLink(),
    close: () => new Promise((ok) => { for (const r of events) r.end(); server.close(ok); }) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const b = await startBridge({});
  console.log(`
  Tangerine bridge · this computer only (127.0.0.1)

  Open TABLET     ${b.loginUrl()}
                  (one-time sign-in link, valid 2 minutes; later: node bridge/open.mjs)
  Store           ${path.relative(ROOT, b.info.store)}   (git-ignored; private to you)
  ChatGPT         ${b.info.publicMcp ? 'public tunnel, OAuth: ' + b.info.publicMcp : 'not reachable yet — see bridge/README.md (Secure MCP Tunnel: node bridge/stdio.mjs)'}
`);
}
