/* Freeman Globe 001 — the film as a pure function of frame number.
   Shared by the live preview (index.html) and the renderer (render.cjs). */
(function (root) {
  "use strict";

  const SPEC = {
    width: 1080, height: 1920, fps: 30, seconds: 8,
    paper: "#fff9f1",          // Freeman ivory
    red: "#f93822",            // Freeman red: script and globe, one colour
    D: 100,                    // globe diameter in bitmap pixels, as on the Edition 001 plate
    K: 6,                      // device pixels per bitmap pixel (even, so 4:2:0 chroma lands on the grid)
    centreY: 912,              // optical centre of the mark, a little above the middle of the frame
    turn: 220,                 // degrees travelled in one loop: 13.09 s per revolution (the study's "about thirteen")
    start: 0                   // rotation at frame 0
  };
  SPEC.frames = SPEC.fps * SPEC.seconds;

  function create(mark) {
    const { RUNS, SW, SH, halo, MER, globeMask } = mark;
    if (SPEC.turn % MER) throw new Error("turn must be a multiple of the meridian spacing or the loop will not close");
    const W = SW, H = Math.max(SH, SPEC.D + 2), oy = Math.floor((H - SH) / 2);
    const buf = new Uint8Array(W * H), grid = new Uint8Array(W * H);
    const x0 = (SPEC.width - W * SPEC.K) / 2, y0 = SPEC.centreY - (H * SPEC.K) / 2;

    const rotation = (frame) => SPEC.start + (frame * SPEC.turn) / SPEC.frames;

    /* One frame on the 160-wide grid: 1 where red, 0 where paper.
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
    return { SPEC, W, H, x0, y0, rotation, frameGrid };
  }

  root.FreemanGlobe = { SPEC, create };
  if (typeof module !== "undefined") module.exports = root.FreemanGlobe;
})(typeof globalThis !== "undefined" ? globalThis : this);
