/*
 * Haven store.
 *
 * The rule this file exists to enforce: what you put into Haven is never changed
 * by anything except you. Entries are kept as an append-only list of revisions.
 * Nothing in Haven rewrites a revision; an explicit edit by you adds a new one,
 * and an explicit delete by you removes the entry. Suggested connections and
 * commentary live elsewhere and only ever reference entries by id.
 *
 * Storage is this browser only (IndexedDB), with a memory fallback when the
 * browser refuses storage. Export gives you a complete JSON copy.
 */
(function (root) {
  'use strict';

  const USER_EDIT = 'user-edit';
  const USER_DELETE = 'user-delete';
  const KINDS = ['writing', 'note', 'question', 'quotation', 'image', 'collected'];

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
    return value;
  }

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const makeId = (prefix) =>
    prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

  /* ---- backends ---- */

  function memoryBackend() {
    const stores = { entries: new Map(), links: new Map(), meta: new Map() };
    return {
      durable: false,
      async all(store) { return [...stores[store].values()].map(clone); },
      async get(store, key) { const v = stores[store].get(key); return v === undefined ? undefined : clone(v); },
      async put(store, key, value) { stores[store].set(key, clone(value)); },
      async remove(store, key) { stores[store].delete(key); },
    };
  }

  function indexedDBBackend(name) {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const req = root.indexedDB.open(name, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        ['entries', 'links', 'meta'].forEach((s) => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
        });
      };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const run = (store, mode, fn) =>
          new Promise((ok, fail) => {
            const tx = db.transaction(store, mode);
            const result = fn(tx.objectStore(store));
            tx.oncomplete = () => ok(result && 'result' in result ? result.result : undefined);
            tx.onerror = () => fail(tx.error);
          });
        resolve({
          durable: true,
          all: (s) => run(s, 'readonly', (os) => os.getAll()),
          get: (s, k) => run(s, 'readonly', (os) => os.get(k)),
          put: (s, k, v) => run(s, 'readwrite', (os) => os.put(v, k)),
          remove: (s, k) => run(s, 'readwrite', (os) => os.delete(k)),
        });
      };
    });
  }

  /* ---- store ---- */

  function createStore(backend) {
    function current(entry) {
      return entry.revisions[entry.revisions.length - 1];
    }

    function validateFields(kind, fields) {
      if (!KINDS.includes(kind)) throw new Error('Unknown kind: ' + kind);
      const body = (fields.body || '').trim();
      if (kind === 'image' && !fields.image) throw new Error('An image entry needs an image.');
      if (kind !== 'image' && kind !== 'collected' && !body) throw new Error('Nothing to keep.');
    }

    const api = {
      durable: backend.durable,
      current,

      async list() {
        const items = await backend.all('entries');
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return items.map(deepFreeze);
      },

      async get(id) {
        const e = await backend.get('entries', id);
        return e ? deepFreeze(e) : undefined;
      },

      /* Add something new. origin is 'you' unless it is labeled demonstration material. */
      async add(kind, fields, options = {}) {
        validateFields(kind, fields);
        const now = options.createdAt || new Date().toISOString();
        const entry = {
          id: options.id || makeId(kind),
          kind,
          origin: options.origin === 'demo' ? 'demo' : 'you',
          createdAt: now,
          anchor: options.anchor || null, // a passage id this was written beside
          revisions: [Object.assign({ at: now }, clone(fields))],
        };
        await backend.put('entries', entry.id, entry);
        return deepFreeze(entry);
      },

      /* Only an explicit edit by the person adds a revision. Earlier revisions are kept. */
      async revise(id, fields, authority) {
        if (authority !== USER_EDIT) throw new Error('Entries change only by an explicit edit from you.');
        const entry = await backend.get('entries', id);
        if (!entry) throw new Error('No such entry.');
        if (entry.kind === 'collected') throw new Error('A collected passage is kept as the source printed it.');
        validateFields(entry.kind, Object.assign({}, current(entry), fields));
        const next = Object.assign({}, clone(current(entry)), clone(fields), { at: new Date().toISOString() });
        entry.revisions.push(next);
        await backend.put('entries', id, entry);
        return deepFreeze(entry);
      },

      async remove(id, authority) {
        if (authority !== USER_DELETE) throw new Error('Entries are deleted only when you ask.');
        await backend.remove('entries', id);
        for (const link of await backend.all('links')) {
          if (link.a === id || link.b === id) await backend.remove('links', link.id);
        }
      },

      /* Connections you have confirmed. Each holds only references and your own words. */
      async links() { return (await backend.all('links')).map(deepFreeze); },
      async connect(a, b, note) {
        const link = { id: makeId('link'), a, b, note: (note || '').trim(), by: 'you', at: new Date().toISOString() };
        await backend.put('links', link.id, link);
        return deepFreeze(link);
      },
      async disconnect(id) { await backend.remove('links', id); },

      /* Small working state: reading place, bookmark, drafts, dismissed suggestions. */
      async meta(key, fallback) { const v = await backend.get('meta', key); return v === undefined ? fallback : v; },
      async setMeta(key, value) { await backend.put('meta', key, value); },

      async exportAll() {
        return {
          format: 'haven-001',
          exportedAt: new Date().toISOString(),
          entries: await backend.all('entries'),
          links: await backend.all('links'),
        };
      },

      /* Import adds what is missing and never overwrites an entry that already exists. */
      async importAll(data) {
        if (!data || data.format !== 'haven-001') throw new Error('Not a Haven 001 export.');
        let added = 0;
        for (const e of data.entries || []) {
          if (!e || !e.id || !Array.isArray(e.revisions) || !e.revisions.length || !KINDS.includes(e.kind)) continue;
          if (await backend.get('entries', e.id)) continue;
          await backend.put('entries', e.id, e);
          added++;
        }
        for (const l of data.links || []) {
          if (l && l.id && !(await backend.get('links', l.id))) await backend.put('links', l.id, l);
        }
        return added;
      },
    };
    return api;
  }

  async function open(name) {
    try {
      return createStore(await indexedDBBackend(name || 'haven-experiment-001'));
    } catch (err) {
      return createStore(memoryBackend());
    }
  }

  const HavenStore = { open, createStore, memoryBackend, USER_EDIT, USER_DELETE, KINDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = HavenStore;
  else root.HavenStore = HavenStore;
})(typeof window !== 'undefined' ? window : globalThis);
