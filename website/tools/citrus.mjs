/* Tangerine — transverse-section geometry.
 *
 * A citrus section is not a pie chart. Its segments are carpels: lobes that
 * meet at an off-centre, hollow core, divided by membranes that bow slightly
 * in one direction (the fruit's twist), with full, rounded shoulders where
 * they press against the white albedo of the rind. This module builds those
 * lobes from exact cubic Béziers, circular arcs and quadratic fillets.
 *
 * Works in Node (to inline static SVG) and in the browser (for studies).
 */

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = a => Math.hypot(a[0], a[1]);
const unit = a => mul(a, 1 / len(a));
const perp = a => [-a[1], a[0]];
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
const rad = d => (d * Math.PI) / 180;
const polar = (c, r, deg) => [c[0] + r * Math.cos(rad(deg)), c[1] + r * Math.sin(rad(deg))];

const bez = (P, t) => {
  const u = 1 - t;
  return add(add(mul(P[0], u * u * u), mul(P[1], 3 * u * u * t)), add(mul(P[2], 3 * u * t * t), mul(P[3], t * t * t)));
};
const split = (P, t) => {
  const a = lerp(P[0], P[1], t), b = lerp(P[1], P[2], t), c = lerp(P[2], P[3], t);
  const d = lerp(a, b, t), e = lerp(b, c, t), f = lerp(d, e, t);
  return [[P[0], a, d, f], [f, e, c, P[3]]];
};
const slice = (P, t0, t1) => {
  const right = split(P, t0)[1];
  return split(right, (t1 - t0) / (1 - t0))[0];
};
/* First t at which dist(B(t), c) crosses r, scanning from `from` toward `to`. */
const solve = (P, c, r, from = 0, to = 1) => {
  const f = t => len(sub(bez(P, t), c)) - r;
  let a = from, fa = f(a);
  const N = 400;
  for (let i = 1; i <= N; i++) {
    const b = from + ((to - from) * i) / N, fb = f(b);
    if (Math.sign(fa) !== Math.sign(fb)) {
      let lo = a, hi = b;
      for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (Math.sign(f(m)) === Math.sign(fa)) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }
    a = b; fa = fb;
  }
  return to;
};
/* t at which arc length from the end of P (backwards) equals d. */
const backOff = (P, d) => {
  let acc = 0, prev = bez(P, 1);
  for (let i = 1; i <= 400; i++) {
    const t = 1 - i / 400, p = bez(P, t);
    acc += len(sub(p, prev)); prev = p;
    if (acc >= d) return t;
  }
  return 0;
};
const intersect = (p, dp, q, dq) => {
  const den = dp[0] * dq[1] - dp[1] * dq[0];
  if (Math.abs(den) < 1e-9) return lerp(p, q, 0.5);
  const t = ((q[0] - p[0]) * dq[1] - (q[1] - p[1]) * dq[0]) / den;
  return add(p, mul(dp, t));
};
const angleOf = (c, p) => (Math.atan2(p[1] - c[1], p[0] - c[0]) * 180) / Math.PI;

const f1 = n => +n.toFixed(1);
const pt = p => `${f1(p[0])} ${f1(p[1])}`;

/**
 * @param {object} o
 * @param {number[]} o.cuts      membrane angles in degrees (clockwise from 3 o'clock, SVG space), ascending
 * @param {number}   o.R         outer radius of the peel
 * @param {number}   o.rind      peel + albedo thickness (distance from R to the segment shoulders)
 * @param {number}   o.gap       membrane width (white between lobes)
 * @param {number[]} o.core      core offset from centre
 * @param {number}   o.hollow    radius of the hollow core where tips stop
 * @param {number}   o.bow       membrane bow as a fraction of its length (+/- sets twist direction)
 * @param {number}   o.shoulder  fillet length at the outer corners of each lobe
 * @param {number}   o.c         centre coordinate (square viewBox of 2c)
 * @param {string}   o.tip       'point' (rounded tip) or 'arc' (tips cut by the circular hollow of the core)
 */
