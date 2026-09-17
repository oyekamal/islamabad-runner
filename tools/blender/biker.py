"""Rigged biker (rider on a dirt bike) + ranger chaser + static ranger obstacle.

Run: blender --background --python tools/blender/biker.py -- biker ranger
     -> public/models/biker.glb, public/models/ranger.glb
     (the targets after `--` are required: under Blender sys.argv[1:] holds Blender's own flags,
      so with no targets nothing is built)
Rest pose = riding pose. Bike faces +Y (Blender) = -Z (Three.js).
Look target: store/gemini/icon_a_sky.png + store/feature-graphic-1024x500.png; check with
  blender --background --python tools/blender/render_compare.py -- public/models/biker.glb shots/restyle/biker_vN.png
Material NAMES are a contract with src/data/characters.js (palette recolouring) and src/game/Chaser.js.
"""
import math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from lib import *
from lib import _finish
import character as ch

WHEEL_R = 0.43          # fat cartoon tyres (was 0.34)
AXLE_F, AXLE_R = 0.68, -0.66     # short cartoon wheelbase, keeps the bike ~2.2 m long


def sphere_band(name, radius, loc, material, ymin=0.0, zmin=-1.0, zmax=1.0, seg=24, rings=16, scale=None, cut=None):
    """UV sphere trimmed to the verts with local y >= ymin*R and zmin*R <= z <= zmax*R.
    Used for the curved wrap-around visor (an open shell facing +Y)."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=radius, location=loc)
    o = bpy.context.active_object
    if scale:
        o.scale = Vector(scale)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(o.data)
    kill = [v for v in bm.verts if v.co.y < ymin * radius - 1e-4 or v.co.z < zmin * radius - 1e-4 or v.co.z > zmax * radius + 1e-4]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    if cut is not None:
        # remove whole faces whose centre satisfies the predicate (e.g. the helmet's visor window)
        faces = [f for f in bm.faces if cut(f.calc_center_median())]
        bmesh.ops.delete(bm, geom=faces, context='FACES')
    bm.to_mesh(o.data)
    bm.free()
    return _finish(o, name, material, None, None, shade_smooth=True)


def build_biker():
    reset()
    # --- palette (names are a contract with src/data/characters.js; only colours may change)
    skin = mat("skin", "#f0c9a0")
    jacket = mat("jacket", "#1fb2a6")
    jacket_dark = mat("jacket_dark", "#158f86")
    pants = mat("pants", "#2c3e8f")
    helmet = mat("helmet", "#ff8a1f")
    visor = mat("visor", "#22347f", rough=0.1, alpha=0.6)          # translucent blue glass
    gloves = mat("gloves", "#2b2b2b")                                  # kept for the belt / visor frame
    boots = mat("boots", "#6b4226")                                    # brown boots
    bike = mat("bike_body", "#e63a2e")
    bike_dark = mat("bike_dark", "#2b2b2b")
    bike_metal = mat("bike_metal", "#b8bcc2", rough=0.4, metal=0.5)
    tyre = mat("tyre", "#1e1e1e")
    rim = mat("rim", "#f4f4f4", rough=0.5, metal=0.0)                 # wide WHITE rims
    lamp = mat("headlamp", "#fffdf2", emissive="#fff6d0", emissive_strength=1.2)
    tail = mat("taillamp", "#ff2a2a", emissive="#ff2a2a", emissive_strength=2)
    seat = mat("seat", "#262626")
    pack = mat("backpack", "#ffcc33")
    accent = mat("jacket_accent", "#ffffff")
    chrome = mat("chrome", "#dfe5ea", rough=0.25, metal=0.8)
    rubber = mat("rubber", "#2a2a2a")
    amber = mat("amber_ind", "#ffb300", emissive="#ffb300", emissive_strength=1.5)
    # new (additive) materials
    eye_b = mat("eye_black", "#1c1c24")
    mouth = mat("face_mouth", "#8f3b2c")
    pack_dark = mat("backpack_dark", "#c9932a")

    parts = {}
    def P(bone, obj):
        parts.setdefault(bone, []).append(obj.name)
        tag_part(obj)
        return obj

    # ------------------------------------------------------------ bike (bone "Bike")  Honda-70 silhouette, chunky
    # frame
    P("Bike", beam("frame_main", (0, AXLE_R + 0.20, 0.60), (0, 0.52, 0.86), 0.11, bike, bevel=0.02))
    P("Bike", beam("frame_down", (0, 0.55, 0.88), (0, 0.18, 0.44), 0.09, bike_dark))
    P("Bike", beam("frame_rear", (0, AXLE_R + 0.18, 0.60), (0, -0.05, 0.44), 0.09, bike_dark))
    # engine block + chrome cylinder
    P("Bike", box("engine", (0.40, 0.50, 0.36), (0, 0.06, 0.50), bike_metal, bevel=0.05))
    for k in range(4):
        P("Bike", box(f"fin_{k}", (0.46, 0.04, 0.26), (0, -0.10 + k * 0.09, 0.52), bike_dark))
    P("Bike", cyl("cyl_head", 0.15, 0.24, (0, 0.14, 0.76), chrome, verts=12))
    P("Bike", box("crank_cover", (0.46, 0.22, 0.22), (0, -0.02, 0.44), chrome, bevel=0.04))
    # tank: big red block with a teal/white stripe decal on each flank
    P("Bike", box("tank", (0.46, 0.62, 0.34), (0, 0.24, 0.94), bike, bevel=0.09))
    for sx in (-1, 1):
        P("Bike", box(f"tank_decal_w_{sx}", (0.02, 0.40, 0.05), (sx * 0.235, 0.22, 0.99), accent))
        P("Bike", box(f"tank_decal_t_{sx}", (0.02, 0.40, 0.04), (sx * 0.235, 0.22, 0.93), jacket))
        P("Bike", box(f"side_cover_{sx}", (0.06, 0.42, 0.28), (sx * 0.20, -0.30, 0.70), bike, bevel=0.03))
        P("Bike", box(f"side_decal_{sx}", (0.02, 0.26, 0.04), (sx * 0.235, -0.30, 0.74), accent))
    P("Bike", cyl("tank_cap", 0.06, 0.03, (0, 0.30, 1.12), chrome, verts=10))
    # seat: black, long, chunky
    P("Bike", box("seat", (0.40, 0.74, 0.14), (0, -0.30, 0.92), seat, bevel=0.05))
    P("Bike", box("seat_base", (0.36, 0.70, 0.06), (0, -0.30, 0.84), bike_dark))
    # fenders (red), rear rack (chrome), lamps
    P("Bike", box("rear_fender", (0.32, 0.52, 0.07), (0, AXLE_R - 0.02, WHEEL_R + 0.46), bike, bevel=0.03))
    P("Bike", box("rear_fender_tail", (0.30, 0.14, 0.07), (0, AXLE_R - 0.33, WHEEL_R + 0.40), bike, rot=(28, 0, 0), bevel=0.02))
    P("Bike", box("rack", (0.34, 0.34, 0.03), (0, AXLE_R - 0.16, 0.99), chrome))
    P("Bike", box("rack_bar", (0.34, 0.03, 0.03), (0, AXLE_R - 0.32, 0.99), chrome))
    for sx in (-1, 1):
        P("Bike", beam(f"rack_leg_{sx}", (sx * 0.15, AXLE_R - 0.20, 0.99), (sx * 0.15, AXLE_R - 0.10, WHEEL_R + 0.48), 0.025, chrome))
    P("Bike", box("front_fender", (0.32, 0.54, 0.07), (0, AXLE_F + 0.02, WHEEL_R + 0.46), bike, bevel=0.03))
    P("Bike", box("taillamp", (0.16, 0.05, 0.08), (0, AXLE_R - 0.44, WHEEL_R + 0.44), tail))
    for sx in (-1, 1):
        P("Bike", box(f"ind_r_{sx}", (0.07, 0.07, 0.05), (sx * 0.22, AXLE_R - 0.40, 0.90), amber))
        P("Bike", box(f"ind_f_{sx}", (0.07, 0.07, 0.05), (sx * 0.24, 0.86, 1.06), amber))
    # square chrome headlight with a white lens + small number board above
    P("Bike", box("headlamp_rim", (0.30, 0.14, 0.28), (0, 0.86, 1.06), chrome, bevel=0.02))
    P("Bike", box("headlamp", (0.24, 0.03, 0.22), (0, 0.935, 1.06), lamp))
    P("Bike", box("speedo", (0.16, 0.12, 0.08), (0, 0.66, 1.20), bike_dark, bevel=0.02))
    P("Bike", cyl("speedo_face", 0.05, 0.01, (0, 0.60, 1.22), accent, rot=(90, 0, 0), verts=10))
    # forks / swingarm / shocks / pegs / bars / mirrors
    for sx in (-1, 1):
        P("Bike", beam(f"fork_{sx}", (sx * 0.11, AXLE_F, WHEEL_R), (sx * 0.11, 0.66, 1.08), 0.06, chrome))
        P("Bike", beam(f"fork_cover_{sx}", (sx * 0.11, 0.70, 0.78), (sx * 0.11, 0.66, 1.08), 0.09, bike_dark))
        P("Bike", beam(f"swing_{sx}", (sx * 0.12, AXLE_R, WHEEL_R), (sx * 0.12, -0.12, 0.48), 0.06, bike_dark))
        P("Bike", beam(f"shock_{sx}", (sx * 0.17, AXLE_R + 0.12, WHEEL_R + 0.02), (sx * 0.17, -0.48, 0.86), 0.045, chrome))
        P("Bike", box(f"peg_{sx}", (0.24, 0.12, 0.05), (sx * 0.26, -0.02, 0.40), rubber))
        P("Bike", box(f"grip_{sx}", (0.16, 0.07, 0.07), (sx * 0.36, 0.58, 1.14), rubber))
        P("Bike", box(f"lever_{sx}", (0.14, 0.03, 0.02), (sx * 0.32, 0.64, 1.15), chrome))
        P("Bike", beam(f"mirror_stem_{sx}", (sx * 0.22, 0.58, 1.16), (sx * 0.36, 0.52, 1.40), 0.022, chrome))
        P("Bike", box(f"mirror_{sx}", (0.11, 0.035, 0.09), (sx * 0.36, 0.52, 1.42), chrome, bevel=0.01))
        P("Bike", box(f"mirror_glass_{sx}", (0.09, 0.01, 0.07), (sx * 0.36, 0.50, 1.42), bike_dark))
    P("Bike", box("handlebar", (0.66, 0.06, 0.06), (0, 0.58, 1.14), chrome))
    P("Bike", box("bar_riser", (0.20, 0.08, 0.10), (0, 0.62, 1.10), bike_dark))
    # chrome exhaust on the left flank, tip near the turbo-flame anchor (0.2, 0.62, 1.05 in Three.js)
    P("Bike", cyl("exhaust", 0.065, 0.98, (0.23, -0.44, 0.56), chrome, rot=(84, 0, 0), verts=12))
    P("Bike", box("heat_shield", (0.11, 0.46, 0.06), (0.23, -0.30, 0.63), chrome, rot=(6, 0, 0), bevel=0.01))
    P("Bike", cyl("exhaust_tip", 0.075, 0.18, (0.22, -0.98, 0.61), bike_dark, rot=(90, 0, 0), verts=12))   # ends at Three.js (0.2, 0.62, 1.05) = turbo flame anchor
    P("Bike", cyl("exhaust_head", 0.05, 0.30, (0.20, 0.20, 0.62), chrome, rot=(30, 0, 0), verts=10))
    P("Bike", box("chain_guard", (0.04, 0.66, 0.11), (-0.20, -0.40, 0.46), bike_dark))
    P("Bike", cyl("sprocket", 0.13, 0.02, (-0.20, AXLE_R, WHEEL_R), bike_metal, rot=(0, 90, 0), verts=12))
    P("Bike", beam("kickstand", (0.14, -0.20, 0.40), (0.24, -0.16, 0.06), 0.028, chrome))
    # wheels: fat tyres, wide white spoked rims, chrome hubs
    for name, yy in (("WheelF", AXLE_F), ("WheelR", AXLE_R)):
        P(name, cyl(f"tyre_{name}", WHEEL_R, 0.22, (0, yy, WHEEL_R), tyre, rot=(0, 90, 0), verts=22))
        for a in range(0, 360, 30):
            r = math.radians(a)
            P(name, box(f"tread_{name}_{a}", (0.23, 0.06, 0.035), (0, yy + math.cos(r) * WHEEL_R, WHEEL_R + math.sin(r) * WHEEL_R), rubber, rot=(a, 0, 0)))
        P(name, cyl(f"rim_{name}", WHEEL_R * 0.66, 0.23, (0, yy, WHEEL_R), rim, rot=(0, 90, 0), verts=18))
        P(name, cyl(f"rim_inner_{name}", WHEEL_R * 0.50, 0.24, (0, yy, WHEEL_R), bike_dark, rot=(0, 90, 0), verts=16))
        for a in range(0, 180, 30):
            P(name, box(f"spoke_{name}_{a}", (0.25, 0.04, WHEEL_R * 1.1), (0, yy, WHEEL_R), rim, rot=(a, 0, 0)))
        P(name, cyl(f"hub_{name}", 0.10, 0.28, (0, yy, WHEEL_R), chrome, rot=(0, 90, 0), verts=12))

    # ------------------------------------------------------------ rider (seated, chunky / cute)
    HIP_Z = 1.00
    P("Hips", box("hips", (0.54, 0.44, 0.24), (0, -0.24, HIP_Z), pants, bevel=0.05))
    P("Hips", box("belt", (0.56, 0.46, 0.05), (0, -0.24, HIP_Z + 0.11), gloves))
    # torso: short and wide
    P("Spine", beam("torso", (0, -0.22, HIP_Z + 0.04), (0, 0.00, 1.42), 0.62, jacket, thick2=0.40, bevel=0.06))
    P("Spine", beam("zip", (0, -0.03, HIP_Z + 0.06), (0, 0.19, 1.40), 0.07, accent, thick2=0.03))       # white vertical zip
    P("Spine", box("collar", (0.44, 0.34, 0.10), (0, -0.01, 1.46), jacket_dark, bevel=0.03))
    for sx in (-1, 1):
        P("Spine", box(f"shoulder_pad_{sx}", (0.18, 0.24, 0.12), (sx * 0.31, -0.01, 1.40), jacket, bevel=0.04))
    # yellow boxy backpack (sits where the jetpack prop attaches: Three.js (0, 1.35, 0.45))
    P("Spine", box("pack", (0.44, 0.22, 0.42), (0, -0.47, 1.18), pack, bevel=0.05))
    P("Spine", box("pack_lid", (0.46, 0.24, 0.10), (0, -0.47, 1.38), pack_dark, bevel=0.03))
    P("Spine", box("pack_patch", (0.18, 0.02, 0.10), (0, -0.59, 1.16), accent))
    for sx in (-1, 1):
        P("Spine", beam(f"strap_{sx}", (sx * 0.17, -0.37, 1.38), (sx * 0.17, 0.12, 1.14), 0.07, pack_dark, thick2=0.02))
    # head + big round helmet with a translucent blue visor over a simple face
    HEAD_Z = 1.63
    HR = 0.40
    P("Head", box("head", (0.46, 0.40, 0.40), (0, 0.10, HEAD_Z), skin, bevel=0.09))
    for sx in (-1, 1):
        P("Head", box(f"eye_{sx}", (0.08, 0.03, 0.10), (sx * 0.10, 0.305, HEAD_Z + 0.03), eye_b))
    P("Head", box("mouth", (0.12, 0.03, 0.03), (0, 0.305, HEAD_Z - 0.09), mouth))
    # helmet shell with a NARROW visor window (~38% of helmet height, brow line to just below the nose,
    # wrapping ~200 deg around the front), dark liner behind the face
    liner = mat("helmet_liner", "#1b1b22")
    frame_m = mat("visor_frame", "#1a1a2a")
    visor_hl = mat("visor_glass", "#7c95e8", rough=0.1, alpha=0.5)
    WZ0, WZ1, WY = -0.425, 0.275, -0.17          # window z range / y cut-off, as fractions of HR (scaled coords)
    HC = (0, 0.06, HEAD_Z + 0.02)
    win = lambda co: co.y > WY * HR and WZ0 * HR < co.z < WZ1 * HR
    P("Head", sphere("helmet_liner", HR * 0.93, HC, liner, seg=20, rings=12, scale=(1, 1, 0.92)))
    P("Head", sphere_band("helmet", HR, HC, helmet, ymin=-1.0, zmin=-1.0, zmax=1.0, seg=28, rings=18, scale=(1, 1, 0.92), cut=win))
    P("Head", sphere_band("visor", HR * 1.04, HC, visor, ymin=WY, zmin=WZ0, zmax=WZ1, seg=28, rings=18, scale=(1, 1, 0.92)))
    # thick dark frame ring around the opening (band with the window itself cut out)
    P("Head", sphere_band("visor_frame", HR * 1.07, HC, frame_m, ymin=WY - 0.10, zmin=WZ0 - 0.11, zmax=WZ1 + 0.11, seg=28, rings=18, scale=(1, 1, 0.92),
                          cut=lambda co: co.y > (WY + 0.02) * HR and (WZ0 + 0.02) * HR < co.z < (WZ1 - 0.02) * HR))
    # one thin lighter diagonal highlight streak across the glass (camera side, -X)
    P("Head", box("visor_streak", (0.035, 0.03, 0.24), (-0.09, 0.06 + HR * 1.035, HEAD_Z - 0.02), visor_hl, rot=(0, -32, 0)))
    P("Head", box("chin", (0.66, 0.18, 0.15), (0, 0.36, HEAD_Z - 0.22), helmet, bevel=0.04))
    P("Head", box("chin_vent", (0.16, 0.03, 0.04), (0, 0.455, HEAD_Z - 0.22), gloves))
    for sx in (-1, 1):
        P("Head", cyl(f"visor_pivot_{sx}", 0.05, 0.03, (sx * 0.445, 0.14, HEAD_Z + 0.02), gloves, rot=(0, 90, 0), verts=10))
    # arms reaching the handlebars (teal sleeves, white cuffs, tan hands)
    for sx, side in ((1, "L"), (-1, "R")):
        sh = Vector((sx * 0.35, -0.02, 1.34)); el = Vector((sx * 0.39, 0.30, 1.14)); hd = Vector((sx * 0.36, 0.58, 1.15))
        P(f"UpperArm.{side}", beam(f"uarm_{side}", sh, el, 0.18, jacket, bevel=0.03))
        P(f"LowerArm.{side}", beam(f"larm_{side}", el, hd, 0.17, jacket, bevel=0.03))
        P(f"LowerArm.{side}", beam(f"cuff_{side}", el + (hd - el) * 0.72, hd - (hd - el) * 0.06, 0.19, accent))
        P(f"LowerArm.{side}", box(f"hand_{side}", (0.15, 0.16, 0.15), hd + Vector((0, 0.02, -0.01)), skin, bevel=0.04))
        # legs: thigh forward, shin down to the peg, brown boots
        hp = Vector((sx * 0.18, -0.22, HIP_Z - 0.05)); kn = Vector((sx * 0.24, 0.24, 0.80)); ft = Vector((sx * 0.25, 0.04, 0.44))
        P(f"UpperLeg.{side}", beam(f"uleg_{side}", hp, kn, 0.24, pants, bevel=0.03))
        P(f"LowerLeg.{side}", beam(f"lleg_{side}", kn, ft, 0.21, pants, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"knee_{side}", (0.22, 0.18, 0.16), (sx * 0.26, 0.32, 0.80), pants, bevel=0.04))
        P(f"LowerLeg.{side}", box(f"boot_{side}", (0.24, 0.40, 0.17), (sx * 0.27, 0.02, 0.43), boots, bevel=0.04))
        P(f"LowerLeg.{side}", box(f"boot_top_{side}", (0.22, 0.20, 0.16), (sx * 0.26, -0.06, 0.58), boots, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"sole_{side}", (0.25, 0.42, 0.04), (sx * 0.27, 0.02, 0.36), gloves))
        P(f"LowerLeg.{side}", box(f"buckle_{side}", (0.24, 0.04, 0.03), (sx * 0.27, 0.10, 0.52), chrome))

    mesh = join(all_mesh_objects(), "BikerMesh")
    bones = [
        ("Root", (0, 0, 0), (0, 0, 0.2), None),
        ("Bike", (0, -0.1, 0.5), (0, 0.4, 0.5), "Root"),
        ("WheelF", (0, AXLE_F, WHEEL_R), (0, AXLE_F, WHEEL_R + 0.2), "Bike"),
        ("WheelR", (0, AXLE_R, WHEEL_R), (0, AXLE_R, WHEEL_R + 0.2), "Bike"),
        ("Hips", (0, -0.24, HIP_Z - 0.10), (0, -0.24, HIP_Z + 0.04), "Bike"),
        ("Spine", (0, -0.22, HIP_Z + 0.04), (0, 0.00, 1.42), "Hips"),
        ("Head", (0, 0.00, 1.42), (0, 0.08, 2.05), "Spine"),
        ("UpperArm.L", (0.35, -0.02, 1.34), (0.39, 0.30, 1.14), "Spine"),
        ("LowerArm.L", (0.39, 0.30, 1.14), (0.36, 0.58, 1.15), "UpperArm.L"),
        ("UpperArm.R", (-0.35, -0.02, 1.34), (-0.39, 0.30, 1.14), "Spine"),
        ("LowerArm.R", (-0.39, 0.30, 1.14), (-0.36, 0.58, 1.15), "UpperArm.R"),
        ("UpperLeg.L", (0.18, -0.22, HIP_Z - 0.05), (0.24, 0.24, 0.80), "Hips"),
        ("LowerLeg.L", (0.24, 0.24, 0.80), (0.25, 0.04, 0.44), "UpperLeg.L"),
        ("UpperLeg.R", (-0.18, -0.22, HIP_Z - 0.05), (-0.24, 0.24, 0.80), "Hips"),
        ("LowerLeg.R", (-0.24, 0.24, 0.80), (-0.25, 0.04, 0.44), "UpperLeg.R"),
    ]
    arm = make_armature("Biker", bones)
    bind_rigid(mesh, arm, parts)
    animate_biker(arm)
    if os.environ.get("BIKER_CLIPCHECK"):
        clip_report(arm, mesh)
    export("biker.glb", [arm, mesh], animations=True)


def clip_report(arm, mesh, clips=("Duck", "Turbo", "Jump", "Dead", "Fly"), step=2):
    """BIKER_CLIPCHECK=1: per-frame gap between the helmet and the backpack (body incl. lid) for each clip,
    negative = interpenetration.  Exact for the rigid pack: helmet verts are taken into the Spine bone's
    frame and tested against the pack's rest-frame box, so a tilted spine doesn't inflate the box."""
    from mathutils import Vector as V
    def evaluated():
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get(); ev = mesh.evaluated_get(dg); me = ev.data
        mats = [m.name for m in me.materials]
        def verts(names):
            idx = set()
            for p in me.polygons:
                if mats[p.material_index] in names: idx.update(p.vertices)
            return [ev.matrix_world @ me.vertices[i].co for i in idx]
        return verts
    spine = arm.pose.bones["Spine"]
    saved = arm.animation_data.action
    arm.animation_data.action = None
    bpy.context.scene.frame_set(0)
    verts = evaluated()
    inv0 = (arm.matrix_world @ spine.matrix).inverted()
    pack = [inv0 @ v for v in verts({"backpack"}) + [v for v in verts({"backpack_dark"}) if v.y < -0.30 and v.z > 1.30]]
    pmn = V(map(min, *pack)); pmx = V(map(max, *pack))
    print(f"CLIP pack box in Spine frame: {tuple(round(c, 2) for c in pmn)} .. {tuple(round(c, 2) for c in pmx)}")
    for name in clips:
        act = bpy.data.actions.get(name)
        if act is None: continue
        arm.animation_data.action = act
        try:
            arm.animation_data.action_slot = act.slots[0]
        except Exception:
            pass
        worst = (0, 9.0)
        for f in range(0, int(act.frame_range[1]) + 1, step):
            bpy.context.scene.frame_set(f)
            verts = evaluated()
            inv = (arm.matrix_world @ spine.matrix).inverted()
            helm = [inv @ v for v in verts({"helmet", "helmet_liner", "visor_frame"})]
            gap = min(max(max(pmn[i] - v[i], v[i] - pmx[i]) for i in range(3)) for v in helm)
            if gap < worst[1]: worst = (f, gap)
        print(f"CLIP {name}: worst frame {worst[0]} helmet-pack gap={worst[1]:+.3f} m")
    arm.animation_data.action = saved
    bpy.context.scene.frame_set(0)


def animate_biker(arm):
    """All poses are deltas from the riding rest pose. Bike X rotation: negative = nose up."""
    def base(**over):
        p = {"loc:Bike": (0, 0, 0), "Bike": (0, 0, 0), "WheelF": (0, 0, 0), "WheelR": (0, 0, 0),
             "loc:Hips": (0, 0, 0), "Hips": (0, 0, 0), "Spine": (0, 0, 0), "Head": (0, 0, 0),
             "UpperArm.L": (0, 0, 0), "LowerArm.L": (0, 0, 0), "UpperArm.R": (0, 0, 0), "LowerArm.R": (0, 0, 0),
             "UpperLeg.L": (0, 0, 0), "LowerLeg.L": (0, 0, 0), "UpperLeg.R": (0, 0, 0), "LowerLeg.R": (0, 0, 0)}
        p.update(over)
        return p

    # RIDE (30f loop): wheel spin one full turn + gentle bob
    act = new_action(arm, "Ride", 30, loop=True)
    for f in range(0, 31, 5):
        t = f / 30
        s = math.sin(t * 2 * math.pi * 2)
        key_pose(arm, f, base(**{"loc:Bike": (0, 0, s * 0.015), "Spine": (s * 1.5, 0, 0), "Head": (-s * 1.5, 0, 0),
                                 "WheelF": (t * 360, 0, 0), "WheelR": (t * 360, 0, 0)}))
    # make wheel rotation linear
    for fc in action_fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
    push_action_to_nla(arm, act)

    # IDLE (60f loop)
    act = new_action(arm, "Idle", 60, loop=True)
    for f in range(0, 61, 10):
        s = math.sin(f / 60 * 2 * math.pi)
        key_pose(arm, f, base(**{"loc:Bike": (0, 0, s * 0.01), "Spine": (s * 2, 0, 0), "Head": (0, 0, s * 12)}))
    push_action_to_nla(arm, act)

    # JUMP (24f): nose up, rider stands on pegs
    act = new_action(arm, "Jump", 24, loop=False)
    key_pose(arm, 0, base())
    key_pose(arm, 8, base(**{"Bike": (-28, 0, 0), "loc:Hips": (0, 0, 0.12), "Spine": (-10, 0, 0), "Head": (5, 0, 0),
                             "UpperLeg.L": (-15, 0, 0), "UpperLeg.R": (-15, 0, 0), "LowerLeg.L": (10, 0, 0), "LowerLeg.R": (10, 0, 0)}))
    key_pose(arm, 16, base(**{"Bike": (-12, 0, 0), "loc:Hips": (0, 0, 0.08), "Spine": (-4, 0, 0), "Head": (3, 0, 0)}))
    key_pose(arm, 24, base(**{"Bike": (6, 0, 0)}))
    push_action_to_nla(arm, act)

    # DUCK = SLIDE (18f): the bike lays over into a low power-slide, rider tucked flat, then snaps back up
    act = new_action(arm, "Duck", 18, loop=False)
    slide = {"Bike": (4, -54, 0), "loc:Bike": (0.25, 0, -0.10), "loc:Hips": (0, 0.06, -0.06), "Hips": (0, -8, 0),
             "Spine": (42, -12, 0), "Head": (-12, 0, 0),
             "UpperArm.L": (-15, 0, 0), "UpperArm.R": (-25, 0, 0), "LowerArm.L": (-15, 0, 0), "LowerArm.R": (-20, 0, 0),
             "UpperLeg.L": (10, 0, 0), "UpperLeg.R": (-10, 0, 12), "LowerLeg.R": (15, 0, 0)}
    key_pose(arm, 0, base())
    key_pose(arm, 4, base(**slide))
    key_pose(arm, 13, base(**slide))
    key_pose(arm, 18, base(**{"Bike": (-4, 3, 0)}))
    push_action_to_nla(arm, act)

    # TURBO (30f loop): tucked forward, wheels spinning fast
    act = new_action(arm, "Turbo", 30, loop=True)
    for f in range(0, 31, 5):
        t = f / 30
        key_pose(arm, f, base(**{"Bike": (-8, 0, 0), "Spine": (28, 0, 0), "Head": (-18, 0, 0), "loc:Hips": (0, 0.03, -0.05),
                                 "WheelF": (t * 720, 0, 0), "WheelR": (t * 720, 0, 0)}))
    for fc in action_fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
    push_action_to_nla(arm, act)

    # FLY (40f loop): jetpack — bike hangs nose-up, rider leans back
    act = new_action(arm, "Fly", 40, loop=True)
    for f in range(0, 41, 10):
        s = math.sin(f / 40 * 2 * math.pi)
        key_pose(arm, f, base(**{"Bike": (-18 + s * 3, 0, 0), "Spine": (-12, 0, 0), "Head": (4, 0, 0),
                                 "WheelF": (f * 12, 0, 0), "WheelR": (f * 12, 0, 0)}))
    push_action_to_nla(arm, act)

    # STUMBLE (16f): violent wobble
    act = new_action(arm, "Stumble", 16, loop=False)
    key_pose(arm, 0, base())
    key_pose(arm, 4, base(**{"Bike": (0, 22, 10), "Spine": (10, -10, -15), "Head": (0, 0, 20)}))
    key_pose(arm, 10, base(**{"Bike": (0, -16, -8), "Spine": (10, 8, 12), "Head": (0, 0, -16)}))
    key_pose(arm, 16, base())
    push_action_to_nla(arm, act)

    # DEAD (24f): wipe-out, bike falls on its side
    act = new_action(arm, "Dead", 24, loop=False)
    key_pose(arm, 0, base())
    key_pose(arm, 8, base(**{"Bike": (-20, 40, 20), "loc:Bike": (0.2, -0.3, 0.2), "Spine": (-20, 0, 20), "Head": (0, 0, 0),
                             "UpperArm.L": (-90, 0, -40), "UpperArm.R": (-90, 0, 40)}))
    key_pose(arm, 24, base(**{"Bike": (0, 84, 40), "loc:Bike": (0.5, -0.9, -0.28), "Spine": (-25, 0, 30), "Head": (-2, 0, 0),
                              "UpperArm.L": (-120, 0, -50), "UpperArm.R": (-120, 0, 50), "UpperLeg.L": (-30, 0, 0), "UpperLeg.R": (-30, 0, 0)}))
    push_action_to_nla(arm, act)


# ----------------------------------------------------------------------------
# Ranger (chaser) — khaki uniform, beret, baton.  Re-uses the guard builder pattern.
# ----------------------------------------------------------------------------
def build_ranger(static_only=False):
    reset()
    skin = mat("skin", "#c98b62")
    khaki = mat("khaki", "#c4ab72")            # shirt + cap (Chaser.js recolours this for ranger B)
    khaki_dark = mat("khaki_dark", "#b09a64")  # trousers, pockets
    cap_m = mat("cap", "#bda56c")
    cap_band = mat("cap_band", "#7a6640")
    boots = mat("rboots", "#1f1f1f")
    belt = mat("rbelt", "#5a3a1a")
    eye_w = mat("eye_white", "#ffffff")
    eye_b = mat("eye_black", "#1a1a1a")
    moust = mat("moustache", "#2b1d12")
    mouth = mat("face_mouth", "#7a3324")
    badge = mat("badge", "#ffd24d", metal=0.4, rough=0.4)
    btn = mat("button", "#e8dcb8")

    parts = {}
    def P(bone, obj):
        parts.setdefault(bone, []).append(obj.name)
        tag_part(obj)
        return obj

    # stocky torso: wide shoulders, short, khaki shirt with pockets / epaulets / badge
    P("Spine", box("torso", (0.80, 0.50, 0.50), (0, 0.0, 1.22), khaki, bevel=0.07))
    for sx in (-1, 1):
        P("Spine", box(f"epaulet_{sx}", (0.22, 0.16, 0.04), (sx * 0.30, 0, 1.49), khaki_dark))
        P("Spine", box(f"pocket_{sx}", (0.20, 0.03, 0.16), (sx * 0.19, 0.26, 1.24), khaki_dark, bevel=0.01))
        P("Spine", box(f"pocket_flap_{sx}", (0.21, 0.035, 0.05), (sx * 0.19, 0.265, 1.32), khaki_dark))
        P("Spine", box(f"pocket_btn_{sx}", (0.04, 0.03, 0.04), (sx * 0.19, 0.285, 1.31), btn))
    P("Spine", box("badge", (0.10, 0.03, 0.10), (-0.19, 0.28, 1.40), badge))
    P("Spine", box("name_tag", (0.16, 0.02, 0.05), (0.19, 0.28, 1.40), mat("name_tag", "#ffffff")))
    P("Spine", box("placket", (0.05, 0.03, 0.46), (0, 0.26, 1.22), khaki_dark))
    for k in range(3):
        P("Spine", box(f"btn_{k}", (0.035, 0.03, 0.035), (0, 0.285, 1.08 + k * 0.14), btn))
    P("Spine", box("collar", (0.36, 0.30, 0.08), (0, 0.04, 1.48), khaki_dark, bevel=0.02))
    # hips + brown belt with gold buckle
    P("Hips", box("hips", (0.70, 0.46, 0.24), (0, 0.0, 0.92), khaki_dark, bevel=0.05))
    P("Hips", box("belt", (0.72, 0.48, 0.08), (0, 0.0, 1.00), belt))
    P("Hips", box("buckle", (0.12, 0.03, 0.08), (0, 0.25, 1.00), badge))
    P("Hips", box("pouch", (0.14, 0.10, 0.14), (0.26, 0.14, 0.92), belt, bevel=0.02))
    # head with a frown, moustache, and a PEAKED khaki cap with a gold badge
    P("Head", box("head", (0.52, 0.48, 0.46), (0, 0.02, 1.70), skin, bevel=0.09))
    for sx in (-1, 1):
        P("Head", box(f"ear_{sx}", (0.05, 0.09, 0.11), (sx * 0.28, 0.0, 1.68), skin))
        P("Head", box(f"eye_w_{sx}", (0.10, 0.03, 0.09), (0.12 * sx, 0.265, 1.73), eye_w))
        P("Head", box(f"eye_b_{sx}", (0.05, 0.03, 0.06), (0.115 * sx, 0.28, 1.72), eye_b))
        # angry brow: inner end lower than outer end
        P("Head", box(f"brow_{sx}", (0.15, 0.03, 0.04), (0.12 * sx, 0.27, 1.81), moust, rot=(0, -22 * sx, 0)))
        # frown corners: outer ends higher
        P("Head", box(f"frown_{sx}", (0.07, 0.03, 0.03), (0.075 * sx, 0.27, 1.575), mouth, rot=(0, -28 * sx, 0)))
    P("Head", box("mouth", (0.09, 0.03, 0.03), (0, 0.27, 1.56), mouth))
    P("Head", box("moustache", (0.24, 0.05, 0.05), (0, 0.27, 1.625), moust, bevel=0.02))
    P("Head", box("nose", (0.08, 0.08, 0.08), (0, 0.28, 1.67), skin))
    P("Head", cyl("cap_top", 0.32, 0.17, (0, 0.02, 2.005), cap_m, verts=22))
    P("Head", cyl("cap_crown", 0.27, 0.06, (0, 0.08, 2.115), cap_m, verts=18))
    P("Head", cyl("cap_band", 0.315, 0.04, (0, 0.01, 1.935), cap_band, verts=22))
    P("Head", box("cap_peak", (0.50, 0.28, 0.045), (0, 0.37, 1.915), cap_band, rot=(8, 0, 0), bevel=0.01))
    P("Head", box("cap_badge", (0.10, 0.04, 0.11), (0, 0.33, 2.01), badge, bevel=0.01))
    # arms: khaki sleeves, tan fists.  legs: stocky, black boots
    for sx, side in ((1, "L"), (-1, "R")):
        x = 0.49 * sx
        P(f"UpperArm.{side}", box(f"uarm_{side}", (0.22, 0.22, 0.30), (x, 0, 1.30), khaki, bevel=0.04))
        P(f"LowerArm.{side}", box(f"larm_{side}", (0.19, 0.19, 0.26), (x, 0, 1.02), khaki, bevel=0.03))
        P(f"LowerArm.{side}", box(f"cuff_{side}", (0.21, 0.21, 0.05), (x, 0, 0.90), khaki_dark))
        P(f"LowerArm.{side}", box(f"hand_{side}", (0.17, 0.17, 0.16), (x, 0, 0.80), skin, bevel=0.04))
        lx = 0.19 * sx
        P(f"UpperLeg.{side}", box(f"uleg_{side}", (0.28, 0.30, 0.40), (lx, 0, 0.66), khaki_dark, bevel=0.04))
        P(f"LowerLeg.{side}", box(f"lleg_{side}", (0.24, 0.26, 0.34), (lx, 0, 0.32), khaki_dark, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"boot_{side}", (0.27, 0.42, 0.16), (lx, 0.06, 0.09), boots, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"boot_top_{side}", (0.25, 0.27, 0.16), (lx, 0.0, 0.22), boots, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"lace_{side}", (0.10, 0.03, 0.10), (lx, 0.135, 0.22), khaki_dark))
        P(f"UpperArm.{side}", box(f"sleeve_badge_{side}", (0.03, 0.10, 0.10), (sx * 0.605, 0.0, 1.32), mat("sleeve_badge", "#1f6b3a")))

    mesh = join(all_mesh_objects(), "RangerMesh")
    bones = [
        ("Root", (0, 0, 0), (0, 0, 0.2), None),
        ("Hips", (0, 0, 0.90), (0, 0, 1.00), "Root"),
        ("Spine", (0, 0, 1.00), (0, 0, 1.46), "Hips"),
        ("Head", (0, 0, 1.46), (0, 0, 1.95), "Spine"),
        ("UpperArm.L", (0.49, 0, 1.44), (0.49, 0, 1.16), "Spine"),
        ("LowerArm.L", (0.49, 0, 1.16), (0.49, 0, 0.86), "UpperArm.L"),
        ("UpperArm.R", (-0.49, 0, 1.44), (-0.49, 0, 1.16), "Spine"),
        ("LowerArm.R", (-0.49, 0, 1.16), (-0.49, 0, 0.86), "UpperArm.R"),
        ("UpperLeg.L", (0.19, 0, 0.88), (0.19, 0, 0.48), "Hips"),
        ("LowerLeg.L", (0.19, 0, 0.48), (0.19, 0, 0.05), "UpperLeg.L"),
        ("UpperLeg.R", (-0.19, 0, 0.88), (-0.19, 0, 0.48), "Hips"),
        ("LowerLeg.R", (-0.19, 0, 0.48), (-0.19, 0, 0.05), "UpperLeg.R"),
    ]
    arm = make_armature("Ranger", bones)
    bind_rigid(mesh, arm, parts)
    ch.animate_humanoid(arm, scale=0.9)
    export("ranger.glb", [arm, mesh], animations=True)



if __name__ == "__main__":
    which = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    which = [w for w in which if w in ("biker", "ranger")] or ["biker", "ranger"]
    if "biker" in which:
        build_biker()
    if "ranger" in which:
        build_ranger()
