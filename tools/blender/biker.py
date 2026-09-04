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
    # frame: main beam from rear axle area to steering head, plus tank & seat
    P("Bike", beam("frame_main", (0, -0.55, 0.55), (0, 0.55, 0.85), 0.10, bike, bevel=0.02))
    P("Bike", beam("frame_down", (0, 0.55, 0.85), (0, 0.15, 0.40), 0.08, bike_dark))
    P("Bike", beam("frame_rear", (0, -0.55, 0.55), (0, -0.05, 0.40), 0.08, bike_dark))
    P("Bike", box("engine", (0.36, 0.5, 0.36), (0, 0.02, 0.48), bike_metal, bevel=0.04))
    P("Bike", box("tank", (0.36, 0.55, 0.28), (0, 0.22, 0.86), bike, bevel=0.06))
    P("Bike", box("seat", (0.32, 0.7, 0.10), (0, -0.28, 0.86), seat, bevel=0.03))
    P("Bike", box("rear_fender", (0.28, 0.5, 0.06), (0, -0.72, 0.76), bike, bevel=0.02))
    P("Bike", box("front_fender", (0.28, 0.55, 0.06), (0, 0.80, 0.72), bike, bevel=0.02))
    P("Bike", box("number_plate", (0.30, 0.04, 0.26), (0, 0.9, 0.98), bike, bevel=0.02))
    P("Bike", cyl("headlamp", 0.09, 0.05, (0, 0.93, 0.98), lamp, rot=(90, 0, 0), verts=12))
    P("Bike", box("taillamp", (0.12, 0.04, 0.06), (0, -0.98, 0.8), tail))
    # forks + handlebar
    for sx in (-1, 1):
        P("Bike", beam(f"fork_{sx}", (sx * 0.09, 0.78, WHEEL_R), (sx * 0.09, 0.62, 1.02), 0.05, bike_metal))
        P("Bike", beam(f"swing_{sx}", (sx * 0.10, -0.78, WHEEL_R), (sx * 0.10, -0.1, 0.45), 0.05, bike_dark))
        P("Bike", box(f"peg_{sx}", (0.22, 0.12, 0.04), (sx * 0.22, -0.05, 0.36), bike_dark))
        P("Bike", box(f"grip_{sx}", (0.16, 0.06, 0.06), (sx * 0.34, 0.55, 1.08), bike_dark))
    P("Bike", box("handlebar", (0.62, 0.05, 0.05), (0, 0.55, 1.08), bike_metal))
    P("Bike", box("exhaust", (0.08, 0.9, 0.08), (0.2, -0.35, 0.55), bike_metal, rot=(8, 0, 0)))
    P("Bike", cyl("exhaust_tip", 0.06, 0.15, (0.2, -0.8, 0.62), bike_dark, rot=(90, 0, 0), verts=10))
    # wheels
    for name, yy in (("WheelF", 0.78), ("WheelR", -0.78)):
        P(name, cyl(f"tyre_{name}", WHEEL_R, 0.16, (0, yy, WHEEL_R), tyre, rot=(0, 90, 0), verts=18))
        P(name, cyl(f"rim_{name}", WHEEL_R * 0.62, 0.17, (0, yy, WHEEL_R), rim, rot=(0, 90, 0), verts=12))
        for a in range(0, 180, 45):
            P(name, box(f"spoke_{name}_{a}", (0.18, 0.03, WHEEL_R * 1.2), (0, yy, WHEEL_R), bike_dark, rot=(a, 0, 0)))
        P(name, cyl(f"hub_{name}", 0.07, 0.2, (0, yy, WHEEL_R), bike_metal, rot=(0, 90, 0), verts=10))

    # ------------------------------------------------------------ rider (seated)
    hip = Vector((0, -0.22, 0.98))
    P("Hips", box("hips", (0.50, 0.40, 0.22), (0, -0.22, 1.02), pants, bevel=0.04))
    # torso leaning forward
    P("Spine", beam("torso", (0, -0.20, 1.05), (0, 0.02, 1.52), 0.56, jacket, thick2=0.34, bevel=0.05))
    P("Spine", box("collar", (0.40, 0.30, 0.10), (0, 0.02, 1.55), jacket_dark, bevel=0.03))
    P("Spine", box("pack", (0.40, 0.18, 0.40), (0, -0.36, 1.32), pack, bevel=0.04))
    P("Spine", box("zip", (0.04, 0.03, 0.42), (0, 0.10, 1.30), jacket_dark, rot=(-25, 0, 0)))
    # head + helmet
    P("Head", box("head", (0.50, 0.48, 0.48), (0, 0.10, 1.82), skin, bevel=0.08))
    P("Head", sphere("helmet", 0.33, (0, 0.09, 1.88), helmet, seg=16, rings=10, scale=(1, 1, 0.95)))
    P("Head", box("visor", (0.44, 0.08, 0.16), (0, 0.36, 1.84), visor, bevel=0.03))
    P("Head", box("helmet_peak", (0.40, 0.22, 0.04), (0, 0.42, 1.98), helmet, bevel=0.01))
    P("Head", box("chin", (0.46, 0.10, 0.14), (0, 0.32, 1.66), helmet, bevel=0.03))
    # arms reaching the handlebars
    for sx, side in ((1, "L"), (-1, "R")):
        sh = Vector((sx * 0.34, 0.02, 1.42)); el = Vector((sx * 0.38, 0.30, 1.16)); hd = Vector((sx * 0.34, 0.55, 1.10))
        P(f"UpperArm.{side}", beam(f"uarm_{side}", sh, el, 0.17, jacket, bevel=0.03))
        P(f"LowerArm.{side}", beam(f"larm_{side}", el, hd, 0.15, jacket_dark, bevel=0.03))
        P(f"LowerArm.{side}", sphere(f"hand_{side}", 0.10, hd, gloves, seg=12, rings=8))
        # legs: thigh forward, shin down to the peg
        hp = Vector((sx * 0.17, -0.20, 0.95)); kn = Vector((sx * 0.22, 0.22, 0.78)); ft = Vector((sx * 0.22, 0.05, 0.40))
        P(f"UpperLeg.{side}", beam(f"uleg_{side}", hp, kn, 0.22, pants, bevel=0.03))
        P(f"LowerLeg.{side}", beam(f"lleg_{side}", kn, ft, 0.19, pants, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"boot_{side}", (0.22, 0.38, 0.16), (sx * 0.24, 0.02, 0.40), boots, bevel=0.03))

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

    # DUCK (18f, hold): rider flattens onto the tank
    act = new_action(arm, "Duck", 18, loop=False)
    key_pose(arm, 0, base())
    key_pose(arm, 5, base(**{"loc:Hips": (0, 0.05, -0.12), "Spine": (48, 0, 0), "Head": (-30, 0, 0),
                             "UpperArm.L": (-20, 0, 0), "UpperArm.R": (-20, 0, 0), "LowerArm.L": (-20, 0, 0), "LowerArm.R": (-20, 0, 0)}))
    key_pose(arm, 18, base(**{"loc:Hips": (0, 0.05, -0.12), "Spine": (48, 0, 0), "Head": (-30, 0, 0),
                              "UpperArm.L": (-20, 0, 0), "UpperArm.R": (-20, 0, 0), "LowerArm.L": (-20, 0, 0), "LowerArm.R": (-20, 0, 0)}))
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
    key_pose(arm, 4, base(**{"Bike": (0, 0, 18), "Spine": (10, 0, -15), "Head": (0, 0, 20)}))
    key_pose(arm, 10, base(**{"Bike": (0, 0, -14), "Spine": (10, 0, 12), "Head": (0, 0, -16)}))
    key_pose(arm, 16, base())
    push_action_to_nla(arm, act)

    # DEAD (24f): wipe-out, bike falls on its side
    act = new_action(arm, "Dead", 24, loop=False)
    key_pose(arm, 0, base())
    key_pose(arm, 8, base(**{"Bike": (-20, 0, 35), "loc:Bike": (0, -0.3, 0.2), "Spine": (-20, 0, 20), "Head": (-10, 0, 0),
                             "UpperArm.L": (-90, 0, -40), "UpperArm.R": (-90, 0, 40)}))
    key_pose(arm, 24, base(**{"Bike": (0, 0, 82), "loc:Bike": (0, -0.9, -0.05), "Spine": (-25, 0, 30), "Head": (-15, 0, 0),
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
    P("Hips", box("hips", (0.62, 0.40, 0.22), (0, 0.0, 0.92), khaki, bevel=0.04))
    P("Hips", box("belt", (0.64, 0.42, 0.07), (0, 0.0, 1.00), belt))
    P("Hips", box("buckle", (0.10, 0.03, 0.07), (0, 0.22, 1.00), badge))
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
    P("LowerArm.R", cyl("baton", 0.03, 0.6, (-0.44, 0.18, 0.86), baton, rot=(90, 0, 0), verts=8))

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
