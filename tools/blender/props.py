"""Track props: trains, barriers, tunnel pieces, pillars, poles, ground.

Every prop is a single joined mesh whose origin is at ground level at the
*near* end (the end the runner reaches first).  Length runs along +Y in
Blender (= -Z in Three.js, the running direction).

Run: python3 tools/blender/props.py   -> public/models/props.glb
"""
import math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from lib import *

TRAIN_W = 2.0
TRAIN_H = 2.6
COACH_L = 12.0
RAMP_L = 6.0
PROPS = []
_cursor_x = 0.0


def register(objs, name, origin=(0, 0, 0), tex="grime", uv_scale=2.0, alpha=None, ao=True):
    """Join parts into a prop, set origin, and shelve it to the side."""
    global _cursor_x
    o = join(objs, name)
    set_origin(o, origin)
    o["tex"] = tex; o["uv_scale"] = uv_scale; o["ao"] = ao
    if alpha is not None: o["alpha"] = alpha
    _cursor_x += 6.0
    o.location = (_cursor_x, 0, 0)
    PROPS.append(o)
    return o


def collect(start_count):
    objs = all_mesh_objects()
    return [o for o in objs if o not in PROPS]


# ----------------------------------------------------------------------------
# Trains
# ----------------------------------------------------------------------------
def wheels(objs, y0, length, m, r=0.35, spacing=None):
    """Bogies for a rail vehicle."""
    for yy in (y0 + 1.6, y0 + length - 1.6):
        for sx in (-1, 1):
            for dy in (-0.55, 0.55):
                objs.append(cyl("wheel", r, 0.25, (sx * 0.85, yy + dy, r), m, rot=(0, 90, 0), verts=12))
        objs.append(box("bogie", (1.9, 1.6, 0.25), (0, yy, 0.55), m))


def train_passenger():
    """Pakistan Railways style coach: dark green with cream band and yellow lines."""
    green = mat("pr_green", "#1f6b3a")
    cream = mat("pr_cream", "#f3e6c4")
    yellow = mat("pr_yellow", "#f5c400")
    dark = mat("pr_dark", "#2b2b2b")
    glass = mat("glass", "#8fd3ff", rough=0.2)
    roof = mat("pr_roof", "#6d7a6f")
    o = []
    L = COACH_L
    # body
    o.append(box("body", (TRAIN_W, L - 0.4, 1.7), (0, L / 2, 1.55), green, bevel=0.06))
    o.append(box("band", (TRAIN_W + 0.02, L - 0.4, 0.55), (0, L / 2, 1.75), cream))
    o.append(box("line", (TRAIN_W + 0.03, L - 0.4, 0.06), (0, L / 2, 1.44), yellow))
    o.append(box("line2", (TRAIN_W + 0.03, L - 0.4, 0.06), (0, L / 2, 2.06), yellow))
    o.append(box("skirt", (TRAIN_W - 0.1, L - 0.6, 0.3), (0, L / 2, 0.75), dark))
    # roof (slightly rounded look with two boxes)
    o.append(box("roof", (TRAIN_W - 0.1, L - 0.4, 0.22), (0, L / 2, TRAIN_H - 0.11), roof, bevel=0.08))
    o.append(box("roof_top", (TRAIN_W - 0.7, L - 0.8, 0.10), (0, L / 2, TRAIN_H + 0.02), roof, bevel=0.04))
    # windows along each side
    n = 6
    for i in range(n):
        yy = 0.9 + i * (L - 1.4) / (n - 1) + 0.25
        for sx in (-1, 1):
            o.append(box("win", (0.05, 0.9, 0.5), (sx * (TRAIN_W / 2 + 0.005), yy, 1.78), glass))
    # doors at both ends
    for yy in (0.9, L - 0.9):
        for sx in (-1, 1):
            o.append(box("door", (0.05, 0.8, 1.5), (sx * (TRAIN_W / 2 + 0.01), yy, 1.45), dark))
    # end faces: headlight + coupling
    for yy, face in ((0.0, -1), (L, 1)):
        o.append(box("endplate", (TRAIN_W - 0.3, 0.12, 1.6), (0, yy + face * 0.1, 1.55), dark))
        o.append(cyl("lamp", 0.16, 0.08, (0, yy + face * 0.14, 2.1), yellow, rot=(90, 0, 0), verts=12))
        o.append(box("coupler", (0.3, 0.4, 0.25), (0, yy + face * 0.15, 0.6), dark))
    wheels(o, 0, L, dark)
    register(o, "train_passenger", tex="rust_metal", uv_scale=3.0)


def train_metro():
    """Islamabad Metro Bus style: bright red with white roof and big windows."""
    red = mat("metro_red", "#d6202b")
    white = mat("metro_white", "#f7f7f7")
    dark = mat("pr_dark", "#2b2b2b")
    glass = mat("glass", "#8fd3ff", rough=0.2)
    grey = mat("metro_grey", "#9aa3ad")
    o = []
    L = COACH_L
    o.append(box("body", (TRAIN_W, L - 0.3, 1.9), (0, L / 2, 1.45), red, bevel=0.10))
    o.append(box("roof", (TRAIN_W - 0.15, L - 0.5, 0.35), (0, L / 2, TRAIN_H - 0.17), white, bevel=0.10))
    o.append(box("ac", (1.2, 2.2, 0.16), (0, L / 2, TRAIN_H + 0.05), grey, bevel=0.04))
    o.append(box("skirt", (TRAIN_W - 0.2, L - 0.5, 0.35), (0, L / 2, 0.55), dark))
    # long window strip
    for sx in (-1, 1):
        o.append(box("winstrip", (0.05, L - 1.2, 0.7), (sx * (TRAIN_W / 2 + 0.005), L / 2, 1.85), glass))
        o.append(box("stripe", (0.05, L - 0.3, 0.10), (sx * (TRAIN_W / 2 + 0.01), L / 2, 1.15), white))
    for yy in (2.2, L - 2.2):
        for sx in (-1, 1):
            o.append(box("door", (0.06, 1.2, 1.5), (sx * (TRAIN_W / 2 + 0.015), yy, 1.25), grey))
    for yy, face in ((0.0, -1), (L, 1)):
        o.append(box("windshield", (TRAIN_W - 0.4, 0.06, 0.9), (0, yy + face * 0.02, 1.9), glass))
        o.append(box("bumper", (TRAIN_W - 0.1, 0.2, 0.3), (0, yy + face * 0.1, 0.65), dark))
        for sx in (-1, 1):
            o.append(box("headlight", (0.3, 0.06, 0.18), (sx * 0.65, yy + face * 0.03, 1.0), white))
    # road wheels
    for yy in (1.8, L - 1.8):
        for sx in (-1, 1):
            o.append(cyl("wheel", 0.45, 0.3, (sx * 0.85, yy, 0.45), dark, rot=(0, 90, 0), verts=14))
            o.append(cyl("hubcap", 0.2, 0.32, (sx * 0.85, yy, 0.45), grey, rot=(0, 90, 0), verts=10))
    for sx in (-1, 1):
        o.append(text_mesh("METRO BUS", 0.28, (sx * (TRAIN_W / 2 + 0.06), L / 2, 1.3), white, rot=(90, 0, 90 if sx > 0 else -90), extrude=0.01))
        o.append(box("mirror_arm", (0.3, 0.04, 0.04), (sx * 1.15, 0.5, 1.9), dark))
        o.append(box("mirror", (0.06, 0.18, 0.3), (sx * 1.3, 0.5, 1.95), dark))
    o.append(box("dest_sign", (1.2, 0.04, 0.3), (0, -0.02, 2.35), mat("dest_amber", "#ffb300", emissive="#ffb300", emissive_strength=1.2)))
    register(o, "train_metro", tex="rust_metal", uv_scale=3.0)


