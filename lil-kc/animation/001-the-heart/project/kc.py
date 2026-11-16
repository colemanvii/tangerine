"""Lil KC drawing model: the measured tracing + per-key redraw operations.

A key drawing = the home tracing with
  * face features redrawn (eyes / pupils / blink / brows / mouth), and
  * soft, hand-authored warps (weight shift, head tilt, afro + bandanna lag,
    dagger arm), and
  * the heart-and-hand cluster drawn as its own layer so it can be held closer.
Everything is in master pixel coordinates. Nothing here writes to the master.
"""
import copy, json, math
from pathlib import Path
import numpy as np, cv2

HERE = Path(__file__).resolve().parent
SIZE = (1536, 1024)
COLORS = ("white", "skin", "red")

# ---- landmarks measured on the master (px) --------------------------------
BOX = dict(eyeL=(700, 428, 785, 522), eyeR=(805, 412, 856, 492),
           browL=(690, 388, 744, 426), browR=(806, 370, 846, 396),
           mouth=(808, 528, 836, 552))
FACE_C = (740, 500)
NECK = (745, 615)
KNOT = (478, 458)
SHOULDER = (868, 600)
HIP = (800, 760)
HEART_C = (600, 690)
KNEE = (720, 850)
POLY = dict(
    heart=[(470, 640), (560, 606), (640, 606), (698, 636), (700, 735), (683, 747), (674, 792), (560, 802), (470, 762)],
    head=[(330, 30), (950, 30), (950, 440), (882, 520), (868, 560), (800, 612), (745, 640), (690, 612), (600, 610), (430, 610), (330, 470)],
    tail_up=[(150, 380), (350, 400), (480, 440), (480, 478), (200, 600), (150, 600)],
    tail_lo=[(480, 478), (470, 560), (420, 640), (300, 700), (200, 700), (200, 600)],
    arm=[(872, 572), (905, 520), (960, 440), (1040, 400), (1270, 320), (1300, 345), (1300, 430), (1060, 520), (975, 600), (930, 625), (860, 625)],
    foot=[(700, 840), (850, 840), (850, 1000), (730, 1000), (690, 900)],
    kick=[(900, 640), (1010, 600), (1060, 550), (1180, 550), (1180, 720), (1000, 720), (900, 700)],
)

def load():
    t = json.loads((HERE / "trace.json").read_text())
    pal = dict(t["palette"]); pal["white"] = pal["paper"]
    g = {k: [dict(outer=p["outer"], holes=[h for h in p["holes"] if cv2.contourArea(np.array(h)) >= 80])
             for p in t["fills"][k]] for k in COLORS}
    g["masses"] = t["masses"]; g["strokes"] = t["strokes"]
    return g, pal

def empty():
    return {k: [] for k in COLORS + ("masses", "strokes")}

def _inside(pt, poly):
    return cv2.pointPolygonTest(np.array(poly, np.float32), (float(pt[0]), float(pt[1])), False) >= 0

def _in_box(pts, b):
    p = np.asarray(pts)[:, :2]
    return bool(((p[:, 0] >= b[0]) & (p[:, 0] <= b[2]) & (p[:, 1] >= b[1]) & (p[:, 1] <= b[3])).all())

def _cen(pts):
    return np.asarray(pts, float)[:, :2].mean(0)

def split(g, test):
    """Move every element whose centroid passes `test` into a new group."""
    out = empty()
    for k in list(out):
        key = (lambda e: e) if k == "strokes" else (lambda e: e["outer"])
        keep = []
        for e in g[k]:
            (out[k] if test(_cen(key(e))) else keep).append(e)
        g[k] = keep
    return out

# ---- face features ---------------------------------------------------------
_S = 6  # raster scale used while redrawing small features

def _local(b, pad=6):
    x0, y0, x1, y1 = b[0]-pad, b[1]-pad, b[2]+pad, b[3]+pad
    return (x0, y0), ((x1-x0)*_S, (y1-y0)*_S)

def _draw_strokes(m, strokes, org):
    for s in strokes:
        a = np.asarray(s, float)
        for i in range(len(a)):
            c = (int((a[i, 0]-org[0])*_S), int((a[i, 1]-org[1])*_S))
            cv2.circle(m, c, int(a[i, 2]*_S), 255, -1, cv2.LINE_AA)
            if i:
                p = (int((a[i-1, 0]-org[0])*_S), int((a[i-1, 1]-org[1])*_S))
                cv2.line(m, p, c, 255, int((a[i, 2]+a[i-1, 2])*_S), cv2.LINE_AA)
    return m

