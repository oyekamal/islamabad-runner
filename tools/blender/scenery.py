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


def _frond_path(base, direction, length, segs, rise, dip):
    """Arced path: climbs to a peak then droops toward the tip, like a real palm frond."""
    pts, widths = [], []
    for s in range(segs + 1):
        t = s / segs
        h = rise * math.sin(t * math.pi * 0.85) - dip * t * t
        pts.append(base + direction * (length * t) + Vector((0, 0, h)))
        widths.append(0.5 * (1 - t) + 0.08 * t)
    return pts, widths


def palm():
    trunk = mat("palm_trunk", "#8b6b47")
    trunk_d = mat("palm_trunk_dark", "#6b4f33")
    leaf = mat("palm_leaf", "#2f9e44")
    leaf2 = mat("palm_leaf2", "#3fbf58")
    old_leaf = mat("palm_leaf_old", "#8a6a38")
    o = [cyl("trunk", 0.20, 5.0, (0.05, 0, 2.5), trunk, verts=8, r2=0.13)]
    for k in range(7):   # trunk rings
        o.append(cyl("ring", 0.21 - k * 0.01, 0.12, (0.05, 0, 0.5 + k * 0.65), trunk_d, verts=8))
    o.append(sphere("crown", 0.26, (0.05, 0, 5.05), trunk_d, seg=7, rings=4))
    crown = Vector((0.05, 0, 5.12))
    n_fronds = 9   # fresh fronds: chains of 4 tapering beams (5 pts) following an up-then-droop arc
    rng = random.Random(42)
    for i in range(n_fronds):
        a = math.radians(i * (360 / n_fronds) + rng.uniform(-6, 6))
        d = Vector((math.cos(a), math.sin(a), 0))
        L = rng.uniform(2.2, 2.7)
        pts, widths = _frond_path(crown, d, L, segs=4, rise=0.85, dip=1.5)
        m = leaf if i % 2 else leaf2
        o.append(blade(f"frond_{i}", pts, widths, m, thickness=0.0))
    for i, a0 in enumerate((55, 225)):   # 2 drooping older brown fronds, hang further down
        a = math.radians(a0)
        d = Vector((math.cos(a), math.sin(a), 0))
        pts, widths = _frond_path(crown, d, 2.0, segs=3, rise=0.25, dip=2.1)
        o.append(blade(f"frond_old_{i}", pts, widths, old_leaf, thickness=0.0))
    for k in range(3):   # coconuts
        rr = math.radians(k * 120)
        o.append(sphere("coco", 0.13, (0.05 + math.cos(rr) * 0.3, math.sin(rr) * 0.3, 4.85), mat("coconut", "#6b4a2b"), seg=6, rings=4))
    register(o, "palm", tex="foliage", uv_scale=1.6)


def tree_pipal():
    """Broad round-canopy pipal tree with a thick trunk."""
    trunk = mat("pipal_trunk", "#6b4a2b")
    leaf1 = mat("pipal_leaf1", "#4a9c4f")
    leaf2 = mat("pipal_leaf2", "#3a7d40")
    leaf3 = mat("pipal_leaf3", "#63b562")
    o = [cyl("trunk", 0.42, 2.2, (0, 0, 1.1), trunk, verts=10, r2=0.30),
         beam("branch_l", (0, 0, 1.9), (1.0, 0.3, 2.7), 0.16, trunk),
         beam("branch_r", (0, 0, 2.1), (-0.9, -0.4, 2.8), 0.15, trunk),
         beam("branch_b", (0, 0, 2.0), (0.1, 1.0, 2.9), 0.14, trunk),
         blob("c1", 2.2, (0, 0.1, 3.9), leaf1, seed=11, subdiv=2),
         blob("c2", 1.5, (1.3, 0.3, 3.7), leaf2, seed=12, subdiv=1),
         blob("c3", 1.4, (-1.3, -0.3, 3.7), leaf2, seed=13, subdiv=1),
         blob("c4", 1.3, (0.2, -1.3, 3.6), leaf2, seed=14, subdiv=1),
         blob("c5", 1.2, (0.3, 1.2, 4.6), leaf3, seed=15, subdiv=1),
         blob("c6", 1.0, (-1.0, 0.9, 4.5), leaf3, seed=16, subdiv=1)]
    register(o, "tree_pipal", tex="foliage", uv_scale=1.6)


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