def train_freight():
    """Container flat-wagon: two 20ft-style containers, one on top of another."""
    dark = mat("pr_dark", "#2b2b2b")
    steel = mat("steel", "#5b6770")
    cols = [("cont_red", "#c8322b"), ("cont_blue", "#1f4fa3"), ("cont_orange", "#f08a1d"), ("cont_green", "#2a8c4a")]
    o = []
    L = COACH_L
    o.append(box("flatbed", (TRAIN_W, L - 0.4, 0.3), (0, L / 2, 0.95), steel))
    wheels(o, 0, L, dark)
    for i in range(2):
        yy = 0.3 + i * (L / 2) + L / 4 - 0.15
        cm = mat(*cols[i % 2])
        o.append(box("container", (TRAIN_W - 0.05, L / 2 - 0.5, 1.5), (0, yy, 1.1 + 0.75), cm, bevel=0.03))
        # corrugation ribs
        for k in range(6):
            ry = yy - (L / 4 - 0.6) + k * ((L / 2 - 1.2) / 5)
            for sx in (-1, 1):
                o.append(box("rib", (0.05, 0.12, 1.4), (sx * (TRAIN_W / 2 - 0.02), ry, 1.85), cm))
        o.append(box("cdoor", (TRAIN_W - 0.3, 0.06, 1.3), (0, yy - (L / 4 - 0.25) - 0.02, 1.85), dark))
    register(o, "train_freight", tex="rust_metal", uv_scale=3.0)


def train_ramp():
    """A short sloped module: lets the runner run up onto train roofs."""
    steel = mat("steel", "#5b6770")
    dark = mat("pr_dark", "#2b2b2b")
    yellow = mat("pr_yellow", "#f5c400")
    o = []
    L = 6.0
    # a wedge from ground (y=0) up to roof height at y=L; build as a scaled+rotated cube slab plus a solid below
    steps = 8
    for i in range(steps):
        y0 = i * L / steps
        h = (i + 1) * TRAIN_H / steps
        o.append(box("step", (TRAIN_W, L / steps + 0.02, h), (0, y0 + L / steps / 2, h / 2), steel))
    for i in range(steps):
        y0 = i * L / steps
        h = (i + 1) * TRAIN_H / steps
        o.append(box("stripe", (TRAIN_W + 0.02, 0.15, h + 0.01), (0, y0 + L / steps - 0.1, h / 2), yellow if i % 2 else dark))
    register(o, "train_ramp", tex="rust_metal", uv_scale=2.0)


# ----------------------------------------------------------------------------
# Barriers
# ----------------------------------------------------------------------------
def barrier_low():
    """Police-style red & white barrier - jump over (or roll? no: jump only). Height 1.0"""
    red = mat("bar_red", "#e0382b")
    white = mat("bar_white", "#f7f7f7")
    dark = mat("pr_dark", "#2b2b2b")
    o = []
    o.append(box("plank", (TRAIN_W, 0.14, 0.34), (0, 0, 0.78), white, bevel=0.02))
    for i in range(4):
        o.append(box("stripe", (0.24, 0.16, 0.36), (-0.75 + i * 0.5, 0, 0.78), red))
    o.append(box("plank2", (TRAIN_W, 0.10, 0.12), (0, 0, 0.40), white))
    for sx in (-1, 1):
        o.append(box("leg", (0.10, 0.10, 0.95), (sx * 0.92, 0, 0.48), dark))
        o.append(box("foot", (0.20, 0.50, 0.06), (sx * 0.92, 0, 0.03), dark))
    o.append(box("light", (0.18, 0.18, 0.12), (0, 0, 1.02), mat("amber", "#ffb300", emissive="#ffb300", emissive_strength=2.0)))
    register(o, "barrier_low", tex="rust_metal", uv_scale=1.5)


def barrier_high():
    """Overhead sign gantry - roll under. Solid from 1.55 up. """
    grey = mat("gantry", "#6b7280")
    green = mat("sign_green", "#0f7a3d")
    white = mat("bar_white", "#f7f7f7")
    o = []
    for sx in (-1, 1):
        o.append(box("post", (0.12, 0.12, 2.8), (sx * 1.0, 0, 1.4), grey))
    o.append(box("beam", (TRAIN_W + 0.3, 0.14, 0.14), (0, 0, 2.75), grey))
    o.append(box("board", (TRAIN_W, 0.10, 1.1), (0, 0, 2.15), green, bevel=0.02))
    o.append(box("board_frame", (TRAIN_W + 0.06, 0.06, 1.16), (0, 0.04, 2.15), white))
    # arrow + text-ish blocks
    o.append(box("arrow_shaft", (0.7, 0.03, 0.10), (-0.4, -0.07, 2.15), white))
    o.append(box("arrow_head", (0.25, 0.03, 0.25), (-0.05, -0.07, 2.15), white, rot=(0, 45, 0)))
    for i in range(3):
        o.append(box("txt", (0.45, 0.03, 0.08), (0.55, -0.07, 2.42 - i * 0.27), white))
    register(o, "barrier_high", tex="rust_metal", uv_scale=1.5)


def barrier_mid():
    """Police tape strung between two poles at head height - duck under (or super-jump)."""
    yellow = mat("tape_yellow", "#f5c400")
    dark = mat("pr_dark", "#2b2b2b")
    white = mat("bar_white", "#f7f7f7")
    o = []
    o.append(box("tape", (TRAIN_W, 0.04, 0.22), (0, 0, 1.62), yellow))
    for i in range(5):
        o.append(box("tape_txt", (0.18, 0.05, 0.10), (-0.8 + i * 0.4, 0, 1.62), dark))
    for sx in (-1, 1):
        o.append(cyl("pole", 0.05, 1.85, (sx * 0.95, 0, 0.93), white, verts=8))
        o.append(cyl("pole_base", 0.22, 0.08, (sx * 0.95, 0, 0.04), dark, verts=10))
        o.append(box("pole_stripe", (0.11, 0.11, 0.3), (sx * 0.95, 0, 1.2), mat("bar_red", "#e0382b")))
    register(o, "barrier_mid", tex="rust_metal", uv_scale=1.5)


def barrier_wall():
    """Concrete block wall - jump or roll impossible, must switch lane. (not used for lane-blocking alone)"""
    conc = mat("concrete", "#b9b4a6")
    red = mat("bar_red", "#e0382b")
    o = []
    o.append(box("block", (TRAIN_W, 0.9, 1.1), (0, 0.45, 0.55), conc, bevel=0.04))
    o.append(box("stripe", (TRAIN_W + 0.02, 0.06, 0.25), (0, 0.0, 0.7), red))
    register(o, "barrier_block", tex="plaster", uv_scale=1.5)


