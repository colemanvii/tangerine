# Living Canvas — Tangerine landing-page studies

**Status: design exploration on a review branch.** Not deployed, not approved, and not a replacement for the current site (`website/`, the smartscreen). Nothing in `website/`, `vercel.json` or routing was changed.

Tangerine as an exploration of colour, light, time and perception: a work of art that happens to be a website. Two studies remain in development. Each is a small set of rules that produces an endless series.

## 01 Living Light — `living-light.html`

WebGL. One pass lights a limewashed plaster wall; a second adds dust in the beam and photographic grain.

**The rules**

1. One wall, one window, one light.
2. The light is the sun where you are, now: your clock, today's date, your hemisphere.
3. The lower the sun, the longer its path through the air, the warmer its colour.
4. Low light climbs the wall and leans; high light falls and straightens. It crosses the wall at the speed of the day.
5. The sky fills the shadows: blue at noon, rose at sunset, ink at night.
6. Each day the wall is painted one pigment. The same light falls differently on each.
7. Grazing light shows the plaster; high light flattens it.
8. At night the moon takes over, as bright as tonight's real moon. When there is no moon, the streetlight.
9. Our name is lettered on the glass. It appears only where the light does.

Everything else that moves is what moves in a room: dust in the beam, and on some days a passing cloud.

The sun is computed from the visitor's clock and date (declination, equation of time, hour angle). The visitor is never asked for their location. Latitude comes only from the time zone's hemisphere (40°N, 34°S, or near the equator), and longitude from its standard UTC offset. The moon's phase and position are approximate. Between sunset and night there is a stretch with no direct light at all: the blue hour, only the wall and the sky.

Each local day is an edition: **No. 001 is 18 November 2026.** The top-left label reads as a wall label: number, the day's pigment, the time. The ten pigments are lime white, Naples yellow, rose madder, terre verte, ultramarine ash, yellow ochre, Venetian red, bone, tangerine and lamp black. No two days in a row share a pigment.

**Play:** drag across the wall (or press ← →) to move through the day; let go and the light eases back to now.

Review: `?hour=17.5`, `?date=2026-06-21`, `?pigment=1…10`, `?no=` (edition).

## 02 Color Field — `color-field.html`

WebGL. Painted fields at reduced resolution, then canvas tooth and grain at full resolution.

**The rules**

1. A ground and three fields. Nothing else.
2. Tangerine is always present, and always large.
3. Four ways to stand: stacked, nested, drifting, horizon. Every four days, each once.
4. Most days, one field is a counterweight: a deep note (green, plum, ultramarine, ink, graphite) or a cool one (sky, sage, mist).
5. Neighbours never come from the same family.
6. One day in nine the ground is dark.
7. The paint keeps moving: edges wander, hues drift, it leans toward you.

A painting a day, deterministic from its number, so everyone sees the same one on the same day. The label names it: *No. 001 · Tangerine, scarlet and ultramarine on cream*. ← → or a horizontal swipe walks back through earlier days in the collection. Review any number with `?no=`.

## Shared

- **Enter Tangerine** opens a sheet over the living canvas showing the work already published in `website/work.json` (copied here as `work.json`): ← → or swipe, Esc / Return / Back to leave, `#work` links straight to it.
- **Reduced motion:** one still frame, no pointer response, instant transitions. Living Light updates its still once a minute; dragging still moves the time on request.
- **Performance:** rendering stops when the tab is hidden; frame rate settles at 30 fps on devices that can't hold 60 (Color Field runs at 30 by design). The light and paint passes are capped near 1,000–1,150 px; grain is full resolution. Device pixel ratio is capped at 2. No libraries, no build step.
- `index.html` lists the studies for review. Local preview: `python3 -m http.server` here, then `http://localhost:8000/`.

## Archive

- `archive/the-grove-2026-11-18/` — The Grove, stopped 18 Nov 2026 as too decorative, literal and illustrative. Frozen, self-contained snapshot.

## Sources

- **Wordmark:** the lowercase geometric wordmark selected 17 Nov 2026 (`design/geometric-wordmark-2026-11-17`, SHA-256 `13a67519…3db3b12`), traced to vector with potrace for these studies. A working trace, not the redrawn production master; the original PNG is untouched.
- **Type:** Instrument Serif, regular and italic, SIL Open Font License (`fonts/OFL.txt`), self-hosted latin subset.
- **Work in the room:** byte-identical copies of `website/media/lil-kc-2026-11-16.webp` and `website/media/orange-study-001.svg`, already public on the production site.
- Influences (Albers, colour-field painting, Turrell, LoveFrom, Jack Butcher's rule-based series) are sensibility; no artwork is reproduced.
