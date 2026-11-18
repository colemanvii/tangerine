# Color Field V2 — homepage

November 18, 2026 · baseline `65f8bb2` (Studies in Color No. 001 — Orange Hour)

## What changed

- **Homepage.** `website/index.html` is now Color Field V2: colour fields that emit light, each with its own depth of field, rendered in WebGL with a filmic curve, lens colour separation and grain. Source and full rules: `explorations/living-canvas/color-field-v2.html` on branch `claude/tangerine-landing-redesign-4ig41s`.
- **Orange Hour archived.** The previous homepage is preserved unchanged at `archive/studies-in-color-001-orange-hour-2026-11-18/index.html` (git blob `765fbe76705aff33c282f293cf3e302013f1505e`, identical to `65f8bb2:website/index.html`).
- **New files in `website/`:** `shared.js` and `shared.css` (frame loop, WebGL helpers, the Enter Tangerine room) and `fonts/` (Instrument Serif regular and italic, SIL OFL, with `OFL.txt`).
- **Unchanged:** `work.json`, `media/`, `vercel.json` (the `/screen` redirects) and `screen.js`, which is now unused, as it already was under Orange Hour.

## The rules

1. Colour is light. Every field emits; some burn, most glow, a few only breathe.
2. Three moods in turn: joyful, mysterious, spiritual.
3. Eight compositions: veil, eclipse, stack, aperture, diptych, horizon, nest, drift.
4. Every field has its own depth; focus drifts and comes toward the cursor.
5. Tangerine is always present.
6. On a pale ground an opening must be deep to be seen.
7. One work a day, numbered from No. 001 (18 Nov 2026). The first twelve are hung together; ← → or a swipe walks through them.

**Enter Tangerine** opens the published work from `work.json`, one piece at a time (← → or swipe, Esc / Return / Back to leave, `#work` links to it). Reduced motion shows a still frame. No libraries, no build step.

## Verification (local, served from `website/` as its root; Chromium at 1440×900, 1024×1366 touch, 390×844 mobile)

- The page, both fonts, `work.json` and both media files load; no console errors and no failed requests at any size.
- Today's work (No. 001) renders; the room opens with the artwork decoded, and Esc closes it.
- Earlier on the review branch: arrows, swipe, Back button, Return, `#work` deep link and reduced motion all tested.

**Not verified from this environment:** the Vercel build and the public domain. Frame rate on a physical iPhone or iPad has not been measured.