def bush():
    g1 = mat("bush1", "#3f9b3f")
    g2 = mat("bush2", "#2f7d34")
    pot = mat("pot", "#8b5a2b")
    o = []
    o.append(box("pot", (1.6, 0.8, 0.5), (0, 0, 0.25), pot, bevel=0.04))
    o.append(sphere("b1", 0.55, (-0.4, 0, 0.8), g1, seg=10, rings=6))
    o.append(sphere("b2", 0.6, (0.35, 0.05, 0.85), g2, seg=10, rings=6))
    o.append(sphere("b3", 0.45, (0, -0.1, 1.05), g1, seg=10, rings=6))
    register(o, "bush", tex="foliage", uv_scale=1.2)


def light_pole():
    """Signal pole standing between lanes - stumble if hit."""
    grey = mat("gantry", "#6b7280")
    red = mat("sig_red", "#ff2a2a", emissive="#ff2a2a", emissive_strength=2.5)
    green = mat("sig_green", "#2aff5a", emissive="#2aff5a", emissive_strength=1.5)
    dark = mat("pr_dark", "#2b2b2b")
    o = []
    o.append(cyl("pole", 0.07, 2.6, (0, 0, 1.3), grey, verts=10))
    o.append(cyl("base", 0.2, 0.15, (0, 0, 0.07), dark, verts=10))
    o.append(box("head", (0.34, 0.26, 0.7), (0, 0, 2.6), dark, bevel=0.03))
    o.append(cyl("l1", 0.1, 0.05, (0, -0.14, 2.78), red, rot=(90, 0, 0), verts=12))
    o.append(cyl("l2", 0.1, 0.05, (0, -0.14, 2.45), green, rot=(90, 0, 0), verts=12))
    register(o, "light_pole", tex="rust_metal", uv_scale=2.0)


# ----------------------------------------------------------------------------
# Tunnel & structural
# ----------------------------------------------------------------------------
def tunnel():
    """Tunnel section spanning all three lanes. Length 12. Open at both ends."""
    conc = mat("tunnel_conc", "#8d8577")
    inner = mat("tunnel_inner", "#4a453e")
    lamp = mat("tunnel_lamp", "#fff2b0", emissive="#fff2b0", emissive_strength=3.0)
    trim = mat("tunnel_trim", "#d9d3c5")
    o = []
    L = 12.0
    W = 8.4
    H = 4.6
    o.append(box("wall_l", (0.6, L, H), (-W / 2, L / 2, H / 2), conc))
    o.append(box("wall_r", (0.6, L, H), (W / 2, L / 2, H / 2), conc))
    o.append(box("ceiling", (W + 0.6, L, 0.6), (0, L / 2, H), conc))
    # inner dark lining
    o.append(box("lining_l", (0.05, L, H - 0.6), (-W / 2 + 0.33, L / 2, (H - 0.6) / 2), inner))
    o.append(box("lining_r", (0.05, L, H - 0.6), (W / 2 - 0.33, L / 2, (H - 0.6) / 2), inner))
    o.append(box("lining_c", (W - 0.6, L, 0.05), (0, L / 2, H - 0.32), inner))
    for i in range(3):
        o.append(box("lamp", (0.6, 1.4, 0.08), (0, 2 + i * 4, H - 0.36), lamp))
    strip = mat("tunnel_strip", "#ff7a1a", emissive="#ff7a1a", emissive_strength=1.5)
    strip2 = mat("tunnel_strip2", "#1fb2a6", emissive="#1fb2a6", emissive_strength=1.5)
    for sx in (-1, 1):
        o.append(box("strip", (0.06, L, 0.12), (sx * (W / 2 - 0.36), L / 2, 1.2), strip))
        o.append(box("strip2", (0.06, L, 0.12), (sx * (W / 2 - 0.36), L / 2, 2.6), strip2))
        for k in range(3):
            o.append(box("tg", (0.05, 1.6, 1.0), (sx * (W / 2 - 0.37), 2 + k * 4, 1.9), (mat("g_pink", "#e83e8c"), mat("g_yellow", "#ffcc33"), mat("g_teal", "#1fb2a6"))[k], bevel=0.1))
    o.append(box("trim", (W + 0.7, 0.3, 0.4), (0, 0.15, H + 0.2), trim))
    o.append(box("trim2", (W + 0.7, 0.3, 0.4), (0, L - 0.15, H + 0.2), trim))
    register(o, "tunnel", tex="plaster", uv_scale=3.0)


def pillar():
    """Overpass pillar standing in one lane. Deadly."""
    conc = mat("pillar_conc", "#a39d90")
    dark = mat("pr_dark", "#2b2b2b")
    yellow = mat("pr_yellow", "#f5c400")
    o = []
    o.append(box("shaft", (1.4, 1.4, 4.4), (0, 0.7, 2.2), conc, bevel=0.06))
    o.append(box("cap", (1.9, 1.9, 0.4), (0, 0.7, 4.6), conc))
    for i in range(4):
        o.append(box("stripe", (1.44, 1.44, 0.18), (0, 0.7, 0.3 + i * 0.36), yellow if i % 2 == 0 else dark))
    register(o, "pillar", tex="plaster", uv_scale=2.5)


def overpass():
    """Beam connecting pillars, spanning all lanes over head (decoration)."""
    conc = mat("pillar_conc", "#a39d90")
    rail = mat("gantry", "#6b7280")
    o = []
    o.append(box("deck", (11, 3.0, 0.5), (0, 1.5, 5.0), conc))
    o.append(box("rail1", (11, 0.1, 0.9), (0, 0.1, 5.7), rail))
    o.append(box("rail2", (11, 0.1, 0.9), (0, 2.9, 5.7), rail))
    register(o, "overpass", tex="plaster", uv_scale=3.0)


def station_platform():
    """Raised platform to the side of the tracks with a canopy - decoration."""
    conc = mat("plat_conc", "#cfc7b8")
    edge = mat("pr_yellow", "#f5c400")
    steel = mat("gantry", "#6b7280")
    canopy = mat("canopy", "#c9302c")
    o = []
    L = 24.0
    o.append(box("deck", (3.0, L, 1.0), (0, L / 2, 0.5), conc))
    o.append(box("edge", (0.25, L, 0.05), (-1.4, L / 2, 1.02), edge))
    for i in range(4):
        yy = 3 + i * 6
        o.append(cyl("post", 0.1, 3.4, (0.8, yy, 2.7), steel, verts=8))
    o.append(box("roof", (3.6, L, 0.15), (0.2, L / 2, 4.4), canopy))
    o.append(box("bench", (0.5, 1.8, 0.45), (1.0, L / 2, 1.22), steel))
    register(o, "station_platform", tex="plaster", uv_scale=3.0)


