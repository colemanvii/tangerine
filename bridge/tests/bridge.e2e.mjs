// Browser check for the bridge: the inline TABLET card inside an MCP Apps host,
// and the full TABLET updating live as ChatGPT relays.
//   node bridge/tests/bridge.e2e.mjs [--shots docs/synthesis-002/screens]
// Starts its own bridge on a free port with a throwaway store. Fictional fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startBridge } from '../server.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const shotsAt = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tangerine-bridge-e2e-'));
const approvals = [];
const bridge = await startBridge({ port: 0, dir, quiet: true, key: 'e2e-key', publicUrl: 'https://tangerine.example', onApprovalCode: (r) => approvals.push(r) });
let id = 0;
let auth = { Authorization: 'Bearer e2e-key' };
const mcp = async (method, params, headers) => (await (await fetch(bridge.info.mcp, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || auth), body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) })).json()).result;
const call = (name, args, headers) => mcp('tools/call', { name, arguments: args }, headers);
let n = 0; const ok = (m) => console.log('ok', ++n, m);
const errors = [];
const browser = await chromium.launch();
const watch = (page) => { page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text())); };
const shot = async (page, name, opts) => { if (shotsAt) { await page.waitForTimeout(200); await page.screenshot(Object.assign({ path: `${shotsAt}/${name}.png` }, opts)); } };

