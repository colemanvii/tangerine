#!/usr/bin/env python3
"""Tangerine botanicals, painted with light.

Original art-direction studies for Design No. 07, drawn in code by Claude after the *quality* of a
stone-printed citrus label (lush, volumetric fruit; glossy two-sided leaves; white blossom), not after
any particular label. Each object is a small surface: the peel is an oblate sphere with pores, a leaf is
a creased blade, a petal is a cup. They are lit from the upper left, with a warm terminator, a soft
satin highlight and a reflected light from the surroundings, then given a little painterly mottle.
Transparent backgrounds.

    python3 tools/botanical.py outdir
writes cluster.png, sprig.png, cut.png (the site uses WebP conversions of these)
"""
import math, os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
rng = np.random.default_rng(5)
L = np.array([-.52, -.62, .58], np.float32); L /= np.linalg.norm(L)        # light: upper left, toward viewer
V = np.array([0, 0, 1], np.float32); Hh = (L + V) / np.linalg.norm(L + V)


def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def ramp(x, stops):
    """x in 0..1 -> colour along stops [(pos, hex)]"""
    x = np.clip(x, 0, 1); pos = np.array([p for p, _ in stops], np.float32); cols = np.array([hexc(c) for _, c in stops])
    out = np.empty(x.shape + (3,), np.float32)
    for ch in range(3): out[..., ch] = np.interp(x, pos, cols[:, ch])
    return out


def vnoise(h, w, s, oct=3):
    out = np.zeros((h, w), np.float32); amp, tot = 1, 0
    for _ in range(oct):
        gh, gw = max(3, int(h / s) + 3), max(3, int(w / s) + 3)
        g = rng.random((gh, gw)).astype(np.float32)
        out += zoom(g, (h / (gh - 2), w / (gw - 2)), order=3)[:h, :w] * amp
        tot += amp; amp *= .5; s /= 2
    return out / tot


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.rgb = np.zeros((h, w, 3), np.float32); self.a = np.zeros((h, w), np.float32)

    def put(self, x0, y0, col, alpha):
        h, w = alpha.shape
        X0, Y0 = max(0, x0), max(0, y0); X1, Y1 = min(self.w, x0 + w), min(self.h, y0 + h)
        if X1 <= X0 or Y1 <= Y0: return
        sl = (slice(Y0 - y0, Y1 - y0), slice(X0 - x0, X1 - x0))
        a = alpha[sl]; c = col[sl]
        R = self.rgb[Y0:Y1, X0:X1]; A = self.a[Y0:Y1, X0:X1]
        R[:] = R * (1 - a[..., None]) + c * a[..., None]
        A[:] = A + a * (1 - A)

    def shadow(self, x0, y0, alpha, dx, dy, blur, strength):
        """a soft contact shadow cast down-right onto what is already painted"""
        h, w = alpha.shape; pad = int(blur * 3 + max(abs(dx), abs(dy)))
        s = np.zeros((h + 2 * pad, w + 2 * pad), np.float32); s[pad:pad + h, pad:pad + w] = alpha
        s = gaussian_filter(s, blur) * strength
        X0, Y0 = x0 - pad + dx, y0 - pad + dy
        hh, ww = s.shape
        Xa, Ya = max(0, X0), max(0, Y0); Xb, Yb = min(self.w, X0 + ww), min(self.h, Y0 + hh)
        if Xb <= Xa or Yb <= Ya: return
        ss = s[Ya - Y0:Yb - Y0, Xa - X0:Xb - X0]
        R = self.rgb[Ya:Yb, Xa:Xb]; A = self.a[Ya:Yb, Xa:Xb]
        k = ss * A                                     # only darken where something is painted
        R[:] = R * (1 - k[..., None]) + hexc('#2a0c04') * k[..., None]

    def save(self, path):
        self.rgb = np.nan_to_num(self.rgb); self.a = np.nan_to_num(self.a)
        out = np.dstack([np.clip(self.rgb, 0, 1) * 255, np.clip(self.a, 0, 1) * 255]).astype(np.uint8)
        Image.fromarray(out, 'RGBA').save(path, optimize=True); print('painted', path, self.w, self.h)


def shade(N, base_stops, spec=.3, shin=16, bounce=None, bounce_k=.18, wrap=.38):
    ndl = (N @ L); lam = np.clip((ndl + wrap) / (1 + wrap), 0, 1)
    col = ramp(lam, base_stops)
    s = np.clip(N @ Hh, 0, 1) ** shin * spec
    col = col + s[..., None] * (1 - col) * .9
    if bounce is not None:
        rim = np.clip(1 - N[..., 2], 0, 1) ** 2.2 * np.clip(-ndl + .2, 0, 1)
        col = col + (hexc(bounce) - col) * (rim * bounce_k)[..., None]
    return col


