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

  // Sections are hours, in the order of the day.
  const sections = $$('main > section[data-tone], .colophon');

  /*
   * Sun choreography: one keyframe per section, reached when that section's
   * top meets the top of the viewport. x/y are viewport fractions, s is vmin,
   * h is the horizon as a fraction of viewport height (>1 = hidden).
   */
  const KEYS = {
    wide: {
      'first-light': { baseline: true, x: .75, s: 46 },
      'practice':    { anchor: 'fruit', h: 1.04 },
      'few':         { x: .50, y: .20, s: 17, h: 1.04 },
      'contact':     { x: .80, y: .66, s: 34, h: 1.04 },
      'colophon':    { anchor: 'colophon', x: .5, s: 46 }
    },
    narrow: {
      'first-light': { baseline: true, x: .74, s: 70 },
      'practice':    { anchor: 'fruit', h: 1.04 },
      'few':         { x: .50, y: .19, s: 26, h: 1.04 },
      'contact':     { x: .80, y: .84, s: 46, h: 1.04 },
      'colophon':    { anchor: 'colophon', x: .5, s: 64 }
    }
  };

  const sun = $('.sun');
  const ground = $('.ground');
  const masthead = $('.masthead');
  const hand = $('.mark-hand');
  const clockTime = $('.clock-time');
  const clockName = $('.clock-name');
  const themeMeta = $('meta[name="theme-color"]');
  const navLinks = $$('.nav a[href^="#"]');

  let vw = 0, vh = 0, vmin = 0, sunBase = 0, docMax = 1;
  let stops = [], toneStops = [];
  let rise = reduced ? 0 : 1;   // sunrise offset on load (1 = below the horizon)
  let activeIndex = -1;

  function measure() {
    vw = root.clientWidth;
    // A stable viewport height, so mobile address bars don't make the sun jitter.
    const h = window.innerHeight;
    if (!vh || Math.abs(h - vh) > 120 || vw !== measure.lastW) vh = h;
    measure.lastW = vw;
    vmin = Math.min(vw, vh) / 100;
    if (vw < 900) vmin = Math.min(vmin, 5.2);   // keep the disc in proportion on tablets
    sunBase = Math.max(vw, vh);
    sun.style.width = sun.style.height = sunBase + 'px';

    const set = vw < 900 ? KEYS.narrow : KEYS.wide;
    const sy = window.scrollY;
    const docY = el => el.getBoundingClientRect().top + sy;
    docMax = Math.max(1, root.scrollHeight - vh);

    stops = sections.map(el => {
      const top = Math.min(docY(el), docMax);
      const key = Object.assign({}, set[el.id]);
      if (key.baseline) {
        // The horizon sits exactly on the baseline of "keeping."
        const probe = $('.baseline-probe');
        key.h = key.y = probe ? clamp((docY(probe) - top) / vh, .25, .92) : .78;
      }
      if (key.anchor === 'fruit') {
        // The sun settles into the heart of the fruit and travels with it.
        const r = $('.fruit svg').getBoundingClientRect();
        key.x = (r.left + r.width / 2) / vw;
        key.y = (r.top + sy + r.height / 2 - top) / vh;
        key.s = (r.width * 0.085) / vmin;
        key.track = true;
        key.holdUntil = top + Math.max(0, el.offsetHeight - vh * 0.9);
      }
      if (key.anchor === 'colophon') {
        // At the very end the sun sets on the last rule of the page.
        key.h = clamp((docY($('.colophon-meta')) - docMax) / vh, .5, 1);
        key.y = key.h + (key.s * vmin) * 0.34 / vh;
      }
      return { top, key };
    });
    stops.push({ top: docMax, key: stops[stops.length - 1].key });
    for (let i = 1; i < stops.length; i++) stops[i].top = Math.max(stops[i].top, stops[i - 1].top + 1);
    toneStops = sections.map(el => Math.min(docY(el), docMax));
  }

  function frameKey(y) {
    if (reduced) {
      const i = clamp(activeIndex, 0, stops.length - 1);
      const k = stops[i].key;
      return { x: k.x, y: k.y - (k.track ? (y - stops[i].top) / vh : 0), s: k.s, h: k.h };
    }
    let i = 0;
    while (i < stops.length - 1 && y >= stops[i + 1].top) i++;
    const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
    const ay = a.key.y - (a.key.track ? (y - a.top) / vh : 0);
    if (b === a || y < a.top) return { x: a.key.x, y: ay, s: a.key.s, h: a.key.h };
    const start = Math.min(Math.max(a.top, a.key.holdUntil || a.top), b.top - 1);
    const t = smooth(clamp((y - start) / (b.top - start), 0, 1));
    return { x: lerp(a.key.x, b.key.x, t), y: lerp(ay, b.key.y, t), s: lerp(a.key.s, b.key.s, t), h: lerp(a.key.h, b.key.h, t) };
  }

  function renderSky() {
    const y = window.scrollY;
    const k = frameKey(y);
    const size = k.s * vmin;
    const cx = k.x * vw;
    const cy = k.y * vh + rise * size * 0.62;
    sun.style.transform = `translate3d(${(cx - sunBase / 2).toFixed(1)}px, ${(cy - sunBase / 2).toFixed(1)}px, 0) scale(${(size / sunBase).toFixed(4)})`;
    ground.style.transform = `translate3d(0, ${(k.h * vh).toFixed(1)}px, 0)`;
    // The mark is a clock: one full turn over the day, back to twelve.
    if (hand) hand.style.setProperty('--hand', (clamp(y / docMax, 0, 1) * 360).toFixed(1) + 'deg');
    masthead.classList.toggle('is-scrolled', y > 8);
  }

  // Tone: the section at the middle of the screen sets the hour.
  const THEME = { dawn: '#E8E3DC', day: '#F4F0E9', noon: '#FBFAF7', golden: '#F25A28', night: '#121113' };
  function updateTone() {
    const mid = window.scrollY + vh * 0.5;
    let idx = 0;
    toneStops.forEach((t, i) => { if (t <= mid) idx = i; });
    if (window.scrollY >= docMax - 2) idx = sections.length - 1;
    if (idx === activeIndex) return;
    activeIndex = idx;
    const el = sections[idx];
    body.dataset.tone = el.dataset.tone;
    if (themeMeta) themeMeta.setAttribute('content', THEME[el.dataset.tone]);
    if (clockTime) { clockTime.textContent = el.dataset.hour; clockName.textContent = el.dataset.name; }
    navLinks.forEach(a => {
      if (a.getAttribute('href') === '#' + el.id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateTone(); renderSky(); });
  }

  /* ------------------------------------------------------------------
   * 10:00 — one fruit, six segments. It turns slowly through the practice;
   * pointing at a name or a segment holds it there.
   * ---------------------------------------------------------------- */
  const names = $$('.disciplines li');
  const segments = $$('.fruit path');
  let current = -1, held = false, cycle = null;
  function select(i) {
    current = i;
    names.forEach((n, j) => n.classList.toggle('is-active', j === i));
    segments.forEach((p, j) => p.classList.toggle('is-active', j === i));
  }
  const hold = i => { held = true; select(i); };
  const release = () => { held = false; };
  [names, segments].forEach(list => list.forEach((el, i) => {
    el.addEventListener('pointerenter', () => hold(i));
    el.addEventListener('pointerleave', release);
  }));
  if (names.length) {
    select(0);
    const start = () => { if (!cycle && !reduced) cycle = setInterval(() => { if (!held) select((current + 1) % names.length); }, 2400); };
    const stop = () => { clearInterval(cycle); cycle = null; };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: .35 }).observe($('.practice'));
    }
  }

  // Reveals.
  const reveals = $$('[data-reveal]');
  reveals.forEach(el => {
    const i = $$(':scope > [data-reveal]', el.parentElement).indexOf(el);
    if (i > 0) el.style.setProperty('--d', (i * 120) + 'ms');
  });
  if ('IntersectionObserver' in window && !reduced) {
    const rio = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(el => rio.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }
  $$('[data-rise]').forEach((el, i) => el.style.setProperty('--i', i));

  /* ------------------------------------------------------------------
   * Boot.
   * ---------------------------------------------------------------- */
  function layout() { measure(); activeIndex = -1; updateTone(); renderSky(); }
  let resizeTimer;
  const relayout = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); };

  layout();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', relayout);
  window.addEventListener('load', layout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe($('main'));
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
  fontsReady.then(layout);
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 900))]).then(() => requestAnimationFrame(begin));
})();
