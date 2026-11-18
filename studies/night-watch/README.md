# Night Watch

Twenty owl studies for Cole Calfee. **Status:** design study in Tangerine's `studies/` folder. It is not published on the live website, and it is not an approved mark.

The idea is Josef Albers meets the Opepen schematic. From Albers: one colour can look like several, depending on what touches it. From Opepen: a recognisable figure built on a shared geometric schematic. The owl first appeared by accident in an earlier Tangerine study. Two touching eyes and a small break between them made a geometric face look like a bird watching quietly.

**Where to look:** cover the labels and compare the eyes in **01 Amber** and **02 Midnight**. Every eye in all twenty prints is the same `#F47628`.

## Files

| Path | What |
| --- | --- |
| `index.html` | Local preview. It opens on the full sheet. Click a tile to open that print. Use ← → to move between prints and Esc to return to the sheet. On a phone, tap **Sheet** at the top left, or swipe. |
| `svg/night-watch-NN-name.svg` | 20 editable, self-contained SVGs on an 8 × 8 viewBox. The shapes have ids: `outer-field`, `inner-field`, `bust`, `face`, `eye-left`, `eye-right`, `pupil-*`, `beak`. |
| `png/night-watch-NN-name.png` | 20 PNGs at 1600 × 1600, tagged sRGB. |
| `night-watch-sheet.svg` / `.png` | The 5 × 4 contact sheet, edge to edge with no gutters or labels. The PNG is 4000 × 3200. |
| `geometry.mjs` | The locked master owl and the `EYE` constant. |
| `palettes.json` | The palette manifest: hand-mixed colours, the pairs and their questions, in sheet order. |
| `owl.mjs`, `render.mjs`, `preview.template.html` | The deterministic renderer. |
| `verify.mjs` | Export checks (see below). |

## Render and verify

```sh
node studies/night-watch/render.mjs        # writes svg/, png/, the sheet and index.html
node studies/night-watch/verify.mjs        # checks every export
```

The renderer needs Node 22 and Playwright with Chromium. The PNGs are rasterised by headless Chromium forced to sRGB (`--force-color-profile=srgb`). Running the renderer twice produces byte-identical files.

`verify.mjs` checks the following:

- In every PNG, every eye pixel that is at least 2 px from an edge or a pupil (about 355,000 per print) is exactly rgb(244, 118, 40). It also checks named sample points in each eye.
- Both eyes are filled with `EYE`. No SVG contains opacity, a gradient, a filter or an external reference.
- The contact sheet holds the same twenty drawings in the same order. Each tile's markup matches its SVG, and sample pixels from every shape match the individual PNG.

## The master owl

The construction comes from the Opepen 8 × 8 schematic (`opepen-schematics.svg`): a left eye with a squared upper-left corner, a disc for the right eye, the two touching, a broad lower face with rounded lower corners, and a bust with rounded shoulders resting on the bottom edge. The proportions come from the earlier orange Night Watch sheet: a big head on hunched shoulders, with no neck. Coordinates are measured from the top left, and all of them are derived in `geometry.mjs`.

- **Eyes:** radius 1.2, which is 1.2 × the schematic's eyes. The left eye has its squared corner at (1.6, 1.9). The right eye is a disc centred at (5.2, 3.1). They touch at (4, 3.1).
- **One column:** the eyes, face and bust all span x 1.6 to 6.4.
- **Lower face:** a band 1.5 tall sitting tight under the eyes (y 4.3 to 5.8), with lower corners of radius 0.6. The beak is a wedge cut out of its top edge, 0.6 wide and 0.5 deep. With the curved gap between the eyes, it reads as a beak.
- **Bust:** a heavy block from y 6.05 to the bottom edge, with shoulders of radius 0.8. It sits a quarter unit below the face.
- **Gaze:** both pupils have a radius of 0.18 eye radii and sit 0.56 left and 0.16 down from each eye's centre (also in eye radii). They press against the left edge of each eye. This gaze was measured from the earlier Night Watch sheets, to keep their dry, slightly strange sideways look.
- **Fields:** an outer square field and an inner field 6 × 6 at (1, 1.5). The inner field is set low, as in Homage to the Square, with bottom, side and top margins of 0.5, 1 and 1.5. The bust crosses the inner field's bottom edge. When the bust takes the outer colour, it rises into the frame as shoulders. When it takes the inner colour, the whole inner field becomes the owl's body and drops a tab to the canvas edge.

The owl has no ears, feathers, wings, outlines or highlights. The colour of each part comes from the palette. If the face takes the inner colour, it disappears. If the beak takes the inner colour, the cut-out shows through.

## The ten pairs

Pairs sit side by side. The two exceptions run down the centre column: 03/08 and 13/18.

