// node --test app/tests/*.test.cjs
// Capture, synthesis and the store's conversation layer. No browser.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Capture = require('../../core/capture.js');
const Synth = require('../../core/synthesis.js');
const { createStore, memoryBackend, USER_EDIT, validateBackup } = require('../../core/store.js');
const Demo = require('../demo.js');

const sampleTurns = () => Capture.turnsOf(Capture.transcript(Capture.parseText(Demo.SAMPLE_CONVERSATION)));
const demoItems = () => Demo.seed(new Date('2026-11-10T12:00:00Z')).items.map((i) => ({ ...i, bookmarks: [], evidence: [] }));
const find = (ps, type, re) => ps.find((p) => p.type === type && re.test(p.title));

/* ---------- capture ---------- */

test('pasted ChatGPT text is read into turns by speaker', () => {
  const t = Capture.parseText('You said:\nHello there.\n\nChatGPT said:\nHi.\nSecond line.\n\nYou said:\nThanks.');
  assert.deepEqual(t.map((x) => x.role), ['user', 'assistant', 'user']);
  assert.equal(t[1].text, 'Hi.\nSecond line.');
  const md = Capture.parseText('**You:** one\n**ChatGPT:** two\nUser: three\nAssistant: four');
  assert.deepEqual(md.map((x) => [x.role, x.text]), [['user', 'one'], ['assistant', 'two'], ['user', 'three'], ['assistant', 'four']]);
});

test('ordinary sentences are never mistaken for speaker labels', () => {
  const t = Capture.parseText('You should call her.\nNote: keep this.\nNext steps: none.');
  assert.equal(t.length, 1);
  assert.equal(t[0].role, 'note');
});

test('the kept transcript reads back to exactly the same turns', () => {
  const turns = Capture.parseText(Demo.SAMPLE_CONVERSATION);
  assert.equal(turns.length, 11);
  assert.deepEqual(Capture.turnsOf(Capture.transcript(turns)), turns);
});

test('a ChatGPT export is read along the active branch only, with its own timestamps', () => {
  const exp = [{
    id: 'c1', title: 'Plans', create_time: 1762761600, update_time: 1762765200, current_node: 'n3',
    mapping: {
      root: { parent: null, message: null },
      n1: { parent: 'root', message: { author: { role: 'user' }, create_time: 1762761600, content: { parts: ['First question'] } } },
      old: { parent: 'n1', message: { author: { role: 'assistant' }, create_time: 1762761700, content: { parts: ['An abandoned branch'] } } },
      n2: { parent: 'n1', message: { author: { role: 'assistant' }, create_time: 1762761800, content: { parts: ['The kept answer'] } } },
      sys: { parent: 'n2', message: { author: { role: 'system' }, content: { parts: ['hidden'] } } },
      n3: { parent: 'sys', message: { author: { role: 'user' }, create_time: 1762761900, content: { parts: ['Follow-up'] } } },
    },
  }, { id: 'c2', title: '', messages: [{ role: 'user', content: 'Plain list form' }] }];
  const list = Capture.parseExport(exp);
  const c1 = list.find((c) => c.id === 'c1');
  assert.deepEqual(c1.turns.map((t) => t.text), ['First question', 'The kept answer', 'Follow-up']);
  assert.equal(c1.turns[0].t, new Date(1762761600 * 1000).toISOString());
  assert.equal(list.find((c) => c.id === 'c2').title, 'Untitled conversation');
  assert.throws(() => Capture.parseExport({ nope: true }), /conversations\.json/);
});

test('capturing the same conversation again keeps only the new turns', () => {
  const first = Capture.parseText(Demo.SAMPLE_CONVERSATION);
  const keys = first.map(Capture.turnKey);
  const again = Capture.parseText(Demo.SAMPLE_CONVERSATION + '\n\nYou said:\nOne more thing.');
  const { fresh, seen } = Capture.compare(again, keys);
  assert.equal(seen.length, 11);
  assert.deepEqual(fresh.map((t) => t.text), ['One more thing.']);
  assert.equal(Capture.turnKey({ role: 'user', text: 'A  b' }), Capture.turnKey({ role: 'user', text: 'a b' }));
  assert.notEqual(Capture.turnKey({ role: 'user', text: 'a b' }), Capture.turnKey({ role: 'assistant', text: 'a b' }));
});

