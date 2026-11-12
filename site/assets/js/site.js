/*
 * Tangerine — "First Light"
 * A single day told by scroll. No dependencies, no tracking, no storage.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  /* ------------------------------------------------------------------
   * Sections are hours. The order here is the order of the day.
   * ---------------------------------------------------------------- */
  const sections = $$('main > section[data-tone], .colophon');

  /*
   * Sun choreography. One keyframe per section, applied when that section's
   * top reaches the top of the viewport; positions in viewport fractions,
   * size in vmin, horizon as a fraction of viewport height (>1 = hidden).
   */
  const KEYS = {
    wide: {
      'first-light': { x: .75, y: .78, s: 46, h: .78, baseline: true },
      'between':     { x: .84, y: .30, s: 24, h: 1.04 },
      'practice':    { anchor: 'fruit', h: 1.04 },
      'few':         { x: .50, y: .19, s: 17, h: 1.04 },
      'method':      { anchor: 'dial', h: 1.04 },
      'principles':  { x: .86, y: .70, s: 32, h: 1.04 },
      'cole':        { x: .84, y: .99, s: 24, h: .955 },
      'contact':     { x: .70, y: 1.30, s: 24, h: 1.04 },
      'end':         { anchor: 'colophon', x: .5, s: 46 }
    },
    narrow: {
      'first-light': { x: .74, y: .80, s: 70, h: .80, baseline: true },
      'between':     { x: .86, y: .16, s: 26, h: 1.04 },
      'practice':    { anchor: 'fruit', h: 1.04 },
      'few':         { x: .50, y: .19, s: 26, h: 1.04 },
      'method':      { x: 1.2, y: .30, s: 14, h: 1.04 },
      'principles':  { x: .84, y: .88, s: 46, h: 1.04 },
      'cole':        { x: .80, y: 1.0, s: 36, h: .965 },
      'contact':     { x: .70, y: 1.30, s: 30, h: 1.04 },
      'end':         { anchor: 'colophon', x: .5, s: 64 }
    }
  };

  const sky = $('.sky');
  const sun = $('.sun');
  const ground = $('.ground');
  const masthead = $('.masthead');
  const hand = $('.masthead .mark-hand');
  const clockTime = $('.clock-time');
  const clockName = $('.clock-name');
  const themeMeta = $('meta[name="theme-color"]');
  const navLinks = $$('.nav a[href^="#"]');

  let vw = 0, vh = 0, vmin = 0, sunBase = 0;
  let stops = [];          // [{ top, key }]
  let toneStops = [];
  let docMax = 1;
  let rise = reduced ? 0 : 1;   // entrance offset (1 = below horizon)
  let activeIndex = -1;

  function measure() {
    vw = root.clientWidth;
    // Use a stable viewport height so mobile URL bars don't make the sun jitter.
    const h = window.innerHeight;
    if (!vh || Math.abs(h - vh) > 120 || vw !== measure.lastW) vh = h;
    measure.lastW = vw;
    // Sun sizes are in vmin; on tablets cap the unit so the disc never swamps the page.
    vmin = Math.min(vw, vh) / 100;
    if (vw < 900) vmin = Math.min(vmin, 5.2);
    sunBase = Math.max(vw, vh);
    sun.style.width = sun.style.height = sunBase + 'px';

    const set = vw < 900 ? KEYS.narrow : KEYS.wide;
    const sy = window.scrollY;
    const docY = el => el.getBoundingClientRect().top + sy;
    const headH = masthead.offsetHeight;
    docMax = Math.max(1, root.scrollHeight - vh);

    stops = sections.map(el => {
      const base = set[el.id] || set.end;
      const top = Math.min(docY(el), docMax);
      const key = Object.assign({}, base);
      if (base.baseline) {
        // The horizon sits exactly on the baseline of the hero's last line.
        const probe = $('.baseline-probe');
        if (probe) key.h = key.y = clamp((docY(probe) - top) / vh, .25, .92);
      }
      if (base.anchor === 'fruit') {
        // The sun settles into the heart of the fruit and travels with it.
        const r = $('.fruit svg').getBoundingClientRect();
        key.x = (r.left + r.width / 2) / vw;
        key.y = (r.top + sy + r.height / 2 - top) / vh;
        key.s = (r.width * 0.085) / vmin;
        key.track = true;
        key.holdUntil = top + Math.max(0, el.offsetHeight - vh * 0.9);
      }
      if (base.anchor === 'dial') {
        // The sun becomes the pivot of the dial while the dial is held in place.
        const wrap = $('.dial-wrap'), dial = $('.dial');
        const wr = wrap.getBoundingClientRect(), dr = dial.getBoundingClientRect();
        const stickTop = headH + vh * 0.04;
        const stuckAt = wr.top + sy - stickTop;
        const bodyEl = $('.method-body');
        const releaseAt = docY(bodyEl) + bodyEl.offsetHeight - wr.height - stickTop;
        key.x = (dr.left + dr.width / 2) / vw;
        key.y = (stickTop + (dr.top - wr.top) + dr.height / 2) / vh;
        key.s = (dr.width * 0.1) / vmin;
        key.at = Math.max(top, stuckAt);
        key.holdUntil = Math.max(key.at, releaseAt);
      }
      if (base.anchor === 'colophon') {
        // At the very end the sun rests on the last rule of the page.
        const meta = $('.colophon-meta');
        key.h = clamp((docY(meta) - docMax) / vh, .5, 1);
        key.y = key.h + (key.s * vmin) * 0.34 / vh;
      }
      return { top: key.at || top, key };
    });
    stops.push({ top: docMax, key: stops[stops.length - 1].key });
    for (let i = 1; i < stops.length; i++) stops[i].top = Math.max(stops[i].top, stops[i - 1].top + 1);
    toneStops = sections.map(el => Math.min(docY(el), docMax));
  }

  function frameKey(y) {
    if (reduced) {
      const i = Math.max(0, activeIndex);
      const k = stops[Math.min(i, stops.length - 1)].key;
      return { x: k.x, y: k.y - (k.track ? (y - stops[i].top) / vh : 0), s: k.s, h: k.h };
    }
    let i = 0;
    while (i < stops.length - 1 && y >= stops[i + 1].top) i++;
    const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
    const ay = a.key.y - (a.key.track ? (y - a.top) / vh : 0);
    if (y < a.top) return { x: a.key.x, y: ay, s: a.key.s, h: a.key.h };
    const start = Math.min(Math.max(a.top, a.key.holdUntil || a.top), b.top - 1);
    const t = b === a ? 0 : smooth(clamp((y - start) / (b.top - start), 0, 1));
    return {
      x: lerp(a.key.x, b.key.x, t),
      y: lerp(ay, b.key.y, t),
      s: lerp(a.key.s, b.key.s, t),
      h: lerp(a.key.h, b.key.h, t)
    };
  }

  function renderSky() {
    const y = window.scrollY;
    const k = frameKey(y);
    const size = k.s * vmin;
    const cx = k.x * vw;
    const cy = k.y * vh + rise * size * 0.62;
    const scale = size / sunBase;
    sun.style.transform = `translate3d(${(cx - sunBase / 2).toFixed(1)}px, ${(cy - sunBase / 2).toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    ground.style.transform = `translate3d(0, ${(k.h * vh).toFixed(1)}px, 0)`;

    // The masthead mark is a clock: one full turn across the day, back to twelve.
    const p = clamp(y / docMax, 0, 1);
    if (hand) hand.style.setProperty('--hand', (p * 360).toFixed(1) + 'deg');
    masthead.classList.toggle('is-scrolled', y > 8);
  }

  /* ------------------------------------------------------------------
   * Tone: the section at the middle of the screen sets the hour.
   * ---------------------------------------------------------------- */
  const THEME = { dawn: '#E8E3DC', morning: '#F1ECE4', day: '#F6F3ED', noon: '#FBFAF7', afternoon: '#F3ECE1', golden: '#F25A28', dusk: '#2B2023', night: '#121113' };

  function updateTone() {
    const mid = window.scrollY + vh * 0.5;
    let idx = 0;
    for (let i = 0; i < sections.length; i++) {
      if (toneStops[i] <= mid) idx = i;
    }
    // At the very bottom, the colophon is the hour.
    if (window.scrollY >= docMax - 2) idx = sections.length - 1;
    if (idx === activeIndex) return;
    activeIndex = idx;
    const el = sections[idx];
    const tone = el.dataset.tone || 'night';
    body.dataset.tone = tone;
    if (themeMeta) themeMeta.setAttribute('content', THEME[tone] || '#121113');
    if (el.dataset.hour && clockTime) {
      clockTime.textContent = el.dataset.hour;
      clockName.textContent = el.dataset.name;
    }
    navLinks.forEach(a => {
      const on = a.getAttribute('href') === '#' + el.id;
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateTone();
      renderSky();
      scrubStatement();
    });
  }

  /* ------------------------------------------------------------------
   * 08:00 — the statement fills in word by word as it is read.
   * ---------------------------------------------------------------- */
  const statement = $('[data-scrub]');
  let words = [];
  if (statement) {
    const wrap = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          wrap(child);
        }
      });
    };
    wrap(statement);
    words = $$('.w', statement);
  }
  let lastLit = -1;
  function scrubStatement() {
    if (!words.length) return;
    if (reduced) { if (lastLit !== words.length) { words.forEach(w => w.classList.add('is-on')); lastLit = words.length; } return; }
    const r = statement.getBoundingClientRect();
    const start = vh * 0.82, end = vh * 0.38;
    const t = clamp((start - r.top) / (start - end + r.height * 0.6), 0, 1);
    const lit = Math.round(t * words.length);
    if (lit === lastLit) return;
    lastLit = lit;
    words.forEach((w, i) => w.classList.toggle('is-on', i < lit));
  }

  /* ------------------------------------------------------------------
   * 10:00 — one fruit, six segments.
   * ---------------------------------------------------------------- */
  const disciplines = $$('.discipline');
  const segments = $$('.fruit path');
  const panel = $('.practice-panel');
  const fruitNum = $('.fruit-num');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let current = -1;

  function selectDiscipline(i, { focus = false } = {}) {
    if (i === current || i < 0 || i >= disciplines.length) return;
    current = i;
    disciplines.forEach((li, j) => {
      const on = j === i;
      li.classList.toggle('is-active', on);
      $('.discipline-name', li).setAttribute('aria-expanded', String(on));
    });
    segments.forEach((p, j) => p.classList.toggle('is-active', j === i));
    if (fruitNum) fruitNum.textContent = String(i + 1).padStart(2, '0');
    if (panel) {
      const li = disciplines[i];
      const wrap = document.createElement('div');
      wrap.className = 'panel-in';
      const h = document.createElement('h3');
      h.textContent = $('.label', li).textContent;
      wrap.appendChild(h);
      Array.from($('.discipline-detail', li).children).forEach(c => wrap.appendChild(c.cloneNode(true)));
      panel.replaceChildren(wrap);
    }
    if (focus) $('.discipline-name', disciplines[i]).focus();
  }

  disciplines.forEach((li, i) => {
    const btn = $('.discipline-name', li);
    btn.addEventListener('click', () => selectDiscipline(i));
    btn.addEventListener('pointerenter', () => { if (finePointer.matches) selectDiscipline(i); });
    btn.addEventListener('keydown', e => {
      const n = disciplines.length;
      let to = null;
      if (e.key === 'ArrowDown') to = (i + 1) % n;
      if (e.key === 'ArrowUp') to = (i - 1 + n) % n;
      if (e.key === 'Home') to = 0;
      if (e.key === 'End') to = n - 1;
      if (to !== null) { e.preventDefault(); selectDiscipline(to, { focus: true }); }
    });
  });
  segments.forEach((p, i) => {
    p.addEventListener('click', () => selectDiscipline(i));
    p.addEventListener('pointerenter', () => { if (finePointer.matches) selectDiscipline(i); });
  });
  if (disciplines.length) selectDiscipline(0);

  /* ------------------------------------------------------------------
   * 15:00 — the dial. Six stations; the hand returns to twelve.
   * ---------------------------------------------------------------- */
  const ticks = $('.dial-ticks');
  if (ticks) {
    const ns = 'http://www.w3.org/2000/svg';
    for (let m = 0; m < 60; m++) {
      const hour = m % 5 === 0;
      const a = (m * 6 - 90) * Math.PI / 180;
      const r1 = 150, r2 = hour ? 136 : 143;
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', (r1 * Math.cos(a)).toFixed(2));
      l.setAttribute('y1', (r1 * Math.sin(a)).toFixed(2));
      l.setAttribute('x2', (r2 * Math.cos(a)).toFixed(2));
      l.setAttribute('y2', (r2 * Math.sin(a)).toFixed(2));
      if (hour) l.setAttribute('class', 'hour');
      ticks.appendChild(l);
    }
  }
  const steps = $$('.step');
  const dial = $('.dial');
  const dialNum = $('.dial-num');
  const dialWord = $('.dial-word');
  const stations = $$('.dial-stations text');
  function setStep(i) {
    steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    stations.forEach((t, j) => {
      t.classList.toggle('is-active', j === i);
      t.classList.toggle('is-past', j < i);
    });
    if (dial) dial.style.setProperty('--dial', ((i + 1) * 60) + 'deg');
    if (dialNum) dialNum.textContent = i < 0 ? '00' : String(i + 1).padStart(2, '0');
    if (dialWord) dialWord.textContent = i < 0 ? 'Twelve' : $('h3', steps[i]).textContent;
  }
  if (steps.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setStep(steps.indexOf(e.target)); });
    }, { rootMargin: '-48% 0px -48% 0px' });
    steps.forEach(s => io.observe(s));
    setStep(-1);
  }

  /* ------------------------------------------------------------------
   * Reveals.
   * ---------------------------------------------------------------- */
  const reveals = $$('[data-reveal]');
  reveals.forEach(el => {
    const sibs = $$(':scope > [data-reveal]', el.parentElement);
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', (i * 90) + 'ms');
  });
  if ('IntersectionObserver' in window && !reduced) {
    const rio = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(el => rio.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }
  $$('[data-rise]').forEach((el, i) => el.style.setProperty('--i', i));

  /* ------------------------------------------------------------------
   * Index (small screens).
   * ---------------------------------------------------------------- */
  const toggle = $('.menu-toggle');
  const indexPanel = $('#index-panel');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    $('.menu-toggle-label', toggle).textContent = open ? 'Close' : 'Index';
    indexPanel.hidden = !open;
    body.style.overflow = open ? 'hidden' : '';
    if (open) $('a', indexPanel).focus();
  }
  if (toggle && indexPanel) {
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    indexPanel.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !indexPanel.hidden) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches && !indexPanel.hidden) setMenu(false); });
  }

  /* ------------------------------------------------------------------
   * Local time: a small courtesy, computed on the visitor's device only.
   * ---------------------------------------------------------------- */
  const greeting = $('[data-greeting]');
  const localTime = $('[data-localtime] span');
  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const h = now.getHours();
    const part = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    if (greeting) greeting.textContent = `${part} — ${hh}:${mm} where you are`;
    if (localTime) localTime.textContent = `${hh}:${mm}`;
  }
  tick();
  setInterval(tick, 20000);

  /* ------------------------------------------------------------------
   * Composer: writes an email in the visitor's own mail app.
   * ---------------------------------------------------------------- */
  const form = $('.composer');
  if (form) {
    const email = form.dataset.email;
    const status = $('.composer-status', form);
    $$('.email-link').forEach(a => { a.href = 'mailto:' + email; a.textContent = email; });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fields = ['name', 'email', 'note'].map(n => form.elements[n]);
      let firstBad = null;
      fields.forEach(f => {
        const ok = f.value.trim() && (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
        f.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !firstBad) firstBad = f;
      });
      if (firstBad) {
        status.textContent = firstBad.name === 'email' && firstBad.value.trim()
          ? 'That email address doesn’t look quite right.'
          : 'A name, an email address and a few words about the work are all we need.';
        firstBad.focus();
        return;
      }
      const name = form.elements.name.value.trim();
      const interests = $$('input[name="interest"]:checked', form).map(c => c.value);
      const when = form.elements.when.value;
      const lines = [
        form.elements.note.value.trim(),
        '',
        '—',
        `From: ${name} <${form.elements.email.value.trim()}>`,
        interests.length ? `Where we might begin: ${interests.join(', ')}` : null,
        when ? `Timing: ${when}` : null
      ].filter(l => l !== null);
      const href = `mailto:${email}?subject=${encodeURIComponent('A conversation with ' + name)}&body=${encodeURIComponent(lines.join('\n'))}`;
      window.location.href = href;
      status.innerHTML = '';
      status.append('Your note should now be open in your email app. If nothing appeared, write to ');
      const a = document.createElement('a');
      a.href = 'mailto:' + email; a.textContent = email;
      status.append(a, '.');
    });
    form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') e.target.removeAttribute('aria-invalid'); });
  }

  /* ------------------------------------------------------------------
   * Boot.
   * ---------------------------------------------------------------- */
  function layout() { measure(); activeIndex = -1; updateTone(); renderSky(); scrubStatement(); }

  layout();
  window.addEventListener('scroll', onScroll, { passive: true });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });
  window.addEventListener('load', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); }).observe($('main'));

  motionQuery.addEventListener('change', e => { reduced = e.matches; rise = 0; layout(); });

  // Sunrise.
  const begin = () => {
    root.classList.add('is-ready');
    if (reduced || window.scrollY > vh * 0.5) { rise = 0; renderSky(); return; }
    const t0 = performance.now(), dur = 2200;
    const step = now => {
      const t = clamp((now - t0) / dur, 0, 1);
      rise = Math.pow(1 - t, 3);
      renderSky();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 900))]).then(() => requestAnimationFrame(begin));
})();