# ----------------------------------------------------------------------------
# Trackside landmark props (NEW) -- close enough to actually appear in play,
# unlike the far fog-tinted skyline set above. Footprint = X (across road) x
# Y (along road); "faces +Y" = the road-facing / player-approaching side.
def landmark_faisal():
    """Small trackside Faisal Mosque replica. Footprint 22x22 x height ~17.6m."""
    white = mat("lf_white", "#f4f1ea")
    shade = mat("lf_shade", "#d9d4c7")
    gold = mat("lf_gold", "#e8b923", rough=0.4, metal=0.5)
    base = mat("lf_base", "#c9c1b1")
    W = 16.0
    o = [box("plinth", (W + 6, W + 6, 1.2), (0, W / 2, 0.6), base)]
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=W * 0.75, radius2=0.0, depth=14, location=(0, W / 2, 1.2 + 7))
    tent = bpy.context.active_object
    tent.data.transform(Euler((0, 0, math.radians(45)), 'XYZ').to_matrix().to_4x4())
    tent.name = "tent"; tent.data.materials.append(white)
    o.append(tent)
    o.append(box("glass", (W * 0.9, W * 0.9, 2.0), (0, W / 2, 2.2), shade))
    for sx in (-1, 1):
        for sy in (0, 1):
            x = sx * (W * 0.65)
            y = 2 + sy * (W * 0.75)
            o.append(cyl("minaret", 0.7, 14, (x, y, 1.2 + 7), white, verts=8, r2=0.4))
            o.append(cone("min_top", 0.65, 0.0, 2.4, (x, y, 1.2 + 14 + 1.2), gold, verts=8))
    o.append(cyl("crescent_pole", 0.12, 2.0, (0, W / 2, 1.2 + 14 + 1.0), gold, verts=8))
    o.append(torus("crescent", 0.8, 0.14, (0, W / 2, 1.2 + 14 + 2.2), gold, rot=(90, 0, 0)))
    register(o, "landmark_faisal", tex="plaster", uv_scale=6.0, ao=False)


def landmark_monument():
    """Small trackside Pakistan Monument. Footprint ~13.5m diameter x ~9.1m tall."""
    granite = mat("lm_granite", "#b56b4a")
    grey = mat("lm_grey", "#8a8f94")
    o = [cyl("plinth", 6.0, 1.2, (0, 6.0, 0.6), grey, verts=20)]
    for a in (30, 100, 180, 260):
        r = math.radians(a)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(math.cos(r) * 2.5, 6.0 + math.sin(r) * 2.5, 5.2))
        p = bpy.context.active_object
        p.scale = (4.5, 0.8, 8.5)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        p.data.transform(Euler((math.radians(25), 0, r - math.radians(90)), 'XYZ').to_matrix().to_4x4())
        p.name = "petal"; p.data.materials.append(granite)
        o.append(p)
    o.append(cyl("star_col", 0.8, 4.0, (0, 6.0, 1.2 + 2.0), grey, verts=10))
    register(o, "landmark_monument", tex="plaster", uv_scale=6.0, ao=False)


def landmark_parliament():
    """Low white Parliament House block: colonnade front + flag pole. 28m wide x ~13.8m tall."""
    white = mat("lp_white", "#efece2")
    trim = mat("lp_trim", "#cfc8b6")
    flagm = mat("lp_flag", "#0f7a3d")
    o = [box("steps", (29, 2.0, 0.6), (0, -7.2, 0.3), trim),
         box("block", (28, 12, 8), (0, -1.0, 4.6), white, bevel=0.15),
         box("roofcap", (28.6, 12.6, 0.8), (0, -1.0, 9.0), trim)]
    for k in range(10):
        x = -12 + k * (24 / 9)
        o.append(cyl("column", 0.35, 7.0, (x, -6.2, 4.1), white, verts=10))
    o.append(box("entablature", (24, 1.0, 1.0), (0, -6.2, 8.0), trim))
    o.append(cyl("flagpole", 0.1, 4.0, (0, -1.0, 9.4 + 2.0), trim, verts=8))
    o.append(box("flag", (1.2, 0.05, 0.8), (0.65, -1.0, 9.4 + 3.5), flagm))
    register(o, "landmark_parliament", tex="plaster", uv_scale=6.0, ao=False)


