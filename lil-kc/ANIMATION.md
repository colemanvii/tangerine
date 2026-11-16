# Lil KC — animation production notes

## Status

**Ready for production planning; no approved animation frames yet.** Canonical image: [lil-kc-master-2026-11-16.png](lil-kc-master-2026-11-16.png). Overall Claude handoff: [CLAUDE.md](CLAUDE.md).

## Animation principles

**Drawing first, rig second.** The target is a small, loving hand-drawn animation, not rubber-hose deformation of a static PNG.

- Prefer distinct key drawings, irregular line quality, purposeful holds, simple hand-drawn in-betweens, and secondary motion in the afro and red bandanna.
- Use a cutout rig only for unobtrusive movements where anatomy and silhouette still feel authentic. Never cut the master image into pieces as an alleged final rig.
- Study the character in the approved artwork: eye spacing, open mouth, expressive proportions, afro silhouette, trailing red tails, small hands/feet, dark outline, handmade paper color.
- Keep the original PNG as archival source. Reconstructed layers and alternate poses are **derivative studies** until explicitly approved.

## Recommended first exercise — “The Heart” (2–3 seconds)

1. **Anticipation:** tiny weight shift; look across the frame; bandanna trails.
2. **Recognition:** one blink, subtle change to eyebrows and mouth.
3. **Protection:** pull the red heart toward his chest; other hand remains courageous.
4. **Resolve:** subtle bounce/hold; return toward starting pose for a seamless loop.

First develop **four to six hand-drawn key poses** against the master and ask for approval. Only then make in-betweens and exports.

## Technical target (initial, revisable)

- Source canvas: transparent at archival master reference resolution where possible, with paper texture on a separate optional background layer.
- Playback: start at 12 fps for a hand-made feel (some drawings may hold for two frames). Preserve timing metadata independent of export speed.
- Master animation source: individually named RGBA PNG frames `frame-0001.png`, etc., plus a `timing.json` with duration per frame.
- Output: transparent animated WebP and/or PNG sequence for web, H.264 MP4 for social where appropriate, GIF for lightweight proof-of-concept, sprite atlas plus manifest when a game or interface needs it.
- Keep source/editable project files in `animation/<shot>/project/`; generated releases in `exports/` with versioned names.
- Record the origin of every generated frame and avoid claiming fully editable artwork if the source is raster-only.

## Claude's build checklist

- [ ] Read `README.md` and inspect the canonical original at full resolution.
- [ ] Build a concise model sheet and obtain approval before coding a puppet.
- [ ] Propose exact keyframes for “The Heart” and receive visual sign-off.
- [ ] Implement a lightweight local preview (scrub, play/pause, frame stepping, looping, onion skin, original-reference overlay).
- [ ] Implement reproducible exports from an explicit sequence and timing file.
- [ ] Test both on off-white paper and transparency; assess small-screen legibility.
- [ ] Show the finished loop beside the master so identity can be judged, not assumed.
- [ ] Record approved choices and variants in a decision log.

## What not to do

Do not generate a batch of different-looking Lil KCs and select the least bad one. Do not add glossy shading, exact vectors, generic facial expressions, or jitter filters as a substitute for intentionally drawn frames. Do not publish unfinished animation on Tangerine's public website without authorization.

**Success:** You recognize *our* little guy in every frame.
