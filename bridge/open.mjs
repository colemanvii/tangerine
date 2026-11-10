#!/usr/bin/env node
/*
 * Print a fresh one-time TABLET sign-in link (valid two minutes, this computer only),
 * and open it in the default browser.   node bridge/open.mjs [--print]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.env.TANGERINE_DIR || path.join(ROOT, 'private', 'bridge');
const port = Number(process.env.TANGERINE_PORT) || 4330;
try {
  const key = fs.readFileSync(path.join(dir, 'bridge.key'), 'utf8').trim();
  const r = await fetch('http://127.0.0.1:' + port + '/local/login-link', { method: 'POST', headers: { Authorization: 'Bearer ' + key } });
  const { url } = await r.json();
  console.log(url);
  if (!process.argv.includes('--print')) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
} catch (e) { console.error('The bridge is not running here. Start it with: node bridge/server.mjs'); process.exit(1); }
