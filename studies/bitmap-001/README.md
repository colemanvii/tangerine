# Tangerine Bitmap Study 001

**Status: design study, 25 November 2026.** Not an approved mark. Not linked from or deployed with the live site (`website/`).

Open `index.html` in a browser. It is one self-contained file with no fonts, libraries or network requests. Append `?still` to show every motion piece at its final frame.

## The question

What does Tangerine look like drawn on the pixel grid? Is there a bitmap version of the identity worth keeping: a wordmark, a symbol, motion and real applications?

## Plates

| Plate | Contents |
| --- | --- |
| 1 · Construction | Grid rules, palette, enlarged G · A · N with stem, bar and chamfer marks. |
| 2 · Wordmark | **Wide cut** (105 × 10 px), **restrained cut** (65 × 7 px), fruit lockup, and the **approved script rasterised** to 1 bit at 48, 96 and 160 px wide. Actual-size ladder at 1×–4×. |
| 3 · Typeface | Both cuts' full glyph sets (A–Z, 0–9, punctuation) and a type tester that copies SVG. |
| 4 · Symbol | Fruit, citrus wheel and signal T at 16, 32 and 64 px, on white and graphite, with the 16 px version enlarged on its grid. |
| 5 · Motion | Plot (hero), Resolve, Reassemble, Dither, Settle, Load, Signal. |
| 6 · Situations | Browser tab and site header, project cover, proposal title page, equipment label, business card, dot-matrix display, circular avatars. All names and projects are placeholders. |
| 7 · Findings | What works, what doesn't yet, next tests. |

## Construction

- **Unit:** one square pixel, on or off. No anti-aliasing. Whole-number scaling only (1×, 2×, 3×).
- **Wide cut:** cap height 10 px, stems and bars 2 px, counters 2 px slots, 1 px chamfer on round letters, diagonals step 1 px per row, 2 px tracking, 5 px word space, +1 px each side of I. Follows Industrial Study 004's broad, low proportion.
- **Restrained cut:** 7 px caps, 1 px strokes, 1 px tracking (3 px in the wordmark).
- **Both typefaces were drawn by hand in this file** as pixel maps (`WIDE_DEF`, `MICRO_DEF`). No third-party font is used, so there is no font licence to check.
- **Palette:** cyber white `#F5F6F3`, graphite `#17181A`, tangerine `#E94D01`. The orange is sampled from the approved script wordmark on the live homepage.
- **Script raster:** the approved script PNG from `website/index.html`, cropped and box-averaged to 24, 48, 96, 160 and 320 columns, then thresholded (0.40–0.50; lower at small sizes to keep strokes). Stored as packed 1-bit data (about 9 KB). This is an automatic conversion, not hand-cleaned lettering.
- **Symbols:** the 16 px fruit and 16 px wheel are drawn by hand. The 32 and 64 px versions are generated (an oblate disk, a lens leaf, radial membranes), with single-pixel nubs removed. The signal T is built on a 16 grid and scaled by whole numbers.

## Motion

Every piece moves in whole pixels and whole frames (12–30 fps), plays once when it scrolls into view, then rests. With `prefers-reduced-motion`, or with `?still`, only the final frame is shown.

| Piece | What it shows | Length |
| --- | --- | --- |
| Plot | A 2 px orange head sweeps the grid and leaves the wide cut behind it, then the signal stripe draws out. | 2.2 s |
| Resolve | The script at 24 → 48 → 96 → 160 → 320 columns, with hard cuts. | 2.4 s |
| Reassemble | Every pixel of the wide cut travels to rebuild the script, sorted left to right. Replay reverses it. | 2.4 s |
| Dither | The 64 px fruit arrives through a 4 × 4 Bayer threshold. | 1.25 s |
| Settle | Split-flap characters settle left to right, then close up from monospaced slots to proportional spacing. | 2.0 s |
| Load | The citrus wheel as a progress indicator, one segment per 10 %. | 2.6 s |
| Signal | The stripe crosses the tile, then the T drops in three steps. | 0.95 s |

## Checks

Rendered in headless Chromium at 1280 px and 390 px, light and dark: no console errors and no horizontal page scroll. Wide content scrolls inside its own container on phones.

## Not decided

Nothing here replaces the approved script on the homepage, and nothing here is a final mark. The findings plate lists the next tests: hand-clean the script at 96 and 64 px, print the label and proposal at 1:1, and compare against vector Industrial 004 and the fruit symbol before choosing.
