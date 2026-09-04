"""Builds the rigged, animated runner character (and the chaser guard + dog).

Run:  python3 tools/blender/character.py
Outputs public/models/runner.glb, guard.glb, dog.glb
"""
import math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from lib import *


# ----------------------------------------------------------------------------
# Runner
# ----------------------------------------------------------------------------
def build_runner():
    reset()
    skin = mat("skin", "#e8b58a")
    hoodie = mat("hoodie", "#1fb2a6")
    hoodie_dark = mat("hoodie_dark", "#158f86")
    shorts = mat("shorts", "#2c3e8f")
    shoe = mat("shoe", "#f5f5f5")
    shoe_sole = mat("shoe_sole", "#d9d9d9")
    accent = mat("shoe_accent", "#e0382b")
    cap = mat("cap", "#ff7a1a")
    hair = mat("hair", "#2b1d12")
    eye_w = mat("eye_white", "#ffffff")
    eye_b = mat("eye_black", "#1a1a1a")
    mouth = mat("mouth", "#8f3b2c")
    pack = mat("backpack", "#ffcc33")
    pack_dark = mat("backpack_dark", "#c9932a")

    parts = {}
    def P(bone, obj):
        parts.setdefault(bone, []).append(obj.name)
        tag_part(obj)
        return obj

    # torso / hips
    P("Spine", box("torso", (0.62, 0.38, 0.50), (0, 0, 1.22), hoodie, bevel=0.05))
    P("Spine", box("hood", (0.50, 0.16, 0.14), (0, -0.20, 1.44), hoodie_dark, bevel=0.03))
    P("Spine", box("pocket", (0.40, 0.03, 0.12), (0, 0.20, 1.06), hoodie_dark))
    P("Spine", box("pack", (0.40, 0.18, 0.40), (0, -0.28, 1.20), pack, bevel=0.04))
    P("Spine", box("pack_strap_l", (0.06, 0.40, 0.08), (0.20, -0.02, 1.40), pack_dark))
    P("Spine", box("pack_strap_r", (0.06, 0.40, 0.08), (-0.20, -0.02, 1.40), pack_dark))
    P("Hips", box("hips", (0.58, 0.36, 0.20), (0, 0, 0.92), shorts, bevel=0.03))

    # head
    P("Head", box("head", (0.54, 0.50, 0.50), (0, 0.02, 1.72), skin, bevel=0.08))
    P("Head", box("hair_front", (0.50, 0.10, 0.10), (0, 0.24, 1.90), hair))
    P("Head", box("hair_side_l", (0.06, 0.40, 0.22), (0.27, 0.0, 1.84), hair))
    P("Head", box("hair_side_r", (0.06, 0.40, 0.22), (-0.27, 0.0, 1.84), hair))
    P("Head", cyl("cap_top", 0.30, 0.10, (0, 0.0, 1.99), cap, verts=20))
    P("Head", box("cap_brim", (0.30, 0.26, 0.04), (0, -0.34, 1.96), cap, bevel=0.01))
    P("Head", box("cap_button", (0.06, 0.06, 0.04), (0, 0, 2.05), hoodie))
    # face on +Y
    for sx in (-1, 1):
        P("Head", box(f"eye_w_{sx}", (0.12, 0.03, 0.14), (0.12 * sx, 0.265, 1.74), eye_w))
        P("Head", box(f"eye_b_{sx}", (0.06, 0.03, 0.08), (0.11 * sx, 0.28, 1.72), eye_b))
        P("Head", box(f"brow_{sx}", (0.13, 0.03, 0.03), (0.12 * sx, 0.27, 1.84), hair))
    P("Head", box("mouth", (0.14, 0.03, 0.04), (0, 0.27, 1.58), mouth))
    P("Head", box("ear_l", (0.05, 0.08, 0.10), (0.29, 0.0, 1.70), skin))
    P("Head", box("ear_r", (0.05, 0.08, 0.10), (-0.29, 0.0, 1.70), skin))

    # arms
    for sx, side in ((1, "L"), (-1, "R")):
        x = 0.38 * sx
        P(f"UpperArm.{side}", box(f"uarm_{side}", (0.17, 0.17, 0.30), (x, 0, 1.30), hoodie, bevel=0.03))
        P(f"LowerArm.{side}", box(f"larm_{side}", (0.15, 0.15, 0.26), (x, 0, 1.02), hoodie, bevel=0.03))
        P(f"LowerArm.{side}", sphere(f"hand_{side}", 0.10, (x, 0, 0.86), skin, seg=12, rings=8))
        # legs
        lx = 0.15 * sx
        P(f"UpperLeg.{side}", box(f"uleg_{side}", (0.22, 0.24, 0.40), (lx, 0, 0.66), shorts, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"lleg_{side}", (0.18, 0.20, 0.36), (lx, 0, 0.30), skin, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"shoe_{side}", (0.24, 0.40, 0.14), (lx, 0.06, 0.09), shoe, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"sole_{side}", (0.25, 0.42, 0.05), (lx, 0.06, 0.03), shoe_sole, bevel=0.01))
        P(f"LowerLeg.{side}", box(f"lace_{side}", (0.14, 0.14, 0.03), (lx, 0.16, 0.165), accent))
        P(f"LowerLeg.{side}", box(f"swoosh_l_{side}", (0.02, 0.22, 0.05), (lx - 0.125, 0.0, 0.09), accent))
        P(f"LowerLeg.{side}", box(f"swoosh_r_{side}", (0.02, 0.22, 0.05), (lx + 0.125, 0.0, 0.09), accent))
        P(f"LowerLeg.{side}", box(f"heel_{side}", (0.10, 0.03, 0.08), (lx, -0.145, 0.11), accent))

    mesh = join(all_mesh_objects(), "RunnerMesh")

    bones = [
        ("Root", (0, 0, 0), (0, 0, 0.2), None),
        ("Hips", (0, 0, 0.90), (0, 0, 1.00), "Root"),
        ("Spine", (0, 0, 1.00), (0, 0, 1.46), "Hips"),
        ("Head", (0, 0, 1.46), (0, 0, 1.95), "Spine"),
        ("UpperArm.L", (0.38, 0, 1.44), (0.38, 0, 1.16), "Spine"),
        ("LowerArm.L", (0.38, 0, 1.16), (0.38, 0, 0.86), "UpperArm.L"),
        ("UpperArm.R", (-0.38, 0, 1.44), (-0.38, 0, 1.16), "Spine"),
        ("LowerArm.R", (-0.38, 0, 1.16), (-0.38, 0, 0.86), "UpperArm.R"),
        ("UpperLeg.L", (0.15, 0, 0.88), (0.15, 0, 0.48), "Hips"),
        ("LowerLeg.L", (0.15, 0, 0.48), (0.15, 0, 0.05), "UpperLeg.L"),
        ("UpperLeg.R", (-0.15, 0, 0.88), (-0.15, 0, 0.48), "Hips"),
        ("LowerLeg.R", (-0.15, 0, 0.48), (-0.15, 0, 0.05), "UpperLeg.R"),
    ]
    arm = make_armature("Runner", bones)
    bind_rigid(mesh, arm, parts)
    animate_humanoid(arm)
    export("runner.glb", [arm, mesh], animations=True)


