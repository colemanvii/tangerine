#!/usr/bin/env python3
"""Tangerine media pipeline.

Make web derivatives of an original image and record them in the manifest.

    python3 website/tools/media.py <relationship> <id> <original> [--source "repo@sha:path"] [--crop l,t,r,b]

Writes website/media/<relationship>/<id>-{320,640,1280,2200}.webp (never larger
than the original) and records width, height, sizes and provenance in
website/content/media.json. Originals are never modified or copied here.
Requires Pillow (pip install pillow) and, for WebP/AVIF inputs, ffmpeg.
"""
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIDTHS = (320, 640, 1280, 2200)


def load(path):
    try:
        im = Image.open(path)
        im.load()
        return im
    except Exception:
        # Some WebP files decode only through ffmpeg.
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, tmp], check=True)
        im = Image.open(tmp)
        im.load()
        return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("relationship")
    ap.add_argument("id")
    ap.add_argument("original")
    ap.add_argument("--source", default="")
    ap.add_argument("--crop", default="", help="left,top,right,bottom in original pixels")
    ap.add_argument("--quality", type=int, default=84)
    a = ap.parse_args()

    im = load(a.original)
    if a.crop:
        im = im.crop(tuple(int(v) for v in a.crop.split(",")))
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    if has_alpha:
        im = im.convert("RGBA")
        if im.getchannel("A").getextrema()[0] == 255:
            im, has_alpha = im.convert("RGB"), False
    else:
        im = im.convert("RGB")

    out_dir = os.path.join(ROOT, "media", a.relationship)
    os.makedirs(out_dir, exist_ok=True)
    w0, h0 = im.size
    sizes = []
    for w in WIDTHS:
        if w0 - w < 200:  # never upscale; finish at the original width
            w = w0
        h = round(h0 * w / w0)
        name = f"{a.id}-{w}.webp"
        im.resize((w, h), Image.LANCZOS).save(os.path.join(out_dir, name), "WEBP", quality=a.quality, method=6)
        sizes.append(w)
        if w == w0:
            break

    manifest_path = os.path.join(ROOT, "content", "media.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    key = f"{a.relationship}/{a.id}"
    manifest[key] = {"w": w0, "h": h0, "sizes": sizes, "alpha": has_alpha, "source": a.source or os.path.basename(a.original)}
    with open(manifest_path, "w") as f:
        json.dump(dict(sorted(manifest.items())), f, indent=1)
        f.write("\n")
    total = sum(os.path.getsize(os.path.join(out_dir, f"{a.id}-{w}.webp")) for w in sizes)
    print(f"{key}: {w0}x{h0} -> {sizes} ({total // 1024} KB)")


if __name__ == "__main__":
    sys.exit(main())
