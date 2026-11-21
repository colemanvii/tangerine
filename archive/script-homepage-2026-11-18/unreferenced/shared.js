/* Tangerine — Living Canvas explorations
   Shared behaviour for the three studies: visit memory, a calm pointer, a
   frame loop that sleeps when nobody is looking, small WebGL helpers, and the
   "Enter Tangerine" room that shows the published work from work.json. */
(function () {
  'use strict';

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const T = (window.Tangerine = {});

  T.reduced = () => motionQuery.matches;
  T.onMotionChange = fn => motionQuery.addEventListener('change', fn);

  /* ---------- Randomness that remembers the previous visit ---------- */
  T.rng = seed => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  // Pick one of `count` options, never the one this visitor saw last time.
  // ?study=3 pins a study, for reviewing them one by one.
  T.visit = (key, count) => {
    const pinned = parseInt(new URLSearchParams(location.search).get('study'), 10);
    if (pinned >= 1 && pinned <= count) return { index: pinned - 1, seed: pinned * 7919 };
    const last = parseInt(store.get('tangerine:' + key), 10);
    let pick = Math.floor(Math.random() * count);
    if (count > 1 && pick === last) pick = (pick + 1 + Math.floor(Math.random() * (count - 1))) % count;
    store.set('tangerine:' + key, String(pick));
    return { index: pick, seed: (Math.random() * 2 ** 31) | 0 };
  };

  /* ---------- Editions ----------
     Both studies are dated works. No. 1 is 18 November 2026, the day the series
     began; each local day after that is the next number. */
  T.edition = (date = new Date()) => {
    const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.max(1, Math.round((day - Date.UTC(2026, 10, 18)) / 864e5) + 1);
  };
  T.pad3 = n => String(n).padStart(3, '0');
  // Small integer hash, for rules that should hold for a whole day.
  T.hash = n => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

  // The hour where the visitor is, as a fraction of the day (0..1).
  T.dayPhase = () => { const d = new Date(); return (d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600) / 24; };

  /* ---------- A calm pointer ----------
     Raw position plus a slowly eased follower and a decaying "stir" value that
     says how much the visitor has moved recently. Touch counts the same. */
  const P = (T.pointer = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, vx: 0, vy: 0, stir: 0, inside: false, coarse: matchMedia('(pointer: coarse)').matches });
  let lastX = null, lastY = null, lastT = 0;
  function move(e) {
    const x = e.clientX / innerWidth, y = e.clientY / innerHeight, now = performance.now();
    if (lastX !== null) {
      const dt = Math.max(8, now - lastT) / 1000;
      const vx = (x - lastX) / dt, vy = (y - lastY) / dt;
      P.vx += (vx - P.vx) * 0.25; P.vy += (vy - P.vy) * 0.25;
      P.stir = Math.min(1, P.stir + Math.hypot(x - lastX, y - lastY) * 2.2);
    }
    lastX = x; lastY = y; lastT = now;
    P.x = x; P.y = y; P.inside = true;
  }
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerdown', e => { lastX = null; move(e); }, { passive: true });
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { P.inside = false; lastX = null; } }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { P.inside = false; lastX = null; });
  // Ease once per frame. `ease` is a time constant in seconds.
  P.step = (dt, ease = 1.2) => {
    const k = 1 - Math.exp(-dt / ease);
    P.sx += (P.x - P.sx) * k; P.sy += (P.y - P.sy) * k;
    P.vx *= Math.exp(-dt * 2.5); P.vy *= Math.exp(-dt * 2.5);
    P.stir *= Math.exp(-dt / 2.4);
  };

  /* ---------- Frame loop ----------
     Runs only while the tab is visible. `fn(t, dt)` gets seconds. Starts at a
     different moment of the piece's life on each visit. */
  T.loop = (fn, { offset = Math.random() * 600, maxFps = 60 } = {}) => {
    let raf = 0, prev = 0, clock = offset, running = false, cap = maxFps, minGap = 1000 / cap - 2;
    // If a device can't keep up, settle at 30 fps rather than stutter.
    let ema = 0, frames = 0, eased = false;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (prev && now - prev < minGap) return;
      const gap = prev ? now - prev : 16.7;
      const dt = Math.min(0.1, gap / 1000);
      prev = now; clock += dt;
      if (!eased && cap > 30) {
        frames++; ema = ema ? ema * 0.94 + gap * 0.06 : gap;
        if (frames > 90 && ema > 23) { eased = true; minGap = 1000 / 30 - 2; }
      }
      fn(clock, dt);
    }
    const api = {
      start() { if (running || document.hidden) return; running = true; prev = 0; raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
      fps(n) { cap = n; minGap = 1000 / (eased ? Math.min(n, 30) : n) - 2; },
      get time() { return clock; },
      set time(v) { clock = v; }
    };
    document.addEventListener('visibilitychange', () => (document.hidden ? api.stop() : (!T.reduced() && api.start())));
    return api;
  };

  /* ---------- WebGL helpers ---------- */
  T.gl = canvas => {
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'default' };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return null;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.hasFloatLinear = !!gl.getExtension('OES_texture_half_float') && !!gl.getExtension('OES_texture_half_float_linear');
    return gl;
  };
  T.program = (gl, fsSource) => {
    const vs = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    const make = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, make(gl.FRAGMENT_SHADER, 'precision highp float;\n' + fsSource));
    gl.bindAttribLocation(pr, 0, 'p');
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const cache = {};
    pr.u = name => (name in cache ? cache[name] : (cache[name] = gl.getUniformLocation(pr, name)));
    return pr;
  };
  T.draw = (gl, pr, target, w, h) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(pr);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  T.target = (gl, w, h, old) => {
    if (old) { gl.deleteTexture(old.tex); gl.deleteFramebuffer(old.fb); }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  };
  // Shared GLSL: hash, value noise, fbm, film grain.
  T.glslNoise = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){s+=a*vnoise(p);p=m*p;a*=.5;}return s;}