def animate_humanoid(arm, scale=1.0):
    """Shared humanoid animation set. Rotation X on a downward bone swings it
    forward (+) / backward (-); on the spine/head chain +X tilts forward."""
    S = scale
    # ------------------------------------------------------------- RUN (20f)
    act = new_action(arm, "Run", 20, loop=True)
    def run_pose(t):  # t in [0,1)
        a = math.sin(t * 2 * math.pi)          # leg phase
        b = math.cos(t * 2 * math.pi)
        bob = abs(math.sin(t * 2 * math.pi * 2)) * 0.06
        knee_l = max(0, -a) * 70 + 15
        knee_r = max(0, a) * 70 + 15
        return {
            "loc:Hips": (0, 0, bob),
            "Hips": (0, 0, a * 6),
            "Spine": (14, 0, -a * 5),
            "Head": (-10, 0, a * 4),
            "UpperLeg.L": (a * 45 * S, 0, 0),
            "LowerLeg.L": (-knee_l * S, 0, 0),
            "UpperLeg.R": (-a * 45 * S, 0, 0),
            "LowerLeg.R": (-knee_r * S, 0, 0),
            "UpperArm.L": (-a * 50, 0, -12),
            "LowerArm.L": (65, 0, 0),
            "UpperArm.R": (a * 50, 0, 12),
            "LowerArm.R": (65, 0, 0),
        }
    for f in range(0, 21, 2):
        key_pose(arm, f, run_pose((f % 20) / 20))
    push_action_to_nla(arm, act)

    # ------------------------------------------------------------ IDLE (60f)
    act = new_action(arm, "Idle", 60, loop=True)
    for f in range(0, 61, 10):
        t = f / 60
        s = math.sin(t * 2 * math.pi)
        key_pose(arm, f, {
            "loc:Hips": (0, 0, -0.02 + s * 0.015),
            "Hips": (0, 0, 0), "Spine": (2 + s * 2, 0, 0), "Head": (s * -2, 0, 0),
            "UpperLeg.L": (0, 0, 4), "LowerLeg.L": (-4, 0, 0),
            "UpperLeg.R": (0, 0, -4), "LowerLeg.R": (-4, 0, 0),
            "UpperArm.L": (5 + s * 2, 0, -10), "LowerArm.L": (15, 0, 0),
            "UpperArm.R": (5 - s * 2, 0, 10), "LowerArm.R": (15, 0, 0),
        })
    push_action_to_nla(arm, act)

    # ------------------------------------------------------------ JUMP (24f)
    act = new_action(arm, "Jump", 24, loop=False)
    key_pose(arm, 0, {"loc:Hips": (0, 0, 0), "Spine": (10, 0, 0), "Head": (-5, 0, 0),
                      "UpperLeg.L": (40, 0, 0), "LowerLeg.L": (-40, 0, 0),
                      "UpperLeg.R": (-20, 0, 0), "LowerLeg.R": (-30, 0, 0),
                      "UpperArm.L": (-40, 0, -15), "LowerArm.L": (50, 0, 0),
                      "UpperArm.R": (40, 0, 15), "LowerArm.R": (50, 0, 0)})
    key_pose(arm, 10, {"loc:Hips": (0, 0, 0), "Spine": (5, 0, 0), "Head": (0, 0, 0),
                       "UpperLeg.L": (70, 0, 0), "LowerLeg.L": (-95, 0, 0),
                       "UpperLeg.R": (55, 0, 0), "LowerLeg.R": (-100, 0, 0),
                       "UpperArm.L": (-150, 0, -25), "LowerArm.L": (20, 0, 0),
                       "UpperArm.R": (-150, 0, 25), "LowerArm.R": (20, 0, 0)})
    key_pose(arm, 24, {"loc:Hips": (0, 0, 0), "Spine": (12, 0, 0), "Head": (-8, 0, 0),
                       "UpperLeg.L": (30, 0, 0), "LowerLeg.L": (-20, 0, 0),
                       "UpperLeg.R": (10, 0, 0), "LowerLeg.R": (-15, 0, 0),
                       "UpperArm.L": (-30, 0, -15), "LowerArm.L": (60, 0, 0),
                       "UpperArm.R": (-30, 0, 15), "LowerArm.R": (60, 0, 0)})
    push_action_to_nla(arm, act)

    # ------------------------------------------------------------ ROLL (18f)
    act = new_action(arm, "Roll", 18, loop=False)
    tuck = {"Spine": (55, 0, 0), "Head": (45, 0, 0),
            "UpperLeg.L": (100, 0, 0), "LowerLeg.L": (-120, 0, 0),
            "UpperLeg.R": (100, 0, 0), "LowerLeg.R": (-120, 0, 0),
            "UpperArm.L": (-90, 0, -20), "LowerArm.L": (100, 0, 0),
            "UpperArm.R": (-90, 0, 20), "LowerArm.R": (100, 0, 0)}
    for f, rot, z in ((0, 0, 0.0), (6, 130, -0.2), (12, 250, -0.2), (18, 360, 0.0)):
        p = dict(tuck)
        p["Hips"] = (rot, 0, 0)
        p["loc:Hips"] = (0, 0, z)
        key_pose(arm, f, p)
    push_action_to_nla(arm, act)

    # ------------------------------------------------------------- FLY (40f)  jetpack
    act = new_action(arm, "Fly", 40, loop=True)
    for f in range(0, 41, 10):
        s = math.sin(f / 40 * 2 * math.pi)
        key_pose(arm, f, {"loc:Hips": (0, 0, s * 0.03), "Hips": (0, 0, 0), "Spine": (25, 0, 0), "Head": (-20, 0, 0),
                          "UpperLeg.L": (-25 + s * 5, 0, 8), "LowerLeg.L": (-30, 0, 0),
                          "UpperLeg.R": (-25 - s * 5, 0, -8), "LowerLeg.R": (-30, 0, 0),
                          "UpperArm.L": (-20, 0, -75), "LowerArm.L": (20, 0, 0),
                          "UpperArm.R": (-20, 0, 75), "LowerArm.R": (20, 0, 0)})
    push_action_to_nla(arm, act)

    # ----------------------------------------------------------- HOVER (40f)  hoverboard stance
    act = new_action(arm, "Hover", 40, loop=True)
    for f in range(0, 41, 10):
        s = math.sin(f / 40 * 2 * math.pi)
        key_pose(arm, f, {"loc:Hips": (0, 0, -0.08 + s * 0.02), "Hips": (0, 0, 20), "Spine": (8, 0, -15), "Head": (0, 0, -8),
                          "UpperLeg.L": (25, 0, 10), "LowerLeg.L": (-35, 0, 0),
                          "UpperLeg.R": (-20, 0, -10), "LowerLeg.R": (-30, 0, 0),
                          "UpperArm.L": (-30 + s * 4, 0, -60), "LowerArm.L": (30, 0, 0),
                          "UpperArm.R": (20 - s * 4, 0, 50), "LowerArm.R": (30, 0, 0)})
    push_action_to_nla(arm, act)

    # ---------------------------------------------------------- STUMBLE (14f)
    act = new_action(arm, "Stumble", 14, loop=False)
    key_pose(arm, 0, {"loc:Hips": (0, 0, 0), "Hips": (0, 0, 0), "Spine": (14, 0, 0), "Head": (-10, 0, 0),
                      "UpperLeg.L": (30, 0, 0), "LowerLeg.L": (-30, 0, 0), "UpperLeg.R": (-30, 0, 0), "LowerLeg.R": (-30, 0, 0),
                      "UpperArm.L": (-40, 0, -12), "LowerArm.L": (60, 0, 0), "UpperArm.R": (40, 0, 12), "LowerArm.R": (60, 0, 0)})
    key_pose(arm, 7, {"loc:Hips": (0, 0.15, -0.12), "Hips": (0, 0, 0), "Spine": (45, 0, 10), "Head": (-20, 0, 0),
                      "UpperLeg.L": (-20, 0, 0), "LowerLeg.L": (-60, 0, 0), "UpperLeg.R": (50, 0, 0), "LowerLeg.R": (-20, 0, 0),
                      "UpperArm.L": (-120, 0, -30), "LowerArm.L": (20, 0, 0), "UpperArm.R": (-100, 0, 30), "LowerArm.R": (20, 0, 0)})
    key_pose(arm, 14, {"loc:Hips": (0, 0, 0), "Hips": (0, 0, 0), "Spine": (14, 0, 0), "Head": (-10, 0, 0),
                       "UpperLeg.L": (30, 0, 0), "LowerLeg.L": (-30, 0, 0), "UpperLeg.R": (-30, 0, 0), "LowerLeg.R": (-30, 0, 0),
                       "UpperArm.L": (-40, 0, -12), "LowerArm.L": (60, 0, 0), "UpperArm.R": (40, 0, 12), "LowerArm.R": (60, 0, 0)})
    push_action_to_nla(arm, act)

    # -------------------------------------------------------------- DEAD (20f)  hit a train, thrown back
    act = new_action(arm, "Dead", 20, loop=False)
    key_pose(arm, 0, {"loc:Hips": (0, 0, 0), "Hips": (0, 0, 0), "Spine": (10, 0, 0), "Head": (0, 0, 0),
                      "UpperLeg.L": (20, 0, 0), "LowerLeg.L": (-20, 0, 0), "UpperLeg.R": (-20, 0, 0), "LowerLeg.R": (-20, 0, 0),
                      "UpperArm.L": (-40, 0, -12), "LowerArm.L": (60, 0, 0), "UpperArm.R": (40, 0, 12), "LowerArm.R": (60, 0, 0)})
    key_pose(arm, 8, {"loc:Hips": (0, -0.6, 0.3), "Hips": (-50, 0, 0), "Spine": (-20, 0, 0), "Head": (-25, 0, 0),
                      "UpperLeg.L": (60, 0, 10), "LowerLeg.L": (-30, 0, 0), "UpperLeg.R": (80, 0, -10), "LowerLeg.R": (-50, 0, 0),
                      "UpperArm.L": (-160, 0, -40), "LowerArm.L": (30, 0, 0), "UpperArm.R": (-160, 0, 40), "LowerArm.R": (30, 0, 0)})
    key_pose(arm, 20, {"loc:Hips": (0, -1.4, -0.75), "Hips": (-90, 0, 0), "Spine": (-10, 0, 0), "Head": (-20, 0, 0),
                       "UpperLeg.L": (20, 0, 15), "LowerLeg.L": (-10, 0, 0), "UpperLeg.R": (30, 0, -15), "LowerLeg.R": (-15, 0, 0),
                       "UpperArm.L": (-170, 0, -50), "LowerArm.L": (10, 0, 0), "UpperArm.R": (-170, 0, 50), "LowerArm.R": (10, 0, 0)})
    push_action_to_nla(arm, act)


