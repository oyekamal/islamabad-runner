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


def register(objs, name, tex="grime", uv_scale=2.0, ao=True):
    global _cx
    o = join(objs, name)
    set_origin(o, (0, 0, 0))
    o["tex"] = tex; o["uv_scale"] = uv_scale; o["ao"] = ao
    _cx += 40.0
    o.location = (_cx, 0, 0)
    PROPS.append(o)
    return o


def text_mesh(body, size, loc, material, rot=(90, 0, 0), extrude=0.03):
    bpy.ops.object.text_add(location=loc)
    t = bpy.context.active_object
    t.data.resolution_u = 3
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
    register(o, "faisal_mosque", tex="plaster", uv_scale=8.0, ao=False)


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
    register(o, "centaurus", tex="plaster", uv_scale=8.0, ao=False)


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
    register(o, "pakistan_monument", tex="plaster", uv_scale=6.0, ao=False)


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
    register(o, "margalla_hills", tex="foliage", uv_scale=12.0, ao=False)


def building(idx, w, d, h, floors, col, trim, balcony=True):
    import random
    o = []
    o.append(box("body", (w, d, h), (0, d / 2, h / 2), col, bevel=0.1))
    o.append(box("roofcap", (w + 0.3, d + 0.3, 0.3), (0, d / 2, h + 0.1), trim))
    o.append(box("watertank", (1.2, 1.2, 1.0), (w * 0.3, d * 0.5, h + 0.75), mat("tank", "#2d2d2d")))
    glass = mat("bl_glass", "#3d6f9e", rough=0.2)
    fh = h / floors
    nwin = max(2, int(w / 2.2))
    frame = mat("win_frame", "#f7f3ea")
    ac = mat("ac_unit", "#d8d8d8")
    rng = random.Random(idx * 7 + 3)
    for f in range(floors):
        z = fh * f + fh * 0.55
        for k in range(nwin):
            x = -w / 2 + (k + 0.5) * (w / nwin)
            o.append(box("win_frame", (w / nwin * 0.62, 0.06, fh * 0.52), (x, -0.03, z), frame))
            o.append(box("win", (w / nwin * 0.55, 0.05, fh * 0.45), (x, -0.06, z), glass))
            if rng.random() < 0.3:
                o.append(box("ac", (0.6, 0.5, 0.5), (x + w / nwin * 0.2, -0.3, z - fh * 0.3), ac, bevel=0.03))
        if balcony and f > 0:
            o.append(box("balcony", (w * 0.96, 0.6, 0.12), (0, -0.3, fh * f + 0.06), trim))
            o.append(box("railing", (w * 0.96, 0.05, 0.6), (0, -0.6, fh * f + 0.4), trim))
            for k in range(int(w / 0.5)):
                o.append(box("bar", (0.04, 0.04, 0.6), (-w * 0.48 + k * 0.5, -0.6, fh * f + 0.4), trim))
    # ground floor: shop fronts with awnings and a signboard
    shop_cols = [("#e0382b", "#ffffff"), ("#1f6b3a", "#ffcc33"), ("#2c7be5", "#ffffff"), ("#f5c400", "#1a1a1a")]
    names = ["CHAI KHANA", "MOBILE ZONE", "ISB BAKERS", "AL-KARAM", "NAAN SHOP", "DR. ASIF CLINIC", "KHAN TRAVELS", "DATA CABLE"]
    sc = shop_cols[idx % len(shop_cols)]
    sign_bg = mat(f"sign_bg_{idx}", sc[0]); sign_fg = mat(f"sign_fg_{idx}", sc[1], emissive=sc[1], emissive_strength=0.3)
    o.append(box("signboard", (w * 0.9, 0.12, 0.7), (0, -0.08, fh * 0.92), sign_bg))
    o.append(text_mesh(names[idx % len(names)], 0.4, (0, -0.16, fh * 0.92), sign_fg, extrude=0.01))
    for k in range(6):
        o.append(box("awning", (w * 0.9 / 6, 0.9, 0.05), (-w * 0.45 + (k + 0.5) * (w * 0.9 / 6), -0.5, fh * 0.55), sign_bg if k % 2 else mat("awning_white", "#f7f7f7"), rot=(-20, 0, 0)))
    o.append(box("dish", (0.8, 0.1, 0.8), (-w * 0.3, d * 0.5, h + 0.9), mat("dish", "#e8e8e8"), rot=(0, 30, 0)))
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
        register(building(i, w, 9, h, floors, col, trim), f"building_{i}", tex="plaster", uv_scale=3.0)


