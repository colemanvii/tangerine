#!/usr/bin/env node
/* Tangerine — Index 005 homepage.
 *
 *   node website/tools/home.mjs
 *
 * Writes website/index.html: the four relationships set inside a tangerine.
 * The fruit is built by tools/citrus.mjs (segments, membranes, core). Each
 * name is lettered along its segment's leading membrane, flush to the core,
 * so the type draws the cross-section. Line widths are measured in Chromium
 * with the real Archivo font (needs Playwright, like tools/og.mjs), so the
 * shipped page is static SVG with no script.
 *
 * Studies that led here: website/studies/index-005/ (not deployed).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { section, pathOf } from './citrus.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const site = JSON.parse(readFileSync(join(ROOT, 'content/site.json'), 'utf8'));

/* ———————————————————————— The work, clockwise from the top-left segment. */
const WORK = [
  { lines: ['Freeman'], href: '/freeman-general-contracting/', label: 'Freeman General Contracting' },
  { lines: ['Joseph', 'Martin'], href: '/joseph-martin/', label: 'Joseph Martin' },
  { lines: ['Kashus', 'Culpepper'], href: '/kashus-culpepper/', label: 'Kashus Culpepper', flip: true },
  { lines: ['Scout', 'Motors'], href: '/scout-motors/', label: 'Scout Motors, independent study', study: 'Independent study' },
];

/* ———————————————————————— Geometry. Units: a 1000 × 1000 square. */
const R = 480;            // peel radius
const PEEL = 17;          // zest band
const CORE = [-24, 19];   // the core sits off-centre, as it does in a real fruit
const GAP = 14;           // membrane
const HOLLOW = 23;        // white column of pith where the segments stop
const deg = r => (r * 180) / Math.PI;
// Membrane chords run exactly left, up, right and down from the offset core,
// so the lettering on them is orthogonal; the bow gives each a slight curve.
const cuts = [
  180 - deg(Math.asin(CORE[1] / R)) - 360,
  -90 + deg(Math.asin(CORE[0] / R)),
  deg(Math.asin(CORE[1] / R)),
  90 - deg(Math.asin(CORE[0] / R)),
];
const S = section({ cuts, R, rind: 37, gap: GAP, hollow: HOLLOW, bow: 0.035, shoulder: 82, core: CORE, tip: 'arc' });

/* ———————————————————————— Lettering. */
// Two cuts of the same face: extended for large screens, normal width (larger) where the fruit is small.
const CUTS = { d: { wdth: 118, wght: 700, note: 0.36 }, m: { wdth: 90, wght: 700, note: 0.5 } };
const TRACK = -0.015;
const START = HOLLOW + 22;           // every name begins this far from the core
const ROOM = S.Rs - START - 96;      // and must end before the shoulder

