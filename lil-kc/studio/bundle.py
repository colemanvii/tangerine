#!/usr/bin/env python3
"""Pack a private project into ONE offline HTML file (read-only studio).

    python3 lil-kc/studio/bundle.py ms001-little-show-off [out.html] [--max 1280]

Playback, onion-skin, reference overlay, storyboard and comparison all work
offline. Exposure edits are kept in that browser only; saving, approvals and
FFmpeg export need the local server (studio.py). Images are re-encoded as WebP
at a reduced size for portability; the originals are untouched.

The output contains client artwork: keep it private and never commit it.
"""
import base64, io, json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))


def data_uri(path, max_w):
    im = Image.open(path)
    im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, "WEBP", quality=86, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(1)
    pid = a[0]
    max_w = int(a[a.index("--max") + 1]) if "--max" in a else 1280
    pos = [x for x in a[1:] if not x.startswith("--") and not x.isdigit()]
    out = pos[0] if pos else os.path.join(ROOT, "private", "projects", pid, f"{pid}-studio-offline.html")
    proj = json.load(open(os.path.join(ROOT, "private", "projects", pid, "project.json"), encoding="utf-8"))
    srcs = {r["file"] for r in proj["model"]["refs"]} | {b["panel"] for b in proj["storyboard"]}
    for r in proj["revisions"]:
        srcs |= {d["src"] for d in r["drawings"]}
    assets = {s: data_uri(os.path.join(ROOT, s), max_w) for s in sorted(srcs)}
    html = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
    css = open(os.path.join(HERE, "studio.css"), encoding="utf-8").read()
    js = open(os.path.join(HERE, "studio.js"), encoding="utf-8").read()
    embed = json.dumps({"project": proj, "assets": assets}, ensure_ascii=False).replace("</", "<\\/")
    html = html.replace('<link rel="stylesheet" href="studio.css">', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="studio.js"></script>',
                        f"<script>window.KC_EMBED = {embed};</script>\n<script>\n{js}\n</script>")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {out} ({os.path.getsize(out) / 1e6:.1f} MB, {len(assets)} images)")


if __name__ == "__main__":
    main()