float fbm3(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<3;i++){s+=a*vnoise(p);p=m*p;a*=.5;}return s;}
vec3 toLin(vec3 c){return pow(c,vec3(2.2));}
vec3 toSrgb(vec3 c){return pow(max(c,0.),vec3(1./2.2));}
`;
  // Photographic grain: two octaves of per-pixel noise, strongest in the mid-tones.
  T.glslGrain = `
float grainAt(vec2 px,float seed){
  float a=h21(px+seed),b=h21(floor(px*.5)+seed*1.7),c=h21(floor(px/3.)+seed*.37);
  return (a*.55+b*.3+c*.15)-.5;
}
vec3 applyGrain(vec3 c,vec2 px,float seed,float amount){
  float l=dot(c,vec3(.299,.587,.114));
  float g=grainAt(px,seed)*amount*(.45+1.6*l*(1.-l));
  return c+g;
}
`;
  T.hexToLin = hex => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.pow(v / 255, 2.2));
  };

  /* ---------- Size ---------- */
  // Calls fn(cssW, cssH, dpr) on resize, throttled to one per frame.
  T.onResize = fn => {
    let pending = false;
    const run = () => { pending = false; fn(innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 2)); };
    addEventListener('resize', () => { if (!pending) { pending = true; requestAnimationFrame(run); } });
    run();
  };

  /* ---------- Enter Tangerine: the room ---------- */
  T.room = function ({ trigger, onEnter, onLeave, feed = 'work.json' }) {
    const room = document.getElementById('room');
    const img = room.querySelector('img');
    const title = room.querySelector('[data-title]');
    const project = room.querySelector('[data-project]');
    const when = room.querySelector('time');
    const count = room.querySelector('[data-count]');
    const prev = room.querySelector('[data-prev]');
    const next = room.querySelector('[data-next]');
    const leave = room.querySelectorAll('[data-leave]');
    const status = room.querySelector('[data-status]');
    let works = null, index = 0, open = false;

    const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const valid = x => x && x.id && x.title && x.src && /^(media\/|https:\/\/)/.test(x.src) && Number.isFinite(Date.parse(x.date));

    function load() {
      if (works) return Promise.resolve(works);
      return fetch(feed, { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(list => (works = list.filter(valid).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))))
        .catch(() => (works = []));
    }
    function show(i) {
      if (!works.length) {
        room.classList.add('is-empty');
        status.textContent = 'The archive is resting. Please return shortly.';
        return;
      }
      room.classList.remove('is-empty');
      index = (i + works.length) % works.length;
      const w = works[index];
      img.classList.remove('is-shown');
      const pic = new Image();
      pic.src = w.src;
      pic.decode().catch(() => {}).then(() => {
        if (works[index] !== w) return;
        img.src = w.src; img.alt = w.description || w.title;
        img.classList.add('is-shown');
      });
      title.textContent = w.title;
      project.textContent = w.project || '';
      when.dateTime = w.date; when.textContent = fmt.format(new Date(w.date));
      count.textContent = (index + 1) + ' of ' + works.length;
      const many = works.length > 1;
      prev.hidden = next.hidden = !many;
      works.forEach((x, k) => { if (Math.abs(k - index) === 1) new Image().src = x.src; });
    }
    function enter(fromHistory) {
      if (open) return;
      open = true;
      if (!fromHistory) history.pushState({ room: 1 }, '', '#work');
      document.body.classList.add('is-entering');
      onEnter && onEnter();
      load().then(() => {
        show(index);
        room.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          room.classList.add('is-open');
          document.body.classList.add('is-in-room');
          room.focus({ preventScroll: true });
        }));
      });
    }
    function exit(fromHistory) {
      if (!open) return;
      if (!fromHistory && history.state && history.state.room) { history.back(); return; }
      open = false;
      if (location.hash === '#work') history.replaceState(null, '', location.pathname + location.search);
      room.classList.remove('is-open');
      document.body.classList.remove('is-in-room', 'is-entering');
      onLeave && onLeave();
      const done = () => { if (!open) room.hidden = true; };
      T.reduced() ? done() : setTimeout(done, 900);
      trigger.focus({ preventScroll: true });
    }
    trigger.addEventListener('click', e => { e.preventDefault(); enter(false); });
    leave.forEach(b => b.addEventListener('click', e => { e.preventDefault(); exit(false); }));
    prev.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => show(index + 1));
    addEventListener('popstate', () => {
      if (location.hash === '#work') enter(true); else if (open) exit(true);
    });
    addEventListener('keydown', e => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); exit(false); }
      else if (e.key === 'ArrowLeft' && works && works.length > 1) show(index - 1);
      else if (e.key === 'ArrowRight' && works && works.length > 1) show(index + 1);
    });
    // Swipe between pieces on touch screens.
    let sx = null, sy = null;
    room.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    room.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && works && works.length > 1) show(index + (dx < 0 ? 1 : -1));
    });
    // Keep focus inside the room while it is open.
    room.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = [...room.querySelectorAll('button:not([hidden]),a[href]')].filter(x => x.offsetParent);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === room)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // A link straight to #work opens the room once the piece is ready.
    if (location.hash === '#work') { history.replaceState(null, '', location.pathname + location.search); setTimeout(() => enter(false), 0); }
    return { enter, exit, get open() { return open; } };
  };
})();
