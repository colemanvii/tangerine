/*
 * Tangerine bridge — what happens when ChatGPT tells Tangerine something.
 *
 * ChatGPT (through the Tangerine app's tools) relays the parts of the one
 * ongoing conversation worth keeping: items with the exact words they came
 * from and who said them. Tangerine never sees the conversation itself; it sees
 * only these relays, and says so.
 *
 * - Each relay is kept as a fixed original (kind 'conversation', via
 *   'chatgpt-app'): exactly the quotes received, never revised.
 * - Things you said are placed on TABLET at once (the system does the
 *   organizing; you can undo any change from the card in ChatGPT or on TABLET).
 * - Things ChatGPT suggested wait as suggestions; a suggestion is not your
 *   commitment.
 * - What is already on TABLET is updated (new evidence, new links), not
 *   duplicated. Manual placement is never changed.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Capture = require('../core/capture.js');
const Synth = require('../core/synthesis.js');
const { orbitSpot } = require('../core/layout.js');

export const ITEM_TYPES = Synth.TYPES; // project person idea decision action question
const KIND = { project: 'Project', person: 'Person', idea: 'Idea', decision: 'Decision', action: 'Next action', question: 'Open question', source: 'Source' };
const LIMITS = { items: 40, title: 160, quote: 800 };

export function createTangerine(store, opts) {
  const o = Object.assign({ now: () => new Date(), tabletUrl: null }, opts);

  function check(args) {
    const errs = [];
    if (!args || !Array.isArray(args.items)) return ['items must be a list'];
    if (!args.items.length) errs.push('items is empty');
    if (args.items.length > LIMITS.items) errs.push('at most ' + LIMITS.items + ' items per update');
    args.items.forEach((x, i) => {
      const at = 'items[' + i + ']';
      if (!x || typeof x !== 'object') return errs.push(at + ' is not an object');
      if (!ITEM_TYPES.includes(x.type)) errs.push(at + '.type must be one of ' + ITEM_TYPES.join(', '));
      if (typeof x.title !== 'string' || !x.title.trim() || x.title.length > LIMITS.title) errs.push(at + '.title is required (≤' + LIMITS.title + ' chars)');
      if (typeof x.quote !== 'string' || x.quote.trim().length < 8 || x.quote.length > LIMITS.quote) errs.push(at + '.quote is required: the exact words from the conversation (≤' + LIMITS.quote + ' chars)');
      if (x.said_by !== 'user' && x.said_by !== 'assistant') errs.push(at + '.said_by must be "user" or "assistant"');
    });
    return errs;
  }

  const byId = (items, id) => items.find((i) => i.id === id);
  const titleOf = (i) => i.title || 'Untitled';

  async function resolveRef(ref, sourceId) {
    const items = await store.items();
    if (ref.startsWith('item:')) return byId(items, ref.slice(5)) || null;
    const key = ref.slice(4);
    const p = (await store.proposals(sourceId)).find((q) => q.key === key && q.state === 'accepted');
    if (p && p.itemId) return byId(items, p.itemId) || null;
    return items.find((i) => i.synthKey === key) || null;
  }

  /* Put one proposal on TABLET. Returns the change made. */
  async function apply(p, extra, batch) {
    let items = await store.items();
    let item = (p.match && byId(items, p.match)) || items.find((i) => i.synthKey === p.key && i.kind === p.type);
    const evidence = p.evidence.map((e) => Object.assign({}, e, { sourceId: e.sourceId || p.sourceId }));
    const change = { proposalId: p.id, kind: p.type, title: p.edited || p.title, said: p.basis };
    if (item) {
      change.op = 'updated'; change.prevStatus = item.status; change.prevNow = (items.find((i) => i.now) || {}).id || null;
      await store.updateItem(item.id, { addEvidence: evidence, ...(extra && extra.done && item.kind === 'action' ? { status: 'done' } : {}) });
      if (extra && extra.done && item.kind === 'action') change.op = 'done';
    } else {
      const anchors = [];
      for (const r of p.rel) { const t = await resolveRef(r.ref, p.sourceId); if (t) anchors.push(t); }
      const anchor = anchors.find((a) => a.kind === 'project') || anchors[0] || null;
      const pos = orbitSpot(items, anchor, batch.placed);
      item = await store.addItem({ kind: p.type, title: p.edited || p.title, when: extra && extra.when, x: pos.x, y: pos.y,
        origin: 'conversation', basis: p.basis, confidence: p.confidence, evidence, synthKey: p.key,
        status: extra && extra.done ? 'done' : 'open' });
      batch.placed.push(item);
      change.op = 'added'; change.prevNow = (items.find((i) => i.now) || {}).id || null;
    }
    await store.setProposal(p.id, { state: 'accepted', itemId: item.id, created: change.op === 'added' });
    for (const r of p.rel) {
      const t = await resolveRef(r.ref, p.sourceId);
      if (t && t.id !== item.id) await store.link(item.id, t.id, '', { origin: r.inferred ? 'inferred' : 'conversation', proposalId: p.id });
    }
    // Earlier accepted proposals in this relay that named this one.
    for (const q of await store.proposals(p.sourceId)) {
      if (q.state !== 'accepted' || q.id === p.id || !q.itemId) continue;
      if (q.rel.some((r) => r.ref === 'key:' + p.key) && byId(await store.items(), q.itemId)) await store.link(q.itemId, item.id, '', { origin: 'conversation', proposalId: q.id });
    }
    if (extra && extra.now) { await store.setNow(item.id); change.now = true; }
    change.itemId = item.id; change.no = item.no;
    return change;
  }

  /*
   * tangerine_update: ChatGPT relays what is worth keeping.
   * args: { items: [{ type, title, quote, said_by, related?, when?, now?, done? }], conversation? }
   */
  async function update(args) {
    const errs = check(args);
    if (errs.length) return { ok: false, errors: errs };
    const at = o.now();
    const thread = (typeof args.conversation === 'string' && args.conversation.trim()) || 'ChatGPT';
    const turns = [];
    for (const x of args.items) {
      const t = { role: x.said_by, text: x.quote.trim().replace(/\n{2,}/g, '\n') };
      if (!turns.some((y) => y.role === t.role && y.text === t.text)) turns.push(t);
    }
    const body = Capture.transcript(turns);
    const src = await store.keepSource({
      kind: 'conversation', author: 'You and ChatGPT',
      title: thread + ' · ' + at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + at.toTimeString().slice(0, 5),
      body, madeOn: at.toISOString().slice(0, 10),
      provenance: 'Relayed by ChatGPT through the Tangerine app. The quotes were chosen by ChatGPT; Tangerine did not see the full conversation.',
      conversation: { thread, via: 'chatgpt-app', turnKeys: turns.map(Capture.turnKey), first: at.toISOString(), last: at.toISOString() },
    });
    const kept = Capture.turnsOf(body);
    const existing = await store.items();
    const bundle = { items: args.items.map((x) => ({ type: x.type, title: x.title, quote: x.quote, said_by: x.said_by === 'assistant' ? 'you' : 'me', related: x.related })) };
    const { proposals } = Synth.fromBundle(bundle, kept, existing, { sourceId: src.id });
    const extras = new Map(args.items.map((x) => [Synth.keyOf(x.type, x.title), { when: typeof x.when === 'string' ? x.when.slice(0, 60) : null, now: Boolean(x.now), done: Boolean(x.done) }]));
    // Something already on TABLET from an earlier relay is an update.
    for (const p of proposals) {
      if (p.op === 'add') { const prior = existing.find((i) => i.synthKey === p.key && i.kind === p.type); if (prior) { p.op = 'update'; p.match = prior.id; } }
    }
    const saved = await store.saveProposals(src.id, proposals, { via: 'chatgpt-app' });
    const changes = [], batch = { placed: [] };
    const order = { project: 0, person: 1, idea: 2, decision: 3, question: 4, action: 5 };
    for (const p of [...saved].sort((a, b) => order[a.type] - order[b.type])) {
      const extra = extras.get(p.key) || {};
      if (p.basis === 'you' || (p.op === 'update' && p.basis !== 'unverified')) changes.push(await apply(p, extra, batch));
      else changes.push({ proposalId: p.id, op: 'suggested', kind: p.type, title: p.title, said: p.basis });
    }
    await store.setMeta('relay:' + src.id, { at: at.toISOString(), changes });
    await store.setMeta('lastRelay', src.id);
    return { ok: true, relayId: src.id, changes, picture: await picture() };
  }

  /*
   * Backfill: bring the history of the one ongoing conversation in once, from
   * ChatGPT's own data export, so TABLET starts from where you already are.
   * The local extractor proposes; your clear statements are placed, the rest
   * wait as suggestions. Re-running it keeps only turns not already kept.
   */
  async function backfill({ turns, thread, title, exportId }) {
    const known = (await store.sources()).filter((s) => s.kind === 'conversation' && s.conversation && s.conversation.thread === thread).flatMap((s) => s.conversation.turnKeys);
    const { fresh, seen } = Capture.compare(turns, known);
    if (!fresh.length) return { ok: true, kept: 0, seen: seen.length, changes: [] };
    const times = fresh.map((t) => t.t).filter(Boolean).sort();
    const body = Capture.transcript(fresh);
    const src = await store.keepSource({
      kind: 'conversation', author: 'You and ChatGPT', title: title || thread, body,
      madeOn: times[0] ? times[0].slice(0, 10) : null,
      provenance: 'ChatGPT data export (conversations.json) · chosen by you · read on this machine',
      conversation: { thread, via: 'export', title: title || null, exportId: exportId || null, turnKeys: fresh.map(Capture.turnKey), seen: seen.length, first: times[0] || null, last: times[times.length - 1] || null },
    });
    const { proposals } = Synth.extract(Capture.turnsOf(body), await store.items(), { sourceId: src.id });
    const saved = await store.saveProposals(src.id, proposals, { via: 'export' });
    const changes = [], batch = { placed: [] };
    const order = { project: 0, person: 1, idea: 2, decision: 3, question: 4, action: 5 };
    for (const p of [...saved].sort((a, b) => order[a.type] - order[b.type])) {
      const extra = { when: p.when, now: false, done: false };
      if ((p.basis === 'you' || p.op === 'update') && p.confidence === 'clear') changes.push(await apply(p, extra, batch));
      else changes.push({ proposalId: p.id, op: 'suggested', kind: p.type, title: p.title, said: p.basis });
    }
    await store.setMeta('relay:' + src.id, { at: new Date().toISOString(), changes });
    return { ok: true, kept: fresh.length, seen: seen.length, sourceId: src.id, changes };
  }

  /* Undo one change from a relay: take a new card off, or remove only what an update added. */
  async function undo({ proposalId }) {
    const p = (await store.proposals()).find((x) => x.id === proposalId);
    if (!p) return { ok: false, errors: ['No such change'] };
    const log = (await store.getMeta('relay:' + p.sourceId)) || { changes: [] };
    const ch = log.changes.find((c) => c.proposalId === proposalId);
    const items = await store.items();
    const item = p.itemId && byId(items, p.itemId);
    if (p.state === 'accepted' && item) {
      if (p.created) await store.removeItem(item.id);
      else {
        await store.updateItem(item.id, { removeEvidence: p.evidence.map((e) => Object.assign({}, e, { sourceId: e.sourceId || p.sourceId })),
          ...(ch && ch.op === 'done' ? { status: ch.prevStatus || 'open' } : {}) });
        for (const l of await store.links()) if (l.proposalId === p.id) await store.unlink(l.id);
      }
      if (ch && ch.now && ch.prevNow && byId(await store.items(), ch.prevNow)) await store.setNow(ch.prevNow);
    }
    await store.setProposal(p.id, { state: 'dismissed', itemId: null, created: false });
    if (ch) { ch.undone = true; await store.setMeta('relay:' + p.sourceId, log); }
    return { ok: true, picture: await picture() };
  }

  /* Keep a ChatGPT suggestion after all. */
  async function keep({ proposalId }) {
    const p = (await store.proposals()).find((x) => x.id === proposalId);
    if (!p) return { ok: false, errors: ['No such suggestion'] };
    if (p.state === 'accepted') return { ok: true, picture: await picture() };
    const change = await apply(p, {}, { placed: [] });
    const log = (await store.getMeta('relay:' + p.sourceId)) || { changes: [] };
    const i = log.changes.findIndex((c) => c.proposalId === proposalId);
    if (i >= 0) log.changes[i] = change; else log.changes.push(change);
    await store.setMeta('relay:' + p.sourceId, log);
    return { ok: true, change, picture: await picture() };
  }

  /* The current picture: what TABLET would show at a glance, in a form ChatGPT and the inline view can use. */
  async function picture() {
    const items = (await store.items()).filter((i) => i.kind !== 'source');
    const links = await store.links();
    const near = (id) => links.filter((l) => l.a === id || l.b === id).map((l) => byId(items, l.a === id ? l.b : l.a)).filter(Boolean);
    const brief = (i) => ({ id: i.id, kind: i.kind, ref: { project: 'P', person: 'R', idea: 'I', decision: 'D', action: 'A', question: 'Q' }[i.kind] + '—' + String(i.no).padStart(3, '0'),
      title: titleOf(i), when: i.when || null, status: i.status || null, said: i.basis || null,
      quote: i.evidence && i.evidence.length ? i.evidence[i.evidence.length - 1].quote : null,
      context: (near(i.id).find((x) => x.kind === 'project') || {}).title || null });
    const now = items.find((i) => i.now) || null;
    const nowNear = new Set(now ? [now.id, ...near(now.id).map((x) => x.id)] : []);
    const open = items.filter((i) => i.kind === 'action' && i.status !== 'done' && !i.now)
      .sort((a, b) => (nowNear.has(a.id) ? 0 : 1) - (nowNear.has(b.id) ? 0 : 1) || String(b.createdAt).localeCompare(String(a.createdAt)));
    const recent = (k, n) => items.filter((i) => i.kind === k).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, n);
    const projects = items.filter((i) => i.kind === 'project').map((p) => ({ ...brief(p), around: near(p.id).filter((x) => x.kind !== 'source').length }))
      .sort((a, b) => b.around - a.around);
    const lastId = await store.getMeta('lastRelay');
    const last = lastId ? await store.getMeta('relay:' + lastId) : null;
    const suggested = (await store.proposals()).filter((p) => p.state === 'pending' && p.via === 'chatgpt-app');
    return {
      now: now ? brief(now) : null,
      next: open.slice(0, 3).map(brief), moreNext: Math.max(0, open.length - 3),
      openLoops: recent('question', 5).map(brief),
      decisions: recent('decision', 3).map(brief),
      projects: projects.slice(0, 8),
      people: recent('person', 8).map(brief),
      suggestions: suggested.slice(-6).map((p) => ({ proposalId: p.id, kind: p.type, title: p.edited || p.title, quote: p.evidence[0] && p.evidence[0].quote })),
      lastRelay: last ? { at: last.at, changes: last.changes } : null,
      counts: Object.fromEntries(['project', 'person', 'idea', 'decision', 'action', 'question'].map((k) => [k, items.filter((i) => i.kind === k).length])),
      tabletUrl: o.tabletUrl,
    };
  }

  /* Plain text for the model and for hosts without UI. Short, factual. */
  function summarize(pic, changes) {
    const lines = [];
    if (changes) {
      const n = (op) => changes.filter((c) => c.op === op).length;
      lines.push('Tangerine updated: ' + [n('added') && n('added') + ' added', n('updated') && n('updated') + ' updated', n('done') && n('done') + ' marked done', n('suggested') && n('suggested') + ' held as suggestions'].filter(Boolean).join(', ') + '.');
      for (const c of changes) lines.push('- ' + c.op + ': ' + KIND[c.kind] + ' “' + c.title + '”');
    }
    if (pic.now) lines.push('NOW: ' + pic.now.title);
    if (pic.next.length) lines.push('NEXT: ' + pic.next.map((x) => x.title + (x.when ? ' (' + x.when + ')' : '')).join('; '));
    if (pic.openLoops.length) lines.push('OPEN LOOPS: ' + pic.openLoops.map((x) => x.title).join('; '));
    if (pic.decisions.length) lines.push('RECENT DECISIONS: ' + pic.decisions.map((x) => x.title).join('; '));
    if (pic.projects.length) lines.push('PROJECTS: ' + pic.projects.map((x) => x.title).join('; '));
    return lines.join('\n') || 'TABLET is empty.';
  }

  return { update, undo, keep, backfill, picture, summarize, check };
}
