/* Tangerine — Website V2. Progressive enhancement only: every page reads fully without this file. */
(() => {
  const doc = document.documentElement;
  doc.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* Images arrive quietly once decoded. */
  const reveal = img => {
    if (img.complete && img.naturalWidth) img.classList.add('is-in');
    else img.addEventListener('load', () => img.classList.add('is-in'), { once: true });
    img.addEventListener('error', () => img.classList.add('is-in'), { once: true });
  };
  document.querySelectorAll('.art .frame img').forEach(reveal);

  /* Films play only while visible, never when reduced motion is preferred. */
  const films = [...document.querySelectorAll('video[data-loop]')];
  const syncFilm = (v, visible) => {
    if (reduce.matches) { v.pause(); return; }
    if (visible) v.play().catch(() => {}); else v.pause();
  };
  if (films.length) {
    const io = new IntersectionObserver(es => es.forEach(e => syncFilm(e.target, e.isIntersecting)), { threshold: 0.25 });
    films.forEach(v => io.observe(v));
  }

  const archive = document.querySelector('[data-archive]');
  if (!archive) return;
  const arts = [...archive.querySelectorAll('.art[data-id]')];
  const chapters = [...archive.querySelectorAll('.chapter')];
  const countEl = document.querySelector('[data-count]');
  const total = arts.length;
  let active = 'all';

  /* Discipline filter. */
  const buttons = [...document.querySelectorAll('.filter button')];
  const applyFilter = key => {
    active = key;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
    let shown = 0;
    arts.forEach(a => {
      const on = key === 'all' || a.dataset.disc.split(' ').includes(key);
      a.hidden = !on;
      if (on) shown++;
    });
    chapters.forEach(c => { c.hidden = !c.querySelector('.art:not([hidden])'); });
    if (countEl) countEl.textContent = key === 'all' ? `${total} artifacts` : `${shown} of ${total} artifacts`;
    const url = new URL(location.href);
    if (key === 'all') url.searchParams.delete('d'); else url.searchParams.set('d', key);
    history.replaceState(history.state, '', url);
  };
  buttons.forEach(b => b.addEventListener('click', () => {
    applyFilter(b.dataset.filter);
    const bar = document.querySelector('.toolbar');
    const top = archive.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - 8;
    if (scrollY > top) scrollTo({ top, behavior: reduce.matches ? 'auto' : 'smooth' });
  }));
  const startKey = new URL(location.href).searchParams.get('d');
  if (startKey && buttons.some(b => b.dataset.filter === startKey)) applyFilter(startKey);

  /* Viewer: one artifact at a time, previous / next within the current filter. */
  const viewer = document.querySelector('.viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const $ = s => viewer.querySelector(s);
  const media = $('.v-media');
  const label = document.title;
  let current = -1;
  let opener = null;

  const visible = () => arts.filter(a => !a.hidden);
  const render = art => {
    const list = visible();
    const i = list.indexOf(art);
    current = arts.indexOf(art);
    media.replaceChildren();
    const kind = art.dataset.kind;
    if (kind === 'quote') {
      const q = art.querySelector('blockquote').cloneNode(true);
      q.className = 'quote-view' + (q.classList.contains('sans') ? ' sans' : '');
      media.append(q);
    } else if (kind === 'video') {
      const src = art.querySelector('video');
      const v = document.createElement('video');
      v.src = src.currentSrc || src.querySelector('source').src;
      v.poster = src.poster; v.muted = true; v.loop = true; v.playsInline = true; v.controls = true;
      v.setAttribute('aria-label', src.getAttribute('aria-label') || '');
      if (!reduce.matches) v.autoplay = true;
      media.append(v);
    } else {
      const src = art.querySelector('.frame img');
      const img = new Image();
      img.alt = src.alt;
      img.sizes = '100vw';
      img.srcset = src.dataset.full || src.srcset;
      img.src = src.currentSrc || src.src;
      img.decoding = 'async';
      media.append(img);
    }
    const cap = art.querySelector('.caption');
    $('.v-cap-num').textContent = art.dataset.n;
    $('.v-cap-title').innerHTML = cap.querySelector('.t').innerHTML;
    $('.v-cap-facts').innerHTML = [...cap.querySelectorAll('.facts span')].map(s => `<span>${s.innerHTML}</span>`).join('');
    const d = cap.querySelector('.d');
    $('.v-cap-d').innerHTML = d ? d.innerHTML : '';
    $('.counter').textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    viewer.querySelectorAll('[data-step="-1"]').forEach(b => { b.disabled = i <= 0; });
    viewer.querySelectorAll('[data-step="1"]').forEach(b => { b.disabled = i >= list.length - 1; });
    // Warm the neighbours.
    [list[i - 1], list[i + 1]].forEach(n => {
      const im = n && n.querySelector('.frame img');
      if (im) { const p = new Image(); p.sizes = '100vw'; p.srcset = im.dataset.full || im.srcset; }
    });
    document.title = `${cap.querySelector('.t').textContent.trim()} — ${label}`;
    history.replaceState({ v: 1 }, '', '#' + art.dataset.id);
  };
  const open = (art, from) => {
    opener = from || null;
    render(art);
    if (!viewer.open) { viewer.showModal(); doc.classList.add('v-lock'); }
    $('.close').focus({ preventScroll: true });
  };
  const close = () => {
    if (!viewer.open) return;
    viewer.close();
  };
  viewer.addEventListener('close', () => {
    doc.classList.remove('v-lock');
    media.replaceChildren();
    document.title = label;
    const art = arts[current];
    history.replaceState(null, '', location.pathname + location.search);
    if (art) {
      art.scrollIntoView({ block: 'center', behavior: 'auto' });
      (opener && document.contains(opener) ? opener : art.querySelector('.frame')).focus({ preventScroll: true });
    }
  });
  const step = d => {
    const list = visible();
    const i = list.indexOf(arts[current]) + d;
    if (i >= 0 && i < list.length) render(list[i]);
  };

  archive.addEventListener('click', e => {
    const frame = e.target.closest('.art .frame[href]');
    if (!frame) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    open(frame.closest('.art'), frame);
  });
  viewer.addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (b) step(+b.dataset.step);
    if (e.target.closest('.close')) close();
  });
  viewer.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  let x0 = null, y0 = null;
  media.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  media.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });

  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const art = id && arts.find(a => a.dataset.id === id);
    if (art) {
      if (art.hidden) applyFilter('all');
      open(art);
    }
  };
  fromHash();
  addEventListener('hashchange', fromHash);
})();