# ----------------------------------------------------------------------------
# Ground
# ----------------------------------------------------------------------------
def ground_tile():
    """One 3-lane track tile, 12 m long: gravel bed, sleepers, rails, kerbs."""
    gravel = mat("gravel", "#8f8578")
    sleeper = mat("sleeper", "#5a4634")
    rail = mat("rail", "#b8bcc2", rough=0.4, metal=0.6)
    kerb = mat("kerb", "#d9d3c5")
    o = []
    L = 12.0
    o.append(box("bed", (7.6, L, 0.2), (0, L / 2, -0.1), gravel))
    for lane in (-2.2, 0, 2.2):
        for i in range(10):
            o.append(box("sleeper", (1.6, 0.28, 0.08), (lane, 0.6 + i * 1.2, -0.02), sleeper))
        for sx in (-1, 1):
            o.append(box("rail", (0.08, L, 0.10), (lane + sx * 0.55, L / 2, 0.05), rail))
    for sx in (-1, 1):
        o.append(box("kerb", (0.5, L, 0.35), (sx * 4.05, L / 2, 0.05), kerb))
    register(o, "ground_tile", tex="asphalt", uv_scale=4.0)


def wall_segment():
    """Side wall (12 m) with poster panels; placed at x = +/-4.3 in game."""
    brick = mat("wall_brick", "#c47a4a")
    plaster = mat("wall_plaster", "#e8dcc8")
    poster1 = mat("poster1", "#1fb2a6")
    poster2 = mat("poster2", "#f5c400")
    poster3 = mat("poster3", "#d6202b")
    dark = mat("pr_dark", "#2b2b2b")
    o = []
    L = 12.0
    o.append(box("wall", (0.6, L, 3.2), (0, L / 2, 1.6), plaster))
    o.append(box("base", (0.7, L, 0.6), (0, L / 2, 0.3), brick))
    o.append(box("cap", (0.8, L, 0.2), (0, L / 2, 3.3), brick))
    for i, pm in enumerate((poster1, poster2, poster3)):
        o.append(box("poster", (0.06, 2.4, 1.5), (-0.33, 2.2 + i * 3.8, 1.9), pm))
        o.append(box("pframe", (0.04, 2.6, 1.7), (-0.31, 2.2 + i * 3.8, 1.9), dark))
    register(o, "wall_segment", tex="plaster", uv_scale=3.0)


def container_stack():
    """Shipping containers stacked beside the track — a nod to the prototype."""
    cols = [mat("cont_red", "#c8322b"), mat("cont_blue", "#1f4fa3"), mat("cont_orange", "#f08a1d")]
    o = []
    for i, cm in enumerate(cols):
        o.append(box("cont", (2.4, 6.0, 2.4), (0, 3.0 + (i % 2) * 0.4, 1.2 + i * 2.4), cm, bevel=0.03))
    register(o, "container_stack", tex="rust_metal", uv_scale=3.0)



def wall_graffiti(idx):
    """Side wall variants (12 m) with bold graffiti blocks and Islamabad street details."""
    import random
    random.seed(100 + idx)
    sand = mat("wall_sand", "#e3cfa6")
    sand2 = mat("wall_sand2", "#d7bf90")
    brick = mat("wall_brick", "#c47a4a")
    dark = mat("pr_dark", "#2b2b2b")
    palette = [mat("g_teal", "#1fb2a6"), mat("g_orange", "#ff7a1a"), mat("g_pink", "#e83e8c"), mat("g_yellow", "#ffcc33"),
               mat("g_purple", "#7b3fe4"), mat("g_blue", "#2c7be5"), mat("g_green", "#2fbf71"), mat("g_white", "#f7f7f7")]
    o = []
    L = 12.0
    o.append(box("wall", (0.6, L, 3.2), (0, L / 2, 1.6), sand if idx % 2 == 0 else sand2))
    o.append(box("base", (0.7, L, 0.5), (0, L / 2, 0.25), brick))
    o.append(box("cap", (0.8, L, 0.2), (0, L / 2, 3.3), brick))
    # graffiti: layered blobs on the -X face
    y = 0.8
    while y < L - 1.0:
        w = random.uniform(1.2, 3.2)
        h = random.uniform(0.8, 1.8)
        z = random.uniform(1.0, 2.4)
        c = random.choice(palette)
        o.append(box("g", (0.05, w, h), (-0.32, y + w / 2, z), c, bevel=0.1))
        # highlight / outline layers
        c2 = random.choice(palette)
        o.append(box("g2", (0.04, w * 0.6, h * 0.5), (-0.345, y + w / 2 + random.uniform(-0.3, 0.3), z + random.uniform(-0.2, 0.2)), c2, bevel=0.08))
        if random.random() < 0.5:
            o.append(cyl("g3", h * 0.35, 0.04, (-0.35, y + w / 2 + random.uniform(-0.5, 0.5), z + random.uniform(-0.3, 0.3)), random.choice(palette), rot=(0, 90, 0), verts=14))
        y += w + random.uniform(0.3, 1.2)
    # occasional drain pipe / lamp bracket
    if idx % 3 == 0:
        o.append(cyl("pipe", 0.06, 3.2, (-0.36, 1.0, 1.6), dark, verts=8))
    register(o, f"wall_graffiti_{idx}", tex="plaster", uv_scale=3.0)


def lamp_post():
    grey = mat("gantry", "#6b7280")
    lamp = mat("street_lamp", "#fff5c2", emissive="#fff5c2", emissive_strength=2.0)
    o = [cyl("post", 0.08, 5.0, (0, 0, 2.5), grey, verts=8),
         box("arm", (1.4, 0.1, 0.1), (-0.65, 0, 4.95), grey),
         box("head", (0.6, 0.3, 0.15), (-1.3, 0, 4.9), grey),
         box("bulb", (0.5, 0.24, 0.05), (-1.3, 0, 4.81), lamp)]
    register(o, "lamp_post", tex="rust_metal", uv_scale=2.0)


def dhaba():
    """Roadside chai dhaba: counter, awning, kettle, stools."""
    wood = mat("dh_wood", "#8b5a2b")
    awn = mat("dh_awning", "#e0382b")
    awn2 = mat("dh_awning2", "#f7f7f7")
    steel = mat("dh_steel", "#c9d1d9")
    o = [box("counter", (2.4, 1.0, 1.0), (0, 0.5, 0.5), wood, bevel=0.03),
         box("top", (2.6, 1.2, 0.08), (0, 0.5, 1.04), steel),
         cyl("pole1", 0.05, 2.6, (-1.2, 0.05, 1.3), steel, verts=8), cyl("pole2", 0.05, 2.6, (1.2, 0.05, 1.3), steel, verts=8),
         cyl("pole3", 0.05, 2.6, (-1.2, 1.15, 1.3), steel, verts=8), cyl("pole4", 0.05, 2.6, (1.2, 1.15, 1.3), steel, verts=8)]
    for i in range(6):
        o.append(box("awn", (0.45, 1.5, 0.06), (-1.15 + i * 0.46, 0.6, 2.62), awn if i % 2 == 0 else awn2))
    o.append(cyl("kettle", 0.18, 0.3, (-0.6, 0.5, 1.22), steel, verts=10))
    o.append(cyl("kettle2", 0.14, 0.25, (-0.2, 0.6, 1.2), steel, verts=10))
    for i in range(3):
        o.append(cyl("cup", 0.05, 0.08, (0.3 + i * 0.25, 0.4, 1.12), mat("cup", "#ffffff"), verts=8))
    for x in (-0.8, 0.0, 0.8):
        o.append(cyl("stool", 0.2, 0.05, (x, -0.8, 0.45), wood, verts=8))
        o.append(cyl("stool_leg", 0.04, 0.45, (x, -0.8, 0.22), steel, verts=6))
    register(o, "dhaba", tex="grime", uv_scale=1.5)


