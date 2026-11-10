/*
 * Demonstration material.
 *
 * Everything here is fictional and written for this study. It is not anyone's
 * real work, project, or relationship, and every record carries
 * demonstration: true so the interface can label it and remove it in one step.
 * The one collected passage is a public-domain quotation (Thoreau, Walden, 1854).
 */
(function (root) {
  'use strict';

  function seed(today) {
    const t = today || new Date();
    const yearsAgo = (n, m, d) => { const x = new Date(Date.UTC(t.getFullYear() - n, m, d)); return x.toISOString().slice(0, 10); };
    const sameDay = (n) => yearsAgo(n, t.getMonth(), t.getDate());
    const daysAgo = (n) => new Date(t.getTime() - n * 864e5).toISOString();
    const D = { demonstration: true };

    const sources = [
      { ...D, id: 'demo-src-1', kind: 'writing', author: 'Demonstration', madeOn: sameDay(3), provenance: 'Fictional · written for this study',
        title: 'On returning', body: 'The rooms I remember best are the ones I came back to. A kitchen in winter light, the same chair, the same window. Returning is not repetition; each time the room asks something new. I want to make a book of small rooms that rewards returning.' },
      { ...D, id: 'demo-src-2', kind: 'note', author: 'Demonstration', madeOn: yearsAgo(1, 2, 14), provenance: 'Fictional · written for this study',
        title: 'Desk clock — dial measurements', body: 'Dial 84 mm. Twelve indices, hairline, 0.3 mm. One index in tangerine at twelve. Brass movement, quiet tick. The clock should be repairable by anyone with a screwdriver and patience.' },
      { ...D, id: 'demo-src-3', kind: 'photograph', author: 'Demonstration', madeOn: yearsAgo(2, 9, 2), provenance: 'Fictional · no image embedded',
        title: 'North window, 7:40 am', body: 'Kitchen window, early light across the table. Reference for the small rooms book.',
        plate: { w: 4032, h: 3024, caption: 'Kitchen window, north light, table, morning', file: 'demonstration-plate-03' } },
      { ...D, id: 'demo-src-4', kind: 'collected', author: 'Henry David Thoreau', madeOn: '1854-08-09', provenance: 'Walden; or, Life in the Woods (1854), “Where I Lived, and What I Lived For.” Public domain.',
        title: 'Walden', body: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.' },
      { ...D, id: 'demo-src-5', kind: 'writing', author: 'Demonstration', madeOn: yearsAgo(0, Math.max(0, t.getMonth() - 1), 3), provenance: 'Fictional · written for this study',
        title: 'Paper', body: 'Eighty sheets, sewn, not glued, so the notebook opens flat and can be repaired. A paper that takes pencil and ink. A cover that ages well in the hand. Printed by letterpress in one colour.' },
      { ...D, id: 'demo-src-6', kind: 'note', author: 'Demonstration', madeOn: yearsAgo(0, Math.max(0, t.getMonth() - 2), 21), provenance: 'Fictional · written for this study',
        title: 'Things worth keeping', body: 'What do people carry through a life? Letters, a few photographs, a tool that belonged to someone, a book read twice. An archive should keep these deliberately and let them return.' },
    ];

    const items = [
      { ...D, id: 'demo-itm-1', kind: 'project', no: 1, title: 'Small Rooms — a book', x: 32, y: 32,
        bookmarkAt: daysAgo(19),
        bookmark: { stands: 'Twelve rooms chosen; sequence drafted. Photographs for four rooms still to make.', question: 'Does the book need text, or only captions?', next: 'Photograph the north window at first light and set one spread.' } },
      { ...D, id: 'demo-itm-2', kind: 'project', no: 2, title: 'Desk clock, No. 1', x: 304, y: 72,
        bookmarkAt: daysAgo(4),
        bookmark: { stands: 'Dial drawn at full size. Movement sourced; case not yet machined.', question: 'Brass case or anodised aluminium?', next: 'Send the dial drawing and case question to the machinist.' } },
      { ...D, id: 'demo-itm-3', kind: 'project', no: 3, title: 'Notebook, 80 sheets', x: 576, y: 32,
        bookmarkAt: daysAgo(46),
        bookmark: { stands: 'Paper samples arrived. Binding decided: sewn, opens flat.', question: 'Which printer for the cover?', next: 'Ask the printer for a one-colour letterpress quote.' } },
      { ...D, id: 'demo-itm-4', kind: 'person', no: 4, title: 'E. Lindqvist', role: 'Letterpress printer (fictional)', x: 576, y: 248 },
      { ...D, id: 'demo-itm-5', kind: 'person', no: 5, title: 'R. Moreau', role: 'Machinist (fictional)', x: 304, y: 480 },
      { ...D, id: 'demo-itm-6', kind: 'idea', no: 6, title: 'Make nothing that cannot be repaired', x: 576, y: 472 },
      { ...D, id: 'demo-itm-7', kind: 'idea', no: 7, title: 'An archive that rewards returning', x: 32, y: 456 },
      { ...D, id: 'demo-itm-8', kind: 'source', no: 8, sourceId: 'demo-src-1', x: 32, y: 232 },
      { ...D, id: 'demo-itm-9', kind: 'source', no: 9, sourceId: 'demo-src-2', x: 304, y: 264 },
    ];

    const links = [
      ['demo-itm-1', 'demo-itm-8', 'Where the book began'],
      ['demo-itm-2', 'demo-itm-9', ''],
      ['demo-itm-2', 'demo-itm-5', 'Case and movement'],
      ['demo-itm-3', 'demo-itm-4', 'Cover printing'],
      ['demo-itm-6', 'demo-itm-2', ''],
      ['demo-itm-6', 'demo-itm-3', ''],
      ['demo-itm-7', 'demo-itm-1', ''],
    ];
    return { sources, items, links, now: 'demo-itm-2' };
  }

  async function install(store, today) {
    const s = seed(today);
    for (const src of s.sources) if (!(await store.getSource(src.id))) await store.keepSource(src);
    const have = new Set((await store.items()).map((i) => i.id));
    for (const it of s.items) if (!have.has(it.id)) await store.addItem(it);
    for (const [a, b, note] of s.links) await store.link(a, b, note);
    await store.setNow(s.now);
    await store.setMeta('demonstration', true);
  }

  const exported = { seed, install };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.TangerineDemo = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
