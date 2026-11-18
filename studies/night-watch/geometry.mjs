// Night Watch — master owl geometry.
//
// Construction from the Opepen 8 × 8 schematic (visualizevalue/opepen-api,
// app/Services/OpepenSVG/opepen-schematics.svg): a left eye with a squared
// upper-left corner, a right eye that is a disc, the two touching; a broad
// lower face with rounded lower corners; a bust with rounded shoulders whose
// base sits on the canvas edge.
//
// Proportions from the earlier orange Night Watch sheet: the eyes are 1.2 × the
// schematic's, the face is a shorter band tight under them, and the bust is a
// heavy block just below — a big head on hunched shoulders, no neck.
// Eyes, face and bust share one column, x 1.6 – 6.4.
//
// Locked: every print reuses this drawing.

// The tangerine of the experiment. Both eyes, every print, 100% opacity.
export const EYE = '#F47628';

export const SIZE = 8;
const r4 = (n) => Math.round(n * 1e4) / 1e4;

// Lower-set inner field, after the Homage to the Square margins
// (bottom : sides : top = 1 : 2 : 3).
export const INNER = { x: 1, y: 1.5, w: 6, h: 6 };

// Eyes.
export const R = 1.2;                    // eye radius (schematic: 1)
export const EYE_TOP = 1.9;
const CY = EYE_TOP + R;                  // 3.1
const X0 = 4 - 2 * R, X1 = 4 + 2 * R;    // 1.6, 6.4 — the owl's column
export const LEFT_DISC = { cx: r4(4 - R), cy: r4(CY), r: R };
export const LEFT_CORNER = { x: r4(X0), y: EYE_TOP, w: R, h: R }; // the squared quarter
export const LEFT_EYE = `M${r4(4 - R)} ${EYE_TOP}A${R} ${R} 0 1 1 ${r4(X0)} ${r4(CY)}L${r4(X0)} ${EYE_TOP}Z`;
export const RIGHT_EYE = { cx: r4(4 + R), cy: r4(CY), r: R };
// The eyes touch at (4, CY).

// Lower face: a band tight under the eyes, with the beak cut out of its top
// edge — the gap between the eyes runs down into one small wedge.
const FACE_TOP = CY + R;                 // 4.3
const FACE_H = 1.5, FACE_R = 0.6;
const FACE_BOT = FACE_TOP + FACE_H;      // 5.8
export const BEAK = { half: 0.3, depth: 0.5 };
export const BEAK_Y = r4(FACE_TOP);
export const FACE =
  `M${r4(X0 + FACE_R)} ${r4(FACE_BOT)}A${FACE_R} ${FACE_R} 0 0 1 ${r4(X0)} ${r4(FACE_BOT - FACE_R)}` +
  `L${r4(X0)} ${r4(FACE_TOP)}L${r4(4 - BEAK.half)} ${r4(FACE_TOP)}L4 ${r4(FACE_TOP + BEAK.depth)}L${r4(4 + BEAK.half)} ${r4(FACE_TOP)}` +
  `L${r4(X1)} ${r4(FACE_TOP)}L${r4(X1)} ${r4(FACE_BOT - FACE_R)}A${FACE_R} ${FACE_R} 0 0 1 ${r4(X1 - FACE_R)} ${r4(FACE_BOT)}Z`;

// Bust: rounded shoulders, base on the canvas edge.
const BUST_TOP = FACE_BOT + 0.25;        // 6.05
const BUST_R = 0.8;
export const BUST =
  `M${r4(X0)} 8L${r4(X0)} ${r4(BUST_TOP + BUST_R)}A${BUST_R} ${BUST_R} 0 0 1 ${r4(X0 + BUST_R)} ${r4(BUST_TOP)}` +
  `L${r4(X1 - BUST_R)} ${r4(BUST_TOP)}A${BUST_R} ${BUST_R} 0 0 1 ${r4(X1)} ${r4(BUST_TOP + BUST_R)}L${r4(X1)} 8Z`;

// One gaze: small pupils pressed to the left of each eye and a little low —
// the dry sideways look of the earlier Night Watch sheets. Same size and offset
// (in eye radii) in both eyes.
export const PUPIL = { r: 0.18, dx: -0.56, dy: 0.16 };
export const PUPILS = [LEFT_DISC, RIGHT_EYE].map((e) => ({
  cx: r4(e.cx + PUPIL.dx * R), cy: r4(e.cy + PUPIL.dy * R), r: r4(PUPIL.r * R),
}));

// Interior points inside each eye, clear of the pupils (canvas units).
// Used by the verifier to sample the fixed orange.
export const EYE_SAMPLES = {
  left: [[1.9, 2.2], [3.2, 2.5], [3.3, 3.7]],
  right: [[5.2, 2.2], [5.9, 3.1], [5.3, 4.0]],
};