def _to_polys(mask, org, eps=1.5):
    cs, hier = cv2.findContours((mask > 127).astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    cv = lambda c: (cv2.approxPolyDP(c, eps, True)[:, 0, :]/_S + org).round(2).tolist()
    for i, c in enumerate(cs):
        if hier[0][i][3] != -1 or cv2.contourArea(c) < 20*_S: continue
        it = dict(outer=cv(c), holes=[]); j = hier[0][i][2]
        while j != -1:
            if cv2.contourArea(cs[j]) > 10*_S: it["holes"].append(cv(cs[j]))
            j = hier[0][j][0]
        out.append(it)
    return out

def _disk(r):
    k = int(r*_S)*2+1
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))

def take_feature(g, name):
    """Lift a face feature's traced elements out of the drawing."""
    b = BOX[name]
    part = empty()
    part["strokes"] = [s for s in g["strokes"] if _in_box(s, b)]
    g["strokes"] = [s for s in g["strokes"] if not _in_box(s, b)]
    part["white"] = [p for p in g["white"] if _in_box([_cen(p["outer"])], b)]
    g["white"] = [p for p in g["white"] if not _in_box([_cen(p["outer"])], b)]
    for p in g["skin"]:       # skin now runs under the feature
        p["holes"] = [h for h in p["holes"] if not _in_box([_cen(h)], b)]
    return part

def redraw_eye(part, name, gaze=0.0, pupil=1.0, open_=1.0, lid=0.0):
    """Redraw an eye from its own traced outline.

    gaze: degrees the pupil is swung round the eye (0 = as in the master).
    pupil: pupil size, open_: overall eye size.
    lid: 0 open .. 1 closed. The upper lid comes down over his own eye shape.
    """
    org, wh = _local(BOX[name])
    inkm = _draw_strokes(np.zeros(wh[::-1], np.uint8), part["strokes"], org)
    whm = np.zeros(wh[::-1], np.uint8)
    for p in part["white"]:
        cv2.fillPoly(whm, [((np.array(p["outer"])-org)*_S).astype(np.int32)], 255)
    full = cv2.morphologyEx(cv2.bitwise_or(inkm, whm), cv2.MORPH_CLOSE, _disk(3))
    M = cv2.moments(full, True); c = (M["m10"]/M["m00"], M["m01"]/M["m00"])
    out = empty()
    cols = np.nonzero(full.any(0))[0]
    rows = np.nonzero(full.any(1))[0]
    def lid_line(L):
        yy = int(rows.min() + (rows.max()-rows.min())*0.60*L)
        xs_ = np.nonzero(full[yy])[0]; x0, x1 = xs_.min(), xs_.max(); w = x1-x0
        sag = w*(0.20*L - 0.10*(1-L))                 # arched while open, sagging when shut
        return [(x0+u*w, yy + sag*(1-(2*u-1)**2) + 0.05*w*(u-.5)) for u in np.linspace(0.04, 0.96, 11)]
    def lid_stroke(pts):
        return [[round(x/_S+org[0], 2), round(y/_S+org[1], 2), round(4.7+0.7*math.sin(i*1.3), 2)]
                for i, (x, y) in enumerate(pts)]
    if lid >= 0.95:
        out["strokes"] = [lid_stroke(lid_line(1.0))]
        return out
    narrow = (cols.max()-cols.min())/_S < 45          # his far eye is slimmer, with a lighter rim
    pup = cv2.morphologyEx(inkm, cv2.MORPH_OPEN, _disk(5.0 if narrow else 7.5))
    pup = cv2.dilate(pup, _disk(0.8))
    rim = cv2.bitwise_and(full, cv2.bitwise_not(cv2.erode(full, _disk(6.5 if narrow else 9.0))))
    ring = cv2.bitwise_and(rim, cv2.dilate(inkm, _disk(2.0)))
    A = cv2.getRotationMatrix2D(c, -gaze, pupil)
    pup2 = cv2.bitwise_and(cv2.warpAffine(pup, A, wh, flags=cv2.INTER_LINEAR), full)
    ink2 = cv2.bitwise_or(ring, pup2)
    ink2 = cv2.morphologyEx(cv2.morphologyEx(ink2, cv2.MORPH_CLOSE, _disk(2.2)), cv2.MORPH_OPEN, _disk(1.6))
    if open_ != 1.0:
        Z = cv2.getRotationMatrix2D(c, 0, open_)
        ink2 = cv2.warpAffine(ink2, Z, wh); full = cv2.warpAffine(full, Z, wh)
    white = cv2.erode(full, _disk(1.5))
    if lid > 0.05:
        pts = lid_line(lid)
        cover = np.array([(0, 0), (wh[0], 0), (wh[0], pts[-1][1])] + pts[::-1] + [(0, pts[0][1])], np.int32)
        cv2.fillPoly(ink2, [cover], 0); cv2.fillPoly(white, [cover], 0)
        out["strokes"] = [lid_stroke(pts)]
    out["white"] = _to_polys(white, org)
    out["masses"] = _to_polys(ink2, org)
    return out