# ----------------------------------------------------------------------------
# Guard (the chaser) — a portly traffic warden with whistle and baton
# ----------------------------------------------------------------------------
def build_guard():
    reset()
    skin = mat("skin", "#c98b62")
    shirt = mat("shirt", "#f0f4f8")
    trousers = mat("trousers", "#1e2a44")
    cap = mat("gcap", "#1e2a44")
    cap_band = mat("gcap_band", "#f5c400")
    belt = mat("belt", "#2a1a0a")
    shoe = mat("gshoe", "#1a1a1a")
    eye_w = mat("eye_white", "#ffffff")
    eye_b = mat("eye_black", "#1a1a1a")
    moust = mat("moustache", "#2b1d12")
    badge = mat("badge", "#ffd24d", metal=0.4, rough=0.4)
    baton = mat("baton", "#222222")

    parts = {}
    def P(bone, obj):
        parts.setdefault(bone, []).append(obj.name)
        tag_part(obj)
        return obj

    P("Spine", box("torso", (0.80, 0.56, 0.52), (0, 0.02, 1.22), shirt, bevel=0.08))
    P("Spine", box("belly", (0.70, 0.30, 0.30), (0, 0.22, 1.08), shirt, bevel=0.08))
    P("Spine", box("epaulet_l", (0.20, 0.14, 0.04), (0.32, 0, 1.49), cap_band))
    P("Spine", box("epaulet_r", (0.20, 0.14, 0.04), (-0.32, 0, 1.49), cap_band))
    P("Spine", box("badge", (0.10, 0.03, 0.10), (-0.22, 0.30, 1.32), badge))
    P("Spine", box("tie", (0.08, 0.03, 0.30), (0, 0.30, 1.28), trousers))
    P("Hips", box("hips", (0.74, 0.50, 0.22), (0, 0.02, 0.92), trousers, bevel=0.04))
    P("Hips", box("belt", (0.76, 0.52, 0.07), (0, 0.02, 1.00), belt))
    P("Hips", box("buckle", (0.10, 0.03, 0.07), (0, 0.29, 1.00), badge))
    P("Head", box("head", (0.50, 0.46, 0.44), (0, 0.02, 1.70), skin, bevel=0.08))
    P("Head", cyl("cap_top", 0.30, 0.14, (0, 0.0, 1.98), cap, verts=20))
    P("Head", cyl("cap_band", 0.31, 0.05, (0, 0.0, 1.92), cap_band, verts=20))
    P("Head", box("cap_brim", (0.30, 0.22, 0.03), (0, 0.30, 1.91), cap))
    for sx in (-1, 1):
        P("Head", box(f"eye_w_{sx}", (0.11, 0.03, 0.10), (0.11 * sx, 0.245, 1.74), eye_w))
        P("Head", box(f"eye_b_{sx}", (0.05, 0.03, 0.06), (0.10 * sx, 0.26, 1.73), eye_b))
        P("Head", box(f"brow_{sx}", (0.13, 0.03, 0.04), (0.11 * sx, 0.25, 1.82), moust, rot=(0, 0, 12 * sx)))
    P("Head", box("moustache", (0.30, 0.05, 0.07), (0, 0.26, 1.60), moust, bevel=0.02))
    P("Head", box("nose", (0.08, 0.08, 0.08), (0, 0.27, 1.66), skin))
    for sx, side in ((1, "L"), (-1, "R")):
        x = 0.48 * sx
        P(f"UpperArm.{side}", box(f"uarm_{side}", (0.20, 0.20, 0.30), (x, 0, 1.30), shirt, bevel=0.04))
        P(f"LowerArm.{side}", box(f"larm_{side}", (0.17, 0.17, 0.26), (x, 0, 1.02), skin, bevel=0.03))
        P(f"LowerArm.{side}", sphere(f"hand_{side}", 0.10, (x, 0, 0.86), skin, seg=12, rings=8))
        lx = 0.20 * sx
        P(f"UpperLeg.{side}", box(f"uleg_{side}", (0.26, 0.28, 0.40), (lx, 0, 0.66), trousers, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"lleg_{side}", (0.22, 0.24, 0.36), (lx, 0, 0.30), trousers, bevel=0.03))
        P(f"LowerLeg.{side}", box(f"shoe_{side}", (0.26, 0.40, 0.14), (lx, 0.06, 0.08), shoe, bevel=0.03))
    # baton in right hand
    P("LowerArm.R", cyl("baton", 0.03, 0.55, (-0.48, 0.15, 0.86), baton, rot=(90, 0, 0), verts=8))

    mesh = join(all_mesh_objects(), "GuardMesh")
    bones = [
        ("Root", (0, 0, 0), (0, 0, 0.2), None),
        ("Hips", (0, 0, 0.90), (0, 0, 1.00), "Root"),
        ("Spine", (0, 0, 1.00), (0, 0, 1.46), "Hips"),
        ("Head", (0, 0, 1.46), (0, 0, 1.95), "Spine"),
        ("UpperArm.L", (0.48, 0, 1.44), (0.48, 0, 1.16), "Spine"),
        ("LowerArm.L", (0.48, 0, 1.16), (0.48, 0, 0.86), "UpperArm.L"),
        ("UpperArm.R", (-0.48, 0, 1.44), (-0.48, 0, 1.16), "Spine"),
        ("LowerArm.R", (-0.48, 0, 1.16), (-0.48, 0, 0.86), "UpperArm.R"),
        ("UpperLeg.L", (0.20, 0, 0.88), (0.20, 0, 0.48), "Hips"),
        ("LowerLeg.L", (0.20, 0, 0.48), (0.20, 0, 0.05), "UpperLeg.L"),
        ("UpperLeg.R", (-0.20, 0, 0.88), (-0.20, 0, 0.48), "Hips"),
        ("LowerLeg.R", (-0.20, 0, 0.48), (-0.20, 0, 0.05), "UpperLeg.R"),
    ]
    arm = make_armature("Guard", bones)
    bind_rigid(mesh, arm, parts)
    animate_humanoid(arm, scale=0.8)
    export("guard.glb", [arm, mesh], animations=True)


