/*
 * TABLET by Tangerine — prototype 001 (on foundation 001–002).
 *
 * Capture: bring in ChatGPT conversation material by paste or from ChatGPT's
 * own data export. Kept exactly as captured. Synthesis proposes projects,
 * people, ideas, decisions, next actions and open questions, each with the
 * words it came from; the person accepts, edits or dismisses them, and only
 * accepted objects are placed on TABLET (orbiting what they relate to).
 *
 * Canvas: the author's spatial surface for projects, people and ideas,
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
  const Capture = window.TangerineCapture;
  const Synth = window.TangerineSynthesis;
  const main = document.getElementById('main');
  const GRID = 8;
  const CARD_W = 208;

  const state = {
    store: null, sources: [], items: [], links: [], dismissed: new Set(),
    view: 'whiteboard', sel: null, archiveSel: null, linkFrom: null, linking: false,
    composing: null, query: '', hits: null, verify: {},
    drafts: [], desk: null, persisted: null,
    proposals: [], capture: { sel: null, turn: null, draft: null, exportList: null, preview: null, editing: null },
    zoom: 1, arrivals: new Map(),
  };
  const MIRROR = 'tangerine.desk.mirror';
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: the IndexedDB draft still saves */ } };

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(3, '0');
  const PREFIX = { project: 'P', person: 'R', idea: 'I', source: 'S', decision: 'D', action: 'A', question: 'Q' };
  const KIND = { project: 'Project', person: 'Person', idea: 'Idea', source: 'Source', decision: 'Decision', action: 'Next action', question: 'Open question' };
  const KINDS_PLURAL = { project: 'Projects', person: 'People', decision: 'Decisions', action: 'Next actions', question: 'Open questions', idea: 'Ideas' };
  const BASIS = { you: 'You said', chatgpt: 'ChatGPT suggested', note: 'From a note', unverified: 'Quote not found in capture' };
  const SPEAKER = { user: 'You', assistant: 'ChatGPT', note: 'Note' };
  const FIXED = (s) => s.kind === 'collected' || s.kind === 'conversation';
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
    [state.sources, state.items, state.links, state.dismissed, state.drafts, state.proposals] = await Promise.all([s.sources(), s.items(), s.links(), s.dismissed(), s.drafts(), s.proposals()]);
    const pend = state.proposals.filter((p) => p.state === 'pending' && srcById(p.sourceId)).length;
    const pc = document.getElementById('pending-count');
    pc.textContent = pend ? '· ' + pend : ''; pc.title = pend ? pend + ' proposals to review' : '';
    pc.setAttribute('aria-label', pend ? pend + ' proposals to review' : '');
    const demo = state.sources.some((x) => x.demonstration) || state.items.some((x) => x.demonstration);
    document.getElementById('demo-note').hidden = !demo;
    const el = document.getElementById('storage');
    el.textContent = s.live ? 'Live · kept by the Tangerine bridge on this machine' : s.durable ? 'This browser only · not a vault' : 'Not saved · memory only';
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
    const parts = location.hash.slice(1).split('/');
    state.view = ['whiteboard', 'archive', 'return', 'writing', 'capture'].includes(view) ? view : 'whiteboard';
    if (state.view === 'archive' && id) state.archiveSel = decodeURIComponent(id);
    if (state.view === 'capture') { state.capture.sel = id ? decodeURIComponent(id) : null; state.capture.turn = parts[2] !== undefined ? +parts[2] : null; }
    if (state.view === 'writing') openDesk(id ? decodeURIComponent(id) : null);
    document.querySelectorAll('.nav a').forEach((a) => { if (a.dataset.view === state.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = 'TABLET — ' + { whiteboard: 'Canvas', archive: 'Archive', return: 'Return', writing: 'Writing', capture: 'Capture' }[state.view];
    render();
  }

  function render() {
    if (state.view === 'archive') return renderArchive();
    if (state.view === 'return') return renderReturn();
    if (state.view === 'writing') return renderWriting();
    if (state.view === 'capture') return renderCapture();
    renderBoard();
  }

  /* ================= WHITEBOARD ================= */

  function cardHTML(it) {
    const hit = state.hits && state.hits.some((h) => h.id === it.id || (it.kind === 'source' && h.id === it.sourceId));
    const near = state.sel && state.sel !== it.id && state.links.some((l) => (l.a === state.sel && l.b === it.id) || (l.b === state.sel && l.a === it.id));
    const cls = ['card', it.kind, state.sel === it.id && 'sel', near && 'near', state.linkFrom === it.id && 'linking', hit && 'hit',
      it.origin === 'conversation' && 'conv', it.status === 'done' && 'done'].filter(Boolean).join(' ');
    const orb = it.origin === 'conversation' || (it.evidence && it.evidence.length) ? `<span class="orb" title="${it.origin === 'conversation' ? 'From a conversation' : 'Mentioned in a conversation'}"></span>` : '';
    const meta = `<div class="meta t-meta"><span>${catNo(it)} · ${KIND[it.kind]}</span><span class="mr">${orb}${it.now ? '<span class="now-tag">Now</span>' : it.demonstration ? '<span>Demo</span>' : ''}</span></div>`;
    const said = it.origin === 'conversation' && it.basis && it.basis !== 'you' ? `<p class="said t-meta">${esc(BASIS[it.basis] || '')}</p>` : '';
    let body = '';
    if (it.kind === 'project') {
      const b = lastMark(it);
      body = `<h3>${esc(it.title)}</h3>` + (b && b.next ? `<p class="sub"><b>Next —</b> ${esc(b.next)}</p>` : '');
    } else if (it.kind === 'person') {
      body = `<h3>${esc(it.title)}</h3>` + (it.role ? `<p class="sub">${esc(it.role)}</p>` : '');
    } else if (it.kind === 'idea' || it.kind === 'decision' || it.kind === 'question') {
      body = `<h3>${esc(it.title)}</h3>` + said;
    } else if (it.kind === 'action') {
      body = `<h3><span class="tick" aria-hidden="true"></span>${esc(it.title)}</h3>` + (it.when ? `<p class="sub t-meta">“${esc(it.when)}”</p>` : '') + said;
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
      parts.push(`<line x1="${ca.x}" y1="${ca.y}" x2="${cb.x}" y2="${cb.y}" class="${[on && 'on', l.origin === 'inferred' && 'inferred'].filter(Boolean).join(' ')}"/>`);
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
    // New objects from a capture: show the whole board once, so they can be seen arriving.
    if (state.arrivals.size && !state.zoomSet) state.zoom = fitZoom();
    const wrap = document.querySelector('.board-wrap');
    const scroll = wrap ? [wrap.scrollLeft, wrap.scrollTop] : null;
    const maxY = Math.max(760, ...state.items.map((i) => i.y + 260));
    const maxX = Math.max(1240, ...state.items.map((i) => i.x + CARD_W + 120));
    const z = state.zoom;
    main.innerHTML = `
      <div class="wb">
        <div class="board-pane"><div class="board-wrap" aria-label="TABLET canvas">
          <div class="board-hint t-meta">${state.linking ? (state.linkFrom ? 'Choose the second item' : 'Choose the first item to link') + ' · Esc to cancel' : 'Drag to arrange · Arrow keys move the selection'}</div>
          <div class="board-size" style="width:${Math.ceil(maxX * z)}px;height:${Math.ceil(maxY * z)}px">
          <div class="board" style="width:${maxX}px;height:${maxY}px;${z !== 1 ? `transform:scale(${z})` : ''}">
            <svg class="links" aria-hidden="true"></svg>
            ${state.items.map(cardHTML).join('')}
          </div></div></div>
          <div class="tools" role="toolbar" aria-label="Add to TABLET">
            <button type="button" data-add="project"><span class="t-meta">+</span> Project</button>
            <button type="button" data-add="person"><span class="t-meta">+</span> Person</button>
            <button type="button" data-add="idea"><span class="t-meta">+</span> Idea</button>
            <button type="button" data-add="action"><span class="t-meta">+</span> Action</button>
            <button type="button" data-add="source"><span class="t-meta">+</span> Pin source</button>
            <button type="button" data-link aria-pressed="${state.linking}">Link</button>
            <a class="tool-link" href="#capture"><span class="t-meta">+</span> Capture</a>
          </div>
          <div class="zoom t-meta" role="group" aria-label="Zoom">
            <button type="button" data-zoom="-1" aria-label="Zoom out">−</button><button type="button" data-zoom="fit" title="Fit everything">${Math.round(z * 100)}%</button><button type="button" data-zoom="1" aria-label="Zoom in">+</button>
          </div>
        </div>
        <aside class="insp" aria-live="polite">${inspectorHTML()}</aside>
      </div>`;
    if (scroll) { const w = document.querySelector('.board-wrap'); w.scrollLeft = scroll[0]; w.scrollTop = scroll[1]; }
    drawLinks();
    playArrivals();
  }

  /*
   * Orbital arrival: a newly accepted card swings into place around the card
   * it relates to, rotating about that card's centre. One short movement, then
   * stillness. Reduced-motion settings remove it (system/tangerine.css).
   */
  function playArrivals() {
    if (!state.arrivals.size) return;
    for (const [id, a] of state.arrivals) {
      const el = document.querySelector(`.card[data-id="${id}"]`); const it = itemById(id);
      if (!el || !it) continue;
      el.style.setProperty('--ox', (a.x - it.x) + 'px'); el.style.setProperty('--oy', (a.y - it.y) + 'px');
      el.style.setProperty('--delay', (a.i * 70) + 'ms');
      el.classList.add('arrive');
      el.addEventListener('animationend', () => el.classList.remove('arrive'), { once: true });
    }
    state.arrivals.clear();
  }

  const ZOOMS = [0.4, 0.5, 0.67, 0.8, 1, 1.25];
  function fitZoom() {
    if (window.matchMedia('(max-width: 760px)').matches) return 1;
    const wrap = document.querySelector('.board-wrap');
    const w = wrap ? wrap.clientWidth : innerWidth - (innerWidth > 1080 ? 360 : 320), h = wrap ? wrap.clientHeight : innerHeight - 52 - 37;
    const maxX = Math.max(...state.items.map((i) => i.x + CARD_W + 40), 400), maxY = Math.max(...state.items.map((i) => i.y + 200), 300);
    const f = Math.min(w / maxX, (h - 48) / maxY);
    return f >= 1 ? 1 : ZOOMS.reduce((b, v) => (v <= f && v > b ? v : b), ZOOMS[0]);
  }
  function setZoom(how) {
    state.zoomSet = true;
    if (how === 'fit') {
      // Fit everything; pressed again when everything already fits, return to 100%.
      const fit = fitZoom();
      state.zoom = state.zoom === fit ? 1 : fit;
    } else {
      const i = ZOOMS.indexOf(state.zoom) + Number(how);
      state.zoom = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i))];
    }
    renderBoard();
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
      const serif = ['idea', 'decision', 'question'].includes(it.kind);
      html += `<section>${head}<h2 class="${serif ? 'serif' : ''} ${it.status === 'done' ? 'struck' : ''}">${esc(it.title)}</h2>${it.role ? `<p style="margin-top:6px;color:var(--ink-2)">${esc(it.role)}</p>` : ''}
        ${it.when ? `<p class="t-meta" style="margin-top:8px">When · “${esc(it.when)}” · your words, not a date</p>` : ''}
        ${it.demonstration ? '<p class="derived-note">Demonstration · fictional</p>' : ''}
        <div class="row">
          ${it.kind === 'action' ? `<button class="btn" data-act="done">${it.status === 'done' ? 'Reopen' : 'Mark done'}</button>` : ''}
          ${(it.kind === 'project' || it.kind === 'action') && !it.now ? '<button class="btn' + (it.kind === 'action' ? ' quiet' : '') + '" data-act="now">Make this now</button>' : ''}
          <button class="btn quiet" data-act="write">Write about this</button>
          <button class="btn quiet" data-act="rename">Rename</button>
          <button class="btn quiet" data-act="remove">Remove from board</button>
        </div></section>`;
      html += evidenceHTML(it);
      if (it.kind === 'project') html += bookmarkHTML(it);
    }
    html += connectionsHTML(it);
    html += relatedHTML(it);
    return html;
  }

  /* The panel: NOW, NEXT, OPEN LOOPS, DECISIONS — views of the one board, not separate lists to keep. */
  function overviewHTML() {
    const now = state.items.find((i) => i.now);
    let html = '';
    if (now) {
      const b = now.kind === 'project' && lastMark(now);
      const ctx = linkedTo(now.id).filter((o) => o.kind === 'project')[0];
      html += `<section class="cold-open"><div class="label t-meta"><span class="now-tag">Now</span><span>${catNo(now)} · ${KIND[now.kind]}</span></div>
        <h2>${esc(now.title)}</h2>
        ${ctx ? `<p class="t-meta" style="margin-top:6px">For · <button class="link" data-open="${ctx.id}">${esc(ctx.title)}</button></p>` : ''}
        ${b ? `<div style="margin-top:14px">${coldFields(b)}</div><p class="t-meta" style="margin-top:8px">Bookmark left ${ago(b.at)}</p>` : now.evidence && now.evidence[0] ? `<blockquote class="ev-quote" style="margin-top:12px">“${esc(now.evidence[0].quote)}”</blockquote><p class="t-meta">${SPEAKER[now.evidence[0].role] || ''} · in conversation</p>` : '<p class="derived-note">No bookmark yet.</p>'}
        <div class="row"><button class="btn" data-open="${now.id}">Open</button></div></section>`;
    } else {
      html += `<section><div class="label t-meta"><span>TABLET</span></div><h2>Nothing is marked now.</h2><p class="derived-note">Select a project or an action and choose “Make this now”.</p></section>`;
    }
    const open = state.items.filter((i) => i.kind === 'action' && i.status !== 'done' && !i.now);
    const nowIds = new Set(now ? [now.id, ...linkedTo(now.id).map((o) => o.id)] : []);
    const rank = (i) => (nowIds.has(i.id) || linkedTo(i.id).some((o) => nowIds.has(o.id)) ? 0 : 2) + (i.basis === 'chatgpt' ? 1 : 0);
    open.sort((a, b) => rank(a) - rank(b) || String(b.createdAt).localeCompare(String(a.createdAt)));
    const row = (i, extra) => `<li><button class="item" data-open="${i.id}"><span class="t-meta">${catNo(i)}${i.when ? ' · “' + esc(i.when) + '”' : ''}${i.basis === 'chatgpt' ? ' · suggested' : ''}${extra || ''}</span><h4>${esc(i.title)}</h4></button></li>`;
    html += `<section><div class="label t-meta"><span>Next</span><span>${open.length ? Math.min(3, open.length) + ' of ' + open.length : ''}</span></div>
      ${open.length ? `<ul class="list">${open.slice(0, 3).map((i) => row(i)).join('')}</ul>` : '<p class="derived-note">No open actions. Accept some from a capture, or add one.</p>'}</section>`;
    const loops = state.items.filter((i) => i.kind === 'question');
    html += `<section><div class="label t-meta"><span>Open loops</span><span>${loops.length || ''}</span></div>
      ${loops.length ? `<ul class="list">${loops.slice(0, 4).map((i) => row(i)).join('')}</ul>${loops.length > 4 ? `<p class="derived-note">${loops.length - 4} more on the board.</p>` : ''}` : '<p class="derived-note">Nothing waiting.</p>'}</section>`;
    const dec = state.items.filter((i) => i.kind === 'decision').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (dec.length) html += `<section><div class="label t-meta"><span>Decisions</span><span>${dec.length}</span></div><ul class="list">${dec.slice(0, 3).map((i) => row(i)).join('')}</ul></section>`;
    const caps = state.sources.filter((x) => x.kind === 'conversation').sort((a, b) => b.keptAt.localeCompare(a.keptAt));
    if (caps.length) {
      const c = caps[0], ps = state.proposals.filter((p) => p.sourceId === c.id);
      const pend = ps.filter((p) => p.state === 'pending').length, acc = ps.filter((p) => p.state === 'accepted').length;
      html += `<section><div class="label t-meta"><span>Last capture</span><span>${ago(c.keptAt)}</span></div>
        <button class="item link-row" data-capture="${c.id}"><h4>${esc(cur(c).title)}</h4><span class="t-meta">${acc} accepted · ${pend} to review</span></button></section>`;
    }
    const counts = ['project', 'person', 'idea', 'source'].map((k) => state.items.filter((i) => i.kind === k).length);
    html += `<section><div class="label t-meta"><span>On the board</span></div>
      <div class="prov t-meta">${['Projects', 'People', 'Ideas', 'Sources'].map((l, i) => `<div><span>${l}</span><span>${counts[i]}</span></div>`).join('')}</div>
      <p class="derived-note" style="margin-top:14px">The board arranges and links. It never changes an original: pinned sources and conversation evidence are references to what was kept.</p></section>`;
    if (state.hits) html = searchHTML() + html;
    return html;
  }

  const linkedTo = (id) => state.links.filter((l) => l.a === id || l.b === id).map((l) => itemById(l.a === id ? l.b : l.a)).filter(Boolean);

  /* Where an object came from: the exact words, who said them, and a way back. */
  function evidenceHTML(it) {
    const ev = it.evidence || [];
    if (!ev.length) return '';
    const basis = it.origin === 'conversation' ? (BASIS[it.basis] || '') + (it.confidence === 'tentative' ? ' · tentative' : '') : 'Mentioned';
    return `<section><div class="label t-meta"><span>From the conversation · ${ev.length}</span><span>${esc(basis)}</span></div>
      <ul class="list">${ev.map((e) => { const c = srcById(e.sourceId); return `<li>
        <blockquote class="ev-quote">“${esc(e.quote)}”</blockquote>
        <div class="acts t-meta"><span>${SPEAKER[e.role] || 'Unplaced'}${c ? ' · ' + esc(cur(c).title) : ' · capture removed'}${e.turn !== null ? ' · turn ' + (e.turn + 1) : ''}${e.verified === false ? ' · not found in capture' : ''}</span>
        ${c && e.turn !== null ? `<a class="link" href="#capture/${encodeURIComponent(c.id)}/${e.turn}">Open in conversation</a>` : ''}</div></li>`; }).join('')}</ul>
      <p class="derived-note">${it.origin === 'conversation' ? 'Accepted by you from a proposal.' : 'Evidence added when you accepted an update.'} The conversation itself is kept exactly as captured.</p></section>`;
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
      <p class="original ${FIXED(s) ? 'collected' : ''} ${s.kind === 'conversation' ? 'convo' : ''}" style="margin-top:14px">${esc(s.kind === 'conversation' ? clip1(r.body, 600) : r.body)}</p>
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
      <div><span>Original</span><span>${s.kind === 'collected' ? 'Collected · kept exactly as found' : s.kind === 'conversation' ? 'Captured conversation · kept exactly as brought in' : 'Unaltered by Tangerine'}</span></div>
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
    // A captured conversation already shows as evidence; the index suggests other originals.
    const rel = Index.related(it, state.sources.filter((s) => s.kind !== 'conversation'), state.items, { dismissed: state.dismissed });
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
          ${c.kind === 'action' ? '<label><span class="t-meta">When, in your words (optional)</span><input name="when"></label>' : ''}
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
    if (state.linking || e.button > 0) return;
    const it = itemById(card.dataset.id);
    drag = { id: it.id, card, sx: e.clientX, sy: e.clientY, x: it.x, y: it.y, moved: false };
    card.setPointerCapture(e.pointerId);
  });
  main.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true; drag.card.classList.add('dragging');
    drag.nx = snap(drag.x + dx / state.zoom); drag.ny = snap(drag.y + dy / state.zoom);
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
    if (d.zoom) { setZoom(d.zoom); return; }
    if (d.capture) { location.hash = 'capture/' + encodeURIComponent(d.capture); return; }
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
      if (d.act === 'done') { await st.updateItem(it.id, { status: it.status === 'done' ? 'open' : 'done' }); await load(); renderBoard(); return; }
      if (d.act === 'write') { await writeAbout(it); return; }
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
      const it = await st.addItem({ kind: state.composing.kind, title: v.title, role: v.role, when: v.when, x: pos.x, y: pos.y, bookmark: v.next ? { next: v.next } : null });
      if (near && state.composing.kind === 'action') await st.link(near.id, it.id, '');
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

  /* ================= CAPTURE ================= */
  /*
   * Conversation → TABLET, in four visible steps:
   *   1. Bring in   paste, or choose one conversation from ChatGPT's export
   *   2. Keep       the new turns are kept exactly, as a fixed original
   *   3. Synthesize proposals with the words they came from
   *   4. Review     accept, edit, dismiss, undo; only accepted objects reach TABLET
   * Tangerine never reaches into ChatGPT. It only sees what is brought here.
   */
  const captures = () => state.sources.filter((x) => x.kind === 'conversation').sort((a, b) => b.keptAt.localeCompare(a.keptAt));
  const threads = () => [...new Set(captures().map((c) => c.conversation && c.conversation.thread).filter(Boolean))];
  const propsOf = (id) => state.proposals.filter((p) => p.sourceId === id);
  const ptitle = (p) => p.edited || p.title;

  function renderCapture() {
    const list = captures();
    const sel = state.capture.sel && srcById(state.capture.sel);
    const byThread = new Map();
    for (const c of list) { const t = (c.conversation && c.conversation.thread) || 'Conversation'; if (!byThread.has(t)) byThread.set(t, []); byThread.get(t).push(c); }
    const listHTML = [...byThread].map(([t, cs]) => `<li class="thread t-meta">${esc(t)} · ${cs.length} capture${cs.length > 1 ? 's' : ''}</li>` + cs.map((c) => {
      const ps = propsOf(c.id), pend = ps.filter((p) => p.state === 'pending').length, acc = ps.filter((p) => p.state === 'accepted').length;
      return `<li><button aria-current="${sel && sel.id === c.id}" data-capture="${c.id}"><span class="t-meta">${fmtDate(c.keptAt).slice(0, 6)}</span><h4>${esc(cur(c).title)}</h4><span class="k t-meta">${Capture.turnsOf(cur(c).body).length} turns · ${acc} accepted${pend ? ' · ' + pend + ' to review' : ''}${c.demonstration ? ' · demo' : ''}</span></button></li>`;
    }).join('')).join('');
    main.innerHTML = `<div class="cp">
      <div class="ar-list cp-list"><div class="head"><span class="t-meta">Captures · ${list.length}</span><a class="link t-meta" href="#capture">New capture</a></div>
        <ol>${listHTML || '<li class="empty" style="padding:12px 24px">Nothing captured yet.</li>'}</ol>
        <p class="derived-note cp-honest">Tangerine has no connection to ChatGPT. It sees only what you paste or choose from your own data export, and keeps it in this browser.</p>
      </div>
      ${sel ? captureDetailHTML(sel) : captureNewHTML()}
    </div>`;
    if (sel && state.capture.turn !== null) {
      requestAnimationFrame(() => { const t = document.getElementById('turn-' + state.capture.turn); if (t) { t.scrollIntoView({ block: 'center' }); t.classList.add('focus'); } });
    }
  }

  function captureNewHTML() {
    const c = state.capture, d = c.draft || {};
    const thread = d.thread || threads()[0] || 'One conversation';
    let below = '';
    if (c.exportList) {
      below = `<section class="cp-pick"><div class="label t-meta"><span>${esc(c.exportList.file)} · ${c.exportList.list.length} conversations</span><button class="link" data-act="cap-cancel">Cancel</button></div>
        <p class="derived-note" style="margin:0 0 10px">Choose the one conversation to bring in. Nothing else in the file is kept.</p>
        <ul class="list">${c.exportList.list.slice(0, 200).map((x, i) => `<li><button class="item" data-pick="${i}"><span class="t-meta">${x.updated ? fmtDate(x.updated) : 'Undated'} · ${x.turns.length} turns${x.branchExact ? '' : ' · branch unclear'}</span><h4>${esc(x.title)}</h4></button></li>`).join('')}</ul></section>`;
    }
    if (c.preview) {
      const p = c.preview, n = (r) => p.fresh.filter((t) => t.role === r).length;
      below = `<section class="cp-preview"><div class="label t-meta"><span>Read · ${p.turns.length} turns</span><span>${esc(p.via === 'export' ? 'From the export' : 'Pasted')}</span></div>
        <div class="prov t-meta">
          <div><span>New</span><span>${p.fresh.length} turns · ${n('user')} from you · ${n('assistant')} from ChatGPT${n('note') ? ' · ' + n('note') + ' unlabelled' : ''}</span></div>
          <div><span>Already kept</span><span>${p.seen.length ? p.seen.length + ' turns already captured in “' + esc(p.thread) + '” · left out' : 'none'}</span></div>
          <div><span>Thread</span><span>${esc(p.thread)}</span></div>
          <div><span>Dates</span><span>${p.first ? fmtDate(p.first) + (p.last && p.last.slice(0, 10) !== p.first.slice(0, 10) ? ' – ' + fmtDate(p.last) : '') + ' · from the export' : 'Not in pasted text · none assumed'}</span></div>
        </div>
        ${n('note') && !n('user') ? '<p class="notice">No “You said:” / “ChatGPT said:” labels were found, so this is kept as one unlabelled note. Statements will be marked “From a note”.</p>' : ''}
        ${p.fresh.length ? `<ol class="cp-peek">${p.fresh.slice(0, 6).map((t) => `<li><span class="t-meta">${SPEAKER[t.role]}</span> ${esc(clip1(t.text, 140))}</li>`).join('')}${p.fresh.length > 6 ? `<li class="t-meta">…and ${p.fresh.length - 6} more</li>` : ''}</ol>` : ''}
        <div class="row">${p.fresh.length ? '<button class="btn" data-act="cap-keep">Keep and synthesize</button>' : '<span class="notice" style="margin:0">Nothing new since the last capture.</span>'}<button class="btn quiet" data-act="cap-cancel">Cancel</button></div>
      </section>`;
    }
    return `<div class="cp-main"><article class="cp-new">
      <span class="t-meta">02 · Capture</span>
      <h1>Bring in a conversation.</h1>
      <p class="lede">Paste what you want Tangerine to work from — a whole ChatGPT conversation or just today’s part of it. Capture the same ongoing conversation again later and only the new turns are kept.</p>
      <form class="form" data-form="capture">
        <label><span class="t-meta">Which conversation</span><input name="thread" value="${esc(thread)}" list="threads" autocomplete="off" required>
          <datalist id="threads">${threads().map((t) => `<option value="${esc(t)}">`).join('')}</datalist></label>
        <label><span class="t-meta">Paste · “You said:” and “ChatGPT said:” are recognised</span><textarea name="text" rows="10" placeholder="You said:&#10;…&#10;&#10;ChatGPT said:&#10;…">${esc(d.text || '')}</textarea></label>
        <div class="row"><button class="btn" type="submit">Read it</button>
          <button class="btn quiet" type="button" data-act="cap-file">Open conversations.json…</button>
          <button class="btn quiet" type="button" data-act="cap-sample">Use the sample conversation</button></div>
      </form>
      ${below}
      <p class="derived-note" style="margin-top:24px">ChatGPT’s data export (Settings → Data controls → Export) contains <span class="t-meta">conversations.json</span>. It is read here, in memory; only the conversation you choose is kept. The sample is fictional.</p>
    </article></div>`;
  }
  const clip1 = (t, n) => { const s = String(t).replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  function captureDetailHTML(src) {
    const turns = Capture.turnsOf(cur(src).body);
    const ps = propsOf(src.id);
    const cv = src.conversation || {};
    // Highlight the words each proposal came from.
    const marks = turns.map(() => []);
    for (const p of ps) for (const e of p.evidence) if (e.sourceId === src.id && e.turn !== null && marks[e.turn]) marks[e.turn].push({ q: e.quote, p });
    const turnHTML = turns.map((t, i) => {
      let html = '', at = 0; const text = t.text;
      const ranges = [];
      for (const m of marks[i]) { const k = text.indexOf(m.q); if (k >= 0 && !ranges.some((r) => k < r.e && k + m.q.length > r.s)) ranges.push({ s: k, e: k + m.q.length, p: m.p }); }
      ranges.sort((a, b) => a.s - b.s);
      for (const r of ranges) { html += esc(text.slice(at, r.s)) + `<mark class="ev ${r.p.type} ${r.p.state}" data-prop="${esc(r.p.id)}" title="${esc(KIND[r.p.type] + ' · ' + r.p.state)}">${esc(text.slice(r.s, r.e))}</mark>`; at = r.e; }
      html += esc(text.slice(at));
      return `<div class="turn ${t.role}" id="turn-${i}"><span class="t-meta">${SPEAKER[t.role]} · ${i + 1}</span><p>${html}</p></div>`;
    }).join('');
    const pend = ps.filter((p) => p.state === 'pending');
    const yours = pend.filter((p) => (p.basis === 'you' || p.op === 'update') && p.confidence === 'clear');
    const groups = ['project', 'person', 'decision', 'action', 'question', 'idea'].map((k) => [k, ps.filter((p) => p.type === k)]).filter(([, g]) => g.length);
    return `<div class="cp-detail">
      <div class="cp-transcript"><header><span class="t-meta">${esc(cv.thread || '')} · captured ${fmtDate(src.keptAt)}${src.demonstration ? ' · demonstration · fictional' : ''}</span>
        <h1>${esc(cur(src).title)}</h1>
        <div class="prov t-meta">
          <div><span>Kept</span><span>Exactly as ${cv.via === 'export' ? 'read from the export' : 'pasted'} · never revised</span></div>
          <div><span>Turns</span><span>${turns.length} new${cv.seen ? ' · ' + cv.seen + ' already captured, left out' : ''}</span></div>
          <div><span>Message dates</span><span>${cv.first ? fmtDate(cv.first) + (cv.last ? ' – ' + fmtDate(cv.last) : '') : 'Unknown · not assumed'}</span></div>
          <div><span>Source</span><span>${esc(src.provenance || '')}</span></div>
        </div></header>
        ${turnHTML}
      </div>
      <aside class="cp-review" aria-live="polite">
        <div class="label t-meta"><span>Synthesis · ${ps.length} proposals</span><span>${pend.length ? pend.length + ' to review' : 'reviewed'}</span></div>
        <p class="derived-note" style="margin:0 0 12px">Proposed from this capture by the local extractor${ps.some((p) => p.via === 'chatgpt-synthesis') ? ' and by ChatGPT (quotes checked)' : ''}. Each shows the words it came from. Nothing is on TABLET until you accept it.</p>
        <div class="row" style="margin-top:0">
          ${yours.length ? `<button class="btn" data-act="cap-accept-yours">Accept ${yours.length} you stated</button>` : ''}
          ${ps.some((p) => p.state === 'accepted') ? '<a class="btn quiet" href="#whiteboard" style="text-decoration:none">See on TABLET</a>' : ''}
          <button class="btn quiet" data-act="cap-ask">Ask ChatGPT to synthesize…</button>
        </div>
        ${groups.map(([k, g]) => `<section class="pgroup"><div class="label t-meta"><span>${KINDS_PLURAL[k]} · ${g.length}</span></div><ul class="list">${g.map(proposalHTML).join('')}</ul></section>`).join('')}
        ${ps.length ? '' : '<p class="derived-note">Nothing was found to propose. Try asking ChatGPT to synthesize, or add objects on TABLET by hand.</p>'}
      </aside></div>`;
  }

  function proposalHTML(p) {
    const m = p.match && itemById(p.match);
    const item = p.itemId && itemById(p.itemId);
    const e = p.evidence[0];
    const relNames = p.rel.map((r) => { const t = resolveRef(r.ref, p.sourceId); const tt = t ? titleOf(t) : (state.proposals.find((q) => q.sourceId === p.sourceId && 'key:' + q.key === r.ref) || {}).title; return tt ? esc(clip1(tt, 32)) + (r.inferred ? ' <span class="inf">(inferred)</span>' : '') : null; }).filter(Boolean);
    const editing = state.capture.editing === p.id;
    return `<li class="prop ${p.state}" data-pid="${esc(p.id)}">
      <div class="phead t-meta"><span>${p.op === 'update' ? 'Update · ' + (m ? catNo(m) : 'removed') : 'New'}${p.focus ? ' · <span class="now-tag">Suggested as now</span>' : ''}</span><span class="basis ${p.basis}">${esc(BASIS[p.basis] || '')}${p.confidence === 'tentative' ? ' · tentative' : ''}</span></div>
      ${editing ? `<form class="form" data-form="prop-edit"><input name="title" value="${esc(ptitle(p))}" required aria-label="Title"><div class="row" style="margin-top:4px"><button class="btn" type="submit">Save</button><button class="btn quiet" type="button" data-act="cap-edit-cancel">Cancel</button></div></form>`
        : `<h4>${esc(ptitle(p))}${p.edited ? ' <span class="t-meta">· edited</span>' : ''}</h4>`}
      ${p.when ? `<span class="t-meta">“${esc(p.when)}” · your words, no date assumed</span>` : ''}
      ${e ? `<button class="quote" data-turn="${e.turn === null ? '' : e.turn}" ${e.turn === null ? 'disabled' : ''}>“${esc(clip1(e.quote, 160))}”<span class="t-meta"> — ${e.turn === null ? 'not found in the capture' : SPEAKER[e.role] + ', turn ' + (e.turn + 1)}${p.evidence.length > 1 ? ' · +' + (p.evidence.length - 1) + ' more' : ''}</span></button>` : ''}
      ${relNames.length ? `<p class="why">Links to ${relNames.join(', ')}</p>` : ''}
      <div class="acts t-meta">${p.state === 'pending' ? `<button class="link" data-pact="accept">${p.op === 'update' ? 'Add to ' + esc(clip1(m ? titleOf(m) : '', 24)) : 'Accept'}</button>${p.op === 'add' ? '<button class="link" data-pact="edit">Edit</button>' : ''}<button class="link" data-pact="dismiss">Dismiss</button>`
        : p.state === 'accepted' ? `<span class="okmark">On TABLET</span>${item ? `<button class="link" data-open="${item.id}">Show</button>` : ''}<button class="link" data-pact="undo">Undo</button>`
        : '<span>Dismissed</span><button class="link" data-pact="restore">Restore</button>'}</div>
    </li>`;
  }

  /* A proposal's reference → a TABLET item: an existing item, or the card an accepted proposal made. */
  function resolveRef(ref, sourceId) {
    if (ref.startsWith('item:')) return itemById(ref.slice(5)) || null;
    const key = ref.slice(4);
    const p = state.proposals.find((q) => q.sourceId === sourceId && q.key === key && q.state === 'accepted');
    if (p && p.itemId && itemById(p.itemId)) return itemById(p.itemId);
    return state.items.find((i) => i.synthKey === key) || null;
  }

  /*
   * Place a new card in orbit around the card it relates to: rings of
   * increasing radius, the first free position wins. Existing cards are never
   * moved; the person's arrangement is theirs.
   */
  function orbitSpot(anchor, taken) {
    const all = state.items.concat(taken || []);
    const busy = (q) => all.some((i) => Math.abs(i.x - q.x) < CARD_W + 24 && Math.abs(i.y - q.y) < 150);
    if (anchor) {
      const start = ((anchor.no || 0) * 0.9) % (2 * Math.PI);
      for (let r = 240; r <= 960; r += 120) {
        const n = Math.max(8, Math.round((2 * Math.PI * r) / 200));
        for (let k = 0; k < n; k++) {
          const a = start + (k * 2 * Math.PI) / n;
          const q = { x: snap(anchor.x + Math.cos(a) * r), y: snap(anchor.y + Math.sin(a) * r * 0.75) };
          if (q.x >= 16 && q.y >= 40 && !busy(q)) return q;
        }
      }
    }
    // Nothing to orbit: columns to the right of everything already placed.
    const x0 = snap(Math.max(0, ...state.items.filter((i) => i.origin !== 'conversation').map((i) => i.x + CARD_W + 64)));
    for (let col = 0; col < 40; col++) for (let row = 0; row < 5; row++) {
      const q = { x: x0 + col * (CARD_W + 32), y: 48 + row * 152 };
      if (!busy(q)) return q;
    }
    return { x: x0, y: 48 };
  }

  async function acceptProposal(p, batch) {
    const st = state.store, src = srcById(p.sourceId);
    if (p.state === 'accepted') return null;
    const evidence = p.evidence.map((e) => Object.assign({}, e, { sourceId: e.sourceId || p.sourceId }));
    let item = p.match && itemById(p.match);
    if (!item) item = state.items.find((i) => i.synthKey === p.key && i.kind === p.type); // seen in an earlier capture
    let created = false;
    if (item) {
      await st.updateItem(item.id, { addEvidence: evidence });
    } else {
      const anchors = p.rel.map((r) => resolveRef(r.ref, p.sourceId)).filter(Boolean);
      const anchor = anchors.find((a) => a.kind === 'project') || anchors[0] || null;
      const pos = orbitSpot(anchor, batch ? batch.placed : []);
      item = await st.addItem({ kind: p.type, title: ptitle(p), role: p.role, when: p.when, x: pos.x, y: pos.y,
        origin: 'conversation', basis: p.basis, confidence: p.confidence, evidence, synthKey: p.key, demonstration: Boolean(src && src.demonstration) });
      created = true;
      if (batch) batch.placed.push(item);
      state.items = state.items.concat(item);
      state.arrivals.set(item.id, { x: anchor ? anchor.x : item.x, y: anchor ? anchor.y : item.y - 80, i: state.arrivals.size });
    }
    p = await st.setProposal(p.id, { state: 'accepted', itemId: item.id, created });
    state.proposals = state.proposals.map((q) => (q.id === p.id ? p : q));
    // Links: from this proposal to what it names, and from accepted proposals that named it.
    for (const r of p.rel) {
      const t = resolveRef(r.ref, p.sourceId);
      if (t && t.id !== item.id) await st.link(item.id, t.id, '', { origin: r.inferred ? 'inferred' : 'conversation', proposalId: p.id });
    }
    for (const q of state.proposals) {
      if (q.sourceId !== p.sourceId || q.state !== 'accepted' || q.id === p.id || !q.itemId) continue;
      const r = q.rel.find((x) => x.ref === 'key:' + p.key || x.ref === 'item:' + item.id);
      if (r && itemById(q.itemId)) await st.link(q.itemId, item.id, '', { origin: r.inferred ? 'inferred' : 'conversation', proposalId: q.id });
    }
    if (p.focus) await st.setNow(item.id);
    return item;
  }

  async function undoProposal(p) {
    const st = state.store;
    const item = p.itemId && itemById(p.itemId);
    if (item) {
      if (p.created) { if (!confirm('Take “' + titleOf(item) + '” off TABLET? The conversation is unchanged, and the proposal returns to review.')) return; await st.removeItem(item.id); }
      else {
        await st.updateItem(item.id, { removeEvidence: p.evidence.map((e) => Object.assign({}, e, { sourceId: e.sourceId || p.sourceId })) });
        for (const l of state.links) if (l.proposalId === p.id) await st.unlink(l.id);
      }
    }
    await st.setProposal(p.id, { state: 'pending', itemId: null, created: false });
  }

  async function readCapture(text, thread, via, meta) {
    const turns = via === 'export' ? meta.turns : Capture.parseText(text);
    if (!turns.length) { toast('Nothing to read · paste some conversation first'); return; }
    const known = captures().filter((c) => c.conversation && c.conversation.thread === thread).flatMap((c) => c.conversation.turnKeys);
    const { fresh, seen } = Capture.compare(turns, known);
    const times = fresh.map((t) => t.t).filter(Boolean).sort();
    state.capture.preview = { turns, fresh, seen, thread, via, meta: meta || {}, text, first: times[0] || null, last: times[times.length - 1] || null };
    state.capture.exportList = null;
    renderCapture();
    document.querySelector('.cp-preview')?.scrollIntoView({ block: 'nearest' });
  }

  async function keepCapture() {
    const p = state.capture.preview, st = state.store;
    const sample = p.via === 'paste' && p.text.trim() === window.TangerineDemo.SAMPLE_CONVERSATION.trim();
    const today = new Date();
    const title = p.via === 'export' ? p.meta.title : p.thread + ' · ' + today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    document.querySelector('.brand .mark')?.classList.add('working');
    const src = await st.keepSource({
      kind: 'conversation', title, body: Capture.transcript(p.fresh), author: 'You and ChatGPT',
      madeOn: p.first ? p.first.slice(0, 10) : null,
      provenance: sample ? 'Fictional sample conversation · written for this study' : p.via === 'export' ? 'ChatGPT data export · conversations.json · chosen by you' : 'Pasted into Tangerine by you',
      demonstration: sample,
      conversation: { thread: p.thread, via: p.via, title: p.meta.title || null, exportId: p.meta.id || null, turnKeys: p.fresh.map(Capture.turnKey), seen: p.seen.length, first: p.first, last: p.last },
    });
    // Synthesize from the kept text itself, so every quote points into the original.
    const turns = Capture.turnsOf(cur(src).body);
    const { proposals } = Synth.extract(turns, state.items, { sourceId: src.id });
    await st.saveProposals(src.id, proposals, sample ? { demonstration: true } : null);
    state.capture.preview = null; state.capture.draft = null;
    await load();
    setTimeout(() => document.querySelector('.brand .mark')?.classList.remove('working'), 900);
    location.hash = 'capture/' + encodeURIComponent(src.id);
    toast('Kept · ' + proposals.length + ' proposals to review');
  }

  function askDialog(src) {
    const d = dialog(`<div class="label t-meta"><span>Ask ChatGPT to synthesize</span><button class="link" data-dlg="close">Close</button></div>
      <h2>Let ChatGPT do the reading, then check it here.</h2>
      <ol class="steps">
        <li><span class="t-meta">1 · Copy this into the same ChatGPT conversation</span><textarea readonly rows="6" id="ask-prompt">${esc(Synth.PROMPT)}</textarea><div class="row" style="margin-top:6px"><button class="btn quiet" data-ask="copy">Copy prompt</button></div></li>
        <li><span class="t-meta">2 · Paste ChatGPT’s reply</span><textarea rows="6" id="ask-reply" placeholder='{"tangerine":"synthesis/1","items":[…]}'></textarea></li>
      </ol>
      <p class="derived-note">Every quote is checked against this capture. A quote that cannot be found is kept only as an unverified, tentative proposal. Nothing reaches TABLET until you accept it.</p>
      <div class="row"><button class="btn" data-ask="check">Check and add proposals</button></div>`);
    d.onclick = async (e) => {
      const b = e.target.closest('[data-ask]'); if (!b) return;
      if (b.dataset.ask === 'copy') { const t = d.querySelector('#ask-prompt'); try { await navigator.clipboard.writeText(t.value); toast('Prompt copied'); } catch (err) { t.select(); toast('Select and copy the prompt'); } return; }
      try {
        const bundle = Synth.readBundle(d.querySelector('#ask-reply').value);
        const turns = Capture.turnsOf(cur(src).body);
        const { proposals, stats } = Synth.fromBundle(bundle, turns, state.items, { sourceId: src.id });
        const before = propsOf(src.id).length;
        await state.store.saveProposals(src.id, proposals, src.demonstration ? { demonstration: true } : null);
        await load(); d.close(); renderCapture();
        toast((propsOf(src.id).length - before) + ' new proposals · ' + stats.unverified + ' quotes not found in the capture');
      } catch (err) {
        let n = d.querySelector('.notice.warn'); if (!n) { n = document.createElement('p'); n.className = 'notice warn'; d.querySelector('.steps').after(n); }
        n.textContent = 'Could not read that: ' + err.message + ' Nothing was added.';
      }
    };
  }

  main.addEventListener('click', async (e) => {
    if (state.view !== 'capture') return;
    const t = e.target, st = state.store, c = state.capture;
    const capBtn = t.closest('[data-capture]');
    if (capBtn) { location.hash = 'capture/' + encodeURIComponent(capBtn.dataset.capture); return; }
    const pick = t.closest('[data-pick]');
    if (pick) { const x = c.exportList.list[+pick.dataset.pick]; const th = document.querySelector('[name="thread"]').value.trim() || x.title; await readCapture('', th, 'export', x); return; }
    const q = t.closest('button.quote[data-turn]');
    if (q && q.dataset.turn !== '') { history.replaceState(null, '', '#capture/' + encodeURIComponent(c.sel) + '/' + q.dataset.turn); document.querySelectorAll('.turn.focus').forEach((x) => x.classList.remove('focus')); const el = document.getElementById('turn-' + q.dataset.turn); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.classList.add('focus'); return; }
    const mk = t.closest('mark[data-prop]');
    if (mk) { const li = document.querySelector(`.prop[data-pid="${CSS.escape(mk.dataset.prop)}"]`); li?.scrollIntoView({ block: 'center', behavior: 'smooth' }); li?.classList.add('flash'); setTimeout(() => li?.classList.remove('flash'), 1200); return; }
    const pa = t.closest('[data-pact]');
    if (pa) {
      const p = state.proposals.find((x) => x.id === pa.closest('.prop').dataset.pid);
      const a = pa.dataset.pact;
      if (a === 'accept') {
        const it = await acceptProposal(p); await load(); renderCapture();
        const np = state.proposals.find((x) => x.id === p.id);
        toast(np && np.created ? 'On TABLET · ' + titleOf(it) : 'Added as evidence to ' + titleOf(it));
      }
      if (a === 'dismiss') { await st.setProposal(p.id, { state: 'dismissed' }); await load(); renderCapture(); }
      if (a === 'restore') { await st.setProposal(p.id, { state: 'pending' }); await load(); renderCapture(); }
      if (a === 'undo') { await undoProposal(p); await load(); renderCapture(); }
      if (a === 'edit') { c.editing = p.id; renderCapture(); document.querySelector('[data-form="prop-edit"] input')?.select(); }
      return;
    }
    const b = t.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'cap-sample') { c.draft = { thread: 'Studio', text: window.TangerineDemo.SAMPLE_CONVERSATION }; c.preview = null; c.exportList = null; renderCapture(); }
    if (a === 'cap-file') document.getElementById('capture-file').click();
    if (a === 'cap-cancel') { c.preview = null; c.exportList = null; renderCapture(); }
    if (a === 'cap-keep') await keepCapture();
    if (a === 'cap-edit-cancel') { c.editing = null; renderCapture(); }
    if (a === 'cap-ask') askDialog(srcById(c.sel));
    if (a === 'cap-accept-yours') {
      const pend = propsOf(c.sel).filter((p) => p.state === 'pending' && (p.basis === 'you' || p.op === 'update') && p.confidence === 'clear');
      const order = { project: 0, person: 1, idea: 2, decision: 3, question: 4, action: 5 };
      pend.sort((x, y) => order[x.type] - order[y.type]);
      const batch = { placed: [] };
      for (const p of pend) await acceptProposal(state.proposals.find((x) => x.id === p.id), batch);
      await load(); renderCapture();
      toast(pend.length + ' accepted · ' + batch.placed.length + ' new on TABLET');
    }
  });

  main.addEventListener('submit', async (e) => {
    if (state.view !== 'capture') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const f = e.target, v = Object.fromEntries(new FormData(f));
    if (f.dataset.form === 'capture') {
      state.capture.draft = { thread: v.thread.trim(), text: v.text };
      await readCapture(v.text, v.thread.trim() || 'One conversation', 'paste');
    }
    if (f.dataset.form === 'prop-edit') {
      const id = f.closest('.prop').dataset.pid;
      await state.store.setProposal(id, { edited: v.title.trim() });
      state.capture.editing = null; await load(); renderCapture();
    }
  }, true);

  document.getElementById('capture-file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const list = Capture.parseExport(JSON.parse(await f.text()));
      state.capture.exportList = { file: f.name, list }; state.capture.preview = null;
      if (state.view !== 'capture' || state.capture.sel) location.hash = 'capture'; else renderCapture();
    } catch (err) { toast(err.message); }
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
        <p class="original ${FIXED(s) ? 'collected' : ''} ${s.kind === 'conversation' ? 'convo' : ''}">${esc(r.body)}</p>
        ${provHTML(s)}
        <div class="row">
          <button class="btn" data-act="pin-here">${onBoard ? 'Show on whiteboard' : 'Pin to whiteboard'}</button>
          ${s.kind === 'writing' || s.kind === 'note' ? `<a class="btn quiet" href="#writing/${encodeURIComponent('src:' + s.id)}" style="text-decoration:none">Open at the desk</a>` : ''}
          ${!FIXED(s) ? '<button class="btn quiet" data-act="revise">Revise</button>' : ''}
          ${s.kind === 'conversation' ? `<a class="btn quiet" href="#capture/${encodeURIComponent(s.id)}" style="text-decoration:none">Open in Capture</a>` : ''}
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
      savedAt: d ? d.savedAt : null, recovered: d && key !== state.freshKey ? d : null, pending: null, saving: Promise.resolve(),
      itemId: d ? d.itemId || null : null,
    };
  }

  /* What on TABLET this piece is connected to: the object it was begun from, or what its pinned card links to. */
  function deskContext() {
    const k = state.desk; if (!k) return [];
    const out = [];
    if (k.itemId && itemById(k.itemId)) out.push(itemById(k.itemId));
    const card = k.sourceId && state.items.find((i) => i.kind === 'source' && i.sourceId === k.sourceId);
    if (card) for (const o of linkedTo(card.id)) if (o.kind !== 'source' && !out.includes(o)) out.push(o);
    return out;
  }

  function contextHTML(ctx) {
    const main0 = ctx[0];
    const around = linkedTo(main0.id).filter((o) => o.kind !== 'source' && !ctx.includes(o));
    const quotes = ctx.flatMap((it) => (it.evidence || []).map((e) => ({ e, it })));
    return `<aside class="wd-context" aria-label="Connected on TABLET">
      <div class="label t-meta"><span>Connected on TABLET</span></div>
      ${ctx.map((it) => `<button class="item ctx-item" data-open="${it.id}"><span class="t-meta">${catNo(it)} · ${KIND[it.kind]}</span><h4>${esc(titleOf(it))}</h4></button>`).join('')}
      ${quotes.length ? `<div class="label t-meta" style="margin-top:20px"><span>Its words in conversation</span></div><ul class="list">${quotes.slice(0, 8).map(({ e }, i) => `<li><blockquote class="ev-quote">“${esc(e.quote)}”</blockquote><div class="acts t-meta"><span>${SPEAKER[e.role] || ''}</span><button class="link" data-insert="${i}">Insert as quotation</button></div></li>`).join('')}</ul>` : ''}
      ${around.length ? `<div class="label t-meta" style="margin-top:20px"><span>Around it</span></div><ul class="list">${around.slice(0, 10).map((o) => `<li><button class="item" data-open="${o.id}"><span class="t-meta">${KIND[o.kind]}${o.status === 'done' ? ' · done' : ''}</span><h4>${esc(titleOf(o))}</h4></button></li>`).join('')}</ul>` : ''}
      <p class="derived-note">Quoting copies words into your draft with who said them. The conversation is unchanged.</p>
    </aside>`;
  }

  /* Begin a piece of writing from an object on TABLET. */
  async function writeAbout(it) {
    const existing = state.drafts.find((d) => d.itemId === it.id);
    if (existing) { location.hash = 'writing/' + encodeURIComponent(existing.key); return; }
    const key = newKey();
    await state.store.saveDraft({ key, kind: 'writing', title: titleOf(it), body: '', itemId: it.id });
    state.freshKey = key;
    await load();
    state.desk = null;
    location.hash = 'writing/' + encodeURIComponent(key);
    requestAnimationFrame(() => document.getElementById('desk-body')?.focus());
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
    const about = (key) => { const d = draftByKey(key); const it = d && d.itemId && itemById(d.itemId); return it ? ' · on ' + esc(clip1(titleOf(it), 28)) : ''; };
    const item = (key, title, meta, draft) => `<li><button aria-current="${key === k.key}" data-desk="${esc(key)}"><span class="t-meta">${meta}</span><h4>${esc(title || 'Untitled')}</h4><span class="k t-meta">${draft ? '<span class="draft-tag">Draft · not yet kept</span>' : ''}${about(key)}</span></button></li>`;
    const notices = [];
    if (!state.store.durable) notices.push(`<p class="notice warn"><b>Not saved.</b> Browser storage is unavailable here, so nothing on this desk survives a reload. ${esc(state.store.problem || '')}</p>`);
    if (k.recovered && deskChanged()) notices.push(`<p class="notice">Recovered an unfinished draft from ${fmtDate(k.recovered.savedAt)}, ${clock(k.recovered.savedAt)}. It is not yet kept.${k.recovered.restoredFrom ? ' It came from a restored copy and differed from the draft already here.' : ''}</p>`);
    if (r && k.baseN && r.n > k.baseN) notices.push(`<p class="notice">The kept version moved on to revision ${r.n} after this draft began from revision ${k.baseN}. Keeping adds revision ${r.n + 1}; nothing is replaced.</p>`);
    if (src && src.demonstration) notices.push('<p class="notice">Demonstration · fictional.</p>');
    const ctx = deskContext();
    main.innerHTML = `<div class="wd${ctx.length ? ' with-ctx' : ''}">
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
        ${ctx.length ? '' : '<p class="derived-note">Begin a piece from anything on TABLET with “Write about this”, and its conversation evidence sits beside the page.</p>'}
        <p class="derived-note">Drafts save in this browser as you type and come back after a reload. Keeping makes an original, or adds a revision beside the earlier ones. This browser is not a vault: <button class="link" data-act="export">export a copy</button> to keep one outside it.${state.persisted === true ? ' The browser has granted persistent storage.' : state.persisted === false ? ' The browser has not granted persistent storage, so it may clear this site’s data under pressure.' : ''}</p>
      </div></div>${ctx.length ? contextHTML(ctx) : ''}</div>`;
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
    const snap = { key: k.key, sourceId: k.sourceId, kind: k.kind, baseN: k.baseN, title: k.title, body: k.body, itemId: k.itemId };
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
      const about = k.itemId && itemById(k.itemId);
      if (about) {
        const pos = orbitSpot(about, []);
        const card = await st.addItem({ kind: 'source', sourceId: s.id, x: pos.x, y: pos.y });
        await st.link(about.id, card.id, 'Writing');
        state.arrivals.set(card.id, { x: about.x, y: about.y, i: 0 });
        msg += ' · pinned beside ' + titleOf(about) + ' on TABLET';
      }
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

  function insertQuote(i) {
    const ctx = deskContext();
    const q = ctx.flatMap((it) => (it.evidence || []).map((e) => e))[i]; if (!q) return;
    const ta = document.getElementById('desk-body');
    const text = '“' + q.quote + '” — ' + (q.role === 'assistant' ? 'ChatGPT' : q.role === 'user' ? 'me' : 'a note') + ', in conversation';
    const at = ta.selectionStart ?? ta.value.length;
    const before = ta.value.slice(0, at), after = ta.value.slice(at);
    const pre = before && !/\n\n$/.test(before) ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    ta.value = before + pre + text + '\n\n' + after;
    ta.selectionStart = ta.selectionEnd = (before + pre + text + '\n\n').length;
    ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
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
    const b = e.target.closest('[data-desk], [data-act], [data-insert]'); if (!b) return;
    if (b.dataset.desk) { switchDesk(b.dataset.desk); return; }
    if (b.dataset.insert !== undefined) { insertQuote(+b.dataset.insert); return; }
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
      const r = Index.related(it, state.sources.filter((s) => s.kind !== 'conversation'), state.items, { dismissed: state.dismissed, limit: 1 }).find((x) => !x.pinned);
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

  /*
   * Live: opened from the Tangerine bridge (bridge/server.mjs) with ?live.
   * TABLET then reads and writes the bridge's store on this machine, and
   * redraws when ChatGPT relays something. No demonstration is installed.
   */
  const params = new URLSearchParams(location.search);
  const LIVE = params.has('live');
  /* Live TABLET signs in with a session cookie (one-time link from the bridge). A key in the address is never used. */
  if (params.has('key')) { params.delete('key'); history.replaceState(null, '', location.pathname + '?' + params.toString().replace(/=(&|$)/g, '$1') + location.hash); }
  let refreshTimer = null;
  function liveRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName);
      if (drag || state.composing || typing || document.querySelector('dialog[open]')) { liveRefresh(); return; }
      const before = new Set(state.items.map((i) => i.id));
      await load();
      const fresh = state.items.filter((i) => !before.has(i.id) && i.origin === 'conversation');
      fresh.forEach((it, i) => {
        const anchor = linkedTo(it.id).find((o) => o.kind === 'project') || linkedTo(it.id)[0];
        state.arrivals.set(it.id, { x: anchor ? anchor.x : it.x, y: anchor ? anchor.y : it.y - 80, i });
      });
      if (state.view === 'writing') return; // never redraw under someone's sentence
      render();
      if (fresh.length) toast(fresh.length + ' new from ChatGPT');
    }, 400);
  }

  (async function boot() {
    if (LIVE) {
      try { state.store = await window.TangerineStore.openLiveStore(''); }
      catch (e) { main.innerHTML = `<p class="empty">TABLET is not signed in on this computer. Run <span class="t-meta">node bridge/open.mjs</span> (the bridge must be running) to open it.</p>`; return; }
      const es = new EventSource('/api/events');
      es.addEventListener('change', liveRefresh);
      es.onerror = () => { document.getElementById('storage').textContent = 'Live · reconnecting to the bridge…'; };
      es.addEventListener('hello', () => load());
    } else {
      state.store = await openStore();
    }
    if (!LIVE && (await state.store.getMeta('demonstration')) === undefined) await window.TangerineDemo.install(state.store);
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
