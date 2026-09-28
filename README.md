# Haven

**A calm operating system for the home.**

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

Then open `http://127.0.0.1:4173`. No build step, package installation, external fonts, or network service is required. Navigation uses shareable hash routes, including `#home`, `#systems`, `#security`, `#household`, and `#record`.

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

The archive is unchanged. The three legacy root URLs redirect to their corresponding historical pages under `archive/pre-home-os/`.

The sample record includes authored text extracts and an illustrative field diagram. Source photographs, original construction drawings, manufacturer manuals, and warranty documents are not included; the interface says so explicitly. Model/serial identifiers are fictional and warranty summaries are not verified coverage.

## Personal context (public demo)

Open `index.html#personal`, or choose **Demo home → Explore Personal demo**.
The existing Home navigation returns to the home context. Direct links and browser
Back/Forward use the same hash router as the rest of Haven.

The Personal surface adapts the local v5 prototype's two-column working view:
current question, ideas, questions, people, active threads, decisions and parked
items. It reuses the instrument shell, palette, typefaces, navigation, dialog,
focus handling and route lifecycle. Only a renderer in `app.js` and scoped layout
rules in `styles.css` are added; Home data and existing views are unchanged.
The source prototype is not copied into the repository. All Personal content here
is newly written fictional demonstration data.

**Privacy limitation:** this repository and static deployment are public. The
Personal route is a context, not access control. It must not contain real private
content. No sign-in, personal data input, local persistence, backend, or sync is
provided. Actual private use requires an authenticated hosting/data boundary
before any personal content is introduced. Display privacy in Household only
hides demo names visually and does not secure source data.

No new build dependencies are required. The Personal view uses the existing
responsive shell and permits vertical reading on narrow screens rather than
clipping content. A fixed-screen redesign is outside this integration pass.