def move_part(part, dx=0, dy=0, rot=0.0, scale=1.0):
    """Shift / turn / resize a small traced feature about its own centre."""
    pts = np.array([p[:2] for s in part["strokes"] for p in s], float)
    c = pts.mean(0); a = math.radians(rot); R = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
    out = empty()
    for s in part["strokes"]:
        q = (np.array(s, float)[:, :2]-c) @ R.T*scale + c + (dx, dy)
        out["strokes"].append([[round(x, 2), round(y, 2), round(p[2]*(0.5+0.5*scale), 2)] for (x, y), p in zip(q, s)])
    return out

# ---- soft warps ------------------------------------------------------------
def region(poly, feather=10):
    m = np.zeros(SIZE[::-1], np.float32)
    cv2.fillPoly(m, [np.array(poly, np.int32)], 1.0)
    return cv2.GaussianBlur(m, (0, 0), feather) if feather else m

def ramp(c, r0, r1):
    yy, xx = np.mgrid[0:SIZE[1], 0:SIZE[0]]
    d = np.hypot(xx-c[0], yy-c[1])
    t = np.clip((d-r0)/(r1-r0), 0, 1)
    return (t*t*(3-2*t)).astype(np.float32)

_W = {}
def weights():
    if not _W:
        head = region(POLY["head"], 9)
        _W.update(
            all=np.ones(SIZE[::-1], np.float32), head=head,
            afro=head*ramp(FACE_C, 140, 330),
            tail_up=region(POLY["tail_up"], 8)*ramp(KNOT, 12, 230),
            tail_lo=region(POLY["tail_lo"], 8)*ramp(KNOT, 12, 230),
            arm=region(POLY["arm"], 7), arm_tip=region(POLY["arm"], 7)*ramp(SHOULDER, 20, 200),
            kick=region(POLY["kick"], 9)*ramp(HIP, 90, 300),
            foot=region(POLY["foot"], 8)*ramp(KNEE, 15, 110))
    return _W

def _sample(w, p):
    x = np.clip(p[:, 0].round().astype(int), 0, SIZE[0]-1); y = np.clip(p[:, 1].round().astype(int), 0, SIZE[1]-1)
    return w[y, x][:, None]

def warp_points(home, ops):
    """ops: [(weight_name, dict(dx,dy,rot,pivot,scale))]; weights read at home position."""
    home = np.asarray(home, float); p = home.copy()
    for wname, o in ops:
        w = _sample(weights()[wname], home)
        a = math.radians(o.get("rot", 0)); R = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
        piv = np.array(o.get("pivot", (0, 0)), float)
        q = (p-piv) @ R.T*np.array([o.get("sx", 1.0), o.get("sy", 1.0)])*o.get("scale", 1.0) + piv + (o.get("dx", 0), o.get("dy", 0))
        v = home-piv; d = np.hypot(v[:, 0], v[:, 1])[:, None]+1e-6
        if "wave" in o:      # cloth: a wave travelling away from the pivot, growing toward the tip
            amp, wl, ph = o["wave"]
            q = q + (v[:, ::-1]*(-1, 1)/d)*amp*np.clip(d/230, 0, 1.3)**1.3*np.sin(2*math.pi*(d/wl)-ph)
        if "wobble" in o:    # hair: lumps breathe in and out round the head
            amp, k, ph = o["wobble"]
            q = q + (v/d)*amp*np.sin(k*np.arctan2(v[:, 1], v[:, 0])[:, None]+ph)
        p = p + w*(q-p)
    return p

def warp_group(g, ops):
    out = empty()
    for k in COLORS + ("masses",):
        for e in g[k]:
            out[k].append(dict(outer=warp_points(e["outer"], ops).round(2).tolist(),
                               holes=[warp_points(h, ops).round(2).tolist() for h in e["holes"]]))
    for s in g["strokes"]:
        a = np.asarray(s, float); q = warp_points(a[:, :2], ops)
        out["strokes"].append(np.column_stack([q, a[:, 2]]).round(2).tolist())
    return out

