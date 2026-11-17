#!/usr/bin/env python3
"""A monumental orange field, painted in glazes.

Original art-direction study for Tangerine Design No. 07. It is not a copy of any existing painting,
and it is not one of Cole's paintings: it stands in for the *quality* of light the brief describes.

Built like a colour-field painting: broad translucent glazes over a carmine ground (painted at low
resolution, so they stay soft and luminous), then the brush: long horizontal drags, bristle striation
and a few dry passages, then canvas weave. The edge of the field breathes into the ground. No gradient
functions: every tone comes from overlapping strokes.

    python3 tools/paint_field.py out.jpg [width height seed]
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

OUT = sys.argv[1] if len(sys.argv) > 1 else 'field.jpg'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (2800, 1900)
SEED = int(sys.argv[4]) if len(sys.argv) > 4 else 11
rng = np.random.default_rng(SEED)


def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def vnoise(h, w, sy, sx, oct=3):
    """value noise, separately scaled in y and x (sx >> sy gives horizontal drags)"""
    out = np.zeros((h, w), np.float32); amp, tot = 1, 0
    for _ in range(oct):
        gh, gw = max(3, int(h / sy) + 3), max(3, int(w / sx) + 3)
        g = rng.random((gh, gw)).astype(np.float32)
        out += zoom(g, (h / (gh - 2), w / (gw - 2)), order=3)[:h, :w] * amp
        tot += amp; amp *= .5; sy /= 2; sx /= 2
    return out / tot


# ---- 1. glazes at low resolution: soft, luminous, layered ----
f = 8
h, w = H // f, W // f
fx0, fx1, fy0, fy1 = w * .08, w * .92, h * .1, h * .9
lo = np.empty((h, w, 3), np.float32); lo[:] = hexc('#3e0a05')


def glaze(cx, cy, L, T, col, a, soft):
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    m = ((np.abs(xs - cx) < L / 2) & (np.abs(ys - cy) < T / 2)).astype(np.float32)
    m = gaussian_filter(m, soft)
    m *= 0.75 + 0.5 * vnoise(h, w, T / 2 + 1, L / 3 + 1, 2)
    lo[:] += (col - lo) * np.clip(m * a, 0, 1)[..., None]


DEEP = ['#b81d08', '#cc2808', '#a01606']
BODY = ['#ff5508', '#ff620c', '#f44a08', '#ff6c10']
HOT = ['#ff8414', '#ff9018', '#ff7a12']
for _ in range(40):   # deep underpainting
    glaze(rng.uniform(fx0, fx1), rng.uniform(fy0, fy1), rng.uniform(w * .3, w * .9), rng.uniform(h * .1, h * .4), hexc(DEEP[rng.integers(3)]), rng.uniform(.4, .7), rng.uniform(3, 7))
for _ in range(90):   # the body of orange
    glaze(rng.uniform(fx0 + 6, fx1 - 6), rng.uniform(fy0 + 6, fy1 - 6), rng.uniform(w * .25, w * .8), rng.uniform(h * .06, h * .3), hexc(BODY[rng.integers(4)]), rng.uniform(.18, .38), rng.uniform(2, 6))
for _ in range(40):   # the light: hotter, slightly above centre
    glaze(rng.normal(w * .5, w * .08), rng.normal(h * .42, h * .07), rng.uniform(w * .2, w * .6), rng.uniform(h * .04, h * .16), hexc(HOT[rng.integers(3)]), rng.uniform(.12, .26), rng.uniform(3, 8))
for _ in range(16):   # depth at the foot and the edges
    side = rng.integers(3)
    cx = [fx0 + w * .05, fx1 - w * .05, rng.uniform(fx0, fx1)][side]
    cy = [rng.uniform(fy0, fy1), rng.uniform(fy0, fy1), fy1 - h * .08][side]
    glaze(cx, cy, [w * .08, w * .08, w * .8][side], [h * .7, h * .7, h * .12][side], hexc(DEEP[rng.integers(3)]), rng.uniform(.15, .3), 6)

# the field's edge breathes into the ground
ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
d = np.minimum.reduce([xs - fx0, fx1 - xs, ys - fy0, fy1 - ys]) + (vnoise(h, w, 40, 40, 3) - .5) * 2.4
m = np.clip((d + 1.2) / 4.8, 0, 1); m = m * m * (3 - 2 * m)
ground = hexc('#3e0a05') * (0.85 + 0.3 * vnoise(h, w, 30, 30, 2))[..., None]
lo = ground + (lo - ground) * gaussian_filter(m, 1.2)[..., None]

img = zoom(lo, (H / h, W / w, 1), order=3)[:H, :W]

# ---- 2. the brush: long horizontal drags and bristle striation ----
drag = vnoise(H, W, 14, 700, 4)                # broad horizontal drags
bristle = vnoise(H, W, 1.6, 90, 2)             # fine bristle lines
dry = vnoise(H, W, 14, 160, 3)
mottle = vnoise(H, W, 120, 260, 3)
lum = 1 + (drag - .5) * .075 + (bristle - .5) * .045 + (mottle - .5) * .15
lum -= np.clip(.36 - dry, 0, 1) * .18          # a few dry, broken passages
img *= lum[..., None]

# ---- 3. canvas ----
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
weave = np.sin(xx * 2.2) * np.sin(yy * 2.2) * .5 + .5
img *= (1 + (weave - .5) * .03)[..., None]

img = np.clip(img, 0, 1)
Image.fromarray((img * 255 + .5).astype(np.uint8)).save(OUT, quality=88, optimize=True, progressive=True)
print('painted', OUT, W, H)