/* ---------- synthesis ---------- */

test('synthesis finds projects, people, decisions, actions, questions and ideas — each with its words', () => {
  const turns = sampleTurns();
  const { proposals } = Synth.extract(turns, demoItems(), { sourceId: 'src-x' });
  for (const t of Synth.TYPES) assert.ok(proposals.some((p) => p.type === t), 'has a ' + t);
  for (const p of proposals) {
    assert.ok(p.evidence.length >= 1, p.title + ' has evidence');
    for (const e of p.evidence) {
      assert.equal(e.sourceId, 'src-x');
      assert.ok(turns[e.turn].text.includes(e.quote), 'quote is verbatim in its turn: ' + e.quote);
    }
  }
  assert.ok(find(proposals, 'decision', /anodised aluminium/));
  assert.ok(find(proposals, 'decision', /cover stays one colour/));
  assert.ok(find(proposals, 'question', /printed or inlaid/));
  assert.ok(find(proposals, 'question', /smaller first run of 200/));
  assert.ok(find(proposals, 'idea', /invitation is printed on the notebook paper/));
  assert.ok(find(proposals, 'project', /^Open Studio weekend$/));
  assert.ok(find(proposals, 'person', /^Ines Okafor$/));
});

test('what is already on TABLET is updated, not duplicated', () => {
  const { proposals } = Synth.extract(sampleTurns(), demoItems(), {});
  const clock = proposals.filter((p) => p.type === 'project' && p.match === 'demo-itm-2');
  assert.equal(clock.length, 1);
  assert.equal(clock[0].op, 'update');
  const moreau = proposals.find((p) => p.type === 'person' && p.match === 'demo-itm-5');
  assert.ok(moreau && moreau.evidence.length >= 2, 'R. Moreau gathers every mention (initial or surname)');
  assert.ok(!proposals.some((p) => p.op === 'add' && /Moreau|Lindqvist|Desk clock|Small Rooms/.test(p.title) && ['person', 'project'].includes(p.type)));
});

test('who said it is kept: a ChatGPT suggestion is never your commitment', () => {
  const { proposals } = Synth.extract(sampleTurns(), demoItems(), {});
  const sug = find(proposals, 'action', /^Pick two possible weekends/);
  assert.equal(sug.basis, 'chatgpt'); assert.equal(sug.confidence, 'tentative');
  for (const p of proposals.filter((x) => x.type === 'action' || x.type === 'decision')) {
    if (p.evidence.every((e) => e.role === 'assistant')) assert.equal(p.basis, 'chatgpt', p.title);
  }
  // ChatGPT suggested it, then you said you would: your words win, and both are evidence.
  const plates = find(proposals, 'action', /Lindqvist .*plates/);
  assert.equal(plates.basis, 'you'); assert.equal(plates.confidence, 'clear');
  assert.deepEqual(plates.evidence.map((e) => e.role).sort(), ['assistant', 'user']);
});

test('commitments are phrased as actions and dates are never invented', () => {
  const { proposals } = Synth.extract(sampleTurns(), demoItems(), {});
  const dial = find(proposals, 'action', /^Send the dial file to Moreau by Friday$/);
  assert.equal(dial.when, 'by Friday');
  assert.equal(dial.basis, 'you');
  assert.ok(dial.rel.some((r) => r.ref === 'item:demo-itm-5' && !r.inferred), 'linked to the person it names');
  assert.ok(dial.rel.some((r) => r.ref === 'item:demo-itm-2' && r.inferred), 'linked to the project in context, marked inferred');
  const ines = find(proposals, 'action', /^Text Ines tonight$/);
  assert.equal(ines.when, 'tonight');
  for (const p of proposals) if (p.when) assert.ok(/[a-z]/i.test(p.when) && !/\d{4}-\d\d/.test(p.when));
  const cond = find(proposals, 'decision', /last weekend of April/);
  assert.equal(cond.confidence, 'tentative', 'a conditional decision is tentative');
});