def merge(a, b):
    return {k: a[k]+b[k] for k in a}

# ---- the heart and the hand that holds it ----------------------------------
def _brush(pts, r=7.4, closed=False, seed=0.0):
    p = ink_chaikin(pts, closed)
    if closed: p = np.vstack([p, p[:1]])
    return [[round(x, 2), round(y, 2), round(r+0.9*math.sin(i*0.55+seed)+0.4*math.sin(i*1.7+seed*2), 2)] for i, (x, y) in enumerate(p)]

def ink_chaikin(pts, closed):
    from ink import chaikin
    return chaikin(pts, closed, 2)

# New drawing (not traced): the heart squeezed in his fist. Authored point by point.
SQUEEZED_HEART = [(612, 640), (632, 622), (660, 620), (680, 636), (686, 662), (672, 688), (650, 708), (618, 722),
                  (578, 708), (552, 690), (536, 664), (540, 638), (560, 621), (588, 622)]
GRIP_HAND = [(556, 756), (550, 730), (558, 706), (570, 688), (586, 677), (601, 682), (606, 693), (616, 681),
             (631, 678), (642, 688), (645, 699), (655, 694), (665, 702), (664, 718), (656, 734), (642, 748),
             (616, 758), (586, 762)]
GRIP_CREASES = [[(606, 693), (602, 702), (596, 709)], [(645, 699), (641, 708), (636, 714)], [(586, 677), (589, 684)]]

def heart_cluster(heart, s):
    """Traced heart-and-hand when relaxed; a newly drawn squeeze when s >= .5. Returns layers."""
    if s < 0.5:
        k = s/0.5
        return [warp_group(heart, [("all", dict(pivot=(610, 668), sx=1+0.04*k, sy=1-0.06*k))])]
    back, hand = empty(), empty()
    back["white"] = heart["white"]
    back["strokes"] = [st for st in heart["strokes"] if _cen(st)[0] < 530]          # the sleeve loop
    back["red"] = [dict(outer=SQUEEZED_HEART, holes=[])]
    back["strokes"].append(_brush(SQUEEZED_HEART, closed=True, seed=1.0))
    hand["skin"] = [dict(outer=GRIP_HAND, holes=[])]
    hand["strokes"] = [_brush(GRIP_HAND, closed=True, seed=2.0)] + [_brush(c, r=5.6, seed=3.0+i) for i, c in enumerate(GRIP_CREASES)]
    k = (s-0.5)/0.5                                     # press harder toward s = 1
    sq = [("all", dict(pivot=(610, 668), sx=1.0+0.03*k, sy=1.04-0.06*k))]
    return [warp_group(back, sq), warp_group(hand, [("all", dict(dy=9-5*k))])]

# ---- a key drawing ----------------------------------------------------------
def draw_key(spec):
    """spec -> ordered layers [body, face features, heart cluster...]."""
    g, pal = load()
    g = copy.deepcopy(g)
    heart = split(g, lambda c: _inside(c, POLY["heart"]))
    stray = [st for st in heart["strokes"] if _cen(st)[1] > 730 and _cen(st)[0] > 650]   # belt tip, not hand
    heart["strokes"] = [st for st in heart["strokes"] if st not in stray]; g["strokes"] += stray
    face = empty()
    f = spec.get("face")
    if f:
        e = f.get("eyes") or {}
        if any(abs(e.get(k, d)-d) > 1e-3 for k, d in (("gaze", 0), ("pupil", 1), ("open_", 1), ("lid", 0))):
            for eye in ("eyeL", "eyeR"):                # otherwise the traced eyes stay
                face = merge(face, redraw_eye(take_feature(g, eye), eye, **e))
        for name in ("browL", "browR", "mouth"):
            face = merge(face, move_part(take_feature(g, name), **f.get(name, {})))
    ops = spec.get("ops", [])
    whole = [o for o in ops if o[0] == "all"]
    h = spec.get("heart") or {}
    hops = [("all", dict(dx=h.get("dx", 0), dy=h.get("dy", 0), rot=h.get("rot", 0), scale=h.get("beat", 1.0), pivot=HEART_C))]
    layers = [warp_group(warp_group(l, hops), whole) for l in heart_cluster(heart, h.get("squeeze", 0.0))]
    return [warp_group(g, ops), warp_group(face, ops)] + layers, pal
