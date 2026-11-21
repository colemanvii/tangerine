#!/usr/bin/env node
/* Tangerine — static site generator. No dependencies.
 *
 *   node website/tools/build.mjs
 *
 * Reads website/content/site.json, one JSON file per relationship and the media
 * manifest (website/content/media.json, written by tools/media.py), then writes
 * website/index.html, website/<slug>/index.html, website/404.html,
 * website/sitemap.xml and website/robots.txt. See website/README.md.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const site = read('content/site.json');
const manifest = read('content/media.json');
const rels = site.relationships.map(slug => ({ slug, ...read(`content/${slug}.json`) }));
const ORIGIN = site.origin.replace(/\/$/, '');
const VERSION = createHash('sha1').update(readFileSync(join(ROOT, 'assets/site.css'))).update(readFileSync(join(ROOT, 'assets/site.js'))).digest('hex').slice(0, 10);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/* Inline text: escape, then allow *italic* and [label](href). */
const inline = s => esc(s)
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => {
    const ext = /^https?:/.test(h);
    return `<a href="${h}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${t}${ext ? '&#8202;↗' : ''}</a>`;
  });
const slugify = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = n => String(n).padStart(2, '0');
const fmtDate = iso => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };

function media(key) {
  const m = manifest[key];
  if (!m) throw new Error(`Missing media "${key}" — run tools/media.py first.`);
  const base = `/media/${key}`;
  const max = m.sizes[m.sizes.length - 1];
  return {
    ...m,
    src: (w = 1280) => `${base}-${m.sizes.find(s => s >= w) || max}.webp`,
    srcset: m.sizes.map(s => `${base}-${s}.webp ${s}w`).join(', '),
    height: w => Math.round(m.h * w / m.w),
    max,
  };
}

const SIZES = {
  full: '(max-width:720px) 100vw, 96vw', wide: '(max-width:720px) 100vw, 82vw',
  left: '(max-width:1100px) 100vw, 58vw', right: '(max-width:1100px) 100vw, 58vw', side: '(max-width:1100px) 100vw, 66vw',
  center: '(max-width:720px) 100vw, (max-width:1100px) 66vw, 50vw', narrow: '(max-width:720px) 84vw, (max-width:1100px) 50vw, 33vw',
  half: '(max-width:720px) 100vw, 48vw', third: '(max-width:720px) 100vw, 32vw', offset: '(max-width:720px) 100vw, 40vw',
};

function img(key, { sizes, cls = '', alt, eager = false, w = 1280 }) {
  const m = media(key);
  const mw = Math.min(w, m.max);
  return `<img src="${m.src(w)}" srcset="${m.srcset}" sizes="${sizes}" width="${mw}" height="${m.height(mw)}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${cls ? ` class="${cls}"` : ''}>`;
}

