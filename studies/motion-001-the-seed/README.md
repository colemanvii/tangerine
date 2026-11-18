# Tangerine Motion Study No. 001 — "The Seed"

**Status: design study, 18 November 2026.** Not an approved mark. Not linked from or deployed with the live site (`website/`).

Open `index.html` in a browser. Append `?t=<seconds>` to freeze a single frame, for example `?t=10.8` for the full fruit.

## The idea

A tiny monoline figure that breathes. One closed curve becomes three forms and returns to the first:

**seed ○ → infinity ∞ → seed ○ → fruit ✺ → seed ○**

The text underneath reads *Something is growing.*

## Construction

The figure is one SVG `<path>` with 960 points, recomputed every frame from one parameter θ ∈ [0, 2π). It uses no video, canvas, or animation library.

| Form | Equation (R = seed radius) |
| --- | --- |
| Seed | `c(θ) = R (cos θ, sin θ)` |
| Infinity | `l(θ) = R (1.42 cos θ, ±1.18 sin θ cos θ)`, the Gerono lemniscate |
| Fruit | `f(θ) = R ρ(θ) (cos θ, sin θ)`, with `ρ = core + (1 − core) · tanh(7·|sin 5(θ − α)|) / tanh 7` |

- **No breaks.** Every form uses the same θ, so the line blends point by point. It never jumps, re-orders, or opens.
- **Infinity as a wave.** In the seed-to-infinity blend, the vertical term changes sign first at the far left. A crossing is born at the left edge and travels to the centre. On the way back, the mirrored lemniscate is used. It looks identical, so the crossing carries on out the right edge as one continuous wave.
- **Fruit as a cut.** The seed-to-fruit blend is purely radial. Ten membranes grow inward from the rim to a small pith, and the seed becomes a citrus wheel. The membranes are slightly irregular, and the wheel turns one segment every 40 s.
- **Rhythm.** Each move is a 3.6 s C² smootherstep, so the line starts and stops with zero velocity and zero acceleration. A full cycle is 14.4 s. A 7.2 s breath gently scales the figure (±2.2%), and in the infinity form the lobes slowly trade weight.
- **Hairline.** The stroke is 1.15 px with `vector-effect: non-scaling-stroke` and round joins, so it stays the same weight at every size.
- **Sampling.** Points are spaced unevenly (`θ = u − 0.82 sin 10(u − α) / 10`). They crowd where the membranes meet the pith, so the inner points stay crisp without a heavy point count.

## Two plates

- **A — Ivory / Tangerine:** `#F4EEE2` ground, `#F26B21` line, graphite italic.
- **B — Field / White:** a painterly colour field made only from SVG. Pigment ellipses are pushed by `feTurbulence` + `feDisplacementMap`, washed with `feGaussianBlur`, and finished with a grain layer. The field drifts slowly through a compositor-only CSS transform, so the blur is never recomputed while it moves.

The type is Instrument Serif Italic (SIL Open Font License, via Google Fonts), with Georgia italic as the fallback.

## Behaviour

- `prefers-reduced-motion`: shows a single still frame (the seed becoming ∞), and the field does not drift.
- The animation pauses when the tab is hidden and resumes where it left off.
- Checked in headless Chromium: no console errors, frames at a steady ~16.7 ms, and no horizontal scroll at phone width.

## Reference

The motion was prompted by a screen recording the user supplied: a white hairline loop morphing above an italic serif line on a blurred colour field. The study borrows its restraint and rhythm, not its forms or code. The recording contains private content and is **not** stored in this public repository.

## Not decided

Whether the fruit form, the circle-as-seed, or any of this motion belongs in Tangerine's identity. Compare it with Industrial Study 004 and the earlier fruit symbol before using it anywhere public.