def normals_from_height(z, k=1.0):
    gy, gx = np.gradient(z * k)
    N = np.dstack([-gx, -gy, np.ones_like(z)]); return N / np.linalg.norm(N, axis=2, keepdims=True)


FRUIT = [(0, '#4a0c02'), (.16, '#8a1a04'), (.36, '#d43a08'), (.58, '#ff5e0e'), (.8, '#ff8424'), (1, '#ffae52')]
LEAF = [(0, '#031a10'), (.3, '#0a3420'), (.56, '#1d6034'), (.8, '#3f8a40'), (1, '#8ec060')]
LEAF_UNDER = [(0, '#0e2e1c'), (.4, '#2c5a34'), (.75, '#5e8e52'), (1, '#a4c486')]
PETAL = [(0, '#8e9a7a'), (.35, '#d6d8c4'), (.7, '#f6f4ea'), (1, '#ffffff')]


def fruit(cv, cx, cy, r, sq=.88, bounce='#2b6f7a', pores=True, calyx=True):
    pad = 4; x0, y0 = int(cx - r - pad), int(cy - r * sq - pad); w, h = int(2 * r + 2 * pad), int(2 * r * sq + 2 * pad)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xs + x0 - cx) / r; ny = (ys + y0 - cy) / (r * sq); d = np.sqrt(nx * nx + ny * ny)
    alpha = np.clip((1 - d) * r, 0, 1)
    nz = np.sqrt(np.clip(1 - d * d, 0, 1))
    N = np.dstack([nx, ny * sq, nz]); N /= np.linalg.norm(N, axis=2, keepdims=True) + 1e-6
    if pores:   # peel pores bend the light
        bump = vnoise(h, w, max(2, r / 90), 2) + .5 * vnoise(h, w, max(2, r / 30), 2)
        gy, gx = np.gradient(bump); k = r * .0075
        N = N + np.dstack([-gx * k, -gy * k, np.zeros_like(gx)]) * nz[..., None]
        N /= np.linalg.norm(N, axis=2, keepdims=True) + 1e-6
    col = shade(N, FRUIT, spec=.42, shin=22, bounce=bounce, bounce_k=.2)
    col *= (1 + (vnoise(h, w, r / 3, 3) - .5) * .12)[..., None]      # painterly mottle
    cv.shadow(x0, y0, alpha, int(r * .08), int(r * .12), r * .12, .45)
    cv.put(x0, y0, col, alpha)
    if calyx:   # where the stem was: a small dark star, foreshortened, near the top
        sx, sy = cx + r * .1, cy - r * sq * .78
        star = np.zeros((h, w), np.float32)
        a = np.arctan2(ys + y0 - sy, (xs + x0 - sx) / 1.0); rr = np.hypot((xs + x0 - sx), (ys + y0 - sy) / .5)
        lim = r * (.07 + .05 * np.cos(5 * a) ** 2)
        star = np.clip((lim - rr) / 1.5, 0, 1) * alpha
        cv.put(x0, y0, np.broadcast_to(hexc('#3c4a1c'), (h, w, 3)).copy(), star * .9)


def leaf(cv, x, y, ang, Ln, Wd, bend=.1, twist=0.0, under=False, bounce='#2b6f7a'):
    """a creased, glossy citrus blade from (x, y) at angle ang"""
    ca, sa = math.cos(ang), math.sin(ang)
    ext = Ln + Wd * 2
    x0, y0 = int(x - ext), int(y - ext); w = h = int(2 * ext)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = xs + x0 - x, ys + y0 - y
    u = dx * ca + dy * sa; wv = -dx * sa + dy * ca
    t = u / Ln
    mid = bend * Ln * t * t
    v = wv - mid
    prof = Wd * np.sin(np.pi * np.clip(t, 0, 1) ** .78) * np.clip(1 - t, 0, 1) ** .22
    prof = np.where((t > 0) & (t < 1), prof, 0)
    side = np.sign(v + 1e-6) * (1 if twist >= 0 else -1)
    edge = prof - np.abs(v)
    alpha = np.clip(edge, 0, 1) * (prof > .5)
    q = np.clip(np.abs(v) / np.maximum(prof, 1e-3), 0, 1)
    z = (1 - q) ** .7 * Wd * .55 + np.sin(np.pi * np.clip(t, 0, 1)) * Wd * .5   # creased blade, arched along its length
    z -= np.exp(-(v / (Wd * .05 + .5)) ** 2) * Wd * .06                           # midrib groove
    z += side * (np.abs(v)) * twist * .4
    N = normals_from_height(gaussian_filter(z, 1.2))
    stops = LEAF_UNDER if under else LEAF
    col = shade(N, stops, spec=.55 if not under else .15, shin=34, bounce=bounce, bounce_k=.25)
    rib = np.exp(-(v / (Wd * .035 + .6)) ** 2) * (t > .02) * (t < .93)
    col = col + (hexc('#c8dc98') - col) * (rib * .55)[..., None]
    veins = (np.cos((u - np.abs(v) * 1.1) / (Ln * .055) * 2 * np.pi) > .93) * (q < .82) * (q > .08)
    col = col + (hexc('#9cc07a') - col) * (veins * .18)[..., None]
    col *= (1 + (vnoise(h, w, Wd * .6, 2) - .5) * .1)[..., None]
    cv.shadow(x0, y0, alpha, int(Wd * .12), int(Wd * .18), Wd * .14, .35)
    cv.put(x0, y0, col, alpha)


