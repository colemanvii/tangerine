#!/usr/bin/env python3
"""Build the three Design No. 07 homepage directions from src/*.html.

Each source starts with one line of JSON: {"out": "a-gallery.html", "title": "...", "foot": "foot-painted", "label": "A · Gallery"}
The header, footer and scripts are V6's, loaded from ../tangerine-studio-v6/.
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
V6 = '../tangerine-studio-v6/'

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>{title}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='%23FF5A1F'/%3E%3C/svg%3E">
<link rel="stylesheet" href="{v6}assets/css/v6.css">
<link rel="stylesheet" href="assets/css/directions.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body class="{body}" id="top">
<header class="site-head" data-head="{headtone}">
  <a class="brand" href="index.html" aria-label="Tangerine">Tangerine<i class="brand-dot" aria-hidden="true"></i></a>
  <nav class="nav" aria-label="Main"><a href="#work">Work</a><a href="#studio">Studio</a><a href="#hello">Say hello</a></nav>
  <p class="clock mono"><span data-clock>Georgia, USA</span></p>
  <button class="menu-btn mono" type="button" aria-expanded="false" aria-controls="menu"><span>Menu</span><i aria-hidden="true"></i></button>
</header>
<div class="menu" id="menu" data-tone="orange" hidden>
  <nav class="menu-nav" aria-label="Menu"><a href="#top"><span class="mono">00</span>Index</a><a href="#work"><span class="mono">01</span>Work</a><a href="#studio"><span class="mono">02</span>Studio</a><a href="#hello"><span class="mono">03</span>Say hello</a></nav>
  <div class="menu-foot mono"><span data-clock>Georgia, USA</span><a href="https://www.instagram.com/ex.tangerina/" target="_blank" rel="noopener noreferrer">Instagram ↗</a></div>
</div>
<main id="main">
'''

FOOT = '''</main>
<footer class="site-foot {foot}" id="hello" data-tone="orange">
  <div class="foot-top mono"><span>Say hello</span><span>For projects, collaborations, and characters who need a home</span></div>
  <a class="hello" href="https://www.instagram.com/ex.tangerina/" target="_blank" rel="noopener noreferrer" aria-label="Say hello: Tangerine on Instagram"><span class="hello-t" data-fit>Say hello<i class="hello-dot" aria-hidden="true"></i></span></a>
  <div class="foot-grid">
    <div><span class="mono lbl">Instagram</span><p><a href="https://www.instagram.com/ex.tangerina/" target="_blank" rel="noopener noreferrer">@ex.tangerina&nbsp;↗</a></p></div>
    <div><span class="mono lbl">Studio</span><p>Georgia, USA,<br>and wherever the work is.</p></div>
    <div><span class="mono lbl">Right now</span><p data-now>Somewhere in Georgia, the studio is probably working.</p></div>
    <div><span class="mono lbl">Elsewhere</span><p><a href="#work">Work</a><br><a href="#studio">Studio</a></p></div>
  </div>
  <div class="foot-base mono"><span>© 2026 Tangerine</span><span>Design No. 07 · direction {label} · a study</span><a href="#top">Back to top ↑</a></div>
</footer>
<script src="{v6}assets/js/freeman-globe-mark.original.js"></script>
<script src="{v6}assets/js/v6.js" defer></script>
</body>
</html>
'''


def main():
    for src in sorted((ROOT / 'src').glob('*.html')):
        first, body = src.read_text().split('\n', 1)
        m = json.loads(first)
        body = body.replace('{{v6}}', V6)
        while '{{partial:' in body:
            body = re.sub(r'\{\{partial:([\w-]+)\}\}', lambda k: (ROOT / '..' / 'tangerine-studio-v6' / 'src' / 'partials' / f'{k.group(1)}.html').read_text().strip(), body)
        html = HEAD.format(title=m['title'], v6=V6, body=m.get('body', ''), headtone=m.get('head', 'paper')) + body.rstrip() + '\n' + FOOT.format(foot=m.get('foot', ''), label=m['label'], v6=V6)
        (ROOT / m['out']).write_text(html)
        print('built', m['out'])


if __name__ == '__main__':
    main()
