/*
 * Tangerine — source store.
 *
 * One rule: an original is never changed by anything except its author.
 *
 * - Sources (writing, notes, photographs, collected material) are kept as an
 *   append-only list of revisions. Revision 1 is the original, with a SHA-256
 *   fingerprint taken when it was kept. A later revision needs the explicit
 *   USER_EDIT token; the earlier ones remain. Collected material (another
 *   author's words) can never be revised.
 * - The Whiteboard is the author's own working layer. Its items and links only
 *   *reference* sources by id; nothing on the board writes into a source.
 * - Derived material (index suggestions, dismissals) lives in its own
 *   collection, is labeled as derived, and is reversible.
 * - Import never overwrites. Everything returned is a frozen copy.
 *
 * Carries forward the append-only design proven in experiment/001-fear
 * (experiments/001-fear/store.js) and the bookmark from haven-001-return-loop.
 *
 * Browser: IndexedDB, with a memory fallback. Node: memory (tests).
 */
(function (root) {
  'use strict';

  const USER_EDIT = 'user-edit';
  const USER_DELETE = 'user-delete';
  const SOURCE_KINDS = ['writing', 'note', 'photograph', 'collected'];
  const ITEM_KINDS = ['project', 'person', 'idea', 'source'];
  const COLLECTIONS = ['sources', 'items', 'links', 'derived', 'meta'];

  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  function deepFreeze(v) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) {
      Object.freeze(v);
      Object.values(v).forEach(deepFreeze);
    }
    return v;
  }
  const frozen = (v) => deepFreeze(clone(v));
  let seq = 0;
  const makeId = (p) => p + '-' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
  const now = () => new Date().toISOString();

  async function fingerprint(text) {
    const subtle = root.crypto && root.crypto.subtle;
    if (!subtle) return null;
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const canonical = (r) => JSON.stringify([r.title || '', r.body || '']);

  /* ---- backends ---- */

  function memoryBackend() {
    const s = {};
    COLLECTIONS.forEach((c) => (s[c] = new Map()));
    return {
      durable: false,
      async all(c) { return [...s[c].values()].map(clone); },
      async get(c, k) { return clone(s[c].get(k)); },
      async put(c, k, v) { s[c].set(k, clone(v)); },
      async remove(c, k) { s[c].delete(k); },
    };
  }

  function indexedDBBackend(name) {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const req = root.indexedDB.open(name, 1);
      req.onupgradeneeded = () => {
        COLLECTIONS.forEach((c) => { if (!req.result.objectStoreNames.contains(c)) req.result.createObjectStore(c); });
      };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const run = (c, mode, fn) => new Promise((ok, fail) => {
          const tx = db.transaction(c, mode);
          const r = fn(tx.objectStore(c));
          tx.oncomplete = () => ok(r && 'result' in r ? r.result : undefined);
          tx.onerror = () => fail(tx.error);
        });
        resolve({
          durable: true,
          all: (c) => run(c, 'readonly', (o) => o.getAll()),
          get: (c, k) => run(c, 'readonly', (o) => o.get(k)),
          put: (c, k, v) => run(c, 'readwrite', (o) => o.put(v, k)),
          remove: (c, k) => run(c, 'readwrite', (o) => o.delete(k)),
        });
      };
    });
  }

  /* ---- store ---- */

  function createStore(backend) {
    const current = (src) => src.revisions[src.revisions.length - 1];

    async function requireSource(id) {
      const s = await backend.get('sources', id);
      if (!s) throw new Error('No source ' + id);
      return s;
    }

    const api = {
      USER_EDIT, USER_DELETE, SOURCE_KINDS, ITEM_KINDS,
      durable: backend.durable,
      current: (src) => frozen(current(src)),

      /* Sources: the originals. */
      async keepSource(input) {
        if (!SOURCE_KINDS.includes(input.kind)) throw new Error('Unknown source kind ' + input.kind);
        const rev = { n: 1, at: now(), by: 'author', title: String(input.title || ''), body: String(input.body || '') };
        rev.sha256 = await fingerprint(canonical(rev));
        const src = {
          id: input.id || makeId('src'),
          kind: input.kind,
          author: input.author || null,           // who made it; for collected material, the original author
          madeOn: input.madeOn || null,            // the original date, as the author gives it
          provenance: input.provenance || null,    // where it came from
          plate: input.plate || null,              // photograph metadata (no image is embedded in this study)
          demonstration: Boolean(input.demonstration),
          keptAt: rev.at,
          revisions: [rev],
        };
        if (await backend.get('sources', src.id)) throw new Error('Source exists: ' + src.id);
        await backend.put('sources', src.id, src);
        return frozen(src);
      },

      async reviseSource(id, change, token) {
        if (token !== USER_EDIT) throw new Error('Sources change only by explicit author edit');
        const src = await requireSource(id);
        if (src.kind === 'collected') throw new Error('Collected material is kept exactly as found');
        const prev = current(src);
        const rev = { n: prev.n + 1, at: now(), by: 'author', title: change.title ?? prev.title, body: change.body ?? prev.body };
        rev.sha256 = await fingerprint(canonical(rev));
        src.revisions.push(rev);
        await backend.put('sources', id, src);
        return frozen(src);
      },

      async verifySource(id) {
        const src = await requireSource(id);
        const r = src.revisions[0];
        const h = await fingerprint(canonical(r));
        return { id, original: r.sha256, now: h, intact: h === null || h === r.sha256 };
      },

      async deleteSource(id, token) {
        if (token !== USER_DELETE) throw new Error('Sources are removed only by explicit author request');
        await backend.remove('sources', id);
      },

      async getSource(id) { return frozen(await backend.get('sources', id)); },
      async sources() {
        return frozen((await backend.all('sources')).sort((a, b) => (b.madeOn || b.keptAt).localeCompare(a.madeOn || a.keptAt)));
      },

      /* Whiteboard: the author's working layer. References, never copies. */
      async addItem(input) {
        if (!ITEM_KINDS.includes(input.kind)) throw new Error('Unknown item kind ' + input.kind);
        if (input.kind === 'source') await requireSource(input.sourceId);
        const items = await backend.all('items');
        const item = {
          id: input.id || makeId('itm'),
          kind: input.kind,
          no: input.no || 1 + items.reduce((m, i) => Math.max(m, i.no || 0), 0),
          title: input.kind === 'source' ? null : String(input.title || 'Untitled'),
          sourceId: input.kind === 'source' ? input.sourceId : null,
          role: input.role || null,                // a person's relation, in the author's words
          x: Math.round(input.x || 0), y: Math.round(input.y || 0),
          now: false,
          bookmarks: [],
          demonstration: Boolean(input.demonstration),
          createdAt: now(),
        };
        if (input.bookmark) item.bookmarks.push({ at: input.bookmarkAt || now(), ...pickBookmark(input.bookmark) });
        await backend.put('items', item.id, item);
        return frozen(item);
      },

      async updateItem(id, change) {
        const item = await backend.get('items', id);
        if (!item) throw new Error('No item ' + id);
        if ('x' in change) item.x = Math.round(change.x);
        if ('y' in change) item.y = Math.round(change.y);
        // A pinned source has no title of its own: it shows the original's.
        if (item.kind !== 'source') {
          if ('title' in change) item.title = String(change.title);
          if ('role' in change) item.role = String(change.role);
        }
        await backend.put('items', id, item);
        return frozen(item);
      },

      /* Only one thing is "now". */
      async setNow(id) {
        const items = await backend.all('items');
        for (const it of items) {
          const want = it.id === id;
          if (it.now !== want) { it.now = want; await backend.put('items', it.id, it); }
        }
      },

      /* Bookmarks are append-only: the history of where you stopped. */
      async addBookmark(id, bookmark) {
        const item = await backend.get('items', id);
        if (!item) throw new Error('No item ' + id);
        item.bookmarks.push({ at: now(), ...pickBookmark(bookmark) });
        await backend.put('items', id, item);
        return frozen(item);
      },

      async removeItem(id) {
        await backend.remove('items', id);
        for (const l of await backend.all('links')) if (l.a === id || l.b === id) await backend.remove('links', l.id);
      },
      async items() { return frozen((await backend.all('items')).sort((a, b) => a.no - b.no)); },

      async link(a, b, note) {
        if (a === b) throw new Error('An item cannot link to itself');
        const links = await backend.all('links');
        const found = links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
        if (found) return frozen(found);
        const l = { id: makeId('lnk'), a, b, note: note ? String(note) : '', at: now() };
        await backend.put('links', l.id, l);
        return frozen(l);
      },
      async unlink(id) { await backend.remove('links', id); },
      async links() { return frozen(await backend.all('links')); },

      /* Derived layer: labeled, separate, reversible. */
      async dismiss(key) { await backend.put('derived', 'dismiss:' + key, { key, at: now() }); },
      async undismiss(key) { await backend.remove('derived', 'dismiss:' + key); },
      async dismissed() { return new Set((await backend.all('derived')).map((d) => d.key)); },

      async getMeta(k) { return clone(await backend.get('meta', k)); },
      async setMeta(k, v) { await backend.put('meta', k, v); },

      async removeDemonstration() {
        for (const s of await backend.all('sources')) if (s.demonstration) await backend.remove('sources', s.id);
        for (const i of await backend.all('items')) if (i.demonstration) await api.removeItem(i.id);
      },

      async exportAll() {
        const out = { format: 'tangerine/foundation-001', exportedAt: now() };
        for (const c of ['sources', 'items', 'links', 'derived']) out[c] = await backend.all(c);
        return out;
      },

      /* Import adds what is missing. It never replaces what is already kept. */
      async importAll(data) {
        let added = 0, kept = 0;
        for (const c of ['sources', 'items', 'links', 'derived']) {
          for (const v of data[c] || []) {
            const key = c === 'derived' ? 'dismiss:' + v.key : v.id;
            if (await backend.get(c, key)) { kept++; continue; }
            await backend.put(c, key, v); added++;
          }
        }
        return { added, kept };
      },
    };
    return api;
  }

  function pickBookmark(b) {
    return {
      stands: String(b.stands || ''),     // where it stands
      question: String(b.question || ''), // the open question
      next: String(b.next || ''),         // the next move
    };
  }

  async function openStore(name) {
    try { return createStore(await indexedDBBackend(name || 'tangerine-foundation-001')); }
    catch (e) { return createStore(memoryBackend()); }
  }

  const exported = { createStore, memoryBackend, openStore, USER_EDIT, USER_DELETE, deepFreeze };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.TangerineStore = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
