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
const VERSION = createHash('sha1').update(readFileSync(join(ROOT, 'assets/site.css'))).update(readFileSync(join(ROOT, 'assets/site.js'))).update(readFileSync(join(ROOT, 'assets/index.js'))).digest('hex').slice(0, 10);

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
function head({ title, description, path, image, imageAlt, extra = '' }) {
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
<script src="/assets/site.js?v=${VERSION}" defer></script>${extra}
</head>`;
}

const total = () => rels.reduce((n, r) => n + count(r), 0);
const signal = () => `<span class="signal" aria-hidden="true"></span>`;

/* One bar for every page: the mark, a middle register, the way out. */
function header({ mid = '', current = '' } = {}) {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="bar">
<a class="mark" href="/" aria-label="Tangerine — index"><img src="/media/brand/tangerine-script-480.webp" width="480" height="200" alt="Tangerine"></a>
<div class="bar-mid">${mid}</div>
<nav class="bar-end sys" aria-label="Site">${current ? `<a href="/#${current}">Index</a>` : `<span class="mute">${pad(total())} entries · ${fmtDate(site.updated)}${signal()}</span>`}<a href="#studio" data-studio>Studio</a></nav>
</header>`;
}

/* Studio: everything the site says about itself, kept out of the way of the work. */
const studio = () => `<section id="studio" class="studio" aria-labelledby="studio-title">
<div class="studio-in">
<div class="studio-top sys"><h2 id="studio-title" class="sys">Studio</h2><button class="studio-close" type="button" data-studio-close>Close <span aria-hidden="true">×</span></button></div>
<p class="studio-lede">${inline(site.lede)}</p>
${site.studio.copy.map(p => `<p class="studio-p">${inline(p)}</p>`).join('\n')}
<h3 class="sys mute">Practice</h3>
<ol class="studio-list">${site.studio.practice.map((p, i) => `<li><span class="sys mute">${pad(i + 1)}</span>${esc(p)}</li>`).join('')}</ol>
<h3 class="sys mute">Log</h3>
<ol class="studio-list log" reversed>${site.log.map(l => `<li><time class="sys mute" datetime="${l.date}">${fmtDate(l.date)}</time>${inline(l.text)}</li>`).join('')}</ol>
<h3 class="sys mute">Contact</h3>
<p class="studio-contact">${inline(site.contact.note)} <a href="${site.contact.href}" target="_blank" rel="noopener noreferrer">${esc(site.contact.handle)}&#8202;↗</a></p>
</div>
</section>`;

const footer = () => `<footer class="foot sys">
<span>Tangerine — We build brands.</span>
<span class="mute">Index updated <time datetime="${site.updated}">${fmtDate(site.updated)}</time></span>
<a href="${site.contact.href}" target="_blank" rel="noopener noreferrer">${esc(site.contact.label)}&#8202;↗</a>
</footer>`;

const viewerMarkup = where => `<dialog class="viewer" aria-label="Artifact viewer">
<div class="v-top sys">
<span class="where">${where}</span>
<span class="counter" aria-live="polite"></span>
<button class="close v-btn sys" type="button">Close <span aria-hidden="true">×</span></button>
</div>
<div class="v-stage">
<button class="v-arrow" type="button" data-step="-1" aria-label="Previous artifact">←</button>
<div class="v-media"></div>
<button class="v-arrow" type="button" data-step="1" aria-label="Next artifact">→</button>
</div>
<div class="v-bottom">
<span class="v-cap-num sys"></span>
<p class="v-cap-title"></p>
<p class="v-cap-facts sys"></p>
<p class="v-cap-d"></p>
<div class="v-nav-mobile sys"><button class="v-btn" type="button" data-step="-1">← Previous</button><button class="v-btn" type="button" data-step="1">Next →</button></div>
</div>
</dialog>`;

const count = r => r.chapters.reduce((n, c) => n + c.artifacts.length, 0);
const allArtifacts = r => r.chapters.flatMap(c => c.artifacts);

