#!/usr/bin/env node
/*
 * Backfill TABLET from your ChatGPT data export — once, on this machine.
 *
 *   node bridge/backfill.mjs ~/Downloads/conversations.json            list conversations
 *   node bridge/backfill.mjs ~/Downloads/conversations.json --pick 3   bring in #3
 *   node bridge/backfill.mjs … --pick "Studio" --as "Studio"           by title; name the thread
 *
 * Only the conversation you pick is kept, in private/bridge/ (git-ignored).
 * The export file itself is read in memory and not copied. Run with the
 * bridge stopped or running; TABLET updates either way.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { fileBackend } from './file-store.mjs';
import { createTangerine } from './tangerine.mjs';
const require = createRequire(import.meta.url);
const Capture = require('../core/capture.js');
const { createStore } = require('../core/store.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const [file, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
if (!file) { console.log('Usage: node bridge/backfill.mjs <conversations.json> [--pick <n|title>] [--as <thread name>] [--dir private/bridge]'); process.exit(1); }
const real = path.resolve(file);
if (real.startsWith(ROOT + path.sep) && !real.startsWith(path.join(ROOT, 'private') + path.sep)) {
  console.error('Refusing: that file is inside the repository. Keep your export outside it (or under private/, which is git-ignored).'); process.exit(1);
}
const list = Capture.parseExport(JSON.parse(fs.readFileSync(real, 'utf8')));
const pick = opt('--pick');
if (!pick) {
  console.log(list.length + ' conversations (most recent first):\n');
  list.slice(0, 60).forEach((c, i) => console.log(String(i + 1).padStart(3), ' ', (c.updated || '').slice(0, 10), ' ', String(c.turns.length).padStart(4), 'turns  ', c.title));
  console.log('\nThen: node bridge/backfill.mjs ' + file + ' --pick <number or title> [--as "<name for the ongoing conversation>"]');
  process.exit(0);
}
const conv = /^\d+$/.test(pick) ? list[Number(pick) - 1] : list.find((c) => c.title === pick || c.id === pick);
if (!conv) { console.error('No conversation ' + JSON.stringify(pick)); process.exit(1); }
const dir = path.resolve(opt('--dir') || path.join(ROOT, 'private', 'bridge'));
const store = createStore(fileBackend(path.join(dir, 'tangerine-store.json')));
const T = createTangerine(store);
const thread = opt('--as') || conv.title;
const r = await T.backfill({ turns: conv.turns, thread, title: conv.title, exportId: conv.id });
const n = (op) => r.changes.filter((c) => c.op === op).length;
console.log(`“${conv.title}” → thread “${thread}”
  ${r.kept} turns kept${r.seen ? ', ' + r.seen + ' already kept earlier' : ''}${conv.branchExact ? '' : ' (export had no active branch marker; all branches read)'}
  ${n('added')} placed on TABLET · ${n('updated')} existing cards updated · ${n('suggested')} waiting as suggestions (review them in TABLET → Capture)`);
