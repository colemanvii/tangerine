# Tangerine — Design No. 05, The Studio

**Status:** Design study and working preview, 17 November 2026. Not approved for production. Not on the main Tangerine
domain (every page is `noindex`). Nothing on `main`, the deployed site, or earlier studies was changed.

Tangerine is now the public home for everything Cole Calfee makes. ColeCalfee.com is being retired into it. Design No. 05
grows Design No. 04, *The Grove* (`studies/tangerine-studio-v4/` on `claude/kind-pasteur-fxm43m`), from one long page into
a small multi-page studio site with a real archive. The grove, the wordmark, the resident tangerine, the branding iron and
the night sky all carry over.

## Open it

```sh
cd studies/tangerine-studio-v5
python3 -m http.server 8765        # then open http://localhost:8765/
```

Opening `index.html` straight from disk also works. Add `?h=19` (any hour, 0–24) to the address to see the page at that
time of day in Georgia.

To change a page, edit `src/pages/*.html` and run `python3 tools/build.py`. The build writes the masthead, the hello
block and the night footer into every page, so they stay identical. The built `index.html` files are committed, so the
folder deploys as plain static files with no build step.

## The central decision: work in the body, play and notes in the margin

The homepage is set like a book. **Commissioned work runs down the main column** as large numbered plates (I–IV), and
**play and notes sit beside it in the margin**: the Freeman pendant film beside Freeman, the Lil KC motion test beside
Kashus Culpepper, a line from the notebook beside Joseph Martin. On a phone the margin notes drop in, indented, after
each plate.

That's how WORK and PLAY live together without the page getting disorganized. The hierarchy is typographic (body vs
margin), not a filter or a tab. After the plates, three doors lead to the full **Work**, **Play** and **Notes** pages.

## What stayed from No. 03 and No. 04, and why

| Kept | Why |
| --- | --- |
| *Tangerine.* in IM Fell English, with the tangerine as the full stop | The strongest piece of identity in the repo. It's warm, odd, and clearly authored. |
| *We build brands.* with the hand-drawn underline | The positioning line from the brief. Plain, and true. |
| The branch: sways, line-boils, fruit you can pick, an empty stem above the full stop | The "stepping into a tangerine grove" feeling, in one drawing. |
| **The branding iron**, unchanged in behaviour | The best interaction made so far. It's the studio's own joke about what it does. |
| The resident (blinks, watches, sleeps 10 pm–6 am Georgia time, has legs) | The character that ties every page together. |
| The crate, the Fancy Grade label, the slice, *Citrus Major*, the night footer with the principle | Each one does a job: where picked fruit goes, a label voice, a reading gauge, the principle shown instead of stated. |
| Palette, Archivo labels, no gradients, no rounded cards | Industrial Study 004 discipline (see `IDENTITY.md`). |

**Cut or changed:** the four-plate index under the hero (replaced by one sentence saying what the studio makes); the
show-card "Kashus Culpepper" type study, which wasn't real work (replaced by Lil KC, which is); the line "Cole Calfee and
a few extraordinarily talented friends" (per the brief: no invented exclusivity). The table of affections moved to About.

## What's new

1. **The light follows the day in Georgia.** *Lux et laetitia* (light and joy, from the grove-and-light study) now
   means something. The branch casts a soft shadow that swings from right to left as the sun crosses, and lengthens
   toward evening. The paper warms slightly at golden hour. At night the shadow almost disappears and the tangerine
   sleeps. The hero says which light it is: "Golden hour in Georgia." Computed once on load; no animation loop.
2. **The stacked wordmark on phones.** At phone width the name sets as *Tange / rine.* at 38vw, about twice the size
   it could be on one line. The full stop is still the tangerine, and the branch still lines its empty stem up over it.
3. **Every page title ends in the resident.** *Work. Play. Notes. About.* Case studies end in an ordinary full stop,
   so the client's work keeps its dignity.
4. **A real archive and a reusable project system** (below).
5. **Cole Calfee is the byline, not a second brand.** "A creative studio led by Cole Calfee" in the hero, a short
   honest bio on About, and "ColeCalfee.com lives here now" in the footer and on About.

## The project system: formats

Different work gets a different shape. All of them share the same plates, captions, fact lists and running heads.

| Format | When | Example |
| --- | --- | --- |
| **Case study** | A finished piece with thinking worth explaining. Cover plate, credits, numbered chapters, figures in several widths (full, wide, pair, film + quote), a spec list, next project. | `work/freeman-globe/` |
| **Character file** | A character or world. Master drawing, detail crops, the rules that must never change, motion, where it goes next. | `work/lil-kc/` |
| **Plate** | One image and a caption. No page of its own. | Joseph Martin, on `work/` |
| **Ledger line** | Work that exists but isn't ready to show. Honest status: *to come*, *being photographed*. | Every collaborator on `work/` |
| **Fragment** | Play. One figure, a number, a title, two sentences. | Everything on `play/` |
| **Note** | Numbered, dated, short. A quote, or a paragraph. | `notes/` |

Collaborators each get their own paper: Freeman ivory and red, Lil KC's drawing paper, the hatter's brown. A plate
looks like the client, and the page around it looks like Tangerine.

To add a case study, copy `src/pages/10-freeman-globe.html`, change the JSON header's `out` path, and rebuild.

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Work: the archive, by collaborator | `work/index.html` |
| Case study: Freeman Globe | `work/freeman-globe/index.html` |
| Character file: Lil KC | `work/lil-kc/index.html` |
| Play | `play/index.html` |
| Notes | `notes/index.html` |
| About | `about/index.html` |

Contact isn't a page. Every page ends with *Say hello.*, which links to Instagram, the one verified contact route.