def bench():
    wood = mat("dh_wood", "#8b5a2b")
    steel = mat("gantry", "#6b7280")
    o = [box("seat", (1.8, 0.5, 0.08), (0, 0, 0.45), wood), box("back", (1.8, 0.08, 0.5), (0, -0.25, 0.75), wood),
         box("leg1", (0.08, 0.5, 0.45), (-0.8, 0, 0.22), steel), box("leg2", (0.08, 0.5, 0.45), (0.8, 0, 0.22), steel)]
    register(o, "bench", tex="grime", uv_scale=1.0)


def rickshaw():
    """Parked auto-rickshaw with truck-art colours — side decoration."""
    green = mat("rk_green", "#1f8f4a")
    yellow = mat("pr_yellow", "#f5c400")
    dark = mat("pr_dark", "#2b2b2b")
    red = mat("bar_red", "#e0382b")
    o = [box("body", (1.3, 2.2, 1.0), (0, 0, 0.75), green, bevel=0.1),
         box("roof", (1.4, 2.4, 0.1), (0, 0, 1.7), yellow, bevel=0.03),
         box("hood", (1.0, 0.8, 0.6), (0, 1.4, 0.6), green, bevel=0.1),
         box("windshield", (0.9, 0.05, 0.6), (0, 1.0, 1.35), mat("glass", "#8fd3ff", rough=0.2)),
         cyl("wheel_f", 0.3, 0.2, (0, 1.5, 0.3), dark, rot=(0, 90, 0), verts=12),
         cyl("wheel_l", 0.3, 0.2, (-0.7, -0.6, 0.3), dark, rot=(0, 90, 0), verts=12),
         cyl("wheel_r", 0.3, 0.2, (0.7, -0.6, 0.3), dark, rot=(0, 90, 0), verts=12)]
    for i in range(4):
        o.append(box("deco", (0.06, 0.3, 0.3), (-0.66, -0.7 + i * 0.45, 0.9), red if i % 2 else yellow))
        o.append(box("deco2", (0.06, 0.3, 0.3), (0.66, -0.7 + i * 0.45, 0.9), red if i % 2 else yellow))
    for x in (-0.4, 0.4):
        o.append(cyl("pole", 0.04, 0.7, (x, -1.0, 1.35), dark, verts=6))
    register(o, "rickshaw", tex="rust_metal", uv_scale=1.5)



def gantry():
    """Overhead catenary gantry spanning the three lanes."""
    steel = mat("gantry_steel", "#7d8791")
    dark = mat("pr_dark", "#2b2b2b")
    o = [cyl("post_l", 0.12, 6.0, (-4.1, 0, 3.0), steel, verts=8), cyl("post_r", 0.12, 6.0, (4.1, 0, 3.0), steel, verts=8),
         box("beam", (8.5, 0.14, 0.3), (0, 0, 5.9), steel), box("beam2", (8.5, 0.14, 0.14), (0, 0, 5.5), steel)]
    for i in range(8):
        o.append(box("truss", (0.08, 0.08, 0.45), (-3.5 + i * 1.0, 0, 5.7), steel))
    for lane in (-2.2, 0, 2.2):
        o.append(box("hanger", (0.06, 0.06, 0.3), (lane, 0, 5.72), dark))
    register(o, "gantry", tex="rust_metal", uv_scale=2.0)


def wires():
    """Overhead wires for one 12 m tile (3 lanes)."""
    dark = mat("wire", "#555e66")
    o = []
    for lane in (-2.2, 0, 2.2):
        o.append(box("wire", (0.025, 12.0, 0.025), (lane, 6.0, 5.6), dark))
    register(o, "wires", tex=None, ao=False)


def station_roof():
    """Big station canopy over all lanes (24 m) with steel columns outside the track."""
    red = mat("canopy", "#c9302c")
    white = mat("canopy_white", "#f4f4f4")
    steel = mat("gantry_steel", "#7d8791")
    glass = mat("glass", "#8fd3ff", rough=0.2)
    o = []
    L = 24.0
    for y in (2, 12, 22):
        o.append(cyl("col_l", 0.18, 6.4, (-4.2, y, 3.2), steel, verts=8))
        o.append(cyl("col_r", 0.18, 6.4, (4.2, y, 3.2), steel, verts=8))
    for i in range(6):
        c = red if i % 2 == 0 else white
        o.append(box("roof", (10.4, 4.0, 0.2), (0, 2 + i * 4, 6.6), c))
    o.append(box("skylight", (3.0, L - 1, 0.1), (0, L / 2, 6.75), glass))
    o.append(box("edge_l", (0.3, L, 0.5), (-5.2, L / 2, 6.45), steel))
    o.append(box("edge_r", (0.3, L, 0.5), (5.2, L / 2, 6.45), steel))
    register(o, "station_roof", tex="rust_metal", uv_scale=3.0)



# ----------------------------------------------------------------------------
# Islamabad road theme
# ----------------------------------------------------------------------------
def road_tile():
    """3-lane asphalt road tile (12 m): dashed lane lines, kerbs, greenbelt strips, footpath."""
    asphalt = mat("asphalt", "#5a5d63")
    asphalt2 = mat("asphalt2", "#555860")
    paint = mat("road_paint", "#f2f2e6")
    yellow = mat("road_yellow", "#f2c230")
    kerb = mat("kerb", "#d9d3c5")
    kerb_stripe = mat("kerb_stripe", "#2b2b2b")
    grass = mat("grass", "#6fa84f")
    path = mat("footpath", "#c9b8a0")
    o = []
    L = 12.0
    o.append(box("road", (7.2, L, 0.2), (0, L / 2, -0.1), asphalt))
    # patches for texture variety
    o.append(box("patch", (2.0, 3.0, 0.005), (1.6, 3.0, 0.002), asphalt2))
    o.append(box("patch2", (1.4, 4.0, 0.005), (-2.4, 8.5, 0.002), asphalt2))
    # dashed lane lines between the 3 lanes
    for x in (-1.1, 1.1):
        for i in range(4):
            o.append(box("dash", (0.12, 1.6, 0.01), (x, 1.5 + i * 3.0, 0.005), paint))
    # solid edge lines
    for sx in (-1, 1):
        o.append(box("edge", (0.12, L, 0.01), (sx * 3.45, L / 2, 0.005), yellow))
        # kerb with black/white stripes
        o.append(box("kerb", (0.4, L, 0.3), (sx * 3.8, L / 2, 0.05), kerb))
        for i in range(6):
            o.append(box("kstripe", (0.41, 1.0, 0.31), (sx * 3.8, 1.0 + i * 2.0, 0.05), kerb_stripe))
        # greenbelt + footpath
        o.append(box("grass", (2.0, L, 0.22), (sx * 5.0, L / 2, 0.0), grass))
        o.append(box("path", (1.2, L, 0.24), (sx * 6.6, L / 2, 0.0), path))
    register(o, "road_tile", tex="asphalt", uv_scale=3.0)


