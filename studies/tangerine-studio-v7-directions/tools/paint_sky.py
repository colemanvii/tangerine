#!/usr/bin/env python3
"""A painted sky over distant ridges and a warm plain: the vista behind a citrus label, repainted.

Original art-direction study for Tangerine Design No. 07, painted in code by Claude. Sky glazes
(turquoise to a warm haze), soft cloud scumbles, two ridges in aerial perspective, a sunlit plain.

    python3 tools/paint_sky.py out.jpg [width height seed]
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

OUT = sys.argv[1] if len(sys.argv) > 1 else 'sky.jpg'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (2880, 1800)
rng = np.random.default_rng(int(sys.argv[4]) if len(sys.argv) > 4 else 9)


def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def vnoise(h, w, sy, sx, oct=3):
    out = np.zeros((h, w), np.float32); amp, tot = 1, 0
    for _ in range(oct):
        gh, gw = max(3, int(h / sy) + 3), max(3, int(w / sx) + 3)
        out += zoom(rng.random((gh, gw)).astype(np.float32), (h / (gh - 2), w / (gw - 2)), order=3)[:h, :w] * amp
        tot += amp; amp *= .5; sy /= 2; sx /= 2
    return out / tot


f = 6; h, w = H // f, W // f
ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
img = np.empty((h, w, 3), np.float32); img[:] = hexc('#5fc0cf')


def glaze(mask, col, a):
    img[:] = img + (hexc(col) - img) * np.clip(mask * a, 0, 1)[..., None]


# sky: horizontal glazes, lighter and warmer toward the horizon
for _ in range(70):
    yc = abs(rng.normal(0, h * .42)); T = rng.uniform(h * .05, h * .2)
    m = gaussian_filter(((np.abs(ys - yc) < T) & (np.abs(xs - rng.uniform(0, w)) < rng.uniform(w * .3, w))).astype(np.float32), 6)
    t = yc / (h * .62)
    col = ['#4fb6c8', '#6cc8d4', '#8ed6dc', '#bfe6dc', '#f2e8c8'][min(4, int(t * 5))]
    glaze(m * (.6 + .6 * vnoise(h, w, 20, 60, 2)), col, rng.uniform(.18, .4))
# clouds: soft warm-white scumbles
for _ in range(26):
    cy, cx = rng.uniform(h * .18, h * .5), rng.uniform(-w * .1, w * 1.1)
    m = ((xs - cx) / rng.uniform(w * .08, w * .22)) ** 2 + ((ys - cy) / rng.uniform(h * .02, h * .06)) ** 2 < 1
    m = gaussian_filter(m.astype(np.float32), 5) * vnoise(h, w, 8, 18, 3)
    glaze(m, rng.choice(['#fbf6e6', '#f4f0e0', '#e6efe4']), rng.uniform(.4, .8))
# far ridge: lavender-blue
ridge1 = h * .6 - (vnoise(1, w, 1, w / 5, 3)[0] - .4) * h * .22 - np.exp(-((np.arange(w) - w * .78) / (w * .1)) ** 2) * h * .14
m = (ys > ridge1[None, :]).astype(np.float32)
glaze(gaussian_filter(m, 1.2), '#8a9cc4', .85)
glaze(gaussian_filter(m * vnoise(h, w, 6, 30, 3), 2), '#b6b2cc', .35)
# near ridge: sage and ochre light
ridge2 = h * .7 - (vnoise(1, w, 1, w / 7, 3)[0] - .4) * h * .16
m = (ys > ridge2[None, :]).astype(np.float32)
glaze(gaussian_filter(m, 1), '#9aa96c', .9)
sunlit = gaussian_filter(m * (vnoise(h, w, 10, 40, 3) > .52), 3)
glaze(sunlit, '#d8c47a', .5)
# the plain: warm, sunlit, with rows of green toward the horizon
plain = h * .79
m = (ys > plain).astype(np.float32)
glaze(gaussian_filter(m, 1), '#c8b874', .95)
treeline = plain + 1 - (vnoise(1, w, 1, 3, 2)[0]) * h * .025
m2 = ((ys < plain + h * .025) & (ys > treeline[None, :])).astype(np.float32)
glaze(gaussian_filter(m2, .8), '#3f6a34', .9)
glaze(gaussian_filter(m * (ys > plain + h * .03) * (vnoise(h, w, 3, 50, 2) > .55), 1.5), '#a9a060', .35)
glaze(gaussian_filter(m * (vnoise(h, w, 4, 30, 2) > .6), 1), '#e2d090', .3)

big = zoom(img, (H / h, W / w, 1), order=3)[:H, :W]
Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
big *= (1 + (vnoise(H, W, 2, 60, 2) - .5) * .04 + (np.sin(X * 2.2) * np.sin(Y * 2.2)) * .012)[..., None]
Image.fromarray((np.clip(big, 0, 1) * 255 + .5).astype(np.uint8)).save(OUT, quality=86, optimize=True, progressive=True)
print('painted', OUT, W, H)
