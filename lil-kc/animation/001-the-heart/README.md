# 001 — The Heart

**Status: key-pose studies, awaiting creator approval. Nothing here is canon. No in-betweens or exports exist yet.**

First animation experiment for Lil KC (see [../../ANIMATION.md](../../ANIMATION.md)): a 2–3 second loop at 12 drawings per second.

## Preview

Open `index.html` in a browser (it reads the master from `../../` for comparison only). It has a light table (side by side, laid over the master, onion skin; zoom to face, heart, bandanna, dagger; paper or transparent ground), the six keys, and the model sheet.

## Proposed keys

| # | File | Beat | What changes | Hold (fr) |
|---|------|------|--------------|-----------|
| 1 | `storyboard/key-01-home.png` | Start / loop point | Tracing of the master pose | 4 |
| 2 | `storyboard/key-02-anticipation.png` | Anticipation | Weight sinks back, eyes flick down to the heart, afro and tails ride high | 3 |
| 3 | `storyboard/key-03-blink.png` | Recognition (blink) | One blink on the way back up | 2 |
| 4 | `storyboard/key-04-recognition.png` | Recognition (sees it) | Eyes wide on the danger, brows lift, mouth opens, head leans in | 4 |
| 5 | `storyboard/key-05-protection.png` | Protection | Heart pulled to the chest, dagger arm steady, bandanna whips | 5 |
| 6 | `storyboard/key-06-resolve.png` | Resolve | Small bounce, chin up, dagger reaches, settles to Home | 4 |

Holds are a first timing guess, not a `timing.json`.

## Provenance and technique

- Source of truth: `../../lil-kc-master-2026-11-16.png` (SHA-256 `9b9687e5…6690`). It is read, measured and displayed. It is never written, cropped or copied.
- `project/trace_master.py` measures the master into `project/trace.json`: ink centre-lines with brush radius, solid ink masses, and flat colour shapes. No master pixels are stored.
- `project/ink.py` re-inks that geometry with procedural grain and a dry edge.
- `project/keys.py` defines each key; `project/kc.py` applies it: eyes redrawn from the traced eye outline (pupil position, blink lid), brows and mouth repositioned, the heart-and-hand cluster on its own layer, and small hand-set soft warps for weight shift, head tilt, afro lag, bandanna tails, dagger arm and kicking leg.
- These are **traced-and-adjusted studies made by Claude, not freehand drawings**. A hand-drawn PNG with the same name and size can replace any key.

## Rebuild

```bash
pip install pillow numpy scipy scikit-image opencv-python-headless
python3 project/trace_master.py   # only to regenerate trace.json
python3 project/build.py          # writes storyboard/*.png and keys.js
```

## Decision log

- 2026-11-16 — Six keys proposed. Awaiting visual approval before in-betweens, timing file, previewer playback and exports.
