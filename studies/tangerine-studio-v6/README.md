# Tangerine — Design No. 06

**Status:** design study and working preview, 17 November 2026. Not approved for production. Every page is `noindex`.
Nothing on `main`, the deployed site, or earlier studies was changed. **Design No. 05 is preserved, untouched, on its own
branch** (`claude/tangerine-studio-evolution-5htv5h`, `studies/tangerine-studio-v5/`).

## Open it

```sh
cd studies/tangerine-studio-v6
python3 -m http.server 8766        # then open http://localhost:8766/
```

To change a page, edit `src/pages/*.html` and run `python3 tools/build.py`. The build writes the header, menu and
footer into every page. The built `index.html` files are committed, so the folder deploys as plain static files.

## The correction

No. 05 read as homespun, Southern and nostalgic: IM Fell, a handwritten tagline, an illustrated branch, a crate, a
night sky. No. 06 asks one question of every element: *would this hold up next to an automotive campaign, a fashion
editorial, or a recording artist's film?* What stays is the name, the line, the orange, and the sense of humour.
Everything else was rebuilt.

## The idea: one orange dot

Tangerine's whole identity system is **the full stop**: a flat orange circle. No fruit, no leaves, no face.
Personality comes from how it moves, not how it's drawn.

| Where | What the dot does |
| --- | --- |
| Home, after the name | **A toy.** Drag and throw it. It bounces, squashes, rolls, waits, then hops back into its socket. While it's gone, the socket shows an empty ring. The line under it keeps score: *Please don't throw the full stop. → That was the full stop. → It always comes back. → … → You're good at this. Should we talk?* (The branding iron's joke, made contemporary.) |
| Home, on scroll | **A transition.** The full stop grows until it is the whole screen, and the orange chapter begins. |
| The index | **A lens.** Hover a project and an orange circle follows the pointer, carrying the work inside it: the live Freeman globe, the pendant film, Lil KC, the hat. Unfinished entries show their honest status instead (*Being photographed*). |
| Every page | The period at the end of *Work.* and *Studio.*, the menu button, the scrubber on the light table, the arrow on every link, *Say hello.* in the footer. Case studies end in an ordinary ink full stop, so the client's work keeps its dignity. |

## Typography

| Role | Typeface | Why |
| --- | --- | --- |
| Display and text | **Mona Sans** (variable, 75–125% width, 200–900 weight) | Industrial Study 004's wide, weighty grotesk, made contemporary. One family across every job. The width axis is a design tool: 125% for the name, ~110% for headlines, 100% for reading. |
| The editorial voice | **Instrument Serif Italic** | Used sparingly, one or two words at a time (*brands*, *everything*, pull quotes). The sophistication and the wit. |
| Metadata | **Geist Mono** | Captions, credits, status, the Georgia clock. The consumer-electronics manual, from Study 004. |

All three are SIL Open Font License, self-hosted from `assets/fonts/` (latin subset, 145 KB total). **Verify licensing
again before launch.** Mona Sans was released by GitHub; it carries no GitHub branding.

## Motion

Every movement shows something or does a job. Nothing loops for engagement.

1. **The full stop** (physics, scroll expansion), above.
2. **Lil KC on orange.** The 36 drawings of *The Heart* motion test are transparent, so on the home page he's cut out and
   kicking across a field of Tangerine orange at 12 fps, with a live drawing counter.
3. **The Freeman Globe, drawn live** from Freeman's original code, at full-bleed scale, pixel-perfect.
4. **Bitmap zoom** (case study): scroll and the live globe enlarges to 1:16 until the pixels are the picture. Motion
   that reveals construction, per `IDENTITY.md`.
5. **The width axis, alive.** *What gets made* lists the disciplines in huge type; the word at the centre of the screen
   widens from 75% to 125% and gets the dot.
6. **The light table** (Lil KC): scrub all 36 drawings with the dot, or jump to the six keys.
7. **The menu** opens as an orange circle from the menu dot, with giant links.
8. **The header** takes the colour of whatever it sits over, and tucks away while you read.

`prefers-reduced-motion`: the full stop stays put (it says so), no scroll expansion, no reveals, globes start paused,
films show controls and don't autoplay, the light table is paused but still scrubbable. Every page reads in full
without JavaScript.

## Phone

Not a shrunk desktop. On a phone the home page is a **poster**: *Tangerine* runs up the left edge as a spine at full
screen height, with the full stop on top, and *We build brands.* stacked beside it. The 9:16 Freeman films become
full-width, phone-native frames. The index gets circular thumbnails (the dot again). The menu is a full-screen orange
field. The light table scrubs by touch.

## What was kept, cut, or reinterpreted