/* ———————————————————————— Home: the index as four tracks. */
function home() {
  const data = archiveData();
  const dims = a => a.kind === 'quote' ? 'Text' : `${a.w} × ${a.h}`;
  const tracks = rels.map((r, k) => {
    const items = data.artifacts.filter(a => a.rel === r.slug);
    const plates = items.map(a => {
      const ratio = a.w / a.h;
      const inner = a.kind === 'quote'
        ? `<span class="pl-q${a.style === 'sans' ? ' sans' : ''}">${esc(a.quote)}</span>`
        : `<img src="${a.thumb}" srcset="${a.srcset}" sizes="${k === 0 ? `${Math.round(64 * ratio)}vh` : `${Math.round(56 * ratio)}px`}" width="${a.w}" height="${a.h}" alt="${esc(a.alt)}"${k === 0 && a.g < 1 ? ' fetchpriority="high"' : k === 0 && a.g < 3 ? '' : ' loading="lazy"'} decoding="async">`;
      return `<li class="pl${a.kind === 'quote' ? ' is-q' : ''}" data-id="${a.id}" data-g="${a.g}"${a.kind === 'quote' ? '' : ` style="aspect-ratio:${a.w}/${a.h}"`}><a href="${a.dossier}" aria-label="${a.n}, ${esc(a.text)}">${inner}</a><span class="tag sys" aria-hidden="true">${a.n}</span></li>`;
    }).join('');
    return `<section class="tr${k === 0 ? ' on' : ''}" id="${r.slug}" data-k="${k}" aria-labelledby="nm-${k}">
<div class="lab">
<span class="lab-no sys">${r.number}</span><span class="lab-ct sys">${pad(count(r))}</span>
<h2 class="lab-nm" id="nm-${k}"><button type="button" data-k="${k}" aria-expanded="${k === 0}" aria-controls="strip-${k}">${esc(r.name)}</button></h2>
<div class="lab-more"><p class="lab-sum">${inline(r.summary)}</p><p class="lab-meta sys">${esc(r.since)} · ${esc(r.status)}</p><a class="lab-go sys" href="/${r.slug}/">Dossier <span aria-hidden="true">→</span></a></div>
</div>
<ol class="strip" id="strip-${k}" aria-label="${esc(r.name)}, ${count(r)} entries">${plates}</ol>
</section>`;
  }).join('\n');
  const a0 = data.artifacts[0];
  const facts = a => [a.disc.join(', '), a.date, a.status].filter(Boolean).join(' · ');

  return `${head({ title: site.title, description: site.description, path: '/', imageAlt: 'The Tangerine script wordmark in orange on warm paper', extra: `\n<script src="/assets/index.js?v=${VERSION}" defer></script>` })}
<body class="idx">
${header({ mid: `<p class="decl">We build brands.</p>` })}
<main id="main" class="tracks">
<h1 class="visually-hidden">Tangerine — an index of work</h1>
${tracks}
</main>
<footer class="readout" aria-live="polite">
<span class="r-code sys">${a0.code} ${a0.no}.${a0.n}</span>
<p class="r-title"><span class="r-t">${a0.title}</span><span class="r-f sys">${esc(facts(a0))}</span></p>
<span class="r-dim sys">${dims(a0)}</span>
<span class="r-keys sys" aria-hidden="true"><kbd>←</kbd><kbd>→</kbd> work <kbd>↑</kbd><kbd>↓</kbd> relationship <kbd>↵</kbd> view</span>
</footer>
${studio()}
${viewerMarkup('Index')}
<script type="application/json" id="archive-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
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
  const m = a.kind === 'quote' ? null : media(a.kind === 'video' ? a.poster : a.media);
  const dim = a.kind === 'video' ? `${a.w} × ${a.h} · film` : m ? `${m.w} × ${m.h}` : '';
  const facts = [a.discipline.join(', '), a.date, a.status].filter(Boolean).map(f => `<span>${esc(f)}</span>`).join('') + (dim ? `<span class="dim">${dim}</span>` : '');
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
<figcaption class="caption"><span class="num">${r.code} ${pad(n)}</span><h3 class="t">${inline(title)}</h3><span class="facts">${facts}</span>${a.note ? `<p class="d">${inline(a.note)}</p>` : ''}</figcaption>
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

  const meta = [esc(r.since), esc(r.status), `${pad(total)} entries`]
    .concat((r.links || []).map(l => `${esc(l.label)} <a href="${l.href}" target="_blank" rel="noopener noreferrer">${esc(l.text)}&#8202;↗</a>`)).join('<span class="sep">·</span>');
  let cn = 0;
  const contents = allArtifacts(r).map(a => `<a href="#${a.id}"><sup>${pad(++cn)}</sup>${esc(a.title.replace(/\*/g, ''))}</a>`).join('<span class="sep">/</span>');
  const relsNav = rels.map(x => `<a href="/${x.slug}/"${x.slug === r.slug ? ' aria-current="page"' : ''}><span class="o">${x.number}</span> ${x.code}</a>`).join('');
  return `${head({ title: `${r.name} — Tangerine`, description: r.description, path: `/${r.slug}/`, image: `/media/${r.slug}/og.jpg`, imageAlt: r.ogAlt || r.name })}
<body class="archive-page">
${header({ current: r.slug, mid: `<nav class="rels-nav sys" aria-label="Relationships">${relsNav}</nav>` })}
<main id="main">
<section class="title wrap grid" aria-labelledby="t">
<span class="no sys">${r.number}</span>
<h1 id="t" class="display">${esc(r.name)}</h1>
<p class="meta sys">${meta}</p>
<div class="intro">${r.intro.map(p => `<p>${inline(p)}</p>`).join('')}</div>
${r.notice ? `<p class="note-status"><span class="sys o">Note</span><span>${inline(r.notice)}</span></p>` : ''}
<nav class="contents" aria-label="Contents"><span class="sys mute">Contents</span><p>${contents}</p></nav>
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
<p class="back sys"><a href="/#${r.slug}">← Index</a><a href="/${prev.slug}/">Previous: ${esc(prev.name)}</a></p>
</main>
${footer()}

${studio()}
${viewerMarkup(esc(r.name))}
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
<p class="sys"><a href="/">Return to the index</a></p>
</main>
${footer()}
${studio()}
</body>
</html>
`;
}

