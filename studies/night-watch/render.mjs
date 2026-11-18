// Night Watch — deterministic renderer.
//   node studies/night-watch/render.mjs
// Reads geometry.mjs (the locked master owl and the EYE constant) and
// palettes.json (hand-mixed colours), then writes:
//   svg/   20 self-contained editable SVGs
//   png/   20 × 1600 px sRGB PNGs
//   night-watch-sheet.svg / .png   edge-to-edge 5 × 4 contact sheet
//   index.html                     local preview
// Rasterising uses the Chromium that ships with Playwright, forced to sRGB.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as G from './geometry.mjs';
import { owlSVG } from './owl.mjs';

const require = createRequire(import.meta.url);
const DIR = path.dirname(fileURLToPath(import.meta.url));
const PRINT_PX = 1600;
const SHEET_TILE_PX = 800;

export function loadManifest() {
  const m = JSON.parse(fs.readFileSync(path.join(DIR, 'palettes.json'), 'utf8'));
  const { cols, rows } = m.grid;
  if (m.prints.length !== cols * rows) throw new Error(`expected ${cols * rows} prints, got ${m.prints.length}`);
  const ids = new Set();
  const pairCount = {};
  m.prints.forEach((p, i) => {
    if (ids.has(p.id)) throw new Error(`duplicate id ${p.id}`);
    ids.add(p.id);
    if (!m.pairs[p.pair]) throw new Error(`${p.id}: unknown pair ${p.pair}`);
    pairCount[p.pair] = (pairCount[p.pair] ?? 0) + 1;
    p.n = String(i + 1).padStart(2, '0');
    p.file = `night-watch-${p.n}-${p.id}`;
  });
  for (const [k, c] of Object.entries(pairCount)) if (c !== 2) throw new Error(`pair ${k} has ${c} prints`);
  return m;
}

// Body of a print (everything inside the root <svg>), shared by the single
// print and the contact sheet so the sheet is the same twenty drawings.
const body = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>\n?/, '').replace(/<\/svg>\s*$/, '').replace(/\s*<title>.*?<\/title>\n?/, '\n');

function sheetSVG(m, prints) {
  const { cols, rows } = m.grid;
  const S = G.SIZE;
  const tiles = prints.map((p, i) => {
    const x = (i % cols) * S, y = Math.floor(i / cols) * S;
    return `  <svg id="${p.file}" x="${x}" y="${y}" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">\n${body(p.svg).replace(/^/gm, '  ').replace(/\s+$/, '')}\n  </svg>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * SHEET_TILE_PX}" height="${rows * SHEET_TILE_PX}" viewBox="0 0 ${cols * S} ${rows * S}" shape-rendering="geometricPrecision">
  <title>${m.title}</title>
${tiles.join('\n')}
</svg>
`;
}

// Mark a PNG as sRGB (rendering intent: perceptual) by inserting an sRGB chunk after IHDR.
function tagSRGB(buf) {
  if (buf.includes(Buffer.from('sRGB'))) return buf;
  const ihdrEnd = 8 + 4 + 4 + 13 + 4;
  const type = Buffer.from('sRGB');
  const data = Buffer.from([0]);
  const len = Buffer.alloc(4); len.writeUInt32BE(1);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([type, data])) >>> 0);
  return Buffer.concat([buf.subarray(0, ihdrEnd), len, type, data, crc, buf.subarray(ihdrEnd)]);
}

async function rasterise(jobs) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text'] });
  try {
    for (const { svg, w, h, out } of jobs) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`);
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h }, omitBackground: false });
      fs.writeFileSync(out, tagSRGB(png));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

function previewHTML(m, prints) {
  const data = prints.map((p) => ({ n: p.n, title: p.title, file: p.file, pair: p.pair }));
  const tpl = fs.readFileSync(path.join(DIR, 'preview.template.html'), 'utf8');
  return tpl
    .replace('/*__DATA__*/', `const PRINTS = ${JSON.stringify(data)};\nconst COLS = ${m.grid.cols};`)
    .replaceAll('__TITLE__', m.title);
}

async function main() {
  const m = loadManifest();
  const only = process.argv.includes('--svg-only');
  for (const d of ['svg', 'png']) fs.mkdirSync(path.join(DIR, d), { recursive: true });

  const prints = m.prints.map((p) => ({
    ...p,
    svg: owlSVG(p, { px: PRINT_PX, title: `${m.title} ${p.n} — ${p.title}` }),
  }));
  for (const p of prints) fs.writeFileSync(path.join(DIR, 'svg', `${p.file}.svg`), p.svg);

  const sheet = sheetSVG(m, prints);
  fs.writeFileSync(path.join(DIR, 'night-watch-sheet.svg'), sheet);
  fs.writeFileSync(path.join(DIR, 'index.html'), previewHTML(m, prints));

  if (!only) {
    const jobs = prints.map((p) => ({ svg: p.svg, w: PRINT_PX, h: PRINT_PX, out: path.join(DIR, 'png', `${p.file}.png`) }));
    jobs.push({ svg: sheet, w: m.grid.cols * SHEET_TILE_PX, h: m.grid.rows * SHEET_TILE_PX, out: path.join(DIR, 'night-watch-sheet.png') });
    await rasterise(jobs);
  }
  console.log(`rendered ${prints.length} prints${only ? ' (SVG only)' : ' + PNGs'}, sheet, preview`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
