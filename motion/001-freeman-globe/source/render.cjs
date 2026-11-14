#!/usr/bin/env node
/* Freeman Globe 001 — renders every frame from motion.js and encodes the MP4 and poster.
     node source/render.cjs            → exports/freeman-globe-001.mp4 + -poster.jpg
     node source/render.cjs pendant    → exports/freeman-globe-001-pendant.mp4 + -poster.jpg
   Needs node and ffmpeg (libx264). No browser, no other dependencies. */
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const proj = path.join(__dirname, "..");
const mark = require("./mark.js").load(fs.readFileSync(path.join(proj, "assets/freeman-globe-mark.original.js"), "utf8"));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function open(variant) {
  const film = require("./motion.js").create(mark, variant), S = film.SPEC, paper = hex(S.paper), red = hex(S.red);
  const blank = Buffer.alloc(S.width * S.height * 3);
  for (let i = 0; i < blank.length; i += 3) { blank[i] = paper[0]; blank[i + 1] = paper[1]; blank[i + 2] = paper[2]; }
  function raster(frame) {
    const cov = film.coverage(frame), out = Buffer.from(blank);
    for (let y = 0; y < film.PH; y++) {
      let o = ((film.y0 + y) * S.width + film.x0) * 3;
      for (let x = 0; x < film.PW; x++, o += 3) {
        const a = cov[y * film.PW + x]; if (!a) continue;
        for (let ch = 0; ch < 3; ch++) out[o + ch] = Math.round(paper[ch] + (red[ch] - paper[ch]) * a / 255);
      }
    }
    return out;
  }
  return { film, raster, mark, mp4: path.join(proj, "exports", S.name + ".mp4"), jpg: path.join(proj, "exports", S.name + "-poster.jpg") };
}
module.exports = { open };
if (require.main !== module) return;

const { film, raster, mp4, jpg } = open(process.argv[2]), S = film.SPEC;
fs.mkdirSync(path.dirname(mp4), { recursive: true });
const tmp = require("os").tmpdir(), raw = path.join(tmp, S.name + ".rgb"), still = path.join(tmp, S.name + "-poster.rgb"), fd = fs.openSync(raw, "w");
for (let f = 0; f < S.frames; f++) fs.writeSync(fd, raster(f));
fs.closeSync(fd); fs.writeFileSync(still, raster(S.poster));
const rawIn = (file) => ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${S.width}x${S.height}`, "-r", String(S.fps), "-i", file];
const bt709 = "scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int+full_chroma_inp,format=yuv420p";
const run = (args) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" }); if (r.status) process.exit(r.status); };
run([...rawIn(raw), "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  "-vf", bt709, "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-preset", "veryslow", "-crf", "10",
  "-g", String(S.fps), "-bf", "2", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
  "-c:a", "aac", "-b:a", "128k", "-t", String(S.seconds), "-movflags", "+faststart",
  "-metadata", "title=Freeman Globe 001" + (S.variant === "globe" ? "" : " — " + S.variant), "-metadata", "artist=Tangerine", mp4]);
run([...rawIn(still), "-frames:v", "1", "-vf", "scale=in_range=full:out_range=full:out_color_matrix=bt601:flags=accurate_rnd+full_chroma_int,format=yuvj444p", "-q:v", "1", jpg]);
fs.unlinkSync(raw); fs.unlinkSync(still);
console.log(JSON.stringify({ film: S.variant, mp4, jpg, frames: S.frames, fps: S.fps, degreesPerLoop: S.turn, secondsPerTurn: +(360 / S.turn * S.seconds).toFixed(2) }));
