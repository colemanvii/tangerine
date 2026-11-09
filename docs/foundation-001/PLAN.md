# Tangerine — Foundation 001

Study branch `study/tangerine-foundation-001`, from `main` at `3ca3c67` (8 Nov 2026).
Status: **study, for review.** Not merged, not deployed. Nothing on `main` was changed.

Tangerine is the brand. The digital archive is one product within it. This study sets the
shared design system and makes the **Whiteboard** the first functional milestone of that
product, built on the archive's source-preservation rules.

---

## 1. Audit

### Repository and access

- `colemanvii/tangerine` is **public**. Older notes on `experiment/001-fear` describe it as the private repository `colemanvii/haven`, so its visibility changed after that work was written. Treat everything on every branch as published.
- `main` has 238 commits. Its last five commits (25 Oct–8 Nov) introduce Tangerine as a brand, archive legacy Haven and set the privacy boundaries in `AGENTS.md`.

### Inventory

| Where | What it is | Verdict |
| --- | --- | --- |
| `main`: `index.html`, `app.js`, `styles.css`, `home-data.js` | Haven Home: the Cedar House home-system demo | **Legacy runtime. Keep in place.** `AGENTS.md` notes that a Vercel deployment may still serve it. Retire it only through a reviewed cutover. |
| `main`: `personal/` | Personal Now / Next / Direction dashboard | **Private material in a public repository.** See §3. Not touched. |
| `main`: `haven-year-32.html`, `haven-personal-*.html`, `full.html`, `onboard.html`, `astra/`, `index-v2.html`, `philosophy.html`, `projects.html` | Earlier personal dashboard variants and redirects | Retired designs. Consolidate into `archive/` at cutover. |
| `main`: `PRODUCT.md`, `DESIGN.md`, `BARNSLEY-HOUSE-001.md`, `HAVEN_PROFILE_PROMPT.md`, `haven-profile.schema.json` | Haven Home product, design and pilot documents | Belong to Haven Home, not to Tangerine. Move them to `archive/` at cutover. |
| `main`: `sandbox/system/specimen.html` | “Air 02” cyber-white specimen | **Keep.** It is the visual ancestor of this system. |
| `main`: `studies/haven-001-resumption-instrument.md` | Thesis: return, threads, the authored bookmark, the Cold Open | **Keep.** The Whiteboard bookmark comes from this. |
| `main`: `archive/` (Keep, Institute, TOM, pre-home-os) | Earlier concepts | Already archived. Their values carry forward. |
| `study/tangerine-wrapped-astra-001` | Wrapped report: a local ChatGPT-export importer, plus `docs/TANGERINE_PRODUCT.md` | **Active.** Its product contract and palette are adopted here. Not modified. |
| `experiment/001-fear` | Commonplace and reading experiment, including the append-only `store.js` | **Active experiment.** Its immutability model is carried into `core/store.js`. Not modified. |
| `haven-001-return-loop` | Bookmark and Cold Open prototype | Historical. Its principles are reused. |
| `morning-system`, `codex/personal-context-demo`, `haven-home-system`, `field-note-freeman` | Older dashboards and home-system work | Historical. Leave untouched. |
| `archive/haven-before-tangerine-2026-10-25`, `archive/pre-commonplace-2026-10-25` | Snapshots | Preserved. Never rewrite. |

### Baseline (what works today)

| Check | Result |
| --- | --- |
| `main` `index.html`, `personal/index.html`, `sandbox/system/specimen.html` in Chromium | Render, no console errors |
| Wrapped study: `node --test tests/*.test.mjs` | 5 / 5 pass |
| Fear experiment: `node experiments/001-fear/tests/store.test.js` | All immutability checks pass |

The Wrapped README's `node --test tests/` form fails on Node 22 because a directory is not a test path. The glob form passes. Correct this on that branch when it is next touched.

---

## 2. Where the work goes

One repository and one product line. No new repository and no second application.

```
system/tangerine.css   brand tokens, type, the mark — shared by every surface
core/store.js          the only writer: originals (append-only, fingerprinted) + board layer
core/index.js          read-only index: related, search, return — explained, never writes
app/                   Tangerine Digital (Whiteboard · Archive · Return; Writing next)
docs/foundation-001/   this plan, screenshots
```

This follows the layout `docs/TANGERINE_PRODUCT.md` proposes (`app/`, `core/`, `docs/`). It sits beside the legacy root files without touching them. The Wrapped importer and the Fear store should fold into `core/` as adapters, through a deliberate merge (§5).

---

## 3. Boundaries: public, private, confidential

| Layer | What belongs | Where |
| --- | --- | --- |
| **Public brand** | Name, philosophy, identity system, public site copy | `system/`, a future `site/`. Safe in this public repository. |
| **Product code** | App and core logic, tests, demonstration data marked fictional | `app/`, `core/`. Public is fine. It contains no records. |
| **Private material** | Writing, photographs, notes, people, projects, conversation exports | **Never in Git.** Only in the user's browser store, or later in a private vault that the user controls. |
| **Confidential initiatives** | Unannounced business concepts | Absent from code, copy, comments, commits and metadata. This study contains none. |

