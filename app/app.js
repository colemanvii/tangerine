/*
 * Tangerine Digital — foundation 001.
 *
 * Whiteboard: the author's command center for projects, people and ideas,
 * pinned to original sources in the archive. The board is a working layer:
 * it moves, links and bookmarks things, and only ever references originals.
 *
 * Writing: a quiet desk for long-form work. Drafts autosave as you type and are
 * recovered after a reload or crash; keeping a draft makes an original or a new
 * revision. Browser storage is not a vault: export a copy to keep one outside it.
 */
(function () {
  'use strict';

  const { openStore, USER_EDIT } = window.TangerineStore;
  const Index = window.TangerineIndex;
  const main = document.getElementById('main');
  const GRID = 8;
  const CARD_W = 208;

  const state = {
    store: null, sources: [], items: [], links: [], dismissed: new Set(),
    view: 'whiteboard', sel: null, archiveSel: null, linkFrom: null, linking: false,
    composing: null, query: '', hits: null, verify: {},
    drafts: [], desk: null, persisted: null,
  };
  const MIRROR = 'tangerine.desk.mirror';
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: the IndexedDB draft still saves */ } };

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(3, '0');
  const PREFIX = { project: 'P', person: 'R', idea: 'I', source: 'S' };
  const KIND = { project: 'Project', person: 'Person', idea: 'Idea', source: 'Source' };
  const catNo = (it) => PREFIX[it.kind] + '—' + pad(it.no);
  const srcById = (id) => state.sources.find((s) => s.id === id);
  const itemById = (id) => state.items.find((i) => i.id === id);
  const cur = (s) => s.revisions[s.revisions.length - 1];
  const lastMark = (it) => it.bookmarks[it.bookmarks.length - 1];
  const fmtDate = (iso) => {
    if (!iso) return 'Undated';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso);
    const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return String(d.getUTCDate()).padStart(2, '0') + ' ' + M[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  };
  const ago = (iso) => {
    const days = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 60 ? days + ' days ago' : Math.round(days / 30) + ' months ago';
  };
  const titleOf = (it) => (it.kind === 'source' ? (srcById(it.sourceId) ? cur(srcById(it.sourceId)).title || 'Untitled' : 'Missing source') : it.title);
  const snap = (v) => Math.max(0, Math.round(v / GRID) * GRID);
  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast t-meta'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2400);
  }

  async function load() {
    const s = state.store;
    [state.sources, state.items, state.links, state.dismissed, state.drafts] = await Promise.all([s.sources(), s.items(), s.links(), s.dismissed(), s.drafts()]);
    const demo = state.sources.some((x) => x.demonstration) || state.items.some((x) => x.demonstration);
    document.getElementById('demo-note').hidden = !demo;
    const el = document.getElementById('storage');
    el.textContent = s.durable ? 'This browser only · not a vault' : 'Not saved · memory only';
    el.title = s.durable ? 'Nothing is sent anywhere. Clearing this site’s data, a different address or port, or another browser means an empty Tangerine. Export a copy regularly.' : (s.problem || '');
    el.classList.toggle('warn', !s.durable);
    const last = await s.getMeta('lastExport');
    document.getElementById('last-copy').textContent = 'Last copy · ' + (last ? ago(last) : 'never');
    const n = state.drafts.length;
    document.getElementById('draft-count').textContent = n ? '· ' + n + ' draft' + (n > 1 ? 's' : '') : '';
  }

  /* ---------- routing ---------- */
  function route() {
    const [view, id] = (location.hash.slice(1) || 'whiteboard').split('/');
    flushDesk();
    state.view = ['whiteboard', 'archive', 'return', 'writing'].includes(view) ? view : 'whiteboard';
    if (state.view === 'archive' && id) state.archiveSel = decodeURIComponent(id);
    if (state.view === 'writing') openDesk(id ? decodeURIComponent(id) : null);
    document.querySelectorAll('.nav a').forEach((a) => { if (a.dataset.view === state.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = 'Tangerine — ' + { whiteboard: 'Whiteboard', archive: 'Archive', return: 'Return', writing: 'Writing' }[state.view];
    render();
  }

  function render() {
    if (state.view === 'archive') return renderArchive();
    if (state.view === 'return') return renderReturn();
    if (state.view === 'writing') return renderWriting();
    renderBoard();
  }

  /* ================= WHITEBOARD ================= */

  function cardHTML(it) {
    const hit = state.hits && state.hits.some((h) => h.id === it.id || (it.kind === 'source' && h.id === it.sourceId));
    const cls = ['card', it.kind, state.sel === it.id && 'sel', state.linkFrom === it.id && 'linking', hit && 'hit'].filter(Boolean).join(' ');
    const meta = `<div class="meta t-meta"><span>${catNo(it)} · ${KIND[it.kind]}</span>${it.now ? '<span class="now-tag">Now</span>' : it.demonstration ? '<span>Demo</span>' : ''}</div>`;
    let body = '';
    if (it.kind === 'project') {
      const b = lastMark(it);
      body = `<h3>${esc(it.title)}</h3>` + (b && b.next ? `<p class="sub"><b>Next —</b> ${esc(b.next)}</p>` : '');
    } else if (it.kind === 'person') {
      body = `<h3>${esc(it.title)}</h3>` + (it.role ? `<p class="sub">${esc(it.role)}</p>` : '');
    } else if (it.kind === 'idea') {
      body = `<h3>${esc(it.title)}</h3>`;
    } else {
      const s = srcById(it.sourceId);
      body = s ? `<h3>${esc(cur(s).title || 'Untitled')}</h3><p class="excerpt">${esc(cur(s).body)}</p>` : '<h3>Missing source</h3>';
      body += `<p class="sub t-meta">${s ? esc(s.kind) + ' · ' + fmtDate(s.madeOn) : ''}</p>`;
    }
    return `<div class="${cls}" data-id="${it.id}" style="left:${it.x}px;top:${it.y}px" tabindex="0" role="button" aria-pressed="${state.sel === it.id}" aria-label="${esc(KIND[it.kind] + ': ' + titleOf(it))}">${meta}${body}</div>`;
  }

  function linksSVG() {
    const parts = [];
    for (const l of state.links) {
      const a = document.querySelector(`.card[data-id="${l.a}"]`), b = document.querySelector(`.card[data-id="${l.b}"]`);
      if (!a || !b) continue;
      const ca = center(a), cb = center(b);
      const on = state.sel && (l.a === state.sel || l.b === state.sel);
      parts.push(`<line x1="${ca.x}" y1="${ca.y}" x2="${cb.x}" y2="${cb.y}" class="${on ? 'on' : ''}"/>`);
      if (l.note) {
        const mx = (ca.x + cb.x) / 2, my = (ca.y + cb.y) / 2, w = l.note.length * 6.4 + 10;
        parts.push(`<rect x="${mx - w / 2}" y="${my - 8}" width="${w}" height="14"/><text x="${mx}" y="${my + 2}" text-anchor="middle">${esc(l.note)}</text>`);
      }
    }
    return parts.join('');
  }
  const center = (el) => ({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 });
  function drawLinks() { const svg = document.querySelector('svg.links'); if (svg) svg.innerHTML = linksSVG(); }

  function renderBoard() {
    const wrap = document.querySelector('.board-wrap');
    const scroll = wrap ? [wrap.scrollLeft, wrap.scrollTop] : null;
    const maxY = Math.max(760, ...state.items.map((i) => i.y + 260));
    const maxX = Math.max(1240, ...state.items.map((i) => i.x + CARD_W + 120));
    main.innerHTML = `
      <div class="wb">
        <div class="board-wrap" aria-label="Whiteboard">
          <div class="board-hint t-meta">${state.linking ? (state.linkFrom ? 'Choose the second item' : 'Choose the first item to link') + ' · Esc to cancel' : 'Drag to arrange · Arrow keys move the selection'}</div>
          <div class="board" style="width:${maxX}px;height:${maxY}px">
            <svg class="links" aria-hidden="true"></svg>
            ${state.items.map(cardHTML).join('')}
          </div>
          <div class="tools" role="toolbar" aria-label="Add to the whiteboard">
            <button type="button" data-add="project"><span class="t-meta">+</span> Project</button>
            <button type="button" data-add="person"><span class="t-meta">+</span> Person</button>
            <button type="button" data-add="idea"><span class="t-meta">+</span> Idea</button>
            <button type="button" data-add="source"><span class="t-meta">+</span> Pin source</button>
            <button type="button" data-link aria-pressed="${state.linking}">Link</button>
          </div>
        </div>
        <aside class="insp" aria-live="polite">${inspectorHTML()}</aside>
      </div>`;
    if (scroll) { const w = document.querySelector('.board-wrap'); w.scrollLeft = scroll[0]; w.scrollTop = scroll[1]; }
    drawLinks();
  }

  /* ---------- inspector ---------- */
  function inspectorHTML() {
    if (state.composing) return composeHTML(state.composing);
    const it = state.sel && itemById(state.sel);
    if (!it) return overviewHTML();
    const head = `<div class="label t-meta"><span>${catNo(it)} · ${KIND[it.kind]}</span>${it.now ? '<span class="now-tag">Now</span>' : ''}</div>`;
    let html = '';
    if (it.kind === 'source') html = sourceInspector(it, head);
    else {
      html += `<section>${head}<h2 class="${it.kind === 'idea' ? 'serif' : ''}">${esc(it.title)}</h2>${it.role ? `<p style="margin-top:6px;color:var(--ink-2)">${esc(it.role)}</p>` : ''}
        ${it.demonstration ? '<p class="derived-note">Demonstration · fictional</p>' : ''}
        <div class="row">
          ${it.kind === 'project' && !it.now ? '<button class="btn" data-act="now">Make this now</button>' : ''}
          <button class="btn quiet" data-act="rename">Rename</button>
          <button class="btn quiet" data-act="remove">Remove from board</button>
        </div></section>`;
      if (it.kind === 'project') html += bookmarkHTML(it);
    }
    html += connectionsHTML(it);
    html += relatedHTML(it);
    return html;
  }

  function overviewHTML() {
    const now = state.items.find((i) => i.now);
    let html = '';
    if (now) {
      const b = lastMark(now);
      html += `<section class="cold-open"><div class="label t-meta"><span class="now-tag">Now</span><span>${catNo(now)}</span></div>
        <h2>${esc(now.title)}</h2>
        ${b ? `<div style="margin-top:14px">${coldFields(b)}</div><p class="t-meta" style="margin-top:8px">Bookmark left ${ago(b.at)}</p>` : '<p class="derived-note">No bookmark yet.</p>'}
        <div class="row"><button class="btn" data-open="${now.id}">Open</button></div></section>`;
    } else {
      html += `<section><div class="label t-meta"><span>Whiteboard</span></div><h2>Nothing is marked now.</h2><p class="derived-note">Select a project and choose “Make this now”.</p></section>`;
    }
    const counts = ['project', 'person', 'idea', 'source'].map((k) => state.items.filter((i) => i.kind === k).length);
    html += `<section><div class="label t-meta"><span>On the board</span></div>
      <div class="prov t-meta">${['Projects', 'People', 'Ideas', 'Sources'].map((l, i) => `<div><span>${l}</span><span>${counts[i]}</span></div>`).join('')}</div>
      <p class="derived-note" style="margin-top:14px">The board arranges and links. It never changes an original: pinned sources are references to the archive.</p></section>`;
    if (state.hits) html = searchHTML() + html;
    return html;
  }

  function coldFields(b) {
    return [['Where it stands', b.stands], ['Open question', b.question], ['Next move', b.next]]
      .map(([k, v]) => `<div class="field"><span class="t-meta">${k}</span><p>${v ? esc(v) : '<span style="color:var(--grey)">—</span>'}</p></div>`).join('');
  }

  function bookmarkHTML(it) {
    const b = lastMark(it);
    const hist = it.bookmarks.slice(0, -1).reverse();
    return `<section class="cold-open"><div class="label t-meta"><span>Bookmark${it.bookmarks.length ? ' ' + it.bookmarks.length + ' of ' + it.bookmarks.length : ''}</span><span>${b ? ago(b.at) : ''}</span></div>
      ${b ? coldFields(b) : '<p class="derived-note">Where did you stop? Leave a bookmark so you can return without reconstructing it.</p>'}
      <div class="row"><button class="btn" data-act="bookmark">Leave a new bookmark</button></div>
      ${hist.length ? `<details class="history"><summary class="t-meta">Earlier bookmarks · ${hist.length}</summary><ul class="list">${hist.map((h) => `<li><span class="t-meta">${fmtDate(h.at)}</span><br>${esc(h.next || h.stands)}</li>`).join('')}</ul></details>` : ''}
    </section>`;
  }

  function sourceInspector(it, head) {
    const s = srcById(it.sourceId);
    if (!s) return `<section>${head}<h2>Missing source</h2><p class="derived-note">The original was removed from the archive.</p><div class="row"><button class="btn quiet" data-act="remove">Remove from board</button></div></section>`;
    const r = cur(s);
    return `<section>${head}<h2 class="serif">${esc(r.title || 'Untitled')}</h2>
      <p class="original ${s.kind === 'collected' ? 'collected' : ''}" style="margin-top:14px">${esc(r.body)}</p>
      ${provHTML(s)}
      <div class="row"><a class="btn" href="#archive/${encodeURIComponent(s.id)}" style="text-decoration:none">Open in archive</a><button class="btn quiet" data-act="remove">Unpin</button></div>
    </section>`;
  }

  function provHTML(s) {
    const r0 = s.revisions[0];
    const v = state.verify[s.id];
    const fp = r0.sha256 ? r0.sha256.slice(0, 8) + '…' + r0.sha256.slice(-4) : 'none taken';
    const VERDICT = {
      intact: '<span class="ok">· verified</span>',
      changed: '· CHANGED',
      unavailable: '· cannot verify on this connection',
      unfingerprinted: '· not taken when kept · cannot verify',
    };
    const hint = v && v.status === 'unavailable' ? '<div><span></span><span>SHA-256 needs a secure address. Open Tangerine at http://127.0.0.1:4321 to verify.</span></div>'
      : v && v.status === 'unfingerprinted' ? '<div><span></span><span>Kept over a connection without SHA-256, so there is nothing to verify against.</span></div>' : '';
    return `<div class="prov t-meta">
      <div><span>Original</span><span>${s.kind === 'collected' ? 'Collected · kept exactly as found' : 'Unaltered by Tangerine'}</span></div>
      <div><span>Author</span><span>${esc(s.author || 'Unknown')}</span></div>
      <div><span>Made</span><span>${fmtDate(s.madeOn)}</span></div>
      <div><span>Source</span><span>${esc(s.provenance || 'Unknown')}</span></div>
      <div><span>Revisions</span><span>${s.revisions.length} · by the author only</span></div>
      <div><span>SHA-256</span><span>${fp} ${v ? VERDICT[v.status] : `<button class="link" data-verify="${s.id}">verify</button>`}</span></div>${hint}
    </div>`;
  }

  function connectionsHTML(it) {
    const ls = state.links.filter((l) => l.a === it.id || l.b === it.id);
    return `<section><div class="label t-meta"><span>Linked · ${ls.length}</span><button class="link" data-act="link-from">Link to…</button></div>
      ${ls.length ? `<ul class="list">${ls.map((l) => { const o = itemById(l.a === it.id ? l.b : l.a); return o ? `<li><button class="item" data-open="${o.id}"><span class="t-meta">${catNo(o)} · ${KIND[o.kind]}</span><h4>${esc(titleOf(o))}</h4></button>${l.note ? `<p class="why">${esc(l.note)}</p>` : ''}<div class="acts t-meta"><button class="link" data-unlink="${l.id}">Unlink</button></div></li>` : ''; }).join('')}</ul>` : '<p class="derived-note">Not linked to anything yet.</p>'}
    </section>`;
  }

  function relatedHTML(it) {
    const rel = Index.related(it, state.sources, state.items, { dismissed: state.dismissed });
    return `<section><div class="label t-meta"><span>Related in the archive</span><span>Derived</span></div>
      ${rel.length ? `<ul class="list">${rel.map((r) => { const s = srcById(r.sourceId); return `<li>
        <button class="item" data-archive="${s.id}"><span class="t-meta">${esc(s.kind)} · ${fmtDate(s.madeOn)}</span><h4>${esc(cur(s).title || 'Untitled')}</h4></button>
        <p class="why">${esc(r.reason)}</p>
        <div class="acts t-meta">${r.pinned ? '<span>On the board</span>' : `<button class="link" data-pin="${s.id}">Pin beside</button>`}<button class="link" data-dismiss="${esc(r.key)}">Not related</button></div></li>`; }).join('')}</ul>` : '<p class="derived-note">Nothing in the archive shares enough with this yet.</p>'}
      <p class="derived-note">Suggested by the local index from shared words. It reads originals and never writes to them. No AI model is connected in this study.</p>
    </section>`;
  }

  function searchHTML() {
    const hits = state.hits;
    return `<section><div class="label t-meta"><span>Search · “${esc(state.query)}”</span><span>${hits.length}</span></div>
      ${hits.length ? `<ul class="list">${hits.map((h) => {
        if (h.type === 'item') { const o = itemById(h.id); return `<li><button class="item" data-open="${o.id}"><span class="t-meta">${catNo(o)} · ${KIND[o.kind]}</span><h4>${esc(o.title)}</h4></button></li>`; }
        const s = srcById(h.id); return `<li><button class="item" data-archive="${s.id}"><span class="t-meta">Archive · ${esc(s.kind)}</span><h4>${esc(cur(s).title || 'Untitled')}</h4></button></li>`;
      }).join('')}</ul>` : '<p class="derived-note">Nothing found.</p>'}</section>`;
  }

  function composeHTML(c) {
    if (c.type === 'bookmark') {
      const it = itemById(c.id); const b = lastMark(it) || {};
      return `<section class="cold-open"><div class="label t-meta"><span>${catNo(it)} · New bookmark</span></div><h2>${esc(it.title)}</h2>
        <form class="form" data-form="bookmark" style="margin-top:16px">
          <label><span class="t-meta">Where it stands</span><textarea name="stands" rows="2">${esc(b.stands)}</textarea></label>
          <label><span class="t-meta">Open question</span><textarea name="question" rows="2">${esc(b.question)}</textarea></label>
          <label><span class="t-meta">Next move</span><textarea name="next" rows="2" required>${esc(b.next)}</textarea></label>
          <p class="derived-note">Earlier bookmarks are kept. This adds a new one.</p>
          <div class="row"><button class="btn" type="submit">Keep bookmark</button><button class="btn quiet" type="button" data-act="cancel">Cancel</button></div>
        </form></section>`;
    }
    if (c.type === 'rename') {
      const it = itemById(c.id);
      return `<section><div class="label t-meta"><span>${catNo(it)} · Rename</span></div>
        <form class="form" data-form="rename"><label><span class="t-meta">Title</span><input name="title" value="${esc(it.title)}" required></label>
        ${it.kind === 'person' ? `<label><span class="t-meta">Relation, in your words</span><input name="role" value="${esc(it.role)}"></label>` : ''}
        <div class="row"><button class="btn" type="submit">Save</button><button class="btn quiet" type="button" data-act="cancel">Cancel</button></div></form></section>`;
    }
    if (c.type === 'add') {
      const label = KIND[c.kind];
      return `<section><div class="label t-meta"><span>New ${label.toLowerCase()}</span></div>
        <form class="form" data-form="add">
          <label><span class="t-meta">${c.kind === 'person' ? 'Name' : 'Title'}</span><input name="title" required autofocus></label>
          ${c.kind === 'person' ? '<label><span class="t-meta">Relation, in your words</span><input name="role"></label>' : ''}
          ${c.kind === 'project' ? '<label><span class="t-meta">Next move</span><textarea name="next" rows="2"></textarea></label>' : ''}
          <div class="row"><button class="btn" type="submit">Place on board</button><button class="btn quiet" type="button" data-act="cancel">Cancel</button></div>
        </form></section>`;
    }
    if (c.type === 'pin') {
      const pinned = new Set(state.items.filter((i) => i.kind === 'source').map((i) => i.sourceId));
      const free = state.sources.filter((s) => !pinned.has(s.id));
      return `<section><div class="label t-meta"><span>Pin a source</span><button class="link" data-act="cancel">Cancel</button></div>
        <p class="derived-note" style="margin-bottom:10px">Pinning places a reference on the board. The original stays in the archive, unchanged.</p>
        ${free.length ? `<ul class="list">${free.map((s) => `<li><button class="item" data-pin="${s.id}"><span class="t-meta">${esc(s.kind)} · ${fmtDate(s.madeOn)}</span><h4>${esc(cur(s).title || 'Untitled')}</h4></button></li>`).join('')}</ul>` : '<p class="derived-note">Every source is already on the board.</p>'}
      </section>`;
    }
    if (c.type === 'linknote') {
      const a = itemById(c.a), b = itemById(c.b);
      return `<section><div class="label t-meta"><span>Link</span></div><h2 style="font-size:17px">${esc(titleOf(a))} <span class="t-meta">↔&#xFE0E;</span> ${esc(titleOf(b))}</h2>
        <form class="form" data-form="link" style="margin-top:14px"><label><span class="t-meta">Why, in a few words (optional)</span><input name="note" maxlength="40"></label>
        <div class="row"><button class="btn" type="submit">Link</button><button class="btn quiet" type="button" data-act="cancel">Cancel</button></div></form></section>`;
    }
    return '';
  }

  /* ---------- board interaction ---------- */
  function select(id) { state.sel = id; state.composing = null; renderBoard(); }

  let drag = null;
  main.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.card');
    if (!card || state.view !== 'whiteboard' || window.matchMedia('(max-width: 760px)').matches) return;
    if (state.linking) return;
    const it = itemById(card.dataset.id);
    drag = { id: it.id, card, sx: e.clientX, sy: e.clientY, x: it.x, y: it.y, moved: false };
    card.setPointerCapture(e.pointerId);
  });
  main.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true; drag.card.classList.add('dragging');
    drag.nx = snap(drag.x + dx); drag.ny = snap(drag.y + dy);
    drag.card.style.left = drag.nx + 'px'; drag.card.style.top = drag.ny + 'px';
    drawLinks();
  });
  main.addEventListener('pointerup', async () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.moved) { await state.store.updateItem(d.id, { x: d.nx, y: d.ny }); await load(); state.sel = d.id; renderBoard(); }
  });

  async function chooseForLink(id) {
    if (!state.linkFrom) { state.linkFrom = id; renderBoard(); return; }
    if (state.linkFrom === id) return;
    state.composing = { type: 'linknote', a: state.linkFrom, b: id };
    state.linking = false; state.linkFrom = null; state.sel = id; renderBoard();
    document.querySelector('[data-form="link"] input')?.focus();
  }

  main.addEventListener('click', async (e) => {
    const t = e.target;
    const card = t.closest('.card');
    if (card && state.view === 'whiteboard') {
      if (state.linking) return chooseForLink(card.dataset.id);
      return select(card.dataset.id);
    }
    const st = state.store;
    const btn = t.closest('button, a');
    if (!btn) {
      if (t.closest('.board') && state.view === 'whiteboard' && !state.linking) { state.sel = null; state.composing = null; renderBoard(); }
      return;
    }
    const d = btn.dataset;
    if (d.add) {
      if (d.add === 'source') state.composing = { type: 'pin' };
      else state.composing = { type: 'add', kind: d.add };
      state.linking = false; renderBoard(); document.querySelector('.insp input')?.focus(); return;
    }
    if ('link' in d) { state.linking = !state.linking; state.linkFrom = state.linking && state.sel ? state.sel : null; state.composing = null; renderBoard(); return; }
    if (d.open) { state.hits = null; state.query = ''; document.getElementById('q').value = ''; if (state.view !== 'whiteboard') location.hash = 'whiteboard'; select(d.open); scrollToCard(d.open); return; }
    if (d.archive) { location.hash = 'archive/' + encodeURIComponent(d.archive); return; }
    if (d.pin) { await pinSource(d.pin); return; }
    if (d.dismiss) { await st.dismiss(d.dismiss); await load(); toast('Hidden · the index will not suggest this again'); render(); return; }
    if (d.unlink) { await st.unlink(d.unlink); await load(); render(); return; }
    if (d.verify) { state.verify[d.verify] = await st.verifySource(d.verify); render(); return; }
    if (d.act) {
      const it = itemById(state.sel);
      if (d.act === 'cancel') { state.composing = null; render(); return; }
      if (d.act === 'now') { await st.setNow(it.id); await load(); renderBoard(); return; }
      if (d.act === 'bookmark') { state.composing = { type: 'bookmark', id: it.id }; renderBoard(); document.querySelector('.insp textarea')?.focus(); return; }
      if (d.act === 'rename') { state.composing = { type: 'rename', id: it.id }; renderBoard(); document.querySelector('.insp input')?.focus(); return; }
      if (d.act === 'link-from') { state.linking = true; state.linkFrom = it.id; renderBoard(); return; }
      if (d.act === 'remove') {
        const msg = it.kind === 'source' ? 'Unpin from the board? The original stays in the archive.' : 'Remove “' + it.title + '” from the board?';
        if (!confirm(msg)) return;
        await st.removeItem(it.id); state.sel = null; await load(); renderBoard(); return;
      }
      if (d.act === 'keep-new') { state.composing = { type: 'keep' }; renderArchive(); document.querySelector('.ar-detail input')?.focus(); return; }
      if (d.act === 'pin-here') { await pinSource(state.archiveSel, true); return; }
    }
  });

  async function pinSource(sourceId, fromArchive) {
    const existing = state.items.find((i) => i.kind === 'source' && i.sourceId === sourceId);
    if (existing) { if (fromArchive) location.hash = 'whiteboard'; select(existing.id); return; }
    const near = state.sel && itemById(state.sel);
    const pos = freeSpot(near ? near.x + CARD_W + 32 : 48, near ? near.y : 48);
    const it = await state.store.addItem({ kind: 'source', sourceId, x: pos.x, y: pos.y });
    if (near) await state.store.link(near.id, it.id, '');
    await load(); state.composing = null;
    if (fromArchive) location.hash = 'whiteboard';
    select(it.id); scrollToCard(it.id); toast('Pinned · the original is unchanged');
  }

  function freeSpot(x, y) {
    let p = { x: snap(x), y: snap(y) }, n = 0;
    const busy = (q) => state.items.some((i) => Math.abs(i.x - q.x) < CARD_W && Math.abs(i.y - q.y) < 120);
    while (busy(p) && n++ < 40) p = n % 2 ? { x: p.x, y: p.y + 136 } : { x: p.x + CARD_W + 24, y: snap(y) };
    return p;
  }
  function scrollToCard(id) {
    requestAnimationFrame(() => document.querySelector(`.card[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  }

  main.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, v = Object.fromEntries(new FormData(f)), st = state.store;
    const kind = f.dataset.form;
    if (kind === 'bookmark') { await st.addBookmark(state.composing.id, v); toast('Bookmark kept'); }
    if (kind === 'rename') await st.updateItem(state.composing.id, v);
    if (kind === 'add') {
      const near = state.sel && itemById(state.sel);
      const pos = freeSpot(near ? near.x : 48, near ? near.y + 160 : 48);
      const it = await st.addItem({ kind: state.composing.kind, title: v.title, role: v.role, x: pos.x, y: pos.y, bookmark: v.next ? { next: v.next } : null });
      state.sel = it.id;
    }
    if (kind === 'link') { await st.link(state.composing.a, state.composing.b, v.note); }
    if (kind === 'keep') {
      const s = await st.keepSource({ kind: v.kind, title: v.title, body: v.body, author: v.author || 'Me', madeOn: v.madeOn || new Date().toISOString().slice(0, 10), provenance: 'Written in Tangerine' });
      state.archiveSel = s.id;
    }
    if (kind === 'revise') { await st.reviseSource(state.archiveSel, { title: v.title, body: v.body }, USER_EDIT); toast('New revision kept · the earlier version remains'); }
    state.composing = null; await load(); render();
    if (kind === 'add') scrollToCard(state.sel);
  });

  document.addEventListener('keydown', async (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('q').focus(); return; }
    if (e.key === 'Escape' && state.view === 'writing') { if (typing) document.activeElement.blur(); return; }
    if (e.key === 'Escape') {
      if (typing) document.activeElement.blur();
      state.linking = false; state.linkFrom = null; state.composing = null;
      if (state.hits) { state.hits = null; state.query = ''; document.getElementById('q').value = ''; }
      render(); return;
    }
    if (typing || state.view !== 'whiteboard') return;
    const card = document.activeElement.closest && document.activeElement.closest('.card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (state.linking) chooseForLink(card.dataset.id); else { select(card.dataset.id); document.querySelector(`.card[data-id="${card.dataset.id}"]`).focus(); } return; }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key] && state.sel) {
      e.preventDefault();
      const it = itemById(state.sel), step = e.shiftKey ? 48 : GRID;
      await state.store.updateItem(it.id, { x: Math.max(0, it.x + arrows[e.key][0] * step), y: Math.max(0, it.y + arrows[e.key][1] * step) });
      await load(); renderBoard(); document.querySelector(`.card[data-id="${it.id}"]`)?.focus();
    }
  });

  document.getElementById('q').addEventListener('input', (e) => {
    state.query = e.target.value.trim();
    state.hits = state.query ? Index.search(state.query, state.sources, state.items) : null;
    if (state.view !== 'whiteboard') { location.hash = 'whiteboard'; return; }
    state.sel = null; state.composing = null; renderBoard();
  });

  /* ================= ARCHIVE ================= */

  function plateHTML(s) {
    const p = s.plate; if (!p) return '';
    return `<div class="plate" style="aspect-ratio:${p.w}/${p.h}"><span class="t-meta">Plate · ${p.w} × ${p.h} · ${s.demonstration ? 'Demonstration · no image embedded' : esc(p.file || '')}</span></div>`;
  }

  function renderArchive() {
    const list = state.sources;
    if (!state.archiveSel || !srcById(state.archiveSel)) state.archiveSel = list[0] && list[0].id;
    const s = srcById(state.archiveSel);
    let detail;
    if (state.composing && state.composing.type === 'keep') {
      detail = `<article><span class="t-meta">Keep something new</span><h1>An original, in your words.</h1>
        <form class="form" data-form="keep">
          <label><span class="t-meta">Kind</span><select name="kind"><option value="writing">Writing</option><option value="note">Note</option></select></label>
          <label><span class="t-meta">Title</span><input name="title" required></label>
          <label><span class="t-meta">Text</span><textarea name="body" rows="8" required></textarea></label>
          <label><span class="t-meta">Date made</span><input name="madeOn" type="date"></label>
          <p class="derived-note">Once kept, it is fingerprinted. Tangerine may index it and suggest connections; only you can revise it, and every earlier version is kept.</p>
          <div class="row"><button class="btn" type="submit">Keep</button><button class="btn quiet" type="button" data-act="cancel">Cancel</button></div>
        </form></article>`;
    } else if (state.composing && state.composing.type === 'revise' && s) {
      const r = cur(s);
      detail = `<article><span class="t-meta">Revise · revision ${r.n + 1}</span><h1>${esc(r.title)}</h1>
        <form class="form" data-form="revise"><label><span class="t-meta">Title</span><input name="title" value="${esc(r.title)}"></label>
        <label><span class="t-meta">Text</span><textarea name="body" rows="10">${esc(r.body)}</textarea></label>
        <p class="derived-note">This adds revision ${r.n + 1}. The original (revision 1) and its fingerprint remain.</p>
        <div class="row"><button class="btn" type="submit">Keep revision</button><button class="btn quiet" type="button" data-act="cancel">Cancel</button></div></form></article>`;
    } else if (s) {
      const r = cur(s);
      const onBoard = state.items.find((i) => i.kind === 'source' && i.sourceId === s.id);
      detail = `<article><span class="t-meta">${esc(s.kind)} · ${fmtDate(s.madeOn)}${s.demonstration ? ' · Demonstration' : ''}</span>
        <h1>${esc(r.title || 'Untitled')}</h1>${plateHTML(s)}
        <p class="original ${s.kind === 'collected' ? 'collected' : ''}">${esc(r.body)}</p>
        ${provHTML(s)}
        <div class="row">
          <button class="btn" data-act="pin-here">${onBoard ? 'Show on whiteboard' : 'Pin to whiteboard'}</button>
          ${s.kind === 'writing' || s.kind === 'note' ? `<a class="btn quiet" href="#writing/${encodeURIComponent('src:' + s.id)}" style="text-decoration:none">Open at the desk</a>` : ''}
          ${s.kind !== 'collected' ? '<button class="btn quiet" data-act="revise">Revise</button>' : ''}
        </div>
        ${s.revisions.length > 1 ? `<div class="revs"><div class="label t-meta"><span>Revisions</span></div><ul class="list">${s.revisions.slice().reverse().map((x) => `<li><span class="t-meta">Revision ${x.n} · ${fmtDate(x.at)} · ${x.sha256 ? x.sha256.slice(0, 8) : ''}${x.n === 1 ? ' · original' : ''}</span><p class="original" style="font-size:15px;margin-top:4px;color:var(--ink-2)">${esc(x.body)}</p></li>`).join('')}</ul></div>` : ''}
      </article>`;
    } else detail = '<p class="empty">The archive is empty.</p>';

    main.innerHTML = `<div class="ar">
      <div class="ar-list"><div class="head"><span class="t-meta">Archive · ${list.length} originals</span><button class="link t-meta" data-act="keep-new">Keep new</button></div>
        <ol>${list.map((x) => `<li><button aria-current="${x.id === state.archiveSel}" data-sel="${x.id}"><span class="t-meta">${fmtDate(x.madeOn).slice(3)}</span><h4>${esc(cur(x).title || 'Untitled')}</h4><span class="k t-meta">${esc(x.kind)}${x.revisions.length > 1 ? ' · ' + x.revisions.length + ' revisions' : ''}${x.demonstration ? ' · demo' : ''}</span></button></li>`).join('')}</ol>
      </div>
      <div class="ar-detail">${detail}</div></div>`;
  }
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sel]');
    if (b && state.view === 'archive') { state.composing = null; history.replaceState(null, '', '#archive/' + encodeURIComponent(b.dataset.sel)); state.archiveSel = b.dataset.sel; renderArchive(); }
    const r = e.target.closest('[data-act="revise"]');
    if (r) { state.composing = { type: 'revise' }; renderArchive(); }
  });

  /* ================= WRITING ================= */
  /*
   * The desk edits a working copy (a draft), never the original. Every
   * keystroke is mirrored synchronously to localStorage and, a moment later,
   * saved as a draft in IndexedDB. Keeping turns the draft into an original
   * (revision 1) or appends a new revision; earlier revisions remain.
   */
  const WRITABLE = (s) => s.kind === 'writing' || s.kind === 'note';
  const newKey = () => 'new:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const words = (t) => (String(t).trim().match(/\S+/g) || []).length;
  const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const draftByKey = (k) => state.drafts.find((d) => d.key === k);

  function deskPieces() {
    const loose = state.drafts.filter((d) => !d.key.startsWith('src:'));
    const kept = state.sources.filter(WRITABLE);
    return { loose, kept };
  }

  function openDesk(key) {
    if (state.desk && state.desk.key === key) return;
    if (!key) {
      const { loose, kept } = deskPieces();
      const recent = state.drafts[0];
      key = recent ? recent.key : kept[0] ? 'src:' + kept[0].id : (loose[0] ? loose[0].key : newKey());
    }
    const d = draftByKey(key);
    const sourceId = d ? d.sourceId : key.startsWith('src:') ? key.slice(4) : null;
    const src = sourceId && srcById(sourceId);
    const r = src && cur(src);
    state.desk = {
      key, sourceId, kind: d ? d.kind : src ? src.kind : 'writing',
      baseN: d ? d.baseN : r ? r.n : null,
      title: d ? d.title : r ? r.title : '', body: d ? d.body : r ? r.body : '',
      savedAt: d ? d.savedAt : null, recovered: d || null, pending: null, saving: Promise.resolve(),
    };
  }

  function keptRev() { const s = state.desk && state.desk.sourceId && srcById(state.desk.sourceId); return s ? cur(s) : null; }
  function deskChanged() {
    const k = state.desk, r = keptRev();
    return r ? k.title !== r.title || k.body !== r.body : Boolean(k.title.trim() || k.body.trim());
  }

  function deskStatusHTML() {
    const k = state.desk, r = keptRev(), changed = deskChanged();
    const left = r ? `${esc(k.kind)} · revision ${r.n} kept ${fmtDate(r.at)}` : `${esc(k.kind)} · not yet kept`;
    const right = !changed ? (r ? 'Matches the kept version' : 'Empty') : k.savedAt ? 'Draft saved ' + clock(k.savedAt) + ' · not yet kept' : 'Draft · saving…';
    return `<span>${left}</span><span id="desk-save">${right}</span>`;
  }

  function renderWriting() {
    const k = state.desk, r = keptRev();
    const src = k.sourceId && srcById(k.sourceId);
    const { loose, kept } = deskPieces();
    const item = (key, title, meta, draft) => `<li><button aria-current="${key === k.key}" data-desk="${esc(key)}"><span class="t-meta">${meta}</span><h4>${esc(title || 'Untitled')}</h4><span class="k t-meta">${draft ? '<span class="draft-tag">Draft · not yet kept</span>' : ''}</span></button></li>`;
    const notices = [];
    if (!state.store.durable) notices.push(`<p class="notice warn"><b>Not saved.</b> Browser storage is unavailable here, so nothing on this desk survives a reload. ${esc(state.store.problem || '')}</p>`);
    if (k.recovered && deskChanged()) notices.push(`<p class="notice">Recovered an unfinished draft from ${fmtDate(k.recovered.savedAt)}, ${clock(k.recovered.savedAt)}. It is not yet kept.${k.recovered.restoredFrom ? ' It came from a restored copy and differed from the draft already here.' : ''}</p>`);
    if (r && k.baseN && r.n > k.baseN) notices.push(`<p class="notice">The kept version moved on to revision ${r.n} after this draft began from revision ${k.baseN}. Keeping adds revision ${r.n + 1}; nothing is replaced.</p>`);
    if (src && src.demonstration) notices.push('<p class="notice">Demonstration · fictional.</p>');
    main.innerHTML = `<div class="wd">
      <div class="ar-list wd-list"><div class="head"><span class="t-meta">Writing · ${kept.length + loose.length}</span><button class="link t-meta" data-act="desk-new">New piece</button></div>
        <ol>${loose.map((d) => item(d.key, d.title, fmtDate(d.savedAt).slice(3), true)).join('')}
        ${kept.map((x) => item('src:' + x.id, cur(x).title, fmtDate(x.madeOn).slice(3), Boolean(draftByKey('src:' + x.id)))).join('')}</ol>
      </div>
      <div class="wd-desk"><div class="page">
        <div class="wd-status t-meta" role="status">${deskStatusHTML()}</div>
        ${notices.join('')}
        <label class="visually-hidden" for="desk-title">Title</label>
        <input id="desk-title" class="wd-title" value="${esc(k.title)}" placeholder="Title" autocomplete="off">
        <label class="visually-hidden" for="desk-body">Text</label>
        <textarea id="desk-body" class="wd-body" placeholder="Begin." spellcheck="true">${esc(k.body)}</textarea>
        <div class="wd-foot">
          <span class="t-meta" id="desk-words">${words(k.body)} words</span>
          <div class="row" style="margin-top:0">
            <button class="btn" data-act="desk-keep">${r ? 'Keep revision ' + (r.n + 1) : 'Keep'}</button>
            ${draftByKey(k.key) || (k.recovered && deskChanged()) ? '<button class="btn quiet" data-act="desk-discard">Discard draft</button>' : ''}
            ${src ? `<a class="btn quiet" href="#archive/${encodeURIComponent(src.id)}" style="text-decoration:none">Open in archive</a>` : ''}
          </div>
        </div>
        <p class="derived-note">Drafts save in this browser as you type and come back after a reload. Keeping makes an original, or adds a revision beside the earlier ones. This browser is not a vault: <button class="link" data-act="export">export a copy</button> to keep one outside it.${state.persisted === true ? ' The browser has granted persistent storage.' : state.persisted === false ? ' The browser has not granted persistent storage, so it may clear this site’s data under pressure.' : ''}</p>
      </div></div></div>`;
    grow();
  }

  function grow() {
    const t = document.getElementById('desk-body'); if (!t) return;
    t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px';
  }

  function updateDeskChrome() {
    const st = document.querySelector('.wd-status'); if (st) st.innerHTML = deskStatusHTML();
    const w = document.getElementById('desk-words'); if (w) w.textContent = words(state.desk.body) + ' words';
  }

  main.addEventListener('input', (e) => {
    if (state.view !== 'writing' || !state.desk) return;
    if (e.target.id !== 'desk-title' && e.target.id !== 'desk-body') return;
    const k = state.desk;
    k.title = document.getElementById('desk-title').value;
    k.body = document.getElementById('desk-body').value;
    if (e.target.id === 'desk-body') grow();
    // Synchronous safety copy: survives a crash between keystroke and save.
    lsSet(MIRROR, { key: k.key, sourceId: k.sourceId, kind: k.kind, baseN: k.baseN, title: k.title, body: k.body, at: new Date().toISOString() });
    k.savedAt = null; updateDeskChrome();
    clearTimeout(k.pending); k.pending = setTimeout(flushDesk, 600);
  });
  main.addEventListener('focusout', (e) => { if (e.target.id === 'desk-body' || e.target.id === 'desk-title') flushDesk(); });

  /* Save the desk's working copy now. Safe to call at any time. */
  function flushDesk() {
    const k = state.desk; if (!k || !state.store) return Promise.resolve();
    clearTimeout(k.pending); k.pending = null;
    const snap = { key: k.key, sourceId: k.sourceId, kind: k.kind, baseN: k.baseN, title: k.title, body: k.body };
    const changed = deskChanged();
    k.saving = k.saving.then(async () => {
      if (changed) {
        const d = await state.store.saveDraft(snap);
        // Only report "saved" if nothing was typed while this save was under way.
        if (state.desk === k && k.title === snap.title && k.body === snap.body) { k.savedAt = d.savedAt; updateDeskChrome(); }
      } else {
        await state.store.discardDraft(snap.key);
      }
      state.drafts = await state.store.drafts();
      const n = state.drafts.length;
      document.getElementById('draft-count').textContent = n ? '· ' + n + ' draft' + (n > 1 ? 's' : '') : '';
      const m = lsGet(MIRROR); if (m && m.key === snap.key && m.body === snap.body && m.title === snap.title) lsSet(MIRROR, null);
    }).catch((err) => toast('Draft not saved · ' + err.message));
    return k.saving;
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushDesk(); });
  window.addEventListener('pagehide', () => flushDesk());

  /*
   * After a crash or reload. The safety copy is written on every keystroke and
   * cleared once a saved draft matches it, so if it is still here and differs,
   * it holds the latest words.
   */
  async function recoverMirror() {
    const m = lsGet(MIRROR); if (!m || !m.key) return;
    const d = await state.store.getDraft(m.key);
    if (!d || m.body !== d.body || m.title !== d.title) {
      const src = m.sourceId && (await state.store.getSource(m.sourceId));
      const r = src && src.revisions[src.revisions.length - 1];
      if (!r || r.title !== m.title || r.body !== m.body) await state.store.saveDraft(m);
    }
    lsSet(MIRROR, null);
  }

  async function keepDesk() {
    await flushDesk();
    const k = state.desk, st = state.store, r = keptRev();
    if (!k.body.trim()) { toast('Nothing to keep yet'); return; }
    if (r && !deskChanged()) { toast('Already kept · no changes'); return; }
    let msg;
    if (r) {
      const s = await st.reviseSource(k.sourceId, { title: k.title || 'Untitled', body: k.body }, USER_EDIT);
      msg = 'Revision ' + s.revisions.length + ' kept · earlier versions remain';
    } else if (k.sourceId) {
      toast('The original for this draft is no longer in the archive · kept as a new piece');
      const s = await st.keepSource({ kind: k.kind, title: k.title || 'Untitled', body: k.body, author: 'Me', madeOn: new Date().toISOString().slice(0, 10), provenance: 'Written in Tangerine' });
      k.sourceId = s.id; msg = 'Kept as a new original';
    } else {
      const s = await st.keepSource({ kind: k.kind, title: k.title || 'Untitled', body: k.body, author: 'Me', madeOn: new Date().toISOString().slice(0, 10), provenance: 'Written in Tangerine' });
      k.sourceId = s.id; msg = s.revisions[0].sha256 ? 'Kept · fingerprinted' : 'Kept · no fingerprint on this connection';
    }
    await st.discardDraft(k.key); lsSet(MIRROR, null);
    await load();
    const key = 'src:' + k.sourceId;
    state.desk = null; history.replaceState(null, '', '#writing/' + encodeURIComponent(key)); openDesk(key);
    renderWriting(); toast(msg);
  }

  async function discardDesk() {
    if (!confirm('Discard this draft? The kept version, if there is one, is not affected.')) return;
    const k = state.desk; clearTimeout(k.pending); await k.saving;
    await state.store.discardDraft(k.key); lsSet(MIRROR, null);
    await load(); state.desk = null; openDesk(k.sourceId ? 'src:' + k.sourceId : null);
    history.replaceState(null, '', '#writing/' + encodeURIComponent(state.desk.key));
    renderWriting(); toast('Draft discarded');
  }

  /* Change pieces at once, so nothing typed in between lands in the wrong one. */
  function switchDesk(key) {
    flushDesk();
    state.desk = null; openDesk(key);
    history.pushState(null, '', '#writing/' + encodeURIComponent(key));
    renderWriting();
  }

  main.addEventListener('click', async (e) => {
    if (state.view !== 'writing') return;
    const b = e.target.closest('[data-desk], [data-act]'); if (!b) return;
    if (b.dataset.desk) { switchDesk(b.dataset.desk); return; }
    const a = b.dataset.act;
    if (a === 'desk-new') { switchDesk(newKey()); document.getElementById('desk-title').focus(); }
    if (a === 'desk-keep') await keepDesk();
    if (a === 'desk-discard') await discardDesk();
    if (a === 'export') exportCopy();
  });

  /* ================= BACKUP & RESTORE ================= */

  async function exportCopy() {
    await flushDesk();
    const data = await state.store.exportAll();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'tangerine-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    await state.store.setMeta('lastExport', new Date().toISOString());
    await load(); toast('Copy exported · keep it somewhere outside this browser');
  }

  function dialog(html) {
    let d = document.getElementById('dlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'dlg'; d.className = 'dlg'; document.body.append(d); }
    d.innerHTML = html; if (!d.open) d.showModal();
    return d;
  }

  async function restoreFile(file) {
    let data;
    const head = `<div class="label t-meta"><span>Restore from a copy</span></div><h2>${esc(file.name)}</h2>`;
    try { data = JSON.parse(await file.text()); }
    catch (e) { dialog(`${head}<p class="notice warn">This file is not valid JSON. Nothing was changed.</p><div class="row"><button class="btn" data-dlg="close">Close</button></div>`); return; }
    await flushDesk();
    const plan = await state.store.restore(data, { dryRun: true });
    if (!plan.ok) {
      dialog(`${head}<p class="notice warn">This copy did not pass validation, so nothing was restored and nothing was changed.</p>
        <ul class="list errs">${plan.errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="row"><button class="btn" data-dlg="close">Close</button></div>`);
      return;
    }
    const c = plan.counts, row = (k, v) => `<div><span>${k}</span><span>${v}</span></div>`;
    const nothing = !(plan.added + plan.extended + plan.separate + plan.items + plan.links + plan.drafts + plan.draftsSeparate);
    const d = dialog(`${head}<p class="t-meta" style="margin-top:6px">Exported ${plan.exportedAt ? fmtDate(plan.exportedAt) + ', ' + clock(plan.exportedAt) : '· date unknown'} · ${c.sources} original${c.sources === 1 ? '' : 's'} · ${c.drafts} draft${c.drafts === 1 ? '' : 's'} · ${c.items} board item${c.items === 1 ? '' : 's'}</p>
      <div class="prov t-meta">
        ${row('New originals', plan.added)}
        ${row('Later revisions', plan.extended ? plan.extended + ' · appended to what is kept' : 0)}
        ${row('Kept beside', plan.separate ? plan.separate + ' · differ from what is kept here, added as separate copies' : 0)}
        ${row('Already here', plan.same)}
        ${row('Drafts', plan.drafts + (plan.draftsSeparate ? ' · and ' + plan.draftsSeparate + ' differing, added beside yours' : ''))}
        ${row('Board', plan.items + ' items · ' + plan.links + ' links')}
      </div>
      ${plan.notes.map((n) => `<p class="derived-note">${esc(n)}</p>`).join('')}
      <p class="derived-note">Nothing already kept in this browser will be replaced or removed.</p>
      <div class="row">${nothing ? '<button class="btn" data-dlg="close">Everything here already · close</button>' : '<button class="btn" data-dlg="apply">Restore</button><button class="btn quiet" data-dlg="close">Cancel</button>'}</div>`);
    d.onclick = async (e) => {
      const b = e.target.closest('[data-dlg]'); if (!b) return;
      if (b.dataset.dlg === 'apply') {
        b.disabled = true;
        const r = await state.store.restore(data);
        d.close();
        if (!r.ok) { toast('Restore stopped · nothing was changed'); return; }
        await load(); state.desk = null; route();
        toast('Restored · ' + (r.added + r.extended + r.separate) + ' originals, ' + (r.drafts + r.draftsSeparate) + ' drafts · nothing replaced');
      } else d.close();
    };
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('#dlg [data-dlg="close"]'); if (b) b.closest('dialog').close(); });

  /* ================= RETURN ================= */

  function renderReturn() {
    const today = new Date();
    const day = Index.onThisDay(state.sources, today);
    const rest = Index.longestResting(state.items);
    const now = state.items.find((i) => i.now);
    let conn = null;
    for (const it of state.items.filter((i) => i.kind !== 'source')) {
      const r = Index.related(it, state.sources, state.items, { dismissed: state.dismissed, limit: 1 }).find((x) => !x.pinned);
      if (r && (!conn || r.score > conn.r.score)) conn = { it, r };
    }
    main.innerHTML = `<div class="rt">
      <header><div><span class="t-meta">03 · Return</span><h1 class="t-display">${today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h1></div>
        <p>What you kept, coming back to you. Everything below is an original or a reference to one; the reasons are shown.</p></header>
      <section><div class="label t-meta"><span><span class="index-dot">●&#xFE0E;</span> On this day</span></div>
        ${day.length ? day.map((s) => `<button class="item link" data-archive="${s.id}" style="text-decoration:none;text-align:left"><span class="t-meta">${fmtDate(s.madeOn)} · ${today.getFullYear() - +s.madeOn.slice(0, 4)} years ago</span></button><blockquote>${esc(s.revisions[0].body)}</blockquote><p class="t-meta" style="margin-top:10px">${esc(s.revisions[0].title)} · ${esc(s.author || '')} · as first kept${s.revisions.length > 1 ? ' · revised ' + (s.revisions.length - 1) + '× since' : ''}</p>`).join('') : '<p class="derived-note">Nothing was kept on this date in an earlier year.</p>'}
      </section>
      <section><div class="label t-meta"><span>Resting longest</span>${rest ? `<span>${ago(lastMark(rest).at)}</span>` : ''}</div>
        ${rest ? `<h2 style="margin:0 0 12px;font:500 20px/1.25 var(--sans)">${esc(rest.title)}</h2><div class="cold-open">${coldFields(lastMark(rest))}</div><div class="row"><button class="btn" data-open="${rest.id}">Return to it</button></div>` : '<p class="derived-note">No bookmarks yet.</p>'}
      </section>
      <section class="wide"><div class="label t-meta"><span>A connection you may not have made</span><span>Derived</span></div>
        ${conn ? `<p style="font:400 18px/1.5 var(--serif)">“${esc(cur(srcById(conn.r.sourceId)).title)}” may belong with <strong style="font-weight:500">${esc(titleOf(conn.it))}</strong>.</p>
          <p class="why derived-note">${esc(conn.r.reason)} Suggested by the local index; the original is unchanged.</p>
          <div class="row"><button class="btn" data-open="${conn.it.id}">See it on the whiteboard</button><button class="btn quiet" data-dismiss="${esc(conn.r.key)}">Not related</button></div>` : '<p class="derived-note">Nothing new to suggest.</p>'}
      </section>
      ${now ? `<section class="wide"><p class="t-meta">Now · <button class="link" data-open="${now.id}">${esc(now.title)}</button></p></section>` : ''}
    </div>`;
  }

  /* ================= boot ================= */

  document.getElementById('export').addEventListener('click', exportCopy);
  const fileIn = document.getElementById('restore-file');
  document.getElementById('restore').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => { const f = fileIn.files[0]; fileIn.value = ''; if (f) restoreFile(f); });
  document.getElementById('remove-demo').addEventListener('click', async () => {
    if (!confirm('Remove all demonstration material? Anything you kept yourself stays.')) return;
    await state.store.removeDemonstration(); await state.store.setMeta('demonstration', 'removed');
    state.sel = null; await load(); render();
  });

  (async function boot() {
    state.store = await openStore();
    if ((await state.store.getMeta('demonstration')) === undefined) await window.TangerineDemo.install(state.store);
    await recoverMirror();
    await load();
    if (state.drafts.length) toast(state.drafts.length + ' unfinished draft' + (state.drafts.length > 1 ? 's' : '') + ' recovered · see Writing');
    if (navigator.storage && navigator.storage.persist) {
      try { state.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch (e) { state.persisted = null; }
    }
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', () => state.view === 'whiteboard' && drawLinks());
    route();
  })();
})();