try {
  // ---- 1. TABLET is open on the desktop, empty, live ----
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const tablet = await ctx.newPage(); watch(tablet); tablet.on('dialog', (d) => d.accept());
  await tablet.goto(bridge.loginUrl());
  await tablet.waitForSelector('.wb');
  assert.equal(await tablet.locator('.card').count(), 0); ok('live TABLET starts from the bridge’s store: no demonstration material');
  assert.match(await tablet.locator('#storage').innerText(), /Live/i); ok('footer says TABLET is live from the bridge');
  assert.match(tablet.url(), /\/app\/\?live$/); ok('TABLET is signed in by a one-time link; its address carries no secret');

  // ---- 2. ChatGPT relays (as it would during the conversation) ----
  const relay = await call('tangerine_update', { conversation: 'Studio', items: [
    { type: 'project', title: 'Garden bench', quote: 'I want to build a garden bench from the old oak boards.', said_by: 'user' },
    { type: 'person', title: 'Marta Ilić', quote: 'my neighbour Marta Ilić has a planer I can borrow', said_by: 'user', related: ['Garden bench'] },
    { type: 'decision', title: 'Oil finish, not varnish', quote: "I've decided on an oil finish, not varnish.", said_by: 'user', related: ['Garden bench'] },
    { type: 'action', title: 'Ask Marta for the planer', quote: "I'll ask Marta for the planer on Saturday.", said_by: 'user', related: ['Marta Ilić', 'Garden bench'], when: 'on Saturday' },
    { type: 'action', title: 'Sketch the joinery at full size', quote: 'You could sketch the joinery at full size first.', said_by: 'assistant', related: ['Garden bench'] },
    { type: 'question', title: 'Mortise and tenon, or dowels?', quote: 'Should the legs be mortise and tenon, or dowels?', said_by: 'user', related: ['Garden bench'] },
    { type: 'project', title: 'Letterpress cards', quote: 'Also the letterpress cards for the winter market, those are still on.', said_by: 'user' },
    { type: 'action', title: 'Order cotton card stock', quote: 'I need to order cotton card stock by Thursday.', said_by: 'user', related: ['Letterpress cards'], when: 'by Thursday' },
    { type: 'project', title: 'Garden bench', quote: 'The bench is the one thing this week.', said_by: 'user', now: true },
  ] });
  await tablet.waitForFunction(() => document.querySelectorAll('.card').length === 7, null, { timeout: 5000 });
  ok('TABLET redraws on its own when ChatGPT relays: 7 cards, no reload');
  assert.equal(await tablet.locator('.card.conv').count(), 7); ok('every card is marked as from conversation');
  await tablet.waitForTimeout(1500);
  const panel = await tablet.locator('.insp').innerText();
  assert.match(panel, /Now[\s\S]*Garden bench[\s\S]*Next[\s\S]*Ask Marta for the planer/i); ok('NOW and NEXT come from what you said');
  await shot(tablet, '02-tablet-live');

  // ---- 3. the inline card, in an MCP Apps host ----
  const res = await mcp('resources/read', { uri: 'ui://tangerine/tablet.html' });
  const html = res.contents[0].text;
  const host = await ctx.newPage(); watch(host);
  await host.setViewportSize({ width: 820, height: 900 });
  await host.exposeFunction('bridgeCall', (name, args) => call(name, args));
  await host.setContent(`<!doctype html><html><body style="margin:0;background:#fff;font:15px/1.5 -apple-system,Helvetica,sans-serif;color:#0d0d0d">
    <div style="max-width:740px;margin:0 auto;padding:28px 24px">
      <div style="margin-left:auto;max-width:72%;background:#f4f4f4;border-radius:18px;padding:10px 16px;margin-bottom:22px">Also the letterpress cards for the winter market, those are still on. I need to order cotton card stock by Thursday. The bench is the one thing this week.</div>
      <div style="margin-bottom:12px">Got it — I’ve put the bench first and kept the cards going. Here’s your TABLET:</div>
      <iframe id="view" style="width:100%;border:0;height:420px" sandbox="allow-scripts"></iframe>
      <div style="color:#8f8f8f;font-size:12px;margin-top:6px">Simulated host for testing · follows the MCP Apps handshake</div>
    </div></body></html>`);
  await host.evaluate(([html, result, args]) => {
    const f = document.getElementById('view');
    const reply = (m) => f.contentWindow.postMessage(m, '*');
    window.addEventListener('message', async (ev) => {
      const m = ev.data; if (!m || m.jsonrpc !== '2.0') return;
      if (m.method === 'ui/initialize') reply({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2026-01-26', hostInfo: { name: 'test-host', version: '1' }, hostCapabilities: { openLinks: {} }, hostContext: { theme: 'light', displayMode: 'inline' } } });
      if (m.method === 'ui/notifications/initialized') { reply({ jsonrpc: '2.0', method: 'ui/notifications/tool-input', params: { arguments: args } }); reply({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: result }); window.__initialized = true; }
      if (m.method === 'ui/notifications/size-changed') { f.style.height = m.params.height + 'px'; window.__sized = m.params.height; }
      if (m.method === 'tools/call') { const r = await window.bridgeCall(m.params.name, m.params.arguments); reply({ jsonrpc: '2.0', id: m.id, result: r }); }
      if (m.method === 'ui/open-link') { window.__opened = m.params.url; reply({ jsonrpc: '2.0', id: m.id, result: {} }); }
    });
    f.srcdoc = html;
  }, [html, relay, {}]);
  const view = host.frameLocator('#view');
  await view.locator('.changes').waitFor();
  assert.ok(await host.evaluate(() => window.__initialized)); ok('the card completes the MCP Apps handshake (ui/initialize → initialized)');
  assert.ok(await host.evaluate(() => window.__sized > 200)); ok('the card reports its height to the host');
  const card = await view.locator('#root').innerText();
  assert.match(card, /Now\s+Garden bench/i); assert.match(card, /From this conversation/i);
  assert.match(card, /Suggested\s+Sketch the joinery at full size · Action · ChatGPT suggested/i); ok('the card shows what changed, NOW, and a suggestion held back');
  await shot(host, '01-in-chatgpt');

  // undo from the conversation; TABLET follows
  await view.locator('li', { hasText: 'Mortise and tenon' }).locator('[data-undo]').click();
  await view.locator('li.undone', { hasText: 'Mortise and tenon' }).waitFor();
  await tablet.waitForFunction(() => !document.body.innerText.includes('Mortise and tenon'), null, { timeout: 5000 });
  ok('Undo in the conversation takes the card off TABLET');
  await view.locator('li', { hasText: 'Sketch the joinery' }).locator('[data-keep]').click();
  await tablet.waitForFunction(() => document.body.innerText.includes('Sketch the joinery'), null, { timeout: 5000 });
  ok('Keep in the conversation places the suggestion on TABLET, still labelled');
  await view.locator('#open').click();
  await host.waitForFunction(() => Boolean(window.__opened));
  assert.match(await host.evaluate(() => window.__opened), /^http:\/\/127\.0\.0\.1:\d+\/app\/\?live$/); ok('“Open TABLET” opens the local TABLET; the link carries no secret');

  // ---- 4. TABLET: evidence and the way back; your arrangement stays ----
  await tablet.bringToFront();
  await tablet.locator('.card', { hasText: 'Order cotton card stock' }).click();
  const insp = await tablet.locator('.insp').innerText();
  assert.match(insp, /“I need to order cotton card stock by Thursday\.”/); assert.match(insp, /You said/i); ok('each card keeps the exact words and who said them');
  assert.match(insp, /Relayed|Studio/i);
  await shot(tablet, '03-tablet-evidence');
  const c = tablet.locator('.card', { hasText: 'Letterpress cards' }); const box = await c.boundingBox();
  await tablet.mouse.move(box.x + 30, box.y + 15); await tablet.mouse.down(); await tablet.mouse.move(box.x + 30 + 120, box.y + 15 + 64, { steps: 6 }); await tablet.mouse.up();
  await tablet.waitForTimeout(300);
  const moved = (await bridge.store.items()).find((i) => i.title === 'Letterpress cards');
  await call('tangerine_update', { conversation: 'Studio', items: [{ type: 'person', title: 'Jun Park', quote: 'Jun Park at the print shop can cut the cards.', said_by: 'user', related: ['Letterpress cards'] }] });
  await tablet.waitForFunction(() => document.body.innerText.includes('Jun Park'), null, { timeout: 5000 });
  const after = (await bridge.store.items()).find((i) => i.title === 'Letterpress cards');
  assert.deepEqual([after.x, after.y], [moved.x, moved.y]); ok('a card you moved stays where you put it when new relays arrive');
  await tablet.waitForTimeout(1300);
  await tablet.locator('.board').click({ position: { x: 5, y: 5 } });
  await tablet.waitForTimeout(200);
  await shot(tablet, '04-tablet-after-conversation');

  // ---- 5. the live test, rehearsed: one fictional item, over each way ChatGPT can connect ----
  // (a) public development tunnel + OAuth, exactly as ChatGPT runs it
  const T = { 'X-Forwarded-For': '203.0.113.9', Host: 'tangerine.example' };
  const u = bridge.info.url;
  const reg = await (await fetch(u + '/oauth/register', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, T), body: JSON.stringify({ client_name: 'ChatGPT', redirect_uris: ['https://chatgpt.example/cb'] }) })).json();
  const crypto = await import('node:crypto');
  const verifier = crypto.randomBytes(32).toString('base64url'), challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  // the person's browser, sent by ChatGPT to the authorize page through the tunnel
  const consent = await ctx.newPage(); watch(consent);
  let redirectedTo = null; // where the bridge sends the browser back to ChatGPT
  await consent.route('https://tangerine.example/**', async (route) => { try {
    const r = route.request(); const url = new URL(r.url());
    const resp = await fetch(u + url.pathname + url.search, { method: r.method(), headers: Object.assign({}, r.headers(), T, { 'content-type': r.headers()['content-type'] || 'text/plain' }), body: r.postData() || undefined, redirect: 'manual' });
    if (resp.status >= 300 && resp.status < 400) { redirectedTo = resp.headers.get('location'); return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Returned to ChatGPT.</p>' }); }
    const keep = ['content-type', 'location', 'content-security-policy', 'cache-control'];
    await route.fulfill({ status: resp.status, headers: Object.fromEntries([...resp.headers].filter(([k]) => keep.includes(k))), body: Buffer.from(await resp.arrayBuffer()) });
  } catch (e) { console.log('ROUTE', e.message); throw e; } });
  await consent.route('https://chatgpt.example/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>ChatGPT received the authorization.</p>' }));
  await consent.goto('https://tangerine.example/oauth/authorize?' + new URLSearchParams({ response_type: 'code', client_id: reg.client_id, redirect_uri: 'https://chatgpt.example/cb', code_challenge: challenge, code_challenge_method: 'S256', state: 's1', scope: 'tangerine' }));
  assert.match(await consent.locator('h1').innerText(), /ChatGPT wants to read and update your TABLET/); ok('ChatGPT’s sign-in shows Tangerine’s consent page, asking for a code from this computer');
  await shot(consent, '05-connect-consent');
  const local = await ctx.newPage(); watch(local);
  await local.goto(bridge.loginUrl()); await local.goto(bridge.info.url + '/connect');
  assert.match(await local.locator('.code').innerText(), new RegExp(approvals[approvals.length - 1].code)); ok('the approval code is shown only on this computer (/connect)');
  await shot(local, '06-connect-local');
  await consent.locator('input[name="code"]').fill(approvals[approvals.length - 1].code);
  await consent.locator('button[type="submit"]').first().click();
  await consent.waitForFunction(() => /Returned to ChatGPT/.test(document.body.innerText));
  const back = new URL(redirectedTo);
  assert.equal(back.origin + back.pathname, 'https://chatgpt.example/cb'); assert.equal(back.searchParams.get('state'), 's1');
  const code = back.searchParams.get('code');
  const tok = await (await fetch(u + '/oauth/token', { method: 'POST', headers: T, body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: reg.client_id, redirect_uri: 'https://chatgpt.example/cb', code_verifier: verifier }) })).json();
  assert.ok(tok.access_token); ok('ChatGPT receives a token after you approve (PKCE verified)');
  await local.close(); await consent.close();
  const viaTunnel = Object.assign({ Authorization: 'Bearer ' + tok.access_token }, T);
  await tablet.bringToFront();
  const test = await call('tangerine_update', { conversation: 'Studio', items: [{ type: 'decision', title: 'Tangerine test: name the fern Ida', quote: 'Tangerine test: I have decided to name the fern Ida.', said_by: 'user' }] }, viaTunnel);
  await tablet.waitForFunction(() => document.body.innerText.includes('name the fern Ida'), null, { timeout: 5000 });
  ok('ChatGPT → Tangerine → TABLET: the fictional test item appears on TABLET');
  const pid = test.structuredContent.changes[0].proposalId;
  await call('tangerine_undo', { proposalId: pid }, viaTunnel);
  await tablet.waitForFunction(() => !document.body.innerText.includes('name the fern Ida'), null, { timeout: 5000 });
  ok('Undo (from the card in ChatGPT) → it leaves TABLET');

  // ---- 6. the view tool from a fresh card ----
  const v = await call('tangerine_view', {});
  assert.match(v.content[0].text, /NOW: Garden bench/); ok('“what’s on my plate?” — the view tool gives ChatGPT and the card the current picture');

  assert.deepEqual(errors, []); ok('no console or page errors');
  console.log(`\n${n} checks passed`);
} catch (e) { console.error(e); process.exitCode = 1; }
finally { await browser.close(); await bridge.close(); fs.rmSync(dir, { recursive: true, force: true }); }