export function section(o) {
  const { cuts, R = 470, rind = 44, gap = 10, core = [-7, 5], hollow = 16, bow = 0.05, shoulder = 70, c = 500, tip = 'point' } = o;
  const O = [c, c], C = add(O, core);
  const Rs = R - rind;                                  // radius of the lobes' shoulders
  const n = cuts.length;

  // Each membrane: a cubic from the core to beyond the shoulder circle, bowed one way.
  const membrane = deg => {
    const end = polar(O, R, deg);
    const L = len(sub(end, C)), u = unit(sub(end, C)), nrm = perp(u);
    return [C, add(add(C, mul(u, L / 3)), mul(nrm, bow * L)), add(add(C, mul(u, (2 * L) / 3)), mul(nrm, bow * L * 0.8)), end];
  };
  const offset = (P, k) => {
    // Approximate parallel curve: shift each control point along the local normal.
    const ns = [unit(perp(sub(P[1], P[0]))), unit(perp(sub(P[2], P[0]))), unit(perp(sub(P[3], P[1]))), unit(perp(sub(P[3], P[2])))];
    return P.map((p, i) => add(p, mul(ns[i], k)));
  };

  const lobes = [];
  for (let i = 0; i < n; i++) {
    const a0 = cuts[i], a1 = i + 1 < n ? cuts[i + 1] : cuts[0] + 360;
    // Side A follows membrane at a0, inset toward increasing angle; side B follows a1, inset the other way.
    const A = offset(membrane(a0), gap / 2), B = offset(membrane(a1 % 360), -gap / 2);
    const tA0 = solve(A, C, hollow), tA1 = solve(A, O, Rs, tA0);
    const tB0 = solve(B, C, hollow), tB1 = solve(B, O, Rs, tB0);
    const sideA = slice(A, tA0, tA1), sideB = slice(B, tB0, tB1);

    // Shoulder fillets: back off along each side, advance along the arc.
    const sa = backOff(sideA, shoulder), sb = backOff(sideB, shoulder);
    const [sideA1] = split(sideA, sa), [sideB1] = split(sideB, sb);
    const cornerA = sideA[3], cornerB = sideB[3];
    const angA = angleOf(O, cornerA), angB = angleOf(O, cornerB);
    const dAng = (shoulder / Rs) * (180 / Math.PI);
    const arcA = polar(O, Rs, angA + dAng), arcB = polar(O, Rs, angB - dAng);
    let sweep = ((angB - dAng) - (angA + dAng)) % 360; if (sweep < 0) sweep += 360;

    // Tip: tangent-line intersection of the two sides at the hollow.
    const tA = sideA1[0], tB = sideB1[0];
    const tip = intersect(tA, sub(sideA1[1], tA), tB, sub(sideB1[1], tB));
    const tipCtl = len(sub(tip, C)) < hollow * 0.9 || len(sub(tip, tA)) > hollow * 2 ? lerp(tA, tB, 0.5) : tip;

    const d = [
      `M${pt(tA)}`,
      `C${pt(sideA1[1])} ${pt(sideA1[2])} ${pt(sideA1[3])}`,
      `Q${pt(cornerA)} ${pt(arcA)}`,
      `A${f1(Rs)} ${f1(Rs)} 0 ${sweep > 180 ? 1 : 0} 1 ${pt(arcB)}`,
      `Q${pt(cornerB)} ${pt(sideB1[3])}`,
      `C${pt(sideB1[2])} ${pt(sideB1[1])} ${pt(tB)}`,
      tip === 'arc' ? `A${f1(hollow)} ${f1(hollow)} 0 0 0 ${pt(tA)}Z` : `Q${pt(tipCtl)} ${pt(tA)}Z`,
    ].join('');

    const mid = (a0 + a1) / 2;
    lobes.push({
      d, a0, a1, mid: ((mid % 360) + 360) % 360, span: a1 - a0,
      // A reading anchor on the lobe's axis, and the shoulder point (for callouts).
      anchor: (r) => polar(O, r, mid),
      shoulderPoint: polar(O, Rs, mid),
      rimPoint: polar(O, R, mid),
    });
  }
  return { O, C, R, Rs, rind, lobes, polar, membranes: cuts.map(membrane) };
}

export const pathOf = P => `M${pt(P[0])}C${pt(P[1])} ${pt(P[2])} ${pt(P[3])}`;
