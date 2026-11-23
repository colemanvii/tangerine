#!/usr/bin/env python3
"""Lil KC studio — reproducible exports from an exposure sheet.

A revision is a list of drawings, each held for `x` frames (its exposure) at
the project frame rate (12 fps by default). Export expands the sheet into one
PNG per frame, then hands that sequence to FFmpeg. Nothing is interpolated:
what you see on the light table is exactly what is exported.

    python3 kc_export.py <project_dir> <revision_id> [mp4 gif png webm] [--bg paper|transparent] [--scale 1.0]

Formats
  mp4   H.264, yuv420p, paper background (MP4 has no alpha), +faststart
  gif   two-pass palette (palettegen/paletteuse), no dithering noise on flats
  png   numbered RGBA sequence + timing.json, zipped
  webm  VP9 with alpha when --bg transparent (optional)
"""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile, datetime, hashlib

from PIL import Image

LIL_KC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def load_project(project_dir):
    with open(os.path.join(project_dir, "project.json"), encoding="utf-8") as f:
        return json.load(f)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def expand(project, rev):
    """[(drawing_index, src)] — one entry per exposed frame."""
    out = []
    for i, d in enumerate(rev["drawings"]):
        out += [(i, d["src"])] * max(1, int(d.get("x", 1)))
    return out


def render_sequence(project, rev, workdir, bg="paper", scale=1.0):
    canvas = rev.get("canvas") or project["canvas"]
    W, H = int(canvas["w"] * scale), int(canvas["h"] * scale)
    paper = hex_rgb(project["canvas"].get("paper", "#f5e3c7"))
    cache = {}
    frames = expand(project, rev)
    for n, (i, src) in enumerate(frames, 1):
        if i not in cache:
            im = Image.open(os.path.join(LIL_KC_ROOT, src)).convert("RGBA")
            # fit inside the canvas, centred, never upscaled past the canvas
            r = min(W / im.width, H / im.height)
            im = im.resize((max(1, round(im.width * r)), max(1, round(im.height * r))), Image.LANCZOS)
            base = Image.new("RGBA", (W, H), paper + (255,) if bg == "paper" else (0, 0, 0, 0))
            base.alpha_composite(im, ((W - im.width) // 2, (H - im.height) // 2))
            cache[i] = base
        cache[i].save(os.path.join(workdir, "frame-%04d.png" % n))
    return frames, (W, H)


def ffmpeg(args):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + args
    subprocess.run(cmd, check=True)
    shown = " ".join(cmd).replace(LIL_KC_ROOT + os.sep, "")
    return re.sub(r"/\S*kc-export-[^/]+/", "<frames>/", shown)


def export(project_dir, rev_id, formats=("mp4", "gif", "png"), bg="paper", scale=1.0, out_dir=None):
    project = load_project(project_dir)
    rev = next(r for r in project["revisions"] if r["id"] == rev_id)
    fps = int(project.get("fps", 12))
    out_dir = out_dir or os.path.join(project_dir, "exports")
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    stem = f"{project['id']}_{rev_id}_{stamp}"
    results = []
    with tempfile.TemporaryDirectory(prefix="kc-export-") as tmp:
        frames, (W, H) = render_sequence(project, rev, tmp, bg=bg, scale=scale)
        seq = os.path.join(tmp, "frame-%04d.png")
        even = "scale=trunc(iw/2)*2:trunc(ih/2)*2"
        for fmt in formats:
            path = os.path.join(out_dir, f"{stem}.{fmt if fmt != 'png' else 'png.zip'}")
            if fmt == "mp4":
                # MP4 cannot carry alpha: always flatten onto paper
                if bg != "paper":
                    with tempfile.TemporaryDirectory() as t2:
                        render_sequence(project, rev, t2, bg="paper", scale=scale)
                        cmd = ffmpeg(["-framerate", str(fps), "-i", os.path.join(t2, "frame-%04d.png"),
                                      "-vf", even, "-c:v", "libx264", "-preset", "slow", "-crf", "16",
                                      "-pix_fmt", "yuv420p", "-r", str(fps), "-movflags", "+faststart", path])
                else:
                    cmd = ffmpeg(["-framerate", str(fps), "-i", seq, "-vf", even, "-c:v", "libx264",
                                  "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(fps),
                                  "-movflags", "+faststart", path])
            elif fmt == "gif":
                gw = min(W, 960)
                cmd = ffmpeg(["-framerate", str(fps), "-i", seq, "-filter_complex",
                              f"[0:v]scale={gw}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=full"
                              f"{':reserve_transparent=1' if bg == 'transparent' else ''}[p];"
                              f"[b][p]paletteuse=dither=none{':alpha_threshold=128' if bg == 'transparent' else ''}",
                              "-loop", "0", path])
            elif fmt == "webm":
                cmd = ffmpeg(["-framerate", str(fps), "-i", seq, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "24",
                              "-pix_fmt", "yuva420p" if bg == "transparent" else "yuv420p", path])
            elif fmt == "png":
                timing = {"project": project["id"], "revision": rev_id, "fps": fps, "size": [W, H],
                          "background": bg, "frames": len(frames),
                          "exposure_sheet": [{"drawing": d.get("label", str(i + 1)), "src": d["src"], "x": d.get("x", 1)}
                                             for i, d in enumerate(rev["drawings"])]}
                with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
                    for n in range(1, len(frames) + 1):
                        z.write(os.path.join(tmp, "frame-%04d.png" % n), f"{stem}/frame-%04d.png" % n)
                    z.writestr(f"{stem}/timing.json", json.dumps(timing, indent=1))
                cmd = "PIL → numbered RGBA PNG sequence + timing.json (zip)"
            else:
                raise ValueError("unknown format " + fmt)
            results.append({"format": fmt, "file": os.path.relpath(path, LIL_KC_ROOT),
                            "bytes": os.path.getsize(path), "frames": len(frames), "fps": fps,
                            "seconds": round(len(frames) / fps, 3), "command": cmd})
    log = os.path.join(out_dir, "export-log.jsonl")
    with open(log, "a", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps({"at": stamp, "revision": rev_id, "bg": bg, "scale": scale, **r}) + "\n")
    return results


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 2:
        print(__doc__)
        sys.exit(1)
    bg = a[a.index("--bg") + 1] if "--bg" in a else "paper"
    sc = float(a[a.index("--scale") + 1]) if "--scale" in a else 1.0
    fm = [x for x in a[2:] if x in ("mp4", "gif", "png", "webm")] or ["mp4", "gif", "png"]
    for r in export(a[0], a[1], fm, bg, sc):
        print(f"{r['format']:5} {r['frames']} frames @ {r['fps']} fps ({r['seconds']} s)  {r['file']}  {r['bytes']:,} B")
