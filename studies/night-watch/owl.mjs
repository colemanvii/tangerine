// Builds one Night Watch print as a self-contained SVG string.
import * as G from './geometry.mjs';

const HEX = /^#[0-9A-F]{6}$/;

export function owlSVG(p, { px = 1600, title, geo = G } = {}) {
  for (const k of ['outer', 'inner', 'face', 'bust', 'pupil', 'beak']) {
    if (!HEX.test(p[k])) throw new Error(`${p.id ?? '?'}: ${k} must be #RRGGBB uppercase, got ${p[k]}`);
  }
  const I = geo.INNER;
  const beakTip = 4 + geo.BEAK.depth;
  // When the beak colour differs from the inner field it is drawn as a wedge;
  // otherwise the cut-out in the face lets the inner field through.
  const beak = p.beak === p.inner ? '' :
    `\n    <path id="beak" fill="${p.beak}" d="M${4 - geo.BEAK.half} 4L4 ${beakTip}L${4 + geo.BEAK.half} 4Z"/>`;
  const pupils = geo.PUPILS.map((c, i) =>
    `\n    <circle id="pupil-${i ? 'right' : 'left'}" fill="${p.pupil}" cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${geo.SIZE} ${geo.SIZE}" shape-rendering="geometricPrecision">${title ? `
  <title>${title}</title>` : ''}
  <rect id="outer-field" fill="${p.outer}" width="${geo.SIZE}" height="${geo.SIZE}"/>
  <rect id="inner-field" fill="${p.inner}" x="${I.x}" y="${I.y}" width="${I.w}" height="${I.h}"/>
  <g id="owl">
    <path id="bust" fill="${p.bust}" d="${geo.BUST}"/>
    <path id="face" fill="${p.face}" d="${geo.FACE}"/>${beak}
    <path id="eye-left" fill="${geo.EYE}" d="${geo.LEFT_EYE}"/>
    <circle id="eye-right" fill="${geo.EYE}" cx="${geo.RIGHT_EYE.cx}" cy="${geo.RIGHT_EYE.cy}" r="${geo.RIGHT_EYE.r}"/>${pupils}
  </g>
</svg>
`;
}