| Pair | Prints | Intended optical effect |
| --- | --- | --- |
| A | 01 Amber · 02 Midnight | **The proof.** The amber touching the eye is lighter and more saturated in the eye's own hue, so the orange looks almost brown. Next to midnight, the same orange glows. |
| B | 03 Bone · 08 Soot | Only the pupils and the beak change. White pupils make the orange look heavier and the stare blank. Black pupils make it brighter and watchful. |
| C | 04 Apricot · 05 Petrol | Pale apricot darkens the orange. Deep petrol, its near-complement, makes it look lighter and cleaner. |
| D | 06 Vermilion · 07 Ochre | Surrounded by vermilion, the orange leans yellow. Surrounded by ochre, it leans red. |
| E | 09 Slate · 10 Celery | Both prints use the same two colours, swapped. Where slate touches the orange, it is bright. Where celery touches it, it goes dull and redder. |
| F | 11 Persimmon · 12 Tobacco | Persimmon is almost the eye's own colour, so the squared corner of the left eye dissolves and only the pupils hold the face. In Tobacco, the same corner is sharp, and the persimmon moves out to the frame. |
| G | 13 Dusk · 18 Signal | In Dusk, every colour sits at about the orange's lightness, so the owl surfaces slowly. Signal uses white, graphite and orange, and reads across a room. |
| H | 14 Butter · 15 Cobalt | The orange and the lilac inner field are identical. Only the outer field changes. Butter makes the lilac cooler and bluer. Cobalt makes it pinker and lighter, and the owl moves from day to night. |
| I | 16 Raspberry · 17 Pewter | Both inner fields match the orange's lightness. Hot raspberry makes the orange look faded and yellow. Neutral grey makes it look vivid. |
| J | 19 Rose · 20 Oxide | The prints are identical except for one shape. When the lower face appears in oxide red, two staring eyes become a bird. |

The quiet place to land is the centre column (Bone, Soot and Dusk), with Signal anchoring the bottom.

## Colour notes

- `EYE = #F47628` is defined once, in `geometry.mjs`, and fills both eyes in every print at 100%. In Lab it measures L\* 63.6, C\* 75.7, h 54°. The fields were mixed by eye against that value. The Lab helper only set the equal-lightness fields: Dusk, Raspberry and Pewter.
- **Area:** the eyes cover about 9.1 of the 64 square units. The inner field covers 36, and the outer frame covers 28. The colour touching the orange is about four times its area, and the frame is large enough to shift that colour in turn. Pair H depends on this.
- **The badge problem:** in the earlier multicolour sheet, a cream lower face carried the same weight in every tile. Here the face disappears into the inner field in fifteen prints. In the other five, its weight ranges from barely there (Dusk, Apricot, Petrol) to dominant (Signal, Oxide). The bust varies the same way. It rises as shoulders in the outer colour in nine prints, disappears into the inner field in nine, and continues the face as a body in two.

## References

- Visualize Value, Opepen creator guide: <https://github.com/visualizevalue/opepen-app/blob/main/public/agents.md>
- Opepen schematic SVG, the source of the eye paths, mouth and torso: <https://github.com/visualizevalue/opepen-api/blob/main/app/Services/OpepenSVG/opepen-schematics.svg>
- Josef Albers, *Interaction of Color*, 1963. Example museum records: the [Hood Museum of Art](https://hoodmuseum.dartmouth.edu/objects/pr.981.91) and the [National Gallery of Art](https://www.nga.gov/artworks/55903-interaction-color). The study used the exercise in which one colour appears as two. A small patch of one colour sits on two large grounds. Each ground surrounds the patch on every side and is many times its area. The ground pulls the patch away from itself: a lighter ground darkens it, and a ground in more of the patch's own hue takes that hue away. This set the inner field's role and its large area relative to the eyes.
- Josef Albers, *Homage to the Square*, from 1950. For example, [*Nacre* from *Homage to the Square: Soft Edge—Hard Edge*](https://www.nga.gov/artworks/61037-nacre-homage-square-soft-edge-hard-edge) at the National Gallery of Art. The nested squares sit low, with a narrow bottom margin, wider sides and the widest top. Each colour touches only its immediate neighbours, so the inner colour is always seen through the one around it. This set the low inner field and its margins.

The museum pages could not be opened from the build environment because the network blocked them. The Albers notes come from these well-documented works, not from new image analysis.

**The two earlier Night Watch sheets**, which arrived after the first build:

- **Multicolour sheet:** the gaze was measured from it and adopted. It also confirms the badge problem, with the same cream face in all twenty tiles.
- **Orange sheet:** the proportions were measured from it. Its owl has eyes about 1.25 × the schematic's, a face 1.5 tall tight under them, and a wide bust after a gap of about 0.2. The master adopts these, except that the bust is held to the same width as the face so that the inner field closes cleanly around it.
- **The beak:** both sheets use an orange beak. That was tested against the cut-out and not used. The cut-out is lighter, an orange beak would put the experiment's orange outside the eyes, and pair J needs a beak that can disappear.

## Restraints kept

The prints contain only the artwork, with no text, gradients, transparency, texture, lighting, outlines or rounded cards. The study stays outside `website/`, the deployed site.
