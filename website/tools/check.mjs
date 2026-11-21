#!/usr/bin/env node
/* Smoke test for the generated site. Needs Playwright and a local server:
 *
 *   python3 -m http.server 4175 --bind 127.0.0.1 --directory website &
 *   node website/tools/check.mjs http://127.0.0.1:4175
 *
 * Checks every page at desktop, tablet and phone sizes: no console errors, no failed or 4xx/5xx
 * requests, no horizontal page scroll, one h1, alt text on every image, every image decodes; checks
 * the Index 005 homepage (one screen, four segment links, lettering size); then drives the viewer
 * (open, arrows, Escape, deep link) and the discipline filter.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.argv[2] || 'http://127.0.0.1:4175').replace(/\/$/, '');
const site = JSON.parse(readFileSync(join(ROOT, 'content/site.json'), 'utf8'));
const pages = ['/', ...site.relationships.map(s => `/${s}/`), '/404.html'];
const contexts = {
  desktop: { viewport: { width: 1440, height: 900 } },
  tablet: { ...devices['iPad Pro 11'] },
  phone: { ...devices['iPhone 13'] },
};

let failures = 0;
const fail = (where, msg) => { failures++; console.log(`  ✗ ${where}: ${msg}`); };
const b = await chromium.launch();

for (const [name, opts] of Object.entries(contexts)) {
  const ctx = await b.newContext(opts);
  for (const path of pages) {
    const p = await ctx.newPage();
    const errors = [];
    p.on('console', m => m.type() === 'error' && errors.push(m.text()));
    p.on('pageerror', e => errors.push(e.message));
    p.on('requestfailed', r => !/\.mp4/.test(r.url()) && errors.push('failed ' + r.url()));
    p.on('response', r => r.status() >= 400 && !r.url().endsWith('/404.html') && errors.push(r.status() + ' ' + r.url()));
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } });
    await p.waitForLoadState('networkidle');
    const r = await p.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h1: document.querySelectorAll('h1').length,
      noAlt: [...document.images].filter(i => !i.hasAttribute('alt')).map(i => i.src),
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.content || '',
      og: document.querySelector('meta[property="og:image"]')?.content || '',
    }));
    const where = `${name} ${path}`;
    if (r.overflow > 0) fail(where, `horizontal overflow ${r.overflow}px`);
    if (r.h1 !== 1) fail(where, `${r.h1} h1 elements`);
    if (r.noAlt.length) fail(where, `images without alt: ${r.noAlt.join(', ')}`);
    if (r.broken.length) fail(where, `broken images: ${r.broken.join(', ')}`);
    if (!r.desc || !r.og) fail(where, 'missing description or og:image');
    errors.forEach(e => fail(where, e));
    await p.close();
  }

  /* The index: one screen, four segments, four links, legible lettering. */
  {
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const where = `${name} index`;
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const r = await p.evaluate(() => {
      const svg = document.querySelector('svg.fruit'), box = svg.getBoundingClientRect();
      const scale = Math.min(box.width, box.height) / 1000;
      const names = [...svg.querySelectorAll('.td,.tm')].filter(g => getComputedStyle(g).display !== 'none').flatMap(g => [...g.querySelectorAll('.nm')]);
      const peel = svg.querySelector('.peel').getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollHeight - innerHeight,
        links: [...svg.querySelectorAll('a')].map(a => a.getAttribute('href')),
        px: names.length ? Math.min(...names.map(t => +t.getAttribute('font-size'))) * scale : 0,
        visible: names.map(t => t.textContent).join(' '),
        inside: peel.left >= -1 && peel.top >= -1 && peel.right <= innerWidth + 1 && peel.bottom <= innerHeight + 1,
      };
    });
    const want = site.relationships.map(s => `/${s}/`);
    if (r.scroll > 0) fail(where, `page scrolls ${r.scroll}px`);
    if (r.links.join() !== want.join()) fail(where, `segment links ${r.links.join(', ')}`);
    if (r.px < 18.7) fail(where, `names render at ${r.px.toFixed(1)}px (large-text minimum is 18.7px bold)`);
    if (r.visible !== 'Freeman Joseph Martin Kashus Culpepper Scout Motors') fail(where, `visible names "${r.visible}"`);
    if (!r.inside) fail(where, 'the fruit is cut off by the viewport');
    await p.keyboard.press('Tab');
    if ((await p.evaluate(() => document.activeElement.getAttribute('href'))) !== want[0]) fail(where, 'first Tab does not reach Freeman');
    await p.locator(`svg.fruit a[href="${want[3]}"]`).click({ position: { x: 40, y: 40 } }).catch(() => p.locator(`svg.fruit a[href="${want[3]}"] .seg`).click());
    await p.waitForURL(`**${want[3]}`, { timeout: 3000 }).catch(() => fail(where, 'clicking the Scout segment did not navigate'));
    errors.forEach(e => fail(where, e));
    await p.close();
  }

  /* Viewer + filter on the first archive. */
  const slug = site.relationships[0];
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${slug}/`, { waitUntil: 'networkidle' });
  const where = `${name} viewer /${slug}/`;
  await p.locator('.art .frame[href]').first().click();
  if (!(await p.waitForSelector('dialog.viewer[open]', { timeout: 3000 }).catch(() => null))) fail(where, 'viewer did not open');
  const c1 = await p.locator('.viewer .counter').textContent();
  if (!/^01 \/ \d\d$/.test(c1)) fail(where, `counter "${c1}"`);
  if (name === 'phone') await p.locator('.v-nav-mobile [data-step="1"]').click();
  else await p.keyboard.press('ArrowRight');
  const c2 = await p.locator('.viewer .counter').textContent();
  if (!c2.startsWith('02')) fail(where, `next did not advance ("${c2}")`);
  if (!p.url().includes('#')) fail(where, 'hash not set');
  await p.keyboard.press('Escape');
  if (!(await p.waitForFunction(() => !document.querySelector('dialog.viewer[open]'), null, { timeout: 2000 }).catch(() => null))) fail(where, 'Escape did not close');
  await p.waitForTimeout(150);
  const id = await p.locator('.art[data-id]').nth(2).getAttribute('data-id');
  await p.goto(`${BASE}/${slug}/#${id}`, { waitUntil: 'networkidle' });
  if (!(await p.waitForSelector('dialog.viewer[open]', { timeout: 3000 }).catch(() => null))) fail(where, 'deep link did not open viewer');
  await p.keyboard.press('Escape');
  const btn = p.locator('.filter button').nth(1);
  const key = await btn.getAttribute('data-filter');
  await btn.click();
  const shown = await p.evaluate(k => [...document.querySelectorAll('.art[data-id]')].filter(a => !a.hidden).every(a => a.dataset.disc.split(' ').includes(k)), key);
  if (!shown) fail(where, `filter "${key}" shows other disciplines`);
  await p.close();
  await ctx.close();
  console.log(`${name}: checked ${pages.length} pages + viewer`);
}
await b.close();
console.log(failures ? `\n${failures} problem(s)` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
