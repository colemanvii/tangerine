"""The Heart — rough motion test (exploratory; not an approved model).

A 3 second loop at 12 drawings per second. Lil KC is already airborne, so the
picture is treated as a living illustration: he hovers, blinks into a glance at
the heart, squeezes it close with his eyes shut, then looks back up, brave.

Acting is keyed by hand on tracks below. Afro and bandanna are secondary:
they follow the body late (driven by how fast he is moving) and the tails
carry a travelling wave.
"""
import math
from kc import NECK, KNOT, SHOULDER, HIP, KNEE, FACE_C

N = 36          # drawings in the loop
FPS = 12

def track(f, keys):
    """Cyclic eased keyframes: [(frame, value), ...] over N frames."""
    f = f % N
    ks = sorted(keys) + [(keys and sorted(keys)[0][0]+N, sorted(keys)[0][1])]
    if f < ks[0][0]: f += N
    for (a, va), (b, vb) in zip(ks, ks[1:]):
        if a <= f <= b:
            u = (f-a)/(b-a) if b > a else 0
            u = u*u*(3-2*u)
            return va+(vb-va)*u
    return ks[0][1]

def step(f, keys):
    """Cyclic held values (no in-between): value of the latest key at or before f."""
    f = f % N; v = sorted(keys)[-1][1]
    for a, va in sorted(keys):
        if a <= f: v = va
    return v

#                 home      lift     glance    squeeze    brave     settle
BOB_Y  = [(0, 0), (6, -7), (13, 9),  (20, 15), (26, -14), (31, 4)]
BOB_X  = [(0, 0), (6, 1),  (13, -5), (20, -8), (26, 7),   (31, -1)]
LEAN   = [(0, 0), (6, .6), (13, -1.6), (20, -2.8), (26, 2.2), (31, -.4)]
HEAD   = [(0, 0), (6, 1.2), (12, -3.5), (20, -5.5), (26, 2.6), (31, -.6)]
ARM    = [(0, 0), (13, 1.8), (20, 3.2), (26, -3.4), (31, .6)]
THRUST = [(0, 0), (20, -4), (26, 15), (31, -2)]
KICK   = [(0, 0), (13, 1.2), (20, 2.8), (26, -3.2), (31, .6)]
FOOT   = [(0, 0), (13, -3), (20, -8), (26, 6), (31, -1.5)]
H_DX   = [(0, 0), (13, 5), (17, 22), (20, 28), (26, 16), (31, 2)]
H_DY   = [(0, 0), (13, -2), (17, -6), (20, -8), (26, -6), (31, -1)]
H_ROT  = [(0, 0), (13, -2), (20, -10), (26, -5), (31, 0)]
SQUEEZE = [(0, 0), (15, 0), (17, .6), (19, 1), (22, 1), (24, .3), (26, 0)]
BEAT   = [(0, 1), (18, 1), (19, 1.05), (20, 1), (21, 1.05), (22, 1)]
LID    = [(0, 0), (7, 0), (8, .55), (9, 1), (10, .5), (11, 0), (15, 0), (16, .55), (17, 1), (22, 1), (23, .55), (24, 0)]
GAZE   = [(0, 0), (9, 172), (24, -14), (30, 0)]            # changes behind the closed lid
OPEN   = [(0, 1), (11, 1.0), (24, 1.07), (30, 1)]
BROW_DY = [(0, 0), (6, -3), (12, -6), (19, 1), (25, -5), (31, 0)]
BROW_L  = [(0, 0), (12, -9), (19, -5), (25, 6), (31, 0)]   # near brow: worried, tender, set
BROW_R  = [(0, 0), (12, 8), (19, 5), (25, -5), (31, 0)]
MOUTH  = [(0, 1), (6, 1.15), (12, .8), (19, .7), (25, 1.3), (31, 1)]

def clamp(v, m):
    return max(-m, min(m, v))

def pose(f):
    by, bx = track(f, BOB_Y), track(f, BOB_X)
    vy = by-track(f-2, BOB_Y); vx = bx-track(f-2, BOB_X)        # how fast he is moving
    hv = track(f, HEAD)-track(f-2, HEAD)
    ph = 2*math.pi*f/N
    ops = [
        ("all", dict(dx=bx, dy=by, rot=track(f, LEAN), pivot=HIP)),
        ("head", dict(rot=track(f, HEAD), pivot=NECK)),
        # afro arrives late and squashes a little, lumps breathing
        ("afro", dict(dx=-0.7*vx+1.6*hv, dy=-0.8*vy, pivot=FACE_C, sy=1+0.004*vy, sx=1-0.003*vy,
                      wobble=(2.2+0.25*abs(vy), 5, 2*ph))),
        # bandanna: dragged by the motion, plus a wave running down each tail
        ("tail_up", dict(rot=clamp(0.6*vy-0.8*hv+2.0*math.sin(ph), 7), pivot=KNOT, wave=(9, 260, 3*ph))),
        ("tail_lo", dict(rot=clamp(0.7*vy-1.0*hv+2.4*math.sin(ph-.9), 7), pivot=KNOT, wave=(10, 240, 3*ph-1.4))),
        ("arm_tip", dict(dx=track(f, THRUST), dy=-0.5*track(f, THRUST))),
        ("arm", dict(rot=track(f, ARM), pivot=SHOULDER)),
        ("kick", dict(rot=track(f, KICK), pivot=HIP)),
        ("foot", dict(rot=track(f, FOOT), pivot=KNEE)),
    ]
    face = dict(
        eyes=dict(gaze=step(f, GAZE) if f % N < 24 else track(f, GAZE), pupil=1.0, open_=track(f, OPEN), lid=track(f, LID)),
        browL=dict(dy=track(f, BROW_DY), rot=track(f, BROW_L)),
        browR=dict(dy=track(f, BROW_DY), rot=track(f, BROW_R)),
        mouth=dict(scale=track(f, MOUTH)))
    heart = dict(dx=track(f, H_DX), dy=track(f, H_DY), rot=track(f, H_ROT), squeeze=track(f, SQUEEZE), beat=track(f, BEAT))
    return dict(ops=ops, face=face, heart=heart)

# Key drawings = chosen moments of the loop
KEYS = [
    dict(id="key-01-home", frame=0, title="Home", beat="Start / loop point",
         note="The master pose, kept as the reference. Brave arm out, heart tucked behind, eyes on the danger."),
    dict(id="key-02-lift", frame=6, title="Lift", beat="Hover",
         note="He floats up a touch. Brows rise, something tugs at his attention."),
    dict(id="key-03-blink", frame=9, title="Blink", beat="Blink",
         note="A real blink: the lid comes down over his own eye shape, and his gaze changes behind it."),
    dict(id="key-04-glance", frame=13, title="Glance", beat="Checks the heart",
         note="Eyes drop to the heart. Head tips toward it, brows worried, mouth small. He sinks; hair and tails are late."),
    dict(id="key-05-squeeze", frame=20, title="Squeeze", beat="Protects it",
         note="New drawing: fist closed round the heart, pulled in tight, eyes shut, head tucked against it. Two little beats."),
    dict(id="key-06-brave", frame=26, title="Brave", beat="Back to the danger",
         note="Eyes snap open, chin up, dagger reaches, kick stretches. The bandanna cracks behind him. Then he settles home."),
]
