# Motion 001 — Freeman Globe

An identity motion study by Tangerine for Freeman General Contracting.
Produced 14 November 2026. A study, not approved client work, and not deployed anywhere.

The Freeman script holds perfectly still. Behind it, the world turns.

| | |
|---|---|
| Final export | [`exports/freeman-globe-001.mp4`](exports/freeman-globe-001.mp4) |
| Poster frame | [`exports/freeman-globe-001-poster.jpg`](exports/freeman-globe-001-poster.jpg) (frame 0) |
| Format | Instagram Reel, 1080 × 1920 (9:16), 30 fps, 8.000 s, 240 frames |
| Video | H.264 High, yuv420p, BT.709, about 0.8 Mbit/s (the image is flat colour, so it needs very little) |
| Audio | Silent AAC stereo track, 48 kHz, for upload compatibility |
| Loop | Seamless: frame 240 is frame 0 |

## Creative direction

- **One idea.** The signature does not move. Only the globe turns, on its vertical axis, at a constant rate.
  It should read as a flat printed insignia from another century that happens to be rotating.
- **Slow.** One revolution takes 13.09 s, the "about thirteen seconds" set in Freeman's own globe study.
  Nothing eases, pulses, fades or arrives. There is no start and no end.
- **Two colours.** Freeman ivory `#fff9f1` and Freeman red `#f93822`. The script and the globe are the same red,
  as on the insignia. No type, no texture, no shadow, no grain.
- **A true bitmap.** The mark is drawn on its own 160-pixel grid and every frame is 1-bit: a pixel is red or it is
  paper. Each bitmap pixel is exactly 6 × 6 video pixels, so the grid stays even and the edges stay hard.
- **Placement.** The mark is 960 px wide, centred, with its middle at y = 912, slightly above the centre of the
  frame and clear of the Reels interface at the bottom and right.

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
- Scale 6, position, and the two colours listed above.
- 220° of rotation per loop. The globe repeats every 20° (the meridian spacing), so any multiple of 20° closes
  the loop exactly; 220° gives 13.09 s per turn.

One open point carried over from the Freeman study: the globe's line count and weight were set for that study
and have not yet been matched against the printed insignia artwork. If that artwork differs, change the
geometry in the Freeman source first and re-render here.

## Source

| File in `source/` | Role |
|---|---|
| `motion.js` | The film as a pure function of frame number. All settings live in `SPEC`. |
| `mark.js` | Loads the original mark code from `assets/` without modifying it. |
| `render.cjs` | Renders all 240 frames and encodes the MP4 and poster. |
| `verify.cjs` | Checks the export against the source (see below). |
| `index.html` | Live preview of the same frames. Space pauses, ← → step a frame, L jumps to the seam. |

Re-render (needs Node and ffmpeg with libx264, nothing else):

    node motion/001-freeman-globe/source/render.cjs
    node motion/001-freeman-globe/source/verify.cjs

Preview:

    cd motion/001-freeman-globe && python3 -m http.server 8850
    # then open http://127.0.0.1:8850/source/

## Verification (14 November 2026)

`verify.cjs` decodes the finished MP4 and compares it with the source, frame by frame.

- Script in the mark matches the production bitmap: yes (2,278 pixels).
- Source loop closes: frame 240 equals frame 0 exactly.
- MP4: 1080 × 1920, 30 fps, 240 frames, 8.000 s, H.264 High, yuv420p, BT.709.
- Every decoded frame matches its source frame (worst mean error 0.77 of 255, from 4:2:0 chroma at edges).
- Colour after decoding: ivory `255, 248, 241` (target `255, 249, 241`), red `251, 56, 33` (target `249, 56, 34`).
  The difference is 8-bit video rounding.
- Seam: the step from the last frame back to the first measures 1.197, inside the range of every other
  neighbouring pair (0.850 to 1.273). The seam is indistinguishable from any other frame change.

## Checksums (SHA-256)

- `assets/freeman-globe-mark.original.js` — `a6e063f9f8af4094d28c221cafc63faa771dbf6f4ccdc152a7ee8407221a56e0`
- `assets/freeman-script-pixel-mark.original.js` — `069f61eb69a8b6ae4d9b81ca199b3229bc52d8459f837f8b7a1ce560c33b1c5a`
- `exports/freeman-globe-001-poster.jpg` — `1d28baea18506af7bccf67c4dd97604f07d7c62c23fee080ab84577c72620eb4`
- `exports/freeman-globe-001.mp4` — `6d320355ec3f8fd3b17e3f714af7adbfd49b83cbae514683269e24dd79727beb`