# ----------------------------------------------------------------------------
# Dog — the guard's companion
# ----------------------------------------------------------------------------
def build_dog():
    reset()
    fur = mat("fur", "#c48a4a")
    fur_dark = mat("fur_dark", "#8a5a2b")
    nose = mat("dnose", "#1a1a1a")
    eye = mat("eye_black", "#1a1a1a")
    collar = mat("collar", "#e0382b")
    tongue = mat("tongue", "#ff7a9a")
    parts = {}
    def P(bone, obj):
        parts.setdefault(bone, []).append(obj.name)
        tag_part(obj)
        return obj
    P("Body", box("body", (0.36, 0.70, 0.34), (0, 0, 0.52), fur, bevel=0.06))
    P("Body", box("belly", (0.30, 0.50, 0.10), (0, 0, 0.36), fur_dark, bevel=0.03))
    P("Body", box("tail", (0.08, 0.30, 0.08), (0, -0.45, 0.66), fur_dark, rot=(35, 0, 0)))
    P("Head", box("head", (0.34, 0.34, 0.30), (0, 0.48, 0.70), fur, bevel=0.05))
    P("Head", box("snout", (0.20, 0.20, 0.16), (0, 0.70, 0.62), fur_dark, bevel=0.03))
    P("Head", box("nose", (0.10, 0.06, 0.08), (0, 0.80, 0.66), nose))
    P("Head", box("tongue", (0.08, 0.14, 0.03), (0, 0.72, 0.53), tongue))
    P("Head", box("ear_l", (0.08, 0.14, 0.22), (0.17, 0.42, 0.86), fur_dark, rot=(0, 20, 0)))
    P("Head", box("ear_r", (0.08, 0.14, 0.22), (-0.17, 0.42, 0.86), fur_dark, rot=(0, -20, 0)))
    P("Head", box("eye_l", (0.05, 0.03, 0.06), (0.10, 0.655, 0.76), eye))
    P("Head", box("eye_r", (0.05, 0.03, 0.06), (-0.10, 0.655, 0.76), eye))
    P("Head", cyl("collar", 0.17, 0.06, (0, 0.34, 0.62), collar, rot=(90, 0, 0), verts=12))
    for sx, side in ((1, "L"), (-1, "R")):
        P(f"FrontLeg.{side}", box(f"fleg_{side}", (0.12, 0.13, 0.36), (0.13 * sx, 0.24, 0.20), fur, bevel=0.02))
        P(f"FrontLeg.{side}", box(f"fpaw_{side}", (0.13, 0.16, 0.08), (0.13 * sx, 0.26, 0.04), fur_dark))
        P(f"BackLeg.{side}", box(f"bleg_{side}", (0.13, 0.15, 0.36), (0.13 * sx, -0.24, 0.20), fur, bevel=0.02))
        P(f"BackLeg.{side}", box(f"bpaw_{side}", (0.13, 0.16, 0.08), (0.13 * sx, -0.22, 0.04), fur_dark))
    mesh = join(all_mesh_objects(), "DogMesh")
    bones = [
        ("Root", (0, 0, 0), (0, 0, 0.2), None),
        ("Body", (0, -0.1, 0.5), (0, 0.3, 0.5), "Root"),
        ("Head", (0, 0.32, 0.6), (0, 0.6, 0.72), "Body"),
        ("FrontLeg.L", (0.13, 0.24, 0.40), (0.13, 0.24, 0.02), "Body"),
        ("FrontLeg.R", (-0.13, 0.24, 0.40), (-0.13, 0.24, 0.02), "Body"),
        ("BackLeg.L", (0.13, -0.24, 0.40), (0.13, -0.24, 0.02), "Body"),
        ("BackLeg.R", (-0.13, -0.24, 0.40), (-0.13, -0.24, 0.02), "Body"),
    ]
    arm = make_armature("Dog", bones)
    bind_rigid(mesh, arm, parts)
    act = new_action(arm, "Run", 16, loop=True)
    for f in range(0, 17, 2):
        t = f / 16
        a = math.sin(t * 2 * math.pi)
        key_pose(arm, f, {"loc:Body": (0, 0, abs(a) * 0.08), "Body": (a * 6, 0, 0), "Head": (-a * 8, 0, 0),
                          "FrontLeg.L": (a * 45, 0, 0), "FrontLeg.R": (a * 45, 0, 0),
                          "BackLeg.L": (-a * 45, 0, 0), "BackLeg.R": (-a * 45, 0, 0)})
    push_action_to_nla(arm, act)
    act = new_action(arm, "Idle", 40, loop=True)
    for f in range(0, 41, 10):
        s = math.sin(f / 40 * 2 * math.pi)
        key_pose(arm, f, {"loc:Body": (0, 0, 0), "Body": (0, 0, 0), "Head": (s * 5, 0, s * 8),
                          "FrontLeg.L": (0, 0, 0), "FrontLeg.R": (0, 0, 0), "BackLeg.L": (0, 0, 0), "BackLeg.R": (0, 0, 0)})
    push_action_to_nla(arm, act)
    export("dog.glb", [arm, mesh], animations=True)


if __name__ == "__main__":
    which = sys.argv[1:] or ["runner", "guard", "dog"]
    if "runner" in which:
        build_runner()
    if "guard" in which:
        build_guard()
    if "dog" in which:
        build_dog()
