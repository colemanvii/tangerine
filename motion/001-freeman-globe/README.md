# Motion 001 — Freeman Globe

An identity motion study by Tangerine for Freeman General Contracting.
Produced 14 November 2026. A study, not approved client work, and not deployed anywhere.

The Freeman script holds perfectly still. Behind it, the world turns.

Two films of the same mark:

| Film | Export | Poster | What turns |
|---|---|---|---|
| **Globe** | [`exports/freeman-globe-001.mp4`](exports/freeman-globe-001.mp4) | [`…-poster.jpg`](exports/freeman-globe-001-poster.jpg) (frame 0) | Only the globe. The script holds still. One turn in 16 s. |
| **Pendant** | [`exports/freeman-globe-001-pendant.mp4`](exports/freeman-globe-001-pendant.mp4) | [`…-pendant-poster.jpg`](exports/freeman-globe-001-pendant-poster.jpg) (frame 20, turned 30°) | The whole insignia, script and globe together, like a pendant on a chain. One turn in 8 s. |

Both: Instagram Reel, 1080 × 1920 (9:16), 30 fps, 8.000 s, 240 frames, H.264 High, yuv420p, BT.709, with a
silent AAC stereo track (48 kHz) for upload compatibility. Both loop seamlessly: frame 240 is frame 0.

## Creative direction

- **One idea.** The signature does not move. Only the globe turns, on its vertical axis, at a constant rate.
  It should read as a flat printed insignia from another century that happens to be rotating.
- **Slow.** One revolution takes 16 s. Round 1 used 13.09 s, the pace of Freeman's own globe study; round 2
  slowed it at Cole's request.
  Nothing eases, pulses, fades or arrives. There is no start and no end.
- **Two colours.** Freeman ivory `#fff9f1` and Freeman red `#f93822`. The script and the globe are the same red,
  as on the insignia. No type, no texture, no shadow, no grain.
- **A true bitmap.** The mark is drawn on its own 160-pixel grid and every frame is 1-bit: a pixel is red or it is
  paper. Each bitmap pixel is exactly 4 × 4 video pixels, so the grid stays even and the edges stay hard.
- **Placement.** The mark is 640 px wide (round 1 was 960), centred, with its middle at y = 912, slightly above the centre of the
  frame and clear of the Reels interface at the bottom and right.

### The pendant film

- **One object.** The script and the globe turn together, rigidly, about the globe's vertical axis. The globe is
  a sphere, so it is drawn exactly as in the globe film. The script is a flat plate through the axis: each row
  of the bitmap stays on its row and narrows as the plate turns away.
- **Edge-on, it is a line.** The plate is one bitmap pixel thick, so at a quarter turn the whole signature
  becomes a single vertical line as heavy as a globe line. Past that it reopens mirrored: the back of the pendant.
- **Face-on, it is the mark.** Frame 0 is identical to frame 0 of the globe film, pixel for pixel.
- **One turn per loop.** The script only returns to itself after a full 360°, so in an 8-second loop the turn
  takes 8 s. That is faster than the globe film. A slower pendant needs a longer loop (16 s for half the speed).
- **Not a strict bitmap.** The turning script is drawn at video resolution with soft vertical edges so the
  narrowing is smooth. The globe stays on the 4 × 4 pixel grid.

## The artwork, and what was not changed

Nothing was redrawn. The film reads the original code and data and paints what they produce.

| File in `assets/` | What it is | Source |
|---|---|---|
| `freeman-globe-mark.original.js` | The globe insignia: the script bitmap (as runs), its one-pixel halo, and the globe geometry (12° tilt, meridians and parallels every 20°, orthographic). Lines 758–759 and 763–799, verbatim. | `colemanvii/freeman`, `studio/edition-001/index.html` at commit `034ca91` ("Motion Study 004", Edition 001, 13 November 2026) |
| `freeman-script-pixel-mark.original.js` | The production Freeman script, 160 × 61, 2,278 pixels. Kept as the reference the mark is checked against. | `colemanvii/freeman`, `v5/pixel-mark.js` on `release/approved-v5-2026-10-18` |

Both files are byte-for-byte copies. `source/verify.cjs` confirms the script inside the globe mark is the
production bitmap, pixel for pixel. The Freeman repository and both websites were not touched.

