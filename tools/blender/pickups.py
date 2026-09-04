"""Collectibles & power-ups (centered at origin, ~1 m tall, floating pivot at z=0).

Run: python3 tools/blender/pickups.py -> public/models/pickups.glb
"""
import math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
from lib import *

PROPS = []
_cx = 0.0


def register(objs, name):
    global _cx
    o = join(objs, name)
    set_origin(o, (0, 0, 0))
    _cx += 3.0
    o.location = (_cx, 0, 0)
    PROPS.append(o)
    return o


def coin():
    gold = mat("gold", "#ffcc1e", rough=0.35, metal=0.6, emissive="#ffb400", emissive_strength=0.35)
    gold_d = mat("gold_dark", "#e0a000", rough=0.35, metal=0.6)
    o = [cyl("disc", 0.42, 0.12, (0, 0, 0), gold, rot=(90, 0, 0), verts=20),
         cyl("rim", 0.34, 0.14, (0, 0, 0), gold_d, rot=(90, 0, 0), verts=20),
         box("bar", (0.12, 0.16, 0.44), (0, 0, 0), gold),
         box("bar2", (0.12, 0.16, 0.16), (0.14, 0, 0.14), gold),
         box("bar3", (0.12, 0.16, 0.16), (0.14, 0, -0.14), gold)]
    register(o, "coin")


def jetpack():
    red = mat("jp_red", "#e0382b", rough=0.4, metal=0.2)
    steel = mat("jp_steel", "#c9d1d9", rough=0.3, metal=0.7)
    dark = mat("jp_dark", "#2b2b2b")
    flame = mat("flame", "#ffa500", emissive="#ff6a00", emissive_strength=3)
    o = []
    for sx in (-1, 1):
        o.append(cyl("tank", 0.22, 0.9, (sx * 0.26, 0, 0.05), red, verts=14))
        o.append(sphere("cap", 0.22, (sx * 0.26, 0, 0.5), steel, seg=12, rings=8))
        o.append(cyl("nozzle", 0.14, 0.2, (sx * 0.26, 0, -0.48), dark, r2=0.2, verts=12))
        o.append(cone("flame", 0.13, 0.0, 0.4, (sx * 0.26, 0, -0.75), flame, rot=(180, 0, 0), verts=10))
    o.append(box("strap", (0.8, 0.12, 0.2), (0, 0.15, 0.15), dark))
    register(o, "jetpack")


def sneakers():
    """Super sneakers: a big red shoe with a spring."""
    red = mat("sn_red", "#e0382b")
    white = mat("sn_white", "#f7f7f7")
    spring = mat("spring", "#c9d1d9", rough=0.3, metal=0.7)
    o = [box("shoe", (0.5, 0.9, 0.35), (0, 0, 0.15), red, bevel=0.06),
         box("toe", (0.52, 0.3, 0.25), (0, 0.32, 0.1), white, bevel=0.05),
         box("sole", (0.52, 0.92, 0.1), (0, 0, -0.05), white),
         box("tongue", (0.3, 0.3, 0.2), (0, -0.05, 0.38), red, bevel=0.04)]
    for i in range(3):
        o.append(torus("coil", 0.2, 0.04, (0, 0, -0.18 - i * 0.12), spring))
    register(o, "sneakers")


def magnet():
    red = mat("mg_red", "#e0382b", rough=0.5)
    grey = mat("mg_grey", "#d0d5db", rough=0.3, metal=0.6)
    o = [torus("horse", 0.36, 0.13, (0, 0, 0.1), red, rot=(90, 0, 0), seg=24, ring=10),
         box("cut", (1.0, 0.4, 0.5), (0, 0, -0.35), None)]
    # emulate horseshoe: cut with boolean
    horse, cut = o
    mod = horse.modifiers.new("cut", 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cut
    bpy.context.view_layer.objects.active = horse
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cut)
    o = [horse]
    for sx in (-1, 1):
        o.append(box("tip", (0.28, 0.28, 0.28), (sx * 0.36, 0, -0.12), grey, bevel=0.03))
    register(o, "magnet")