**Needs your decision. I have not acted on it:** `main` still publishes personal material in this public repository: `personal/`, the earlier personal dashboard files, and pilot documents that name real clients and places. `AGENTS.md` says to leave `personal/` alone until a reviewed migration, so I left it. Moving that material to a private location is the most urgent privacy step. Removing it from `main` does not remove it from Git history or from the archive branches, so decide before anyone links to the repository publicly.

---

## 4. Milestone 001: Whiteboard / Tablet (built)

A command center for projects, people and ideas, pinned to original sources. Tablet landscape is the primary design surface. It also works on desktop and on tablet portrait, and becomes a ledger on phones.

**Source preservation, in code**

- `core/store.js` is the only module that writes. Each source is an append-only list of revisions. Revision 1 is the original, fingerprinted with SHA-256 when it is kept. A revision needs the `USER_EDIT` token, and a deletion needs `USER_DELETE`. Collected material can never be revised. Import adds what is missing and never overwrites. Every read returns a deep-frozen copy.
- The Whiteboard is the author's working layer. A pinned source is a **reference** (`sourceId`), not a copy. Renaming, moving, linking or unpinning it cannot reach the original. Tests and the browser check confirm the original is byte-identical before and after.
- Bookmarks follow the resumption study: where it stands, the open question, the next move. They are append-only, so earlier bookmarks stay readable.
- The index (`core/index.js`) reads frozen copies and returns references with a reason, for example “Shared words: paper, sewn, letterpress.” Suggestions are labeled *Derived*, can be dismissed, and dismissals live in a separate collection. No AI model is connected, and the interface says so. A future model may sit only behind this same read-only boundary.

**Interface**

- The board uses catalogue numbers (`P—001` project, `R—004` person, `I—006` idea, `S—008` source), hairline frames, a 48 px ruled field, 8 px snapping, and drag or arrow keys to move cards.
- The inspector opens on the Cold Open of the one project marked **Now**. That project carries the only tangerine mark on the screen.
- Archive shows the original in serif, with provenance, fingerprint verification and revision history. Return shows what was kept on this day, as first kept, alongside the thread left longest and one explained connection.
- Storage is IndexedDB in this browser only, with a memory fallback. **Export a copy** writes JSON. Nothing is sent anywhere.
- All demonstration material is fictional, labeled on every card, and removable in one step. The one quotation is Thoreau, *Walden* (1854), which is public domain.

**Design system (`system/tangerine.css`)**

- Palette: cyber white `#fafbfb`, near-black `#181a1b`, greys `#4a4e50`, `#868b8d` and `#b7bbbc`, hairline `#dfe2e2`, tangerine `#f25a28`. These continue the Wrapped contract.
- Type: Helvetica Neue for the interface, a book serif for originals, and a monospace for metadata. Metadata is set small, uppercase and tabular, like a caseback engraving. No web fonts are loaded.
- The mark is a hairline dial with a single tangerine index at twelve. The hand always comes back to twelve: keep, and return.
- Rules: tangerine is an index, never a decoration, and appears at most once per view. No gradients, rounded corners, shadows, stock imagery or emoji.

---

## 5. Next milestones (proposed, not started)

| # | Milestone | Notes |
| --- | --- | --- |
| 002 | **Writing** — *built, see below* | A quiet serif desk that keeps each draft as a revision through `store.reviseSource`. No AI completion. |
| 003 | **Identity + public site** | A specimen page from `system/` and a one-page `site/`: mark, philosophy, four practices, nothing more. Kept separate from the legacy Vercel source until a deliberate cutover. |
| 004 | **Consolidation** | Bring the Fear store and the Wrapped importer into `core/` as adapters, and move legacy root files to `archive/`. Each change goes in a reviewed PR with a deployment check. |
| 005 | **Private vault** | Durable storage outside the browser that the user owns: a folder of JSON or Markdown files. This must exist before any real material is used. |

## 5a. Milestone 002: Writing, and trust in the browser store (built, 9 Nov 2026)

- **Writing desk** (`#writing`): a list of pieces, and one serif column at a 680 px measure. No toolbar, formatting or AI.
- **Drafts** (`store.saveDraft` and friends, a new `drafts` collection; IndexedDB v2 upgrades v1 in place). A draft is a working copy, never an original. It autosaves 600 ms after typing stops, on blur, on leaving the view, and when the tab is hidden. Every keystroke is also mirrored synchronously to `localStorage`, so words typed just before a crash are recovered on the next load.
- **Restore** (`store.restore`, `validateBackup`): all-or-nothing validation, including fingerprints, then a dry-run preview, then a merge that never overwrites.
- **Verification** reports `intact`, `changed`, `unavailable` (no SHA-256 on this connection) or `unfingerprinted`. The interface no longer says "verified" when nothing was checked.
- **Still true:** storage is this browser only. Milestone 005 (private vault) remains the durable answer.

## 6. Recommendation

Approve the `core/` + `app/` + `system/` structure and the Whiteboard as the base of Tangerine Digital. Before anything else is built, decide where the private material on `main` goes (§3). After that, continue with Writing (002), and only then the public site (003). No deployment is proposed until a private hosting destination has been verified.
