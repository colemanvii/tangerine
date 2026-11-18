# Living Canvas — three landing-page explorations

**Status: design exploration on a review branch.** Created 18 November 2026. Not deployed, not approved, and not a replacement for the current site (`website/`, the smartscreen). Nothing in `website/`, `vercel.json` or routing was changed.

Brief: *Painterly on the surface. Intelligent underneath.* A landing page that feels like a living canvas, using only **tangerine**, **We build brands.** and **Enter Tangerine**.

| Study | File | Medium | What changes from visit to visit |
| --- | --- | --- | --- |
| 01 Color Field | `color-field.html` | WebGL, two passes: a painted field at reduced resolution, then canvas tooth and photographic grain at full resolution | One of nine colour studies (stacked, nested, drifting, horizon), never the same as the visitor's last one. Edges, pigment and hue drift over minutes. The paint leans toward the cursor. |
| 02 Living Light | `living-light.html` | WebGL, two passes: light on a plaster wall, then dust in the beam and grain | The light follows the visitor's own clock: pink dawn, pale midday, tangerine late afternoon, vermilion dusk, a blue moonlit wall with a lamp on at night. The wordmark exists only as a shadow cast by lettering on the studio window. A curtain moves, clouds pass, dust stirs where the hand moves. |
| 03 The Grove | `the-grove.html` | Canvas 2D: cut-paper shapes printed as three overprinting inks with ink texture and paper shadow | One of four arrangements (bough, rising, canopy, crossing), often mirrored, regrown on every visit. The sun's ink changes with the hour. Leaves rustle on springs in a slow breeze and when the cursor or a finger passes. |

`index.html` lists the three for review.

## Enter Tangerine

In every study the link opens a room: a sheet laid over the living canvas, which stays visible at the edges. It shows the work already published in `website/work.json` (copied here as `work.json`), one piece at a time, newest first. ← → or swipe to page, Esc / Return / browser Back to leave. `#work` links straight to it. This is the hook for the future archive; nothing new is published by it.

## Review controls

- `?study=1…9` pins a Color Field study (1–6 for Living Light, 1–7 for The Grove).
- `?hour=0…24` sets the clock for Living Light and The Grove.

To preview locally: `python3 -m http.server` from this folder, then open `http://localhost:8000/`.

## Accessibility and performance

- `prefers-reduced-motion`: each study renders one still frame and does not respond to the pointer (Living Light updates its still once a minute to follow the clock). Room transitions become instant.
- Text is real HTML (the canvas is `aria-hidden`); the room keeps focus inside, returns focus to the link, and every control is at least 44 px.
- Rendering stops when the tab is hidden. If a device can't hold 60 fps it settles at 30. Color Field runs at 30 fps by design (its motion is far slower than a frame), and the shader skips fields that can't reach a pixel. The painted pass is capped at about 1,000 px on its long side; grain is added at full resolution so the print stays sharp. Device pixel ratio is capped at 2 (1.5 for The Grove on large screens).
- No libraries and no build step. Without WebGL the Color Field and Living Light pages fall back to their flat ground with the type.

## Sources

- **Wordmark:** the lowercase geometric wordmark selected 17 Nov 2026 (`design/geometric-wordmark-2026-11-17`, `tangerine-geometric-wordmark-original.png`, SHA-256 `13a67519…3db3b12`), traced to vector with potrace for this study. It is a working trace, not the redrawn production master that branch calls for; the original PNG was not modified or copied here.
- **Type:** Instrument Serif, regular and italic, SIL Open Font License (`fonts/OFL.txt`), latin subset from Google Fonts, self-hosted.
- **Work in the room:** byte-identical copies of `website/media/lil-kc-2026-11-16.webp` and `website/media/orange-study-001.svg`, both already published on the production site. Masters are untouched.
- Influences named in the brief (Albers, colour-field painting, LoveFrom, cut-paper and riso printing) are approached as sensibility; no artwork is reproduced.
