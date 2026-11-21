/* Tangerine — shared behaviour. Every page reads fully without it. */
(() => {
  const doc = document.documentElement;
  doc.classList.remove('no-js');
  doc.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const T = window.Tangerine = { reduce };

  /* ———— Studio panel */
  const studio = document.getElementById('studio');
  if (studio) {
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    document.body.append(scrim);
    studio.setAttribute('role', 'dialog');
    studio.setAttribute('aria-modal', 'true');
    let back = null;
    const open = () => {
      back = document.activeElement;
      studio.classList.add('open'); scrim.classList.add('open');
      studio.querySelector('[data-studio-close]').focus({ preventScroll: true });
    };
    const close = () => {
      if (!studio.classList.contains('open')) return;
      studio.classList.remove('open'); scrim.classList.remove('open');
      if (location.hash === '#studio') history.replaceState(history.state, '', location.pathname + location.search);
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
    T.studioOpen = () => studio.classList.contains('open');
    document.addEventListener('click', e => {
      if (e.target.closest('[data-studio]')) { e.preventDefault(); open(); }
      else if (e.target.closest('[data-studio-close]') || e.target === scrim) close();
    });
    document.addEventListener('keydown', e => {
      if (!studio.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') { // keep focus inside the panel
        const f = [...studio.querySelectorAll('a,button')];
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }, true);
    if (location.hash === '#studio') open();
  }

  /* ———— Viewer: one artifact at a time, for any list of items.
     item = { id, num, title (html), facts: [], note (html), kind, src, srcset, alt, video, poster, quote, sans } */
  T.viewer = (items, { onClose, onMove } = {}) => {
    const v = document.querySelector('dialog.viewer');
    if (!v || typeof v.showModal !== 'function') return null;
    const $ = s => v.querySelector(s);
    const media = $('.v-media');
    const label = document.title;
    let i = -1, opener = null;
    const render = (k, dir = 1) => {
      const list = items();
      i = Math.max(0, Math.min(k, list.length - 1));
      const a = list[i];
      media.replaceChildren();
      media.classList.remove('swap'); void media.offsetWidth; media.classList.add('swap');
      media.style.setProperty('--dir', dir);
      if (a.kind === 'quote') {
        const q = document.createElement('blockquote');
        q.className = 'quote-view'; q.textContent = a.quote; media.append(q);
      } else if (a.kind === 'video') {
        const el = document.createElement('video');
        el.src = a.video; el.poster = a.src; el.muted = true; el.loop = true; el.playsInline = true; el.controls = true;
        el.setAttribute('aria-label', a.alt || '');
        if (!reduce.matches) el.autoplay = true;
        media.append(el);
      } else {
        const img = new Image();
        img.alt = a.alt || ''; img.sizes = '100vw'; img.srcset = a.srcset; img.src = a.src; img.decoding = 'async';
        media.append(img);
      }
      $('.v-cap-num').textContent = a.num;
      $('.v-cap-title').innerHTML = a.title;
      $('.v-cap-facts').innerHTML = a.facts.map(f => `<span>${f}</span>`).join('');
      $('.v-cap-d').innerHTML = a.note || '';
      $('.counter').textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
      v.querySelectorAll('[data-step="-1"]').forEach(b => { b.disabled = i <= 0; });
      v.querySelectorAll('[data-step="1"]').forEach(b => { b.disabled = i >= list.length - 1; });
      [list[i - 1], list[i + 1]].forEach(n => { if (n && n.srcset) { const p = new Image(); p.sizes = '100vw'; p.srcset = n.srcset; } });
      document.title = a.text ? `${a.text} — ${label}` : label;
      history.replaceState({ v: 1 }, '', '#' + a.id);
      if (onMove) onMove(a, i);
    };
    const open = (k, from) => {
      opener = from || document.activeElement;
      render(k);
      if (!v.open) { v.showModal(); doc.classList.add('v-lock'); }
      $('.close').focus({ preventScroll: true });
    };
    const step = d => { const n = i + d; if (n >= 0 && n < items().length) render(n, d); };
    v.addEventListener('close', () => {
      doc.classList.remove('v-lock');
      media.replaceChildren();
      document.title = label;
      const a = items()[i];
      if (onClose) onClose(a, opener);
      else if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    });
    v.addEventListener('click', e => {
      const b = e.target.closest('[data-step]');
      if (b) step(+b.dataset.step);
      if (e.target.closest('.close')) v.close();
    });
    v.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    let x0 = null, y0 = null;
    media.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    media.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
    return { open, isOpen: () => v.open, close: () => v.close() };
  };

  /* ———— Dossier pages */
  const archive = document.querySelector('[data-archive]');
  if (!archive) return;

  const reveal = img => {
    if (img.complete && img.naturalWidth) img.classList.add('is-in');
    else img.addEventListener('load', () => img.classList.add('is-in'), { once: true });
    img.addEventListener('error', () => img.classList.add('is-in'), { once: true });
  };
  document.querySelectorAll('.art .frame img').forEach(reveal);

  const films = [...document.querySelectorAll('video[data-loop]')];
  if (films.length) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (reduce.matches || !e.isIntersecting) e.target.pause(); else e.target.play().catch(() => {});
    }), { threshold: 0.25 });
    films.forEach(f => io.observe(f));
  }

  const arts = [...archive.querySelectorAll('.art[data-id]')];
  const chapters = [...archive.querySelectorAll('.chapter')];
  const countEl = document.querySelector('[data-count]');
  const buttons = [...document.querySelectorAll('.filter button')];
  const applyFilter = key => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
    let shown = 0;
    arts.forEach(a => { const on = key === 'all' || a.dataset.disc.split(' ').includes(key); a.hidden = !on; if (on) shown++; });
    chapters.forEach(c => { c.hidden = !c.querySelector('.art:not([hidden])'); });
    if (countEl) countEl.textContent = key === 'all' ? `${arts.length} entries` : `${shown} of ${arts.length} entries`;
    const url = new URL(location.href);
    if (key === 'all') url.searchParams.delete('d'); else url.searchParams.set('d', key);
    history.replaceState(history.state, '', url);
  };
  buttons.forEach(b => b.addEventListener('click', () => {
    applyFilter(b.dataset.filter);
    const bar = document.querySelector('.toolbar');
    const top = archive.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - 8;
    if (scrollY > top) scrollTo({ top, behavior: 'auto' });
  }));
  const startKey = new URL(location.href).searchParams.get('d');
  if (startKey && buttons.some(b => b.dataset.filter === startKey)) applyFilter(startKey);

  const item = art => {
    const cap = art.querySelector('.caption');
    const kind = art.dataset.kind;
    const base = {
      id: art.dataset.id, kind, num: cap.querySelector('.num').textContent,
      title: cap.querySelector('.t').innerHTML, text: cap.querySelector('.t').textContent.trim(),
      facts: [...cap.querySelectorAll('.facts span')].map(s => s.innerHTML),
      note: cap.querySelector('.d') ? cap.querySelector('.d').innerHTML : '',
    };
    if (kind === 'quote') return { ...base, quote: art.querySelector('blockquote').firstChild.textContent };
    if (kind === 'video') { const f = art.querySelector('video'); return { ...base, video: f.querySelector('source').src, src: f.poster, alt: f.getAttribute('aria-label') }; }
    const im = art.querySelector('.frame img');
    return { ...base, src: im.currentSrc || im.src, srcset: im.srcset, alt: im.alt };
  };
  const visible = () => arts.filter(a => !a.hidden);
  const viewer = T.viewer(() => visible().map(item), {
    onClose: (a, opener) => {
      history.replaceState(null, '', location.pathname + location.search);
      const art = a && arts.find(x => x.dataset.id === a.id);
      if (art) {
        art.scrollIntoView({ block: 'center' });
        art.classList.add('is-target'); setTimeout(() => art.classList.remove('is-target'), 900);
        (opener && document.contains(opener) && opener.closest('.art') === art ? opener : art.querySelector('.frame') || art).focus({ preventScroll: true });
      }
    },
  });
  if (!viewer) return;
  archive.addEventListener('click', e => {
    const frame = e.target.closest('.art .frame[href]');
    if (!frame || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    viewer.open(visible().indexOf(frame.closest('.art')), frame);
  });
  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const art = id && arts.find(a => a.dataset.id === id);
    if (!art) return;
    if (art.hidden) applyFilter('all');
    viewer.open(visible().indexOf(art));
  };
  fromHash();
  addEventListener('hashchange', fromHash);
})();
