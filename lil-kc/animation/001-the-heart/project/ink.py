"""Ink-and-flat-colour renderer for Lil KC key drawings.

Draws geometry (strokes with brush radius, solid masses, flat colour shapes)
to a transparent RGBA image. Grain is procedural; no master pixels are used.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 2  # supersample

def chaikin(pts, closed=True, n=1):
    p = np.asarray(pts, float)
    for _ in range(n):
        q = np.roll(p, -1, axis=0) if closed else p[1:]
        a = p if closed else p[:-1]
        new = np.empty((len(a)*2, 2))
        new[0::2] = a*0.75 + q*0.25
        new[1::2] = a*0.25 + q*0.75
        p = new if closed else np.vstack([p[:1], new, p[-1:]])
    return p

def _poly_mask(size, items):
    m = Image.new("L", (size[0]*SS, size[1]*SS), 0)
    d = ImageDraw.Draw(m)
    for it in items:
        if len(it["outer"]) >= 3:
            d.polygon([tuple(v) for v in chaikin(it["outer"])*SS], fill=255)
    for it in items:
        for h in it.get("holes", []):
            if len(h) >= 3:
                d.polygon([tuple(v) for v in chaikin(h)*SS], fill=0)
    return m

def _stroke_mask(m, strokes):
    d = ImageDraw.Draw(m)
    for s in strokes:
        a = np.asarray(s, float) * SS
        for i, (x, y, r) in enumerate(a):
            r = max(r, 1.0)
            d.ellipse([x-r, y-r, x+r, y+r], fill=255)
            if i:
                x0, y0, r0 = a[i-1]
                d.line([x0, y0, x, y], fill=255, width=max(1, int(round(r0+r))))
    return m

def _noise(size, seed, scales=((1, .5), (3, .3), (9, .2))):
    rng = np.random.default_rng(seed)
    w, h = size
    out = np.zeros((h, w))
    for s, wt in scales:
        n = rng.random((h//s+2, w//s+2))
        im = Image.fromarray((n*255).astype(np.uint8)).resize((w+2*s, h+2*s), Image.BICUBIC).crop((0, 0, w, h))
        out += wt*(np.asarray(im, float)/255-.5)
    return out

def _layer(size, mask, rgb, grain, seed, rough=0.0):
    """Flat colour with hand-printed grain; optional dry-brush edge."""
    w, h = size
    a = np.asarray(mask.resize((w, h), Image.LANCZOS), float)/255
    if rough:
        soft = np.asarray(mask.filter(ImageFilter.GaussianBlur(SS*1.2)).resize((w, h), Image.LANCZOS), float)/255
        a = np.clip((soft + _noise(size, seed+7, ((1, .6), (2, .4)))*rough - .5)*6 + .5, 0, 1)
    n = _noise(size, seed)
    col = np.clip(np.asarray(rgb, float)[None, None, :]*(1 + grain*n[..., None]*2), 0, 255)
    return Image.fromarray(np.dstack([col, a[..., None]*255]).astype(np.uint8), "RGBA")

def render(groups, palette, size=(1536, 1024), seed=1):
    """groups: ordered list of dicts {white, skin, red: [poly], masses: [poly], strokes: [...]}"""
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    for gi, g in enumerate(groups):
        for k, grain in (("white", .012), ("skin", .09), ("red", .07)):
            if g.get(k):
                out.alpha_composite(_layer(size, _poly_mask(size, g[k]), palette[k], grain, seed+gi*10))
        ink = _stroke_mask(_poly_mask(size, g.get("masses", [])), g.get("strokes", []))
        out.alpha_composite(_layer(size, ink, palette["ink"], .05, seed+gi*10+5, rough=.35))
    return out

def on_paper(img, rgb):
    bg = Image.new("RGBA", img.size, tuple(rgb)+(255,))
    bg.alpha_composite(img)
    return bg.convert("RGB")