def container(idx):
    """40 ft shipping container placed along the lane: 12 m long, 2.0 wide, roof at 2.6. Ridable."""
    import random
    rng = random.Random(100 + idx)
    cols = [("cont_blue", "#1f4fa3"), ("cont_red", "#c8322b"), ("cont_orange", "#f08a1d"), ("cont_green", "#2a8c4a"), ("cont_maroon", "#7a2a3a"), ("cont_grey", "#7b8794")]
    name, hexc = cols[idx % len(cols)]
    cm = mat(name, hexc)
    # darker shade for rust patches / recesses
    r, g, b = int(hexc[1:3], 16), int(hexc[3:5], 16), int(hexc[5:7], 16)
    dark_hex = "#%02x%02x%02x" % (int(r * 0.55), int(g * 0.5), int(b * 0.45))
    cd = mat(name + "_dark", dark_hex)
    dark = mat("pr_dark", "#2b2b2b")
    rust = mat("rust", "#7a4a2a")
    white = mat("stencil_white", "#f2f2f2")
    o = []
    L = COACH_L
    o.append(box("body", (TRAIN_W, L - 0.1, TRAIN_H - 0.15), (0, L / 2, (TRAIN_H - 0.15) / 2 + 0.05), cm, bevel=0.03))
    o.append(box("roof", (TRAIN_W - 0.1, L - 0.3, 0.12), (0, L / 2, TRAIN_H - 0.06), cm))
    for k in range(4):   # roof ribs
        o.append(box("roof_rib", (TRAIN_W - 0.2, 0.08, 0.04), (0, 1.5 + k * 3.0, TRAIN_H + 0.02), cd))
    # corrugation ribs on both sides
    for k in range(13):
        ry = 0.5 + k * (L - 1.0) / 12
        for sx in (-1, 1):
            o.append(box("rib", (0.06, 0.12, TRAIN_H - 0.5), (sx * (TRAIN_W / 2 - 0.01), ry, TRAIN_H / 2), cm))
    for sx in (-1, 1):
        o.append(box("rail", (0.08, L, 0.08), (sx * (TRAIN_W / 2 - 0.02), L / 2, TRAIN_H - 0.02), dark))
        o.append(box("rail_b", (0.08, L, 0.12), (sx * (TRAIN_W / 2 - 0.02), L / 2, 0.11), dark))
        # rivet rows
        for k in range(12):
            o.append(box("rivet", (0.03, 0.05, 0.05), (sx * (TRAIN_W / 2 + 0.03), 0.5 + k * 0.95, 0.4), dark))
            o.append(box("rivet_t", (0.03, 0.05, 0.05), (sx * (TRAIN_W / 2 + 0.03), 0.5 + k * 0.95, TRAIN_H - 0.3), dark))
        # rust patches
        for k in range(3):
            o.append(box("rust", (0.03, rng.uniform(0.4, 1.2), rng.uniform(0.2, 0.6)), (sx * (TRAIN_W / 2 + 0.035), rng.uniform(1.5, L - 1.5), rng.uniform(0.35, 1.2)), rust if k == 0 else cd))
        # stencil id text
        o.append(text_mesh(f"ISB {2000 + idx * 137 % 900}", 0.32, (sx * (TRAIN_W / 2 + 0.045), L * 0.7, 1.9), white, rot=(90, 0, 90 if sx > 0 else -90), extrude=0.01))
    # corner castings + fork pockets
    for sx in (-1, 1):
        for yy in (0.15, L - 0.15):
            o.append(box("cast", (0.2, 0.2, 0.25), (sx * (TRAIN_W / 2 - 0.08), yy, 0.2), dark))
            o.append(box("cast_t", (0.2, 0.2, 0.25), (sx * (TRAIN_W / 2 - 0.08), yy, TRAIN_H - 0.15), dark))
    for yy in (L * 0.35, L * 0.65):
        o.append(box("fork_pocket", (TRAIN_W + 0.02, 0.4, 0.14), (0, yy, 0.22), dark))
    # doors at the near end with locking bars & hinges
    o.append(box("door", (TRAIN_W - 0.2, 0.05, TRAIN_H - 0.5), (0, 0.02, TRAIN_H / 2), cm))
    o.append(box("door_seam", (0.03, 0.06, TRAIN_H - 0.6), (0, -0.01, TRAIN_H / 2), dark))
    for x in (-0.55, -0.25, 0.25, 0.55):
        o.append(box("lockbar", (0.06, 0.08, TRAIN_H - 0.7), (x, -0.02, TRAIN_H / 2), dark))
        for zz in (0.5, TRAIN_H - 0.6):
            o.append(box("bracket", (0.12, 0.10, 0.10), (x, -0.03, zz), dark))
    for sx in (-1, 1):
        for zz in (0.6, 1.3, 2.0):
            o.append(cyl("hinge", 0.04, 0.16, (sx * (TRAIN_W / 2 - 0.06), -0.02, zz), dark, verts=8))
    o.append(box("handle", (0.5, 0.06, 0.06), (0, -0.05, 1.1), dark))
    o.append(box("placard", (0.3, 0.02, 0.3), (0.6, -0.05, 1.7), mat("placard_orange", "#f08a1d")))
    register(o, f"container_{idx}", tex="rust_metal", uv_scale=2.6)


def container_truck():
    """Truck cab pulling a container trailer: 12 m total, roof ridable like a container."""
    cab = mat("truck_cab", "#f5c400")
    cab_dark = mat("truck_dark", "#2b2b2b")
    glass = mat("glass", "#8fd3ff", rough=0.2)
    cm = mat("cont_red", "#c8322b")
    steel = mat("steel", "#5b6770")
    o = []
    L = COACH_L
    # trailer with a 20ft container (near end) - full height so the roof is continuous
    o.append(box("chassis", (TRAIN_W, L - 3.2, 0.25), (0, (L - 3.2) / 2, 0.75), steel))
    o.append(box("cont", (TRAIN_W, L - 3.4, TRAIN_H - 0.9), (0, (L - 3.4) / 2 + 0.05, 0.9 + (TRAIN_H - 0.9) / 2), cm, bevel=0.03))
    for k in range(7):
        for sx in (-1, 1):
            o.append(box("rib", (0.06, 0.14, TRAIN_H - 1.2), (sx * (TRAIN_W / 2 - 0.01), 0.6 + k * 1.2, 1.75), cm))
    # cab at the far end (truck drives away from the runner)
    o.append(box("cab", (TRAIN_W, 2.6, 1.6), (0, L - 1.4, 1.5), cab, bevel=0.08))
    o.append(box("cab_roof", (TRAIN_W - 0.2, 2.4, 0.6), (0, L - 1.4, TRAIN_H - 0.3), cab, bevel=0.08))
    o.append(box("windshield", (TRAIN_W - 0.4, 0.06, 0.8), (0, L - 0.1, 1.9), glass))
    o.append(box("grille", (1.4, 0.08, 0.6), (0, L - 0.08, 1.1), cab_dark))
    for sx in (-1, 1):
        o.append(box("headlight", (0.3, 0.06, 0.2), (sx * 0.7, L - 0.06, 1.2), mat("headlamp", "#fff2b0", emissive="#fff2b0", emissive_strength=2)))
    for yy in (1.5, 3.0, L - 1.2):
        for sx in (-1, 1):
            o.append(cyl("wheel", 0.5, 0.35, (sx * 0.85, yy, 0.5), cab_dark, rot=(0, 90, 0), verts=14))
    register(o, "container_truck", tex="rust_metal", uv_scale=2.6)


