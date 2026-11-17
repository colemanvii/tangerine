#!/usr/bin/env python3
"""Build Tangerine Design No. 05 from src/ into static pages.

Each src/pages/*.html starts with one line of JSON:
  {"out": "work/index.html", "title": "...", "desc": "...", "nav": "work", "globe": false, "iron": false}
then the page's <main> content. {{partial:name}} pulls src/partials/name.html; {{root}} is the relative
path back to the site root. The masthead, hello block and night footer are the same on every page.

    python3 tools/build.py
"""
import json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent.parent
SRC = HERE / "src"
NAV = [("work", "Work", "work/index.html"), ("play", "Play", "play/index.html"),
       ("notes", "Notes", "notes/index.html"), ("about", "About", "about/index.html")]
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18' shape-rendering='crispEdges'%3E"
           "%3Cpath fill='%234e6b43' d='M12 0h3v1h-3zM10 1h6v1h-6zM9 2h6v1H9z'/%3E%3Cpath fill='%23e15a22' d='M5 4h8v1H5zM3 5h12v1H3zM2 6h14v1H2zM1 7h16v5H1zM2 12h14v2H2zM3 14h12v1H3zM5 15h8v1H5zM7 16h4v1H7z'/%3E%3C/svg%3E")
INSTAGRAM = "https://www.instagram.com/ex.tangerina/"


def partial(name):
    return (SRC / "partials" / f"{name}.html").read_text().rstrip("\n")


def head(m, root):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{m['title']}</title>
<meta name="robots" content="noindex">
<meta name="description" content="{m['desc']}">
<meta name="theme-color" content="#f7f6f2">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&amp;family=IM+Fell+English:ital@0;1&amp;family=Yellowtail&amp;display=swap">
<link rel="icon" href="{FAVICON}">
<link rel="stylesheet" href="{root}assets/css/tangerine.css">
</head>
<body class="p-{m['nav']}">
<a class="skip" href="#main">Skip to the content</a>"""


def mast(m, root):
    links = "".join(
        f'<a href="{root}{href}"{" aria-current=\"page\"" if key == m["nav"] else ""}>{label}</a>'
        for key, label, href in NAV)
    return f"""
<header class="wrap">
  <div class="mast">
    <a class="home" href="{root}index.html" aria-label="Tangerine, home">
      <svg class="mk-mark" viewBox="0 0 100 100" aria-hidden="true"></svg>
      <span>Tangerine</span>
    </a>
    <nav class="nav cap" aria-label="Main">{links}<a class="hi" href="#hello">Hello</a></nav>
  </div>
</header>"""


def hello(m, root):
    lead = m.get("hello", "For projects, ideas, and people doing interesting things")
    return f"""
<section class="hello wrap" id="hello" aria-labelledby="hello-h">
  <div class="run"><span class="cap muted">{lead}</span><span class="cap muted">Instagram, for now</span></div>
  <a class="big-hello" id="hello-h" href="{INSTAGRAM}" target="_blank" rel="noopener noreferrer" aria-label="Say hello. Tangerine on Instagram, opens in a new tab"><span>Say hello.</span><svg viewBox="0 0 75 75" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M8 67L67 8M17 8H67V58"/></svg></a>
  <div class="hello-foot">
    <span class="cap">@ex.tangerina</span>
    <p class="clock" data-clock>Made in Georgia.</p>
  </div>
</section>"""


def foot(m, root):
    count = ('<span><span id="count" aria-live="polite">Brands built this visit: 0</span>'
             '<button class="cap erase" id="erase" type="button" hidden>Erase the evidence</button></span>'
             if m.get("iron") else '<span>Made in Georgia.<br><span class="muted">ColeCalfee.com lives here now.</span></span>')
    links = "".join(f'<a href="{root}{href}">{label}</a>' for _, label, href in NAV)
    return f"""
<footer class="foot" id="foot" data-sky>
  <div class="peek" aria-hidden="true"><span class="tg" data-tg="peek"></span></div>
  <svg class="stars" aria-hidden="true"></svg>
  <div class="wrap">
  <div class="sky">
    <p class="motto"><span class="motto-cap cap muted">The principle</span>In cyberspace<br>as it is <em>in heaven.</em></p>
    <figure class="constellation">
      <span class="fig cap muted">Fig. · Visible from Georgia, most clear nights</span>
      <svg class="c" viewBox="0 0 100 100" role="img" aria-label="A constellation in the shape of the Tangerine maker's mark: a fruit with a T inside and a leaf on top."></svg>
      <figcaption class="name">Citrus Major</figcaption>
    </figure>
  </div>
  <nav class="footnav cap" aria-label="Footer"><a href="{root}index.html">Tangerine</a>{links}<a href="{INSTAGRAM}" target="_blank" rel="noopener noreferrer">Instagram ↗</a></nav>
  <div class="colophon cap">
    <span>© <span data-year>2026</span> Tangerine<br><span class="muted">Design No. 05 · The Studio · a study</span></span>
    <span class="muted">Set in the Fell Types, digitized by Igino Marini; Archivo by Omnibus-Type; and Yellowtail by Astigmatic, for the labels. The tangerine is a resident, not a mascot.</span>
    {count}
  </div>
  </div>
</footer>

<a class="slice" id="slice" href="#main" aria-label="Back to the top">
  <svg viewBox="-22 -22 44 44" aria-hidden="true"><g id="slice-g"></g></svg>
</a>"""


def tail(m, root):
    iron = ""
    if m.get("iron"):
        iron = """
<div class="burns" id="burns" aria-hidden="true"></div>
<div class="hand" id="hand" aria-hidden="true"><svg viewBox="0 0 80 300" data-iron data-hot></svg></div>
<button class="hangup cap" id="hangup" type="button">Hang the iron back up · Esc</button>"""
    globe = (f'\n<!-- Freeman Globe 001: the original mark code, byte for byte (SHA-256 a6e063f9…). Read, never redrawn. -->'
             f'\n<script src="{root}assets/js/freeman-globe-mark.original.js"></script>') if m.get("globe") else ""
    return f"""{iron}{globe}
<script src="{root}assets/js/tangerine.js"></script>
</body>
</html>
"""


def build():
    for page in sorted((SRC / "pages").glob("*.html")):
        first, body = page.read_text().split("\n", 1)
        m = json.loads(first)
        depth = m["out"].count("/")
        root = "../" * depth
        body = re.sub(r"\{\{partial:([\w-]+)\}\}", lambda x: partial(x.group(1)), body)
        body = body.replace("{{root}}", root).rstrip("\n")
        html = (head(m, root) + mast(m, root) + f'\n\n<main id="main">\n{body}\n' + hello(m, root) +
                "\n</main>\n" + foot(m, root) + tail(m, root))
        out = HERE / m["out"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print("built", m["out"])


if __name__ == "__main__":
    build()
