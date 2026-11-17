#!/usr/bin/env python3
"""Write the comparison cover. index.html sits beside the three directions; with a prefix, the same page
works as the root of a hosted preview.   python3 tools/cover.py [out] [prefix]"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'index.html'
P = sys.argv[2] if len(sys.argv) > 2 else ''
V6F = (P + '../tangerine-studio-v6/') if not P else 'tangerine-studio-v6/'
STANDALONE = not P

DIRS = [
    ('a', 'a-gallery.html', 'Gallery', 'The painting', 'The home page is a room: a tall orange painting glowing on a white wall, reflected in a dark floor. The name is set on the wall. Its full stop has wandered off and is standing on the floor, looking at the painting. The work is hung in rooms with wall labels.', 'Quietest, most sophisticated. Real atmosphere without gradients.'),
    ('b', 'b-splendid.html', 'Splendid', 'The label', 'The citrus label at contemporary scale. A painted turquoise sky, TANGERINE in navy extended Mona Sans, a heavy cluster of painted fruit and blossom crossing in front of the letters, a gold rule, and the label’s small print: Packed by Tangerine Studio, Georgia.', 'Most surprising, most unmistakably Tangerine. Colour that is alive.'),
    ('c', 'c-mosaic.html', 'Mosaic', 'The work', 'V6’s paper and type, then straight into a dense, saturated mosaic of the real work and studio artwork, each tile in its own world colour. A sprig hangs into the studio statement; the footer is painted.', 'Most work-first. Most flexible for future campaigns and editorials.'),
]

head = f'''<title>Tangerine Design No. 07</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex, nofollow">
<style>
/* Comparison cover for three homepage directions. One deliberate light look: wall white, graphite, orange. */
@font-face {{ font-family: "Mona Sans"; src: url({V6F}assets/fonts/MonaSans-latin-var.woff2) format("woff2"); font-weight: 200 900; font-stretch: 75% 125%; font-display: swap; }}
@font-face {{ font-family: "Instrument Serif"; src: url({V6F}assets/fonts/InstrumentSerif-Italic-latin.woff2) format("woff2"); font-style: italic; font-display: swap; }}
@font-face {{ font-family: "Geist Mono"; src: url({V6F}assets/fonts/GeistMono-latin-var.woff2) format("woff2"); font-weight: 100 900; font-display: swap; }}
:root {{ --wall: #EEECE6; --ink: #111110; --ink-2: #63635D; --line: rgba(17,17,16,.16); --orange: #FF5A1F; --navy: #12306b;
  --sans: "Mona Sans", "Helvetica Neue", Helvetica, Arial, sans-serif; --serif: "Instrument Serif", "Times New Roman", serif; --mono: "Geist Mono", ui-monospace, Menlo, monospace; color-scheme: light; }}
body {{ background: var(--wall); color: var(--ink); font-family: var(--sans); font-size: 17px; line-height: 1.5; margin: 0; -webkit-font-smoothing: antialiased; }}
.wrap {{ padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 28px 72px; max-width: 1500px; margin: 0 auto; }}
@media (min-width: 900px) {{ .wrap {{ padding-left: max(40px, env(safe-area-inset-left, 0px)); padding-right: max(40px, env(safe-area-inset-right, 0px)); }} }}
.mono {{ font-family: var(--mono); font-size: 11.5px; letter-spacing: .01em; text-transform: uppercase; }}
.muted {{ color: var(--ink-2); }}
.top {{ display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding-bottom: 14px; border-bottom: 1px solid var(--line); }}
h1 {{ margin: clamp(36px, 7vw, 100px) 0 0; font-size: clamp(54px, 11vw, 180px); font-stretch: 125%; font-weight: 860; letter-spacing: -.05em; line-height: .84; text-wrap: balance; }}
h1 i {{ display: inline-block; width: .2em; height: .2em; border-radius: 50%; background: var(--orange); margin-left: .03em; }}
.sub {{ font-family: var(--serif); font-style: italic; font-size: clamp(28px, 3.6vw, 56px); line-height: 1.02; margin: .3em 0 0; max-width: 18em; }}
.intro {{ display: grid; gap: 24px 40px; grid-template-columns: minmax(0, 1fr); margin-top: clamp(28px, 5vw, 64px); padding-top: 14px; border-top: 1px solid var(--line); }}
@media (min-width: 900px) {{ .intro {{ grid-template-columns: minmax(0, 6fr) minmax(0, 5fr); }} }}
.intro p {{ margin: 0; font-size: clamp(18px, 1.5vw, 23px); line-height: 1.3; letter-spacing: -.012em; max-width: 32em; }}
.refs {{ list-style: none; padding: 0; margin: 0; }}
.refs li {{ display: flex; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 15px; line-height: 1.4; }}
.refs li:first-child {{ border-top: 1px solid var(--line); }}
.refs li span:first-child {{ flex: 0 0 7.5em; }}
.dir {{ margin-top: clamp(64px, 10vw, 140px); padding-top: 14px; border-top: 1px solid var(--ink); }}
.dir-head {{ display: grid; gap: 18px 40px; grid-template-columns: minmax(0, 1fr); align-items: end; }}
@media (min-width: 900px) {{ .dir-head {{ grid-template-columns: minmax(0, 5fr) minmax(0, 6fr) auto; }} }}
.dir h2 {{ margin: 0; font-size: clamp(40px, 6vw, 96px); font-stretch: 118%; font-weight: 820; letter-spacing: -.045em; line-height: .9; }}
.dir h2 em {{ font-family: var(--serif); font-weight: 400; font-stretch: normal; letter-spacing: -.02em; }}
.dir-head p {{ margin: 0; max-width: 36em; font-size: 16px; line-height: 1.45; }}
.dir-head .verdict {{ font-weight: 600; margin-top: 8px; }}
.open {{ display: inline-flex; align-items: center; gap: 14px; padding: 16px 22px 16px 24px; background: var(--ink); color: var(--wall); text-decoration: none; font-weight: 640; font-stretch: 112%; font-size: 17px; white-space: nowrap; justify-self: start; }}
.open b {{ display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--orange); color: var(--ink); transition: transform .4s cubic-bezier(.16,1,.3,1); }}
.open:hover b {{ transform: translateX(5px); }}
.open:focus-visible {{ outline: 2px solid var(--orange); outline-offset: 3px; }}
.shots {{ display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); margin-top: 28px; align-items: start; }}
@media (min-width: 900px) {{ .shots {{ grid-template-columns: minmax(0, 7fr) minmax(0, 2fr) minmax(0, 2fr); }} }}
.shots .pair {{ display: grid; gap: 16px; }}
.phones {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
@media (min-width: 900px) {{ .phones {{ display: contents; }} }}
figure {{ margin: 0; min-width: 0; }}
figure img {{ width: 100%; height: auto; display: block; box-shadow: 0 0 0 1px var(--line); background: #e2e0da; }}
figcaption {{ padding-top: 8px; }}
.long {{ max-height: 1100px; overflow: hidden; position: relative; }}
.long a {{ display: block; }}
.foot {{ margin-top: 80px; padding-top: 14px; border-top: 1px solid var(--line); display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap; }}
</style>
'''

body = '''
<div class="wrap">
  <header class="top mono"><span>Tangerine</span><span class="muted">Design No. 07 · three homepage directions · 17 November 2026</span></header>
  <h1>Design No. 07<i aria-hidden="true"></i></h1>
  <p class="sub">V6’s structure, with the citrus label’s richness and the painting’s light.</p>
  <div class="intro">
    <p>Three art directions for the homepage, all built on V6: the same type, grid and real work. Each takes a different route to colour, materiality and surprise. Visual language only; once a direction is chosen, it becomes the full site.</p>
    <ul class="refs mono">
      <li><span class="muted">Label</span><span>Foreground fruit, deep vista, lithographic colour, a bold navy sans</span></li>
      <li><span class="muted">Painting</span><span>Light, scale, glow on a white wall, a reflection in the floor</span></li>
      <li><span class="muted">Artwork</span><span>Paintings and botanicals drawn in code for this study. Not Cole’s work</span></li>
      <li><span class="muted">Work</span><span>Freeman Globe, Lil KC, the Joseph Martin hat. Nothing invented</span></li>
    </ul>
  </div>
'''
for k, f, name, sub, desc, verdict in DIRS:
    body += f'''
  <section class="dir" aria-labelledby="h-{k}">
    <div class="dir-head">
      <h2 id="h-{k}">{k.upper()} · {name}<br><em>{sub}</em></h2>
      <div><p>{desc}</p><p class="verdict">{verdict}</p></div>
      <a class="open" href="{P}{f}">Open {name} <b aria-hidden="true">→</b></a>
    </div>
    <div class="shots">
      <div class="pair">
        <figure><img src="{P}screens/{k}-1-desktop-hero.jpg" width="2880" height="1800" loading="lazy" alt="Direction {k.upper()}, {name}: desktop, first screen."><figcaption class="mono muted">Desktop · first screen</figcaption></figure>
        <figure><img src="{P}screens/{k}-2-desktop-work.jpg" width="2880" height="1800" loading="lazy" alt="Direction {k.upper()}, {name}: desktop, the work."><figcaption class="mono muted">Desktop · the work</figcaption></figure>
      </div>
      <div class="phones">
        <figure><img src="{P}screens/{k}-4-phone-hero.jpg" loading="lazy" alt="Direction {k.upper()}, {name}: phone, first screen."><figcaption class="mono muted">Phone · first screen</figcaption></figure>
        <figure class="long"><a href="{P}screens/{k}-5-phone-full.jpg"><img src="{P}screens/{k}-5-phone-full.jpg" loading="lazy" alt="Direction {k.upper()}, {name}: phone, whole page."></a><figcaption class="mono muted">Phone · whole page</figcaption></figure>
      </div>
    </div>
    <p class="mono" style="margin-top:12px"><a href="{P}screens/{k}-3-desktop-full.jpg" style="color:inherit">Desktop · whole page ↗</a></p>
  </section>
'''
body += '''
  <footer class="foot mono muted"><span>Homepage art direction only · V5 and V6 untouched</span><span>Film playback not verified in the test browser</span></footer>
</div>
'''
html = (('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + head + '</head>\n<body>' + body + '</body>\n</html>\n') if STANDALONE else head + body)
OUT.write_text(html)
print('wrote', OUT)
