// Tangerine — one piece at a time, newest first.
// The feed is work.json on this domain. Every check is real: the lamp blinks once
// when the feed answers, stays lit while it does, and goes grey when it does not.
const $ = s => document.querySelector(s);
const FEED = 'work.json', EVERY = 60000;
const art = $('#art'), lamp = $('#lamp'), dialog = $('dialog'), search = $('dialog input'), matches = $('#matches');
let works = [], current = 0, followLatest = true, syncing = false, loaded = false, shown = '';

const pad = n => String(n).padStart(2, '0');
const stamp = d => d.slice(0, 10).replaceAll('-', '.');

function show(index) {
  if (!works.length) return;
  current = Math.min(Math.max(index, 0), works.length - 1);
  const item = works[current];
  $('#title').textContent = item.title;
  $('#project').textContent = item.project;
  const time = $('.readout time');
  time.dateTime = item.date;
  time.textContent = stamp(item.date);
  $('#count').textContent = pad(current + 1) + ' / ' + pad(works.length);
  $('#prev').disabled = current === 0;
  $('#next').disabled = current === works.length - 1;
  if (shown !== item.src) {
    shown = item.src;
    art.classList.remove('is-shown');
    const next = new Image();
    next.src = item.src;
    next.decode().catch(() => {}).then(() => {
      if (shown !== item.src) return;
      if (!next.naturalWidth) { $('#notice').hidden = false; $('#notice').textContent = 'Image unavailable'; return; }
      $('#notice').hidden = true;
      art.src = item.src;
      art.alt = item.description;
      art.classList.add('is-shown');
    });
  }
  // Warm the neighbours so stepping through the archive is immediate.
  [works[current - 1], works[current + 1]].forEach(w => { if (w) new Image().src = w.src; });
}

function valid(x) {
  return x && x.id && x.title && x.project && x.description && Number.isFinite(Date.parse(x.date)) && /^(media\/|https:\/\/)/.test(x.src);
}

function render(feed) {
  const previous = works[current]?.id;
  works = [...new Map(feed.filter(valid).map(x => [x.id, x])).values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const many = works.length > 1;
  $('#paging').hidden = !many;
  $('#find').hidden = !many;
  if (!works.length) { $('#notice').hidden = false; $('#notice').textContent = 'Nothing published yet'; return; }
  show(followLatest ? 0 : Math.max(0, works.findIndex(x => x.id === previous)));
  if (dialog.open) results();
}

function setLamp(live) {
  lamp.classList.toggle('is-live', live);
  lamp.setAttribute('aria-label', live ? 'Feed status: live, checked ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Feed status: offline');
  if (!live) return;
  lamp.classList.remove('is-blinking');
  void lamp.offsetWidth;
  lamp.classList.add('is-blinking');
}

async function sync() {
  if (syncing) return;
  syncing = true;
  try {
    const response = await fetch(FEED, { cache: 'no-cache', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error(response.status);
    const feed = await response.json();
    if (!Array.isArray(feed)) throw Error('feed');
    render(feed);
    loaded = true;
    setLamp(true);
  } catch {
    setLamp(false);
    if (!loaded) { $('#notice').hidden = false; $('#notice').textContent = 'Feed unavailable'; }
  } finally { syncing = false; }
}

function step(n) {
  if (works.length < 2) return;
  followLatest = false;
  show(current + n);
}

// Retrieval: every piece, newest first, filtered as you type.
function results() {
  const terms = search.value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  matches.replaceChildren();
  works.forEach((item, i) => {
    const words = [item.title, item.project, item.description, item.date, stamp(item.date)].join(' ').toLowerCase();
    if (!terms.every(t => words.includes(t))) return;
    const b = document.createElement('button'), t = document.createElement('span'), p = document.createElement('small'), d = document.createElement('time');
    t.className = 't'; t.textContent = item.title;
    p.textContent = item.project;
    d.dateTime = item.date; d.textContent = stamp(item.date);
    b.append(t, d, p);
    b.onclick = () => { followLatest = i === 0; show(i); dialog.close(); };
    matches.append(b);
  });
  if (!matches.children.length) { const p = document.createElement('p'); p.textContent = 'No matching work'; matches.append(p); }
}
function retrieve() {
  if (works.length < 2) return;
  search.value = '';
  results();
  dialog.showModal();
  search.focus();
}

$('#prev').onclick = () => step(-1);
$('#next').onclick = () => step(1);
$('#latest').onclick = () => { followLatest = true; show(0); sync(); };
$('#find').onclick = retrieve;
$('#close').onclick = () => dialog.close();
search.oninput = results;
search.onkeydown = e => {
  if (e.key === 'Enter') { e.preventDefault(); matches.querySelector('button')?.click(); }
  if (e.key === 'Escape') { e.preventDefault(); dialog.close(); }
  if (e.key === 'ArrowDown') { e.preventDefault(); matches.querySelector('button')?.focus(); }
};
matches.onkeydown = e => {
  const all = [...matches.querySelectorAll('button')], i = all.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' && i > -1) { e.preventDefault(); all[i + 1]?.focus(); }
  if (e.key === 'ArrowUp' && i > -1) { e.preventDefault(); (all[i - 1] || search).focus(); }
};
document.addEventListener('keydown', e => {
  if (dialog.open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'Home') { e.preventDefault(); $('#latest').click(); }
  if (e.key === '/') { e.preventDefault(); retrieve(); }
});

// Touch: swipe the artwork. Left for older, right for newer.
let touch = null;
const stage = $('main');
stage.addEventListener('pointerdown', e => { touch = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }; });
stage.addEventListener('pointerup', e => {
  if (!touch) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
});
stage.addEventListener('pointercancel', () => { touch = null; });

sync();
setInterval(() => { if (!document.hidden) sync(); }, EVERY);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
addEventListener('online', sync);
addEventListener('offline', () => setLamp(false));