def tree():
    trunk = mat("trunk", "#6b4a2b")
    leaf1 = mat("leaf1", "#3f9b3f")
    leaf2 = mat("leaf2", "#2f7d34")
    leaf3 = mat("leaf3", "#5ab54a")
    o = [cyl("trunk", 0.24, 2.4, (0, 0, 1.2), trunk, verts=8, r2=0.16),
         beam("branch_l", (0, 0, 2.0), (0.7, 0.2, 3.0), 0.10, trunk),
         beam("branch_r", (0, 0, 2.2), (-0.6, -0.3, 3.1), 0.09, trunk),
         blob("l1", 1.5, (0, 0, 3.3), leaf1, seed=1, subdiv=2),
         blob("l2", 1.1, (0.85, 0.3, 3.9), leaf2, seed=2, subdiv=1),
         blob("l3", 1.0, (-0.75, -0.4, 3.8), leaf2, seed=3, subdiv=1),
         blob("l4", 0.8, (0.1, 0.6, 4.5), leaf3, seed=4, subdiv=1),
         blob("l5", 0.7, (-0.3, -0.8, 2.9), leaf3, seed=5, subdiv=1)]
    register(o, "tree", tex="foliage", uv_scale=1.6)


def palm():
    trunk = mat("palm_trunk", "#8b6b47")
    trunk_d = mat("palm_trunk_dark", "#6b4f33")
    leaf = mat("palm_leaf", "#2f9e44")
    leaf2 = mat("palm_leaf2", "#3fbf58")
    o = [cyl("trunk", 0.20, 5.0, (0.05, 0, 2.5), trunk, verts=8, r2=0.13)]
    for k in range(7):   # trunk rings
        o.append(cyl("ring", 0.21 - k * 0.01, 0.12, (0.05, 0, 0.5 + k * 0.65), trunk_d, verts=8))
    o.append(sphere("crown", 0.3, (0.05, 0, 5.05), trunk_d, seg=8, rings=6))
    for i, a in enumerate(range(0, 360, 45)):
        r = math.radians(a)
        d = Vector((math.cos(r), math.sin(r), 0))
        p0 = Vector((0.05, 0, 5.1))
        p1 = p0 + d * 1.3 + Vector((0, 0, 0.45))
        p2 = p1 + d * 1.4 + Vector((0, 0, -0.9))
        m = leaf if i % 2 else leaf2
        o.append(beam(f"frond_a_{a}", p0, p1, 0.34, m, thick2=0.06))
        o.append(beam(f"frond_b_{a}", p1, p2, 0.30, m, thick2=0.05))
    for k in range(3):   # coconuts
        rr = math.radians(k * 120)
        o.append(sphere("coco", 0.14, (0.05 + math.cos(rr) * 0.3, math.sin(rr) * 0.3, 4.85), mat("coconut", "#6b4a2b"), seg=8, rings=6))
    register(o, "palm", tex="foliage", uv_scale=1.6)


def billboard(idx, text, bg, fg):
    steel = mat("bb_steel", "#6b7280")
    bgm = mat(f"bb_bg_{idx}", bg)
    fgm = mat(f"bb_fg_{idx}", fg, emissive=fg, emissive_strength=0.4)
    o = [cyl("post", 0.25, 6, (0, 0.3, 3), steel, verts=8),
         box("panel", (8, 0.3, 3.2), (0, 0.3, 7.4), bgm, bevel=0.05),
         box("frame", (8.3, 0.2, 3.5), (0, 0.42, 7.4), steel)]
    o.append(text_mesh(text, 1.1, (0, 0.12, 7.4), fgm))
    register(o, f"billboard_{idx}", tex="rust_metal", uv_scale=3.0)


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
    register(o, "metro_station", tex="rust_metal", uv_scale=3.0)


def container_yard():
    cols = [mat("cy_red", "#c8322b"), mat("cy_blue", "#1f4fa3"), mat("cy_orange", "#f08a1d"), mat("cy_green", "#2a8c4a")]
    o = []
    random.seed(11)
    for i in range(4):
        for j in range(random.choice((1, 2, 3))):
            o.append(box("cont", (2.4, 6.0, 2.4), (-4 + i * 2.7, 3.0 + random.uniform(-0.3, 0.3), 1.2 + j * 2.4), random.choice(cols), bevel=0.03))
    register(o, "container_yard", tex="rust_metal", uv_scale=3.0)


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
    register(o, "overpass_sign", tex="rust_metal", uv_scale=3.0)


if __name__ == "__main__":
    reset()
    from mathutils import Euler
    faisal_mosque(); centaurus(); pakistan_monument(); margalla_hills(); buildings(); tree(); palm()
    billboard(0, "ISLAMABAD RUNNER", "#1fb2a6", "#ffffff")
    billboard(1, "CHAI  •  PARATHA", "#f5c400", "#2b1d12")
    billboard(2, "MARGALLA TOURS", "#2c3e8f", "#ffffff")
    metro_station(); container_yard(); overpass_sign()
    export("scenery.glb", PROPS, bake=True)
