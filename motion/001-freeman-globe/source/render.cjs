#!/usr/bin/env node
/* Freeman Globe 001 — renders every frame from motion.js and encodes the MP4 and poster.
     node source/render.cjs            → exports/freeman-globe-001.mp4 + -poster.jpg
   Needs node and ffmpeg (libx264). No browser, no other dependencies. */
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const here = __dirname, proj = path.join(here, "..");
const mark = require("./mark.js").load(fs.readFileSync(path.join(proj, "assets/freeman-globe-mark.original.js"), "utf8"));
const film = require("./motion.js").create(mark), S = film.SPEC;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const paper = hex(S.paper), red = hex(S.red);

function raster(frame) {
  const g = film.frameGrid(frame), out = Buffer.alloc(S.width * S.height * 3);
  for (let i = 0; i < out.length; i += 3) { out[i] = paper[0]; out[i + 1] = paper[1]; out[i + 2] = paper[2]; }
  for (let y = 0; y < film.H; y++) for (let x = 0; x < film.W; x++) if (g[y * film.W + x])
    for (let dy = 0; dy < S.K; dy++) {
      let o = ((film.y0 + y * S.K + dy) * S.width + film.x0 + x * S.K) * 3;
      for (let dx = 0; dx < S.K; dx++) { out[o++] = red[0]; out[o++] = red[1]; out[o++] = red[2]; }
    }
  return out;
}
module.exports = { film, raster };
if (require.main !== module) return;

const out = path.join(proj, "exports"), mp4 = path.join(out, "freeman-globe-001.mp4"), jpg = path.join(out, "freeman-globe-001-poster.jpg");
fs.mkdirSync(out, { recursive: true });
const raw = path.join(require("os").tmpdir(), "freeman-globe-001.rgb"), fd = fs.openSync(raw, "w");
for (let f = 0; f < S.frames; f++) fs.writeSync(fd, raster(f));
fs.closeSync(fd);
const size = `${S.width}x${S.height}`, rawIn = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", size, "-r", String(S.fps), "-i", raw];
const bt709 = "scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int+full_chroma_inp,format=yuv420p";
const run = (args) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" }); if (r.status) process.exit(r.status); };
run([...rawIn, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  "-vf", bt709, "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "veryslow", "-crf", "10",
  "-g", String(S.fps), "-bf", "2", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
  "-c:a", "aac", "-b:a", "128k", "-t", String(S.seconds), "-movflags", "+faststart",
  "-metadata", "title=Freeman Globe 001", "-metadata", "artist=Tangerine", mp4]);
run([...rawIn, "-frames:v", "1", "-vf", "scale=in_range=full:out_range=full:out_color_matrix=bt601:flags=accurate_rnd+full_chroma_int,format=yuvj444p", "-q:v", "1", jpg]);
fs.unlinkSync(raw);
console.log(JSON.stringify({ mp4, jpg, frames: S.frames, fps: S.fps, degreesPerLoop: S.turn, secondsPerTurn: +(360 / S.turn * S.seconds).toFixed(2) }));