def blossom(cv, cx, cy, R, ang=0.0, open_=1.0):
    pad = int(R * 1.2); x0, y0 = int(cx - pad), int(cy - pad); w = h = 2 * pad
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = xs + x0 - cx, ys + y0 - cy
    rr = np.hypot(dx, dy); a = np.arctan2(dy, dx) - ang
    k = 5; sector = (a % (2 * np.pi / k)) - np.pi / k          # angle within the petal
    t = rr / R
    halfw = .5 * np.clip(np.sin(np.pi * np.clip(t, 0, 1)), 0, 1) ** .6 * (np.pi / k) * 1.15 * open_
    inside = (np.abs(sector) < halfw) & (t < 1)
    alpha = np.clip((halfw - np.abs(sector)) * rr, 0, 1) * inside
    z = np.sin(np.pi * np.clip(t, 0, 1)) * R * .25 - (sector / (halfw + 1e-3)) ** 2 * R * .08 * t   # cupped petals
    N = normals_from_height(gaussian_filter(z, 1))
    col = shade(N, PETAL, spec=.25, shin=20, wrap=.6)
    col = col + (hexc('#c9d4a2') - col) * (np.clip(.35 - t, 0, 1) * 1.8)[..., None]
    cv.shadow(x0, y0, alpha, int(R * .06), int(R * .1), R * .1, .3)
    cv.put(x0, y0, col, alpha)
    # stamens
    st = np.zeros((h, w), np.float32)
    for j in range(16):
        aa = ang + j * 2 * np.pi / 16 + .1; L_ = R * rng.uniform(.26, .36)
        ex, ey = cx + L_ * math.cos(aa) - x0, cy + L_ * math.sin(aa) - y0
        st = np.maximum(st, np.clip(R * .05 - np.hypot(xs - ex, ys - ey), 0, 1))
    cv.put(x0, y0, np.broadcast_to(hexc('#f2b42a'), (h, w, 3)).copy(), st)
    ctr = np.clip(R * .1 - rr, 0, 1)
    cv.put(x0, y0, np.broadcast_to(hexc('#b9c45a'), (h, w, 3)).copy(), ctr)


def bud(cv, cx, cy, r, ang):
    pad = int(r * 2.4); x0, y0 = int(cx - pad), int(cy - pad); w = h = 2 * pad
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = xs + x0 - cx, ys + y0 - cy
    ca, sa = math.cos(ang), math.sin(ang); u = dx * ca + dy * sa; v = -dx * sa + dy * ca
    nx, ny = u / (r * 1.8), v / r; d = np.sqrt(nx * nx + ny * ny)
    alpha = np.clip((1 - d) * r, 0, 1)
    N = np.dstack([nx * ca * .6 - ny * sa, nx * sa * .6 + ny * ca, np.sqrt(np.clip(1 - d * d, 0, 1))]); N /= np.linalg.norm(N, axis=2, keepdims=True) + 1e-6
    cv.put(x0, y0, shade(N, PETAL, spec=.3, shin=20, wrap=.6), alpha)


def stem(cv, pts, w0, w1, col='#4a3a1c'):
    P = np.array(pts, np.float32); seg = []
    for i in range(len(P) - 1):
        for t in np.linspace(0, 1, 40, endpoint=False): seg.append(P[i] + (P[i + 1] - P[i]) * t)
    seg.append(P[-1]); seg = np.array(seg)
    x0, y0 = int(seg[:, 0].min() - w0 * 2), int(seg[:, 1].min() - w0 * 2)
    w, h = int(seg[:, 0].max() - x0 + w0 * 2), int(seg[:, 1].max() - y0 + w0 * 2)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32); best = np.full((h, w), 1e9, np.float32); wid = np.zeros((h, w), np.float32)
    for i, (px, py) in enumerate(seg):
        d = np.hypot(xs + x0 - px, ys + y0 - py); m = d < best; best[m] = d[m]; wid[m] = w0 + (w1 - w0) * i / (len(seg) - 1)
    alpha = np.clip(wid / 2 - best, 0, 1)
    q = np.clip(best / np.maximum(wid / 2, 1), 0, 1)
    col = ramp(1 - q * .9, [(0, '#1e140a'), (.6, col), (1, '#8a6a3a')])
    cv.put(x0, y0, col, alpha)


