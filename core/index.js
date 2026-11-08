/*
 * Tangerine — index.
 *
 * Reads frozen copies of sources and board items, and returns references with
 * reasons. It has no write path. Every suggestion says why it was made, so it
 * can be inspected and dismissed.
 *
 * This study's index is local and deterministic (shared distinctive words).
 * No language model is connected. A future model may only sit behind this same
 * read-only boundary.
 */
(function (root) {
  'use strict';

  const STOP = new Set(('a an and are as at be been but by for from had has have he her his i if in into is it its ' +
    'me my no not of on or our she so than that the their them then there these they this to too up us was we were ' +
    'what when where which who will with would you your one all can do just more about over only also some any out ' +
    'very each how much own same such does did being am after before again could should while').split(' '));

  function words(text) {
    return String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .match(/[a-z][a-z'-]{2,}/g)?.map((w) => w.replace(/'s$/, '')).filter((w) => !STOP.has(w)) || [];
  }

  function textOfSource(s) {
    const r = s.revisions[s.revisions.length - 1];
    return [r.title, r.body, s.plate && s.plate.caption].join(' ');
  }
  function textOfItem(it, sourcesById) {
    if (it.kind === 'source') { const s = sourcesById.get(it.sourceId); return s ? textOfSource(s) : ''; }
    const b = it.bookmarks[it.bookmarks.length - 1] || {};
    return [it.title, it.role, b.stands, b.question, b.next].join(' ');
  }

  function vector(text) {
    const v = new Map();
    for (const w of words(text)) v.set(w, (v.get(w) || 0) + 1);
    return v;
  }

  /* Related sources for one board item, best first. */
  function related(item, sources, items, opts) {
    const o = Object.assign({ limit: 3, dismissed: new Set() }, opts);
    const byId = new Map(sources.map((s) => [s.id, s]));
    const pinned = new Set(items.filter((i) => i.kind === 'source').map((i) => i.sourceId));
    const df = new Map();
    const vecs = sources.map((s) => { const v = vector(textOfSource(s)); v.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)); return [s, v]; });
    const q = vector(textOfItem(item, byId));
    const n = sources.length || 1;
    const out = [];
    for (const [s, v] of vecs) {
      if (item.sourceId === s.id) continue;
      const key = item.id + '>' + s.id;
      if (o.dismissed.has(key)) continue;
      let score = 0; const shared = [];
      q.forEach((_, w) => { if (v.has(w)) { const idf = Math.log(1 + n / df.get(w)); score += idf; shared.push([w, idf]); } });
      if (shared.length < 2) continue;
      shared.sort((a, b) => b[1] - a[1]);
      out.push({ key, sourceId: s.id, score: +score.toFixed(3), pinned: pinned.has(s.id), shared: shared.slice(0, 4).map((x) => x[0]) });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, o.limit)
      .map((r) => Object.freeze(Object.assign(r, { reason: 'Shared words: ' + r.shared.join(', ') + '.' })));
  }

  /* Plain search across sources and the board. */
  function search(query, sources, items) {
    const terms = words(query);
    if (!terms.length) return [];
    const byId = new Map(sources.map((s) => [s.id, s]));
    const hit = (text) => { const t = words(text); return terms.every((q) => t.some((w) => w.startsWith(q))); };
    return [
      ...items.filter((i) => i.kind !== 'source' && hit(textOfItem(i, byId))).map((i) => ({ type: 'item', id: i.id })),
      ...sources.filter((s) => hit(textOfSource(s))).map((s) => ({ type: 'source', id: s.id })),
    ];
  }

  /* Return: the same day in an earlier year, and the thread left longest. */
  function onThisDay(sources, today) {
    const md = today.toISOString().slice(5, 10);
    const y = today.getFullYear();
    return sources.filter((s) => s.madeOn && s.madeOn.slice(5, 10) === md && +s.madeOn.slice(0, 4) < y);
  }
  function longestResting(items) {
    return items.filter((i) => i.kind === 'project' && i.bookmarks.length)
      .sort((a, b) => a.bookmarks[a.bookmarks.length - 1].at.localeCompare(b.bookmarks[b.bookmarks.length - 1].at))[0] || null;
  }

  const exported = { words, related, search, onThisDay, longestResting };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.TangerineIndex = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