test('"the one thing this week" becomes a proposed now', () => {
  const { proposals } = Synth.extract(sampleTurns(), demoItems(), {});
  const focus = proposals.filter((p) => p.focus);
  assert.equal(focus.length, 1);
  assert.equal(focus[0].title, 'North window photograph');
  assert.ok(focus[0].rel.some((r) => r.ref === 'item:demo-itm-1'), 'in the context of Small Rooms');
});

test('requests to ChatGPT are not open loops, and a note without speakers is labelled as a note', () => {
  const turns = Capture.parseText('You said:\nCan you help me plan the week?\nShould I hire a second printer for the notebook?');
  const { proposals } = Synth.extract(turns, [], {});
  assert.deepEqual(proposals.filter((p) => p.type === 'question').map((p) => p.title), ['Should I hire a second printer for the notebook?']);
  const note = Synth.extract(Capture.parseText('I need to book the van for Saturday.'), [], {}).proposals;
  assert.equal(note[0].basis, 'note');
  assert.equal(note[0].title, 'Book the van for Saturday');
});

test('sentences are not broken at initials or numbers', () => {
  assert.deepEqual(Synth.units('Send R. Moreau the drawing. Brass waits for No. 2. Done.').map((u) => u.text),
    ['Send R. Moreau the drawing.', 'Brass waits for No. 2.', 'Done.']);
});

test('ChatGPT’s own synthesis is checked quote by quote', () => {
  const turns = sampleTurns();
  const reply = 'Here you go:\n```json\n' + JSON.stringify({ tangerine: 'synthesis/1', items: [
    { type: 'decision', title: 'Aluminium for the first case', quote: "I've decided to go with anodised aluminium for the first case", said_by: 'me', related: ['Desk clock, No. 1'] },
    { type: 'action', title: 'Hire a gallery assistant', quote: 'I will hire a gallery assistant', said_by: 'me' },
    { type: 'action', title: 'Pick two weekends', quote: 'Pick two possible weekends.', said_by: 'you' },
    { type: 'nonsense', title: 'x' },
  ] }) + '\n```';
  const { proposals, stats } = Synth.fromBundle(Synth.readBundle(reply), turns, demoItems(), { sourceId: 's' });
  assert.equal(stats.skipped, 1); assert.equal(stats.unverified, 1);
  const ok = proposals.find((p) => p.type === 'decision');
  assert.equal(ok.evidence[0].verified, true); assert.equal(ok.evidence[0].turn, 0); assert.equal(ok.basis, 'you');
  assert.deepEqual(ok.rel, [{ ref: 'item:demo-itm-2', label: '', inferred: false }]);
  const bad = proposals.find((p) => /gallery/.test(p.title));
  assert.equal(bad.basis, 'unverified'); assert.equal(bad.confidence, 'tentative'); assert.equal(bad.evidence[0].turn, null);
  const sug = proposals.find((p) => /weekends/.test(p.title));
  assert.equal(sug.basis, 'chatgpt'); assert.equal(sug.confidence, 'tentative');
  assert.throws(() => Synth.fromBundle({}, turns, []), /items/);
});

/* ---------- store: the conversation layer ---------- */

test('a captured conversation is kept exactly; it can never be revised', async () => {
  const s = createStore(memoryBackend());
  const body = Capture.transcript(Capture.parseText(Demo.SAMPLE_CONVERSATION));
  const src = await s.keepSource({ kind: 'conversation', title: 'Studio', body, conversation: { thread: 'Studio', via: 'paste', turnKeys: ['a'] } });
  assert.equal(src.conversation.thread, 'Studio');
  assert.equal(src.conversation.first, null, 'no date is assumed for pasted text');
  await assert.rejects(s.reviseSource(src.id, { body: 'x' }, USER_EDIT), /exactly as captured/);
  assert.equal((await s.verifySource(src.id)).intact, true);
});

