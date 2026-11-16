#!/usr/bin/env python3
"""Measure the Lil KC master and write a tracing (trace.json).

READ-ONLY on the master: the PNG is opened, measured, and never written.
Output is a *derivative study*: ink centre-lines with brush radius, solid ink
masses, and flat colour shapes, all in master pixel coordinates (1536x1024).
No master pixels are copied into the tracing.

Requires: pillow numpy opencv-python-headless scikit-image scipy
"""
import json, hashlib, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

HERE = Path(__file__).resolve().parent
MASTER = HERE.parents[2] / "lil-kc-master-2026-11-16.png"
SHA = "9b9687e5ad8cff0267dc6625883b60dda8ff215c5eb40bb5d778128d35306690"
MASS_R = 15          # ink thicker than this radius is a solid mass (afro, belt)

def polys(mask, eps=0.8, min_area=12):
    """Outer contours + holes as point lists."""
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    for i, c in enumerate(cs):
        if hier[0][i][3] != -1: continue
        if cv2.contourArea(c) < min_area: continue
        item = {"outer": simp(c, eps), "holes": []}
        j = hier[0][i][2]
        while j != -1:
            if cv2.contourArea(cs[j]) >= min_area:
                item["holes"].append(simp(cs[j], eps))
            j = hier[0][j][0]
        out.append(item)
    return out

def simp(c, eps):
    a = cv2.approxPolyDP(c, eps, True)[:, 0, :]
    return [[int(x), int(y)] for x, y in a]

def trace_skeleton(sk, dist):
    """Walk a 1px skeleton into ordered polylines [[x,y,r],...]."""
    H, W = sk.shape
    pts = set(zip(*np.nonzero(sk)))
    nb = lambda p: [(p[0]+dy, p[1]+dx) for dy in (-1,0,1) for dx in (-1,0,1)
                    if (dy or dx) and (p[0]+dy, p[1]+dx) in pts]
    deg = {p: len(nb(p)) for p in pts}
    nodes = {p for p in pts if deg[p] != 2}
    seen, lines = set(), []
    def walk(a, b):
        line = [a, b]; seen.add((a, b)); seen.add((b, a))
        prev, cur = a, b
        while cur not in nodes:
            nxt = [q for q in nb(cur) if q != prev and (cur, q) not in seen]
            if not nxt: break
            q = nxt[0]; seen.add((cur, q)); seen.add((q, cur))
            line.append(q); prev, cur = cur, q
        return line
    for n in nodes:
        for q in nb(n):
            if (n, q) not in seen: lines.append(walk(n, q))
        if deg[n] == 0: lines.append([n])
    for p in pts:                                   # closed loops with no node
        if p not in nodes and all((p, q) not in seen for q in nb(p)):
            q = nb(p)[0]; l = walk(p, q); lines.append(l)
    out = []
    for l in lines:
        keep = l[::3] + ([l[-1]] if (len(l)-1) % 3 else [])
        out.append([[int(x), int(y), round(float(dist[y, x]), 1)] for y, x in keep])
    return out

def despeckle(m, area):
    """Drop specks and pinholes smaller than `area` px (paper grain, not drawing)."""
    for inv in (False, True):
        t = ~m if inv else m
        lab, n = ndi.label(t)
        sizes = ndi.sum(t, lab, range(1, n+1))
        t = np.isin(lab, [i+1 for i, v in enumerate(sizes) if v >= area])
        m = ~t if inv else t
    return m

def main():
    raw = MASTER.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == SHA, "master hash mismatch"
    im = np.array(Image.open(MASTER).convert("RGB")).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = (r*3 + g*6 + b) / 10
    ink = (lum < 105) & (r < 120)
    red = (~ink) & (r > 150) & (g < 95)
    skin = (~ink) & (~red) & (r > 150) & (g < 165) & (b < 110)
    ink = despeckle(ink, 40); red = despeckle(red, 150); skin = despeckle(skin, 150)
    paper = ~(ink | red | skin)

    # interior paper = gi, eye whites, dagger: paper not connected to the border
    lab, n = ndi.label(paper)
    border = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    interior = paper & ~np.isin(lab, list(border))
    sizes = ndi.sum(interior, lab, range(1, n+1))
    interior &= np.isin(lab, [i+1 for i, s in enumerate(sizes) if s >= 120])

    dist = ndi.distance_transform_edt(ink)
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*MASS_R+1, 2*MASS_R+1))
    mass = cv2.morphologyEx(ink.astype(np.uint8), cv2.MORPH_OPEN, disk).astype(bool)
    sk = skeletonize(ink) & ~ndi.binary_erosion(mass, iterations=4)
    strokes = trace_skeleton(sk, dist)

    grow = lambda m, k: ndi.binary_dilation(m, iterations=k)
    data = {
        "source": {"file": MASTER.name, "sha256": SHA, "size": [im.shape[1], im.shape[0]]},
        "note": "Measured tracing of the master. Derivative study, not approved art.",
        "palette": {k: [int(v) for v in np.median(im[m], axis=0)]
                    for k, m in dict(paper=paper & ~interior, ink=ink, red=red, skin=skin).items()},
        "strokes": strokes,
        "masses": polys(mass),
        "fills": {"white": polys(grow(interior, 4) & ~grow(~(ink | interior), 1)),
                  "skin": polys(grow(skin, 4) & (ink | skin)),
                  "red": polys(grow(red, 4) & (ink | red))},
    }
    (HERE / "trace.json").write_text(json.dumps(data, separators=(",", ":")))
    print("strokes", len(strokes), "masses", len(data["masses"]),
          {k: len(v) for k, v in data["fills"].items()}, data["palette"])

if __name__ == "__main__":
    main()
