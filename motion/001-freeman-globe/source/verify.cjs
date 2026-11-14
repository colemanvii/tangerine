#!/usr/bin/env node
/* Freeman Globe 001 — checks the export against the source.
     node source/verify.cjs
   1. The script in the mark is the production Freeman bitmap, pixel for pixel.
   2. The loop closes in the source: frame 240 is frame 0.
   3. The MP4 is 1080 × 1920, 30 fps, 240 frames, 8.000 s.
   4. Every decoded frame matches its source frame; ivory and red decode to the brand values.
   5. The seam (last frame → first) moves no more than any other pair of neighbouring frames. */
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
out.paperDecoded = px(fr(0), 40, 40); out.redDecoded = px(fr(0), 540, 1071);   // inside the script's underline stroke
const steps = []; for (let i = 0; i < frames - 1; i++) steps.push(mad(fr(i), fr(i + 1)));
out.neighbourStep = { min: +Math.min(...steps).toFixed(3), mean: +(steps.reduce((x, y) => x + y) / steps.length).toFixed(3), max: +Math.max(...steps).toFixed(3) };
out.seamStep = +mad(fr(frames - 1), fr(0)).toFixed(3);
out.seamless = out.sourceLoopCloses && out.seamStep <= out.neighbourStep.max;
console.log(JSON.stringify(out, null, 2));
process.exit(out.seamless && out.scriptMatchesProduction && frames === S.frames ? 0 : 1);