/* ———————————————————————— Archive data: one flat, ordered record of every artifact. */
function archiveData() {
  let g = 0;
  const artifacts = rels.flatMap(r => {
    let n = 0;
    return r.chapters.flatMap(c => c.artifacts.map(a => {
      const kind = a.kind || 'image';
      const rec = {
        id: a.id, g: g++, rel: r.slug, code: r.code, no: r.number, n: pad(++n), chapter: c.title.replace(/\*/g, ''),
        title: inline(a.title), text: a.title.replace(/\*/g, ''), disc: a.discipline, date: a.date || '', status: a.status || '',
        note: a.note ? inline(a.note) : '', kind, dossier: `/${r.slug}/#${a.id}`,
      };
      if (kind === 'image' || kind === 'video') {
        const m = media(kind === 'video' ? a.poster : a.media);
        rec.w = kind === 'video' ? a.w : m.w; rec.h = kind === 'video' ? a.h : m.h;
        rec.thumb = m.src(640); rec.src = m.src(1280); rec.srcset = m.srcset; rec.alt = a.alt; rec.frame = a.frame || '';
        if (kind === 'video') rec.video = `/media/${a.src}`;
      } else {
        rec.quote = a.text; rec.style = a.style || 'serif'; rec.source = a.source || ''; rec.w = 16; rec.h = 9;
      }
      return rec;
    }));
  });
  return {
    updated: site.updated,
    rels: rels.map(r => ({ slug: r.slug, code: r.code, no: r.number, name: r.name, since: r.since, status: r.status, summary: inline(r.summary), notice: r.notice ? inline(r.notice) : '', count: count(r), disciplines: r.disciplines })),
    artifacts,
  };
}

/* ———————————————————————— Write */
const out = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); console.log('wrote', p); };
out('data/archive.json', JSON.stringify(archiveData()));
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