async function measure() {
  const font = readFileSync(join(ROOT, 'fonts/archivo-variable-latin.woff2')).toString('base64');
  const lines = WORK.flatMap(w => w.lines);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<style>@font-face{font-family:A;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-stretch:62% 125%}</style>
<svg width="2000" height="400">${Object.entries(CUTS).map(([k, c]) => lines.map(t => `<text data-k="${k}" style="font:${c.wght} 100px A;font-stretch:${c.wdth}%;letter-spacing:${TRACK}em">${t}</text>`).join('')).join('')}</svg>`);
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(() => [...document.querySelectorAll('text')].map(t => [t.dataset.k, t.getComputedTextLength()]));
  await browser.close();
  return Object.fromEntries(Object.keys(CUTS).map(k => {
    const max = Math.max(...widths.filter(w => w[0] === k).map(w => w[1]));
    return [k, Math.floor((100 * ROOM) / max)];
  }));
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const L = v => Math.hypot(v[0], v[1]);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function lettering(k, fs) {
  const cap = fs * 0.72, lh = fs * 0.96, ns = Math.round(fs * CUTS[k].note), noteGap = ns * 1.75;
  const defs = [], groups = [];
  S.lobes.forEach((lobe, i) => {
    const w = WORK[i], m = S.membranes[i];
    const u = sub(m[3], m[0]), n = [-u[1] / L(u), u[0] / L(u)];
    // Read toward the core, glyphs rising into the segment. The one name that
    // would land upside down reads outward instead, its capitals hung toward the membrane.
    const k0 = GAP / 2 + 12 + (w.flip ? cap : 0);
    const N = w.lines.length, extra = w.study ? noteGap : 0;
    const rows = w.lines.map((t, j) => ({ t, off: w.flip ? k0 + j * lh : k0 + extra + (N - 1 - j) * lh, cls: 'nm', fs }));
    if (w.study) rows.push({ t: w.study, off: w.flip ? rows.at(-1).off + noteGap : k0, cls: 'nt', fs: ns });
    groups.push(rows.map((r, j) => {
      const P = m.map(p => [p[0] + n[0] * r.off, p[1] + n[1] * r.off]);
      const id = `${k}${i}${j}`;
      defs.push(`<path id="${id}" d="${w.flip ? pathOf(P) : pathOf([P[3], P[2], P[1], P[0]])}"/>`);
      const at = w.flip ? `startOffset="${START}"` : `startOffset="${(L(sub(P[3], P[0])) - START).toFixed(1)}" text-anchor="end"`;
      return `<text class="${r.cls}" font-size="${r.fs}"><textPath href="#${id}" ${at}>${esc(r.t)}</textPath></text>`;
    }).join(''));
  });
  return { defs: defs.join(''), groups };
}

function fruit(sizes) {
  const d = lettering('d', sizes.d), m = lettering('m', sizes.m);
  const ring = (r) => `M500 ${500 - r}a${r} ${r} 0 1 0 .01 0Z`;
  const segs = S.lobes.map((lobe, i) => {
    const w = WORK[i];
    return `<a href="${w.href}" aria-label="${esc(w.label)}"${w.study ? ' class="study"' : ''}><path class="seg" d="${lobe.d}"/><g class="td">${d.groups[i]}</g><g class="tm">${m.groups[i]}</g></a>`;
  }).join('\n');
  return `<svg class="fruit" viewBox="0 0 1000 1000" aria-labelledby="fruit-t">
<title id="fruit-t">A tangerine in cross-section. Each of its four segments is a relationship.</title>
<defs>${d.defs}${m.defs}</defs>
<path class="peel" fill-rule="evenodd" d="${ring(R)}${ring(R - PEEL)}"/>
${segs}
</svg>`;
}

/* ———————————————————————— Page. */
function page(svg) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Tangerine — We build brands.</title>
<meta name="description" content="Tangerine. We build brands. An index of four creative relationships: Freeman, Joseph Martin, Kashus Culpepper and Scout Motors.">
<link rel="canonical" href="${site.origin.replace(/\/$/, '')}/">
<meta name="theme-color" content="#ffffff">
<meta property="og:site_name" content="Tangerine">
<meta property="og:type" content="website">
<meta property="og:title" content="Tangerine — We build brands.">
<meta property="og:description" content="An index of four creative relationships.">
<meta property="og:url" content="${site.origin.replace(/\/$/, '')}/">
<meta property="og:image" content="${site.origin.replace(/\/$/, '')}/media/brand/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/archivo-variable-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:Archivo;src:url(/fonts/archivo-variable-latin.woff2) format("woff2");font-weight:100 900;font-stretch:62% 125%;font-display:block}
:root{--white:#fff;--ink:#121518;--grey:#868d92;--orange:#f05323}
*{box-sizing:border-box;margin:0}
html,body{height:100%;background:var(--white);color:var(--ink);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:geometricPrecision}
body{font-family:Archivo,"Helvetica Neue",Arial,sans-serif;overflow:hidden}
a{color:inherit;text-decoration:none}
.page{height:100vh;height:100svh;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto minmax(0,1fr) auto;padding:max(env(safe-area-inset-top),clamp(18px,2.9vw,42px)) clamp(18px,3.3vw,48px) max(env(safe-area-inset-bottom),clamp(18px,2.9vw,42px))}
.wm{font-size:clamp(19px,1.75vw,27px);font-weight:800;font-stretch:125%;letter-spacing:-.02em;line-height:.74;text-transform:uppercase}
.sys{font-size:clamp(11px,.85vw,12.5px);line-height:1.3;font-weight:450;letter-spacing:.012em}
.tag{justify-self:end;align-self:start;text-align:right}
.stage{grid-column:1/-1;position:relative;min-height:0;margin:clamp(12px,2.6vh,30px) 0}
.fruit{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
footer{grid-column:1/-1;display:flex;justify-content:space-between;align-items:end;gap:20px;color:var(--grey)}
footer a{color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
footer a:hover{color:var(--orange)}
footer a:focus-visible{outline:2px solid var(--orange);outline-offset:4px}
.peel{fill:var(--orange)}
.seg{fill:var(--orange)}
.study .seg{fill:var(--white);stroke:var(--orange);stroke-width:4.5}
.nm{font-weight:700;letter-spacing:${TRACK}em;fill:var(--white)}
.td .nm{font-stretch:${CUTS.d.wdth}%}.tm .nm{font-stretch:${CUTS.m.wdth}%}
.nt{font-weight:500;letter-spacing:.012em;fill:var(--orange)}
.study .nm{fill:var(--orange)}
.tm{display:none}
.fruit a{outline:none;cursor:pointer}
.fruit a:hover .seg,.fruit a:focus-visible .seg{fill:var(--ink);stroke:var(--ink)}
.fruit a:hover text,.fruit a:focus-visible text{fill:var(--white)}
.fruit a:focus-visible .seg{stroke:var(--ink);stroke-width:10;paint-order:stroke}
@media (max-width:640px),(max-height:600px){.td{display:none}.tm{display:inline}}
@media (max-width:640px){
  .page{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr) auto}
  .wm{font-size:calc((100vw - 2 * clamp(18px,3.3vw,48px)) / 7.5)}
  .tag{justify-self:start;text-align:left;margin-top:12px}
  .stage{margin:20px 0 22px;display:flex;align-items:flex-end}
  .fruit{position:static;height:auto;max-height:100%}
}
@media (forced-colors:active){.seg,.peel{fill:CanvasText}.study .seg{fill:Canvas;stroke:CanvasText}.nm,.nt{fill:Canvas}.study .nm,.nt{fill:CanvasText}.fruit a:focus-visible .seg{stroke:Highlight}}
</style>
</head>
<body>
<div class="page">
<h1 class="wm">Tangerine</h1>
<p class="tag sys">We build brands.</p>
<nav class="stage" aria-label="Selected work">
${svg}
</nav>
<footer class="sys"><span>Ars longa, vita brevis.</span><a href="https://www.instagram.com/ex.tangerina/" target="_blank" rel="noopener noreferrer">Instagram</a></footer>
</div>
</body>
</html>
`;
}

const sizes = await measure();
writeFileSync(join(ROOT, 'index.html'), page(fruit(sizes)));
console.log('wrote index.html', sizes);
