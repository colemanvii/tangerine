/*
 * Tangerine — layout.
 *
 * Where a new card goes on TABLET: in orbit around the card it relates to, on
 * rings of increasing radius, at the first free position. Existing cards are
 * never moved; the person's arrangement is theirs. Pure: reads positions,
 * returns a position.
 *
 * The same rule the browser app uses when a proposal is accepted
 * (app/app.js orbitSpot), shared here so the ChatGPT bridge places cards the
 * same way.
 */
(function (root) {
  'use strict';
  const CARD_W = 208, GRID = 8;
  const snap = (v) => Math.max(0, Math.round(v / GRID) * GRID);

  function orbitSpot(items, anchor, taken) {
    const all = (items || []).concat(taken || []);
    const busy = (q) => all.some((i) => Math.abs(i.x - q.x) < CARD_W + 24 && Math.abs(i.y - q.y) < 150);
    if (anchor) {
      const start = ((anchor.no || 0) * 0.9) % (2 * Math.PI);
      for (let r = 240; r <= 960; r += 120) {
        const n = Math.max(8, Math.round((2 * Math.PI * r) / 200));
        for (let k = 0; k < n; k++) {
          const a = start + (k * 2 * Math.PI) / n;
          const q = { x: snap(anchor.x + Math.cos(a) * r), y: snap(anchor.y + Math.sin(a) * r * 0.75) };
          if (q.x >= 16 && q.y >= 40 && !busy(q)) return q;
        }
      }
    }
    const x0 = snap(Math.max(0, ...(items || []).filter((i) => i.origin !== 'conversation').map((i) => i.x + CARD_W + 64)));
    for (let col = 0; col < 40; col++) for (let row = 0; row < 5; row++) {
      const q = { x: x0 + col * (CARD_W + 32), y: 48 + row * 152 };
      if (!busy(q)) return q;
    }
    return { x: x0, y: 48 };
  }

  const exported = { orbitSpot, CARD_W };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.TangerineLayout = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
