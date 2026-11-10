#!/usr/bin/env node
/*
 * Tangerine over stdio — for OpenAI's Secure MCP Tunnel.
 *
 * tunnel-client runs this command on your computer and passes MCP messages
 * (newline-delimited JSON-RPC) through stdin/stdout. Each message is relayed to
 * the bridge on 127.0.0.1 with the local key, read from private/bridge/bridge.key.
 * Nothing listens publicly, and no key travels in a URL or leaves this computer.
 *
 *   node bridge/stdio.mjs        (the bridge, node bridge/server.mjs, must be running)
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.env.TANGERINE_DIR || path.join(ROOT, 'private', 'bridge');
const port = Number(process.env.TANGERINE_PORT) || 4330;
const keyPath = path.join(dir, 'bridge.key');
const say = (m) => process.stdout.write(JSON.stringify(m) + '\n');
const note = (s) => process.stderr.write('[tangerine stdio] ' + s + '\n');

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch (e) { return say({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  const fail = (text) => { const ids = (Array.isArray(msg) ? msg : [msg]).filter((m) => m && m.id !== undefined); for (const m of ids) say({ jsonrpc: '2.0', id: m.id, error: { code: -32000, message: text } }); };
  let key;
  try { key = fs.readFileSync(keyPath, 'utf8').trim(); } catch (e) { note('no key at ' + keyPath); return fail('Tangerine is not set up on this computer: start the bridge once (node bridge/server.mjs).'); }
  try {
    const r = await fetch('http://127.0.0.1:' + port + '/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + key }, body: line });
    if (r.status === 202) return;
    const body = await r.json();
    if (Array.isArray(body)) body.forEach(say); else say(body);
  } catch (e) {
    note('bridge unreachable: ' + e.message);
    fail('The Tangerine bridge is not running on this computer. Start it with: node bridge/server.mjs');
  }
});
