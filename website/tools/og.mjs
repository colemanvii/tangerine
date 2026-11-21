#!/usr/bin/env node
/* Render social cards (1200 × 630 JPEG) and icons with Playwright, using the site's own fonts.
 *
 *   python3 -m http.server 4175 --bind 127.0.0.1 --directory website &
 *   node website/tools/og.mjs http://127.0.0.1:4175
 *
 * Writes media/brand/og.jpg, media/<slug>/og.jpg, favicon.png and apple-touch-icon.png.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.argv[2] || 'http://127.0.0.1:4175').replace(/\/$/, '');
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const site = read('content/site.json');
const manifest = read('content/media.json');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const shell = body => `<!doctype html><html><head><meta charset="utf-8"><base href="${BASE}/"><link rel="stylesheet" href="${BASE}/assets/site.css">
<style>html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f8f5ed}body::before{opacity:.06}
.card{position:relative;width:1200px;height:630px;display:grid;grid-template-columns:600px 600px}
.pic{background:#efebe1;display:flex;align-items:center;justify-content:center;overflow:hidden}
.pic img{max-width:100%;max-height:100%;object-fit:contain}
.txt{padding:48px 52px;display:flex;flex-direction:column;justify-content:space-between;border-left:1px solid #191714}
.no{font:500 15px/1 Archivo;font-stretch:112%;letter-spacing:.07em;color:#bf3d00}
.nm{font:400 84px/.95 'Instrument Serif';letter-spacing:-.018em;color:#191714;margin:0}
.ft{display:flex;justify-content:space-between;align-items:end}
.ft img{width:190px}
.lb{font:560 14px/1.3 Archivo;font-stretch:115%;letter-spacing:.075em;text-transform:uppercase;color:#5f5a51}
</style></head><body>${body}</body></html>`;

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(BASE + '/404.html'); // same origin, so web fonts load (they need CORS otherwise)
const shoot = async (html, out, opts = {}) => {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  writeFileSync(join(ROOT, out), await page.screenshot({ type: opts.png ? 'png' : 'jpeg', quality: opts.png ? undefined : 86, omitBackground: !!opts.transparent }));
  console.log('wrote', out);
};

await shoot(shell(`<div style="height:630px;display:flex;flex-direction:column;justify-content:space-between;padding:48px 56px">
<div style="display:flex;justify-content:space-between" class="lb"><span>Tangerine</span><span>Independent creative practice</span></div>
<div style="display:flex;justify-content:center"><img src="${BASE}/media/brand/tangerine-script-1640.webp" style="width:600px"></div>
<div style="display:flex;justify-content:space-between;border-top:1px solid #191714;padding-top:14px" class="lb"><span>We build brands.</span><span>ex-tangerina.com</span></div></div>`), 'media/brand/og.jpg');

for (const slug of site.relationships) {
  const r = read(`content/${slug}.json`);
  const key = r.og;
  const m = manifest[key];
  const src = `${BASE}/media/${key}-${m.sizes.find(s => s >= 1280) || m.sizes[m.sizes.length - 1]}.webp`;
  await shoot(shell(`<div class="card"><div class="pic"><img src="${src}"></div><div class="txt">
<div class="no">${r.number}</div><h1 class="nm">${esc(r.name)}</h1>
<div class="ft"><span class="lb">${esc(r.status)} · ${esc(r.since)}</span><img src="${BASE}/media/brand/tangerine-script-480.webp"></div></div></div>`), `media/${slug}/og.jpg`);
}

/* Icons: the orange signal square with a paper italic t. */
const icon = size => `<!doctype html><html><head><base href="${BASE}/"><link rel="stylesheet" href="${BASE}/assets/site.css"><style>html,body{margin:0;background:transparent}body::before{display:none}
.i{width:${size}px;height:${size}px;background:#df4900;color:#f8f5ed;display:flex;align-items:center;justify-content:center;font:italic 400 ${Math.round(size * 1.02)}px/1 "Instrument Serif";padding-bottom:${Math.round(size * .1)}px;box-sizing:border-box}</style></head><body><div class="i">t</div></body></html>`;
for (const [size, out] of [[64, 'favicon.png'], [180, 'apple-touch-icon.png']]) {
  await page.setViewportSize({ width: size, height: size });
  await shoot(icon(size), out, { png: true });
}
await b.close();
