# Tangerine Studio — Design No. 04, The Grove

**Status:** Design study, 17 November 2026. Not approved for production, not on the main Tangerine domain (`noindex`).
It evolves Design No. 03 (`studies/tangerine-studio-v3/` on `claude/jolly-dirac-fv6u8g`), which is untouched.

Open [index.html](index.html) in a browser. One self-contained file: HTML, CSS, JavaScript and SVG drawing.
Fonts load from Google Fonts.

## Direction

The same long sheet of bright paper, now with a beginning and an end: it starts under a tangerine branch and finishes
under the night sky. Everything that worked in No. 03 stays: the Fell wordmark, the tangerine full stop that blinks,
watches and sleeps, the branding iron, the four plates, the table of affections, and the time in Georgia.

## What's new

1. **The branch.** An ink-drawn branch reaches in from the right, sways slightly and shares the full stop's line boil.
   One stem hangs **empty** with only its green cap left. The script lines the branch up so the empty stem sits right
   above the full stop: that's where it fell from.
2. **Picking.** Click, tap, or press Enter on a fruit and it falls, bounces, rolls off the screen, and turns up in the
   crate in Plate IV (up to seven, then *"The crate is full."*). The resident reacts. A new fruit grows back after a while.
3. **The crate label.** Plate IV's crate now carries a proper citrus-crate label: *Fancy Grade*, **Tangerine** in a
   vintage painter's script, *Grown & packed in Georgia*. This is a study for Tangerine's own label voice, not a mark.
4. **The principle, after dark.** The footer is the same page at night: *In cyberspace as it is in heaven.* Its
   constellation, *Citrus Major*, is the maker's mark drawn in stars; its lines draw themselves once. The resident
   rises over the horizon like a moon.
5. **The slice.** A tangerine cross-section in the corner fills one segment for every tenth of the page you've read.
   It takes you back to the top.

## Typography

- **IM Fell English** (the Fell Types, Igino Marini): wordmark, headings, text.
- **Archivo** (Omnibus-Type), at 125% width: small industrial labels, after Industrial Study 004.
- **Yellowtail** (Astigmatic): the painter's script, used in exactly three places: the crate label, the studio aside,
  and the constellation's name. It is a label voice, not the studio's wordmark.

All three are OFL on Google Fonts. Consider self-hosting before publication.

## Accessibility and behaviour

- `prefers-reduced-motion`: no sway, line boil, fall, smoke or draw-on. Picking still works; the fruit simply appears in
  the crate.
- Fruits are focusable `role="button"` elements with Enter/Space. The picked count is an `aria-live` region.
- While the iron is held, clicks brand the page instead of picking.
- Without JavaScript, the page is complete; the branch hangs at the right edge and the constellation is absent.
- Tested in Chromium at 1440 × 900 and iPhone 13 (390 × 844, touch), including reduced motion: no horizontal overflow,
  no console errors.

## Before publication

Unchanged from No. 03: Freeman approval for the Globe study, real Kashus Culpepper and Joseph Martin work in Plates
II–III, and font licensing checks. The maker's mark and the crate label are studies, not approved marks
(see `IDENTITY.md`). Deploy only as a preview, never to the main domain:

    npx vercel deploy studies/tangerine-studio-v4      # preview URL only; no --prod
