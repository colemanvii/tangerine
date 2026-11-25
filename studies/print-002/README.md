# Tangerine Print Study 002 — an instrument for printed citrus

**Status: design study, 25 November 2026.** An interactive image-making instrument, explored as a possible future Tangerine product. It is not a released product or an approved mark, and it is not linked from or deployed with the live site (`website/`). Bitmap Study 001 (`studies/bitmap-001/`) is unchanged.

Open `index.html` in a browser. It is one self-contained file with no libraries, fonts or network requests.

## Idea

Early twentieth-century citrus crate labels, rebuilt as computation. Every print is generated from scratch: geometry places the fruit, lighting and ripeness decide how much of each ink every pixel wants, and a screen turns that into dots, **one bit per ink**. The inks overprint like transparent printing ink, and each plate can slip out of register. Because the output is real separations, any print can actually be printed.

## Controls

| Group | What it changes |
| --- | --- |
| Composition | Layout (hanging branch, still life, specimen), number of fruit, size, oblateness, spread, leaves, leaf size, light direction, cut one open, ground shadow |
| Ripeness | Green → breaking → turning → ripe → overripe. Moves the pigment from leaf and yellow inks to tangerine and red |
| Stipple | Screen (stipple, grain, halftone, ordered, engraving), dot size, irregularity, ink density, peel texture |
| Inks | Five presets (Crate 1924, Tangerine core, Grove, Sun-faded, Risograph), a colour for each of the five plates and the paper, and a switch to print or drop each plate |
| Registration | Slip in pixels and *Re-register*, which draws new plate offsets. The key plate is the reference and never moves |
| Paper & format | Pixels across (96–360), format (label 3:2, square, portrait 4:5), ink opacity, paper fibre |
| Label | Crate-label frame with the wide bitmap wordmark (from Study 001), a background (plain, sunburst, solid field with knocked-out type), a caption and the edition number |
| Seed | Places every fruit, leaf, stem, blossom, mould spot and dot. Printed on the label as the edition number |

Views: **Print**, **Separations** (the composite and each plate in its ink) and **Film** (each plate as black film).

## Studies

Each study runs 72 frames at 12 fps. Scrub, play or loop. The screens are cached per seed and size, so the dot pattern stays fixed from frame to frame and the image changes without shimmering. Every frame can be saved as a finished print.

| Study | Frames |
| --- | --- |
| Ripening | Ripeness 0.02 → 1. The fruit swells to full size over the first 70%. |
| Peeling | A 3.2-turn spiral peel from the top of the front fruit shows segment membranes converging at the poles, a white pith edge and a twisting ribbon that hangs and then lies flat. |
| Blossoming | Buds open into five-petal blossoms with stamens. The petals fall and drift, and green fruitlets grow from each blossom's centre. Two extra blossoms on the branch never set fruit. |
| Decomposition | The colour browns, the silhouette wrinkles and shrinks, mould spots spread with a pale rim, leaves brown and thin, and the print finally dissolves into scattered dots. |

## Output

- **Save print · PNG** at 1×, 2×, 4× or 8×.
- **Separations · ZIP**: `print.png`, `proof.png`, `film/` (one-bit PNG per ink, black = ink), `vector/` (SVG per ink, one rectangle run per row, in the ink colour), `recipe.json` and a README. Suitable for risograph or screen printing. Print plates in order 1–5.
- **Proof sheet · PNG**: the print with registration marks, each separation in its ink, colour bars and the full specification.
- **Contact sheet · PNG**: eight evenly spaced frames of the current study.
- **Recipes**: *Copy recipe* produces a `TPS2.…` string that reproduces a print exactly. *Load recipe* reads one back. Settings are also remembered in the browser.

On claude.ai the published page saves files through the viewer's `downloads` permission. Opened as a local file, it uses ordinary browser downloads.

## Construction

- **Plates:** 1 citrus yellow, 2 tangerine (`#E94D01` in every preset except Sun-faded and Risograph), 3 red, 4 leaf, 5 key. Composite colour = paper × Π (1 − opacity × (1 − ink)) over the plates that print.
- **Skin:** a lit oblate sphere (diffuse plus a tight specular term). Yellow fills the lit side, tangerine is the body, red rolls in from the shadow as ripeness rises, and the key ink appears only in the deepest shadow and at the bottom rim. The skin is always fully inked except the highlight. Peel texture adds fine noise, so dots appear only where tones change.
- **Cut fruit:** a foreshortened face (rind, pith ring, ten rounded segments, core) over the lower half of the sphere. This is the citrus wheel from Study 001 in perspective.
- **Screens:** *Stipple* is approximate blue noise (white noise minus its blur), clustered by blurring when the dot size is above 1.6. *Halftone* and *engraving* use classic screen angles per plate (0°, 15°, 75°, 30°, 45°). Every screen is histogram-equalised, so a coverage of *c* prints about *c* of the pixels.
- **Type:** the wide and restrained bitmap typefaces and the 16 px wheel are copied from Bitmap Study 001.

## Checks

Rendered in headless Chromium at 1440 px and 390 px, in light and dark: no console errors and no horizontal scroll. A frame takes 15–30 ms at 312 × 208. Every export was exercised: the ZIP passes `zipfile.testzip()` and contains 14 files.

## Not decided

- Whether the extended print palette belongs to the Tangerine identity or only to this instrument.
- Product questions (name, distribution, licensing of outputs, edition numbering) are open. Nothing here commits to releasing it.
