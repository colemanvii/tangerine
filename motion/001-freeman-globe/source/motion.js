/* Freeman Globe 001 — each film as a pure function of frame number.
   Shared by the live preview (index.html) and the renderer (render.cjs).

   Two films, one mark:
     globe    the script holds still; only the globe turns.
     pendant  the whole insignia turns as one object on its vertical axis, like a pendant on a chain. */
(function (root) {
  "use strict";

  const BASE = {
    width: 1080, height: 1920, fps: 30, seconds: 8,
    paper: "#fff9f1",          // Freeman ivory
    red: "#f93822",            // Freeman red: script and globe, one colour
    D: 100,                    // globe diameter in bitmap pixels, as on the Edition 001 plate
    K: 4,                      // device pixels per bitmap pixel (even, so 4:2:0 chroma lands on the grid)
    centreY: 912,              // optical centre of the mark, a little above the middle of the frame
    start: 0                   // rotation at frame 0
  };
  const VARIANTS = {
    globe:   { name: "freeman-globe-001",         turn: 180, poster: 0 },    // 16 s per revolution (round 1 was 220, 13.09 s)
    pendant: { name: "freeman-globe-001-pendant", turn: 360, poster: 20,     // one full turn per loop; poster at 30°
               thickness: 1 }                                                // the script plate is one bitmap pixel thick
  };

  function create(mark, variant) {
    variant = variant || "globe";
    if (!VARIANTS[variant]) throw new Error("unknown film: " + variant);
    const SPEC = Object.assign({ variant }, BASE, VARIANTS[variant]);
    SPEC.frames = SPEC.fps * SPEC.seconds;
    const { RUNS, SW, SH, halo, MER, globeMask } = mark, K = SPEC.K;
    if (SPEC.turn % MER) throw new Error("turn must be a multiple of the meridian spacing or the loop will not close");
    if (variant === "pendant" && SPEC.turn % 360) throw new Error("the pendant must make whole turns or the loop will not close");
    const W = SW, H = Math.max(SH, SPEC.D + 2), oy = Math.floor((H - SH) / 2);
    const PW = W * K, PH = H * K;                       // the mark's area in video pixels
    const x0 = (SPEC.width - PW) / 2, y0 = SPEC.centreY - PH / 2;
    const buf = new Uint8Array(W * H), grid = new Uint8Array(W * H), cov = new Uint8Array(PW * PH);
    const row = new Float32Array(PW), clear = new Uint8Array(H * PW);

    const rotation = (frame) => SPEC.start + (frame * SPEC.turn) / SPEC.frames;

    /* GLOBE. One frame on the 160-wide grid: 1 where red, 0 where paper.
       Same order as the original paint(): globe, cleared under the script's halo, then the script. */
    function frameGrid(frame) {
      globeMask(buf, W, H, SPEC.D, rotation(frame));
      for (let y = 0; y < H; y++) {
        const sy = y - oy, inS = sy >= 0 && sy < SH;
        for (let x = 0; x < W; x++) grid[y * W + x] = buf[y * W + x] && !(inS && halo[sy * SW + x]) ? 1 : 0;
      }
      for (let i = 0; i < RUNS.length; i += 3) grid.fill(1, (RUNS[i] + oy) * W + RUNS[i + 1], (RUNS[i] + oy) * W + RUNS[i + 1] + RUNS[i + 2]);
      return grid;
    }
    function globeCoverage(frame) {
      const g = frameGrid(frame);
      for (let y = 0; y < PH; y++) { const gy = (y / K | 0) * W, o = y * PW; for (let x = 0; x < PW; x++) cov[o + x] = g[gy + (x / K | 0)] ? 255 : 0; }
      return cov;
    }

    /* PENDANT. The globe and the script turn together, rigidly, about the globe's vertical axis.
       The globe is a sphere, so turning it is the same drawing as before, on the grid.
       The script is a flat plate through the axis. Turned by θ, every run of the bitmap keeps its row and
       narrows to cos θ of its width; past edge-on it reopens mirrored, as the back of the plate. The plate is
       one bitmap pixel thick, so edge-on it is a single line as heavy as a globe line, not nothing.
       At θ = 0 this is exactly the original mark. The globe is cleared one bitmap pixel around the script, as in
       the original, so the signature always reads. */
    function pendantCoverage(frame) {
      const th = rotation(frame) * Math.PI / 180, c = Math.cos(th), s = Math.abs(Math.sin(th)), half = SPEC.thickness * s / 2, ax = W / 2;
      globeMask(buf, W, H, SPEC.D, rotation(frame));
      cov.fill(0); clear.fill(0);
      let i = 0;
      for (let sy = 0; sy < SH; sy++) {
        row.fill(0); let any = false;
        for (; i < RUNS.length && RUNS[i] === sy; i += 3) {
          any = true;
          const p1 = (RUNS[i + 1] - ax) * c, p2 = (RUNS[i + 1] + RUNS[i + 2] - ax) * c;
          const lo = (ax + Math.min(p1, p2) - half) * K, hi = (ax + Math.max(p1, p2) + half) * K;
          for (let x = Math.max(0, Math.floor(lo)); x < Math.min(PW, Math.ceil(hi)); x++) row[x] += Math.max(0, Math.min(hi, x + 1) - Math.max(lo, x));
          const cl = Math.max(0, Math.round(lo - K)), ch = Math.min(PW, Math.round(hi + K));
          for (let gy = Math.max(0, sy + oy - 1); gy <= Math.min(H - 1, sy + oy + 1); gy++) clear.fill(1, gy * PW + cl, gy * PW + ch);
        }
        if (!any) continue;
        for (let dy = 0; dy < K; dy++) { const o = ((sy + oy) * K + dy) * PW; for (let x = 0; x < PW; x++) cov[o + x] = Math.round(Math.min(1, row[x]) * 255); }
      }
      for (let y = 0; y < PH; y++) {
        const gy = y / K | 0, o = y * PW;
        for (let x = 0; x < PW; x++) if (buf[gy * W + (x / K | 0)] && !clear[gy * PW + x]) cov[o + x] = 255;
      }
      return cov;
    }

    /* How red each video pixel of the mark's area is, 0–255. Everything outside that area is paper. */
    const coverage = variant === "pendant" ? pendantCoverage : globeCoverage;
    return { SPEC, W, H, PW, PH, x0, y0, rotation, frameGrid, coverage };
  }

  root.FreemanGlobe = { BASE, VARIANTS, create };
  if (typeof module !== "undefined") module.exports = root.FreemanGlobe;
})(typeof globalThis !== "undefined" ? globalThis : this);
