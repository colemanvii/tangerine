/* Tangerine — the index as four tracks.
   One track is open at a time; a cursor sits on one piece of work. Everything else is a consequence. */
(() => {
  const T = window.Tangerine || {};
  const reduce = T.reduce || matchMedia('(prefers-reduced-motion: reduce)');
  const data = JSON.parse(document.getElementById('archive-data').textContent);
  const A = data.artifacts;
  const tracks = [...document.querySelectorAll('.tr')];
  const plates = tracks.map(t => [...t.querySelectorAll('.pl')]);
  const byRel = tracks.map(t => A.filter(a => a.rel === t.id));
  const last = tracks.map(() => 0);       // each track remembers where its cursor was
  let r = 0, i = 0, film = null, programmatic = 0;

  const readout = document.querySelector('.readout');
  const out = {
    code: readout.querySelector('.r-code'), t: readout.querySelector('.r-t'),
    f: readout.querySelector('.r-f'), dim: readout.querySelector('.r-dim'),
  };
  const facts = a => [a.disc.join(', '), a.date, a.status].filter(Boolean);
  const ratio = a => (a.w / a.h).toFixed(2);
  const bigSizes = a => `(max-width:760px) ${Math.round(46 * a.w / a.h)}vh, ${Math.round(64 * a.w / a.h)}vh`;
  const smallSizes = a => `${Math.round(56 * a.w / a.h)}px`;

  const setSizes = (k, open) => plates[k].forEach((p, j) => {
    const img = p.querySelector('img');
    if (img) img.sizes = open ? bigSizes(byRel[k][j]) : smallSizes(byRel[k][j]);
  });

  /* Place a plate at the strip's reading edge. */
  const align = (smooth) => {
    const p = plates[r][i], strip = p.parentElement;
    const pad = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
    const left = strip.scrollLeft + p.getBoundingClientRect().left - strip.getBoundingClientRect().left - pad;
    programmatic = Date.now();
    strip.scrollTo({ left, behavior: smooth && !reduce.matches ? 'smooth' : 'auto' });
    strip.addEventListener('scrollend', () => { programmatic = Date.now(); }, { once: true });
  };

  const stopFilm = () => { if (film) { film.remove(); film = null; } };
  const startFilm = (a, p) => {
    if (a.kind !== 'video' || reduce.matches) return;
    film = document.createElement('video');
    Object.assign(film, { src: a.video, poster: a.src, muted: true, loop: true, playsInline: true, autoplay: true });
    film.setAttribute('aria-hidden', 'true');
    p.querySelector('a').append(film);
    film.play().catch(() => {});
  };

  function select(k, j, { scroll = true, hash = true } = {}) {
    k = Math.max(0, Math.min(k, tracks.length - 1));
    j = Math.max(0, Math.min(j, plates[k].length - 1));
    const changedTrack = k !== r;
    if (changedTrack) {
      tracks[r].classList.remove('on');
      tracks[r].querySelector('.lab-nm button').setAttribute('aria-expanded', 'false');
      setSizes(r, false);
      tracks[k].classList.add('on');
      tracks[k].querySelector('.lab-nm button').setAttribute('aria-expanded', 'true');
      setSizes(k, true);
    }
    plates[r][i].classList.remove('cur');
    plates[r][i].querySelector('a').removeAttribute('aria-current');
    r = k; i = j; last[r] = i;
    const p = plates[r][i], a = byRel[r][i];
    p.classList.add('cur');
    p.querySelector('a').setAttribute('aria-current', 'true');

    [i - 1, i + 1, i + 2].forEach(j => { const im = plates[r][j] && plates[r][j].querySelector('img'); if (im) im.loading = 'eager'; });
    stopFilm(); startFilm(a, p);

    out.code.textContent = `${a.code} ${a.no}.${a.n}`;
    out.t.innerHTML = a.title;
    out.f.textContent = facts(a).join(' · ');
    out.dim.textContent = a.kind === 'quote' ? 'Text' : `${a.w} × ${a.h} · ${ratio(a)} : 1`;
    readout.classList.remove('flash'); void readout.offsetWidth; readout.classList.add('flash');

    if (scroll) {
      if (changedTrack && !reduce.matches) {
        // Let the track finish opening, then bring the work to the reading edge.
        align(false);
        const t = tracks[r];
        const done = e => { if (e.target === t && e.propertyName === 'flex-basis') { t.removeEventListener('transitionend', done); align(true); } };
        t.addEventListener('transitionend', done);
        setTimeout(() => align(true), 320);
      } else align(!changedTrack);
    }
    if (hash) history.replaceState(null, '', '#' + a.id);
  }

  /* Pointer and touch. */
  document.querySelector('.tracks').addEventListener('click', e => {
    const lab = e.target.closest('.lab-nm button');
    if (lab) { const k = +lab.dataset.k; if (k !== r) select(k, last[k]); return; }
    const link = e.target.closest('.pl a');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    const p = link.parentElement, k = +p.closest('.tr').dataset.k, j = plates[k].indexOf(p);
    if (k === r && j === i) openViewer(link); else select(k, j);
  });

  /* Scrolling the open track by hand moves the cursor with it. */
  tracks.forEach((t, k) => {
    const strip = t.querySelector('.strip');
    let timer;
    strip.addEventListener('scroll', () => {
      if (k !== r || Date.now() - programmatic < 900) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (k !== r || Date.now() - programmatic < 900) return; // the track changed, or the instrument is still moving it
        const edge = strip.getBoundingClientRect().left + (parseFloat(getComputedStyle(strip).paddingLeft) || 0);
        let best = i, d = Infinity;
        plates[k].forEach((p, j) => { const x = Math.abs(p.getBoundingClientRect().left - edge); if (x < d) { d = x; best = j; } });
        if (best !== i) select(k, best, { scroll: false });
      }, 120);
    }, { passive: true });
  });

  /* Keyboard: the instrument's controls. */
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || (T.studioOpen && T.studioOpen()) || (viewer && viewer.isOpen())) return;
    const k = e.key;
    if (k === 'ArrowRight') select(r, i + 1);
    else if (k === 'ArrowLeft') select(r, i - 1);
    else if (k === 'ArrowDown') select(r + 1, last[Math.min(r + 1, 3)]);
    else if (k === 'ArrowUp') select(r - 1, last[Math.max(r - 1, 0)]);
    else if (k === 'Home') select(r, 0);
    else if (k === 'End') select(r, plates[r].length - 1);
    else if (/^[1-4]$/.test(k)) select(+k - 1, last[+k - 1]);
    else if (k === 'Enter' && !e.target.closest('a,button')) openViewer();
    else return;
    e.preventDefault();
    const focused = document.activeElement;
    if (focused && focused.closest && focused.closest('.pl')) plates[r][i].querySelector('a').focus({ preventScroll: true });
  });

  /* Viewer across the whole archive; closing it leaves the cursor where you ended. */
  const items = () => A.map(a => ({
    id: a.id, rel: a.rel, kind: a.kind, num: `${a.code} ${a.no}.${a.n}`, title: a.title, text: a.text,
    facts: facts(a).concat(a.kind === 'quote' ? [] : [`${a.w} × ${a.h}`]), note: a.note,
    src: a.src, srcset: a.srcset, alt: a.alt, video: a.video, quote: a.quote,
  }));
  const viewer = T.viewer ? T.viewer(items, {
    onMove: a => { const k = tracks.findIndex(t => t.id === a.rel); select(k, byRel[k].findIndex(x => x.id === a.id), { scroll: false, hash: false }); },
    onClose: () => { align(false); history.replaceState(null, '', '#' + byRel[r][i].id); plates[r][i].querySelector('a').focus({ preventScroll: true }); },
  }) : null;
  function openViewer(from) {
    if (!viewer) { location.href = byRel[r][i].dossier; return; }
    viewer.open(byRel[r][i].g, from || plates[r][i].querySelector('a'));
  }

  /* Deep links: #artifact-id selects it, #relationship opens its track. */
  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id || id === 'studio') return false;
    const a = A.find(x => x.id === id);
    if (a) { const k = tracks.findIndex(t => t.id === a.rel); select(k, byRel[k].indexOf(a), { hash: false }); return true; }
    const k = tracks.findIndex(t => t.id === id);
    if (k >= 0) { select(k, last[k], { hash: false }); return true; }
    return false;
  };
  addEventListener('hashchange', fromHash);
  setSizes(0, true);
  plates[0][0].classList.add('cur');
  plates[0][0].querySelector('a').setAttribute('aria-current', 'true');
  if (!fromHash()) select(0, 0, { scroll: false, hash: false });
})();