def multiplier():
    """2x multiplier: blue disc with a bold '2X' extruded."""
    blue = mat("mx_blue", "#1e6fe0", rough=0.4)
    white = mat("mx_white", "#ffffff", emissive="#ffffff", emissive_strength=0.6)
    o = [cyl("disc", 0.5, 0.16, (0, 0, 0), blue, rot=(90, 0, 0), verts=24)]
    bpy.ops.object.text_add(location=(0, -0.09, 0))
    t = bpy.context.active_object
    t.data.body = "2X"
    t.data.size = 0.6
    t.data.extrude = 0.04
    t.data.align_x = 'CENTER'
    t.data.align_y = 'CENTER'
    t.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.convert(target='MESH')
    t = bpy.context.active_object
    t.name = "txt"
    t.data.materials.append(white)
    o.append(t)
    register(o, "multiplier")


def mystery_box():
    purple = mat("mb_purple", "#7b3fe4")
    gold = mat("gold", "#ffcc1e", rough=0.35, metal=0.6)
    white = mat("mx_white", "#ffffff", emissive="#ffffff", emissive_strength=0.6)
    o = [box("box", (0.8, 0.8, 0.8), (0, 0, 0), purple, bevel=0.05),
         box("ribbon1", (0.84, 0.16, 0.84), (0, 0, 0), gold),
         box("ribbon2", (0.16, 0.84, 0.84), (0, 0, 0), gold)]
    bpy.ops.object.text_add(location=(0, -0.42, 0))
    t = bpy.context.active_object
    t.data.body = "?"
    t.data.size = 0.5
    t.data.extrude = 0.03
    t.data.align_x = 'CENTER'
    t.data.align_y = 'CENTER'
    t.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.convert(target='MESH')
    t = bpy.context.active_object
    t.name = "q"
    t.data.materials.append(white)
    o.append(t)
    register(o, "mystery_box")


def key():
    gold = mat("gold", "#ffcc1e", rough=0.35, metal=0.6)
    o = [torus("ring", 0.22, 0.06, (0, 0, 0.3), gold, rot=(90, 0, 0)),
         box("shaft", (0.1, 0.1, 0.6), (0, 0, -0.2), gold),
         box("tooth1", (0.2, 0.1, 0.08), (0.1, 0, -0.45), gold),
         box("tooth2", (0.16, 0.1, 0.08), (0.08, 0, -0.28), gold)]
    register(o, "key")


def hoverboard():
    """Default hoverboard: teal deck with orange stripe, glowing underside."""
    deck = mat("hb_deck", "#1fb2a6")
    stripe = mat("hb_stripe", "#ff7a1a")
    under = mat("hb_under", "#2b2b2b")
    glow = mat("hb_glow", "#7cf2ff", emissive="#7cf2ff", emissive_strength=3)
    o = [box("deck", (0.6, 1.5, 0.08), (0, 0, 0.04), deck, bevel=0.03),
         box("stripe", (0.14, 1.4, 0.09), (0, 0, 0.045), stripe),
         box("nose", (0.5, 0.25, 0.08), (0, 0.8, 0.09), deck, bevel=0.03),
         box("tail", (0.5, 0.25, 0.08), (0, -0.8, 0.09), deck, bevel=0.03),
         box("under", (0.5, 1.2, 0.08), (0, 0, -0.04), under),
         box("glow", (0.3, 1.0, 0.04), (0, 0, -0.09), glow)]
    register(o, "hoverboard")


def headstart_rocket():
    """Head start: small rocket sled."""
    red = mat("jp_red", "#e0382b", rough=0.4, metal=0.2)
    white = mat("sn_white", "#f7f7f7")
    o = [cyl("body", 0.25, 1.0, (0, 0, 0), white, rot=(90, 0, 0), verts=14),
         cone("nose", 0.25, 0.0, 0.4, (0, 0.7, 0), red, rot=(-90, 0, 0), verts=14)]
    for a in (0, 120, 240):
        r = math.radians(a)
        o.append(box("fin", (0.06, 0.35, 0.35), (math.cos(r) * 0.3, -0.4, math.sin(r) * 0.3), red, rot=(0, -a, 0)))
    register(o, "headstart")


if __name__ == "__main__":
    reset()
    for fn in (coin, jetpack, sneakers, magnet, multiplier, mystery_box, key, hoverboard, headstart_rocket):
        fn()
    export("pickups.glb", PROPS, bake=True)
