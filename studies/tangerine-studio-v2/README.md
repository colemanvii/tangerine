# Tangerine Studio — Design No. 02

**Status:** Design study, November 14, 2026. Not approved for production. V1 is untouched in [`../tangerine-studio-v1`](../tangerine-studio-v1).

Open [index.html](index.html) in a browser. One self-contained file: HTML, CSS, JavaScript, and original SVG and bitmap drawing. Web fonts load from Google Fonts.

## Direction: serif and bitmap

Disciplined mischief. The page is set like a printed art-and-culture publication, and every piece of wit is drawn in pixels. Classical type does the talking; the bitmap does the grinning.

## Audit of Design No. 01

**Preserve**

- The enormous orange *tangerine* wordmark, warm paper, deep ink, Instrument Serif.
- "Making things with feeling." and the founding principle.
- The original two-tangerine illustration and the bitmap tangerine (both carried over unchanged, pixel for pixel).
- The section order: opening, work, journal, about, contact.
- Cole's own titles and copy for Freeman, Joseph Martin, and the journal.

**Improve — the five highest-leverage upgrades**

1. **The wordmark and the bitmap were strangers.** The fruit lived in a separate file. Now the fruit *is* the full stop of the wordmark, and the wordmark runs the full measure of the page.
2. **Every section used the same band-and-headline rhythm.** Now each has its own composition: cover with contents line, figure plate, specimen band, feature spread, ledger, commonplace book, film roll, creed.
3. **Work read as portfolio tiles.** Freeman is now a feature spread with a facts column; Joseph Martin a facing plate; and a ledger lists everything honestly, including lines held open for work that does not exist yet.
4. **The journal implied essays that are not written.** A margin note now sets the rule: a title ending in a tangerine is not yet written. Nothing is passed off as published.
5. **Motion was a generic fade-up on scroll.** Removed. Three behaviours remain, each with a reason (below).

## Moments of delight

- **The blink.** One tangerine on screen blinks, briefly, every several seconds — never two at once, never off screen. Hover the wordmark's full stop and it blinks back.
- **Fig. 1 — one tangerine, two resolutions.** A square lens moves over the painted illustration and shows the same drawing as a coarse bitmap, generated live from the SVG and snapped to the pixel grid. The principle, demonstrated rather than stated. Mouse, touch drag, and arrow keys.
- **Drawings draw themselves, once.** The Freeman elevation and the hat are line drawings, so they arrive the way they were made.
- **The time in Georgia, in words**, beside "Let's talk."

All motion is disabled under `prefers-reduced-motion`. Without JavaScript the page is complete: the wordmark keeps an ordinary full stop.

## Honesty notes

- No project facts were added. Freeman and Joseph Martin carry only what V1 and the brief state. Both plates are labelled as conceptual illustration, not client photography.
- The first-person About text is Cole's own description from the Design No. 02 brief. Review before publication.
- Journal entries are V1's titles, marked unwritten. The film roll holds empty frames rather than stock images.
- Ledger lines 003 and 004 are deliberately open placeholders.

## Before publication

- Real photography, film stills, and client approval for names, taglines ("Built for generations"), and imagery.
- Font licensing check (Instrument Serif, DM Sans, DM Mono, Silkscreen are all OFL on Google Fonts; confirm and consider self-hosting).
- Journal entry pages and a real contact route beyond Instagram.
- The wordmark remains a study, per `IDENTITY.md`; this does not approve a final mark.

Tested at 375, 390, 768, and 1440 px in Chromium: no horizontal overflow, no console errors.
