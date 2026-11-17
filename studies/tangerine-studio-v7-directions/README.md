# Tangerine — Design No. 07, three homepage directions

**Status:** art-direction study, 17 November 2026. Homepages only, not a full site. Not approved, not deployed,
`noindex`. Built on the V6 foundation (`../tangerine-studio-v6/`: its type, grid, header, footer, work modules and
scripts are loaded directly, unchanged). V5 and V6 are untouched.

## Open it

```sh
cd studies
python3 -m http.server 8767
# http://localhost:8767/tangerine-studio-v7-directions/
```

`index.html` compares the three. To change a direction, edit `src/*.html` or `assets/css/directions.css` and run
`python3 tools/build.py`.

## The brief

Keep V6's contemporary typography, editorial discipline, scale and orange. Bring back artistic soul through two
references Cole supplied:

- **SPLENDID**, a California citrus crate label. What we took: a huge foreground cluster of fruit, leaves and blossom,
  cropped by the frame; deep vista behind it; saturated lithographic colour (sky turquoise, navy, leaf green, orange,
  a gold rule); and a wordmark that is already a bold extended sans in navy, close to V6's Mona Sans.
- **A monumental orange painting in a gallery.** What we took: light and scale. Soft fields that seem to glow, a
  white wall, a small figure in front, the orange reflected in the floor.

The full stop stays, but it no longer carries the identity alone.

## A · Gallery (the painting)

The home page is a room. A tall orange painting hangs on a warm white wall, glowing, reflected in a dark floor. The
name is set on the wall like exhibition lettering, with an empty ring where its full stop should be: **the full stop
has wandered off and is standing on the floor, looking at the painting.** It has its own reflection. The work is then
hung in rooms with wall labels (Room 1: Freeman; Room 2: Kashus Culpepper). The footer is the painting itself.

*Strengths:* the quietest and most sophisticated. Real atmosphere and depth without gradients. Humour in one move.
*Risks:* the generous wall space needs more and larger work to fill rooms; it leans on the painting being real.

## B · Splendid (the label)

The label rebuilt at contemporary scale. A painted turquoise sky; **TANGERINE** in navy Mona Sans, extended, set across
the page like SPLENDID; *We build brands* in spaced caps beneath, where the label says BRAND. A heavy cluster of
painted tangerines, glossy leaves and blossom crosses in front of the letters from the left edge. A gold rule frames
the hero. On the right, the label's small print becomes the studio's: *Packed by Tangerine Studio, Georgia, U.S.A.*
The work sits on deep navy; Lil KC kicks across the painted sky; a sprig hangs over the section edge; a halved
tangerine rolls into the studio statement.

*Strengths:* the most surprising and the most unmistakably Tangerine. Colour that is genuinely alive.
*Risks:* the richest palette to control across many projects; the painted vista must stay a backdrop, never a theme park.

## C · Mosaic (the work)

V6's paper and type, then straight into the work: a dense, saturated mosaic of real pieces and studio artwork, each
tile in its own world colour (Freeman ivory and red, Lil KC on sky, the painting, a halved tangerine on navy, a sprig
on leaf green, the hat on graphite, a crop of Lil KC's eyes). A sprig hangs into the studio statement; the footer is
painted.

*Strengths:* the most work-first and the most flexible for an automotive film or a fashion editorial later.
*Risks:* only as rich as the work in it. With today's small archive the studio artwork does a lot of the lifting.

## Artwork made for these studies

All of it is **original, drawn or painted in code by Claude** for this art-direction study (`tools/`). None of it is
a copy of the references, and **none of it is Cole's work.**

| File | What | Script |
| --- | --- | --- |
| `assets/art/field-tall.jpg`, `field-wide.jpg` | Colour-field paintings: luminous orange fields built from glazes, brush drag and canvas weave. No gradient functions. | `paint_tall.py`, `paint_field.py` |
| `assets/art/sky.jpg` | A painted sky over distant ridges and a plain, the vista behind a label | `paint_sky.py` |
| `assets/art/cluster.webp`, `sprig.webp`, `cut.webp` | Botanicals lit as surfaces: oblate peel with pores, creased glossy leaves, cupped blossom, a halved fruit | `botanical.py` |

They stand in for what should eventually be **Cole's own paintings, photography and illustration.** On the pages the
painting is labelled *Colour study*. Before any public use, decide whether each piece is kept as studio artwork,
redrawn by hand, or replaced.

## Also changed from V6

- No ColeCalfee.com references.
- No placeholder rows (*to come*, *being photographed*). Only work that exists is shown.
- No copy explaining the typography or the site.
- The interactive full stop is not wired into these comps (static here); it carries over to V7 unchanged.

## Real work used

Freeman Globe (live canvas from Freeman's original code, both films and posters), Lil KC (master drawing and *The
Heart* motion-test drawings), the Joseph Martin hat study. All from V6, with V6's labels: *study, not yet approved by
Freeman*; *in development*; *rough motion test, not approved animation*; *study drawing*.

## Checked

Chromium at 1440 × 900 and iPhone 13: no failed requests, no console errors, no horizontal overflow on any of the
three. Film playback not verified (no H.264 in the test browser); posters shown. Screens in `screens/`.
