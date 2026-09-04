"""Rigged biker (rider on a dirt bike) + ranger chaser + static ranger obstacle.

Run: python3 tools/blender/biker.py  -> public/models/biker.glb, ranger.glb, ranger_static.glb
Rest pose = riding pose. Bike faces +Y (Blender) = -Z (Three.js).
"""
import math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from lib import *
import character as ch

WHEEL_R = 0.34


def build_biker():
    reset()
    skin = mat("skin", "#e8b58a")
    jacket = mat("jacket", "#1fb2a6")
    jacket_dark = mat("jacket_dark", "#158f86")
    pants = mat("pants", "#2c3e8f")
    helmet = mat("helmet", "#ff7a1a")
    visor = mat("visor", "#1a1a2a", rough=0.2)
    gloves = mat("gloves", "#2b2b2b")
    boots = mat("boots", "#2b2b2b")
    bike = mat("bike_body", "#e0382b")
    bike_dark = mat("bike_dark", "#2b2b2b")
    bike_metal = mat("bike_metal", "#b8bcc2", rough=0.4, metal=0.5)
    tyre = mat("tyre", "#1e1e1e")
    rim = mat("rim", "#c9d1d9", rough=0.3, metal=0.6)
    lamp = mat("headlamp", "#fff2b0", emissive="#fff2b0", emissive_strength=2)
    tail = mat("taillamp", "#ff2a2a", emissive="#ff2a2a", emissive_strength=2)
    seat = mat("seat", "#3a3a3a")
    pack = mat("backpack", "#ffcc33")

    parts = {}
    def P(bone, obj):
        parts.setdefault(bone, []).append(obj.name)
        tag_part(obj)
        return obj

    # ------------------------------------------------------------ bike (bone "Bike")
    accent = mat("jacket_accent", "#ffffff")
    chrome = mat("chrome", "#dfe5ea", rough=0.25, metal=0.8)
    rubber = mat("rubber", "#2a2a2a")
    # frame: main beam from rear axle area to steering head, plus tank & seat
    P("Bike", beam("frame_main", (0, -0.55, 0.55), (0, 0.55, 0.85), 0.10, bike, bevel=0.02))
    P("Bike", beam("frame_down", (0, 0.55, 0.85), (0, 0.15, 0.40), 0.08, bike_dark))
    P("Bike", beam("frame_rear", (0, -0.55, 0.55), (0, -0.05, 0.40), 0.08, bike_dark))
    P("Bike", beam("frame_top", (0, -0.45, 0.80), (0, 0.40, 0.95), 0.06, bike_dark))
    P("Bike", box("engine", (0.36, 0.5, 0.36), (0, 0.02, 0.48), bike_metal, bevel=0.04))
    for k in range(5):   # cooling fins
        P("Bike", box(f"fin_{k}", (0.42, 0.04, 0.30), (0, -0.16 + k * 0.08, 0.52), bike_dark))
    P("Bike", cyl("cyl_head", 0.13, 0.22, (0, 0.10, 0.74), bike_metal, verts=12))
    P("Bike", box("tank", (0.38, 0.58, 0.30), (0, 0.22, 0.88), bike, bevel=0.07))
    P("Bike", box("tank_stripe", (0.40, 0.58, 0.06), (0, 0.22, 0.90), accent))
    P("Bike", cyl("tank_cap", 0.05, 0.03, (0, 0.30, 1.04), chrome, verts=10))
    P("Bike", box("seat", (0.34, 0.72, 0.11), (0, -0.28, 0.86), seat, bevel=0.03))
    for k in range(4):   # seat stitching
        P("Bike", box(f"stitch_{k}", (0.35, 0.02, 0.02), (0, -0.55 + k * 0.18, 0.92), bike_dark))
    P("Bike", box("rear_fender", (0.28, 0.5, 0.06), (0, -0.72, 0.78), bike, bevel=0.02))
    P("Bike", box("rack", (0.30, 0.28, 0.03), (0, -0.85, 0.86), chrome))
    P("Bike", box("front_fender", (0.28, 0.55, 0.06), (0, 0.80, 0.72), bike, bevel=0.02))
    P("Bike", box("number_plate", (0.30, 0.04, 0.26), (0, 0.9, 0.98), bike, bevel=0.02))
    P("Bike", box("plate_num", (0.18, 0.02, 0.10), (0, 0.925, 0.98), accent))
    P("Bike", cyl("headlamp_rim", 0.11, 0.06, (0, 0.93, 0.98), chrome, rot=(90, 0, 0), verts=14))
    P("Bike", cyl("headlamp", 0.09, 0.05, (0, 0.95, 0.98), lamp, rot=(90, 0, 0), verts=12))
    P("Bike", box("taillamp", (0.12, 0.04, 0.06), (0, -0.98, 0.8), tail))
    for sx in (-1, 1):   # indicators
        P("Bike", box(f"ind_{sx}", (0.05, 0.05, 0.04), (sx * 0.20, -0.96, 0.84), mat("amber_ind", "#ffb300", emissive="#ffb300", emissive_strength=1.5)))
    # forks, swingarm, pegs, bars, mirrors
    for sx in (-1, 1):
        P("Bike", beam(f"fork_{sx}", (sx * 0.09, 0.78, WHEEL_R), (sx * 0.09, 0.62, 1.02), 0.05, chrome))
        P("Bike", beam(f"fork_cover_{sx}", (sx * 0.09, 0.70, 0.75), (sx * 0.09, 0.62, 1.02), 0.075, bike_dark))
        P("Bike", beam(f"swing_{sx}", (sx * 0.10, -0.78, WHEEL_R), (sx * 0.10, -0.1, 0.45), 0.05, bike_dark))
        P("Bike", beam(f"shock_{sx}", (sx * 0.14, -0.62, 0.42), (sx * 0.14, -0.50, 0.80), 0.04, chrome))
        P("Bike", box(f"peg_{sx}", (0.22, 0.12, 0.04), (sx * 0.22, -0.05, 0.36), rubber))
        P("Bike", box(f"grip_{sx}", (0.16, 0.06, 0.06), (sx * 0.34, 0.55, 1.08), rubber))
        P("Bike", box(f"lever_{sx}", (0.14, 0.03, 0.02), (sx * 0.30, 0.61, 1.09), chrome))
        P("Bike", beam(f"mirror_stem_{sx}", (sx * 0.20, 0.55, 1.10), (sx * 0.34, 0.50, 1.36), 0.02, chrome))
        P("Bike", box(f"mirror_{sx}", (0.10, 0.03, 0.08), (sx * 0.34, 0.50, 1.38), chrome, bevel=0.01))
        P("Bike", box(f"mirror_glass_{sx}", (0.08, 0.01, 0.06), (sx * 0.34, 0.485, 1.38), visor))
        P("Bike", box(f"side_panel_{sx}", (0.04, 0.32, 0.20), (sx * 0.19, -0.30, 0.68), bike, bevel=0.02))
    P("Bike", box("handlebar", (0.62, 0.05, 0.05), (0, 0.55, 1.08), chrome))
    P("Bike", box("speedo", (0.14, 0.10, 0.06), (0, 0.62, 1.14), bike_dark, bevel=0.01))
    P("Bike", cyl("speedo_face", 0.045, 0.01, (0, 0.575, 1.16), accent, rot=(90, 0, 0), verts=10))
    P("Bike", box("exhaust", (0.08, 0.9, 0.08), (0.2, -0.35, 0.55), chrome, rot=(8, 0, 0)))
    P("Bike", box("heat_shield", (0.10, 0.5, 0.06), (0.2, -0.20, 0.61), bike_dark, rot=(8, 0, 0)))
    P("Bike", cyl("exhaust_tip", 0.06, 0.15, (0.2, -0.8, 0.62), bike_dark, rot=(90, 0, 0), verts=10))
    P("Bike", box("chain_guard", (0.03, 0.62, 0.10), (-0.17, -0.42, 0.42), bike_dark))
    P("Bike", cyl("sprocket", 0.12, 0.02, (-0.17, -0.78, WHEEL_R), bike_metal, rot=(0, 90, 0), verts=12))
    P("Bike", beam("kickstand", (0.12, -0.20, 0.36), (0.20, -0.16, 0.06), 0.025, chrome))
    # wheels
    for name, yy in (("WheelF", 0.78), ("WheelR", -0.78)):
        P(name, cyl(f"tyre_{name}", WHEEL_R, 0.16, (0, yy, WHEEL_R), tyre, rot=(0, 90, 0), verts=20))
        for a in range(0, 360, 30):   # knobbly tread blocks
            r = math.radians(a)
            P(name, box(f"tread_{name}_{a}", (0.17, 0.05, 0.03), (0, yy + math.cos(r) * WHEEL_R, WHEEL_R + math.sin(r) * WHEEL_R), rubber, rot=(a, 0, 0)))
        P(name, cyl(f"rim_{name}", WHEEL_R * 0.62, 0.17, (0, yy, WHEEL_R), rim, rot=(0, 90, 0), verts=14))
        P(name, cyl(f"disc_{name}", WHEEL_R * 0.45, 0.19, (0, yy, WHEEL_R), chrome, rot=(0, 90, 0), verts=14))
        for a in range(0, 180, 30):
            P(name, box(f"spoke_{name}_{a}", (0.19, 0.025, WHEEL_R * 1.2), (0, yy, WHEEL_R), bike_dark, rot=(a, 0, 0)))
        P(name, cyl(f"hub_{name}", 0.07, 0.2, (0, yy, WHEEL_R), bike_metal, rot=(0, 90, 0), verts=10))

    # ------------------------------------------------------------ rider (seated)
    P("Hips", box("hips", (0.50, 0.40, 0.22), (0, -0.22, 1.02), pants, bevel=0.04))
    P("Hips", box("belt", (0.52, 0.42, 0.05), (0, -0.22, 1.12), gloves))
    P("Spine", beam("torso", (0, -0.20, 1.05), (0, 0.02, 1.52), 0.56, jacket, thick2=0.34, bevel=0.05))
    P("Spine", beam("torso_stripe", (0, -0.16, 1.10), (0, 0.06, 1.45), 0.58, accent, thick2=0.08))
    P("Spine", box("collar", (0.40, 0.30, 0.10), (0, 0.02, 1.55), jacket_dark, bevel=0.03))
    for sx in (-1, 1):
        P("Spine", box(f"shoulder_pad_{sx}", (0.16, 0.20, 0.10), (sx * 0.30, 0.02, 1.50), jacket_dark, bevel=0.03))
    P("Spine", box("pack", (0.40, 0.18, 0.40), (0, -0.36, 1.32), pack, bevel=0.04))
    P("Spine", box("pack_lid", (0.42, 0.20, 0.10), (0, -0.36, 1.50), jacket_dark, bevel=0.03))
    P("Spine", box("pack_patch", (0.16, 0.02, 0.10), (0, -0.46, 1.30), accent))
    for sx in (-1, 1):
        P("Spine", beam(f"strap_{sx}", (sx * 0.16, -0.30, 1.48), (sx * 0.16, 0.12, 1.20), 0.06, jacket_dark, thick2=0.02))
    P("Spine", box("zip", (0.04, 0.03, 0.42), (0, 0.10, 1.30), jacket_dark, rot=(-25, 0, 0)))
    # head + helmet
    P("Head", box("head", (0.50, 0.48, 0.48), (0, 0.10, 1.82), skin, bevel=0.08))
    P("Head", sphere("helmet", 0.33, (0, 0.09, 1.88), helmet, seg=18, rings=12, scale=(1, 1, 0.95)))
    P("Head", beam("helmet_stripe", (0, -0.20, 1.98), (0, 0.36, 1.94), 0.10, accent, thick2=0.03))
    P("Head", box("visor", (0.44, 0.08, 0.16), (0, 0.36, 1.84), visor, bevel=0.03))
    P("Head", box("visor_frame", (0.46, 0.04, 0.03), (0, 0.38, 1.93), gloves))
    P("Head", box("helmet_peak", (0.40, 0.22, 0.04), (0, 0.42, 1.98), helmet, bevel=0.01))
    P("Head", box("chin", (0.46, 0.10, 0.14), (0, 0.32, 1.66), helmet, bevel=0.03))
    for sx in (-1, 1):
        P("Head", box(f"vent_{sx}", (0.06, 0.16, 0.03), (sx * 0.12, -0.05, 2.19), gloves))
    # arms reaching the handlebars
    for sx, side in ((1, "L"), (-1, "R")):
        sh = Vector((sx * 0.34, 0.02, 1.42)); el = Vector((sx * 0.38, 0.30, 1.16)); hd = Vector((sx * 0.34, 0.55, 1.10))
        P(f"UpperArm.{side}", beam(f"uarm_{side}", sh, el, 0.17, jacket, bevel=0.03))
        P(f"UpperArm.{side}", beam(f"uarm_stripe_{side}", sh + Vector((sx * 0.02, 0, 0)), el + Vector((sx * 0.02, 0, 0)), 0.18, accent, thick2=0.05))
        P(f"LowerArm.{side}", beam(f"larm_{side}", el, hd, 0.15, jacket_dark, bevel=0.03))
        P(f"LowerArm.{side}", beam(f"cuff_{side}", el + (hd - el) * 0.78, hd, 0.17, gloves))
        P(f"LowerArm.{side}", sphere(f"hand_{side}", 0.10, hd, gloves, seg=12, rings=8))
        # legs: thigh forward, shin down to the peg
        hp = Vector((sx * 0.17, -0.20, 0.95)); kn = Vector((sx * 0.22, 0.22, 0.78)); ft = Vector((sx * 0.22, 0.05, 0.40))
        P(f"UpperLeg.{side}", beam(f"uleg_{side}", hp, kn, 0.22, pants, bevel=0.03))
        P(f"LowerLeg.{side}", beam(f"lleg_{side}", kn, ft, 0.19, pants, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"knee_{side}", (0.20, 0.16, 0.14), (sx * 0.24, 0.30, 0.78), jacket_dark, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"boot_{side}", (0.22, 0.38, 0.16), (sx * 0.24, 0.02, 0.40), boots, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"boot_top_{side}", (0.20, 0.18, 0.14), (sx * 0.23, -0.05, 0.54), boots, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"buckle_{side}", (0.22, 0.04, 0.03), (sx * 0.24, 0.10, 0.50), chrome))

    mesh = join(all_mesh_objects(), "BikerMesh")
    bones = [
        ("Root", (0, 0, 0), (0, 0, 0.2), None),
        ("Bike", (0, -0.1, 0.5), (0, 0.4, 0.5), "Root"),
        ("WheelF", (0, 0.78, WHEEL_R), (0, 0.78, WHEEL_R + 0.2), "Bike"),
        ("WheelR", (0, -0.78, WHEEL_R), (0, -0.78, WHEEL_R + 0.2), "Bike"),
        ("Hips", (0, -0.22, 0.92), (0, -0.22, 1.05), "Bike"),
        ("Spine", (0, -0.20, 1.05), (0, 0.02, 1.52), "Hips"),
        ("Head", (0, 0.02, 1.52), (0, 0.10, 2.05), "Spine"),
        ("UpperArm.L", (0.34, 0.02, 1.42), (0.38, 0.30, 1.16), "Spine"),
        ("LowerArm.L", (0.38, 0.30, 1.16), (0.34, 0.55, 1.10), "UpperArm.L"),
        ("UpperArm.R", (-0.34, 0.02, 1.42), (-0.38, 0.30, 1.16), "Spine"),
        ("LowerArm.R", (-0.38, 0.30, 1.16), (-0.34, 0.55, 1.10), "UpperArm.R"),
        ("UpperLeg.L", (0.17, -0.20, 0.95), (0.22, 0.22, 0.78), "Hips"),
        ("LowerLeg.L", (0.22, 0.22, 0.78), (0.22, 0.05, 0.40), "UpperLeg.L"),
        ("UpperLeg.R", (-0.17, -0.20, 0.95), (-0.22, 0.22, 0.78), "Hips"),
        ("LowerLeg.R", (-0.22, 0.22, 0.78), (-0.22, 0.05, 0.40), "UpperLeg.R"),
    ]
    arm = make_armature("Biker", bones)
    bind_rigid(mesh, arm, parts)
    animate_biker(arm)
    export("biker.glb", [arm, mesh], animations=True)


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
    key_pose(arm, 8, base(**{"Bike": (-28, 0, 0), "loc:Hips": (0, 0, 0.12), "Spine": (-10, 0, 0), "Head": (12, 0, 0),
                             "UpperLeg.L": (-15, 0, 0), "UpperLeg.R": (-15, 0, 0), "LowerLeg.L": (10, 0, 0), "LowerLeg.R": (10, 0, 0)}))
    key_pose(arm, 16, base(**{"Bike": (-12, 0, 0), "loc:Hips": (0, 0, 0.08), "Spine": (-4, 0, 0), "Head": (6, 0, 0)}))
    key_pose(arm, 24, base(**{"Bike": (6, 0, 0)}))
    push_action_to_nla(arm, act)

    # DUCK = SLIDE (18f): the bike lays over into a low power-slide, rider tucked flat, then snaps back up
    act = new_action(arm, "Duck", 18, loop=False)
    slide = {"Bike": (4, -54, 0), "loc:Bike": (0.25, 0, -0.10), "loc:Hips": (0, 0.06, -0.06), "Hips": (0, -8, 0),
             "Spine": (42, -12, 0), "Head": (-25, 0, 0),
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
        key_pose(arm, f, base(**{"Bike": (-18 + s * 3, 0, 0), "Spine": (-12, 0, 0), "Head": (10, 0, 0),
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
    key_pose(arm, 8, base(**{"Bike": (-20, 40, 20), "loc:Bike": (0.2, -0.3, 0.2), "Spine": (-20, 0, 20), "Head": (-10, 0, 0),
                             "UpperArm.L": (-90, 0, -40), "UpperArm.R": (-90, 0, 40)}))
    key_pose(arm, 24, base(**{"Bike": (0, 84, 40), "loc:Bike": (0.5, -0.9, -0.28), "Spine": (-25, 0, 30), "Head": (-15, 0, 0),
                              "UpperArm.L": (-120, 0, -50), "UpperArm.R": (-120, 0, 50), "UpperLeg.L": (-30, 0, 0), "UpperLeg.R": (-30, 0, 0)}))
    push_action_to_nla(arm, act)


# ----------------------------------------------------------------------------
# Ranger (chaser) — khaki uniform, beret, baton.  Re-uses the guard builder pattern.
# ----------------------------------------------------------------------------
def build_ranger(static_only=False):
    reset()
    skin = mat("skin", "#c98b62")
    khaki = mat("khaki", "#b8a06a")
    khaki_dark = mat("khaki_dark", "#8e7a4c")
    beret = mat("beret", "#2f5f2f")
    boots = mat("rboots", "#2b2b2b")
    belt = mat("rbelt", "#3a2a14")
    eye_w = mat("eye_white", "#ffffff")
    eye_b = mat("eye_black", "#1a1a1a")
    moust = mat("moustache", "#2b1d12")
    badge = mat("badge", "#ffd24d", metal=0.4, rough=0.4)
    baton = mat("baton", "#222222")
    vest = mat("vest", "#4a5a3a")

    parts = {}
    def P(bone, obj):
        parts.setdefault(bone, []).append(obj.name)
        tag_part(obj)
        return obj

    P("Spine", box("torso", (0.70, 0.44, 0.52), (0, 0.0, 1.22), khaki, bevel=0.06))
    P("Spine", box("vest", (0.66, 0.50, 0.36), (0, 0.0, 1.20), vest, bevel=0.04))
    P("Spine", box("epaulet_l", (0.20, 0.14, 0.04), (0.28, 0, 1.49), khaki_dark))
    P("Spine", box("epaulet_r", (0.20, 0.14, 0.04), (-0.28, 0, 1.49), khaki_dark))
    P("Spine", box("badge", (0.10, 0.03, 0.10), (-0.18, 0.27, 1.36), badge))
    P("Spine", box("pocket_l", (0.16, 0.03, 0.14), (0.16, 0.26, 1.30), khaki_dark))
    P("Spine", box("pocket_r", (0.16, 0.03, 0.14), (-0.16, 0.26, 1.30), khaki_dark))
    P("Spine", box("radio", (0.10, 0.08, 0.18), (0.24, 0.26, 1.36), mat("radio", "#1a1a1a"), bevel=0.01))
    P("Spine", box("radio_ant", (0.02, 0.02, 0.16), (0.27, 0.26, 1.52), mat("radio", "#1a1a1a")))
    P("Spine", box("name_tag", (0.14, 0.02, 0.05), (0.18, 0.27, 1.42), mat("name_tag", "#ffffff")))
    P("Spine", beam("lanyard", (-0.30, 0.20, 1.47), (-0.02, 0.26, 1.12), 0.03, mat("lanyard", "#d6202b")))
    P("Spine", box("vest_pocket", (0.22, 0.04, 0.16), (-0.18, 0.28, 1.14), khaki_dark, bevel=0.01))
    P("Hips", box("hips", (0.62, 0.40, 0.22), (0, 0.0, 0.92), khaki, bevel=0.04))
    P("Hips", box("belt", (0.64, 0.42, 0.07), (0, 0.0, 1.00), belt))
    P("Hips", box("buckle", (0.10, 0.03, 0.07), (0, 0.22, 1.00), badge))
    P("Hips", box("pouch_l", (0.14, 0.10, 0.14), (0.24, 0.16, 0.92), khaki_dark, bevel=0.02))
    P("Hips", box("pouch_r", (0.14, 0.10, 0.14), (-0.24, 0.16, 0.92), khaki_dark, bevel=0.02))
    P("Hips", box("holster", (0.10, 0.12, 0.22), (0.30, -0.10, 0.86), belt, bevel=0.02))
    P("Head", box("head", (0.48, 0.46, 0.44), (0, 0.02, 1.70), skin, bevel=0.08))
    P("Head", sphere("beret", 0.30, (0.04, 0.0, 1.94), beret, seg=14, rings=8, scale=(1.15, 1.0, 0.45)))
    P("Head", box("beret_badge", (0.06, 0.03, 0.06), (0.12, 0.24, 1.96), badge))
    for sx in (-1, 1):
        P("Head", box(f"eye_w_{sx}", (0.11, 0.03, 0.10), (0.11 * sx, 0.245, 1.74), eye_w))
        P("Head", box(f"eye_b_{sx}", (0.05, 0.03, 0.06), (0.10 * sx, 0.26, 1.73), eye_b))
        P("Head", box(f"brow_{sx}", (0.13, 0.03, 0.04), (0.11 * sx, 0.25, 1.82), moust, rot=(0, 0, 12 * sx)))
    P("Head", box("moustache", (0.26, 0.05, 0.06), (0, 0.26, 1.60), moust, bevel=0.02))
    P("Head", box("nose", (0.08, 0.08, 0.08), (0, 0.27, 1.66), skin))
    for sx, side in ((1, "L"), (-1, "R")):
        x = 0.44 * sx
        P(f"UpperArm.{side}", box(f"uarm_{side}", (0.18, 0.18, 0.30), (x, 0, 1.30), khaki, bevel=0.04))
        P(f"LowerArm.{side}", box(f"larm_{side}", (0.16, 0.16, 0.26), (x, 0, 1.02), khaki, bevel=0.03))
        P(f"LowerArm.{side}", sphere(f"hand_{side}", 0.10, (x, 0, 0.86), skin, seg=12, rings=8))
        lx = 0.18 * sx
        P(f"UpperLeg.{side}", box(f"uleg_{side}", (0.24, 0.26, 0.40), (lx, 0, 0.66), khaki, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"lleg_{side}", (0.21, 0.23, 0.36), (lx, 0, 0.30), khaki_dark, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"boot_{side}", (0.25, 0.40, 0.16), (lx, 0.06, 0.09), boots, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"boot_top_{side}", (0.23, 0.25, 0.14), (lx, 0.0, 0.22), boots, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"lace_{side}", (0.10, 0.03, 0.10), (lx, 0.13, 0.22), khaki))
        P(f"UpperArm.{side}", box(f"sleeve_badge_{side}", (0.03, 0.10, 0.10), (sx * 0.535, 0.0, 1.32), mat("sleeve_badge", "#1f6b3a")))
    P("LowerArm.R", cyl("baton", 0.03, 0.6, (-0.44, 0.18, 0.86), baton, rot=(90, 0, 0), verts=8))
    P("LowerArm.R", cyl("baton_grip", 0.04, 0.16, (-0.44, -0.02, 0.86), mat("lanyard", "#d6202b"), rot=(90, 0, 0), verts=8))

    mesh = join(all_mesh_objects(), "RangerMesh")
    bones = [
        ("Root", (0, 0, 0), (0, 0, 0.2), None),
        ("Hips", (0, 0, 0.90), (0, 0, 1.00), "Root"),
        ("Spine", (0, 0, 1.00), (0, 0, 1.46), "Hips"),
        ("Head", (0, 0, 1.46), (0, 0, 1.95), "Spine"),
        ("UpperArm.L", (0.44, 0, 1.44), (0.44, 0, 1.16), "Spine"),
        ("LowerArm.L", (0.44, 0, 1.16), (0.44, 0, 0.86), "UpperArm.L"),
        ("UpperArm.R", (-0.44, 0, 1.44), (-0.44, 0, 1.16), "Spine"),
        ("LowerArm.R", (-0.44, 0, 1.16), (-0.44, 0, 0.86), "UpperArm.R"),
        ("UpperLeg.L", (0.18, 0, 0.88), (0.18, 0, 0.48), "Hips"),
        ("LowerLeg.L", (0.18, 0, 0.48), (0.18, 0, 0.05), "UpperLeg.L"),
        ("UpperLeg.R", (-0.18, 0, 0.88), (-0.18, 0, 0.48), "Hips"),
        ("LowerLeg.R", (-0.18, 0, 0.48), (-0.18, 0, 0.05), "UpperLeg.R"),
    ]
    arm = make_armature("Ranger", bones)
    bind_rigid(mesh, arm, parts)
    ch.animate_humanoid(arm, scale=0.9)
    export("ranger.glb", [arm, mesh], animations=True)



if __name__ == "__main__":
    which = sys.argv[1:] or ["biker", "ranger"]
    if "biker" in which:
        build_biker()
    if "ranger" in which:
        build_ranger()
