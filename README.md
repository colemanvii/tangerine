# Haven

**A private Human OS, beginning with Morning.**

Morning is now the default entry. Wake with a click, touch, or keypress; read the
orientation; open the existing Freeman field note. `#personal` opens this same
surface. This is a manually selected, dated brief, not
an authenticated private account or an automatically generated daily brief.

The existing home prototype and its explicit hash routes remain available below.
Its documentation describes the earlier home context, not the Morning product direction.

Haven is quiet infrastructure for daily life: one place to understand the state of a home, know what needs attention, and preserve the knowledge that normally disappears across apps, binders, contractors, devices, and time.

The interface is not the product. The product is **orientation**.

> What is happening? Are we okay? What needs me? What happens next?

## Home System

The current prototype treats the home as a durable system rather than a collection of smart devices.

- **Home** — the daily brief: state, attention, what happens next.
- **Systems** — power, water, climate, network, equipment and maintenance.
- **Security** — calm status, access, perimeter and exceptions.
- **Household** — people, guests, routines and shared context.
- **Record** — the permanent memory of the house: drawings, finishes, appliances, warranties, service history and field documentation.

The goal is not more telemetry. It is less uncertainty.

## Design principles

**Human meaning / machine state.** Serif typography carries what a person needs to understand. Monospace carries system state.

**Quiet by default.** Green means the system is okay. Signal orange is reserved for something that deserves attention. Everything else recedes.

**Physical, not app-like.** Haven should feel like walking up to a beautifully made instrument that already knows what is going on.

**Continuity.** A home should retain its own memory across owners, builders, repairs and generations.

## Builder handoff

A builder can begin the record during construction: drawings, field photos, selections, equipment, warranties and decisions. At turnover, that same record becomes the homeowner's operating layer.

**The builder creates the house. Haven remembers it.**

## Field notes

- [Freeman — Give the house a memory](field-notes/freeman/) — builder handoff concept and proposed one-house pilot.

## Status

Concept prototype. The interface uses representative data only. No security, device-control, payment, or emergency functionality should be assumed from the prototype.

## Archive

Earlier Haven explorations are preserved in this repository as part of the design record.

## Run the prototype

Open `index.html` directly in a modern browser, or serve this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173` for Morning or append `#home` for the existing home demo. No build step, package installation, external fonts, or network service is required. Navigation uses shareable hash routes, including `#home`, `#systems`, `#security`, `#household`, and `#record`.

## Explore Cedar House

The demonstration takes place at 1:35 PM on September 27, 2026, in a fictional Nashville home completed in 2024.

- Open the sensor attention item. Plan a replacement for tomorrow, or record its replacement. Completion clears the attention item and adds a service entry to Record.
- Inspect a system to follow its equipment and maintenance history.
- Filter Record and open entries to inspect selections, field observations, a measured diagram, service visits, and builder handoff provenance.
- Open **Demo home** to compare a low battery, a quiet day, and a lost connection. Unknown state replaces reassuring language when the connection is lost.
- Open **Quiet display** for the wall-mounted idle experience. Touch anywhere, press Enter, Space, or Escape to return. Home rests after two inactive minutes by default; other views and open details never time out.
- In Household, **Display privacy** hides names from shared plans and notes. Original record authorship is retained. Quiet display never shows names.

All actions and display preferences are session-only and reset on reload. Changing demonstration scenarios resets the simulated maintenance action. The clock and forecast are a fixed narrative snapshot, not live information. There are no device commands, real access codes, external messages, tracking, or account services.

## Source map

- `index.html` — semantic instrument shell, primary navigation, native detail dialog.
- `styles.css` — material palette, typography, layout, responsive and reduced-motion rules.
- `home-data.js` — one representative home; stable equipment and record identifiers, provenance, and related records.
- `app.js` — view rendering, route handling, detail inspection, local demonstration actions, privacy, and idle behavior.
- `DESIGN.md` — audit, design decisions, scope, and validation notes.
- `field-notes/freeman/BARNSLEY-HOUSE-001.md` — Barnsley Gardens pilot concept; retained in the repository but excluded from the hosted Morning build.

Historical explorations live only under `archive/`; legacy root redirect stubs were removed during repository cleanup.

The sample record includes authored text extracts and an illustrative field diagram. Source photographs, original construction drawings, manufacturer manuals, and warranty documents are not included; the interface says so explicitly. Model/serial identifiers are fictional and warranty summaries are not verified coverage.

## Seven-morning trial — manual editing

Visual system and typography are frozen. Edit only `morning-data.js` for the trial.
It holds seven independent entries dated September 29–October 5, 2026. The first
is a starting brief based on the current direction; the other six are blank
writing templates, not predicted events. Change the dates if the trial starts later.

Each morning:

1. Fill the entry for that date. Copy/remove array items to include 1–2 priorities,
   3–5 threads, and 1–3 changes. Write one question, action, and grace line.
2. Set `activeDate` at the top to that entry's date and reload the page.
3. Keep completed days intact. Carry forward only what still matters.

Write short priority titles (about 30 characters) and single-sentence summaries
(about 70). Keep changes around 65 characters each and the question/action around
100. These are editorial budgets for the fixed screen, not enforced truncation.
Longer writing will reflow; no content is silently cut off or hidden.

`begin.text` is the concrete action. `begin.href` and `begin.label` are optional:
leave both blank for an action away from the computer. The existing field note
is a reading destination; Haven does not edit or complete it for you.

Dates in the heading, yesterday label, footer, and rest state all derive from the
selected entry. Selection is manual and never follows the clock automatically.
There is no new navigation, storage service, editor, or automation. The source
file itself holds these manually authored records; reload does not change them.

After each morning, note outside the app what helped, what was stale, and whether
the next action was clear. After seven days, use those observations to decide
which information earns a place. Do not change the layout during the trial.

The fullest starting brief (2 priorities, 5 threads, 3 changes, one question,
one action, one grace line) was checked at desktop and tablet dimensions,
including 1024×768, with no scrolling. Phone layouts reflow vertically.
No CSS or typography changes were made for this trial structure.

Existing home routes remain available by their explicit hashes. No authentication
or private storage is provided; local content must not be treated as protected if
this static repository is published. Nothing from this edit has been pushed.

## Hosted deployment boundary

The repository may contain archives, prototypes, design documents, and project records that are not part of the hosted Morning surface. The deployment excludes those files via `.vercelignore`. The hosted Morning page also declares `noindex, nofollow, noarchive`, and `robots.txt` disallows crawling.

This does **not** make the repository or deployment private by itself. Repository visibility and Vercel Deployment Protection must be configured separately.

Git-connected production deployment is tracked from `codex/personal-context-demo`.
