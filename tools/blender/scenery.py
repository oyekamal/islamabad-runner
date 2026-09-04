"""Background scenery: Islamabad landmarks, buildings, trees, hills, billboards.

Origins at ground level, centred in X, near edge at y=0 (extends +Y).
Run: python3 tools/blender/scenery.py -> public/models/scenery.glb
"""
import math, sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from lib import *
from mathutils import Euler

PROPS = []
_cx = 0.0
random.seed(7)


def register(objs, name):
    global _cx
    o = join(objs, name)
    set_origin(o, (0, 0, 0))
    _cx += 40.0
    o.location = (_cx, 0, 0)
    PROPS.append(o)
    return o


def text_mesh(body, size, loc, material, rot=(90, 0, 0), extrude=0.03):
    bpy.ops.object.text_add(location=loc)
    t = bpy.context.active_object
    t.data.body = body
    t.data.size = size
    t.data.extrude = extrude
    t.data.align_x = 'CENTER'
    t.data.align_y = 'CENTER'
    t.rotation_euler = [math.radians(a) for a in rot]
    bpy.ops.object.convert(target='MESH')
    t = bpy.context.active_object
    t.data.materials.append(material)
    return t


# ----------------------------------------------------------------------------
def faisal_mosque():
    """Stylised Faisal Mosque: tent-shaped white hall, 4 slender minarets, gold crescent."""
    white = mat("fm_white", "#f4f1ea")
    shade = mat("fm_shade", "#d9d4c7")
    gold = mat("fm_gold", "#e8b923", rough=0.4, metal=0.5)
    base = mat("fm_base", "#c9c1b1")
    o = []
    W = 30
    o.append(box("plinth", (W + 10, W + 10, 1.5), (0, W / 2 + 5, 0.75), base))
    # tent: four triangular faces -> use a cone with 4 verts (pyramid) scaled
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=W * 0.75, radius2=0.0, depth=22, location=(0, W / 2 + 5, 1.5 + 11))
    tent = bpy.context.active_object
    tent.rotation_euler = (0, 0, math.radians(45))
    tent.data.transform(tent.rotation_euler.to_matrix().to_4x4()); tent.rotation_euler = (0, 0, 0)
    tent.name = "tent"; tent.data.materials.append(white)
    o.append(tent)
    # inner walls (glass band) at the base of the tent
    o.append(box("glass", (W * 0.9, W * 0.9, 3.0), (0, W / 2 + 5, 3.0), shade))
    # minarets
    for sx in (-1, 1):
        for sy in (0, 1):
            x = sx * (W * 0.8)
            y = 3 + sy * (W + 4)
            o.append(cyl("minaret", 1.2, 40, (x, y, 1.5 + 20), white, verts=8, r2=0.7))
            o.append(cone("min_top", 1.1, 0.0, 4, (x, y, 1.5 + 42), gold, verts=8))
    o.append(cyl("crescent_pole", 0.2, 3, (0, W / 2 + 5, 1.5 + 22 + 1.5), gold, verts=8))
    o.append(torus("crescent", 1.4, 0.25, (0, W / 2 + 5, 1.5 + 22 + 4.2), gold, rot=(90, 0, 0)))
    register(o, "faisal_mosque")


def centaurus():
    """Three tall towers joined by a curved mall base."""
    glass = mat("ct_glass", "#5fa8d3", rough=0.2)
    frame = mat("ct_frame", "#e6ebf0")
    mall = mat("ct_mall", "#b9c4cf")
    o = []
    o.append(box("mall", (40, 22, 8), (0, 11, 4), mall, bevel=0.5))
    for i, x in enumerate((-13, 0, 13)):
        h = 46 if i == 1 else 40
        o.append(box("tower", (8, 8, h), (x, 11, 8 + h / 2), glass, bevel=0.3))
        for k in range(int(h / 3)):
            o.append(box("floor_line", (8.2, 8.2, 0.25), (x, 11, 8 + 1.5 + k * 3), frame))
        o.append(box("crown", (8.6, 8.6, 1.2), (x, 11, 8 + h + 0.6), frame))
    register(o, "centaurus")