## Source material, and what is and isn't real

| Material | Source | Status on the site |
| --- | --- | --- |
| Freeman Globe, live canvas | `motion/001-freeman-globe/assets/freeman-globe-mark.original.js` on `claude/freeman-globe-reel-1oquxd`, copied byte for byte to `assets/js/` (SHA-256 `a6e063f9…a56e0`, matches that study's README) | Drawn live from Freeman's original code. Labelled **a study, not yet approved by Freeman**. |
| Freeman pendant film | `exports/freeman-globe-001-pendant.mp4` + poster, same branch | Re-encoded to 540 × 960 (`assets/film/`, 455 KB). The original export is untouched. |
| Case study copy | That study's README: creative direction, the 13.09 s → 16 s decision "at Cole's request", the pendant, "nothing was redrawn", the open point on line weight | Facts only. Nothing added. |
| Lil KC master | `lil-kc/lil-kc-master-2026-11-16.png` on `main` | Web derivatives at 1600 and 900 px WebP (`assets/img/`). **The master is untouched.** |
| Lil KC character text and rules | `lil-kc/README.md` and `lil-kc/CLAUDE.md` | Condensed. "Box, ride a horse, explore space…" is from the brief in `CLAUDE.md`. |
| The Heart, rough motion test v01, and keys 1/3/5/6 | `lil-kc/exports/` and `animation/001-the-heart/storyboard/` on `claude/compassionate-dirac-tkqr4d` | Re-encoded to 960 px (351 KB) and flattened onto paper. Labelled **exploratory, not approved animation** everywhere it appears. |
| Joseph Martin hat drawing | Design No. 02 | Labelled **a study drawing, not product photography**. |
| Branch, crate, label, resident, iron, slice, constellation | Design No. 03 and 04 | Code carried over; the branch, crate and hat SVGs are extracted verbatim into `src/partials/`. |
| *Lux et laetitia* | `study/grove-and-light-2026-11-17` | Used as the hero motto. |
| About copy | Cole's own first-person description in the Design No. 02 brief, moved to third person | Review before publishing. |
| Notes 1–4 | Cole's own words from the 17 November brief (taste vs. point of view; *In cyberspace as it is in heaven*; both belong here; show the work) | Signed *C. C.* **Confirm Cole wants these public as written.** |
| Forthcoming notes | V2's journal titles (Wendell Berry, *What is fear?*, *Things worth keeping*) | Shown as *not yet written*. |

**Not used, deliberately:** the grove-and-light study hotlinks a Big Loud press photo of Kashus Culpepper, a Joseph Martin
shop photo and a third-party interiors photo. Those are other people's licensed images, so they're not on this site.

**Not reached:** ColeCalfee.com. This session's network policy blocks `colecalfee.com`, so nothing was imported from
it. To bring that material in, allow the domain in the environment's network settings, or drop the source files into the
repo (or a private location) and point me at them. The Figma files with the stacked wordmark explorations weren't
available either. The stacked *Tange / rine.* here is a new study, not those files.

## Accessibility and behaviour

- `prefers-reduced-motion`: no sway, line boil, smoke, falling fruit or draw-on. The globes start paused (Play buttons).
  Films don't autoplay and show controls. Picking and the iron still work.
- Films autoplay muted only while on screen, and pause when they leave. Tap or click a film to pause it.
- Fruit is focusable (`role="button"`, Enter/Space). The iron is a real `<button aria-pressed>`; Enter brands whatever
  has focus; Esc hangs it up. The counter and the crate are `aria-live`.
- Every image has alt text, every page has a skip link, and the current page is marked with `aria-current`.
- Without JavaScript every page still reads in full. The wordmark keeps an ordinary full stop, and the globes and the
  constellation are absent.

## Tested

Chromium (Playwright) at 1440 × 900 and iPhone 13 (390 × 664 viewport, touch), all seven pages:

- No console errors, no failed requests, no horizontal overflow at either size.
- The iron: pick up, five brands, the counter, the tag changing its mind ("You're a natural."), links not firing
  while held, Esc, erase the evidence. Also tapped twice on a touch phone, then hung up.
- Picking fruit by mouse and by keyboard. The fruit lands in the crate and the message updates.
- The globe Pause/Play toggle. Four live globes turning on the case study. The resident hopping on Play.
- Light at 7:00, 14:00, 18:36 and 23:12. At 23:12 the tangerine is asleep.
- Reduced motion: globe starts paused, films don't autoplay, picking still works.
- All internal links resolve.

Screens are in [`screens/`](screens/).

## Before publication

1. **Freeman's approval** for the Globe study, the films and the case-study copy.
2. **Kashus Culpepper's approval** to show Lil KC publicly, and the credit line. `lil-kc/README.md` says not to infer
   creator credits or licensing, and this page credits only "for Kashus Culpepper".
3. **Real work for the ledger lines:** Freeman brand, digital, photography and film; Joseph Martin illustration,
   identity, website and the Loyal Stricklin collaboration; paintings, photographs, type and motion.
4. **ColeCalfee.com material.** Allow the domain or supply the files. Then decide what moves into Work, Play or Notes.
5. **A contact email** to sit beside Instagram.
6. **Notes and About copy:** Cole to confirm or rewrite.
7. **Fonts:** IM Fell English, Archivo and Yellowtail are all OFL on Google Fonts. Self-host before launch.
8. The maker's mark, the Fancy Grade label and the stacked wordmark are **studies**, not approved marks (see `IDENTITY.md`).
9. Deploy only as a preview, never to the main domain:

       npx vercel deploy studies/tangerine-studio-v5      # preview URL only; no --prod
