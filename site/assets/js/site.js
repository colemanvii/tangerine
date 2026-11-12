/*
 * The tangerine dot is the sun, placed on the ring by the visitor's own
 * clock: noon at the top, midnight at the bottom. Computed on the device;
 * nothing is sent or stored. Without JavaScript it rests at noon.
 */
(() => {
  'use strict';
  const sun = document.querySelector('.sun');
  if (!sun) return;
  const R = 50;
  function place() {
    const d = new Date();
    const a = (d.getHours() + d.getMinutes() / 60) / 24 * Math.PI * 2;
    sun.setAttribute('cx', (-R * Math.sin(a)).toFixed(2));
    sun.setAttribute('cy', (R * Math.cos(a)).toFixed(2));
  }
  place();
  setInterval(place, 60000);
})();
