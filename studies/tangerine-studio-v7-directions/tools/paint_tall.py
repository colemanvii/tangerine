#!/usr/bin/env python3
"""A tall orange field with a low red horizon, on a coral-red ground: a portrait painting study.

Original art-direction study for Tangerine Design No. 07, painted in code by Claude. It is in the
manner of colour-field painting (soft rectangles that seem to give off light), not a copy of any
painting, and not one of Cole's paintings. Glazes at low resolution keep it luminous; brush drags,
bristle and canvas weave are added at full size. No gradient functions.

    python3 tools/paint_stack.py out.jpg [width height seed]
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

OUT = sys.argv[1] if len(sys.argv) > 1 else 'stack.jpg'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1800, 2200)
rng = np.random.default_rng(int(sys.argv[4]) if len(sys.argv) > 4 else 3)


def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def vnoise(h, w, sy, sx, oct=3):
    out = np.zeros((h, w), np.float32); amp, tot = 1, 0
    for _ in range(oct):
        gh, gw = max(3, int(h / sy) + 3), max(3, int(w / sx) + 3)
        out += zoom(rng.random((gh, gw)).astype(np.float32), (h / (gh - 2), w / (gw - 2)), order=3)[:h, :w] * amp
        tot += amp; amp *= .5; sy /= 2; sx /= 2
    return out / tot


f = 8; h, w = H // f, W // f
ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
lo = np.empty((h, w, 3), np.float32)
lo[:] = hexc('#c43c22')                                               # coral-red ground
for c, a in (('#b32e1c', .5), ('#d4482a', .4), ('#a8281a', .3)):       # the ground is painted too
    m = gaussian_filter((vnoise(h, w, 18, 30, 3) > .5).astype(np.float32), 3)
    lo += (hexc(c) - lo) * (m * a)[..., None]


def field(x0, x1, y0, y1, cols, n, soft=3.5, hot=None):
    """a soft rectangle built from n glazes; its edge breathes"""
    d = np.minimum.reduce([xs - x0, x1 - xs, ys - y0, y1 - ys]) + (vnoise(h, w, 16, 16, 3) - .5) * 3
    mask = np.clip((d + 1) / soft, 0, 1); mask = mask * mask * (3 - 2 * mask)
    acc = lo.copy()
    for _ in range(n):
        cx, cy = rng.uniform(x0, x1), rng.uniform(y0, y1)
        L, T = rng.uniform((x1 - x0) * .4, (x1 - x0) * 1.1), rng.uniform((y1 - y0) * .15, (y1 - y0) * .7)
        g = ((np.abs(xs - cx) < L / 2) & (np.abs(ys - cy) < T / 2)).astype(np.float32)
        g = gaussian_filter(g, rng.uniform(2, 5)) * (0.7 + .6 * vnoise(h, w, T / 2 + 1, L / 3 + 1, 2))
        acc += (hexc(cols[rng.integers(len(cols))]) - acc) * np.clip(g * rng.uniform(.18, .4), 0, 1)[..., None]
    if hot:
        cx, cy, rx, ry, col = hot
        for _ in range(18):
            g = ((np.abs(xs - rng.normal(cx, rx * .2)) < rx * rng.uniform(.5, 1.1)) & (np.abs(ys - rng.normal(cy, ry * .2)) < ry * rng.uniform(.3, .8))).astype(np.float32)
            acc += (hexc(col) - acc) * np.clip(gaussian_filter(g, 6) * .16, 0, 1)[..., None]
    lo[:] = lo + (acc - lo) * gaussian_filter(mask, 1)[..., None]


mx = w * .075
field(mx, w - mx, h * .06, h * .935, ['#ff6a12', '#f86010', '#ff7818', '#ff7016', '#f45a0e'], 120, soft=6.5,
      hot=(w * .5, h * .4, w * .32, h * .14, '#ff9026'))
# a low horizon of red breathing across the field
for _ in range(14):
    yc = rng.normal(h * .645, h * .008)
    g = ((np.abs(ys - yc) < rng.uniform(h * .002, h * .006)) & (xs > mx + rng.uniform(0, 6)) & (xs < w - mx - rng.uniform(0, 6))).astype(np.float32)
    g = gaussian_filter(g, rng.uniform(1.5, 3.5)) * (0.6 + .8 * vnoise(h, w, 6, 40, 2))
    lo += (hexc('#e0441c') - lo) * np.clip(g * .1, 0, 1)[..., None]
field(mx + 2, w - mx - 2, h * .68, h * .93, ['#ff7a1a', '#ff8420', '#ff7016'], 40, soft=5, hot=(w * .5, h * .8, w * .3, h * .07, '#ff9a2c'))
img = zoom(lo, (H / h, W / w, 1), order=3)[:H, :W]
drag = vnoise(H, W, 14, 700, 4); bristle = vnoise(H, W, 1.6, 90, 2); mottle = vnoise(H, W, 120, 220, 3); dry = vnoise(H, W, 14, 160, 3)
lum = 1 + (drag - .5) * .06 + (bristle - .5) * .04 + (mottle - .5) * .1 - np.clip(.34 - dry, 0, 1) * .14
img *= lum[..., None]
Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
img *= (1 + (np.sin(X * 2.2) * np.sin(Y * 2.2)) * .015)[..., None]
Image.fromarray((np.clip(img, 0, 1) * 255 + .5).astype(np.uint8)).save(OUT, quality=88, optimize=True, progressive=True)
print('painted', OUT, W, H)
