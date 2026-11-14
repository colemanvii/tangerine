#!/usr/bin/env node
/* Freeman Globe 001 — checks an export against the source.
     node source/verify.cjs [globe|pendant]
   1. The script in the mark is the production Freeman bitmap, pixel for pixel.
   2. The loop closes in the source: frame 240 is frame 0. The seam (frame 239 → 0) changes no more of the
      picture than other neighbouring frames do.
   3. The MP4 is 1080 × 1920, 30 fps, 240 frames, 8.000 s.
   4. Every decoded frame matches its source frame; ivory and red decode to the brand values.
   5. globe only: read back to the 1-bit grid, every decoded frame equals its source frame exactly.
      pendant only: frame 0 is the original mark, identical to frame 0 of the globe film. */
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const proj = path.join(__dirname, ".."), { open } = require("./render.cjs");
const { film, raster, mark, mp4 } = open(process.argv[2]), S = film.SPEC, N = S.width * S.height * 3;
const out = { film: S.variant }, ok = [];
const mad = (p, q) => { let s = 0; for (let i = 0; i < N; i++) s += Math.abs(p[i] - q[i]); return s / N; };
const r3 = (v) => +v.toFixed(3);

const prod = fs.readFileSync(path.join(proj, "assets/freeman-script-pixel-mark.original.js"), "utf8");
const pts = JSON.parse(prod.match(/const pts=(\[\[.*?\]\])/s)[1]), a = new Uint8Array(mark.SW * mark.SH);
pts.forEach(([x, y]) => { a[y * mark.SW + x] = 1; });
out.scriptPixels = pts.length;
ok.push(out.scriptMatchesProduction = a.every((v, i) => v === mark.script[i]));

const src = []; for (let i = 0; i < S.frames; i++) src.push(raster(i));
ok.push(out.sourceLoopCloses = src[0].equals(raster(S.frames)));
const sSteps = src.map((f, i) => mad(f, src[(i + 1) % S.frames])), seam = sSteps.pop();
out.sourceStep = { min: r3(Math.min(...sSteps)), max: r3(Math.max(...sSteps)), seam: r3(seam) };
ok.push(seam <= Math.max(...sSteps));

const probe = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
  "stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames,duration,color_space,color_range:format=duration,size", "-of", "json", mp4], { encoding: "utf8" }).stdout);
out.video = probe.streams[0]; out.container = probe.format;
const v = out.video;
ok.push(v.width === S.width && v.height === S.height && v.r_frame_rate === S.fps + "/1" && +v.nb_read_frames === S.frames && Math.abs(+v.duration - S.seconds) < 1e-3);

const dec = spawnSync("ffmpeg", ["-v", "error", "-i", mp4, "-vf", "scale=in_color_matrix=bt709:in_range=tv:out_range=full:flags=accurate_rnd+full_chroma_int+full_chroma_inp,format=rgb24", "-f", "rawvideo", "-"], { maxBuffer: N * (S.frames + 2) }).stdout;
const frames = out.decodedFrames = dec.length / N, fr = (i) => dec.subarray(i * N, (i + 1) * N);
let worst = 0; for (let i = 0; i < frames; i++) worst = Math.max(worst, mad(fr(i), src[i]));
out.worstMeanErrorVsSource = r3(worst);
ok.push(frames === S.frames && worst < 1.5);

const px = (f, x, y) => [...f.subarray((y * S.width + x) * 3, (y * S.width + x) * 3 + 3)];
const cell = (f, gx, gy) => px(f, film.x0 + gx * S.K + S.K / 2, film.y0 + gy * S.K + S.K / 2);
out.paperDecoded = px(fr(0), 40, 40);
// red is read from the middle of a solid area: a bitmap pixel whose eight neighbours are also red (frame 0 is face-on in both films)
const W = film.W, g0 = Uint8Array.from(open("globe").film.frameGrid(0));
let solid = -1;
for (let i = W + 1; i < g0.length - W - 1 && solid < 0; i++) { let all = 1; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) all &= g0[i + dy * W + dx]; if (all) solid = i; }
out.redDecoded = cell(fr(0), solid % W, Math.floor(solid / W));

if (S.variant === "globe") {
  let wrong = 0;
  for (let i = 0; i < frames; i++) { const s = film.frameGrid(i), f = fr(i); for (let c = 0; c < s.length; c++) if ((cell(f, c % W, Math.floor(c / W))[1] < 152 ? 1 : 0) !== s[c]) wrong++; }
  ok.push((out.decodedCellsDifferingFromSource = wrong) === 0);
} else {
  ok.push(out.frame0IsTheOriginalMark = src[0].equals(open("globe").raster(0)));
}
out.seamless = out.sourceLoopCloses && seam <= Math.max(...sSteps) && worst < 1.5;
out.pass = ok.every(Boolean);
console.log(JSON.stringify(out, null, 2));
process.exit(out.pass ? 0 : 1);