def army_jeep():
    """Olive army jeep, 5 m long, deadly. Origin at the front bumper (the side facing the runner)."""
    olive = mat("olive", "#5c6b3a")
    olive_dark = mat("olive_dark", "#3e4a27")
    dark = mat("pr_dark", "#2b2b2b")
    glass = mat("jeep_glass", "#9fc8e0", rough=0.2)
    steel = mat("steel", "#5b6770")
    sand = mat("jerrycan", "#8a7a45")
    o = []
    L = 5.0
    o.append(box("body", (2.0, L - 0.4, 0.9), (0, L / 2, 0.95), olive, bevel=0.06))
    o.append(box("hood", (1.9, 1.6, 0.5), (0, 1.0, 1.35), olive, bevel=0.06))
    o.append(box("hood_vent", (0.8, 0.5, 0.04), (0, 1.2, 1.62), olive_dark))
    o.append(box("cabin", (1.9, 2.4, 0.9), (0, 3.2, 1.85), olive, bevel=0.08))
    o.append(box("roof", (2.0, 2.6, 0.1), (0, 3.2, 2.35), olive_dark))
    o.append(box("rack", (1.6, 2.0, 0.06), (0, 3.4, 2.44), steel))
    for sx in (-1, 1):
        o.append(box("rack_rail", (0.05, 2.0, 0.12), (sx * 0.8, 3.4, 2.5), steel))
    o.append(box("jerrycan", (0.5, 0.25, 0.4), (-0.4, 3.9, 2.66), sand, bevel=0.03))
    o.append(box("jerrycan2", (0.5, 0.25, 0.4), (0.2, 3.9, 2.66), olive_dark, bevel=0.03))
    o.append(box("windshield", (1.7, 0.06, 0.7), (0, 2.0, 1.85), glass))
    o.append(box("ws_frame", (1.8, 0.08, 0.06), (0, 2.0, 2.22), olive_dark))
    o.append(box("grille", (1.2, 0.08, 0.5), (0, 0.24, 1.0), dark))
    for k in range(5):
        o.append(box("slat", (1.1, 0.06, 0.03), (0, 0.19, 0.82 + k * 0.09), steel))
    o.append(box("bumper", (2.1, 0.2, 0.25), (0, 0.15, 0.6), dark))
    for sx in (-1, 1):
        o.append(box("hook", (0.12, 0.2, 0.1), (sx * 0.7, 0.05, 0.62), steel))
        o.append(cyl("headlight", 0.15, 0.06, (sx * 0.7, 0.22, 1.15), mat("headlamp", "#fff2b0", emissive="#fff2b0", emissive_strength=2), rot=(90, 0, 0), verts=12))
        o.append(cyl("hl_rim", 0.18, 0.04, (sx * 0.7, 0.24, 1.15), dark, rot=(90, 0, 0), verts=12))
        o.append(box("win_side", (0.06, 1.6, 0.6), (sx * 0.96, 3.2, 1.9), glass))
        o.append(box("door_line", (0.02, 0.03, 0.9), (sx * 1.0, 3.2, 1.0), olive_dark))
        o.append(box("mirror_arm", (0.25, 0.04, 0.04), (sx * 1.1, 2.1, 1.75), dark))
        o.append(box("mirror", (0.06, 0.16, 0.2), (sx * 1.22, 2.1, 1.8), dark))
        o.append(box("step", (0.2, 1.4, 0.06), (sx * 1.05, 3.2, 0.5), dark))
        for yy in (1.1, 3.9):
            o.append(box("arch", (0.12, 1.3, 0.5), (sx * 0.98, yy, 0.85), olive_dark, bevel=0.05))
            o.append(cyl("wheel", 0.48, 0.4, (sx * 0.9, yy, 0.48), dark, rot=(0, 90, 0), verts=16))
            o.append(cyl("hubcap", 0.22, 0.42, (sx * 0.9, yy, 0.48), steel, rot=(0, 90, 0), verts=10))
    o.append(box("antenna", (0.04, 0.04, 1.6), (-0.8, 4.4, 3.0), dark))
    o.append(box("spare", (0.35, 0.9, 0.9), (0, L - 0.05, 1.2), dark, bevel=0.1))
    o.append(box("light_bar", (1.2, 0.3, 0.2), (0, 3.2, 2.6), mat("siren_blue", "#2a6bff", emissive="#2a6bff", emissive_strength=2)))
    o.append(box("light_bar_r", (0.4, 0.32, 0.22), (0.5, 3.2, 2.6), mat("siren_red", "#ff2a2a", emissive="#ff2a2a", emissive_strength=2)))
    o.append(text_mesh("ARMY", 0.26, (0, 1.1, 1.62), mat("stencil_white", "#f2f2f2"), rot=(0, 0, 180), extrude=0.005))
    register(o, "army_jeep", tex="rust_metal", uv_scale=2.0)


def dirt_ramp():
    """Plank-and-rubble ramp up onto a container roof (6 m)."""
    wood = mat("ramp_wood", "#a97c50")
    wood_dark = mat("ramp_wood_dark", "#7a5230")
    rubble = mat("rubble", "#8f8578")
    o = []
    L = RAMP_L if 'RAMP_L' in globals() else 6.0
    steps = 8
    for i in range(steps):
        y0 = i * L / steps
        h = (i + 1) * TRAIN_H / steps
        o.append(box("step", (TRAIN_W - 0.1, L / steps + 0.02, h), (0, y0 + L / steps / 2, h / 2), rubble))
    # planks on top
    for k in range(2):
        x = -0.5 + k * 1.0
        o.append(beam(f"plank_{k}", (x, 0.0, 0.03), (x, L, TRAIN_H + 0.03), 0.7, wood if k else wood_dark, thick2=0.08))
    register(o, "dirt_ramp", tex="grime", uv_scale=1.5)


def police_barricade():
    """Low red/white police barricade with POLICE text - jump over."""
    red = mat("bar_red", "#e0382b")
    white = mat("bar_white", "#f7f7f7")
    dark = mat("pr_dark", "#2b2b2b")
    blue = mat("police_blue", "#1f3a93")
    o = []
    o.append(box("plank", (TRAIN_W, 0.14, 0.36), (0, 0, 0.78), white, bevel=0.02))
    for i in range(4):
        o.append(box("stripe", (0.24, 0.16, 0.38), (-0.75 + i * 0.5, 0, 0.78), red))
    o.append(box("sign", (1.1, 0.06, 0.26), (0, -0.09, 0.78), blue))
    bpy.ops.object.text_add(location=(0, -0.13, 0.78))
    t = bpy.context.active_object
    t.data.resolution_u = 3
    t.data.body = "POLICE"; t.data.size = 0.22; t.data.extrude = 0.01; t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'
    t.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.convert(target='MESH'); t = bpy.context.active_object; t.name = "txt"; t.data.materials.append(white)
    o.append(t)
    o.append(box("plank2", (TRAIN_W, 0.10, 0.12), (0, 0, 0.42), white))
    for sx in (-1, 1):
        o.append(box("leg", (0.10, 0.10, 0.95), (sx * 0.92, 0, 0.48), dark))
        o.append(box("foot", (0.20, 0.50, 0.06), (sx * 0.92, 0, 0.03), dark))
    o.append(box("light", (0.18, 0.18, 0.12), (0, 0, 1.03), mat("amber", "#ffb300", emissive="#ffb300", emissive_strength=2.0)))
    register(o, "police_barricade", tex="rust_metal", uv_scale=1.5)


