#!/usr/bin/env node
/*
 * Check the bridge on this computer before connecting ChatGPT, and print the
 * one-item live test.   node bridge/doctor.mjs [--public https://<tunnel-host>]
 * Read-only: it calls tools/list and resources/read, never tangerine_update.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.env.TANGERINE_DIR || path.join(ROOT, 'private', 'bridge');
const port = Number(process.env.TANGERINE_PORT) || 4330;
const pub = (process.argv.includes('--public') ? process.argv[process.argv.indexOf('--public') + 1] : process.env.TANGERINE_PUBLIC_URL || '').replace(/\/$/, '');
let bad = 0;
const line = (ok, what, more) => { if (!ok) bad++; console.log((ok ? '  ✓ ' : '  ✗ ') + what + (more ? '\n      ' + more : '')); };

console.log('\nTangerine bridge · doctor\n');
const major = Number(process.versions.node.split('.')[0]);
line(major >= 20, 'Node ' + process.versions.node, major >= 20 ? '' : 'Node 20 or later is needed.');
let key = null;
try { key = fs.readFileSync(path.join(dir, 'bridge.key'), 'utf8').trim(); const m = fs.statSync(path.join(dir, 'bridge.key')).mode & 0o777; line(m === 0o600, 'local key present, readable only by you', m === 0o600 ? '' : 'chmod 600 ' + path.join(dir, 'bridge.key')); }
catch (e) { line(false, 'local key present', 'Start the bridge once: node bridge/server.mjs'); }

const rpc = (method, params) => fetch('http://127.0.0.1:' + port + '/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then((r) => r.json());
try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'doctor', version: '1' } });
  line(init.result && init.result.serverInfo.name === 'tangerine', 'bridge running on 127.0.0.1:' + port);
  const tools = (await rpc('tools/list', {})).result.tools.map((t) => t.name);
  line(tools.includes('tangerine_update') && tools.includes('tangerine_view'), 'tools: ' + tools.join(', '));
  const res = (await rpc('resources/read', { uri: 'ui://tangerine/tablet.html' })).result.contents[0];
  line(res.mimeType === 'text/html;profile=mcp-app', 'inline TABLET view (' + res.mimeType + ')');
} catch (e) { line(false, 'bridge running on 127.0.0.1:' + port, 'Start it in another window: node bridge/server.mjs'); }

// Path A: the stdio relay that OpenAI's tunnel-client runs
await new Promise((done) => {
  const c = spawn(process.execPath, [path.join(ROOT, 'bridge', 'stdio.mjs')], { env: process.env });
  let out = ''; const t = setTimeout(() => { c.kill(); line(false, 'stdio relay (Secure MCP Tunnel path)', 'no answer'); done(); }, 4000);
  c.stdout.on('data', (d) => { out += d; if (out.includes('\n')) { clearTimeout(t); c.kill(); const m = JSON.parse(out.split('\n')[0]); line(Boolean(m.result), 'stdio relay (Secure MCP Tunnel path): node bridge/stdio.mjs', m.result ? '' : m.error && m.error.message); done(); } });
  c.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'doctor', version: '1' } } }) + '\n');
});

// Path B: a public development tunnel with OAuth
if (pub) {
  try {
    const prm = await (await fetch(pub + '/.well-known/oauth-protected-resource')).json();
    line(prm.resource === pub + '/mcp', 'tunnel reaches the bridge; OAuth discovery at ' + pub, prm.resource === pub + '/mcp' ? '' : 'Restart the bridge with TANGERINE_PUBLIC_URL=' + pub);
    const r = await fetch(pub + '/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: '{}' });
    line(r.status === 401, 'the local key does not work through the tunnel (as it should)');
    const t = await fetch(pub + '/app/');
    line(t.status === 404, 'TABLET is not reachable through the tunnel (as it should)');
  } catch (e) { line(false, 'tunnel reaches the bridge', e.message); }
} else console.log('  · public tunnel not checked (only needed without Secure MCP Tunnel): --public https://<tunnel-host>');

console.log(`
${bad ? bad + ' problem(s) above.' : 'Ready.'}

Live test — one fictional item, before any private history:
  1. In ChatGPT, open a new chat with Tangerine enabled and say:
       Tangerine test: I have decided to name the fern Ida. Please update Tangerine.
  2. Confirm the write if ChatGPT asks.          Bridge window: "ChatGPT → Tangerine … added decision"
  3. The TABLET card appears in the chat.         TABLET on your desktop shows the card within a second.
  4. Press Undo on the card in ChatGPT.           Bridge: "TABLET card in ChatGPT → Undo"; the card leaves TABLET.
  5. Say: "What's on my TABLET?"                   ChatGPT calls the read-only view.
`);
process.exit(bad ? 1 : 0);
