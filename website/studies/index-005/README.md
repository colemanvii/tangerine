# Index 005 — studies

Design studies for the one-screen homepage: *Tangerine. We build brands.* Four relationships, four segments, one fruit. Not deployed (see `website/.vercelignore`). Serve `website/` locally and open `/studies/index-005/a.html` and the others. All four studies build their fruit with `website/tools/citrus.mjs`.

The starting point (commit `0dcb0bf`) put four serif names in the four quadrants of a stroked circle. It made the idea clear, but the fruit was a pie chart and the type had no relationship to the form.

## Research: the geometry of a citrus section

A transverse section of a tangerine is not radial symmetry. Its segments (carpels) meet at a core that sits slightly off-centre. The membranes between them bow, all in the same direction, which gives the fruit a slight twist. Each segment has full, rounded shoulders where it presses against the white albedo, and a pointed tip that stops short of the core's pith column. `citrus.mjs` builds exactly these parts from cubic Béziers, true arcs and fillets.

## Directions

| | Study | Idea | Verdict |
|---|---|---|---|
| A | **Fig. 1 — Transverse section** | Eleven true segments drawn as a technical figure. The four relationships are the solid orange segments, with industrial-manual callouts and metadata. | The cleverest idea, and the most like a real tangerine. But the outlined white segments read as a turbine, the leader lines cut through the work, and the composition is a diagram rather than a mark. Rejected. |
| B | **Four lobes** | A solid four-segment symbol in a peel ring. Names are knocked out of each lobe, and Scout Motors is drawn in outline because it is an independent study, not a commission. | The only direction that becomes a recognisable Tangerine *symbol*. Weak points: the type was centred like a pie-chart label, and the orange mass was loud. **Selected.** |
| C | **Lettered rind** | The names set in wide capitals around the rind band; pale segments inside. | Elegant, but circular type around a circle is the badge or coffee-stamp cliché. Rejected. |
| D | **Membranes (B refined)** | Each name is lettered along its segment's leading membrane, finishing flush against the core. The type draws the cross-section. | Became the homepage (`tools/home.mjs`). |

## Refinements from B to the homepage

- **Type follows the geometry.** The names sit on the membranes. The membrane chords run exactly left, up, right and down from the off-centre core, so the lettering is orthogonal (Swiss), while the membranes' bow gives the baselines a slight curve. All four names converge on the core. *Kashus Culpepper* would otherwise be upside down, so it reads outward with its capitals hung toward the membrane. Two-word names stack, which allows a larger size.
- **Asymmetry.** The core is offset by 5 % of the radius, so the segments differ in size and the cross is not a crosshair.
- **Sharp against soft.** The segment tips are cut by the circular hollow of the core, a crisp counterpoint to the rounded shoulders.
- **One size, two widths.** One type size fits every name (measured in the real font). On small screens a narrower width of Archivo keeps the names at 18.7 px or more: white on tangerine is 3.5:1, which passes only as large text.
- **Honesty.** Scout Motors is an independent study, shown in outline.
- **Restraint.** No gradients, no ambient motion, no fill transition (orange to graphite passes through brown). Hover and focus turn a segment graphite instantly.

## Screenshots

`shots/` has each study and the final page at 1440 × 900 and at iPhone 13 size.
