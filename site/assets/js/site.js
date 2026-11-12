/*
 * The sun. The tangerine dot sits on the ring at the visitor's local time:
 * noon at the top, midnight at the bottom, moving clockwise through the day.
 *
 * One movement, once: on arrival the dot travels from midnight to now, so the
 * ring reads as a day rather than a decoration. After that it keeps real time
 * (a quarter of a degree a minute) and never moves for its own sake.
 *
 * Computed on the device; nothing is sent or stored. Without JavaScript the
 * dot rests at noon.
 */
(() => {
  'use strict';
  const R = 50;
  const suns = Array.from(document.querySelectorAll('svg .sun'));
  if (!suns.length) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hours = d => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const place = h => {
    const a = h / 24 * Math.PI * 2;
    const x = (-R * Math.sin(a)).toFixed(2), y = (R * Math.cos(a)).toFixed(2);
    suns.forEach(s => { s.setAttribute('cx', x); s.setAttribute('cy', y); });
  };
  const label = d => {
    const t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    document.querySelectorAll('svg.symbol > title').forEach(el => { el.textContent = `The sun, at your local time — ${t}`; });
  };

  const now = new Date();
  label(now);
  const target = hours(now);

  if (still) {
    place(target);
  } else {
    // Ease out: quick from midnight, settling gently into the present.
    const dur = 900 + target / 24 * 900, t0 = performance.now();
    place(0);
    const step = t => {
      const p = Math.min(1, (t - t0) / dur);
      place(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  setInterval(() => { const d = new Date(); place(hours(d)); label(d); }, 60000);
})();
