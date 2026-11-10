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
 * - Drafts are unfinished work: autosaved working copies, kept apart from the
 *   originals. A draft becomes an original (or a new revision) only when the
 *   author keeps it.
 * - Restore never overwrites. A backup is validated first; it may add what is
 *   missing and append later revisions, and anything that differs from what
 *   is kept is added beside it as a separate copy. Everything returned is a
 *   frozen copy.
 *
 * - Conversations brought in by the person are kept like collected material:
 *   exactly as captured, never revised. What synthesis proposes from them lives
 *   in its own collection ('proposals') and reaches the board only when the
 *   person accepts it. An accepted object keeps its evidence: the conversation,
 *   the turn and the exact words.
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
  const SOURCE_KINDS = ['writing', 'note', 'photograph', 'collected', 'conversation'];
  const FIXED_KINDS = ['collected', 'conversation'];   // kept exactly as found; never revised
  const ITEM_KINDS = ['project', 'person', 'idea', 'source', 'decision', 'action', 'question'];
  const COLLECTIONS = ['sources', 'items', 'links', 'derived', 'meta', 'drafts', 'proposals'];
  const BACKUP_FORMAT = 'tangerine/foundation-001';
  const DATA = ['sources', 'items', 'links', 'derived', 'drafts', 'proposals'];
  const OPTIONAL = ['drafts', 'proposals'];             // older backups predate these

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
      const req = root.indexedDB.open(name, 3); // v2 adds drafts, v3 proposals
      req.onupgradeneeded = () => {
        COLLECTIONS.forEach((c) => { if (!req.result.objectStoreNames.contains(c)) req.result.createObjectStore(c); });
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Another Tangerine tab is open with an older version. Close it and reload.'));
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close();
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
          conversation: input.kind === 'conversation' ? pickConversation(input.conversation) : null,
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
        if (src.kind === 'conversation') throw new Error('A captured conversation is kept exactly as captured');
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
        // 'unavailable': this connection cannot compute SHA-256 (not a secure context).
        // 'unfingerprinted': no fingerprint was taken when it was kept.
        // Neither is a verification, and neither is reported as one.
        const status = !r.sha256 ? 'unfingerprinted' : h === null ? 'unavailable' : h === r.sha256 ? 'intact' : 'changed';
        return { id, original: r.sha256, now: h, status, intact: status === 'intact' ? true : status === 'changed' ? false : null };
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
          // Where it came from: the author, or a conversation (via an accepted proposal).
          origin: input.origin === 'conversation' ? 'conversation' : 'author',
          basis: input.basis || null,              // 'you' | 'chatgpt' | 'unverified' — who said it
          confidence: input.confidence || null,
          evidence: (input.evidence || []).map(pickEvidence),
          synthKey: input.synthKey || null,
          status: input.kind === 'action' ? (input.status === 'done' ? 'done' : 'open') : null,
          when: input.when ? String(input.when) : null,  // the words used ("by Friday"), never a computed date
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
        if (item.kind === 'action' && 'status' in change) item.status = change.status === 'done' ? 'done' : 'open';
        if (!item.evidence) item.evidence = [];
        if (change.addEvidence) for (const e of change.addEvidence.map(pickEvidence)) {
          if (!item.evidence.some((x) => sameEvidence(x, e))) item.evidence.push(e);
        }
        if (change.removeEvidence) item.evidence = item.evidence.filter((x) => !change.removeEvidence.some((e) => sameEvidence(x, e)));
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

      /* meta.origin: 'author' (drawn by hand) | 'conversation' (stated) | 'inferred' (from nearby context). */
      async link(a, b, note, meta) {
        if (a === b) throw new Error('An item cannot link to itself');
        const links = await backend.all('links');
        const found = links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
        if (found) return frozen(found);
        const origin = meta && ['conversation', 'inferred'].includes(meta.origin) ? meta.origin : 'author';
        const l = { id: makeId('lnk'), a, b, note: note ? String(note) : '', origin, at: now() };
        if (meta && meta.proposalId) l.proposalId = String(meta.proposalId);
        await backend.put('links', l.id, l);
        return frozen(l);
      },
      async unlink(id) { await backend.remove('links', id); },
      async links() { return frozen(await backend.all('links')); },

      /* Derived layer: labeled, separate, reversible. */
      async dismiss(key) { await backend.put('derived', 'dismiss:' + key, { key, at: now() }); },
      async undismiss(key) { await backend.remove('derived', 'dismiss:' + key); },
      async dismissed() { return new Set((await backend.all('derived')).map((d) => d.key)); },

      /*
       * Proposals: what synthesis suggests from one captured conversation.
       * Derived, separate, reviewable. Saving the same proposal again keeps the
       * person's decision about it (accepted, dismissed) and its edited title.
       */
      async saveProposals(sourceId, list, extra) {
        await requireSource(sourceId);
        const out = [];
        for (const p of list) {
          const id = sourceId + '|' + p.key;
          const prev = await backend.get('proposals', id);
          if (prev) { out.push(prev); continue; }
          const rec = Object.assign(clone(p), { id, sourceId, state: 'pending', itemId: null, edited: null, at: now() }, extra || {});
          await backend.put('proposals', id, rec);
          out.push(rec);
        }
        return frozen(out);
      },
      async proposals(sourceId) {
        const all = await backend.all('proposals');
        return frozen(all.filter((p) => !sourceId || p.sourceId === sourceId).sort((a, b) => a.at.localeCompare(b.at)));
      },
      async setProposal(id, change) {
        const p = await backend.get('proposals', id);
        if (!p) throw new Error('No proposal ' + id);
        if ('state' in change) { if (!['pending', 'accepted', 'dismissed'].includes(change.state)) throw new Error('Unknown state'); p.state = change.state; }
        if ('itemId' in change) p.itemId = change.itemId || null;
        if ('edited' in change) p.edited = change.edited ? String(change.edited) : null;
        if ('created' in change) p.created = Boolean(change.created);  // true when accepting it made a new card
        p.decidedAt = now();
        await backend.put('proposals', id, p);
        return frozen(p);
      },

      /* Drafts: unfinished work, autosaved. Not originals until kept. */
      async saveDraft(d) {
        if (!d || !d.key) throw new Error('A draft needs a key');
        const prev = await backend.get('drafts', d.key);
        const draft = {
          key: String(d.key),
          sourceId: d.sourceId || null,              // the original it will revise, if any
          kind: SOURCE_KINDS.includes(d.kind) && d.kind !== 'collected' ? d.kind : 'writing',
          title: String(d.title || ''), body: String(d.body || ''),
          baseN: d.baseN || null,                     // the revision it started from
          itemId: d.itemId || (prev && prev.itemId) || null, // the TABLET object it is written about, if any
          startedAt: (prev && prev.startedAt) || d.startedAt || now(),
          savedAt: now(),
        };
        await backend.put('drafts', draft.key, draft);
        return frozen(draft);
      },
      async getDraft(key) { return frozen(await backend.get('drafts', key)); },
      async drafts() { return frozen((await backend.all('drafts')).sort((a, b) => b.savedAt.localeCompare(a.savedAt))); },
      async discardDraft(key) { await backend.remove('drafts', key); },

      async getMeta(k) { return clone(await backend.get('meta', k)); },
      async setMeta(k, v) { await backend.put('meta', k, v); },

      async removeDemonstration() {
        for (const s of await backend.all('sources')) if (s.demonstration) await backend.remove('sources', s.id);
        for (const i of await backend.all('items')) if (i.demonstration) await api.removeItem(i.id);
        const gone = new Set((await backend.all('sources')).map((x) => x.id));
        for (const p of await backend.all('proposals')) if (p.demonstration || !gone.has(p.sourceId)) await backend.remove('proposals', p.id);
      },

      async exportAll() {
        const out = { format: BACKUP_FORMAT, version: 3, exportedAt: now() };
        for (const c of DATA) out[c] = await backend.all(c);
        return out;
      },

      /*
       * Restore from a backup. Validates everything first; if anything is
       * wrong, nothing is written. Then, record by record:
       *   missing here            → added
       *   identical               → left alone
       *   same original, later revisions in the copy → those revisions appended
       *   differs from what is kept → added beside it as a separate copy
       * Nothing that is already kept is replaced or removed.
       * With { dryRun: true } it reports what it would do and writes nothing.
       */
      async restore(data, opts) {
        const dry = Boolean(opts && opts.dryRun);
        const check = await validateBackup(data);
        const report = { ok: check.ok, errors: check.errors, notes: check.notes, exportedAt: data && data.exportedAt || null,
          counts: check.counts, added: 0, extended: 0, separate: 0, same: 0, items: 0, links: 0, drafts: 0, draftsSeparate: 0, proposals: 0 };
        if (!check.ok) return report;
        const writes = [];
        for (const src of data.sources || []) {
          const mine = await backend.get('sources', src.id);
          if (!mine) { report.added++; writes.push(['sources', src.id, src]); continue; }
          const cmp = compareRevisions(mine.revisions, src.revisions);
          if (cmp === 'same' || cmp === 'mine-ahead') { report.same++; continue; }
          if (cmp === 'theirs-ahead') {
            report.extended++;
            writes.push(['sources', src.id, Object.assign(clone(mine), { revisions: mine.revisions.concat(clone(src.revisions.slice(mine.revisions.length))) })]);
            continue;
          }
          report.separate++;
          const copy = Object.assign(clone(src), { id: makeId('src'), restoredFrom: src.id,
            provenance: [src.provenance, 'Restored copy · differed from the kept version'].filter(Boolean).join(' · ') });
          writes.push(['sources', copy.id, copy]);
        }
        for (const v of data.items || []) {
          if (await backend.get('items', v.id)) continue;
          report.items++; writes.push(['items', v.id, v]);
        }
        // A link is the same link if it joins the same two items, whatever its id.
        const pair = (l) => [l.a, l.b].sort().join('|');
        const joined = new Set((await backend.all('links')).map(pair));
        for (const v of data.links || []) {
          if (joined.has(pair(v)) || (await backend.get('links', v.id))) continue;
          joined.add(pair(v)); report.links++; writes.push(['links', v.id, v]);
        }
        for (const v of data.derived || []) {
          const key = 'dismiss:' + v.key;
          if (!(await backend.get('derived', key))) writes.push(['derived', key, v]);
        }
        for (const d of data.drafts || []) {
          const mine = await backend.get('drafts', d.key);
          if (!mine) { report.drafts++; writes.push(['drafts', d.key, d]); continue; }
          if (mine.title === d.title && mine.body === d.body) continue;
          report.draftsSeparate++;
          const key = 'restored:' + makeId('d');
          writes.push(['drafts', key, Object.assign(clone(d), { key, restoredFrom: d.key })]);
        }
        for (const p of data.proposals || []) {
          if (await backend.get('proposals', p.id)) continue;
          report.proposals++; writes.push(['proposals', p.id, p]);
        }
        if (!dry) for (const [c, k, v] of writes) await backend.put(c, k, v);
        report.dryRun = dry;
        return report;
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

  /* Compare two revision histories by content, revision by revision. */
  function compareRevisions(mine, theirs) {
    const same = (a, b) => a.n === b.n && canonical(a) === canonical(b) && (!a.sha256 || !b.sha256 || a.sha256 === b.sha256);
    const n = Math.min(mine.length, theirs.length);
    for (let i = 0; i < n; i++) if (!same(mine[i], theirs[i])) return 'differs';
    return mine.length === theirs.length ? 'same' : mine.length > theirs.length ? 'mine-ahead' : 'theirs-ahead';
  }

  /*
   * Validate a backup before anything is written. Checks the format, the
   * shape of every record, unique ids, sequential revisions, and (where this
   * connection can compute SHA-256) that every fingerprint still matches.
   */
  async function validateBackup(data) {
    const errors = [], notes = [];
    const counts = {};
    const fail = (m) => { if (errors.length < 12) errors.push(m); else if (errors.length === 12) errors.push('…and more'); };
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['Not a Tangerine backup: the file is not a JSON object.'], notes, counts };
    if (data.format !== BACKUP_FORMAT) return { ok: false, errors: ['Not a Tangerine backup: format is ' + JSON.stringify(data.format ?? null) + ', expected "' + BACKUP_FORMAT + '".'], notes, counts };
    const str = (v) => typeof v === 'string';
    const num = (v) => typeof v === 'number' && isFinite(v);
    for (const c of DATA) {
      if (data[c] === undefined) { if (OPTIONAL.includes(c)) { counts[c] = 0; continue; } fail('Missing the "' + c + '" list.'); continue; }
      if (!Array.isArray(data[c])) { fail('"' + c + '" is not a list.'); continue; }
      counts[c] = data[c].length;
      const seen = new Set();
      data[c].forEach((v, i) => {
        const at = c + ' #' + (i + 1);
        if (!v || typeof v !== 'object') return fail(at + ' is not a record.');
        const id = c === 'derived' || c === 'drafts' ? v.key : v.id;
        if (!str(id) || !id) return fail(at + ' has no id.');
        if (seen.has(id)) fail(at + ' repeats the id ' + id + '.');
        seen.add(id);
        if (c === 'sources') {
          if (!SOURCE_KINDS.includes(v.kind)) fail(at + ' has an unknown kind.');
          if (!Array.isArray(v.revisions) || !v.revisions.length) return fail(at + ' has no revisions.');
          v.revisions.forEach((r, j) => {
            if (!r || r.n !== j + 1 || !str(r.title) || !str(r.body) || !str(r.at)) fail(at + ' revision ' + (j + 1) + ' is malformed.');
          });
          if (FIXED_KINDS.includes(v.kind) && v.revisions.length > 1) fail(at + ' is ' + (v.kind === 'collected' ? 'collected material' : 'a captured conversation') + ' but has revisions.');
        }
        if (c === 'items') {
          if (!ITEM_KINDS.includes(v.kind) || !num(v.x) || !num(v.y) || !Array.isArray(v.bookmarks)) fail(at + ' is malformed.');
        }
        if (c === 'links' && (!str(v.a) || !str(v.b))) fail(at + ' is malformed.');
        if (c === 'drafts' && (!str(v.body) || !str(v.title) || !str(v.savedAt))) fail(at + ' is malformed.');
        if (c === 'items' && v.evidence !== undefined && !Array.isArray(v.evidence)) fail(at + ' has malformed evidence.');
        if (c === 'proposals' && (!str(v.sourceId) || !str(v.type) || !str(v.title) || !['pending', 'accepted', 'dismissed'].includes(v.state))) fail(at + ' is malformed.');
      });
    }
    if (!errors.length) {
      let checked = 0, unavailable = false;
      for (const s of data.sources) for (const r of s.revisions) {
        if (!r.sha256) continue;
        const h = await fingerprint(canonical(r));
        if (h === null) { unavailable = true; break; }
        checked++;
        if (h !== r.sha256) fail('sources ' + s.id + ' revision ' + r.n + ' does not match its fingerprint; the copy may have been altered.');
      }
      if (unavailable) notes.push('Fingerprints could not be checked on this connection (no SHA-256). Open Tangerine at http://127.0.0.1 to check them.');
      else if (checked) notes.push(checked + ' fingerprints checked and matching.');
    }
    return { ok: errors.length === 0, errors, notes, counts };
  }

  function pickEvidence(e) {
    return {
      sourceId: e.sourceId ? String(e.sourceId) : null, // the captured conversation
      turn: Number.isInteger(e.turn) ? e.turn : null,   // which turn in it
      role: e.role || null,                             // 'user' | 'assistant' | 'note'
      quote: String(e.quote || ''),                     // the exact words
      verified: e.verified === false ? false : true,    // false: a quote ChatGPT gave that was not found in the capture
    };
  }
  const sameEvidence = (a, b) => a.sourceId === b.sourceId && a.turn === b.turn && a.quote === b.quote;
  function pickConversation(c) {
    c = c || {};
    return {
      thread: String(c.thread || 'Conversation'),   // the ongoing conversation this capture belongs to
      via: String(c.via || 'paste'),               // 'paste' | 'export' — how it was brought in
      title: c.title ? String(c.title) : null,     // ChatGPT's own title, if the export had one
      exportId: c.exportId ? String(c.exportId) : null,
      turnKeys: Array.isArray(c.turnKeys) ? c.turnKeys.map(String) : [],
      seen: Number.isInteger(c.seen) ? c.seen : 0, // turns brought in again that were already captured
      first: c.first || null, last: c.last || null, // message times, only when the export carried them
    };
  }

  function pickBookmark(b) {
    return {
      stands: String(b.stands || ''),     // where it stands
      question: String(b.question || ''), // the open question
      next: String(b.next || ''),         // the next move
    };
  }

  /*
   * The live store: the same records, kept by the Tangerine bridge on this
   * machine (bridge/server.mjs) so ChatGPT's relays and TABLET share one store.
   */
  function httpBackend(base, key) {
    const headers = { 'X-Tangerine-Key': key };
    const at = (c, k) => (base || '') + '/api/store/' + encodeURIComponent(c) + (k === undefined ? '' : '/' + encodeURIComponent(k));
    const json = async (r) => { if (!r.ok) throw new Error('The Tangerine bridge answered ' + r.status); return r.json(); };
    return {
      durable: true, live: true,
      all: (c) => fetch(at(c), { headers }).then(json),
      get: (c, k) => fetch(at(c, k), { headers }).then(json).then((v) => (v === null ? undefined : v)),
      put: (c, k, v) => fetch(at(c, k), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify(v) }).then(json).then(() => undefined),
      remove: (c, k) => fetch(at(c, k), { method: 'DELETE', headers }).then(json).then(() => undefined),
    };
  }
  async function openLiveStore(key, base) {
    const r = await fetch((base || '') + '/api/info', { headers: { 'X-Tangerine-Key': key } });
    if (!r.ok) throw new Error(r.status === 401 ? 'This TABLET link has the wrong key.' : 'The Tangerine bridge is not reachable.');
    const s = createStore(httpBackend(base, key));
    s.live = true;
    return s;
  }

  async function openStore(name) {
    try { return createStore(await indexedDBBackend(name || 'tangerine-foundation-001')); }
    catch (e) {
      const s = createStore(memoryBackend());
      s.problem = (e && e.message) || 'Browser storage is unavailable.';
      return s;
    }
  }

  const exported = { createStore, memoryBackend, httpBackend, openLiveStore, openStore, validateBackup, USER_EDIT, USER_DELETE, deepFreeze, BACKUP_FORMAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.TangerineStore = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
