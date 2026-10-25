/* Haven — Experiment 001: Fear. Read, collect, reflect, return. */
(function () {
  'use strict';

  const { USER_EDIT, USER_DELETE } = HavenStore;
  const C = window.FEAR;
  const main = document.getElementById('main');

  C.movements.forEach((m) => m.passages.forEach((p) => { if (p.verses && !p.text) p.text = p.verses.map((v) => v[1]).join('\n\n'); }));
  const passages = C.movements.flatMap((m) => m.passages.map((p) => Object.assign({ movement: m.id }, p)));
  const byId = Object.fromEntries(passages.map((p) => [p.id, p]));

  let store;
  let entries = [];
  let links = [];
  const state = { filter: 'all', adder: false, editing: null, responding: null, connecting: null, prompt: null };

  /* ---------- helpers ---------- */

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paras = (text) => esc(text).split(/\n{2,}/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function ago(iso) {
    const days = Math.round((Date.now() - new Date(iso)) / 86400000);
    if (days < 1) return 'today';
    if (days < 2) return 'yesterday';
    if (days < 45) return days + ' days ago';
    const months = Math.round(days / 30.4);
    if (months < 18) return months + ' months ago';
    return Math.round(days / 365) + ' years ago';
  }
  const cur = (e) => store.current(e);
  const ref = (p) => (p.locator && p.locator.indexOf(p.author) === 0 ? p.locator : p.author + ', ' + (p.locator || p.work));
  const entryText = (e) => { const r = cur(e); return [r.body, r.caption, r.author, r.work, r.prompt].filter(Boolean).join(' '); };
  const mine = () => entries.filter((e) => e.kind !== 'collected' && e.kind !== 'bookmark');
  const shortText = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t; };
  const KIND_NAME = { writing: 'Writing', note: 'Note', question: 'Question', quotation: 'Quotation', image: 'Image', collected: 'Collected', bookmark: 'Bookmark' };
  const TRADITION = { scripture: 'Scripture', philosophy: 'Philosophy', literature: 'Literature', contemplative: 'Contemplative' };

  function toast(msg) {
    const t = document.querySelector('.toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  async function refresh() {
    entries = await store.list();
    links = await store.links();
  }

  function provenance(e) {
    if (e.origin === 'demo') return '<span class="tag demo" title="Written for this prototype to demonstrate Haven. Not your writing.">Demonstration</span>';
    if (e.kind === 'collected') return '<span class="tag">Source</span>';
    return '<span class="tag">Yours</span>';
  }

  function citeLine(p, opts) {
    const o = opts || {};
    const bits = [];
    const sameAsLocator = p.author && p.locator && !p.work && p.locator.indexOf(p.author) === 0;
    if (sameAsLocator) bits.push('<span class="who">' + esc(p.locator) + '</span>');
    else {
      bits.push('<span class="who">' + esc(p.author ? p.author + (p.work ? ', ' : '') : '') + (p.work ? '<i>' + esc(p.work) + '</i>' : '') + '</span>');
      if (p.locator) bits.push(esc(p.locator));
    }
    if (p.translation) bits.push(esc(p.translation));
    if (!o.short && p.rights) bits.push('<span class="rights">' + esc(p.rights) + '</span>');
    if (p.read && p.read.url) bits.push('<a href="' + esc(p.read.url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.read.label || 'Read in full') + ' ↗</a>');
    return '<div class="cite">' + bits.join(' · ') + '</div>';
  }

  /* ---------- connections ---------- */

  // Each earlier thought is offered beside at most its two closest passages, so the margin stays quiet.
  async function suggestionsByPassage() {
    const dismissed = await store.meta('dismissed', []);
    const confirmed = new Set(links.map((l) => l.a + '|' + l.b));
    const best = {};
    mine().forEach((e) => {
      passages
        .map((p) => ({ p, s: HavenConnect.suggest(p, [e], entryText, dismissed)[0] }))
        .filter((x) => x.s && !confirmed.has(x.p.id + '|' + e.id))
        .sort((a, b) => b.s.why.score - a.s.why.score)
        .slice(0, 2)
        .forEach((x) => { (best[x.p.id] = best[x.p.id] || []).push(x.s); });
    });
    Object.values(best).forEach((list) => list.sort((a, b) => b.why.score - a.why.score).splice(2));
    return best;
  }

  function whyLine(why) {
    let s = 'Both concern <b>' + why.themes.map((t) => esc(t.label)).join('</b> and <b>') + '</b>.';
    if (why.words.length) s += ' Shared words: ' + why.words.map(esc).join(', ') + '.';
    return s;
  }

  function returningHTML(pid, s) {
    const e = s.entry;
    const r = cur(e);
    const key = pid + '|' + e.id;
    const connecting = state.connecting === key;
    return '<div class="returning fresh" data-key="' + esc(key) + '">' +
      '<span class="label">An earlier thought</span>' +
      '<div class="yours' + (e.origin === 'demo' ? ' demo' : '') + '"><div class="body">' + esc(shortText(r.body || r.caption, 220)) + '</div></div>' +
      '<span class="when mono">' + esc(KIND_NAME[e.kind]) + ' · ' + day(r.writtenOn || e.createdAt) + ' · ' + ago(r.writtenOn || e.createdAt) + ' ' + (e.origin === 'demo' ? '· demonstration' : '') + '</span>' +
      '<div class="why">Haven noticed this by matching words and themes in this browser. ' + whyLine(s.why) + ' Neither text is changed.</div>' +
      (connecting
        ? '<div class="field" style="margin-top:12px"><label for="cn-' + esc(e.id) + '">In your words, how do they meet? (optional)</label><input type="text" id="cn-' + esc(e.id) + '" placeholder="Optional"></div>' +
          '<div class="actions"><button class="btn on" data-act="connect-keep" data-pid="' + esc(pid) + '" data-eid="' + esc(e.id) + '">Keep connection</button><button class="btn" data-act="connect-cancel">Cancel</button></div>'
        : '<div class="actions"><button class="btn" data-act="connect" data-key="' + esc(key) + '">Connect</button><a class="btn" href="#collect/' + esc(e.id) + '">Open</a><button class="btn" data-act="dismiss" data-key="' + esc(key) + '">Not related</button></div>') +
      '</div>';
  }

  function linkedHTML(pid) {
    return links.filter((l) => l.a === pid).map((l) => {
      const e = entries.find((x) => x.id === l.b);
      if (!e) return '';
      return '<div class="linked"><span class="label">Connected by you · ' + day(l.at) + '</span>' +
        '<div class="yours' + (e.origin === 'demo' ? ' demo' : '') + '" style="margin-top:8px;font-family:var(--serif);font-size:15.5px"><div class="body">' + esc(shortText(cur(e).body || cur(e).caption, 160)) + '</div></div>' +
        (l.note ? '<p style="margin:8px 0 0">“' + esc(l.note) + '”</p>' : '') +
        '<div class="actions" style="margin-top:4px"><a class="btn" href="#collect/' + esc(e.id) + '">Open</a><button class="btn" data-act="unlink" data-id="' + esc(l.id) + '">Undo</button></div></div>';
    }).join('');
  }

  /* ---------- READ ---------- */

  function passageHTML(p, sugg) {
    const collected = entries.find((e) => e.kind === 'collected' && e.anchor === p.id);
    const responses = entries.filter((e) => e.anchor === p.id && e.kind !== 'collected');
    const isQuote = p.kind === 'quotation';
    const kindLabel = isQuote ? 'Quotation · exact text' : 'Paraphrase · not the author’s words';
    const body = isQuote
      ? '<blockquote class="source' + (p.verse ? ' verse' : '') + '">' + (p.verses ? p.verses.map((v) => '<p><sup class="vn">' + esc(v[0]) + '</sup>' + esc(v[1]) + '</p>').join('') : paras(p.text)) + '</blockquote>'
      : '<p class="paraphrase">' + esc(p.text) + '</p>';
    const responding = state.responding === p.id;
    return '<article class="passage" id="p-' + esc(p.id) + '" data-pid="' + esc(p.id) + '">' +
      '<div class="main">' +
        '<div class="head"><span class="label">' + esc(TRADITION[p.tradition]) + '</span><span class="label kind">' + kindLabel + '</span></div>' +
        body + citeLine(p) +
        '<div class="actions">' +
          '<button class="btn' + (collected ? ' on' : '') + '" data-act="collect" data-pid="' + esc(p.id) + '" aria-pressed="' + !!collected + '"><span class="glyph">' + (collected ? '◆' : '◇') + '</span>' + (collected ? 'Collected' : 'Collect') + '</button>' +
          '<button class="btn" data-act="respond" data-pid="' + esc(p.id) + '"><span class="glyph">✎</span>Respond</button>' +
          '<a class="btn" href="#reflect/' + esc(p.id) + '"><span class="glyph">→</span>To the desk</a>' +
        '</div>' +
        (responding ? '<div class="respond inline-desk"><div class="field"><label for="r-' + esc(p.id) + '">Your response, kept exactly as you write it</label><textarea id="r-' + esc(p.id) + '" placeholder="Write in your own words."></textarea></div><div class="row"><button class="btn solid" data-act="respond-keep" data-pid="' + esc(p.id) + '">Keep</button><button class="btn" data-act="respond-cancel">Cancel</button></div></div>' : '') +
        (responses.length ? '<div class="responses">' + responses.map((e) =>
          '<div class="yours' + (e.origin === 'demo' ? ' demo' : '') + '"><div class="label" style="margin-bottom:6px">' + (e.origin === 'demo' ? 'Demonstration' : 'You') + ' · ' + day(e.createdAt) + '</div><div class="body">' + esc(cur(e).body) + '</div></div>').join('') + '</div>' : '') +
      '</div>' +
      '<div class="margin">' +
        (p.commentary ? '<div class="commentary optional"><span class="label">Haven · commentary</span>' + p.commentary.map((c) => '<p>' + esc(c) + '</p>').join('') + '</div>' : '') +
        (sugg || []).map((s) => returningHTML(p.id, s)).join('') +
        linkedHTML(p.id) +
      '</div>' +
    '</article>';
  }

  async function renderRead(focusId) {
    const sugg = await suggestionsByPassage();
    const place = await store.meta('place', null);
    const placeP = place && byId[place.pid];
    main.innerHTML = '<div class="page">' +
      '<section class="opening">' +
        '<p class="label">Collection 001 · Six movements · About twenty minutes</p>' +
        '<h1 class="question">' + C.questionHTML + '</h1>' +
        '<div class="commentary lede"><span class="label">Haven · commentary</span>' + C.opening.map((t) => '<p>' + esc(t) + '</p>').join('') + '</div>' +
        '<div class="begin">' +
          '<a class="btn solid" href="#read/' + esc(passages[0].id) + '">Begin reading</a>' +
          (placeP ? '<a class="btn line" href="#read/' + esc(placeP.id) + '">Continue · ' + esc(placeP.author) + '</a>' : '') +
          '<a class="btn" href="#sources">Sources &amp; method</a>' +
        '</div>' +
        '<div class="voice-key" aria-label="How to tell the voices apart">' +
          '<div class="k-source"><b>Source</b>Quoted exactly, with translator, location, and a link to the full text.</div>' +
          '<div class="k-para"><b>Paraphrase</b>A summary of a source. Never the author’s words.</div>' +
          '<div class="k-yours"><b>Yours</b>Your words. Kept exactly as written. Only you change them.</div>' +
          '<div class="k-haven"><b>Haven</b>Interpretation and suggested connections. Separate, optional, never authoritative.</div>' +
        '</div>' +
      '</section>' +
      '<div class="reading-bar">' +
        '<ol class="contents">' + C.movements.map((m) => '<li><a href="#read/' + esc(m.passages[0].id) + '"><span class="rn">' + esc(m.numeral) + '</span>' + esc(m.short) + '</a></li>').join('') + '</ol>' +
        '<button class="btn" data-act="commentary">' + (document.body.classList.contains('no-commentary') ? 'Show commentary' : 'Hide commentary') + '</button>' +
      '</div>' +
      C.movements.map((m) =>
        '<section class="movement" id="m-' + esc(m.id) + '">' +
          '<div class="movement-head"><div><span class="numeral">' + esc(m.numeral) + '</span><h2>' + esc(m.title) + '</h2></div>' +
          (m.commentary ? '<div class="commentary optional"><span class="label">Haven · commentary</span><p>' + esc(m.commentary) + '</p></div>' : '<div></div>') + '</div>' +
          m.passages.map((p) => passageHTML(Object.assign({ movement: m.id }, p), sugg[p.id])).join('') +
        '</section>').join('') +
      '<section class="movement"><div class="prose"><p class="label">End of the collection</p><p style="margin-top:14px">' + esc(C.closing) + '</p><div class="row" style="margin-top:22px"><a class="btn solid" href="#reflect">Go to the desk</a><a class="btn line" href="#return">Leave a bookmark</a></div></div></section>' +
    '</div>';
    observeReading();
    if (focusId && byId[focusId]) {
      await notePlace(focusId);
      const el = document.getElementById('p-' + focusId);
      el.scrollIntoView({ block: 'start' });
      el.classList.add('lit');
      setTimeout(() => el.classList.remove('lit'), 2400);
    } else {
      window.scrollTo(0, 0);
    }
  }

  // Remember where you are reading, so Return can bring you back and look for earlier thoughts.
  async function notePlace(pid) {
    await store.setMeta('place', { pid, at: new Date().toISOString() });
    const log = (await store.meta('readLog', [])).filter((x) => x !== pid);
    log.unshift(pid);
    await store.setMeta('readLog', log.slice(0, 24));
  }

  let observer;
  function observeReading() {
    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window)) return;
    const timers = new Map();
    observer = new IntersectionObserver((items) => {
      items.forEach((it) => {
        const pid = it.target.dataset.pid;
        if (it.isIntersecting) {
          timers.set(pid, setTimeout(() => notePlace(pid), 1500));
        } else {
          clearTimeout(timers.get(pid));
        }
      });
    }, { threshold: 0.55 });
    document.querySelectorAll('.passage').forEach((el) => observer.observe(el));
  }

  async function rerenderPassage(pid) {
    const el = document.getElementById('p-' + pid);
    if (!el) return route();
    const sugg = await suggestionsByPassage();
    const tmp = document.createElement('div');
    tmp.innerHTML = passageHTML(byId[pid], sugg[pid]);
    el.replaceWith(tmp.firstChild);
    if (observer) observer.observe(document.getElementById('p-' + pid));
  }

  /* ---------- COLLECT ---------- */

  const TABS = [['all', 'All'], ['collected', 'Collected passages'], ['writing', 'Writing'], ['note', 'Notes'], ['question', 'Questions'], ['quotation', 'Quotations'], ['image', 'Images']];

  function entryContent(e) {
    const r = cur(e);
    if (e.kind === 'collected') {
      return '<blockquote>' + paras(r.body) + '</blockquote>' + citeLine(r, { short: true }) +
        '<div class="hint" style="margin-top:6px">Collected ' + day(e.createdAt) + ' exactly as the source printed it. <a href="#read/' + esc(e.anchor) + '">Read in context</a></div>';
    }
    if (e.kind === 'image') {
      return '<figure style="margin:0"><img src="' + esc(r.image) + '" alt="' + esc(r.caption || 'Image you added') + '">' +
        (r.caption ? '<figcaption class="meta" style="margin-top:8px">' + esc(r.caption) + '</figcaption>' : '') + '</figure>' +
        (r.credit ? '<div class="hint">Credit: ' + esc(r.credit) + '</div>' : '');
    }
    if (e.kind === 'quotation') {
      return '<blockquote class="yours' + (e.origin === 'demo' ? ' demo' : '') + '"><div class="body">' + esc(r.body) + '</div></blockquote>' +
        '<div class="cite">' + [r.author, r.work ? '<i>' + esc(r.work) + '</i>' : '', r.locator].filter(Boolean).map((x, i) => i === 1 ? x : esc(x)).join(', ') +
        (r.url ? ' · <a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">Source ↗</a>' : '') +
        ' · <span class="rights">' + (r.checked ? 'You checked this against the source' : 'Not yet checked against the source') + '</span></div>';
    }
    const anchor = e.anchor && byId[e.anchor];
    return (r.prompt ? '<div class="hint" style="margin-bottom:8px">Begun from: ' + esc(r.prompt) + '</div>' : '') +
      (anchor ? '<div class="hint" style="margin-bottom:8px">Written beside <a href="#read/' + esc(anchor.id) + '">' + esc(ref(anchor)) + '</a></div>' : '') +
      '<div class="yours' + (e.origin === 'demo' ? ' demo' : '') + '"><div class="body">' + esc(r.body) + '</div></div>';
  }

  function historyHTML(e) {
    if (e.revisions.length < 2) return '';
    return '<details class="history"><summary>' + (e.revisions.length - 1) + ' earlier version' + (e.revisions.length > 2 ? 's' : '') + ' kept</summary><ol>' +
      e.revisions.slice(0, -1).map((r) => '<li><span class="mono">' + day(r.at) + '</span><div class="body">' + esc(r.body || r.caption) + '</div></li>').join('') + '</ol></details>';
  }

  async function renderCollect(focusId) {
    const list = entries.filter((e) => e.kind !== 'bookmark');
    const own = list.filter((e) => e.origin === 'you' && e.kind !== 'collected');
    const shown = list.filter((e) => state.filter === 'all' || e.kind === state.filter);
    const dismissed = await store.meta('dismissed', []);
    const count = (k) => list.filter((e) => k === 'all' || e.kind === k).length;

    main.innerHTML = '<div class="page">' +
      '<div class="section-head"><div><p class="label">Personal archive · Fear</p><h1>Commonplace book</h1></div>' +
        '<div class="row"><button class="btn solid" data-act="adder">' + (state.adder ? 'Close' : 'Add to the book') + '</button></div></div>' +
      adderHTML() +
      (own.length ? '' : '<div class="empty"><p><b style="font-weight:400">Nothing of yours has been imported.</b> Your existing writing, saved quotations, images, notes and questions about fear are not in Haven yet. Add them here by hand, or bring in a Haven export from <a href="#return">Return</a>.</p><p class="hint">Entries marked DEMONSTRATION were written for this prototype to show how Haven works. They are not your writing, and you can remove them in one step from Return.</p></div>') +
      '<div class="tabs" role="group" aria-label="Show">' + TABS.map(([k, n]) => '<button data-act="filter" data-k="' + k + '" aria-pressed="' + (state.filter === k) + '">' + n + '<span class="count">' + count(k) + '</span></button>').join('') + '</div>' +
      (shown.length ? '<ol class="ledger">' + shown.map((e) => ledgerItem(e, dismissed)).join('') + '</ol>' : '<div class="empty hint">Nothing here yet.</div>') +
    '</div>';
    if (focusId) {
      const el = document.getElementById('e-' + focusId);
      if (el) { el.scrollIntoView({ block: 'start' }); el.style.background = 'var(--ghost)'; setTimeout(() => (el.style.background = ''), 2400); }
    } else window.scrollTo(0, 0);
  }

  function ledgerItem(e, dismissed) {
    const r = cur(e);
    const editing = state.editing === e.id;
    let meets = '';
    if (e.kind !== 'collected') {
      const hits = passages.map((p) => ({ p, s: HavenConnect.suggest(p, [e], entryText, dismissed)[0] })).filter((x) => x.s).sort((a, b) => b.s.why.score - a.s.why.score).slice(0, 2);
      const confirmed = links.filter((l) => l.b === e.id).map((l) => byId[l.a]).filter(Boolean);
      if (confirmed.length) meets += '<div class="hint">Connected by you to ' + confirmed.map((p) => '<a href="#read/' + esc(p.id) + '">' + esc(ref(p)) + '</a>').join(', ') + '</div>';
      if (hits.length) meets += '<div class="hint">Haven noticed it meets ' + hits.map((x) => '<a href="#read/' + esc(x.p.id) + '">' + esc(ref(x.p)) + '</a>').join(' and ') + '</div>';
    }
    return '<li id="e-' + esc(e.id) + '">' +
      '<div class="when"><span class="label">' + esc(KIND_NAME[e.kind]) + '</span><span class="mono">' + day(r.writtenOn || e.createdAt) + '</span>' +
        (r.writtenOn ? '<span class="mono">added ' + day(e.createdAt) + '</span>' : '') + '<div style="margin-top:8px">' + provenance(e) + '</div></div>' +
      '<div class="content">' + (editing ? editHTML(e) : entryContent(e) + historyHTML(e)) + '</div>' +
      '<div class="side">' +
        (e.kind !== 'collected' && !editing ? '<button class="btn" data-act="edit" data-id="' + esc(e.id) + '">Edit</button>' : '') +
        (e.kind !== 'image' && e.kind !== 'collected' ? '<a class="btn" href="#reflect/e/' + esc(e.id) + '">Write from this</a>' : '') +
        '<button class="btn" data-act="delete" data-id="' + esc(e.id) + '">Delete</button>' + meets +
      '</div></li>';
  }

  function editHTML(e) {
    const r = cur(e);
    const field = e.kind === 'image' ? 'caption' : 'body';
    return '<div class="field"><label for="ed-' + esc(e.id) + '">Editing your ' + esc(KIND_NAME[e.kind].toLowerCase()) + '. The current version will be kept in its history.</label>' +
      '<textarea id="ed-' + esc(e.id) + '" data-field="' + field + '">' + esc(r[field] || '') + '</textarea></div>' +
      '<div class="row"><button class="btn solid" data-act="edit-keep" data-id="' + esc(e.id) + '">Keep this version</button><button class="btn" data-act="edit-cancel">Cancel</button></div>';
  }

  function adderHTML() {
    if (!state.adder) return '';
    const k = state.addKind || 'writing';
    const kinds = [['writing', 'Writing'], ['note', 'Note'], ['question', 'Question'], ['quotation', 'Quotation'], ['image', 'Image']];
    let fields = '';
    if (k === 'image') {
      fields = '<div class="field"><label for="a-file">Image</label><input type="file" id="a-file" accept="image/*"></div>' +
        '<div class="grid2"><div class="field"><label for="a-caption">Caption, in your words</label><input type="text" id="a-caption"></div>' +
        '<div class="field"><label for="a-credit">Where it came from</label><input type="text" id="a-credit" placeholder="Your photograph, a museum, a book…"></div></div>';
    } else {
      fields = '<div class="field"><label for="a-body">' + ({ writing: 'Your writing', note: 'Your note', question: 'Your question', quotation: 'The quotation, exactly as printed' })[k] + '</label><textarea id="a-body"></textarea></div>';
      if (k === 'quotation') {
        fields += '<div class="grid2"><div class="field"><label for="a-author">Author</label><input type="text" id="a-author"></div><div class="field"><label for="a-work">Work</label><input type="text" id="a-work"></div>' +
          '<div class="field"><label for="a-locator">Page, chapter or verse</label><input type="text" id="a-locator"></div><div class="field"><label for="a-url">Link to source</label><input type="url" id="a-url" placeholder="https://"></div></div>' +
          '<label class="hint" style="display:flex;gap:10px;align-items:center;margin-bottom:16px"><input type="checkbox" id="a-checked"> I have checked this against the source</label>';
      }
    }
    fields += '<div class="field" style="max-width:280px"><label for="a-written">Originally written or found (optional)</label><input type="text" id="a-written" placeholder="e.g. 2019-03-02"></div>';
    return '<div class="adder"><div class="wide">' +
      '<div class="kinds tabs" style="border:0;padding:0">' + kinds.map(([v, n]) => '<button data-act="addkind" data-k="' + v + '" aria-pressed="' + (k === v) + '">' + n + '</button>').join('') + '</div>' +
      fields +
      '<div class="row"><button class="btn solid" data-act="add">Keep</button><span class="hint">Kept exactly as entered, in this browser only. Haven may suggest connections beside it; it never alters it.</span></div>' +
    '</div></div>';
  }

  async function addFromForm() {
    const k = state.addKind || 'writing';
    const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const written = v('a-written');
    let writtenOn;
    if (written) {
      const d = new Date(written);
      if (isNaN(d)) return toast('That date was not understood. Try 2019-03-02.');
      writtenOn = d.toISOString();
    }
    const fields = {};
    if (writtenOn) fields.writtenOn = writtenOn;
    if (k === 'image') {
      const file = document.getElementById('a-file').files[0];
      if (!file) return toast('Choose an image first.');
      if (file.size > 12 * 1024 * 1024) return toast('That image is over 12 MB. This prototype keeps images in the browser.');
      fields.image = await new Promise((ok, fail) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = fail; fr.readAsDataURL(file); });
      fields.caption = v('a-caption');
      fields.credit = v('a-credit');
      fields.filename = file.name;
    } else {
      fields.body = document.getElementById('a-body').value; // kept exactly, including spacing
      if (!fields.body.trim()) return toast('Nothing to keep yet.');
      if (k === 'quotation') Object.assign(fields, { author: v('a-author'), work: v('a-work'), locator: v('a-locator'), url: /^https?:\/\//i.test(v('a-url')) ? v('a-url') : '', checked: document.getElementById('a-checked').checked });
    }
    await store.add(k, fields);
    state.adder = false;
    await refresh();
    toast('Kept.');
    renderCollect();
  }

  /* ---------- REFLECT ---------- */

  async function renderReflect(arg) {
    const draft = await store.meta('draft', { text: '', prompt: null, anchor: null, from: null });
    if (arg && arg.passage && draft.anchor !== arg.passage) Object.assign(draft, { anchor: arg.passage, prompt: null, from: null });
    if (arg && arg.entry && draft.from !== arg.entry) Object.assign(draft, { from: arg.entry, anchor: null, prompt: null });
    if (arg && !draft.text) await store.setMeta('draft', draft);
    const anchor = draft.anchor && byId[draft.anchor];
    const from = draft.from && entries.find((e) => e.id === draft.from);
    const kept = mine().filter((e) => e.kind === 'writing' && e.origin === 'you').slice(0, 4);

    main.innerHTML = '<div class="page"><div class="desk">' +
      '<aside>' +
        (anchor ? '<div><p class="label">Beside you</p><div class="beside" style="margin-top:10px">' + esc(shortText(anchor.text, 360)) + citeLine(anchor, { short: true }) + '</div><button class="btn" data-act="desk-clear-anchor">Set aside</button></div>' : '') +
        (from ? '<div><p class="label">Your earlier ' + esc(KIND_NAME[from.kind].toLowerCase()) + ' · ' + day(cur(from).writtenOn || from.createdAt) + '</p><div class="yours' + (from.origin === 'demo' ? ' demo' : '') + '" style="margin-top:10px;font-size:16px"><div class="body">' + esc(shortText(cur(from).body, 360)) + '</div></div><button class="btn" data-act="desk-clear-anchor">Set aside</button></div>' : '') +
        '<div><p class="label">Questions to begin from</p><p class="hint" style="margin:6px 0 10px">Written by Haven. Use one, or none.</p><ul class="prompts">' +
          C.prompts.map((q, i) => '<li><button data-act="prompt" data-i="' + i + '" aria-pressed="' + (draft.prompt === q) + '">' + esc(q) + '</button></li>').join('') +
          '<li><button data-act="prompt" data-i="-1" aria-pressed="' + (!draft.prompt) + '"><i>A blank page</i></button></li>' +
        '</ul></div>' +
        (kept.length ? '<div><p class="label">Kept at the desk</p><ul class="thread" style="margin-top:8px">' + kept.map((e) => '<li style="grid-template-columns:1fr"><a href="#collect/' + esc(e.id) + '"><span class="mono">' + day(e.createdAt) + '</span><div class="ex">' + esc(shortText(cur(e).body, 140)) + '</div></a></li>').join('') + '</ul></div>' : '') +
      '</aside>' +
      '<div class="page-of-paper">' +
        '<p class="label">The desk · ' + day(new Date().toISOString()) + '</p>' +
        (draft.prompt ? '<p class="prompt-line" style="margin-top:18px">' + esc(draft.prompt) + '</p><p class="hint" style="margin:0 0 10px">A question from Haven. What follows is yours.</p>' : '<div style="height:18px"></div>') +
        '<label class="label" for="desk" style="position:absolute;left:-9999px">Your writing</label>' +
        '<textarea id="desk" placeholder="Write in your own words. Nothing here is completed, corrected or rephrased for you.">' + esc(draft.text) + '</textarea>' +
        '<div class="row"><span class="mono" id="desk-count"></span><div class="row"><button class="btn" data-act="desk-discard">Discard draft</button><button class="btn solid" data-act="desk-keep">Keep</button></div></div>' +
        '<p class="hint" id="desk-status">The draft is held in this browser until you keep it.</p>' +
        '<div id="desk-after"></div>' +
      '</div>' +
    '</div></div>';
    const ta = document.getElementById('desk');
    const count = () => { const n = (ta.value.match(/\S+/g) || []).length; document.getElementById('desk-count').textContent = n + (n === 1 ? ' word' : ' words'); };
    count();
    let t;
    ta.addEventListener('input', () => {
      count();
      clearTimeout(t);
      t = setTimeout(async () => {
        const d = await store.meta('draft', {});
        d.text = ta.value;
        await store.setMeta('draft', d);
        document.getElementById('desk-status').textContent = 'Draft held in this browser · ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }, 400);
    });
    window.scrollTo(0, 0);
    if (!matchMedia('(max-width: 760px)').matches) ta.focus();
  }

  async function keepDesk() {
    const ta = document.getElementById('desk');
    const d = await store.meta('draft', {});
    if (!ta.value.trim()) return toast('Nothing to keep yet.');
    const fields = { body: ta.value };
    if (d.prompt) fields.prompt = d.prompt;
    if (d.from) fields.respondingTo = d.from;
    const e = await store.add('writing', fields, { anchor: d.anchor || null });
    await store.setMeta('draft', { text: '', prompt: null, anchor: null, from: null });
    await refresh();
    const hits = passages.map((p) => ({ p, s: HavenConnect.suggest(p, [e], entryText, [])[0] })).filter((x) => x.s && x.p.id !== d.anchor).sort((a, b) => b.s.why.score - a.s.why.score).slice(0, 2);
    await renderReflect();
    document.getElementById('desk-status').scrollIntoView({ block: 'center' });
    document.getElementById('desk-status').textContent = 'Kept ' + day(e.createdAt) + '. It is in your commonplace book, exactly as written.';
    document.getElementById('desk-after').innerHTML = hits.length
      ? '<div class="commentary" style="margin-top:28px"><span class="label">Haven noticed · suggested connections</span>' + hits.map((x) =>
          '<p><a href="#read/' + esc(x.p.id) + '">' + esc(ref(x.p)) + '</a> — ' + whyLine(x.s.why) + '</p>').join('') + '<p>Suggestions only. Your writing has not been changed.</p></div>'
      : '';
  }

  /* ---------- RETURN ---------- */

  async function renderReturn() {
    const place = await store.meta('place', null);
    const placeP = place && byId[place.pid];
    const log = await store.meta('readLog', []);
    const dismissed = await store.meta('dismissed', []);
    const bookmarks = entries.filter((e) => e.kind === 'bookmark');
    const bm = bookmarks[0];
    const demoCount = entries.filter((e) => e.origin === 'demo').length;

    // Rediscovery: earlier thoughts that meet passages you have recently read.
    const seen = new Set();
    const found = [];
    log.map((pid) => byId[pid]).filter(Boolean).forEach((p) => {
      HavenConnect.suggest(p, mine(), entryText, dismissed).slice(0, 1).forEach((s) => {
        if (seen.has(s.entry.id)) return;
        seen.add(s.entry.id);
        found.push({ p, s });
      });
    });

    const thread = mine().slice().sort((a, b) => (cur(b).writtenOn || b.createdAt).localeCompare(cur(a).writtenOn || a.createdAt));

    main.innerHTML = '<div class="page">' +
      '<div class="section-head"><div><p class="label">Return</p><h1>Where you left off.</h1></div></div>' +
      '<div class="return-grid"><div>' +
        '<div class="block"><p class="label">Continue reading</p>' +
          (placeP
            ? '<p class="continue"><a href="#read/' + esc(placeP.id) + '">' + esc(ref(placeP)) + ' →</a></p><p class="hint">' + esc(shortText(placeP.text, 140)) + '<br>Last here ' + ago(place.at) + '.</p>'
            : '<p class="continue"><a href="#read/' + esc(passages[0].id) + '">Begin with ' + esc(C.movements[0].title) + ' →</a></p>') +
        '</div>' +

        '<div class="block bookmark"><p class="label">Bookmark</p><h2>Put the thinking down without losing the thread.</h2>' +
          (bm ? '<dl><dt>Where I stopped</dt><dd>' + esc(cur(bm).body) + '</dd>' + (cur(bm).question ? '<dt>The open question</dt><dd>' + esc(cur(bm).question) + '</dd>' : '') + (cur(bm).next ? '<dt>Next time</dt><dd>' + esc(cur(bm).next) + '</dd>' : '') + '<dt>Left</dt><dd class="mono">' + day(bm.createdAt) + ' · ' + ago(bm.createdAt) + '</dd></dl>' : '<p class="hint">No bookmark yet. Leave one when you stop, in your own words.</p>') +
          '<details style="margin-top:22px"' + (bm ? '' : ' open') + '><summary class="btn">Leave a new bookmark</summary>' +
            '<div class="field" style="margin-top:12px"><label for="b-where">Where I stopped</label><textarea id="b-where" style="min-height:64px"></textarea></div>' +
            '<div class="field"><label for="b-q">The open question</label><input type="text" id="b-q"></div>' +
            '<div class="field"><label for="b-next">Next time</label><input type="text" id="b-next"></div>' +
            '<button class="btn solid" data-act="bookmark">Keep bookmark</button></details>' +
          (bookmarks.length > 1 ? '<details class="history"><summary>' + (bookmarks.length - 1) + ' earlier bookmark' + (bookmarks.length > 2 ? 's' : '') + '</summary><ol>' + bookmarks.slice(1).map((b) => '<li><span class="mono">' + day(b.createdAt) + '</span><div class="body">' + esc(cur(b).body) + '</div></li>').join('') + '</ol></details>' : '') +
        '</div>' +

        '<div class="block"><p class="label">Earlier thoughts, meeting what you have read</p>' +
          (found.length
            ? '<div class="found">' + found.map(({ p, s }) =>
                '<div class="pair"><div class="yours' + (s.entry.origin === 'demo' ? ' demo' : '') + '"><div class="label" style="margin-bottom:6px">' + (s.entry.origin === 'demo' ? 'Demonstration' : 'You') + ' · ' + day(cur(s.entry).writtenOn || s.entry.createdAt) + ' · ' + ago(cur(s.entry).writtenOn || s.entry.createdAt) + '</div><div class="body">' + esc(shortText(cur(s.entry).body || cur(s.entry).caption, 240)) + '</div></div>' +
                '<div class="beside">' + esc(shortText(p.text, 200)) + citeLine(p, { short: true }) + '</div>' +
                '<div class="meet">Haven noticed: ' + whyLine(s.why) + ' <a href="#read/' + esc(p.id) + '">Read them side by side</a></div></div>').join('') + '</div>'
            : '<p class="hint">As you read, Haven looks for earlier things you wrote that meet the passages in front of you. Nothing has surfaced yet.</p>') +
        '</div>' +

        '<div class="block"><p class="label">Your thread on fear</p>' +
          (thread.length ? '<ul class="thread">' + thread.map((e) => '<li><span class="mono">' + day(cur(e).writtenOn || e.createdAt) + '</span><a href="#collect/' + esc(e.id) + '"><span class="label">' + esc(KIND_NAME[e.kind]) + (e.origin === 'demo' ? ' · demonstration' : '') + '</span><div class="ex">' + esc(shortText(cur(e).body || cur(e).caption, 200)) + '</div></a></li>').join('') + '</ul>' : '<p class="hint">Nothing yet.</p>') +
        '</div>' +
      '</div><div>' +

        '<div class="block"><p class="label">Demonstration · rediscovery</p><h2>An old thought meets a new reading.</h2>' +
          '<ol class="steps">' +
            '<li>A demonstration note, dated September 2025, describes a letter drafted four times and never sent. It asks whether caution is sometimes fear in better clothes. It was written for this prototype; it is not yours.</li>' +
            '<li>Movement I includes the servant in Matthew 25 who says, “I was afraid, and went and hid thy talent in the earth.”</li>' +
            '<li>When you reach that passage, the note appears in its margin, with the reason Haven connected them. Neither text is altered.</li>' +
            '<li>You decide: connect them in your own words, open the note, or mark them not related.</li>' +
          '</ol>' +
          '<div class="row" style="margin-top:16px"><a class="btn line" href="#read/' + esc(C.demoPassage) + '">Show me</a></div>' +
          (demoCount ? '' : '<p class="hint">Demonstration material is currently removed. Restore it below to see this.</p>') +
        '</div>' +

        '<div class="block"><p class="label">Keeping</p>' +
          '<p class="meta">' + (store.durable ? 'Everything is kept in this browser on this device. Nothing is sent anywhere. Clearing site data erases it, so export a copy you can keep.' : 'This browser is not allowing storage. What you write lasts only until this tab closes. Export before leaving.') + '</p>' +
          '<div class="row" style="margin-top:12px"><button class="btn line" data-act="export">Export a copy</button><label class="btn line" style="cursor:pointer">Import<input type="file" accept="application/json" data-act="import" style="position:absolute;left:-9999px"></label></div>' +
          '<p class="hint" style="margin-top:14px">Import adds what is missing and never overwrites what is already here.</p>' +
          '<div class="row" style="margin-top:12px">' + (demoCount ? '<button class="btn" data-act="demo-remove">Remove demonstration material (' + demoCount + ')</button>' : '<button class="btn" data-act="demo-restore">Restore demonstration material</button>') + '</div>' +
        '</div>' +
        '<div class="block"><p class="label">About this collection</p><p class="meta">' + esc(C.about) + '</p><a class="btn" href="#sources">Sources &amp; method</a></div>' +
      '</div></div></div>';
    window.scrollTo(0, 0);
  }

  /* ---------- SOURCES ---------- */

  function renderSources() {
    main.innerHTML = '<div class="page"><div class="section-head"><div><p class="label">Sources &amp; method</p><h1>How this collection was made.</h1></div></div>' +
      '<div class="return-grid"><div class="prose">' + C.method.map((t) => '<p>' + esc(t) + '</p>').join('') + '</div><div>' +
      '<div class="block"><p class="label">Checked and left out</p>' + C.excluded.map((x) => '<p class="meta" style="margin:10px 0 0"><b style="font-weight:400;color:var(--ink)">' + esc(x.title) + '</b> — ' + esc(x.note) + '</p>').join('') + '</div></div></div>' +
      '<ol class="sources-list" style="margin-top:20px">' + passages.map((p) =>
        '<li><div><span class="label">' + esc(TRADITION[p.tradition]) + ' · ' + (p.kind === 'quotation' ? 'Quotation' : 'Paraphrase') + '</span><div class="who">' + esc(p.author) + '</div></div>' +
        '<div><i>' + esc(p.work) + '</i>' + (p.locator ? ', ' + esc(p.locator) : '') + (p.translation ? ' · ' + esc(p.translation) : '') + '<br>' + esc(p.rights) +
        (p.read ? ' · <a href="' + esc(p.read.url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.read.label || 'Read') + ' ↗</a>' : '') +
        (p.checked ? '<br><span class="mono">Text checked against ' + esc(p.checked) + '</span>' : '') +
        ' · <a href="#read/' + esc(p.id) + '">In the collection</a></div></li>').join('') + '</ol></div>';
    window.scrollTo(0, 0);
  }

  /* ---------- routing ---------- */

  async function route() {
    const hash = location.hash.replace(/^#/, '') || 'read';
    const [view, a, b] = hash.split('/');
    document.querySelectorAll('.primary a').forEach((el) => {
      if (el.dataset.route === (view === 'sources' ? '' : view)) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    state.editing = null;
    state.responding = null;
    state.connecting = null;
    if (view === 'collect') await renderCollect(a);
    else if (view === 'reflect') await renderReflect(a === 'e' ? { entry: b } : a ? { passage: a } : null);
    else if (view === 'return') await renderReturn();
    else if (view === 'sources') renderSources();
    else await renderRead(a);
    document.title = 'Haven — Fear' + (view && view !== 'read' ? ' · ' + view.charAt(0).toUpperCase() + view.slice(1) : '');
  }

  /* ---------- actions ---------- */

  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-act]');
    if (!t || t.tagName === 'INPUT') return;
    const act = t.dataset.act;
    const pid = t.dataset.pid;

    if (act === 'commentary') {
      const off = document.body.classList.toggle('no-commentary');
      await store.setMeta('commentary', !off);
      t.textContent = off ? 'Show commentary' : 'Hide commentary';
    } else if (act === 'collect') {
      const existing = entries.find((e) => e.kind === 'collected' && e.anchor === pid);
      if (existing) { await store.remove(existing.id, USER_DELETE); toast('Removed from your book.'); }
      else {
        const p = byId[pid];
        await store.add('collected', { body: p.text, author: p.author, work: p.work, locator: p.locator, translation: p.translation, rights: p.rights, read: p.read, passageKind: p.kind }, { anchor: pid });
        toast('Collected into your commonplace book.');
      }
      await refresh();
      await rerenderPassage(pid);
    } else if (act === 'respond') {
      state.responding = state.responding === pid ? null : pid;
      await rerenderPassage(pid);
      const ta = document.getElementById('r-' + pid);
      if (ta) ta.focus();
    } else if (act === 'respond-keep') {
      const ta = document.getElementById('r-' + pid);
      if (!ta.value.trim()) return toast('Nothing to keep yet.');
      await store.add('writing', { body: ta.value }, { anchor: pid });
      state.responding = null;
      await refresh();
      await rerenderPassage(pid);
      toast('Kept beside the passage.');
    } else if (act === 'respond-cancel') {
      const p = state.responding;
      state.responding = null;
      await rerenderPassage(p);
    } else if (act === 'connect') {
      state.connecting = t.dataset.key;
      await rerenderPassage(t.dataset.key.split('|')[0]);
    } else if (act === 'connect-cancel') {
      const k = state.connecting;
      state.connecting = null;
      if (k) await rerenderPassage(k.split('|')[0]);
    } else if (act === 'connect-keep') {
      const note = document.getElementById('cn-' + t.dataset.eid);
      await store.connect(pid, t.dataset.eid, note ? note.value : '');
      state.connecting = null;
      await refresh();
      await rerenderPassage(pid);
      toast('Connected. Both texts are unchanged.');
    } else if (act === 'dismiss') {
      const d = await store.meta('dismissed', []);
      d.push(t.dataset.key);
      await store.setMeta('dismissed', d);
      await rerenderPassage(t.dataset.key.split('|')[0]);
    } else if (act === 'unlink') {
      const l = links.find((x) => x.id === t.dataset.id);
      await store.disconnect(t.dataset.id);
      await refresh();
      if (l) await rerenderPassage(l.a);
    } else if (act === 'filter') {
      state.filter = t.dataset.k;
      await renderCollect();
    } else if (act === 'adder') {
      state.adder = !state.adder;
      await renderCollect();
    } else if (act === 'addkind') {
      state.addKind = t.dataset.k;
      await renderCollect();
    } else if (act === 'add') {
      await addFromForm();
    } else if (act === 'edit') {
      state.editing = t.dataset.id;
      await renderCollect(t.dataset.id);
    } else if (act === 'edit-cancel') {
      state.editing = null;
      await renderCollect();
    } else if (act === 'edit-keep') {
      const ta = document.getElementById('ed-' + t.dataset.id);
      try {
        await store.revise(t.dataset.id, { [ta.dataset.field]: ta.value }, USER_EDIT);
        state.editing = null;
        await refresh();
        await renderCollect(t.dataset.id);
        toast('New version kept. The earlier one is in its history.');
      } catch (err) { toast(err.message); }
    } else if (act === 'delete') {
      const e = entries.find((x) => x.id === t.dataset.id);
      const what = e.kind === 'collected' ? 'this collected passage from your book' : 'this ' + KIND_NAME[e.kind].toLowerCase() + ' and all its earlier versions';
      if (!confirm('Delete ' + what + '? This cannot be undone.')) return;
      await store.remove(e.id, USER_DELETE);
      await refresh();
      await renderCollect();
      toast('Deleted.');
    } else if (act === 'prompt') {
      const d = await store.meta('draft', {});
      d.text = document.getElementById('desk').value;
      d.prompt = t.dataset.i === '-1' ? null : C.prompts[+t.dataset.i];
      await store.setMeta('draft', d);
      await renderReflect();
    } else if (act === 'desk-clear-anchor') {
      const d = await store.meta('draft', {});
      d.text = document.getElementById('desk').value;
      d.anchor = null;
      d.from = null;
      await store.setMeta('draft', d);
      location.hash = '#reflect';
      await renderReflect();
    } else if (act === 'desk-keep') {
      await keepDesk();
    } else if (act === 'desk-discard') {
      const ta = document.getElementById('desk');
      if (ta.value.trim() && !confirm('Discard this draft? It has not been kept.')) return;
      await store.setMeta('draft', { text: '', prompt: null, anchor: null, from: null });
      await renderReflect();
    } else if (act === 'bookmark') {
      const where = document.getElementById('b-where').value;
      if (!where.trim()) return toast('Say where you stopped, in a line or two.');
      await store.add('bookmark', { body: where, question: document.getElementById('b-q').value.trim(), next: document.getElementById('b-next').value.trim() });
      await refresh();
      await renderReturn();
      toast('Bookmark kept.');
    } else if (act === 'export') {
      const data = await store.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'haven-001-fear-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (act === 'demo-remove') {
      if (!confirm('Remove all demonstration entries? Your own entries are not affected.')) return;
      for (const e of entries.filter((x) => x.origin === 'demo')) await store.remove(e.id, USER_DELETE);
      await store.setMeta('demo', 'removed');
      await refresh();
      await renderReturn();
    } else if (act === 'demo-restore') {
      await seedDemo(true);
      await refresh();
      await renderReturn();
    }
  });

  document.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.dataset.act !== 'import' || !t.files[0]) return;
    try {
      const n = await store.importAll(JSON.parse(await t.files[0].text()));
      await refresh();
      await renderReturn();
      toast(n + ' entr' + (n === 1 ? 'y' : 'ies') + ' added. Nothing existing was changed.');
    } catch (err) { toast(err.message); }
  });

  async function seedDemo(force) {
    const status = await store.meta('demo', null);
    if (status && !force) return;
    for (const d of window.HAVEN_DEMO) {
      if (!(await store.get(d.id))) await store.add(d.kind, d.fields, { id: d.id, origin: 'demo', createdAt: d.createdAt, anchor: d.anchor || null });
    }
    await store.setMeta('demo', 'seeded');
  }

  /* ---------- start ---------- */

  (async function start() {
    store = await HavenStore.open();
    await seedDemo(false);
    if ((await store.meta('commentary', true)) === false) document.body.classList.add('no-commentary');
    await refresh();
    window.addEventListener('hashchange', () => { route(); main.focus({ preventScroll: true }); });
    await route();
    if (!store.durable) toast('This browser is not allowing storage. Export before you leave.');
  })();
})();
