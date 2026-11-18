// Night Watch — master owl geometry.
// One drawing, on the Opepen 8 × 8 schematic (visualizevalue/opepen-api,
// app/Services/OpepenSVG/opepen-schematics.svg). Locked: every print reuses it.

// The tangerine of the experiment. Both eyes, every print, 100% opacity.
export const EYE = '#F47628';

export const SIZE = 8;

// Lower-set inner field, after the Homage to the Square margins
// (bottom : sides : top = 1 : 2 : 3).
export const INNER = { x: 1, y: 1.5, w: 6, h: 6 };

// Left eye — schematic 2x2_tr-br-bl: square upper-left corner, round elsewhere.
export const LEFT_EYE = 'M3 2A1 1 0 1 1 2 3L2 2Z';
// Right eye — a disc. The eyes touch at (4, 3).
export const RIGHT_EYE = { cx: 5, cy: 3, r: 1 };

// Broad lower face (schematic mouth), with the beak cut out of its top edge:
// the gap between the eyes runs down into one small wedge.
export const BEAK = { half: 0.28, depth: 0.55 };
export const FACE =
  `M3 6A1 1 0 0 1 2 5L2 4L${4 - BEAK.half} 4L4 ${4 + BEAK.depth}L${4 + BEAK.half} 4L6 4L6 5A1 1 0 0 1 5 6Z`;

// Simple bust (schematic torso), base on the canvas edge.
export const BUST = 'M2 8A1 1 0 0 1 3 7L5 7A1 1 0 0 1 6 8Z';

// One gaze: both pupils share a size and an offset from their eye's centre.
// Small, pressed to the left and a little low: the dry sideways look of the
// earlier multicolour Night Watch sheet, measured from that sheet.
export const PUPIL = { r: 0.18, dx: -0.56, dy: 0.16 };
export const PUPILS = [
  { cx: 3 + PUPIL.dx, cy: 3 + PUPIL.dy, r: PUPIL.r },
  { cx: 5 + PUPIL.dx, cy: 3 + PUPIL.dy, r: PUPIL.r },
];

// Interior points that sit inside each eye and clear of the pupils.
// Used by the verifier to sample the fixed orange (canvas units).
export const EYE_SAMPLES = {
  left: [[2.25, 2.25], [3.3, 2.6], [3.4, 3.4]],
  right: [[5.0, 2.2], [5.5, 3.0], [5.0, 3.7]],
};
