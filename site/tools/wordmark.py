"""Outline the Tangerine wordmark from Newsreader (SIL OFL) at display size.

Usage:
  python3 tools/wordmark.py <newsreader-opsz-variable.woff2> <wght> <tracking> <out.svg> '<pair adjustments json>'

The site's wordmark was made with:
  wght 400, opsz 72, tracking -20 (units of 2000/em) and
  {"Ta":-55,"an":5,"ge":-10,"er":-5,"ri":10,"in":5,"ne":-5}

The font comes from the @fontsource-variable/newsreader npm package
(files/newsreader-latin-opsz-normal.woff2). Requires fonttools, skia-pathops, uharfbuzz, brotli.
"""
import sys, io, json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

src, wght, track, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
pairs = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
f = TTFont(src)
inst = instantiateVariableFont(f, {'wght': wght, 'opsz': 72})
from fontTools.ttLib.removeOverlaps import removeOverlaps
removeOverlaps(inst)
buf = io.BytesIO(); inst.flavor = None; inst.save(buf); data = buf.getvalue()
face = hb.Face(data); font = hb.Font(face)
text = 'Tangerine'
b = hb.Buffer(); b.add_str(text); b.guess_segment_properties()
hb.shape(font, b, {'kern': True, 'liga': True})
gs = inst.getGlyphSet(); order = inst.getGlyphOrder()
x = 0; paths = []; minx = miny = 1e9; maxx = maxy = -1e9
for i, (info, pos) in enumerate(zip(b.glyph_infos, b.glyph_positions)):
    name = order[info.codepoint]
    pen = SVGPathPen(gs, ntos=lambda v: str(round(v)))
    # flip y: font units are y-up
    tp = TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset))
    gs[name].draw(tp)
    paths.append(pen.getCommands())
    bp = BoundsPen(gs); gs[name].draw(TransformPen(bp, (1, 0, 0, -1, x + pos.x_offset, 0)))
    if bp.bounds:
        a, c, d, e = bp.bounds
        minx, miny, maxx, maxy = min(minx, a), min(miny, c), max(maxx, d), max(maxy, e)
    adv = pos.x_advance + track
    if i < len(text) - 1:
        adv += pairs.get(text[i:i+2], 0)
    x += adv
cap = inst['OS/2'].sCapHeight
pad = 0
vb = f"{minx:.0f} {miny:.0f} {maxx-minx:.0f} {maxy-miny:.0f}"
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><path fill="#1D1D1F" d="{" ".join(paths)}"/></svg>'
open(out, 'w').write(svg)
print(out, 'top', round(miny), 'width', round(maxx-minx), 'cap', cap, 'desc', round(maxy), 'bytes', len(svg))