def road_closed_gantry():
    """Overhead ROAD CLOSED sign - duck under."""
    grey = mat("gantry", "#6b7280")
    red = mat("bar_red", "#e0382b")
    white = mat("bar_white", "#f7f7f7")
    o = []
    for sx in (-1, 1):
        o.append(box("post", (0.12, 0.12, 2.8), (sx * 1.0, 0, 1.4), grey))
    o.append(box("beam", (TRAIN_W + 0.3, 0.14, 0.14), (0, 0, 2.75), grey))
    o.append(box("board", (TRAIN_W, 0.10, 1.0), (0, 0, 2.15), red, bevel=0.02))
    o.append(box("frame", (TRAIN_W + 0.06, 0.06, 1.06), (0, 0.04, 2.15), white))
    bpy.ops.object.text_add(location=(0, -0.07, 2.15))
    t = bpy.context.active_object
    t.data.resolution_u = 3
    t.data.body = "ROAD\nCLOSED"; t.data.size = 0.34; t.data.extrude = 0.01; t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'
    t.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.convert(target='MESH'); t = bpy.context.active_object; t.name = "txt"; t.data.materials.append(white)
    o.append(t)
    register(o, "road_closed_gantry", tex="rust_metal", uv_scale=1.5)


def cones():
    """Row of three traffic cones across a lane - stumble."""
    orange = mat("cone_orange", "#ff6a1a")
    white = mat("bar_white", "#f7f7f7")
    dark = mat("pr_dark", "#2b2b2b")
    o = []
    for x in (-0.6, 0.0, 0.6):
        o.append(box("base", (0.4, 0.4, 0.06), (x, 0, 0.03), dark))
        o.append(cone("cone", 0.18, 0.05, 0.75, (x, 0, 0.42), orange, verts=12))
        o.append(cyl("band", 0.14, 0.08, (x, 0, 0.45), white, verts=12))
        o.append(cyl("band2", 0.10, 0.06, (x, 0, 0.62), white, verts=12))
    register(o, "cones", tex="grime", uv_scale=1.0)


def teargas():
    """Tear-gas canister spewing a yellow-green cloud at head height - duck under it."""
    steel = mat("gas_can", "#a7adb4", rough=0.4, metal=0.5)
    dark = mat("pr_dark", "#2b2b2b")
    gas1 = mat("gas1", "#d8e04a", alpha=0.85)
    gas2 = mat("gas2", "#c2cc3a", alpha=0.85)
    o = []
    o.append(cyl("can", 0.14, 0.5, (0.2, 0, 1.55), steel, rot=(0, 70, 0), verts=12))
    o.append(cyl("cap", 0.08, 0.1, (0.46, 0, 1.63), dark, rot=(0, 70, 0), verts=10))
    import random
    random.seed(5)
    for i in range(9):
        r = random.uniform(0.35, 0.7)
        o.append(sphere("gas", r, (random.uniform(-0.9, 0.9), random.uniform(-0.4, 0.4), 1.85 + random.uniform(-0.2, 0.5)), gas1 if i % 2 else gas2, seg=10, rings=6))
    register(o, "teargas", tex="grime", uv_scale=1.0, alpha=0.82, ao=False)


def tyre_stack():
    """Burning-tyre style pile (no fire) - stumble obstacle."""
    tyre = mat("tyre", "#1e1e1e")
    o = []
    for i, (x, y) in enumerate(((-0.45, 0.1), (0.4, -0.1), (0.0, 0.3), (-0.1, -0.35))):
        o.append(torus("tyre", 0.32, 0.14, (x, y, 0.15), tyre, seg=16, ring=8))
    o.append(torus("tyre_top", 0.32, 0.14, (0.0, 0.0, 0.45), tyre, rot=(20, 0, 0), seg=16, ring=8))
    register(o, "tyre_stack", tex="grime", uv_scale=1.0)


def police_van():
    """Parked white police van with blue stripe - side decoration."""
    white = mat("van_white", "#f2f2f2")
    blue = mat("police_blue", "#1f3a93")
    dark = mat("pr_dark", "#2b2b2b")
    glass = mat("glass", "#8fd3ff", rough=0.2)
    o = [box("body", (2.0, 5.0, 1.4), (0, 2.5, 1.0), white, bevel=0.08), box("cab", (1.9, 1.4, 0.9), (0, 4.9, 0.95), white, bevel=0.08),
         box("stripe", (2.02, 5.0, 0.25), (0, 2.5, 1.0), blue), box("windshield", (1.7, 0.06, 0.6), (0, 5.6, 1.15), glass),
         box("lights", (1.0, 0.4, 0.2), (0, 2.5, 1.8), mat("siren_red", "#ff2a2a", emissive="#ff2a2a", emissive_strength=2))]
    for yy in (1.0, 4.5):
        for sx in (-1, 1):
            o.append(cyl("wheel", 0.4, 0.3, (sx * 0.9, yy, 0.4), dark, rot=(0, 90, 0), verts=14))
    register(o, "police_van", tex="rust_metal", uv_scale=2.0)


def flag_pole():
    green = mat("flag_green", "#0f7a3d")
    white = mat("flag_white", "#ffffff")
    steel = mat("gantry", "#6b7280")
    o = [cyl("pole", 0.06, 7.0, (0, 0, 3.5), steel, verts=8), box("flag", (0.06, 2.2, 1.4), (0, 1.1, 6.2), green), box("flag_white", (0.07, 0.55, 1.4), (0, 0.27, 6.2), white),
         sphere("moon", 0.35, (0, 1.3, 6.2), white, seg=12, rings=8, scale=(0.1, 1, 1))]
    register(o, "flag_pole", tex=None)


if __name__ == "__main__":
    reset()
    for fn in (train_passenger, train_metro, train_freight, train_ramp,
               barrier_low, barrier_high, barrier_mid, barrier_wall, bush, light_pole,
               tunnel, pillar, overpass, station_platform, ground_tile, wall_segment, container_stack,
               lamp_post, dhaba, bench, rickshaw, gantry, wires, station_roof,
               road_tile, container_truck, army_jeep, dirt_ramp, police_barricade, road_closed_gantry, cones, teargas, tyre_stack, police_van, flag_pole):
        fn()
    for i in range(4):
        wall_graffiti(i)
    for i in range(6):
        container(i)
    export("props.glb", PROPS, bake=True)