/* ———————————————————————— Shared chrome */
function head({ title, description, path, image, imageAlt }) {
  const url = ORIGIN + path;
  const og = image ? `${ORIGIN}${image}` : `${ORIGIN}/media/brand/og.jpg`;
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#f8f5ed">
<meta property="og:site_name" content="Tangerine">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt || 'Tangerine')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/archivo-variable-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/instrument-serif-regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${VERSION}">
<script src="/assets/site.js?v=${VERSION}" defer></script>
</head>`;
}

function header({ current = '', crumb = '' } = {}) {
  const nav = [['/#index', 'Index', 'index'], ['/#studio', 'Studio', 'studio'], ['/#contact', 'Contact', 'contact']]
    .map(([h, t, k]) => `<a href="${h}"${current === k ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="head wrap">
<a class="mark" href="/" aria-label="Tangerine — index"><img src="/media/brand/tangerine-script-480.webp" width="480" height="200" alt="Tangerine"></a>
<div class="crumb label">${crumb}</div>
<nav class="nav label" aria-label="Primary">${nav}</nav>
</header>`;
}

const footer = () => `<footer class="foot wrap">
<span>Tangerine — We build brands.</span>
<span>Index updated <time datetime="${site.updated}">${fmtDate(site.updated)}</time></span>
<a href="${site.contact.href}" target="_blank" rel="noopener noreferrer">${esc(site.contact.label)}&#8202;↗</a>
</footer>`;

const count = r => r.chapters.reduce((n, c) => n + c.artifacts.length, 0);
const allArtifacts = r => r.chapters.flatMap(c => c.artifacts);

/* ———————————————————————— Home */
function home() {
  const total = rels.reduce((n, r) => n + count(r), 0);
  const entries = rels.map((r, i) => {
    const byId = Object.fromEntries(allArtifacts(r).map(a => [a.id, a]));
    const strip = r.index.map(id => {
      const a = byId[id];
      if (!a) throw new Error(`${r.slug}: index id "${id}" not found`);
      const key = a.kind === 'video' ? a.poster : a.media;
      const m = media(key), ratio = m.w / m.h;
      return `<figure>${img(key, { sizes: `(max-width:720px) ${Math.round(150 * ratio)}px, ${Math.round(260 * ratio)}px`, w: 640, alt: '' })}</figure>`;
    }).join('');
    return `<li class="entry">
<a href="/${r.slug}/">
<span class="no">${r.number}</span>
<h3 class="name display">${esc(r.name)}</h3>
<span class="since label">${esc(r.since)}</span>
<span class="status label">${esc(r.status)}</span>
<span class="n label">${pad(count(r))}<span class="arrow" aria-hidden="true">→</span></span>
<p class="summary">${inline(r.summary)}</p>
<p class="disc label">${r.disciplines.map(esc).join(' · ')}</p>
<div class="strip" aria-hidden="true">${strip}</div>
</a>
</li>`;
  }).join('\n');

  const practice = site.studio.practice.map((p, i) => `<li><span>${pad(i + 1)}</span>${esc(p)}</li>`).join('');
  const log = site.log.map(l => `<li><time class="label" datetime="${l.date}">${fmtDate(l.date)}</time><span>${inline(l.text)}</span></li>`).join('');

  return `${head({ title: site.title, description: site.description, path: '/', imageAlt: 'The Tangerine script wordmark in orange on warm paper' })}
<body class="home">
${header({ crumb: '' })}
<main id="main">
<section class="opening wrap grid" aria-labelledby="hello">
<h1 id="hello" class="display">We build brands<span class="o">.</span></h1>
<dl class="masthead label">
<dt>Practice</dt><dd>Independent</dd>
<dt>Relationships</dt><dd>${pad(rels.length)}</dd>
<dt>Artifacts</dt><dd>${pad(total)}</dd>
<dt>Updated</dt><dd><time datetime="${site.updated}">${fmtDate(site.updated)}</time></dd>
</dl>
<p class="lede-label label muted">Tangerine</p>
<p class="lede">${inline(site.lede)}</p>
</section>

<section id="index" class="wrap" aria-labelledby="index-title">
<div class="index-head label">
<h2 id="index-title" class="c1" style="margin:0;font:inherit">Index</h2>
<span class="c2 muted">${rels.length} relationships · ${total} artifacts</span>
<span class="c3 muted">Since</span>
<span class="c4 muted">Status</span>
<span class="c5 muted">Artifacts</span>
</div>
<ol class="entries">
${entries}
</ol>
</section>

<section id="studio" class="section studio wrap grid" aria-labelledby="studio-title">
<h2 id="studio-title" class="label">Studio</h2>
<div class="copy">
${site.studio.copy.map((p, i) => `<p${i > 0 ? ' class="small"' : ''}>${inline(p)}</p>`).join('\n')}
</div>
<ul class="practice" aria-label="Practice">${practice}</ul>
</section>

<section class="section wrap grid" aria-labelledby="log-title">
<h2 id="log-title" class="label">Archive log</h2>
<ol class="log" reversed>${log}</ol>
</section>

<section id="contact" class="section contact wrap grid" aria-labelledby="contact-title">
<h2 id="contact-title" class="label">Contact</h2>
<div class="copy">
<p>${inline(site.contact.note)}</p>
<a class="big display" href="${site.contact.href}" target="_blank" rel="noopener noreferrer">${esc(site.contact.handle)}</a>
</div>
</section>

<div class="signature wrap"><img src="/media/brand/tangerine-script-1640.webp" width="1640" height="684" loading="lazy" decoding="async" alt="Tangerine"></div>
</main>
${footer()}
</body>
</html>
`;
}

/* ———————————————————————— Archive */
function artifact(a, n, r) {
  const layout = a.layout || 'center';
  const sizeKey = layout.replace(/-[abc]$/, '').replace(/^side.*/, 'side');
  const cls = layout.startsWith('side') ? `l-side${layout === 'side-flip' ? ' flip' : ''}` : `l-${layout}`;
  const disc = a.discipline.map(slugify).join(' ');
  const facts = [a.discipline.join(', '), a.date, a.status].filter(Boolean).map(f => `<span>${esc(f)}</span>`).join('');
  const title = a.title;
  const frameCls = ['frame', a.frame || 'bare'].join(' ');
  let body;
  if (a.kind === 'quote') {
    body = `<div class="frame" role="group" aria-label="${esc(title)}"><blockquote class="${a.style === 'sans' ? 'sans' : ''}">${inline(a.text)}${a.source ? `<small>${esc(a.source)}</small>` : ''}</blockquote></div>`;
  } else if (a.kind === 'video') {
    const p = media(a.poster);
    body = `<a class="${frameCls}" href="#${a.id}" aria-label="Open ${esc(title)}">
<video data-loop muted loop playsinline preload="none" poster="${p.src(1280)}" width="${a.w}" height="${a.h}" aria-label="${esc(a.alt)}"><source src="/media/${a.src}" type="video/mp4"></video>
<span class="open label">View</span></a>`;
  } else {
    body = `<a class="${frameCls}" href="#${a.id}" aria-label="Open ${esc(title)}">${img(a.media, { sizes: SIZES[sizeKey] || SIZES.center, alt: a.alt })}<span class="open label" aria-hidden="true">View</span></a>`;
  }
  return `<figure class="art ${cls}${a.kind === 'quote' ? ' quote' : ''}" id="${a.id}" data-id="${a.id}" data-n="${pad(n)}" data-kind="${a.kind || 'image'}" data-disc="${disc}">
${body}
<figcaption class="caption"><span class="num">${pad(n)}</span><h3 class="t">${inline(title)}</h3><span class="facts">${facts}</span>${a.note ? `<p class="d">${inline(a.note)}</p>` : ''}</figcaption>
</figure>`;
}

function archive(r, i) {
  const next = rels[(i + 1) % rels.length];
  const prev = rels[(i - 1 + rels.length) % rels.length];
  const total = count(r);
  const discCounts = {};
  allArtifacts(r).forEach(a => a.discipline.forEach(d => { discCounts[d] = (discCounts[d] || 0) + 1; }));
  const order = r.filters || Object.keys(discCounts);
  const filters = [`<li><button type="button" data-filter="all" aria-pressed="true">All<sup>${pad(total)}</sup></button></li>`]
    .concat(order.filter(d => discCounts[d]).map(d => `<li><button type="button" data-filter="${slugify(d)}" aria-pressed="false">${esc(d)}<sup>${pad(discCounts[d])}</sup></button></li>`)).join('');
  let n = 0;
  const chapters = r.chapters.map((c, ci) => `<section class="chapter" aria-labelledby="ch-${ci + 1}">
<div class="chapter-head wrap"><span class="label">${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][ci]}</span><h2 id="ch-${ci + 1}">${inline(c.title)}</h2>${c.note ? `<p>${inline(c.note)}</p>` : ''}</div>
<div class="spread wrap">
${c.artifacts.map(a => artifact(a, ++n, r)).join('\n')}
</div>
</section>`).join('\n');

  const meta = [['Since', esc(r.since)], ['Status', esc(r.status)], ['Disciplines', r.disciplines.map(esc).join(', ')], ['Artifacts', pad(total)]]
    .concat((r.links || []).map(l => [l.label, `<a href="${l.href}" target="_blank" rel="noopener noreferrer">${esc(l.text)}&#8202;↗</a>`]))
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  const crumb = `<a href="/#index">Index</a><span class="muted">${r.number} / ${pad(rels.length)}</span>`;
  const cover = media(r.og || allArtifacts(r).find(a => a.id === r.index[0]).media);

  return `${head({ title: `${r.name} — Tangerine`, description: r.description, path: `/${r.slug}/`, image: `/media/${r.slug}/og.jpg`, imageAlt: r.ogAlt || r.name })}
<body class="archive-page">
${header({ current: 'index', crumb })}
<main id="main">
<section class="title wrap grid" aria-labelledby="t">
<span class="no">${r.number}</span>
<h1 id="t" class="display">${esc(r.name)}</h1>
<div class="intro">${r.intro.map(p => `<p>${inline(p)}</p>`).join('')}</div>
<dl class="meta label-list">${meta}</dl>
${r.notice ? `<p class="note-status"><span class="label">Note</span><span>${inline(r.notice)}</span></p>` : ''}
</section>

<div class="toolbar wrap" role="region" aria-label="Filter the archive by discipline">
<ul class="filter label">${filters}</ul>
<span class="count label" data-count aria-live="polite">${total} artifacts</span>
</div>

<div data-archive>
${chapters}
</div>

<nav class="next wrap" aria-label="Next relationship">
<a href="/${next.slug}/"><span class="label">Next relationship</span><span class="no">${next.number}</span><span class="name display">${esc(next.name)}</span></a>
</nav>
<p class="wrap label" style="margin:0 0 40px"><a href="/#index">← Back to the index</a> &nbsp;·&nbsp; <a href="/${prev.slug}/">Previous: ${esc(prev.name)}</a></p>
</main>
${footer()}

<dialog class="viewer" aria-label="Artifact viewer">
<div class="v-top label">
<span class="where">${esc(r.name)}</span>
<span class="counter" aria-live="polite"></span>
<button class="close v-btn label" type="button">Close <span aria-hidden="true">×</span></button>
</div>
<div class="v-stage">
<button class="v-arrow" type="button" data-step="-1" aria-label="Previous artifact">←</button>
<div class="v-media"></div>
<button class="v-arrow" type="button" data-step="1" aria-label="Next artifact">→</button>
</div>
<div class="v-bottom">
<span class="v-cap-num"></span>
<p class="v-cap-title"></p>
<p class="v-cap-facts label" style="margin:0"></p>
<p class="v-cap-d"></p>
<div class="v-nav-mobile label"><button class="v-btn" type="button" data-step="-1">← Previous</button><button class="v-btn" type="button" data-step="1">Next →</button></div>
</div>
</dialog>
</body>
</html>
`;
}

function notFound() {
  return `${head({ title: 'Not found — Tangerine', description: site.description, path: '/404' })}
<body>
${header()}
<main id="main" class="wrap lost">
<p class="label o">404</p>
<h1 class="display">Not in the archive<span class="o">.</span></h1>
<p class="label"><a href="/">Return to the index</a></p>
</main>
${footer()}
</body>
</html>
`;
}

/* ———————————————————————— Write */
const out = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); console.log('wrote', p); };
out('index.html', home());
rels.forEach((r, i) => {
  if (!existsSync(join(ROOT, 'media', r.slug, 'og.jpg'))) console.warn(`  note: media/${r.slug}/og.jpg missing (run tools/og.mjs)`);
  out(`${r.slug}/index.html`, archive(r, i));
});
out('404.html', notFound());
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', ...rels.map(r => `/${r.slug}/`)].map(p => `<url><loc>${ORIGIN}${p}</loc><lastmod>${site.updated}</lastmod></url>`).join('\n')}
</urlset>
`);
out('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
