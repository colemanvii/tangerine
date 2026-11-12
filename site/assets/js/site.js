/*
 * Tangerine — the orbit.
 * One dot for the sun, placed by the visitor's own clock: 06 at the left,
 * 12 at the top, 18 at the right. Above the line by day, below it by night.
 * Computed on the device; nothing is sent or stored.
 */
(() => {
  'use strict';
  const svg = document.querySelector('.orbit');
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const R = 100;

  const ticks = svg.querySelector('.ticks');
  for (let h = 0; h < 24; h++) {
    const a = h / 24 * Math.PI * 2;
    const long = h % 6 === 0;
    const r2 = R - (long ? 9 : 4);
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', (-R * Math.sin(a)).toFixed(2));
    l.setAttribute('y1', (R * Math.cos(a)).toFixed(2));
    l.setAttribute('x2', (-r2 * Math.sin(a)).toFixed(2));
    l.setAttribute('y2', (r2 * Math.cos(a)).toFixed(2));
    ticks.appendChild(l);
  }

  const sun = svg.querySelector('.sun');
  const label = document.querySelector('.now');
  function place() {
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    const a = h / 24 * Math.PI * 2;
    sun.setAttribute('cx', (-R * Math.sin(a)).toFixed(2));
    sun.setAttribute('cy', (R * Math.cos(a)).toFixed(2));
    sun.classList.toggle('is-night', h < 6 || h >= 18);
    if (label) label.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  place();
  setInterval(place, 30000);
})();
