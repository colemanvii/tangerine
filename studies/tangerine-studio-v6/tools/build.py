#!/usr/bin/env python3
"""Build Tangerine Design No. 06 from src/ into static pages.

Each src/pages/*.html starts with one line of JSON, for example:
  {"out": "work/index.html", "title": "Work — Tangerine", "desc": "...", "nav": "work"}

Optional keys: "globe": true  (load Freeman's original globe code on this page)
               "body": "extra body classes"

Tokens: {{root}} (relative path to the study root) and {{partial:name}} (src/partials/name.html).
The built pages are committed, so the folder deploys as plain static files with no build step.
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def partial(name):
    return (SRC / "partials" / f"{name}.html").read_text().rstrip("\n")


def render(text, meta, root):
    while "{{partial:" in text:
        text = re.sub(r"\{\{partial:([\w-]+)\}\}", lambda m: partial(m.group(1)), text)
    for k in ("title", "desc", "nav", "body"):
        text = text.replace("{{" + k + "}}", str(meta.get(k, "")))
    text = re.sub(r"\{\{cur:(\w+)\}\}", lambda m: ' aria-current="page"' if meta.get("nav") == m.group(1) else "", text)
    text = text.replace("{{globe}}", f'<script src="{root}assets/js/freeman-globe-mark.original.js"></script>\n' if meta.get("globe") else "")
    return text.replace("{{root}}", root)


def main():
    built = []
    for page in sorted((SRC / "pages").glob("*.html")):
        first, body = page.read_text().split("\n", 1)
        meta = json.loads(first)
        out = ROOT / meta["out"]
        root = "../" * (len(pathlib.Path(meta["out"]).parts) - 1)
        html = "\n".join([partial("head"), partial("header"), body.rstrip("\n"), partial("footer")]) + "\n"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(html, meta, root))
        built.append(meta["out"])
    print("built:", ", ".join(built))


if __name__ == "__main__":
    main()
