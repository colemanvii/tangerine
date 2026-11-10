/*
 * A file backend for core/store.js, so the bridge and TABLET share one store
 * on the person's own machine.
 *
 * One JSON file, written atomically (temp file, then rename). It lives in the
 * git-ignored private/ folder by default: real conversation material must never
 * enter this public repository.
 */
import fs from 'node:fs';
import path from 'node:path';

const COLLECTIONS = ['sources', 'items', 'links', 'derived', 'meta', 'drafts', 'proposals'];
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export function fileBackend(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let data = {};
  if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8'));
  COLLECTIONS.forEach((c) => { if (!data[c] || typeof data[c] !== 'object') data[c] = {}; });
  let version = 0;
  const listeners = new Set();
  function save() {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
    version++;
    for (const fn of listeners) { try { fn(version); } catch (e) { /* a listener's failure is not the store's */ } }
  }
  return {
    durable: true,
    file,
    get version() { return version; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async all(c) { return Object.values(data[c]).map(clone); },
    async get(c, k) { return clone(data[c][k]); },
    async put(c, k, v) { data[c][k] = clone(v); save(); },
    async remove(c, k) { if (k in data[c]) { delete data[c][k]; save(); } },
    collections: COLLECTIONS,
  };
}