def pakistan_monument():
    """Four large petals around a star pedestal."""
    granite = mat("pm_granite", "#b56b4a")
    grey = mat("pm_grey", "#8a8f94")
    o = []
    o.append(cyl("plinth", 12, 1.5, (0, 12, 0.75), grey, verts=24))
    for a in (30, 100, 180, 260):
        r = math.radians(a)
        # petal = tilted flattened box
        bpy.ops.mesh.primitive_cube_add(size=1, location=(math.cos(r) * 5, 12 + math.sin(r) * 5, 8))
        p = bpy.context.active_object
        p.scale = (7, 1.2, 15)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        p.data.transform(Euler((math.radians(-25), 0, r + math.radians(90)), 'XYZ').to_matrix().to_4x4()) if False else None
        from mathutils import Euler as E
        p.data.transform(E((math.radians(25), 0, r - math.radians(90)), 'XYZ').to_matrix().to_4x4())
        p.name = "petal"; p.data.materials.append(granite)
        o.append(p)
    o.append(cyl("star_col", 1.2, 6, (0, 12, 4.5), grey, verts=10))
    register(o, "pakistan_monument")


def margalla_hills():
    """Long low-poly ridge, 240 m wide. Placed far behind the track."""
    g1 = mat("hill1", "#6f9a5b")
    g2 = mat("hill2", "#557d47")
    g3 = mat("hill3", "#8fb47a")
    o = []
    random.seed(3)
    for i in range(14):
        x = -110 + i * 17 + random.uniform(-4, 4)
        h = random.uniform(22, 48)
        r = random.uniform(16, 28)
        m = (g1, g2, g3)[i % 3]
        o.append(cone("hill", r, 0.0, h, (x, 20 + random.uniform(-8, 8), h / 2), m, verts=7))
    register(o, "margalla_hills")


def building(idx, w, d, h, floors, col, trim, balcony=True):
    o = []
    o.append(box("body", (w, d, h), (0, d / 2, h / 2), col, bevel=0.1))
    o.append(box("roofcap", (w + 0.3, d + 0.3, 0.3), (0, d / 2, h + 0.1), trim))
    o.append(box("watertank", (1.2, 1.2, 1.0), (w * 0.3, d * 0.5, h + 0.75), mat("tank", "#2d2d2d")))
    glass = mat("bl_glass", "#3d6f9e", rough=0.2)
    fh = h / floors
    nwin = max(2, int(w / 2.2))
    for f in range(floors):
        z = fh * f + fh * 0.55
        for k in range(nwin):
            x = -w / 2 + (k + 0.5) * (w / nwin)
            o.append(box("win", (w / nwin * 0.55, 0.05, fh * 0.45), (x, -0.02, z), glass))
        if balcony and f > 0:
            o.append(box("balcony", (w * 0.96, 0.6, 0.12), (0, -0.3, fh * f + 0.06), trim))
            o.append(box("railing", (w * 0.96, 0.05, 0.6), (0, -0.6, fh * f + 0.4), trim))
    return o


def buildings():
    palettes = [("#e8d8c0", "#8b5a2b"), ("#f2e9d8", "#b56b4a"), ("#d8c8b0", "#5b6770"), ("#f0e0c8", "#1f6b3a"),
                ("#c9d4dc", "#2c3e8f"), ("#ead9c4", "#d6202b")]
    for i in range(6):
        col = mat(f"bld_{i}", palettes[i][0])
        trim = mat(f"bld_trim_{i}", palettes[i][1])
        w = random.choice((8, 10, 12))
        floors = random.choice((3, 4, 5, 6))
        h = floors * 3.2
        register(building(i, w, 9, h, floors, col, trim), f"building_{i}")


def tree():
    trunk = mat("trunk", "#6b4a2b")
    leaf1 = mat("leaf1", "#3f9b3f")
    leaf2 = mat("leaf2", "#2f7d34")
    o = [cyl("trunk", 0.22, 2.4, (0, 0, 1.2), trunk, verts=8),
         sphere("l1", 1.5, (0, 0, 3.2), leaf1, seg=10, rings=6),
         sphere("l2", 1.1, (0.8, 0.3, 3.9), leaf2, seg=10, rings=6),
         sphere("l3", 1.0, (-0.7, -0.4, 3.8), leaf2, seg=10, rings=6)]
    register(o, "tree")


