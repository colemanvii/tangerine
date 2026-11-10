/*
 * Tangerine bridge — who may use it.
 *
 * Three doors, no secret in any URL or tool output:
 *
 * 1. This machine (stdio relay for OpenAI's Secure MCP Tunnel, tests, CLI):
 *    `Authorization: Bearer <local key>`, the key read from private/bridge/bridge.key
 *    (mode 600). Accepted only from loopback, never through a tunnel.
 * 2. ChatGPT over a public development tunnel (fallback when Secure MCP Tunnel is
 *    not available): OAuth 2.1, authorization code + PKCE (S256), client by
 *    Client ID Metadata Document or dynamic registration. The person approves the
 *    connection with a short code shown only on their own computer. Tokens are
 *    stored hashed; access tokens expire in an hour; refresh tokens rotate.
 * 3. TABLET in the browser: a one-time sign-in link (single use, two minutes,
 *    loopback only) sets an HttpOnly, SameSite=Strict session cookie.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const H = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const rand = (n) => crypto.randomBytes(n || 32).toString('base64url');
export const same = (a, b) => { a = String(a || ''); b = String(b || ''); return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); };
const S256 = (v) => crypto.createHash('sha256').update(v).digest('base64url');

export function loadKey(dir) {
  const f = path.join(dir, 'bridge.key');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  fs.mkdirSync(dir, { recursive: true });
  const k = rand(24);
  fs.writeFileSync(f, k + '\n', { mode: 0o600 });
  return k;
}

export function createAuth(dir, opts) {
  const o = Object.assign({ now: () => Date.now(), fetch: globalThis.fetch, onApprovalCode: null, accessTTL: 3600e3, refreshTTL: 30 * 864e5, sessionTTL: 30 * 864e5 }, opts);
  const file = path.join(dir, 'auth.json');
  let db = { clients: {}, access: {}, refresh: {}, sessions: {} };
  if (fs.existsSync(file)) db = Object.assign(db, JSON.parse(fs.readFileSync(file, 'utf8')));
  const save = () => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(db, null, 1), { mode: 0o600 }); fs.renameSync(file + '.tmp', file); };
  const pendingAuth = new Map();   // request id → { client, params, code (approval), tries, exp }
  const codes = new Map();         // authorization code (hashed) → grant
  const logins = new Map();        // one-time TABLET sign-in codes (hashed) → exp

  function sweep() {
    const t = o.now();
    for (const [k, v] of pendingAuth) if (v.exp < t) pendingAuth.delete(k);
    for (const [k, v] of codes) if (v.exp < t) codes.delete(k);
    for (const [k, v] of logins) if (v < t) logins.delete(k);
    let dirty = false;
    for (const c of ['access', 'refresh', 'sessions']) for (const [k, v] of Object.entries(db[c])) if (v.exp < t) { delete db[c][k]; dirty = true; }
    if (dirty) save();
  }

  /* ---------- clients ---------- */
  const redirectOK = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || (x.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(x.hostname)); } catch (e) { return false; } };

  function register(body) {
    const uris = body && Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
    if (!uris.length || !uris.every(redirectOK)) return { error: 'invalid_redirect_uri', error_description: 'redirect_uris must be https (or loopback http)' };
    if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== 'none') return { error: 'invalid_client_metadata', error_description: 'only public clients (token_endpoint_auth_method "none") are supported' };
    const client = { client_id: 'tgr_' + rand(16), client_name: String(body.client_name || 'Unnamed client').slice(0, 80), redirect_uris: uris, created: new Date(o.now()).toISOString(), via: 'registration' };
    db.clients[client.client_id] = client; save();
    return { client_id: client.client_id, client_id_issued_at: Math.floor(o.now() / 1000), client_name: client.client_name, redirect_uris: uris,
      token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] };
  }

  /* A Client ID Metadata Document: the client_id is an https URL that publishes the client's metadata. */
  async function resolveClient(clientId) {
    if (db.clients[clientId]) return db.clients[clientId];
    let u; try { u = new URL(clientId); } catch (e) { return null; }
    if (u.protocol !== 'https:') return null;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    try {
      const r = await o.fetch(clientId, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) return null;
      const doc = await r.json();
      if (doc.client_id !== clientId || !Array.isArray(doc.redirect_uris) || !doc.redirect_uris.every(redirectOK)) return null;
      return { client_id: clientId, client_name: String(doc.client_name || u.hostname).slice(0, 80), redirect_uris: doc.redirect_uris.map(String), via: 'metadata-document' };
    } catch (e) { return null; } finally { clearTimeout(t); }
  }

  /* ---------- authorize ---------- */
  async function beginAuthorize(q) {
    sweep();
    const need = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method'];
    for (const k of need) if (!q[k]) return { error: 'invalid_request', error_description: 'missing ' + k };
    if (q.response_type !== 'code') return { error: 'unsupported_response_type' };
    if (q.code_challenge_method !== 'S256') return { error: 'invalid_request', error_description: 'PKCE S256 is required' };
    const client = await resolveClient(q.client_id);
    if (!client) return { error: 'invalid_client', error_description: 'unknown client' };
    if (!client.redirect_uris.includes(q.redirect_uri)) return { error: 'invalid_request', error_description: 'redirect_uri is not registered for this client' };
    const id = rand(16);
    const approval = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    pendingAuth.set(id, { client, params: { ...q }, approval, tries: 0, exp: o.now() + 10 * 60e3 });
    if (o.onApprovalCode) o.onApprovalCode({ id, code: approval, client: client.client_name, via: client.via });
    return { id, client };
  }

  function pending() { sweep(); return [...pendingAuth].map(([id, v]) => ({ id, client: v.client.client_name, code: v.approval, expires: new Date(v.exp).toISOString() })); }

  /* The person typed the approval code (or denied). Returns where to send the browser. */
  function finishAuthorize(id, typed, deny) {
    const p = pendingAuth.get(id);
    if (!p) return { error: 'This request expired. Start the connection again from ChatGPT.' };
    const back = new URL(p.params.redirect_uri);
    if (p.params.state) back.searchParams.set('state', p.params.state);
    if (deny) { pendingAuth.delete(id); back.searchParams.set('error', 'access_denied'); return { redirect: back.toString() }; }
    if (!same(String(typed || '').replace(/\s/g, ''), p.approval)) {
      if (++p.tries >= 5) { pendingAuth.delete(id); return { error: 'Too many wrong codes. Start the connection again from ChatGPT.' }; }
      return { retry: true, error: 'That code does not match. Look at the bridge on your computer.' };
    }
    pendingAuth.delete(id);
    const code = rand(32);
    codes.set(H(code), { client_id: p.client.client_id, client_name: p.client.client_name, redirect_uri: p.params.redirect_uri, challenge: p.params.code_challenge, resource: p.params.resource || null, scope: p.params.scope || 'tangerine', exp: o.now() + 5 * 60e3 });
    back.searchParams.set('code', code);
    return { redirect: back.toString() };
  }

  /* ---------- tokens ---------- */
  function issue(grant) {
    const access = rand(32), refresh = rand(32);
    db.access[H(access)] = { client_id: grant.client_id, client_name: grant.client_name, scope: grant.scope, resource: grant.resource, exp: o.now() + o.accessTTL };
    db.refresh[H(refresh)] = { client_id: grant.client_id, client_name: grant.client_name, scope: grant.scope, resource: grant.resource, exp: o.now() + o.refreshTTL };
    save();
    return { access_token: access, token_type: 'Bearer', expires_in: Math.round(o.accessTTL / 1000), refresh_token: refresh, scope: grant.scope };
  }

  function token(b) {
    sweep();
    if (b.grant_type === 'authorization_code') {
      const g = codes.get(H(b.code || ''));
      if (!g) return { error: 'invalid_grant', error_description: 'code is invalid or expired' };
      codes.delete(H(b.code)); // single use
      if (b.client_id !== g.client_id || b.redirect_uri !== g.redirect_uri) return { error: 'invalid_grant', error_description: 'client or redirect_uri mismatch' };
      if (!b.code_verifier || S256(b.code_verifier) !== g.challenge) return { error: 'invalid_grant', error_description: 'PKCE verification failed' };
      return issue(g);
    }
    if (b.grant_type === 'refresh_token') {
      const k = H(b.refresh_token || ''), g = db.refresh[k];
      if (!g || g.exp < o.now()) return { error: 'invalid_grant', error_description: 'refresh token is invalid or expired' };
      if (b.client_id && b.client_id !== g.client_id) return { error: 'invalid_grant' };
      delete db.refresh[k]; // rotate
      return issue(g);
    }
    return { error: 'unsupported_grant_type' };
  }

  function checkAccess(bearer) {
    const g = bearer && db.access[H(bearer)];
    return g && g.exp > o.now() ? g : null;
  }

  function revokeAll() { db.access = {}; db.refresh = {}; save(); return true; }
  function connections() {
    const by = {};
    for (const g of Object.values(db.refresh)) by[g.client_name] = Math.max(by[g.client_name] || 0, g.exp);
    return Object.entries(by).map(([client, exp]) => ({ client, until: new Date(exp).toISOString() }));
  }

  /* ---------- TABLET sign-in ---------- */
  function loginLink() { sweep(); const c = rand(24); logins.set(H(c), o.now() + 2 * 60e3); return c; }
  function useLogin(c) {
    const k = H(c || ''), exp = logins.get(k);
    if (!exp || exp < o.now()) return null;
    logins.delete(k);
    const s = rand(32);
    db.sessions[H(s)] = { exp: o.now() + o.sessionTTL }; save();
    return s;
  }
  function checkSession(cookieHeader) {
    const m = /(?:^|;\s*)tangerine_session=([^;]+)/.exec(cookieHeader || '');
    const g = m && db.sessions[H(m[1])];
    return Boolean(g && g.exp > o.now());
  }
  function endSessions() { db.sessions = {}; save(); }

  return { register, resolveClient, beginAuthorize, pending, finishAuthorize, token, checkAccess, revokeAll, connections, loginLink, useLogin, checkSession, endSessions, S256 };
}
