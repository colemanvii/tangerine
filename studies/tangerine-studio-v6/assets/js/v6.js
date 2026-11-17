/* Tangerine — Design No. 06
   The full stop, the lens, the width axis, and the work playing at full size.
   Plain JavaScript, no dependencies. Every page reads in full without it. */
(function () {
  'use strict';
  var doc = document, W = window;
  var reduce = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var phone = W.matchMedia('(max-width: 820px)');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var me = doc.currentScript || $('script[src*="assets/js/v6.js"]');
  var ROOT = me ? me.src.replace(/assets\/js\/v6\.js.*$/, '') : '';
  var frameHooks = [];
  var onFrame = function (fn) { frameHooks.push(fn); };

  /* ——— Georgia time ——— */
  (function () {
    var clocks = $$('[data-clock]'), now = $$('[data-now]');
    if (!clocks.length && !now.length) return;
    var fmt, hr;
    try {
      fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
      hr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' });
    } catch (e) { return; }
    function tick() {
      var d = new Date(), t = fmt.format(d), h = parseInt(hr.format(d), 10) % 24;
      clocks.forEach(function (c) { c.textContent = 'Georgia ' + t; });
      var line = h >= 7 && h < 19 ? 'The studio is probably working.'
        : h >= 19 && h < 23 ? 'The studio is probably still working.'
        : 'The studio is asleep. Leave a message.';
      now.forEach(function (n) { n.textContent = 'It’s ' + t + ' in Georgia. ' + line; });
    }
    tick(); setInterval(tick, 20000);
  })();

  /* ——— Fit a line of type to its column ——— */
  function fit(el) {
    var p = el.parentElement, cs = getComputedStyle(p);
    var avail = p.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    el.style.setProperty('--fit', '100px');
    var w = el.getBoundingClientRect().width;
    if (!w) return;
    var size = avail / (w / 100 - 0.05);  /* -0.05em: the optical left margin */
    var maxVh = parseFloat(el.dataset.maxVh || '0');
    if (maxVh) size = Math.min(size, W.innerHeight * maxVh);
    el.style.setProperty('--fit', size.toFixed(2) + 'px');
  }
  function fitAll() { $$('[data-fit]').forEach(fit); }

  /* ——— Header tone follows the world under it ——— */
  var head = $('.site-head'), heroTone = null, metaTheme = $('meta[name="theme-color"]');
  var COLORS = { paper: '#F4F4F0', orange: '#FF5A1F', night: '#0D0D0C', ivory: '#FFF9F1', kc: '#FCE0BB' };
  var tones = $$('[data-tone]').filter(function (el) { return !el.closest('.menu'); });
  function headTone() {
    if (!head) return;
    var y = 28, best = null, bh = Infinity;
    for (var i = 0; i < tones.length; i++) {
      var r = tones[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y && r.height < bh) { best = tones[i]; bh = r.height; }
    }
    var t = heroTone || (best ? best.dataset.tone : 'paper');
    var h = t === 'night' ? 'night' : t === 'orange' ? 'orange' : 'paper';
    if (head.dataset.head !== h) head.dataset.head = h;
    var bg = W.scrollY < 8 ? 'transparent' : (COLORS[t] || COLORS.paper);
    if (head._bg !== bg) { head._bg = bg; head.style.setProperty('--hbg', bg); }
    var sy = W.scrollY, dy = sy - (head._y || 0);
    if (Math.abs(dy) > 6) {
      var tuck = dy > 0 && sy > 240 && !doc.body.classList.contains('menu-open') && !head.contains(doc.activeElement);
      head.classList.toggle('is-tucked', tuck); head._y = sy;
    }
    if (metaTheme && COLORS[t] && metaTheme.content !== COLORS[t]) metaTheme.content = COLORS[t];
  }
  onFrame(headTone);

  /* ——— Menu: the dot opens it ——— */
  (function () {
    var btn = $('.menu-btn'), menu = $('#menu');
    if (!btn || !menu) return;
    var label = btn.querySelector('span');
    function set(open) {
      if (open) {
        var r = btn.getBoundingClientRect();
        menu.style.setProperty('--mx', (r.right - 6) + 'px');
        menu.style.setProperty('--my', (r.top + r.height / 2) + 'px');
        menu.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
        doc.body.classList.add('menu-open');
        btn.setAttribute('aria-expanded', 'true'); label.textContent = 'Close';
        var first = menu.querySelector('a'); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 50);
      } else {
        menu.classList.remove('is-open');
        doc.body.classList.remove('menu-open');
        btn.setAttribute('aria-expanded', 'false'); label.textContent = 'Menu';
        setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduce ? 0 : 700);
      }
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
    phone.addEventListener && phone.addEventListener('change', function (e) { if (!e.matches) set(false); });
  })();

  /* ——— The full stop ———
     It sits after the name. You can throw it. It comes back.
     Scroll, and it becomes the whole screen. */
  (function () {
    var track = $('.hero-track'), hero = $('.hero'), fill = $('.hero-fill'), wm = $('.wm'), socket = $('.socket'), dot = $('.fstop'), hint = $('[data-hint]');
    if (!hero || !wm || !socket || !dot) return;
    var D = 56, home = { x: 0, y: 0 }, size = { w: 0, h: 0 }, headH = 60;
    var s = { x: 0, y: 0, vx: 0, vy: 0, mode: 'home', sq: 0, sqv: 0, axis: 0, restAt: 0, throws: 0, ret: null, S: 1 };
    var G = 2800, REST = 0.52;

    var LINES = [
      'Please don’t throw the full stop.',
      'That was the full stop.',
      'It always comes back.',
      'Again? Fine.',
      'This is a game now, isn’t it.',
      'You’re good at this. <a href="#hello">Should we talk?</a>'
    ];
    function say(html) { if (hint && hint.innerHTML !== html) hint.innerHTML = html; }

    function layout() {
      var vertical = phone.matches;
      var hcs = getComputedStyle(hero);
      var padL = parseFloat(hcs.paddingLeft), padR = parseFloat(hcs.paddingRight);
      var padT = parseFloat(hcs.paddingTop), padB = parseFloat(hcs.paddingBottom);
      hero.style.setProperty('--wm', '100px');
      var r = wm.getBoundingClientRect(), fs;
      if (vertical) {
        var availH = hero.clientHeight - padT - padB;
        fs = 100 * availH / r.height;
        fs = Math.min(fs, (hero.clientWidth - padL - padR) * 0.36 / 0.8);
        hero.style.setProperty('--spine', Math.ceil(fs * 0.8) + 'px');
      } else {
        var availW = hero.clientWidth - padL - padR;
        fs = availW / (r.width / 100 - 0.05);
        fs = Math.min(fs, hero.clientHeight * 0.36);
      }
      hero.style.setProperty('--wm', fs.toFixed(2) + 'px');
      var hr = hero.getBoundingClientRect(), sr = socket.getBoundingClientRect();
      D = sr.width;
      dot.style.setProperty('--d', D + 'px');
      home.x = sr.left - hr.left; home.y = sr.top - hr.top;
      size.w = hero.clientWidth; size.h = hero.clientHeight;
      headH = head ? head.offsetHeight : 60;
      if (s.mode === 'home') { s.x = home.x; s.y = home.y; }
      else { s.x = clamp(s.x, 0, size.w - D); s.y = clamp(s.y, 0, size.h - D); }
      dot.classList.add('ready');
      render();
    }

    function render() {
      var sx = 1, sy = 1, a = 0;
      if (s.mode === 'fly') {
        var sp = Math.hypot(s.vx, s.vy), k = Math.min(0.22, sp / 9000);
        a = Math.atan2(s.vy, s.vx); sx = 1 + k; sy = 1 - k * 0.8;
      }
      var q = s.sq;
      if (q) { if (s.axis === 0) { sx *= 1 + q; sy *= 1 - q; } else { sx *= 1 - q; sy *= 1 + q; } }
      var S = s.S;
      dot.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,' + s.y.toFixed(2) + 'px,0) rotate(' + a.toFixed(3) + 'rad) scale(' + (sx * S).toFixed(4) + ',' + (sy * S).toFixed(4) + ')';
    }

    function impact(v, axis) { var k = clamp(Math.abs(v) / 5200, 0, 0.32); if (k > 0.03) { s.sq = k; s.sqv = 0; s.axis = axis; } }
    function away(on) { hero.classList.toggle('is-away', on); }

    function startReturn() {
      var dx = home.x - s.x, dy = home.y - s.y, dist = Math.hypot(dx, dy);
      s.ret = { x0: s.x, y0: s.y, t0: performance.now(), T: 520 + Math.min(700, dist * 0.6), h: Math.max(80, Math.min(260, dist * 0.45)) };
      s.mode = 'return'; s.vx = s.vy = 0;
    }

    function step(dt, now) {
      if (s.mode === 'fly') {
        s.vy += G * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        var floor = size.h - D - 8, right = size.w - D;
        if (s.y > floor) { s.y = floor; if (s.vy > 0) { impact(s.vy, 0); s.vy = Math.abs(s.vy) < 140 ? 0 : -s.vy * REST; s.vx *= 0.8; } }
        if (s.y < headH) { s.y = headH; if (s.vy < 0) { impact(s.vy, 0); s.vy = -s.vy * REST; } }
        if (s.x < 0) { s.x = 0; impact(s.vx, 1); s.vx = -s.vx * REST; }
        if (s.x > right) { s.x = right; impact(s.vx, 1); s.vx = -s.vx * REST; }
        if (s.y >= floor - 0.5 && s.vy === 0) {
          s.vx *= Math.pow(0.02, dt);
          if (Math.abs(s.vx) < 6) { s.vx = 0; s.mode = 'rest'; s.restAt = now; }
        }
      } else if (s.mode === 'rest') {
        if (now - s.restAt > 1300) startReturn();
      } else if (s.mode === 'return') {
        var r = s.ret, t = clamp((now - r.t0) / r.T, 0, 1), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        s.x = r.x0 + (home.x - r.x0) * e;
        s.y = r.y0 + (home.y - r.y0) * e - r.h * 4 * t * (1 - t);
        if (t >= 1) {
          s.mode = 'home'; s.x = home.x; s.y = home.y; impact(2600, 0); away(false);
          say(s.throws < 3 ? 'Sentence restored.' : LINES[Math.min(s.throws, LINES.length - 1)]);
        }
      }
      /* squash spring */
      if (s.sq || s.sqv) {
        s.sqv += (-700 * s.sq - 16 * s.sqv) * dt; s.sq += s.sqv * dt;
        if (Math.abs(s.sq) < 0.002 && Math.abs(s.sqv) < 0.02) { s.sq = 0; s.sqv = 0; }
      }
    }

    function throwDot(vx, vy, counts) {
      s.vx = clamp(vx, -6000, 6000); s.vy = clamp(vy, -6000, 6000); s.mode = 'fly'; away(true);
      if (counts) { s.throws++; say(LINES[Math.min(s.throws, LINES.length - 1)]); }
    }

    /* pointer: grab, drag, throw */
    var samples = [], grab = null, lastUp = 0;
    dot.addEventListener('pointerdown', function (e) {
      if (reduce || hero.classList.contains('is-expanding')) return;
      e.preventDefault();
      dot.setPointerCapture(e.pointerId);
      var hr = hero.getBoundingClientRect();
      grab = { ox: e.clientX - hr.left - s.x, oy: e.clientY - hr.top - s.y, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 };
      s.mode = 'drag'; s.vx = s.vy = 0; samples = [{ t: grab.t, x: e.clientX, y: e.clientY }];
    });
    dot.addEventListener('pointermove', function (e) {
      if (!grab) return;
      var hr = hero.getBoundingClientRect();
      s.x = clamp(e.clientX - hr.left - grab.ox, 0, size.w - D);
      s.y = clamp(e.clientY - hr.top - grab.oy, headH, size.h - D - 8);
      grab.moved = Math.max(grab.moved, Math.hypot(e.clientX - grab.sx, e.clientY - grab.sy));
      if (grab.moved > 4) away(true);
      var t = performance.now(); samples.push({ t: t, x: e.clientX, y: e.clientY });
      while (samples.length > 2 && t - samples[0].t > 90) samples.shift();
    });
    function up(e) {
      if (!grab) return;
      lastUp = performance.now();
      if (grab.moved < 5) {             /* a tap: it hops */
        throwDot((Math.random() - 0.5) * 500, -1100, true);
      } else {
        var a = samples[0], b = samples[samples.length - 1], dt = Math.max(16, b.t - a.t) / 1000;
        throwDot((b.x - a.x) / dt, (b.y - a.y) / dt, true);
      }
      grab = null;
    }
    dot.addEventListener('pointerup', up);
    dot.addEventListener('pointercancel', up);
    dot.addEventListener('click', function () {   /* keyboard */
      if (performance.now() - lastUp < 500) return;
      if (reduce) { say('Even the full stop is resting today.'); return; }
      if (s.mode === 'home') throwDot((Math.random() < 0.5 ? -1 : 1) * (900 + Math.random() * 900), -1900, true);
      else startReturn();
    });

    /* scroll: the full stop becomes the whole screen */
    var trackLen = 1;
    function measureTrack() { trackLen = Math.max(1, track.offsetHeight - W.innerHeight); }
    function expansion() {
      if (reduce) return;
      var p = clamp((W.scrollY - track.offsetTop) / trackLen, 0, 1);
      if (p > 0.002 && (s.mode === 'fly' || s.mode === 'rest' || s.mode === 'drag')) { grab = null; startReturn(); }
      var e = s.mode === 'home' ? Math.pow(clamp((p - 0.03) / 0.77, 0, 1), 2.1) : 0;
      var cx = s.x + D / 2, cy = s.y + D / 2;
      var R = Math.max(Math.hypot(cx, cy), Math.hypot(size.w - cx, cy), Math.hypot(cx, size.h - cy), Math.hypot(size.w - cx, size.h - cy)) + 4;
      var r = D / 2 + (R - D / 2) * e;
      s.S = 1;
      if (fill && e > 0) fill.style.clipPath = 'circle(' + r.toFixed(1) + 'px at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px)';
      hero.classList.toggle('is-expanding', e > 0);
      hero.classList.toggle('is-full', e >= 0.999);
      heroTone = (p < 1 && r > Math.hypot(cx, cy) * 0.9) ? 'orange' : null;
    }

    var last = performance.now();
    onFrame(function (now) {
      var dt = Math.min(0.033, (now - last) / 1000); last = now;
      var hr = hero.getBoundingClientRect();
      if (hr.bottom < 0 || hr.top > W.innerHeight) { heroTone = null; return; }
      if (s.mode !== 'drag') step(dt, now);
      expansion();
      render();
    });

    if (reduce) say('A full stop. It stays put.');
    else say(LINES[0]);
    measureTrack(); layout();
    W.addEventListener('resize', function () { measureTrack(); layout(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { measureTrack(); layout(); });
  })();

  /* ——— Reveal on arrival ——— */
  (function () {
    var els = $$('.rv, .rv-clip');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in W)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  })();

  /* ——— The lens: the dot again, carrying a picture of the work ——— */
  (function () {
    var rows = $$('[data-pv]');
    if (!rows.length || !fine) return;
    var lens = doc.createElement('div');
    lens.className = 'lens'; lens.setAttribute('aria-hidden', 'true');
    var hat = $('#hat-svg');
    lens.innerHTML =
      '<canvas class="globe" data-l="globe" data-turn="16" width="160" height="102"></canvas>' +
      '<video data-l="pendant" muted loop playsinline preload="none" poster="' + ROOT + 'assets/film/freeman-globe-001-pendant-poster.jpg"><source src="' + ROOT + 'assets/film/freeman-globe-001-pendant.mp4" type="video/mp4"></video>' +
      '<img data-l="kc" alt="" src="' + ROOT + 'assets/img/lil-kc-master-1200.webp" style="object-position:52% 50%">' +
      '<div class="l-heart" data-l="heart"><canvas data-seq width="960" height="640"></canvas></div>' +
      '<div class="l-hat" data-l="hat">' + (hat ? hat.innerHTML : '') + '</div>' +
      '<div class="l-txt mono" data-l="txt"></div>';
    doc.body.appendChild(lens);
    var layers = {}; $$('[data-l]', lens).forEach(function (l) { layers[l.dataset.l] = l; });
    var vid = layers.pendant;
    var x = W.innerWidth / 2, y = W.innerHeight / 2, tx = x, ty = y, sc = 0, tsc = 0, cur = null;
    function show(k, txt) {
      if (cur === k && k !== 'txt') return;
      Object.keys(layers).forEach(function (n) { layers[n].classList.toggle('on', n === k); });
      if (k === 'txt') layers.txt.textContent = txt || '';
      if (k === 'pendant') { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } else vid.pause();
      cur = k;
    }
    rows.forEach(function (r) {
      r.addEventListener('pointerenter', function (e) {
        if (!cur || sc < 0.05) { x = tx = e.clientX; y = ty = e.clientY; }
        show(r.dataset.pv, r.dataset.pvTxt); tsc = 1;
      });
      r.addEventListener('pointerleave', function () { tsc = 0; });
    });
    W.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    W.addEventListener('scroll', function () { if (tsc && !rows.some(function (r) { return r.matches(':hover'); })) tsc = 0; }, { passive: true });
    onFrame(function () {
      var k = reduce ? 1 : 0.2;
      x += (tx - x) * k; y += (ty - y) * k; sc += (tsc - sc) * (reduce ? 1 : 0.16);
      if (sc < 0.002 && !tsc) { if (lens.style.transform !== 'translate(-50%,-50%) scale(0)') { lens.style.transform = 'translate(-50%,-50%) scale(0)'; vid.pause(); } return; }
      lens.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
    });
  })();

  /* ——— Freeman Globe, drawn live from the study's own code (assets/js/freeman-globe-mark.original.js) ——— */
  var globes = (function () {
    var cvs = $$('canvas.globe');
    if (!cvs.length) return null;
    var M;
    try { M = { RUNS: RUNS, SW: SW, SH: SH, halo: halo, globeMask: globeMask }; } /* globals from the original file */
    catch (err) { cvs.forEach(function (cv) { cv.setAttribute('hidden', ''); }); $$('[data-globe-toggle]').forEach(function (b) { b.remove(); }); return null; }
    var GW = M.SW, GH = Math.max(M.SH, 102), oy = Math.floor((GH - M.SH) / 2), GD = 100, P = [255, 249, 241], R = [249, 56, 34];
    var buf = new Uint8Array(GW * GH), g = new Uint8Array(GW * GH);
    function draw(cv, rot) {
      if (!cv._ctx) { cv.width = GW; cv.height = GH; cv._ctx = cv.getContext('2d'); cv._img = cv._ctx.createImageData(GW, GH); }
      M.globeMask(buf, GW, GH, GD, rot);
      for (var yy = 0; yy < GH; yy++) { var sy = yy - oy, inS = sy >= 0 && sy < M.SH; for (var xx = 0; xx < GW; xx++) g[yy * GW + xx] = buf[yy * GW + xx] && !(inS && M.halo[sy * M.SW + xx]) ? 1 : 0; }
      for (var i = 0; i < M.RUNS.length; i += 3) g.fill(1, (M.RUNS[i] + oy) * GW + M.RUNS[i + 1], (M.RUNS[i] + oy) * GW + M.RUNS[i + 1] + M.RUNS[i + 2]);
      var d = cv._img.data;
      for (var k = 0; k < g.length; k++) { var c = g[k] ? R : P; d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = 255; }
      cv._ctx.putImageData(cv._img, 0, 0);
    }
    var t0 = performance.now(), playing = !reduce, pausedAt = performance.now();
    cvs.forEach(function (cv) {
      cv._turn = parseFloat(cv.dataset.turn) || 16; cv._rot = parseFloat(cv.dataset.rot) || 0; cv._frame = -1; cv._on = true;
      draw(cv, cv._rot);
      if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { cv._on = es[0].isIntersecting; }).observe(cv);
    });
    var tog = $$('[data-globe-toggle]');
    function label() { tog.forEach(function (b) { b.textContent = playing ? 'Pause' : 'Play'; b.setAttribute('aria-pressed', String(!playing)); }); }
    label();
    tog.forEach(function (b) {
      b.addEventListener('click', function () {
        playing = !playing;
        if (playing) t0 += performance.now() - pausedAt; else pausedAt = performance.now();
        label();
      });
    });
    onFrame(function (now) {
      if (!playing || doc.hidden) return;
      cvs.forEach(function (cv) {
        if (!cv._on || cv.hasAttribute('data-still')) return;
        var f = Math.floor((now - t0) / 1000 * 30);   /* 30 fps, as in the study */
        if (f !== cv._frame) { cv._frame = f; draw(cv, (cv._rot + f / 30 * 360 / cv._turn) % 360); }
      });
    });
    return { draw: draw };
  })();

  /* ——— Films: play only while on screen; never under reduced motion ——— */
  $$('video[data-auto]').forEach(function (v) {
    v.muted = true;
    if (reduce) { v.controls = true; return; }
    if ('IntersectionObserver' in W) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
      }, { threshold: 0.15 }).observe(v);
    }
    v.addEventListener('click', function () { if (v.paused) v.play(); else v.pause(); });
  });

  /* ——— Lil KC, The Heart: 36 drawings at 12 a second, drawn to canvas ——— */
  (function () {
    var players = $$('canvas[data-seq]');
    if (!players.length) return;
    var N = 36, FPS = 12, imgs = [], loaded = 0, requested = false;
    function load() {
      if (requested) return; requested = true;
      for (var i = 1; i <= N; i++) {
        var im = new Image(); im.decoding = 'async';
        im.onload = function () { loaded++; players.forEach(function (p) { if (!p._drawn) paint(p); }); };
        im.src = ROOT + 'assets/img/kc-heart/' + (i < 10 ? '0' : '') + i + '.webp';
        imgs.push(im);
      }
    }
    function paint(p) {
      var im = imgs[p._f];
      if (!im || !im.complete || !im.naturalWidth) return;
      var c = p._ctx; c.clearRect(0, 0, p.width, p.height); c.drawImage(im, 0, 0, p.width, p.height); p._drawn = true;
      if (p._ui) p._ui.update(p._f);
      if (p._count) p._count.textContent = 'Drawing ' + String(p._f + 1).padStart(2, '0') + ' / ' + N;
    }
    players.forEach(function (p) {
      p._ctx = p.getContext('2d'); p._f = 0; p._on = false; p._play = !reduce; p._t = 0;
      var fig = p.closest('figure, .lt, .now');
      p._count = fig ? fig.querySelector('[data-seq-count]') : null;
      if ('IntersectionObserver' in W) {
        new IntersectionObserver(function (es) { p._on = es[0].isIntersecting; if (p._on) load(); }, { rootMargin: '600px 0px' }).observe(p);
      } else { p._on = true; load(); }
      var uiRoot = p.dataset.ui ? $(p.dataset.ui) : null;
      if (uiRoot) {
        var range = $('.scrub', uiRoot), btn = $('[data-seq-play]', uiRoot), read = $('[data-seq-read]', uiRoot), keys = $$('[data-key]', uiRoot);
        p._ui = {
          update: function (f) {
            if (range && +range.value !== f + 1) range.value = f + 1;
            if (read) read.textContent = String(f + 1).padStart(2, '0');
            keys.forEach(function (k) { k.setAttribute('aria-pressed', String(+k.dataset.key === f + 1)); });
          }
        };
        function setPlay(v) { p._play = v; if (btn) { btn.querySelector('i').textContent = v ? 'II' : '▶'; btn.querySelector('span').textContent = v ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', String(!v)); } }
        setPlay(p._play);
        if (btn) btn.addEventListener('click', function () { setPlay(!p._play); });
        if (range) range.addEventListener('input', function () { setPlay(false); p._f = +range.value - 1; paint(p); });
        keys.forEach(function (k) { k.addEventListener('click', function () { setPlay(false); p._f = +k.dataset.key - 1; paint(p); }); });
      }
    });
    var last = performance.now();
    onFrame(function (now) {
      var dt = now - last; last = now;
      if (!loaded || doc.hidden) return;
      players.forEach(function (p) {
        if (!p._on || !p._play) return;
        p._t += dt;
        if (p._t >= 1000 / FPS) { p._t %= 1000 / FPS; p._f = (p._f + 1) % N; paint(p); }
      });
    });
  })();

  /* ——— What we make: the width axis follows the reader ——— */
  (function () {
    var items = $$('.make-list li:not(.last)');
    if (!items.length) return;
    if (reduce) { items.forEach(function (li) { li.style.setProperty('--w', '112%'); }); return; }
    items.forEach(function (li) {
      li.addEventListener('pointerenter', function () { li._hover = true; });
      li.addEventListener('pointerleave', function () { li._hover = false; });
    });
    onFrame(function () {
      var vh = W.innerHeight;
      for (var i = 0; i < items.length; i++) {
        var li = items[i], r = li.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        var c = (r.top + r.height / 2) / vh, d = Math.abs(c - 0.5), t = clamp(1 - d / 0.3, 0, 1);
        t = t * t * (3 - 2 * t);
        if (li._hover) t = 1;
        var w = Math.round(75 + 50 * t);
        if (li._w !== w) { li._w = w; li.style.setProperty('--w', w + '%'); li.style.setProperty('--dot', t > 0.82 ? '1' : '0'); }
      }
    });
  })();

  /* ——— One typeface, every width ——— */
  $$('[data-stretch-demo]').forEach(function (el) {
    var box = el.parentElement, target = null, w = 100;
    box.addEventListener('pointermove', function (e) { var r = box.getBoundingClientRect(); target = 75 + 50 * clamp((e.clientX - r.left) / r.width, 0, 1); });
    box.addEventListener('pointerleave', function () { target = null; });
    onFrame(function (now) {
      var t = target != null ? target : (reduce ? 100 : 100 + 25 * Math.sin(now / 900));
      w += (t - w) * 0.12;
      el.style.fontStretch = w.toFixed(1) + '%';
    });
  });

  /* ——— Freeman: zoom into the bitmap until the pixels are the picture ——— */
  (function () {
    var tr = $('.zoom-track'), cv = tr && $('canvas', tr), read = tr && $('[data-zoom-read]', tr);
    if (!tr || !cv || reduce) return;
    onFrame(function () {
      var r = tr.getBoundingClientRect(), len = tr.offsetHeight - W.innerHeight;
      if (r.bottom < 0 || r.top > W.innerHeight) return;
      var p = clamp(-r.top / Math.max(1, len), 0, 1), e = p * p * (3 - 2 * p), s = 1 + 15 * e;
      cv.style.transform = 'scale(' + s.toFixed(3) + ')';
      if (read) read.textContent = 'Scale 1 : ' + s.toFixed(1);
    });
  })();

  /* ——— One loop for everything that moves ——— */
  function frame(now) {
    for (var i = 0; i < frameHooks.length; i++) frameHooks[i](now);
    requestAnimationFrame(frame);
  }
  fitAll();
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitAll);
  var rt; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fitAll, 80); });
  requestAnimationFrame(frame);
})();