| From No. 05 | In No. 06 |
| --- | --- |
| *Tangerine.* / *We build brands.* | Kept, as the opening line. |
| Orange | Kept and promoted: a full chapter, the footer, the menu, the dot. `#FF5A1F`. |
| Humour, curiosity, experimentation | Kept: the full stop's commentary, *Retired with honours*, *Particular affections*, the Georgia clock (*The studio is asleep. Leave a message.*). |
| The resident tangerine with eyes | **Reinterpreted** as the plain dot. |
| The branding iron | **Reinterpreted**: its joke (*please do not touch*) is now the full stop. |
| IM Fell English, Yellowtail, Archivo | **Replaced** by Mona Sans, Instrument Serif Italic and Geist Mono. |
| Branch, crate, Fancy Grade label, slice, Citrus Major, night sky, Georgia-light shading | **Cut.** Listed on the Studio page under *Retired with honours*. Still on the No. 05 branch. |
| *Lux et laetitia* | Cut. |
| Work in the body, play in the margin | Replaced by full-bleed project stages, each in the client's own colours (Freeman ivory and red, Lil KC's paper), with Tangerine's paper, graphite and orange around them. |
| Pages: Home, Work, Play, Notes, About | Home, Work, two case studies, Studio (About, Notes and the lab together). |

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Work: covers and the full index | `work/index.html` |
| Case study: Freeman Globe | `work/freeman-globe/index.html` |
| Character file: Lil KC | `work/lil-kc/index.html` |
| Studio: about, notes, the lab | `studio/index.html` |

## Source material: what is and isn't real

No projects or client relationships were invented. Everything shown already existed in the repository.

| Material | Source | Notes |
| --- | --- | --- |
| Freeman Globe and pendant films and posters | `motion/001-freeman-globe/exports/` on `claude/freeman-globe-reel-1oquxd` | Copied byte for byte (1080 × 1920). Labelled **a study, not yet approved by Freeman**. |
| Live globe | `assets/js/freeman-globe-mark.original.js`, byte for byte (SHA-256 `a6e063f9…a56e0`, matches the study's README) | Drawn in the browser. |
| Freeman case-study copy | That study's README, via No. 05 | Facts only. |
| Lil KC master | `lil-kc/lil-kc-master-2026-11-16.png` on `main` | Web derivatives at 2000 and 1200 px WebP. **The master is untouched** and is shown uncropped on its own paper. Detail crops are CSS views, not new files. |
| *The Heart*, 36 drawings | `lil-kc/animation/001-the-heart/frames/` on `claude/compassionate-dirac-tkqr4d` | Resized to 960 × 640 transparent WebP. Labelled **exploratory, not approved animation**. Key names and numbers are from that study's README. |
| Lil KC character text and rules | `lil-kc/README.md`, `lil-kc/CLAUDE.md`, via No. 05 | Condensed. |
| Joseph Martin hat | No. 02/05 SVG, line boil removed | Labelled **a study drawing, not product photography**. |
| "To come" entries, About copy, notes, affections | No. 05 (from Cole's briefs) | Unchanged in substance. |
| Instagram `@ex.tangerina` | No. 05 | The one verified contact route. |

New copy written for No. 06, for Cole to confirm or rewrite: the full stop's lines, the intro on orange (*Brands, and
everything brands are made of.*; *The work is the point, so the rest of this page is mostly the work.*), *Shown, and
still in the drawer.*, the *What gets made* note, the clock lines, and *Retired with honours*.

## Tested

Chromium (Playwright) at 1440 × 900 and iPhone 13 (390 × 664, touch), all five pages:

- No console errors, no failed requests, no horizontal overflow at either size. All 10 internal links resolve.
- The full stop: drag and throw by mouse; tap to hop on a phone; Enter to throw by keyboard. It lands, rests, returns
  home, and the line reads *Sentence restored.* Scroll expansion to full orange; the header switches tone.
- The lens on the index: Lil KC, the globe, and a status-only entry.
- The width axis on *What gets made*. The bitmap zoom. The light table (keys, scrubber, readout in sync).
- The phone menu opens and closes. Reduced motion: hero not sticky, the full stop stays, globes paused, films with controls.
- **Not verified here:** film playback. Playwright's Chromium has no H.264, so the films showed their posters. They are
  the same MP4 exports No. 05 used; check in Safari and Chrome.

Screens are in [`screens/`](screens/).

## Before publication

1. **Freeman's approval** for the Globe study, the films and the case-study copy.
2. **Kashus Culpepper's approval** to show Lil KC publicly, the cut-out use on orange, and the credit line.
3. **Real work** for the *still in the drawer* entries, and the ColeCalfee.com material (blocked by this
   environment's network policy, as in No. 05).
4. A **contact email** beside Instagram.
5. **Copy:** Cole to confirm the notes, About, and the new lines listed above.
6. **Type licensing** check (all OFL), and a WebM/HEVC fallback decision for the films.
7. The dot is a **study**, not an approved mark (see `IDENTITY.md`).
8. Deploy only as a preview, never to the main domain.