test('proposals keep the person’s decisions; evidence can be added and taken back', async () => {
  const s = createStore(memoryBackend());
  const src = await s.keepSource({ kind: 'conversation', title: 'C', body: 'You:\nI need to call Ada.', conversation: {} });
  const { proposals } = Synth.extract(Capture.turnsOf('You:\nI need to call Ada.'), [], { sourceId: src.id });
  const [p] = await s.saveProposals(src.id, proposals);
  await s.setProposal(p.id, { state: 'dismissed' });
  await s.saveProposals(src.id, proposals); // synthesizing again does not undo a dismissal
  assert.equal((await s.proposals(src.id))[0].state, 'dismissed');
  await assert.rejects(s.setProposal(p.id, { state: 'maybe' }));

  const it = await s.addItem({ kind: 'action', title: 'Call Ada', origin: 'conversation', basis: 'you', evidence: p.evidence });
  assert.equal(it.status, 'open'); assert.equal(it.origin, 'conversation'); assert.equal(it.evidence.length, 1);
  const extra = { sourceId: src.id, turn: 0, role: 'user', quote: 'call Ada' };
  await s.updateItem(it.id, { addEvidence: [extra, extra] });
  assert.equal((await s.items())[0].evidence.length, 2, 'the same evidence is not added twice');
  await s.updateItem(it.id, { removeEvidence: [extra], status: 'done' });
  const after = (await s.items())[0];
  assert.equal(after.evidence.length, 1); assert.equal(after.status, 'done');
  const l = await s.link(it.id, (await s.addItem({ kind: 'person', title: 'Ada' })).id, '', { origin: 'inferred', proposalId: p.id });
  assert.equal(l.origin, 'inferred'); assert.equal(l.proposalId, p.id);
});

test('backups carry conversations, proposals and evidence, and restore them', async () => {
  const a = createStore(memoryBackend());
  const src = await a.keepSource({ kind: 'conversation', title: 'C', body: 'You:\nWe agreed the cover stays one colour.', conversation: { thread: 'T' } });
  const { proposals } = Synth.extract(Capture.turnsOf(src.revisions[0].body), [], { sourceId: src.id });
  await a.saveProposals(src.id, proposals);
  await a.addItem({ kind: 'decision', title: 'Cover stays one colour', origin: 'conversation', evidence: proposals[0].evidence });
  const backup = await a.exportAll();
  assert.equal(backup.version, 3);
  assert.equal((await validateBackup(backup)).ok, true);

  const b = createStore(memoryBackend());
  const r = await b.restore(JSON.parse(JSON.stringify(backup)));
  assert.equal(r.ok, true); assert.equal(r.proposals, proposals.length);
  assert.equal((await b.items())[0].evidence[0].quote, 'We agreed the cover stays one colour.');
  assert.equal((await b.getSource(src.id)).conversation.thread, 'T');

  const tampered = JSON.parse(JSON.stringify(backup));
  tampered.sources[0].revisions.push({ ...tampered.sources[0].revisions[0], n: 2 });
  const v = await validateBackup(tampered);
  assert.equal(v.ok, false); assert.match(v.errors.join(' '), /captured conversation but has revisions/);

  const older = JSON.parse(JSON.stringify(backup)); delete older.proposals; older.version = 2;
  assert.equal((await validateBackup(older)).ok, true, 'a backup from before proposals still restores');
});

test('removing the demonstration also removes its capture and proposals', async () => {
  const s = createStore(memoryBackend());
  await Demo.install(s);
  const src = await s.keepSource({ kind: 'conversation', title: 'Sample', body: 'You:\nI need to call Ada.', demonstration: true, conversation: {} });
  await s.saveProposals(src.id, Synth.extract(Capture.turnsOf('You:\nI need to call Ada.'), [], { sourceId: src.id }).proposals, { demonstration: true });
  const mine = await s.keepSource({ kind: 'conversation', title: 'Mine', body: 'You:\nI need to email Bo.', conversation: {} });
  await s.saveProposals(mine.id, Synth.extract(Capture.turnsOf('You:\nI need to email Bo.'), [], { sourceId: mine.id }).proposals);
  await s.removeDemonstration();
  assert.deepEqual((await s.sources()).map((x) => x.revisions[0].title), ['Mine']);
  assert.deepEqual([...new Set((await s.proposals()).map((p) => p.sourceId))], [mine.id]);
});