def landmark_dchowk_gate():
    """Gate spanning the road: posts at x=+-5.8, beam ~6.5m, green/white D-CHOWK panel + flags."""
    steel = mat("dg_steel", "#6b7280")
    green = mat("dg_green", "#0f7a3d")
    white = mat("dg_white", "#f7f7f7", emissive="#f7f7f7", emissive_strength=0.3)
    o = [cyl("post_l", 0.2, 6.5, (-5.8, 0, 3.25), steel, verts=8),
         cyl("post_r", 0.2, 6.5, (5.8, 0, 3.25), steel, verts=8),
         box("beam", (12.2, 0.32, 0.32), (0, 0, 6.5), steel),
         box("panel", (7.0, 0.2, 1.8), (0, -0.05, 7.3), green, bevel=0.05)]
    o.append(text_mesh("D-CHOWK", 0.8, (0, -0.2, 7.3), white))
    for k, fx in enumerate((-4.6, -2.3, 0, 2.3, 4.6)):
        o.append(box(f"flag_{k}", (0.5, 0.03, 0.35), (fx, 0, 6.85), green, rot=(0, 0, 12 if k % 2 else -12)))
    register(o, "landmark_dchowk_gate", tex="rust_metal", uv_scale=3.0)


def landmark_container_wall():
    """Side prop: shipping containers stacked 3 high, 10m long along the road, 2.5m deep."""
    cols = [mat("cw_blue", "#0a3a7a"), mat("cw_red", "#c8322b"), mat("cw_rust", "#8b4513")]
    o = []
    for row in range(3):
        z = 1.2 + row * 2.5
        for i in range(4):
            y = -3.75 + i * 2.5
            c = cols[(row + i) % len(cols)]
            o.append(box(f"container_{row}_{i}", (2.5, 2.4, 2.4), (0, y, z), c, bevel=0.04))
            o.append(box(f"rib_{row}_{i}", (2.55, 2.44, 0.06), (0, y, z + 0.9), mat("cw_trim", "#2b2b2b")))
    register(o, "landmark_container_wall", tex="rust_metal", uv_scale=3.0)


def landmark_metro_bridge():
    """Elevated red/white Metro Bus bridge segment spanning the road, deck at 7m, 12m long, with a bus on top."""
    steel = mat("mb_steel", "#6b7280")
    red = mat("mb_red", "#d6202b")
    white = mat("mb_white", "#f7f7f7")
    o = []
    for x in (-6.3, 6.3):
        for y in (-4.5, 0, 4.5):
            o.append(cyl(f"post_{x}_{y}", 0.35, 7.0, (x, y, 3.5), steel, verts=10))
    o.append(box("deck", (13.2, 12.2, 0.6), (0, 0, 7.0), mat("mb_deck", "#8a8f94"), bevel=0.03))
    o.append(box("rail_l", (0.15, 12.2, 0.5), (-6.5, 0, 7.55), red))
    o.append(box("rail_r", (0.15, 12.2, 0.5), (6.5, 0, 7.55), red))
    for k in range(5):
        y = -4.8 + k * 2.4
        o.append(box(f"stripe_{k}", (13.3, 0.4, 0.06), (0, y, 7.31), white))
    o.append(box("bus_body", (2.1, 4.0, 1.9), (0, 1.0, 7.3 + 0.95), red, bevel=0.06))
    o.append(box("bus_roof", (2.0, 3.8, 0.2), (0, 1.0, 7.3 + 1.95), white))
    o.append(box("bus_glass", (2.12, 3.6, 0.6), (0, 1.0, 7.3 + 1.4), mat("mb_glass", "#9fd8ff", rough=0.2)))
    register(o, "landmark_metro_bridge", tex="rust_metal", uv_scale=3.0)


if __name__ == "__main__":
    reset()
    from mathutils import Euler
    faisal_mosque(); centaurus(); pakistan_monument(); margalla_hills(); buildings(); tree(); palm()
    billboard(0, "ISLAMABAD RUNNER", "#1fb2a6", "#ffffff")
    billboard(1, "CHAI  •  PARATHA", "#f5c400", "#2b1d12")
    billboard(2, "MARGALLA TOURS", "#2c3e8f", "#ffffff")
    metro_station(); container_yard(); overpass_sign()
    tree_pipal()
    landmark_faisal(); landmark_monument(); landmark_parliament()
    landmark_dchowk_gate(); landmark_container_wall(); landmark_metro_bridge()
    export("scenery.glb", PROPS, bake=True)
