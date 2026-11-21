# Index 002

November 21, 2026 · branch `claude/tangerine-index-002` (from Website V2, `2188ad5`, which is preserved on `claude/tangerine-website-v2-tsnpvz`). **Not promoted to production.**

## Direction

The interface is the instrument; the work is what it reveals. The machine is precise; the work is human.

## Studies

Three working prototypes are kept in `website/studies/index-002/` (they are not deployed). Each uses the shared `/data/archive.json`.

| Study | Idea | Verdict |
|---|---|---|
| A — The Instrument | Relationships as controls, each with a tick track. One artifact on a crop-marked stage, with a coordinate readout. | Precise, but reads as software. One artifact at a time leaves the first screen empty before interaction. Weak on phones. |
| B — The Living Index | Serif names, every artifact title running inline beneath them. The image follows the hovered line as a marginal figure. | The warmest and most editorial, but imagery is secondary. Scout falls below the fold. On phones it becomes a column of text. |
| C — The Tracks | All 35 artifacts are always present as four horizontal tracks. The selected relationship opens to show its work at scale, and the others compress. A cursor moves through the plates. | **Chosen.** The index and the visual field are the same object. It is compelling before interaction, and better after. All four relationships fit one phone screen. |

The final version takes C as the structure. From A it keeps the coordinate readout (code, pixel size, ratio). From B it keeps serif names, the running Contents index (now on each dossier), and a single blinking signal. The live clock from C was dropped: it added no meaning.

## Major decisions

- **Subtraction.** Removed:
  - the "We build brands." headline (it is now a quiet italic line in the bar);
  - the statistics panel;
  - the intro paragraph;
  - the homepage studio, log and contact sections.

  Those now live in a **Studio** panel that opens on request.
- **Three voices.**
  - The script wordmark is the only expressive type.
  - Instrument Serif is for people and works.
  - Archivo is only the instrument's voice: small, wide, tracked labels.
  - The heavy, extended Archivo display type is gone from the site.
- **Behaviour over decoration.**
  - One track open at a time. The orange edge bar and four-corner cursor mark the active state.
  - The readout flashes its code on each change.
  - Two motion tokens: 140 ms for a state change, 240 ms for a change of place.
  - The film plays in place only while selected.
  - One slow signal beside the entry count says the archive is open. There are no fades or entrance sequences.
- **Controls.**
  - ← → move through the work; ↑ ↓ or 1–4 switch relationship.
  - ↵ or a second click opens the full-screen viewer, which runs across all 35 artifacts. Closing it leaves the cursor where you ended.
  - Scrolling or swiping a track moves the cursor with it.
  - `/#artifact-id` and `/#relationship` deep links work.
- **Dossiers** (the relationship pages) share the bar, the serif and label system, a relationship switcher (01 FGC · 02 JM · 03 KC · 04 SM), a running Contents index, filter marks, pixel dimensions in captions, and the same viewer.
- **Content model unchanged**, apart from:
  - a `code` per relationship;
  - removing the unused `index` list;
  - a 320 px image tier for thumbnails.

  The 35 artifacts, attributions and status labels are unchanged.

## Verification (local, Chromium via Playwright)

- `website/tools/check.mjs` passes at 1440×900, iPad Pro 11 and iPhone 13, four runs in a row. It checks:
  - every page: no console errors, no failed requests, no horizontal scroll, alt text, image decoding;
  - index: keyboard, tap, viewer, cursor hand-off, deep link and Studio;
  - dossiers: viewer, deep links and filters.
- axe-core (WCAG 2.1 AA and best practice): no violations on any page, the viewer, or the Studio panel.
- Reduced motion: no film playback on the track, no blinking signal, instant transitions.
- Homepage initial transfer is about 0.55–1.1 MB on desktop (it depends on how far lazy loading reaches) and about 0.96 MB on iPhone, where 3× images dominate.
- Content integrity: 35 artifacts (18 / 4 / 9 / 4), identical to V2.

**Not verified here:** the Vercel preview and the public domain. This session's network cannot reach `*.vercel.app` or `ex-tangerina.com`.
