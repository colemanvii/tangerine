# Lil KC — Claude handoff

This file is the working brief for Claude and any future collaborator developing **Lil KC** within Tangerine.

## The north star

**Make the original character capable of doing almost anything without making him look like someone else.**

Lil KC is a small, brave, gentle boy with a huge rounded afro, red trailing bandanna, oversized curious eyes, imperfect handmade ink outlines, warm ochre skin, a white gi, black belt, bare feet, and a bright red heart he protects. In his original picture he lunges with a dagger in one hand and guards the heart with the other. That tension—courage and tenderness—is his emotional identity.

The canonical source of truth is [the original image](lil-kc-master-2026-11-16.png), archived November 16, 2026, and described in [README.md](README.md). Do not use generated or redesigned variants as a replacement for it.

## Roles and approval

- **Creator / creative director:** the user decides what Lil KC does, what he looks like, and what becomes canonical.
- **Visual development:** art direction, new poses and expression studies should be measured against the original and approved by the user.
- **Claude:** engineering, repository organization, tooling, assembly, animation playback, export tooling, QA, and documenting creative decisions. Claude can propose storyboards and pipelines but **must not silently canonize its own redraws**.
- The original artwork is immutable. Never overwrite, crop in place, re-export in place, or recolor it.

## Character invariants

1. Massive, lumpy, irregular afro silhouette; deliberately not geometrically round.
2. Red bandanna (not a neat digital ribbon), flying tails, warm reddish highlights.
3. Expressive, slightly asymmetrical large eyes; tiny mouth and simple nose.
4. Oversized head, tiny torso and limbs, exuberant mid-action poses.
5. Hand-inked dark irregular outlines with subtle thickness changes; paper grain and natural imperfections.
6. Innocence, playful swagger, gentle courage. The heart matters.
7. No slick 3D, flawless vectorized anatomy, glossy surfaces, stock-cartoon eyes, photorealism, or generic anime makeover.

The original image is the reference for *identity*, not necessarily the required outfit or props for every scene. New costumes and adventures are fine after approval.

## Claude's production responsibilities

### 1. Character bible
Create an illustrated character specification, not just prose: proportions, silhouettes, hand-drawn palette sampling, face-expression matrix, pose vocabulary, costume rules, and side-by-side fidelity checks against the master. Clearly distinguish *approved* art from *studies*.

### 2. Animation pipeline
Support **hand-drawn 2D animation first**, with limited cutout/rig techniques for secondary movement where they do not undermine the drawing. Create an easy frame-by-frame previewer with onion-skin support, frame timing, looping, reference overlay, and simple export. Allow hand-drawn replacement frames.

### 3. Motion library
Start with small acting studies: blink, glance, bandanna flutter, foot shuffle, hop, and a lively attack-to-heart-protection action. A sense of timing and held poses is more important than interpolation smoothness. Work at 12 drawings per second or on twos as an initial test, not an absolute rule.

### 4. Story and world archive
Organize approved art, alternate outfits, storyboards, settings, scripts, and eventually short films. Lil KC should be able to box, ride a horse, explore space, dance, fall, get back up, and protect his heart without a character redesign.

### 5. Distribution
Provide outputs suitable for website easter eggs, short looping animations, stickers, transparent spritesheets, reels, and eventually games. Preserve provenance and source frames; exports are never the canonical art.

## Suggested repository layout (create incrementally)

```text
lil-kc/
  README.md                         # existing: original character description
  CLAUDE.md                         # this file
  ANIMATION.md                      # animation production instructions
  lil-kc-master-2026-11-16.png      # immutable
  bible/                            # design notes + approved drawings
  studies/                          # unapproved explorations
  animation/
    001-first-motion/
      storyboard/
      frames/
      project/
  exports/                          # generated deliverables
```

Do not create placeholder folders for their own sake. Do not add large binary duplicates without need.

## First deliverable to propose

A **2–3 second loop**: Lil KC shifts his weight, blinks, glances toward danger, and draws the red heart a little closer. His afro and bandanna lag slightly behind the movement. End on a pose that loops naturally. The result must look like the character was lovingly redrawn, not merely rotated on a rig.

Before building final animation assets: inspect the repository, make a clear shot plan, establish a faithful approved model/pose sheet, then create a small test. Show the user the test for sign-off before extending the pipeline.

## Quality gates

- Compare every new face and full-body drawing to the original at matching apparent size.
- Check the head-to-body ratio, eyes, bandanna, silhouette, line texture, and sense of innocence.
- Preview on desktop and a small phone; check loops for flashing, jitter, and abrupt holds.
- Track every source file, frame rate, export format, and authoring technique.
- Do not auto-publish the character or claim public licensing. The GitHub repository is public.

**Decision rule:** If a technically clean animation no longer feels like *this little guy*, reject it and try a more human drawing technique.
