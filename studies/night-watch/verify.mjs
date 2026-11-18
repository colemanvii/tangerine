// Night Watch — export checks.
//   node studies/night-watch/verify.mjs
// 1. Every PNG: each eye interior pixel (2 px clear of any edge or pupil) is exactly EYE.
//    Also reports the named EYE_SAMPLES points from geometry.mjs.
// 2. Every SVG: both eyes are filled with EYE, nothing is translucent, nothing external.
// 3. Contact sheet: each tile's SVG markup equals its print, and sampled pixels from
//    every shape match the individual PNG.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as G from './geometry.mjs';
import { loadManifest } from './render.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const EYE = hex(G.EYE);

function decodePNG(file) {
  const buf = fs.readFileSync(file);
  let off = 8, w, h, bitDepth, colorType, idat = [], hasSRGB = false;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'sRGB') hasSRGB = true;
    off += 12 + len;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error(`${file}: unsupported PNG ${bitDepth}/${colorType}`);
  const bpp = colorType === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0, b = y ? px[dst - stride + x] : 0, c = x >= bpp && y ? px[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[dst + x] = v & 255;
    }
  }
  return { w, h, hasSRGB, at: (x, y) => { const i = y * stride + x * bpp; return [px[i], px[i + 1], px[i + 2]]; } };
}

const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// Signed clearance (canvas units) of a point inside the eyes, excluding pupils.
function eyeClearance(x, y) {
  const d = (cx, cy) => Math.hypot(x - cx, y - cy);
  const pupil = Math.min(...G.PUPILS.map((p) => d(p.cx, p.cy) - p.r));
  const right = G.RIGHT_EYE.r - d(G.RIGHT_EYE.cx, G.RIGHT_EYE.cy);
  const disc = 1 - d(3, 3);
  const square = Math.min(x - 2, y - 2, 3 - x, 3 - y);
  const left = Math.max(disc, square); // union of the disc and the squared corner (conservative)
  return Math.min(Math.max(left, right), pupil);
}

let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL ${msg}`); };

const m = loadManifest();
const scale = 1600 / G.SIZE;
const margin = 2 / scale;

console.log(`EYE ${G.EYE} = rgb(${EYE.join(', ')})\n`);
console.log('print                         eye px checked   left sample        right sample');
const prints = [];
for (const p of m.prints) {
  const svg = fs.readFileSync(path.join(DIR, 'svg', `${p.file}.svg`), 'utf8');
  if (!svg.includes(`id="eye-left" fill="${G.EYE}"`) || !svg.includes(`id="eye-right" fill="${G.EYE}"`)) fail(`${p.file}.svg eyes not filled with ${G.EYE}`);
  if (/opacity|gradient|filter|mask|href|<image|url\(/i.test(svg)) fail(`${p.file}.svg contains opacity/gradient/filter/external reference`);

  const img = decodePNG(path.join(DIR, 'png', `${p.file}.png`));
  if (img.w !== 1600 || img.h !== 1600) fail(`${p.file}.png is ${img.w}×${img.h}`);
  if (!img.hasSRGB) fail(`${p.file}.png has no sRGB chunk`);
  let checked = 0, bad = 0;
  for (let y = Math.floor(2 * scale); y < 4 * scale; y++) {
    for (let x = Math.floor(2 * scale); x < 6 * scale; x++) {
      if (eyeClearance((x + 0.5) / scale, (y + 0.5) / scale) <= margin) continue;
      checked++;
      if (!same(img.at(x, y), EYE)) bad++;
    }
  }
  if (bad) fail(`${p.file}.png: ${bad} eye pixels differ from ${G.EYE}`);
  const sample = (pts) => pts.map(([u, v]) => img.at(Math.floor(u * scale), Math.floor(v * scale)));
  const L = sample(G.EYE_SAMPLES.left), R = sample(G.EYE_SAMPLES.right);
  [...L, ...R].forEach((c) => { if (!same(c, EYE)) fail(`${p.file}.png sample rgb(${c})`); });
  console.log(`${p.file.padEnd(30)}${String(checked).padStart(8)} ${bad ? 'BAD' : 'ok '}   rgb(${L[0].join(',')})    rgb(${R[0].join(',')})`);
  prints.push({ p, svg, img });
}

// Contact sheet.
console.log('\ncontact sheet');
const sheetSvg = fs.readFileSync(path.join(DIR, 'night-watch-sheet.svg'), 'utf8');
const sheet = decodePNG(path.join(DIR, 'night-watch-sheet.png'));
const { cols, rows } = m.grid;
const tilePx = sheet.w / cols;
if (sheet.h / rows !== tilePx || !Number.isInteger(tilePx)) fail(`sheet ${sheet.w}×${sheet.h} is not ${cols}×${rows} square tiles`);
const tiles = [...sheetSvg.matchAll(/<svg id="([^"]+)" x="(\d+)" y="(\d+)"[^>]*>\n([\s\S]*?)\n  <\/svg>/g)];
if (tiles.length !== prints.length) fail(`sheet has ${tiles.length} tiles`);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
// Points inside each shape, away from edges (canvas units).
const probes = { outer: [0.4, 0.4], inner: [1.4, 6.5], face: [4, 5.3], bust: [4, 7.85], eyeL: [2.3, 2.3], eyeR: [4.6, 2.6], pupilL: [G.PUPILS[0].cx, G.PUPILS[0].cy], pupilR: [G.PUPILS[1].cx, G.PUPILS[1].cy], beak: [4, 4.15] };
prints.forEach(({ p, svg, img }, i) => {
  const t = tiles[i];
  const want = norm(svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>.*?<\/title>/, ''));
  if (!t || t[1] !== p.file) return fail(`tile ${i + 1} is ${t?.[1]}, expected ${p.file}`);
  if (norm(t[4]) !== want) fail(`tile ${p.file} markup differs from its print`);
  const ox = (i % cols) * tilePx, oy = Math.floor(i / cols) * tilePx, k = tilePx / G.SIZE;
  for (const [name, [u, v]] of Object.entries(probes)) {
    const a = sheet.at(Math.floor(ox + u * k), Math.floor(oy + v * k)), b = img.at(Math.floor(u * scale), Math.floor(v * scale));
    if (!same(a, b)) fail(`tile ${p.file} ${name}: sheet rgb(${a}) vs print rgb(${b})`);
  }
  for (let y = oy + 2 * k; y < oy + 4 * k; y++) for (let x = ox + 2 * k; x < ox + 6 * k; x++) {
    if (eyeClearance((x - ox + 0.5) / k, (y - oy + 0.5) / k) > 2 / k && !same(sheet.at(x, y), EYE)) { fail(`tile ${p.file} eye pixel ${x},${y} = rgb(${sheet.at(x, y)})`); return; }
  }
});
console.log(`  ${tiles.length} tiles, order and markup match the individual SVGs; probe pixels match the PNGs`);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
