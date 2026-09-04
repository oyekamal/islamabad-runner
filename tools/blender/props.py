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
PROPS = []
_cursor_x = 0.0


def register(objs, name, origin=(0, 0, 0)):
    """Join parts into a prop, set origin, and shelve it to the side."""
    global _cursor_x
    o = join(objs, name)
    set_origin(o, origin)
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
    register(o, "train_passenger")


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
    register(o, "train_metro")


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
    register(o, "train_freight")


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
    register(o, "train_ramp")


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
    register(o, "barrier_low")


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
    register(o, "barrier_high")


def barrier_mid():
    """Horizontal bar barrier - jump over OR roll under (gap below 1.0, top at 1.5)."""
    red = mat("bar_red", "#e0382b")
    white = mat("bar_white", "#f7f7f7")
    dark = mat("pr_dark", "#2b2b2b")
    o = []
    o.append(box("bar", (TRAIN_W, 0.14, 0.34), (0, 0, 1.30), white, bevel=0.02))
    for i in range(4):
        o.append(box("stripe", (0.24, 0.16, 0.36), (-0.75 + i * 0.5, 0, 1.30), red))
    for sx in (-1, 1):
        o.append(box("leg", (0.10, 0.10, 1.5), (sx * 0.92, 0, 0.75), dark))
        o.append(box("foot", (0.20, 0.50, 0.06), (sx * 0.92, 0, 0.03), dark))
    register(o, "barrier_mid")


def barrier_wall():
    """Concrete block wall - jump or roll impossible, must switch lane. (not used for lane-blocking alone)"""
    conc = mat("concrete", "#b9b4a6")
    red = mat("bar_red", "#e0382b")
    o = []
    o.append(box("block", (TRAIN_W, 0.9, 1.1), (0, 0.45, 0.55), conc, bevel=0.04))
    o.append(box("stripe", (TRAIN_W + 0.02, 0.06, 0.25), (0, 0.0, 0.7), red))
    register(o, "barrier_block")


def bush():
    g1 = mat("bush1", "#3f9b3f")
    g2 = mat("bush2", "#2f7d34")
    pot = mat("pot", "#8b5a2b")
    o = []
    o.append(box("pot", (1.6, 0.8, 0.5), (0, 0, 0.25), pot, bevel=0.04))
    o.append(sphere("b1", 0.55, (-0.4, 0, 0.8), g1, seg=10, rings=6))
    o.append(sphere("b2", 0.6, (0.35, 0.05, 0.85), g2, seg=10, rings=6))
    o.append(sphere("b3", 0.45, (0, -0.1, 1.05), g1, seg=10, rings=6))
    register(o, "bush")


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
    register(o, "light_pole")


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
    o.append(box("trim", (W + 0.7, 0.3, 0.4), (0, 0.15, H + 0.2), trim))
    o.append(box("trim2", (W + 0.7, 0.3, 0.4), (0, L - 0.15, H + 0.2), trim))
    register(o, "tunnel")


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
    register(o, "pillar")


def overpass():
    """Beam connecting pillars, spanning all lanes over head (decoration)."""
    conc = mat("pillar_conc", "#a39d90")
    rail = mat("gantry", "#6b7280")
    o = []
    o.append(box("deck", (11, 3.0, 0.5), (0, 1.5, 5.0), conc))
    o.append(box("rail1", (11, 0.1, 0.9), (0, 0.1, 5.7), rail))
    o.append(box("rail2", (11, 0.1, 0.9), (0, 2.9, 5.7), rail))
    register(o, "overpass")


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
    register(o, "station_platform")


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
    register(o, "ground_tile")


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
    register(o, "wall_segment")


def container_stack():
    """Shipping containers stacked beside the track — a nod to the prototype."""
    cols = [mat("cont_red", "#c8322b"), mat("cont_blue", "#1f4fa3"), mat("cont_orange", "#f08a1d")]
    o = []
    for i, cm in enumerate(cols):
        o.append(box("cont", (2.4, 6.0, 2.4), (0, 3.0 + (i % 2) * 0.4, 1.2 + i * 2.4), cm, bevel=0.03))
    register(o, "container_stack")


if __name__ == "__main__":
    reset()
    for fn in (train_passenger, train_metro, train_freight, train_ramp,
               barrier_low, barrier_high, barrier_mid, barrier_wall, bush, light_pole,
               tunnel, pillar, overpass, station_platform, ground_tile, wall_segment, container_stack):
        fn()
    export("props.glb", PROPS, bake=True)
