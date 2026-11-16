# 001 — The Heart

**Status: rough motion test, exploratory. Not an approved character model and not final animation.**

First animation experiment for Lil KC (see [../../ANIMATION.md](../../ANIMATION.md)): a 3 second loop, 36 drawings at 12 per second. Lil KC is already airborne, so the picture is treated as a living illustration.

## Preview

Open `index.html` in a browser (it reads the master from `../../` for comparison only). The light table plays the loop or steps through it: side by side with the master, laid over it, or onion-skinned; zoom to face, heart, bandanna, dagger; paper or transparent ground.

## Acting beats

| # | Key file | Drawing | Beat |
|---|----------|---------|------|
| 1 | `storyboard/key-01-home.png` | 1 | Home. Tracing of the master pose, kept as the reference |
| 2 | `storyboard/key-02-lift.png` | 7 | Floats up, brows rise |
| 3 | `storyboard/key-03-blink.png` | 10 | Blink; the gaze changes behind the lid |
| 4 | `storyboard/key-04-glance.png` | 14 | Looks down at the heart, head tips toward it |
| 5 | `storyboard/key-05-squeeze.png` | 21 | Fist closes round the heart, eyes shut, pulled in close |
| 6 | `storyboard/key-06-brave.png` | 27 | Eyes open, chin up, dagger reaches; then settles home |

Frames: `frames/frame-0001.png` … `frame-0036.png` (transparent, 1536 × 1024) with `timing.json`.
Exports: `../../exports/lil-kc-the-heart-rough-v01.webp` (transparent) and `.mp4` (on procedural paper, two loops).

## Provenance and technique

- Source of truth: `../../lil-kc-master-2026-11-16.png` (SHA-256 `9b9687e5…6690`). It is read, measured and displayed. It is never written, cropped or copied.
- `project/trace_master.py` measures the master into `project/trace.json`: ink centre-lines with brush radius, solid ink masses, and flat colour shapes. No master pixels are stored.
- `project/ink.py` re-inks that geometry with procedural grain and a dry edge.
- `project/motion.py` holds the hand-keyed acting tracks; `project/kc.py` draws each frame. Newly drawn for this test: the squeezed heart and fist (authored point by point), closed and half-closed lids, and eyes looking at the heart (built on the traced eye outlines). Still adjusted tracing: body, head, limbs, afro and bandanna, which follow the motion late; the tails carry a travelling wave.
- Each drawing is re-inked with fresh edge and grain so the line boils slightly.
- This is a **code-drawn rough made by Claude, not freehand animation**. Any frame can be replaced by a hand-drawn PNG of the same name and size.
- Tests from other tools (for example image-to-video) belong beside this one as their own numbered take, with source, prompt and settings recorded, so they can be compared on the same light table.

## Rebuild

```bash
pip install pillow numpy scipy scikit-image opencv-python-headless
python3 project/trace_master.py   # only to regenerate trace.json
python3 project/build.py          # frames/, storyboard/, timing.json, keys.js, ../../exports/ (needs ffmpeg)
```

## Decision log

- 2026-11-16 — Six keys proposed.
- 2026-11-16 — Creator review: key 01 kept as reference, key 03 promising, the rest read as one tracing with small deformations. Direction: living illustration with blink, glance to the heart, protective squeeze, afro and bandanna secondary motion, subtle bounce; allow new drawings; keep ink and paper imperfect; do not over-engineer puppetry.
- 2026-11-16 — Rough motion test v01 built to that direction. Awaiting review.
