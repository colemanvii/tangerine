## Frozen visual system — seven-morning content trial

The Morning CSS and typography are frozen. Dated briefs now live together in
`morning-data.js`, selected through an explicit `activeDate`. The renderer reads
the brief directly; it no longer requires editing entity IDs in several places.
All visible dates come from the selected date, with yesterday computed in UTC
to avoid local timezone drift. No clock-driven selection is introduced.

The seven entries begin September 29, 2026. Day one is a concise starting brief;
future days are blank for manual authorship. Three changes render in full.
The action's text, optional link, and link label are editable with the brief.
No styling, routes, persistence service, automation, or editor was added.

The existing visual audit below remains historical. Its fixed-snapshot and
entity-selection descriptions are superseded by the manual brief structure.

# Morning V1 — current surface

Morning supersedes the earlier Personal grid and is the default entry. The
historical home design notes below describe the preserved home routes.

The composition retains the existing warm paper. Morning typography uses Iowan
Old Style, then Baskerville, Century Schoolbook, and Georgia; reading text is
serif throughout, with substantial headings and restrained monospace notation.
IBM Plex Mono and Courier Prime precede the system monospace fallbacks.
Fonts are resolved locally, with no downloads. Iowan and Baskerville were
compared in-browser; Century Schoolbook was unavailable on the test machine. Today has primary weight; life threads read as a quiet
margin. Two dated changes supply continuity, and the unresolved question is
explicitly allowed to remain unanswered. The final action releases the user
into the existing Freeman field note. Scripture shares that closing space.

Removed from Morning: the framed instrument, shadows, rounded corners, giant
headline, navigation rail, demo controls, ideas/people/decisions grids, repeated
status labels, and decorative transitions. No additional pages, editors,
checkboxes, AI controls, live indicators, or administration surfaces were added.

Verification: browser checks confirmed click/key wake, explicit rest, next-action
navigation, and all six existing hash routes. No JavaScript runtime errors.
Morning fits without scrolling at 1440×900, 1280×800, 1024×768, 768×1024,
820×1180, and 1194×834. Narrow layouts at 390, 320, and 640 pixels reflow without
horizontal overflow. Visual captures were inspected at desktop and tablet sizes.
The existing Freeman destination requests a missing favicon; its page content
loads correctly. Browser automation used bundled Playwright because the
agent-browser command is not installed. Syntax and whitespace checks passed.

Structural limits: the brief is a fixed snapshot; changes are curated, not
computed from history. No authenticated persistence exists. The existing field
note is a reading destination, not an editor. The older home documentation and
routes remain a separate historical product context.

---

# Haven — the home instrument

## Audit

The starting prototype expressed the correct thesis but diluted it in six ways:

1. The left signal panel, central brief, and right-hand “now” rail repeated the same state with competing hierarchy.
2. 9–13px navigation and metadata, compact controls, and a narrow status headline failed distance and touch use.
3. Equal panels, bright status colors, and a music module made the composition feel like a dashboard.
4. Navigation was the only working interaction; equipment, maintenance, records, and people were disconnected examples.
5. There was no idle behavior, quiet-day state, or handling for unavailable reports.
6. Record consisted of summaries rather than inspectable knowledge. Construction-to-home continuity had no underlying model.

The full active repository and the pre-home-OS archive were reviewed before editing. Historical brand explorations remain historical; their UI is not inherited.

## Design system

- **Material:** a single warm ivory face, restrained metal-colored edge, broad margins, hairline divisions. No repeated floating cards.
- **Color:** paper `#f4f0e7`, charcoal `#292b25`, secondary ink `#69685e`, instrument green `#304b3c`, attention orange `#9a4c22`. Color has a semantic role; orange is limited to exceptions and focus.
- **Typography:** Georgia for human meaning, system sans for explanations and controls, system monospace for compact machine states and provenance. No external font requests.
- **Scale:** main state approximately 44–66px, idle state 70–150px; body 16–17px; most touch controls at least 44px tall. Small type is reserved for secondary labels and provenance.
- **Spacing:** 8px base rhythm, 24–54px structural gutters. The home state receives more area than the normal systems strip.
- **Controls:** scarce, deliberate buttons; full-row inspection targets; native select, checkboxes, and modal dialog; visible keyboard focus and Escape dismissal.
- **Navigation:** five stable destinations on a shared bottom rail. Current route has a ruled green indicator, not a colored pill. Hash routes support direct links and browser history.
- **Motion:** short color transitions and a one-pixel press response. No ambient animation. Reduced-motion preferences remove transitions.
- **Idle:** deep green face, one-word reported state, indoor temperature, date and weather, and an honest attention summary. No names. Home rests after two inactive minutes; reading other views or details never times out.

## Architecture

**Home:** a daily brief, one exception, three relevant upcoming events, four quiet system summaries. No music, activity feed, charts, or control grid.

**Systems:** exceptions before a six-system ledger. Inspection reveals equipment, location, state context, and linked records. Normal and intentionally paused operation remain neutral.

**Security:** three connected exterior openings, meaningful limits on the reported state, and a planned guest visit. No camera feeds, fake lock controls, or guarantee of safety. Offline reports become unknown rather than retaining “secure.”

**Household:** intentionally shared plans, an ordinary kitchen note, and display privacy. No resident location, movement history, or behavioral inference.

**Record:** eight inspectable entries, category filters, author/date/phase provenance, related records, a measured field diagram, selections, equipment, and service history. A simulated maintenance completion becomes the ninth entry. Original builder knowledge and subsequent care share one collection.

No framework, service API, analytics, cloud persistence, login, contractor messaging, real device control, or speculative builder application is added. The builder opportunity is expressed through the data model and handoff provenance.

## Coherent demonstration

Cedar House, Nashville, completed August 2024. Anna and James have Caroline coming for dinner. Rain is expected at 3 PM, so the following morning's irrigation is paused. A hall leak sensor needs a battery. A recent generator service and an upcoming climate service connect machinery to its history. Original kitchen selections and concealed-condition notes preserve construction knowledge.

Three scenarios are selectable in Demo home: one small maintenance item, an entirely quiet day, and lost connection. Session state is intentionally ephemeral. There is no live data claim.

## Polish and verification

Validation covers the journey from the daily brief to sensor inspection, planning, replacement, and the resulting service entry. It also covers record filters and links, privacy propagation, offline language, modal keyboard focus, idle/wake behavior, direct navigation and browser history, and responsive overflow across phone, portrait tablet, landscape tablet and desktop sizes.

The ten-second and silence tests are supported by the composition and selectable quiet state. Distance legibility and touch comfort were inspected in browser captures; physical six-foot viewing and mounting in a real home still require hardware testing. These are design intentions, not claims of completed field research.

### Executed checks

- 54 browser assertions passed with no JavaScript or console errors: maintenance planning/completion, added service record, category filtering, linked field records, privacy across views, offline handling, restoration, dialog focus containment/return, idle wake, automatic two-minute idle, uninterrupted Record reading, hash routes, browser Back, and all five views without horizontal overflow at widths of 320, 390, 768, 1024, 1194 and 1440 pixels.
- Final inspection also checks every visible detail entry, navigation remaining visible at 1024 × 768, a field-detail dialog at 320px, 640px reflow equivalent to a 1280px window at 200% zoom, and the legacy archive redirect.
- JavaScript syntax checks and repository whitespace checks pass. No application runtime dependencies were introduced.
