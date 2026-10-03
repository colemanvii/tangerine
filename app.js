/* Presentation and session-only demo interactions. Reload restores the snapshot. */
(() => {
  "use strict";
  const home = window.HAVEN_HOME;
  const content = document.querySelector("#content");
  const dialog = document.querySelector("#detail");
  const detailContent = document.querySelector("#detail-content");
  const idle = document.querySelector("#idle");
  const instrument = document.querySelector("#instrument");
  const state = {
    view: "home",
    scenario: "attention",
    planned: false,
    replaced: false,
    filter: "All",
    private: false,
    autoIdle: true,
  };
  const views = ["home", "systems", "security", "household", "record", "personal"];
  const address = document.querySelector(".home-address");
  const footer = document.querySelector(".instrument-footer");
  const demoButton = document.querySelector('[data-detail="demo"]');
  const homeAddress = address.innerHTML;
  const homeFooter = footer.innerHTML;
  let idleTimer;
  let opener;
  const arrow = '<span class="chevron" aria-hidden="true">↗</span>';
  const batteryNeeded = () => state.scenario === "attention" && !state.replaced;
  const disconnected = () => state.scenario === "offline";
  const guestName = () => (state.private ? "A guest" : home.household.guest);
  const facts = (items) =>
    `<dl class="facts">${items.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
  const cloud =
    '<svg class="weather-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M15 36a10 10 0 0 1 0-20 15 15 0 0 1 29 4 8 8 0 0 1 3 16H15Z"/><path d="m22 44-3 7m14-7-3 7m14-7-3 7"/></svg>';
  function announce(message) {
    document.querySelector("#announcement").textContent = message;
  }
  function heading(label, title, description, aside = "") {
    return `<div class="page-heading"><div><span class="label">${label}</span><h1>${title}</h1><p>${description}</p></div>${aside ? `<span class="label">${aside}</span>` : ""}</div>`;
  }
  function attentionBlock(compact = false) {
    if (!batteryNeeded() && !disconnected())
      return compact
        ? ""
        : '<p class="quiet-note">Nothing needs your attention.</p>';
    const offline = disconnected();
    const title = offline
      ? "Home connection unavailable"
      : "Upstairs sensor battery";
    const summary = offline
      ? "Last report at 1:12 PM. Current state is unknown."
      : state.planned
        ? "Replacement planned for tomorrow. Battery at 18%."
        : "18% remaining. Replace when convenient.";
    if (compact)
      return `<section class="exception-bar"><div><span class="label">${offline ? "Connection" : "One thing to tend to"}</span><h2>${title}</h2><p>${summary}</p></div><button class="primary" data-detail="${offline ? "connection" : "battery"}">${offline ? "Review connection" : "Review item"}</button></section>`;
    return `<section class="attention"><span class="label">${offline ? "Current state unavailable" : state.planned ? "Planned · tomorrow" : "One thing to tend to"}</span><button class="attention-link" data-detail="${offline ? "connection" : "battery"}"><span><strong>${title}</strong><small>${summary}</small></span><span class="round-arrow" aria-hidden="true">↗</span></button></section>`;
  }
  function homeView() {
    const title = disconnected()
      ? "Let’s check<br>the connection."
      : batteryNeeded()
        ? "The house is<br>settled."
        : "Everything is<br>as it should be.";
    return `<section class="brief"><div class="brief-main"><p class="kicker">Sunday, September 27 <span aria-hidden="true"> / </span> Good afternoon.</p><h1>${title}</h1><div class="state-line"${disconnected() ? ' style="color:var(--orange)"' : ""}><span class="state-dot" aria-hidden="true"></span>${disconnected() ? "Live state unavailable · last report 1:12 PM" : "Doors secured. No unusual system activity."}</div>${attentionBlock()}</div><aside class="brief-side" aria-label="Weather and what happens next"><div class="weather"><div><span class="label">Outside · 76°</span><h2>Rain around 3 PM.</h2><p>The garden can wait.</p></div>${cloud}</div><span class="label next-label">The rest of today</span><ol class="agenda"><li><button data-detail="weather"><time>3:00 PM</time><span><strong>Rain begins</strong><small>Irrigation paused tomorrow</small></span>${arrow}</button></li><li><button data-detail="guest"><time>5:30 PM</time><span><strong>${guestName()} is coming over</strong><small>Dinner at home</small></span>${arrow}</button></li><li><button data-detail="evening"><time>10:00 PM</time><span><strong>Evening check</strong><small>Review exterior doors</small></span>${arrow}</button></li></ol></aside></section><section class="system-strip" aria-label="Systems at a glance">${[
      "power",
      "climate",
      "water",
      "network",
    ]
      .map((id) => {
        const system = home.systems.find((s) => s.id === id);
        return `<button data-detail="system:${id}"><span class="label">${system.name}</span><strong>${disconnected() ? "Unknown" : system.state}${id === "climate" && !disconnected() ? "<small>inside</small>" : ""}</strong></button>`;
      })
      .join("")}</section>`;
  }
  function systemsView() {
    return `<section class="page">${heading("Systems", disconnected() ? "The house is out of reach." : batteryNeeded() ? "One small thing.<br>The rest is running well." : "Quietly doing their work.", disconnected() ? "The last reports are retained. Current conditions cannot be confirmed." : "The machinery of Cedar House, with only the exceptions brought forward.", "6 systems / 1 home")}${attentionBlock(true)}<div class="ledger">${home.systems.map((system) => `<button class="ledger-row" data-detail="system:${system.id}"><span class="ledger-name">${system.name}</span><span class="machine">${disconnected() ? "Unknown" : system.state}</span><span class="ledger-description">${disconnected() ? "Last report 1:12 PM · no current reading" : system.summary}</span>${arrow}</button>`).join("")}</div><p class="page-note">Representative reports at 1:35 PM${disconnected() ? " · connection lost after 1:12 PM" : ""}. Inspect a system for equipment and service records.</p></section>`;
  }
  function securityView() {
    return `<section class="page">${heading("Security", disconnected() ? "Current state unknown." : "The house is secure.", disconnected() ? "The connection is unavailable. Check doors directly if you need to confirm their state." : "All three connected exterior openings report secured.", "Snapshot / 1:35 PM")}<div class="split-page"><div><div class="ledger security-list">${[
      ["front", "Front entry", "Locked"],
      ["rear", "Rear entry", "Locked"],
      ["garage", "Garage", "Closed"],
    ]
      .map(
        ([id, name, status]) =>
          `<button class="ledger-row" data-detail="door:${id}"><span class="ledger-name">${name}</span><span class="machine">${disconnected() ? "Unknown" : status}</span>${arrow}</button>`,
      )
      .join(
        "",
      )}</div><p class="page-note">${disconnected() ? "Last known reports: 1:12 PM. " : "Reports are from connected openings only. "}Windows and unconnected areas are not monitored in this demo.</p></div><aside class="side-note"><span class="label">Expected this evening</span><h2>${guestName()}<br>5:30 PM</h2><p>Front-entry access is planned for 5:15–10:00 PM. This demonstration does not create a working access code.</p><button class="secondary" data-detail="guest">View visit</button></aside></div><p class="page-note">Representative data. Haven does not replace a professionally designed security or life-safety system.</p></section>`;
  }
  function householdView() {
    return `<section class="page">${heading("Household", "Room for everyday life.", "Shared plans, a welcome guest, and the small things worth remembering.")}<div class="split-page"><div><section class="household-summary"><span class="label">The household</span><h2>${state.private ? "Two residents" : "Anna & James"}</h2><p>No location tracking. The plans here are shared intentionally by the household.</p></section><div class="ledger"><button class="ledger-row" data-detail="guest"><span class="ledger-name">Dinner with ${state.private ? "a guest" : "Caroline"}</span><span class="machine">5:30 PM</span><span class="ledger-description">Today · front entry</span>${arrow}</button><button class="ledger-row" data-detail="evening"><span class="ledger-name">Evening check</span><span class="machine">10:00 PM</span><span class="ledger-description">Exterior doors · reminder</span>${arrow}</button><button class="ledger-row" data-detail="maintenance"><span class="ledger-name">Climate service</span><span class="machine">OCT 14</span><span class="ledger-description">9:00 AM · Cedar Mechanical</span>${arrow}</button></div></div><aside class="side-note"><span class="label">On the kitchen counter</span><div class="note-paper"><span class="label">Household note</span><p>There’s soup in the fridge.<br>Save some for dinner.</p><small>${state.private ? "Household" : "Anna"} · today, 11:20 AM</small></div><p style="margin-top:24px">A wall display is a shared space. You decide whether names appear.</p><button class="secondary" data-detail="privacy">Display privacy</button></aside></div></section>`;
  }
  function replacementRecord() {
    return {
      id: "battery-service",
      category: "Service",
      title: "Hall sensor battery replaced",
      subtitle: "Completed in this demo session",
      date: "September 27, 2026",
      author: "Household · demo action",
      phase: "In residence",
      room: "Upstairs hall",
      type: "Maintenance entry",
      introduction:
        "Battery replacement recorded by the household in this demonstration. No real device was changed.",
      facts: [
        ["Equipment", "Leak sensor · CH-LS-02"],
        ["Battery", "CR123A · 3 V"],
        ["Demo report", "Connected · 100%"],
        ["Completed", "September 27, 2026 · 1:35 PM"],
      ],
      note: "In a connected product, a fresh sensor report would be required to confirm the replacement.",
      related: "water-plan",
    };
  }
  function allRecords() {
    return state.replaced
      ? [replacementRecord(), ...home.records]
      : home.records;
  }
  function recordView() {
    const records = allRecords().filter(
      (record) => state.filter === "All" || record.category === state.filter,
    );
    return `<section class="page">${heading("Record", "A house with a memory.", "What went into it. What has changed. What the next person will need.", `${allRecords().length} preserved entries`)}<section class="record-intro"><div><span class="label">From the first day</span><h2>Built once. Remembered always.</h2><p>The builder’s field notes live alongside today’s service records. The house keeps both.</p></div><div class="record-history" aria-label="Construction 2024 to handoff August 2024 to in residence 2026"><div class="history-point">Construction<time>2024</time></div><span class="history-line" aria-hidden="true"></span><div class="history-point">Handoff<time>AUG 2024</time></div><span class="history-line" aria-hidden="true"></span><div class="history-point">Home<time>2026</time></div></div></section><div class="filters" aria-label="Filter home records">${["All", "Plans", "Finishes", "Equipment", "Field", "Service"].map((category) => `<button class="filter" data-filter="${category}" aria-pressed="${category === state.filter}">${category}</button>`).join("")}</div><div class="ledger">${records.map((record) => `<button class="ledger-row record-row" data-detail="record:${record.id}"><span class="record-category">${record.category}</span><div><span class="ledger-name">${record.title}</span><span class="ledger-description">${record.subtitle}</span></div><span class="record-date">${record.date}<br>${record.phase}</span>${arrow}</button>`).join("")}</div><p class="page-note">Illustrative records and extracts. Original manuals, construction photographs and warranty documents are not attached.</p></section>`;
  }
  // Keep selection separate from presentation; escape data before inserting markup.
  const escapeText = (value = "") => String(value).replace(/[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  function localDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function morningBrief() {
    const requested =
      window.HAVEN_MORNING.activeDate &&
      window.HAVEN_MORNING.activeDate !== "auto"
        ? window.HAVEN_MORNING.activeDate
        : localDateKey();
    return (
      window.HAVEN_MORNING.briefs.find((brief) => brief.date === requested) || {
        date: requested,
        priorities: [],
        outreach: [],
        viewings: [],
        threads: [],
        changes: [],
        question: "",
        begin: { text: "", label: "", href: "" },
        grace: { text: "", source: "" },
      }
    );
  }
  function morningDates() {
    const date = morningBrief().date;
    const today = new Date(`${date}T12:00:00Z`);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const format = (value, options) => new Intl.DateTimeFormat("en-US", {
      ...options, timeZone: "UTC",
    }).format(value);
    return {
      date,
      dateLabel: format(today, { weekday: "long", month: "long", day: "numeric" }),
      fullDate: format(today, { month: "short", day: "numeric", year: "numeric" }),
      previousDate: yesterday.toISOString().slice(0, 10),
      previousDateLabel: format(yesterday, { month: "short", day: "numeric" }),
    };
  }
  function outreachKey(date) {
    return `haven:morning:outreach:${date}`;
  }
  function completedOutreach(date) {
    try {
      const saved = JSON.parse(localStorage.getItem(outreachKey(date)) || "[]");
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  }
  function saveCompletedOutreach(date, completed) {
    try {
      localStorage.setItem(outreachKey(date), JSON.stringify([...completed]));
    } catch {
      // Haven Morning still works when browser storage is unavailable.
    }
  }
  function personalView() {
    const brief = morningBrief();
    const { date } = morningDates();
    const priorities = (brief.priorities || []).filter((item) => item.title?.trim());
    const outreach = (brief.outreach || []).filter((item) => item.text?.trim());
    const direction = (brief.direction || "").trim();
    const soundtrack = (brief.soundtrack || "").trim();
    const threads = (brief.threads || []).filter((item) => item.title?.trim());
    const completed = completedOutreach(date);
    const terminalDate = date.replaceAll("-", ".");

    const priorityRows = priorities.length
      ? priorities.map((item, index) => `<div class="os-row"><span class="os-box">${index === 0 ? "X" : " "}</span><span>${escapeText(item.title).toUpperCase()}</span></div>`).join("")
      : '<div class="os-row os-muted">[ ] NO PRIORITIES LOADED</div>';

    const outreachRows = outreach.length
      ? outreach.map((item) => {
          const rawId = item.id || item.text;
          const checked = completed.has(rawId);
          return `<label class="os-row os-check"><input type="checkbox" data-outreach-id="${escapeText(rawId)}" ${checked ? "checked" : ""}><span class="os-box" aria-hidden="true">${checked ? "X" : " "}</span><span>${escapeText(item.text).toUpperCase()}</span></label>`;
        }).join("")
      : '<div class="os-row os-muted">[ ] NO OUTREACH QUEUED</div>';

    const threadRows = threads.length
      ? threads.map((item) => `<div class="os-thread"><span>•</span><span><strong>${escapeText(item.title).toUpperCase()}</strong>${item.summary ? ` <em>(${escapeText(item.summary).toUpperCase()})</em>` : ""}</span></div>`).join("")
      : '<div class="os-thread os-muted">• NO ACTIVE THREADS</div>';

    return `<section class="morning morning-snapshot os-terminal" aria-labelledby="morning-title">
      <div class="os-rule heavy"></div>
      <header class="os-head">
        <div>
          <span class="terminal-kicker">HAVEN.OS / PERSONAL</span>
          <h1 id="morning-title">HAVEN</h1>
        </div>
        <div class="os-status">
          <span>DATE: ${escapeText(terminalDate)}</span>
          <span>STATUS: ARMED</span>
        </div>
      </header>

      <section class="os-section os-now" aria-label="Now playing">
        <div class="os-section-title">[NOW PLAYING]</div>
        <div class="os-now-line">&gt; ${soundtrack ? escapeText(soundtrack) : "GUNNA / ONE OF WUN"} <span>[► AUDIO STREAM ACTIVE]</span></div>
      </section>

      <section class="os-section">
        <div class="os-section-title">[CURRENT PRIORITIES]</div>
        <div class="os-list">${priorityRows}</div>
      </section>

      <section class="os-section">
        <div class="os-section-title">[OUTREACH CHECKLIST]</div>
        <div class="os-list">${outreachRows}</div>
      </section>

      <section class="os-section">
        <div class="os-section-title">[ACTIVE THREADS]</div>
        <div class="os-list">${threadRows}</div>
      </section>

      <section class="os-section os-direction">
        <div class="os-section-title">[DIRECTION]</div>
        <p>${escapeText(direction || "WHEN ON THE COMPUTER, BE FULLY LOCKED IN. WHEN OFF IT, BE FULLY IN YOUR LIFE.").toUpperCase()}</p>
      </section>

      <footer class="os-ready"><span>[SYSTEM READY_]</span><i aria-hidden="true"></i></footer>
      <div class="os-rule heavy"></div>
    </section>`;
  }

  function render(focus = false) {
    const renderers = {
      home: homeView,
      systems: systemsView,
      security: securityView,
      household: householdView,
      record: recordView,
      personal: personalView,
    };
    const personal = state.view === "personal";
    document.body.classList.toggle("morning-mode", personal);
    document.querySelector(".navigation").hidden = personal;
    document.querySelector(".wordmark").href = personal ? "#personal" : "#home";
    document.querySelector(".wordmark").setAttribute("aria-label", personal ? "Haven morning" : "Haven home");
    document.querySelector(".dialog-top .label").textContent = personal
      ? "HAVEN / PERSONAL DEMO"
      : "CEDAR HOUSE / DEMO RECORD";
    address.innerHTML = personal
      ? "Personal / Morning"
      : homeAddress;
    footer.innerHTML = personal
      ? `<span>HAVEN / MORNING</span><span>Morning brief · ${escapeText(morningDates().fullDate)}</span>`
      : homeFooter;
    demoButton.textContent = personal ? "About this demo" : "Demo home";
    demoButton.dataset.detail = personal ? "personal-demo" : "demo";
    demoButton.hidden = personal;
    document.querySelector("#rest").hidden = false;
    document.querySelector("#rest").textContent = personal ? "Rest" : "Quiet display";
    document.querySelector("#rest").setAttribute("aria-label", personal ? "Rest morning display" : "Enter quiet display");
    content.innerHTML = renderers[state.view]();
    document.querySelectorAll("[data-view]").forEach((link) => {
      if (link.dataset.view === state.view)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.title = personal ? "Haven — Morning" : `Haven — ${state.view[0].toUpperCase() + state.view.slice(1)}`;
    if (focus) content.focus({ preventScroll: true });
    resetIdleTimer();
  }
  function relatedRecord(id) {
    const record = allRecords().find((item) => item.id === id);
    return record
      ? `<div class="related"><span class="label">Kept with the house</span><br><button data-detail="record:${id}">${record.title} ↗</button></div>`
      : "";
  }
  function fieldDiagram() {
    return `<svg class="field-diagram" viewBox="0 0 540 250" role="img" aria-labelledby="diagram-title"><title id="diagram-title">Illustrative west bath wall elevation. Drain center 24 inches from north corner; blocking 34 to 38 inches above finished floor.</title><g fill="none" stroke="#827866" stroke-width="1"><path d="M60 35H480V205H60ZM125 35V205M215 35V205M305 35V205M395 35V205"/><path fill="#d1c5b0" d="M60 103H480V124H60Z"/><path stroke="#304b3c" stroke-width="4" d="M230 205v-65h50v65M253 205V163"/><path d="M60 218h194m-194-4v8m194-4v8"/></g><g fill="#49483e" font-family="monospace" font-size="12"><text x="65" y="25">WEST WALL · VIEW FROM ROOM</text><text x="354" y="117">BLOCKING</text><text x="116" y="239">24 IN TO DRAIN</text><text x="314" y="190">FINISHED FLOOR</text></g></svg><p class="field-caption">Illustrative measured diagram · field note, not a photograph or construction drawing.</p>`;
  }
  function detailMarkup(id) {
    if (id.startsWith("record:")) {
      const record = allRecords().find((item) => item.id === id.slice(7));
      if (!record) return null;
      return `<span class="label">${record.category} / ${record.room}</span><h2 id="detail-title">${record.title}</h2><p>${record.introduction}</p>${record.diagram ? fieldDiagram() : ""}${facts(record.facts)}<p class="detail-note">${record.note}</p><p class="page-note">${record.type}<br>${record.author} · ${record.date}<br>Origin: ${record.phase} · retained in the home record</p>${relatedRecord(record.related)}`;
    }
    if (id.startsWith("system:")) {
      const system = home.systems.find((item) => item.id === id.slice(7));
      if (!system) return null;
      let note = system.note;
      if (system.id === "water" && !batteryNeeded())
        note =
          "No unusual flow or leak sensor exceptions are reported in this snapshot.";
      return `<span class="label">Systems / ${disconnected() ? "current state unknown" : system.state}</span><h2 id="detail-title">${system.name}</h2><p>${disconnected() ? "The home connection is unavailable. The information below is the last known equipment record, not a current reading." : system.summary}</p>${facts([["Equipment", system.equipment], ["Location", system.location], ...system.facts])}<p class="detail-note">${disconnected() ? "Last report: 1:12 PM. Current conditions cannot be confirmed." : note}</p>${system.id === "water" && batteryNeeded() ? '<button class="secondary" data-detail="battery">Review sensor battery</button>' : ""}${relatedRecord(system.related)}`;
    }
    if (id.startsWith("door:")) {
      const doors = {
        front: ["Front entry", "Locked", "11:42 AM"],
        rear: ["Rear entry", "Locked", "12:08 PM"],
        garage: ["Garage", "Closed", "10:35 AM"],
      };
      const door = doors[id.slice(5)];
      if (!door) return null;
      return `<span class="label">Security / connected opening</span><h2 id="detail-title">${door[0]}</h2><p>${disconnected() ? "Current state is unknown. Check the opening directly if needed." : `${door[0]} reports ${door[1].toLowerCase()} in this demonstration.`}</p>${facts(
        [
          ["Reported state", disconnected() ? "Unknown" : door[1]],
          ["Last report", disconnected() ? "1:12 PM · stale" : "1:35 PM"],
          ["Last opened", door[2]],
        ],
      )}<p class="detail-note">Read-only representative data. No lock or garage controls are connected.</p>`;
    }
    const details = {
      "personal-demo": () =>
        `<span class="label">Personal / representative surface</span><h2 id="detail-title">One Haven.<br>A personal context.</h2><p>A working surface for thoughts, projects, people and decisions, within the same Haven instrument.</p><p class="detail-note">This is a public, static demonstration with fictional content. There is no sign-in or access control. Do not put private information in this codebase or deployment; a hidden link or display preference cannot protect it.</p><a class="secondary" href="#home">Return to Home</a>`,
      battery: () =>
        `<span class="label">Attention / upstairs hall</span><h2 id="detail-title">A small replacement.<br>At your convenience.</h2><p>The hallway leak sensor has 18% battery remaining. It is still reporting, but replacing the battery will help keep it available.</p>${facts(
          [
            ["Sensor", "CH-LS-02 · upstairs hall"],
            ["Battery", "CR123A · 3 V"],
            ["Location", "Linen closet floor · beside supply riser"],
            [
              "Plan",
              state.planned ? "Tomorrow · September 28" : "Not yet planned",
            ],
          ],
        )}<p class="detail-note">Demo actions only. Planning keeps the item visible until replacement is recorded.</p><div class="dialog-actions"><button class="primary" data-action="plan">${state.planned ? "Remove plan" : "Plan for tomorrow"}</button><button class="secondary" data-action="replace">Record replacement</button></div>${relatedRecord("water-plan")}`,
      connection: () =>
        `<span class="label">Connection / attention</span><h2 id="detail-title">The house is out of reach.</h2><p>Haven has not received a report since 1:12 PM. It cannot confirm the current condition of doors or systems.</p>${facts(
          [
            ["Last known report", "1:12 PM"],
            ["Snapshot time", "1:35 PM"],
            ["Next step", "Check the home router and its power supply"],
          ],
        )}<p class="detail-note">Saved records and household plans remain available. This is a simulated interruption.</p><div class="dialog-actions"><button class="primary" data-action="restore">Restore demo connection</button></div>`,
      weather: () =>
        `<span class="label">Today / weather</span><h2 id="detail-title">Rain around 3 PM.</h2><p>A mild afternoon, with rain expected through early evening. Tomorrow morning’s irrigation is paused.</p>${facts(
          [
            ["Outside now", "76°F · overcast"],
            ["Rain window", "3:00–7:00 PM"],
            ["Irrigation", "Tomorrow’s cycle skipped"],
            ["Next review", "Tuesday morning"],
          ],
        )}<p class="detail-note">Representative forecast for this demo date. No weather service or irrigation controller is connected.</p>`,
      guest: () =>
        `<span class="label">Household / today</span><h2 id="detail-title">${guestName()} is coming over.</h2><p>Dinner at 5:30 PM. Front entry is the planned arrival point.</p>${facts(
          [
            ["Expected", "Today · 5:30 PM"],
            ["Access window", home.household.access],
            ["Entry", "Front door"],
            ["Host", state.private ? "Household" : "Anna"],
          ],
        )}<p class="detail-note">A planned visit, not a location report. Access is illustrative; no code has been issued or shared.</p>`,
      evening: () =>
        `<span class="label">Household / routine</span><h2 id="detail-title">A quiet close to the day.</h2><p>At 10:00 PM, review the front entry, rear entry and garage. Guest access is planned to end at the same time.</p>${facts(
          [
            ["Time", "Tonight · 10:00 PM"],
            ["Openings", "Front entry · rear entry · garage"],
            ["Action", "Household reminder only"],
          ],
        )}<p class="detail-note">This routine does not guarantee that doors will be secured. There is no automatic locking in this prototype.</p>`,
      maintenance: () =>
        `<span class="label">Upcoming / October 14</span><h2 id="detail-title">Autumn climate service.</h2><p>Cedar Mechanical is expected at 9:00 AM to check both climate zones and replace the filter.</p>${facts(
          [
            ["Equipment", "Heat pump 01 · CH-HP-01"],
            ["Allow access to", "Utility room and upstairs return"],
            ["Before the visit", "Keep the return-air grille clear"],
          ],
        )}<p class="detail-note">Representative appointment. No contractor has been contacted.</p>${relatedRecord("heat-pump")}`,
      privacy: () =>
        `<span class="label">Household / display privacy</span><h2 id="detail-title">Shared by choice.</h2><p>Haven shows household plans, not anyone’s movements. Names can be hidden on this display.</p><label class="preference"><input type="checkbox" id="private-names" ${state.private ? "checked" : ""}><span>Hide household and guest names<small>Applies to daily plans and household notes. Original record authorship is retained.</small></span></label><p class="detail-note">This display preference lasts for this session. The quiet display never shows names.</p>`,
      demo: () =>
        `<span class="label">About this prototype</span><h2 id="detail-title">One house.<br>Three kinds of day.</h2><p>Cedar House is a fictional home in Nashville. All reports, people, appointments and records are representative.</p><label class="scenario-label" for="scenario">Demonstration state</label><select id="scenario"><option value="attention" ${state.scenario === "attention" ? "selected" : ""}>One small item · low sensor battery</option><option value="quiet" ${state.scenario === "quiet" ? "selected" : ""}>Quiet day · nothing needs attention</option><option value="offline" ${state.scenario === "offline" ? "selected" : ""}>Connection lost · current state unknown</option></select><label class="preference"><input type="checkbox" id="auto-idle" ${state.autoIdle ? "checked" : ""}><span>Rest the Home screen after two minutes<small>Touch or press Enter to return. Reading other pages will not be interrupted.</small></span></label><p class="detail-note">The demo is fixed at Sunday, September 27, 2026, 1:35 PM. Actions last for this session and reset on reload. No monitoring, messages or device commands are sent.</p><div class="dialog-actions"><button class="secondary" data-action="reset">Reset demonstration</button><a class="secondary" href="#personal">Explore Personal demo</a></div>`,
    };
    return details[id]?.() || null;
  }
  function openDetail(id, source) {
    const markup = detailMarkup(id);
    if (!markup) return;
    if (!dialog.open) opener = source || document.activeElement;
    detailContent.innerHTML = markup;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    document.querySelector(".close-button").focus();
    clearTimeout(idleTimer);
  }
  function closeDetail() {
    dialog.close();
  }
  dialog.addEventListener("close", () => {
    if (opener?.isConnected) opener.focus();
    else content.focus({ preventScroll: true });
    resetIdleTimer();
  });
  document
    .querySelector(".close-button")
    .addEventListener("click", closeDetail);
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeDetail();
  });
  document.addEventListener("click", (event) => {
    const detail = event.target.closest("[data-detail]");
    if (detail) {
      openDetail(detail.dataset.detail, detail);
      return;
    }
    const filter = event.target.closest("[data-filter]");
    if (filter) {
      state.filter = filter.dataset.filter;
      render();
      content.querySelector(`[data-filter="${state.filter}"]`).focus();
      announce(`Showing ${state.filter.toLowerCase()} records.`);
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "plan") {
      state.planned = !state.planned;
      render();
      openDetail("battery");
      announce(
        state.planned
          ? "Replacement planned for tomorrow."
          : "Replacement plan removed.",
      );
    } else if (action === "replace") {
      state.replaced = true;
      state.planned = false;
      render();
      openDetail("record:battery-service");
      announce(
        "Demo replacement recorded. Nothing needs your attention. A service entry was added to Record.",
      );
    } else if (action === "restore") {
      state.scenario = "quiet";
      render();
      closeDetail();
      announce("Demo connection restored.");
    } else if (action === "reset") {
      Object.assign(state, {
        scenario: "attention",
        planned: false,
        replaced: false,
        private: false,
        autoIdle: true,
        filter: "All",
      });
      render();
      openDetail("demo");
      announce("Demonstration reset.");
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "scenario") {
      state.scenario = event.target.value;
      state.planned = false;
      state.replaced = false;
      render();
      announce("Demonstration state changed. Close details to explore.");
    }
    if (event.target.id === "private-names") {
      state.private = event.target.checked;
      render();
      announce(
        state.private
          ? "Names hidden on the shared display."
          : "Names visible on the shared display.",
      );
    }
    if (event.target.id === "auto-idle") {
      state.autoIdle = event.target.checked;
      resetIdleTimer();
    }
  });
  function showIdle() {
    if (dialog.open) return;
    if (state.view === "personal") {
      idle.innerHTML = `<div class="morning-rest"><span class="wordmark">HAVEN</span><div><p>Morning is here.</p><button class="wake" id="wake">Touch or press a key to begin</button></div><small>Morning brief · ${escapeText(morningDates().fullDate)}</small></div>`;
      idle.hidden = false;
      instrument.hidden = true;
      document.querySelector(".skip").hidden = true;
      document.querySelector("#wake").focus({ preventScroll: true });
      clearTimeout(idleTimer);
      return;
    }
    const status = disconnected() ? "Unknown." : "Secure.";
    const note = disconnected()
      ? "Connection unavailable. Last report at 1:12 PM."
      : batteryNeeded()
        ? state.planned
          ? "One small item. Planned for tomorrow."
          : "One small item needs your attention."
        : "Nothing needs your attention.";
    idle.innerHTML = `<header class="idle-top"><span class="wordmark">HAVEN</span><span class="label">Cedar House / Quiet display</span></header><div class="idle-body"><div><span class="label">${disconnected() ? "Home / connection unavailable" : "Home / connected openings"}</span><h1>${status}</h1><p class="idle-status">${note}</p></div><div class="idle-date"><div class="temperature">${disconnected() ? "—" : "72°"}<small>inside</small></div><p>Sunday<br>September 27</p><span>Rain around 3 PM.</span></div></div><footer class="idle-bottom"><span>Demo home · representative data<br>September 27, 2026 · 1:35 PM</span><button class="wake" id="wake">Touch to return <span aria-hidden="true">↗</span></button></footer>`;
    idle.hidden = false;
    instrument.hidden = true;
    document.querySelector(".skip").hidden = true;
    document.querySelector("#wake").focus({ preventScroll: true });
    clearTimeout(idleTimer);
  }
  function wake() {
    if (idle.hidden) return;
    idle.hidden = true;
    instrument.hidden = false;
    document.querySelector(".skip").hidden = false;
    (state.view === "personal" ? content : document.querySelector("#rest")).focus({ preventScroll: true });
    resetIdleTimer();
  }
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (
      state.autoIdle &&
      state.view === "home" &&
      !dialog.open &&
      idle.hidden &&
      !document.hidden
    )
      idleTimer = setTimeout(showIdle, 120000);
  }
  document.querySelector("#rest").addEventListener("click", showIdle);
  idle.addEventListener("click", wake);
  idle.addEventListener("keydown", (event) => {
    if ((state.view === "personal" && !event.metaKey && !event.ctrlKey && !event.altKey && !["Shift", "Control", "Alt", "Meta"].includes(event.key)) || event.key === "Enter" || event.key === " " || event.key === "Escape") {
      event.preventDefault();
      wake();
    }
  });
  ["pointerdown", "keydown", "pointermove", "scroll"].forEach((type) =>
    document.addEventListener(type, resetIdleTimer, { passive: true }),
  );
  document.addEventListener("visibilitychange", resetIdleTimer);
  function route(focus = false) {
    const requested = location.hash.slice(1);
    state.view = views.includes(requested) ? requested : "personal";
    if (dialog.open) dialog.close();
    wake();
    render(focus);
    if (focus) window.scrollTo({ top: 0, behavior: "instant" });
  }
  window.addEventListener("hashchange", () => route(true));
  route();
  content.addEventListener("change", (event) => {
    const checkbox = event.target.closest?.("[data-outreach-id]");
    if (!checkbox) return;
    const brief = morningBrief();
    if (!brief) return;
    const completed = completedOutreach(brief.date);
    const id = checkbox.dataset.outreachId;
    if (checkbox.checked) completed.add(id);
    else completed.delete(id);
    saveCompletedOutreach(brief.date, completed);
  });

})();