Decisions made for this film, all in `source/motion.js`:

- Globe diameter 100 bitmap pixels against the 160-pixel script, the proportion of the Edition 001 plate.
- Scale 4, position, and the two colours listed above.
- Globe film: 180° of rotation per loop. The globe repeats every 20° (the meridian spacing), so any multiple of 20° closes
  the loop exactly; 180° gives 16 s per turn.

One open point carried over from the Freeman study: the globe's line count and weight were set for that study
and have not yet been matched against the printed insignia artwork. If that artwork differs, change the
geometry in the Freeman source first and re-render here.

## Source

| File in `source/` | Role |
|---|---|
| `motion.js` | Both films as pure functions of frame number. Shared settings are in `BASE`, per-film settings in `VARIANTS`. |
| `mark.js` | Loads the original mark code from `assets/` without modifying it. |
| `render.cjs` | Renders all 240 frames and encodes the MP4 and poster. Add `pendant` for the pendant film. |
| `verify.cjs` | Checks an export against the source (see below). Add `pendant` for the pendant film. |
| `index.html` | Live preview of the same frames (`?v=pendant` for the pendant). Space pauses, ← → step a frame, L jumps to the seam. |

Re-render (needs Node and ffmpeg with libx264, nothing else):

    node motion/001-freeman-globe/source/render.cjs            # globe
    node motion/001-freeman-globe/source/verify.cjs
    node motion/001-freeman-globe/source/render.cjs pendant
    node motion/001-freeman-globe/source/verify.cjs pendant

Preview:

    cd motion/001-freeman-globe && python3 -m http.server 8850
    # then open http://127.0.0.1:8850/source/

## Verification (14 November 2026)

`verify.cjs` decodes the finished MP4 and compares it with the source, frame by frame. Both films pass.

Both films:

- Script in the mark matches the production bitmap: yes (2,278 pixels).
- Source loop closes: frame 240 equals frame 0 exactly.
- MP4: 1080 × 1920, 30 fps, 240 frames, 8.000 s, H.264 High, yuv420p, BT.709.
- Every decoded frame matches its source frame (worst mean error 0.60 of 255, from 4:2:0 chroma at edges).
- Colour after decoding: ivory `255, 248, 241` (target `255, 249, 241`), red `250, 56, 34` (target `249, 56, 34`).
  The difference is 8-bit video rounding.

Globe:

- Read back to the 1-bit grid, all 240 decoded frames equal their source frames: 0 cells differ.
- Seam: the picture changes by 0.439 (mean level difference) from the last frame back to the first. Every other
  frame change is between 0.290 and 0.447.

Pendant:

- Frame 0 is identical to frame 0 of the globe film: the original mark, untouched.
- Seam: 0.719 from the last frame back to the first. Every other frame change is between 0.648 and 1.298.

## Rounds

- **Round 1** (commit `6457670`): globe film, mark 960 px wide, 13.09 s per turn.
- **Round 2** (commit `89c2ffa`): globe film, mark 640 px wide, 16 s per turn. Current.
- **Round 3**: pendant film added. The globe film is unchanged in picture; it was re-encoded by the reworked renderer.

## Checksums (SHA-256)

- `assets/freeman-globe-mark.original.js` — `a6e063f9f8af4094d28c221cafc63faa771dbf6f4ccdc152a7ee8407221a56e0`
- `assets/freeman-script-pixel-mark.original.js` — `069f61eb69a8b6ae4d9b81ca199b3229bc52d8459f837f8b7a1ce560c33b1c5a`
- `exports/freeman-globe-001-pendant-poster.jpg` — `2f0e472fe0dcad59c9ff30dc34dc82445f814d17154c78ac39fc5cb4dd16b1d5`
- `exports/freeman-globe-001-pendant.mp4` — `3d2f013b25551650de2ccc849cfbe416082b93dbeb76b0d46c21c0d4fb214b1e`
- `exports/freeman-globe-001-poster.jpg` — `14f22193f64bdf583fab7f883c684bfc4445414e9343b2339988eab90df8ed00`
- `exports/freeman-globe-001.mp4` — `463e181ccca53d1ef2743623799733f9f89c90fc8911e6fcc97215e4eb53d77c`