# ---------------- compositions ----------------
def cluster(path, bounce='#2b6f7a'):
    """the label move: a heavy cluster, meant to be cropped by the left edge of the page"""
    W, H = 2400, 2100
    cv = Canvas(W, H)
    stem(cv, [(-20, 380), (300, 430), (620, 520), (900, 700)], 34, 16)
    stem(cv, [(320, 430), (420, 250), (520, 150)], 16, 7, '#55602a')
    leaf(cv, 330, 420, -1.25, 520, 110, .14, under=True, bounce=bounce)
    leaf(cv, 640, 540, -.55, 760, 150, .1, bounce=bounce)
    leaf(cv, 860, 690, .15, 820, 160, -.08, bounce=bounce)
    leaf(cv, 120, 400, .9, 640, 130, -.12, under=True, bounce=bounce)
    fruit(cv, 760, 980, 430, bounce=bounce)
    fruit(cv, 1380, 1180, 380, bounce=bounce)
    leaf(cv, 980, 760, .55, 900, 170, .1, bounce=bounce)
    fruit(cv, 520, 1520, 520, bounce=bounce)
    leaf(cv, 1100, 1300, .2, 980, 175, -.1, twist=.4, bounce=bounce)
    leaf(cv, 760, 1420, 1.05, 760, 150, .12, bounce=bounce)
    leaf(cv, 300, 900, 2.5, 520, 110, -.1, under=True, bounce=bounce)
    stem(cv, [(1560, 1350), (1780, 1440), (1960, 1500)], 10, 5, '#55602a')
    bud(cv, 1980, 1510, 34, .3); bud(cv, 1860, 1580, 28, 1.2); bud(cv, 1760, 1400, 26, -.6)
    blossom(cv, 420, 170, 120, .2); blossom(cv, 600, 300, 96, 1.0); bud(cv, 700, 170, 32, -.8)
    blossom(cv, 160, 1130, 110, .6)
    cv.save(path)


def sprig(path, bounce='#2b6f7a'):
    W, H = 1300, 1500
    cv = Canvas(W, H)
    stem(cv, [(700, -10), (660, 160), (640, 330)], 22, 12)
    leaf(cv, 650, 250, 2.7, 520, 112, .1, under=True, bounce=bounce)
    leaf(cv, 660, 280, .25, 560, 116, -.12, bounce=bounce)
    fruit(cv, 640, 860, 470, bounce=bounce)
    leaf(cv, 660, 360, 1.25, 430, 92, .1, bounce=bounce)
    blossom(cv, 980, 160, 100, .4)
    cv.save(path)


def cut(path, N=1400):
    """a halved tangerine, face-on: peel, pith, ten translucent segments"""
    cv = Canvas(N, N); c = N / 2; R = N * .46
    ys, xs = np.mgrid[0:N, 0:N].astype(np.float32); dx, dy = xs - c, ys - c; rr = np.hypot(dx, dy); a = np.arctan2(dy, dx)
    alpha = np.clip(R - rr, 0, 1)
    peel = ramp(np.clip(.55 - (dx + dy) / (2 * R) * .5, 0, 1), FRUIT[1:])
    col = peel.copy()
    pith = rr < R * .93
    col[pith] = hexc('#fff0d4')
    k = 10; sector = (a % (2 * np.pi / k)) - np.pi / k
    gap = .045 + 1.6 / np.maximum(rr, 1)
    seg = (np.abs(sector) < (np.pi / k - gap)) & (rr > R * .09) & (rr < R * .86)
    q = rr / (R * .86)
    juice = ramp(.25 + .75 * (1 - np.abs(sector) / (np.pi / k)) * (1 - q * .55), [(0, '#e44a0a'), (.5, '#ff7a1c'), (1, '#ffb050')])
    ves = vnoise(N, N, 6, 1)
    stretch = np.cos((rr / 9) + ves * 6) * .5 + .5
    juice *= (1 + (stretch - .5) * .16)[..., None]
    col[seg] = juice[seg]
    hl = np.clip(1 - np.hypot(dx + R * .22, dy + R * .26) / (R * .45), 0, 1) ** 2 * .35   # wet sheen
    col = col + (1 - col) * (hl * seg)[..., None]
    cv.shadow(0, 0, alpha, int(R * .05), int(R * .08), R * .06, .4)
    cv.put(0, 0, col, alpha)
    cv.save(path)


os.makedirs(OUT, exist_ok=True)
cluster(os.path.join(OUT, 'cluster.png'))
sprig(os.path.join(OUT, 'sprig.png'))
cut(os.path.join(OUT, 'cut.png'))
