/* Lil KC Studio — light table, exposure sheet, comparison and export.
 * Runs against studio.py (local API, saving + FFmpeg export) or, read-only,
 * from a self-contained bundle that defines window.KC_EMBED = {project, assets}.
 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EMBED = window.KC_EMBED || null;
  const API = !EMBED;
  const qs = new URLSearchParams(location.search);

  const S = {
    project: null, rev: null, t: 0, playing: false, timer: null,
    sel: 0, imgs: new Map(), dirty: false, saved: null,
    cmp: { t: 0, playing: false, timer: null },
  };

  // ------------------------------------------------------------ utilities
  function status(msg, err = false, ms = 4000) {
    const el = $("#status");
    el.textContent = msg; el.className = "status show" + (err ? " err" : "");
    clearTimeout(status._t);
    if (ms) status._t = setTimeout(() => { el.className = "status"; el.textContent = ""; }, ms);
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const url = (src) => (EMBED ? EMBED.assets[src] || "" : "../" + src.split("/").map(encodeURIComponent).join("/"));
  async function api(method, path, body) {
    const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({ error: r.statusText }));
    if (!r.ok) throw new Error(j.error || r.statusText);
    return j;
  }
  function loadImg(src) {
    if (S.imgs.has(src)) return S.imgs.get(src);
    const p = new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = url(src);
    });
    S.imgs.set(src, p);
    return p;
  }
  const fps = () => S.project?.fps || 12;
  const total = (rev) => rev.drawings.reduce((a, d) => a + (d.x || 1), 0);
  function drawingAt(rev, t) {
    let acc = 0;
    for (let i = 0; i < rev.drawings.length; i++) {
      acc += rev.drawings[i].x || 1;
      if (t < acc) return i;
    }
    return rev.drawings.length - 1;
  }
  const startOf = (rev, i) => rev.drawings.slice(0, i).reduce((a, d) => a + (d.x || 1), 0);
  function tc(t, f = fps()) { // 0:03+05 — seconds + frames
    const s = Math.floor(t / f), fr = t % f;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}+${String(fr).padStart(2, "0")}`;
  }
  const canvasOf = (rev) => rev.canvas || S.project.canvas;
  const revById = (id) => S.project.revisions.find((r) => r.id === id);

  // ------------------------------------------------------------ tabs
  function showTab(name) {
    $$("#tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === name));
    $$(".tab").forEach((t) => t.classList.toggle("on", t.id === "tab-" + name));
    try { localStorage.setItem("kc-tab", name); } catch (e) {}
    if (name === "anim") render();
    if (name === "compare") cmpRender();
  }
  $$("#tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

  // ------------------------------------------------------------ model
  function renderModel() {
    const m = S.project.model;
    const verified = m.refs.map((r) => r.verified);
    const allOk = verified.every((v) => v === true);
    $("#lockbar").innerHTML = `
      <span class="badge ${API ? (allOk ? "ok" : "warn") : ""}">${API ? (allOk ? "LOCKED · hashes verified" : "LOCK BROKEN — a reference changed") : "LOCKED · hashes recorded"}</span>
      <span>${esc(m.rule)}</span>`;
    $("#refs").innerHTML = m.refs.map((r) => `
      <article class="ref ${esc(r.role)}">
        <div class="img"><img src="${url(r.file)}" alt="${esc(r.label)}" loading="lazy"></div>
        <div class="meta">
          <div class="role">${r.role === "authoritative" ? "Governs all drawings" : r.role === "motion" ? "Motion personality only" : "Archive · comparison only"}</div>
          <b>${esc(r.label)}</b>
          <div>${esc(r.note)}</div>
          <div class="hash">${r.size ? r.size.join(" × ") + " px · " : ""}received ${esc(r.received)}<br>sha256 ${esc(r.sha256)}
            ${r.verified === true ? '<span class="ok">✓ verified</span>' : r.verified === false ? '<span class="warn">✗ mismatch</span>' : ""}</div>
        </div>
      </article>`).join("");
    $("#invariants").innerHTML = m.invariants.map((x) => `<li>${esc(x)}</li>`).join("");
    $("#proportions").innerHTML = m.proportions.map((x) => `<li>${esc(x)}</li>`).join("");
    $("#palette").innerHTML = m.palette.map((p) => `<div class="sw" title="${esc(p.note || "")}"><i style="background:${esc(p.hex)}"></i><span>${esc(p.name)}<br>${esc(p.hex)}</span></div>`).join("");
    $("#diffs").innerHTML = `<tr><th>Topic</th><th>Reference 01</th><th>Reference 02</th><th>Use</th></tr>` +
      m.differences.map((d) => `<tr><td>${esc(d.topic)}</td><td>${esc(d.ref01)}</td><td>${esc(d.ref02)}</td><td><b>${esc(d.rule)}</b></td></tr>`).join("");
    const sel = $("#refSel");
    sel.innerHTML = `<option value="">None</option>` + m.refs.map((r) => `<option value="${esc(r.file)}">${esc(r.label.split(" — ")[0])}</option>`).join("");
  }

  // ------------------------------------------------------------ storyboard
  function decisionFor(target) {
    const log = (S.project.approvals || []).filter((a) => a.target === target && a.decision !== "comment");
    return log.length ? log[log.length - 1] : null;
  }
  function renderBoard() {
    const p = S.project;
    const revs = p.revisions.filter((r) => r.kind === "animatic");
    const bsel = $("#boardRev");
    const cur = bsel.value || (revs[0] && revs[0].id);
    bsel.innerHTML = revs.map((r) => `<option value="${esc(r.id)}">${esc(r.title)}</option>`).join("");
    if (cur) bsel.value = cur;
    const rev = revById(bsel.value);
    $("#boardLede").innerHTML = `<b>${esc(p.subtitle)}</b> — six beats, ≈${rev ? (total(rev) / fps()).toFixed(1) : "?"} s at ${fps()} fps. ` +
      `Panels are rough staging thumbnails drawn in code, <b>not key poses</b>. Key drawings K1–K12 are made against Reference 01 only after this board is approved.`;
    $("#board").innerHTML = p.storyboard.map((b) => {
      let span = "";
      if (rev) {
        const idx = rev.drawings.map((d, i) => (d.beat === b.beat ? i : -1)).filter((i) => i >= 0);
        if (idx.length) {
          const a = startOf(rev, idx[0]), z = startOf(rev, idx[idx.length - 1]) + rev.drawings[idx[idx.length - 1]].x;
          span = `${tc(a)} → ${tc(z)} · ${z - a} frames`;
        }
      }
      const d = decisionFor("beat:" + b.beat);
      return `<article class="card">
        <div class="panel-img" data-beat="${b.beat}" title="Open in timeline"><img src="${url(b.panel)}" alt="Beat ${b.beat}: ${esc(b.title)}" loading="lazy"><span class="num">${b.beat}</span></div>
        <div class="body">
          <h4>${esc(b.title)}</h4><div class="time">${span}</div>
          <p>${esc(b.action)}</p><p class="acting">${esc(b.acting)}</p>
          <ul class="keys">${b.keys.map((k) => { const kd = decisionFor("key:" + k.split(" ")[0]); return `<li><span>${esc(k)}</span>${kd ? `<span class="${kd.decision === "approved" ? "ok" : "warn"}">${esc(kd.decision)}</span>` : "<em>to draw</em>"}</li>`; }).join("")}</ul>
        </div>
        <div class="decide">
          <button data-approve="beat:${b.beat}" ${API ? "" : "disabled"}>Approve beat</button>
          <button data-changes="beat:${b.beat}" ${API ? "" : "disabled"}>Request changes</button>
          <span class="state ${d ? (d.decision === "approved" ? "ok" : "warn") : ""}">${d ? esc(d.decision) : "awaiting review"}</span>
        </div></article>`;
    }).join("");
    const log = p.approvals || [];
    $("#approvals").innerHTML = `<tr><th>When</th><th>Target</th><th>Decision</th><th>Note</th></tr>` +
      (log.length ? log.slice().reverse().map((a) => `<tr><td><code>${esc(a.at)}</code></td><td>${esc(a.target)}</td><td>${esc(a.decision)}</td><td>${esc(a.note)}</td></tr>`).join("")
        : `<tr><td colspan="4" class="hint">No decisions recorded yet. Nothing in this project is approved.</td></tr>`);
  }
  $("#boardRev").addEventListener("change", renderBoard);
  $("#board").addEventListener("click", async (e) => {
    const pi = e.target.closest(".panel-img");
    if (pi) {
      const rid = $("#boardRev").value;
      setRev(rid);
      const i = S.rev.drawings.findIndex((d) => d.beat === +pi.dataset.beat);
      if (i >= 0) { S.sel = i; S.t = startOf(S.rev, i); }
      showTab("anim");
      return;
    }
    const b = e.target.closest("[data-approve],[data-changes]");
    if (!b) return;
    const target = b.dataset.approve || b.dataset.changes;
    const decision = b.dataset.approve ? "approved" : "needs changes";
    const note = prompt(`${decision === "approved" ? "Approve" : "Request changes on"} ${target}. Note (optional):`, "");
    if (note === null) return;
    try {
      const entry = await api("POST", `/api/project/${S.project.id}/approval`, { target, decision, note });
      S.project.approvals.push(entry);
      renderBoard();
      status(`Recorded: ${target} — ${decision}`);
    } catch (err) { status(err.message, true); }
  });

  // ------------------------------------------------------------ viewer
  const view = $("#view");
  const ctx = view.getContext("2d");
  const off = document.createElement("canvas");
  const octx = off.getContext("2d");

  function fitDraw(c, im, W, H, alpha = 1, tint = null) {
    if (!im) return;
    const r = Math.min(W / im.width, H / im.height);
    const w = im.width * r, h = im.height * r, x = (W - w) / 2, y = (H - h) / 2;
    if (!tint) { c.globalAlpha = alpha; c.drawImage(im, x, y, w, h); c.globalAlpha = 1; return; }
    off.width = W; off.height = H;
    octx.clearRect(0, 0, W, H);
    octx.globalCompositeOperation = "source-over";
    octx.drawImage(im, x, y, w, h);
    octx.globalCompositeOperation = "source-atop";
    octx.fillStyle = tint;
    octx.globalAlpha = 0.75;
    octx.fillRect(0, 0, W, H);
    octx.globalAlpha = 1;
    c.globalAlpha = alpha;
    c.drawImage(off, 0, 0);
    c.globalAlpha = 1;
  }
  function paintGround(c, W, H, mode) {
    if (mode === "checker") {
      const s = Math.round(W / 96);
      for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
        c.fillStyle = ((x / s + y / s) & 1) ? "#dddddd" : "#ffffff"; c.fillRect(x, y, s, s);
      }
    } else { c.fillStyle = mode === "white" ? "#ffffff" : S.project.canvas.paper; c.fillRect(0, 0, W, H); }
  }
  function paintGuides(c, W, H, g) {
    if (!g) return;
    c.save(); c.strokeStyle = "rgba(232,89,12,.8)"; c.lineWidth = Math.max(2, W / 640); c.setLineDash([W / 120, W / 160]);
    if (g === "safe") c.strokeRect(W * 0.1, H * 0.1, W * 0.8, H * 0.8);
    if (g === "square") c.strokeRect((W - H) / 2, 0, H, H);
    if (g === "vertical") { const w = H * 9 / 16; c.strokeRect((W - w) / 2, 0, w, H); }
    c.restore();
  }

  async function render() {
    const rev = S.rev;
    if (!rev) return;
    const { w: W, h: H } = canvasOf(rev);
    if (view.width !== W || view.height !== H) { view.width = W; view.height = H; }
    const n = total(rev);
    S.t = Math.max(0, Math.min(S.t, n - 1));
    const di = drawingAt(rev, S.t);
    const want = [di];
    const on = $("#onion").checked;
    const nb = +$("#onB").value, na = +$("#onA").value;
    if (on) { for (let k = 1; k <= nb; k++) want.push(di - k); for (let k = 1; k <= na; k++) want.push(di + k); }
    const imgs = await Promise.all(want.map((i) => (rev.drawings[i] ? loadImg(rev.drawings[i].src) : null)));
    const refSrc = $("#refSel").value;
    const refIm = refSrc ? await loadImg(refSrc) : null;
    if (rev !== S.rev) return; // revision changed while loading
    paintGround(ctx, W, H, $("#bg").value);
    if (on) {
      const op = +$("#onOp").value / 100, tint = $("#onTint").checked;
      // furthest first, fading with distance
      for (let k = nb; k >= 1; k--) fitDraw(ctx, imgs[k], W, H, op * (1 - (k - 1) / (nb + 1)), tint ? "#c0392b" : null);
      for (let k = na; k >= 1; k--) fitDraw(ctx, imgs[nb + k], W, H, op * (1 - (k - 1) / (na + 1)), tint ? "#2e8b57" : null);
    }
    fitDraw(ctx, imgs[0], W, H, 1);
    if (refIm) fitDraw(ctx, refIm, W, H, +$("#refOp").value / 100);
    paintGuides(ctx, W, H, $("#guides").value);
    if (S.sel !== di && !S.playing) { /* keep user selection */ }
    if (S.playing) S.sel = di;
    $("#tc").textContent = `${tc(S.t)}  ·  frame ${S.t + 1}/${n}  ·  drawing ${di + 1}/${rev.drawings.length} (${rev.drawings[di].label || ""}, x${rev.drawings[di].x})`;
    $("#scrub").max = n - 1; $("#scrub").value = S.t;
    paintXsheetHead();
    // warm the cache ahead of the playhead
    for (let k = 1; k <= 3; k++) if (rev.drawings[di + k]) loadImg(rev.drawings[di + k].src);
  }

  function play(on = !S.playing) {
    S.playing = on;
    $("#bPlay").textContent = on ? "Pause" : "Play";
    clearInterval(S.timer);
    if (!on) { renderXsheet(); return; }
    const step = () => {
      const n = total(S.rev);
      if (S.t + 1 >= n) { if ($("#loop").checked) S.t = 0; else { play(false); return; } } else S.t++;
      render();
    };
    S.timer = setInterval(step, 1000 / +$("#pfps").value);
  }
  function seek(t) { S.t = t; if (!S.playing) S.sel = drawingAt(S.rev, S.t); render(); renderXsheetSel(); }
  function stepDrawing(d) {
    const i = Math.max(0, Math.min(S.rev.drawings.length - 1, drawingAt(S.rev, S.t) + d));
    seek(startOf(S.rev, i));
  }
  $("#bPlay").onclick = () => play();
  $("#bFirst").onclick = () => seek(0);
  $("#bPrev").onclick = () => seek(Math.max(0, S.t - 1));
  $("#bNext").onclick = () => seek(Math.min(total(S.rev) - 1, S.t + 1));
  $("#bPrevD").onclick = () => stepDrawing(-1);
  $("#bNextD").onclick = () => stepDrawing(1);
  $("#scrub").oninput = (e) => seek(+e.target.value);
  ["onion", "onB", "onA", "onOp", "onTint", "refSel", "refOp", "bg", "guides"].forEach((id) => $("#" + id).addEventListener("input", render));
  $("#pfps").addEventListener("change", () => { if (S.playing) play(true); });

  // ------------------------------------------------------------ exposure sheet
  const CELL = 14; // px per frame
  function revLabel(r) { return `${r.title}  [${r.status}]`; }
  function fillRevSelects() {
    const opts = S.project.revisions.map((r) => `<option value="${esc(r.id)}">${esc(revLabel(r))}</option>`).join("");
    for (const id of ["revSel", "cmpA", "cmpB", "exRev"]) {
      const el = $("#" + id), v = el.value; el.innerHTML = opts; if (v && revById(v)) el.value = v;
    }
  }
  function editable(rev) { return API && ["draft", "for review", "needs changes"].includes(rev.status); }
  function setRev(id) {
    if (S.dirty && S.rev && S.rev.id !== id && !confirm("Discard unsaved timing changes?")) { $("#revSel").value = S.rev.id; return; }
    if (S.dirty && S.saved) S.rev.drawings.forEach((d, i) => (d.x = S.saved[i]));
    play(false);
    S.rev = revById(id); S.dirty = false; S.saved = S.rev.drawings.map((d) => d.x);
    S.t = 0; S.sel = 0;
    $("#revSel").value = id;
    try { localStorage.setItem("kc-rev", id); } catch (e) {}
    renderXsheet(); render();
  }
  $("#revSel").addEventListener("change", (e) => setRev(e.target.value));

  function renderRevMeta() {
    const r = S.rev;
    $("#revMeta").innerHTML = `<span class="pill">${esc(r.status)}</span>${r.kind !== r.status ? ` <span class="pill">${esc(r.kind)}</span>` : ""}<br>${esc(r.notes || "")}<br>` +
      `<b>${r.drawings.length}</b> drawings · <b>${total(r)}</b> frames · <b>${(total(r) / fps()).toFixed(2)} s</b> @ ${fps()} fps` +
      (r.derived_from ? `<br>derived from ${esc(r.derived_from)}` : "") + (S.dirty ? ` · <span class="warn">unsaved</span>` : "");
  }
  function renderXsheet() {
    const rev = S.rev; if (!rev) return;
    renderRevMeta();
    const n = total(rev);
    let ruler = "";
    for (let f = 0; f < n; f += fps()) ruler += `<span style="left:${f * CELL}px">${f / fps()}s</span>`;
    let x = 0;
    const cells = rev.drawings.map((d, i) => {
      const w = d.x * CELL;
      const h = `<div class="xcell ${d.beat ? "b" + d.beat : ""} ${i === S.sel ? "sel" : ""}" data-i="${i}" style="left:${x}px;width:${w}px;background-size:${CELL}px 6px" title="${esc(d.label || "")} — held ${d.x} frame${d.x > 1 ? "s" : ""}">
        <b>${i + 1}</b>${esc(d.label || "")}<br><span class="hint">x${d.x}</span><div class="ticks" style="background-size:${CELL}px 6px"></div></div>`;
      x += w; return h;
    }).join("");
    $("#xsheet").innerHTML = `<div style="width:${n * CELL + 4}px"><div class="xruler">${ruler}</div><div class="xrow">${cells}<div class="xhead" id="xhead"></div></div></div>`;
    $("#xsumm").textContent = `— ${rev.drawings.length} drawings · ${n} frames · ${(n / fps()).toFixed(2)} s at ${fps()} fps${S.dirty ? " · unsaved" : ""}`;
    renderXsheetSel(); paintXsheetHead();
    const ed = editable(rev);
    ["xMinus", "xPlus", "xVal", "xOnes", "xTwos"].forEach((id) => ($("#" + id).disabled = !(ed || !API)));
    $("#xSave").disabled = !ed || !S.dirty;
    $("#xRevert").disabled = !S.dirty;
    $("#xSaveAs").disabled = !API;
  }
  function renderXsheetSel() {
    $$(".xcell").forEach((c) => c.classList.toggle("sel", +c.dataset.i === S.sel));
    const d = S.rev.drawings[S.sel];
    if (!d) return;
    $("#selInfo").textContent = `Drawing ${S.sel + 1} “${d.label || ""}”:`;
    $("#xVal").value = d.x;
  }
  function paintXsheetHead() { const h = $("#xhead"); if (h) h.style.left = S.t * CELL + CELL / 2 + "px"; }
  $("#xsheet").addEventListener("click", (e) => {
    const c = e.target.closest(".xcell"); if (!c) return;
    const i = +c.dataset.i, rect = c.getBoundingClientRect();
    S.sel = i;
    const within = Math.min(S.rev.drawings[i].x - 1, Math.floor((e.clientX - rect.left) / CELL));
    seek(startOf(S.rev, i) + Math.max(0, within));
  });
  function setX(i, x) {
    const d = S.rev.drawings[i]; if (!d) return;
    x = Math.max(1, Math.min(96, Math.round(x) || 1));
    if (x === d.x) return;
    d.x = x; S.dirty = true;
    if (!API) try { localStorage.setItem("kc-x-" + S.rev.id, JSON.stringify(S.rev.drawings.map((q) => q.x))); } catch (e) {}
    renderXsheet(); render();
  }
  $("#xMinus").onclick = () => setX(S.sel, S.rev.drawings[S.sel].x - 1);
  $("#xPlus").onclick = () => setX(S.sel, S.rev.drawings[S.sel].x + 1);
  $("#xVal").onchange = (e) => setX(S.sel, +e.target.value);
  $("#xOnes").onclick = () => { S.rev.drawings.forEach((d) => (d.x = 1)); S.dirty = true; renderXsheet(); render(); };
  $("#xTwos").onclick = () => { S.rev.drawings.forEach((d) => (d.x = 2)); S.dirty = true; renderXsheet(); render(); };
  $("#xRevert").onclick = () => { S.rev.drawings.forEach((d, i) => (d.x = S.saved[i])); S.dirty = false; renderXsheet(); render(); };
  $("#xSave").onclick = async () => {
    try {
      const r = await api("PUT", `/api/project/${S.project.id}/revision/${S.rev.id}`, { exposures: S.rev.drawings.map((d) => d.x) });
      Object.assign(S.rev, r); S.saved = S.rev.drawings.map((d) => d.x); S.dirty = false;
      renderXsheet(); status(`Saved timing for ${S.rev.id} (${total(S.rev)} frames).`);
    } catch (err) { status(err.message, true); }
  };
  $("#xSaveAs").onclick = async () => {
    const title = prompt("Title for the new revision:", S.rev.title.replace(/ —.*$/, "") + " — retimed");
    if (!title) return;
    const notes = prompt("What changed and why?", "") || "";
    try {
      const xs = S.rev.drawings.map((d) => d.x);
      if (S.dirty) S.rev.drawings.forEach((d, i) => (d.x = S.saved[i]));
      const r = await api("POST", `/api/project/${S.project.id}/revision`, { from: S.rev.id, title, notes, exposures: xs, id: S.rev.id.replace(/-v\d*$/, "") + "-v" });
      S.project.revisions.push(r); S.dirty = false; fillRevSelects(); setRev(r.id);
      status(`Created revision ${r.id}.`);
    } catch (err) { status(err.message, true); }
  };

  // keyboard
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input[type=number], input[type=text], textarea, select")) return;
    const onAnim = $("#tab-anim").classList.contains("on");
    const onCmp = $("#tab-compare").classList.contains("on");
    if (onCmp) {
      if (e.key === " ") { e.preventDefault(); cmpPlay(); }
      if (e.key === "ArrowLeft") cmpSeek(S.cmp.t - 1);
      if (e.key === "ArrowRight") cmpSeek(S.cmp.t + 1);
      return;
    }
    if (!onAnim || !S.rev) return;
    const k = e.key;
    if (k === " ") { e.preventDefault(); play(); }
    else if (k === "ArrowLeft") { e.preventDefault(); $("#bPrev").click(); }
    else if (k === "ArrowRight") { e.preventDefault(); $("#bNext").click(); }
    else if (k === ",") stepDrawing(-1);
    else if (k === ".") stepDrawing(1);
    else if (k === "Home") seek(0);
    else if ((k === "+" || k === "=") && !$("#xPlus").disabled) $("#xPlus").click();
    else if ((k === "-" || k === "_") && !$("#xMinus").disabled) $("#xMinus").click();
    else if (k === "o" || k === "O") { $("#onion").checked = !$("#onion").checked; render(); }
    else if (k === "r" || k === "R") { const s = $("#refSel"); s.selectedIndex = (s.selectedIndex + 1) % s.options.length; render(); }
  });
  window.addEventListener("beforeunload", (e) => { if (S.dirty && API) { e.preventDefault(); e.returnValue = ""; } });

  // ------------------------------------------------------------ compare
  const cvA = $("#cvA"), cvB = $("#cvB");
  function cmpRevs() { return [revById($("#cmpA").value), revById($("#cmpB").value)]; }
  function cmpLen() {
    const [a, b] = cmpRevs();
    return Math.max(total(a), total(b)); // both play at the project rate; the shorter one holds its last drawing
  }
  async function drawRevAt(cv, rev, t) {
    const { w: W, h: H } = S.project.canvas;
    if (cv.width !== W) { cv.width = W; cv.height = H; }
    const c = cv.getContext("2d");
    const n = total(rev), tt = Math.min(t, n - 1);
    const im = await loadImg(rev.drawings[drawingAt(rev, tt)].src);
    paintGround(c, W, H, "paper"); fitDraw(c, im, W, H);
    return { tt, n, di: drawingAt(rev, tt), held: t >= n };
  }
  async function cmpRender() {
    const [a, b] = cmpRevs(); if (!a || !b) return;
    const mode = $("#cmpMode").value;
    const n = cmpLen(); S.cmp.t = Math.max(0, Math.min(S.cmp.t, n - 1));
    $("#cmpStages").classList.toggle("single", mode !== "side");
    const ra = await drawRevAt(cvA, a, S.cmp.t);
    let rb;
    if (mode === "side") rb = await drawRevAt(cvB, b, S.cmp.t);
    else {
      const { w: W, h: H } = S.project.canvas, tt = Math.min(S.cmp.t, total(b) - 1);
      const im = await loadImg(b.drawings[drawingAt(b, tt)].src), c = cvA.getContext("2d");
      if (mode === "diff") { c.globalCompositeOperation = "difference"; paintGround(c, W, H, "paper"); fitDraw(c, im, W, H); c.globalCompositeOperation = "source-over"; }
      else fitDraw(c, im, W, H, 0.5, "#2471a3");
      rb = { tt, n: total(b), di: drawingAt(b, tt), held: S.cmp.t >= total(b) };
    }
    const cap = (r, x, tag) => `${tag} · ${r.title} · ${tc(x.tt)} · drawing ${x.di + 1} “${r.drawings[x.di].label || ""}” x${r.drawings[x.di].x}${x.held ? " · ended (holding last)" : ""}`;
    $("#capA").textContent = mode === "side" ? cap(a, ra, "A") : `${cap(a, ra, "A")}   |   ${cap(b, rb, "B")}${mode === "overlay" ? " (blue)" : ""}`;
    $("#capB").textContent = cap(b, rb, "B");
    $("#ctc").textContent = `${tc(S.cmp.t)} · frame ${S.cmp.t + 1}/${n}`;
    $("#cscrub").max = n - 1; $("#cscrub").value = S.cmp.t;
    const ph = S.cmp.t * CELL + CELL / 2;
    $$(".cmphead").forEach((h) => (h.style.left = ph + "px"));
  }
  function cmpSheets() {
    const [a, b] = cmpRevs(); if (!a || !b) return;
    const sheet = (r, tag) => {
      let x = 0;
      const cells = r.drawings.map((d, i) => { const w = d.x * CELL; const h = `<div class="xcell ${d.beat ? "b" + d.beat : ""}" style="left:${x}px;width:${w}px"><b>${i + 1}</b>x${d.x}</div>`; x += w; return h; }).join("");
      return `<div class="cmpsheet"><div class="lab">${tag} · ${esc(r.title)} — ${total(r)} frames · ${(total(r) / fps()).toFixed(2)} s</div><div class="xsheet"><div style="width:${Math.max(total(a), total(b)) * CELL + 4}px"><div class="xrow">${cells}<div class="xhead cmphead"></div></div></div></div></div>`;
    };
    $("#cmpSheets").innerHTML = sheet(a, "A") + sheet(b, "B");
  }
  function cmpSeek(t) { S.cmp.t = Math.max(0, Math.min(cmpLen() - 1, t)); cmpRender(); }
  function cmpPlay(on = !S.cmp.playing) {
    S.cmp.playing = on; $("#cPlay").textContent = on ? "Pause" : "Play"; clearInterval(S.cmp.timer);
    if (on) S.cmp.timer = setInterval(() => { S.cmp.t = (S.cmp.t + 1) % cmpLen(); cmpRender(); }, 1000 / fps());
  }
  ["cmpA", "cmpB", "cmpMode"].forEach((id) => $("#" + id).addEventListener("change", () => { cmpSheets(); cmpRender(); }));
  $("#cPlay").onclick = () => cmpPlay();
  $("#cPrev").onclick = () => cmpSeek(S.cmp.t - 1);
  $("#cNext").onclick = () => cmpSeek(S.cmp.t + 1);
  $("#cscrub").oninput = (e) => cmpSeek(+e.target.value);

  // ------------------------------------------------------------ export
  $("#exGo").onclick = async () => {
    if (!API) { status("Export needs the local studio server: python3 lil-kc/studio/studio.py", true, 8000); return; }
    const formats = $$("input[name=fmt]:checked").map((i) => i.value);
    const btn = $("#exGo"); btn.disabled = true; btn.textContent = "Exporting…";
    try {
      const res = await api("POST", `/api/project/${S.project.id}/export`, { revision: $("#exRev").value, formats, bg: $("#exBg").value, scale: +$("#exScale").value });
      const out = $("#exOut");
      if (out.querySelector(".hint")) out.innerHTML = "";
      out.insertAdjacentHTML("afterbegin", res.map((r) => {
        const href = url(r.file);
        const prev = r.format === "gif" ? `<img src="${href}" alt="">` : r.format === "mp4" || r.format === "webm" ? `<video src="${href}" muted loop autoplay playsinline></video>` : `<span class="pill">zip</span>`;
        return `<div class="res"><b>${r.format.toUpperCase()}</b><div><a href="${href}" download><code>${esc(r.file)}</code></a><br><span class="hint">${r.frames} frames @ ${r.fps} fps · ${r.seconds} s · ${(r.bytes / 1024).toFixed(0)} KB</span><br><code class="hint">${esc(r.command)}</code></div>${prev}</div>`;
      }).join(""));
      status(`Exported ${res.length} file(s).`);
    } catch (err) { status(err.message, true, 10000); }
    btn.disabled = false; btn.textContent = "Export with FFmpeg";
  };

  // ------------------------------------------------------------ boot
  async function boot() {
    try {
      if (EMBED) {
        S.project = EMBED.project;
        $("#mode").textContent = "offline bundle · read-only";
        $("#exGo").disabled = true;
        $("#exGo").textContent = "Export needs the local studio server";
        S.project.revisions.forEach((r) => { try { const xs = JSON.parse(localStorage.getItem("kc-x-" + r.id) || "null"); if (xs && xs.length === r.drawings.length) r.drawings.forEach((d, i) => (d.x = xs[i])); } catch (e) {} });
      } else {
        const list = await api("GET", "/api/projects");
        if (!list.length) throw new Error("No private projects found in lil-kc/private/projects/.");
        const pid = qs.get("project") || list[0].id;
        S.project = await api("GET", `/api/project/${pid}`);
      }
    } catch (err) {
      status(err.message + (location.protocol === "file:" ? " — run python3 lil-kc/studio/studio.py and open http://127.0.0.1:8612/studio/" : ""), true, 0);
      return;
    }
    S.project.approvals = S.project.approvals || [];
    $("#projTitle").textContent = `${S.project.title} · ${S.project.subtitle}`;
    document.title = "Lil KC Studio";
    renderModel(); renderBoard(); fillRevSelects();
    const revs = S.project.revisions;
    let saved = null; try { saved = localStorage.getItem("kc-rev"); } catch (e) {}
    setRev(qs.get("rev") || (saved && revById(saved) ? saved : revs[0].id));
    $("#cmpA").value = revs[0].id; $("#cmpB").value = (revs[1] || revs[0]).id;
    $("#exRev").value = revs[0].id;
    cmpSheets();
    let tab = qs.get("tab"); try { tab = tab || localStorage.getItem("kc-tab"); } catch (e) {}
    showTab(tab || "board");
    if (qs.get("onion")) { $("#onion").checked = true; render(); }
    if (qs.get("t")) seek(+qs.get("t"));
  }
  boot();
})();