def palm():
    trunk = mat("palm_trunk", "#8b6b47")
    leaf = mat("palm_leaf", "#2f9e44")
    o = [cyl("trunk", 0.18, 5.0, (0, 0, 2.5), trunk, verts=8, r2=0.12)]
    for a in range(0, 360, 60):
        r = math.radians(a)
        o.append(box("frond", (0.35, 2.4, 0.08), (math.cos(r) * 1.1, math.sin(r) * 1.1, 5.1), leaf, rot=(0, 0, a + 90)))
        o[-1].data.transform(Euler((0, 0, 0), 'XYZ').to_matrix().to_4x4())
    for i, ob in enumerate(o[1:]):
        # droop fronds
        a = math.radians(i * 60)
        ob.data.transform(Euler((math.sin(a) * math.radians(25), -math.cos(a) * math.radians(25), 0), 'XYZ').to_matrix().to_4x4())
    register(o, "palm")


def billboard(idx, text, bg, fg):
    steel = mat("bb_steel", "#6b7280")
    bgm = mat(f"bb_bg_{idx}", bg)
    fgm = mat(f"bb_fg_{idx}", fg, emissive=fg, emissive_strength=0.4)
    o = [cyl("post", 0.25, 6, (0, 0.3, 3), steel, verts=8),
         box("panel", (8, 0.3, 3.2), (0, 0.3, 7.4), bgm, bevel=0.05),
         box("frame", (8.3, 0.2, 3.5), (0, 0.42, 7.4), steel)]
    o.append(text_mesh(text, 1.1, (0, 0.12, 7.4), fgm))
    register(o, f"billboard_{idx}")


def metro_station():
    """Metro bus stop shelter with red canopy and route sign."""
    red = mat("ms_red", "#d6202b")
    glass = mat("ms_glass", "#9fd8ff", rough=0.2, alpha=0.6)
    steel = mat("bb_steel", "#6b7280")
    white = mat("ms_white", "#f7f7f7")
    o = [box("deck", (4, 14, 0.4), (0, 7, 0.2), mat("ms_deck", "#cfc7b8")),
         box("roof", (4.4, 14.4, 0.3), (0, 7, 4.2), red),
         box("back", (0.15, 14, 3.4), (1.8, 7, 2.3), glass)]
    for y in (1, 7, 13):
        o.append(cyl("post", 0.12, 3.8, (-1.6, y, 2.1), steel, verts=8))
        o.append(cyl("post", 0.12, 3.8, (1.6, y, 2.1), steel, verts=8))
    o.append(box("sign", (0.2, 5, 0.9), (-1.9, 7, 3.4), white))
    o.append(text_mesh("METRO BUS", 0.5, (-2.02, 7, 3.4), red, rot=(90, 0, -90)))
    register(o, "metro_station")


def container_yard():
    cols = [mat("cy_red", "#c8322b"), mat("cy_blue", "#1f4fa3"), mat("cy_orange", "#f08a1d"), mat("cy_green", "#2a8c4a")]
    o = []
    random.seed(11)
    for i in range(4):
        for j in range(random.choice((1, 2, 3))):
            o.append(box("cont", (2.4, 6.0, 2.4), (-4 + i * 2.7, 3.0 + random.uniform(-0.3, 0.3), 1.2 + j * 2.4), random.choice(cols), bevel=0.03))
    register(o, "container_yard")


def overpass_sign():
    """Big green highway sign spanning above the track (decor): 'D-CHOWK ->'"""
    green = mat("hs_green", "#0f7a3d")
    white = mat("hs_white", "#f7f7f7", emissive="#f7f7f7", emissive_strength=0.3)
    steel = mat("bb_steel", "#6b7280")
    o = [box("beam", (12, 0.3, 0.3), (0, 0, 6.2), steel),
         cyl("post_l", 0.18, 6.4, (-5.8, 0, 3.2), steel, verts=8),
         cyl("post_r", 0.18, 6.4, (5.8, 0, 3.2), steel, verts=8),
         box("panel", (7, 0.2, 1.8), (0, -0.05, 7.2), green, bevel=0.05)]
    o.append(text_mesh("D-CHOWK  →", 0.8, (0, -0.2, 7.2), white))
    register(o, "overpass_sign")


if __name__ == "__main__":
    reset()
    from mathutils import Euler
    faisal_mosque(); centaurus(); pakistan_monument(); margalla_hills(); buildings(); tree(); palm()
    billboard(0, "ISLAMABAD RUNNER", "#1fb2a6", "#ffffff")
    billboard(1, "CHAI  •  PARATHA", "#f5c400", "#2b1d12")
    billboard(2, "MARGALLA TOURS", "#2c3e8f", "#ffffff")
    metro_station(); container_yard(); overpass_sign()
    export("scenery.glb", PROPS, bake=True)
