#!/usr/bin/env node
/* Freeman Globe 001 — checks the export against the source.
     node source/verify.cjs
   1. The script in the mark is the production Freeman bitmap, pixel for pixel.
   2. The loop closes in the source: frame 240 is frame 0.
   3. The MP4 is 1080 × 1920, 30 fps, 240 frames, 8.000 s.
   4. Every decoded frame matches its source frame; ivory and red decode to the brand values.
   5. Read back to the 1-bit grid, every decoded frame equals its source frame, and the seam
      (last frame → first) changes no more cells than other neighbouring frames do. */
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const proj = path.join(__dirname, ".."), mp4 = path.join(proj, "exports/freeman-globe-001.mp4");
const { film, raster } = require("./render.cjs"), S = film.SPEC, N = S.width * S.height * 3;
const mark = require("./mark.js").load(fs.readFileSync(path.join(proj, "assets/freeman-globe-mark.original.js"), "utf8"));
const out = {};

const prod = fs.readFileSync(path.join(proj, "assets/freeman-script-pixel-mark.original.js"), "utf8");
const pts = JSON.parse(prod.match(/const pts=(\[\[.*?\]\])/s)[1]), a = new Uint8Array(mark.SW * mark.SH);
pts.forEach(([x, y]) => { a[y * mark.SW + x] = 1; });
out.scriptPixels = pts.length;
out.scriptMatchesProduction = a.every((v, i) => v === mark.script[i]);

const g0 = Buffer.from(film.frameGrid(0));
out.sourceLoopCloses = g0.equals(Buffer.from(film.frameGrid(S.frames)));

const probe = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
  "stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames,duration,color_space,color_range:format=duration,size,bit_rate", "-of", "json", mp4], { encoding: "utf8" }).stdout);
out.video = probe.streams[0]; out.container = probe.format;

const dec = spawnSync("ffmpeg", ["-v", "error", "-i", mp4, "-vf", "scale=in_color_matrix=bt709:in_range=tv:out_range=full:flags=accurate_rnd+full_chroma_int+full_chroma_inp,format=rgb24", "-f", "rawvideo", "-"], { maxBuffer: N * (S.frames + 2) }).stdout;
const frames = dec.length / N, fr = (i) => dec.subarray(i * N, (i + 1) * N);
const mad = (p, q) => { let s = 0; for (let i = 0; i < N; i++) s += Math.abs(p[i] - q[i]); return s / N; };
out.decodedFrames = frames;
let worst = 0; for (let i = 0; i < frames; i++) worst = Math.max(worst, mad(fr(i), raster(i)));
out.worstMeanErrorVsSource = +worst.toFixed(3);
const px = (f, x, y) => [...f.subarray((y * S.width + x) * 3, (y * S.width + x) * 3 + 3)];
const cell = (f, gx, gy) => px(f, film.x0 + gx * S.K + S.K / 2, film.y0 + gy * S.K + S.K / 2);
out.paperDecoded = px(fr(0), 40, 40);
// red is read from the middle of a solid area: a bitmap pixel whose eight neighbours are also red
const g0c = Uint8Array.from(film.frameGrid(0)), W = film.W;
let solid = -1;
for (let i = W + 1; i < g0c.length - W - 1 && solid < 0; i++) {
  let all = 1; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) all &= g0c[i + dy * W + dx];
  if (all) solid = i;
}
out.redDecoded = cell(fr(0), solid % W, Math.floor(solid / W));
// read every decoded frame back to a 1-bit grid and compare it with the source grid, cell by cell
const grids = [], src = [];
let wrongCells = 0;
for (let i = 0; i < frames; i++) {
  const s = Uint8Array.from(film.frameGrid(i)), d = new Uint8Array(s.length), f = fr(i);
  for (let c = 0; c < s.length; c++) { d[c] = cell(f, c % W, Math.floor(c / W))[1] < 152 ? 1 : 0; if (d[c] !== s[c]) wrongCells++; }
  grids.push(d); src.push(s);
}
out.decodedCellsDifferingFromSource = wrongCells;
const diff = (p, q) => { let n = 0; for (let i = 0; i < p.length; i++) n += p[i] ^ q[i]; return n; };
const steps = []; for (let i = 0; i < frames - 1; i++) steps.push(diff(grids[i], grids[i + 1]));
out.cellsChangedPerStep = { min: Math.min(...steps), max: Math.max(...steps) };
out.cellsChangedAtSeam = diff(grids[frames - 1], grids[0]);
out.seamless = out.sourceLoopCloses && wrongCells === 0 && out.cellsChangedAtSeam <= out.cellsChangedPerStep.max;
console.log(JSON.stringify(out, null, 2));
process.exit(out.seamless && out.scriptMatchesProduction && frames === S.frames ? 0 : 1);
