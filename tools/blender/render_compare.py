"""Hero-shot renderer for the gauntlet loop: import an exported GLB into a fresh
scene and render a 512x512 three-quarter-front shot matching the camera angle of
store/gemini/icon_a_sky.png (camera at the model's front-left, ~30 deg elevation,
sky-blue backdrop, warm sun + cool fill).  Then paste it next to the reference.

Run:
  blender --background --python tools/blender/render_compare.py -- \
      public/models/biker.glb shots/restyle/biker_v1.png [store/gemini/icon_a_sky.png] [focus_z] [dist]

Writes <out>.png and <out>_vs_ref.png (side-by-side, 1024x512).
"""
import math, os, sys
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = os.path.join(ROOT, argv[0] if argv else "public/models/biker.glb")
OUT = os.path.join(ROOT, argv[1] if len(argv) > 1 else "shots/restyle/biker_v1.png")
REF = os.path.join(ROOT, argv[2] if len(argv) > 2 else "store/gemini/icon_a_sky.png")
FOCUS_Z = float(argv[3]) if len(argv) > 3 else 1.05
DIST = float(argv[4]) if len(argv) > 4 else 4.0
SAMPLES = int(os.environ.get("RC_SAMPLES", "64"))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
sc = bpy.context.scene

# Rest pose by default; RC_ACTION=<clip> RC_FRAME=<n> poses the armature at that clip/frame instead.
ACTION = os.environ.get("RC_ACTION")
FRAME = int(os.environ.get("RC_FRAME", "0"))
for o in bpy.data.objects:
    if o.animation_data:
        o.animation_data.action = None
        for t in list(o.animation_data.nla_tracks):
            if ACTION and t.strips and t.strips[0].action and t.strips[0].action.name == ACTION:
                t.mute = False
                t.strips[0].frame_start = 0
            else:
                o.animation_data.nla_tracks.remove(t)
sc.frame_set(FRAME)

# ---------------------------------------------------------------- backdrop
world = bpy.data.worlds.new("Sky")
sc.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.09, 0.42, 0.75, 1.0)   # sky blue (linear)
bg.inputs[1].default_value = 1.0
# ground disc catching the shadow, tinted like the icon's blue floor
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
ground = bpy.context.active_object
gm = bpy.data.materials.new("ground")
gm.use_nodes = True
gb = next(n for n in gm.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
gb.inputs["Base Color"].default_value = (0.10, 0.45, 0.78, 1.0)
gb.inputs["Roughness"].default_value = 1.0
ground.data.materials.append(gm)

# ---------------------------------------------------------------- lights
def light(name, kind, loc, energy, color=(1, 1, 1), size=None, target=(0, 0, 1)):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if size is not None:
        if kind == "SUN":
            ld.angle = size
        else:
            ld.shadow_soft_size = size
    lo = bpy.data.objects.new(name, ld)
    sc.collection.objects.link(lo)
    lo.location = loc
    d = Vector(target) - Vector(loc)
    lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return lo

light("Sun", "SUN", (3.0, 2.0, 6.0), 4.0, (1.0, 0.96, 0.9), size=math.radians(6))
light("Fill", "AREA", (-4.0, 4.0, 3.0), 400, (0.75, 0.85, 1.0), size=3.0)
light("Rim", "AREA", (0.5, -5.0, 3.5), 250, (0.9, 0.95, 1.0), size=2.5)

# ---------------------------------------------------------------- camera
# three-quarter front from the model's RIGHT (-X) side so the nose points to screen-left like the icon, front is +Y in Blender.
cam_d = bpy.data.cameras.new("Cam")
cam_d.lens = 42
cam = bpy.data.objects.new("Cam", cam_d)
sc.collection.objects.link(cam)
sc.camera = cam
az = math.radians(float(os.environ.get("RC_AZ", "48")))   # 0 = straight from the front, 90 = side, 180 = rear (RC_AZ overrides)
el = math.radians(float(os.environ.get("RC_EL", "27")))
cam.location = (-DIST * math.cos(el) * math.sin(az), DIST * math.cos(el) * math.cos(az), FOCUS_Z + DIST * math.sin(el))
d = Vector((0, 0, FOCUS_Z)) - cam.location
cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

# ---------------------------------------------------------------- render
sc.render.resolution_x = 512
sc.render.resolution_y = 512
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = OUT
try:
    sc.render.engine = "CYCLES"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.device = "CPU"
except TypeError:
    sc.render.engine = "BLENDER_EEVEE"
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
bpy.ops.render.render(write_still=True)
print("rendered", OUT)

# ---------------------------------------------------------------- side-by-side with the reference
if os.path.exists(REF):
    import numpy as np
    ref = bpy.data.images.load(REF)
    ref.scale(512, 512)
    mine = bpy.data.images.load(OUT)
    def rgba(img):
        a = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
        if a.shape[2] == 4 and img.channels == 3:
            a[..., 3] = 1
        return a
    r = rgba(ref); m = rgba(mine)
    both = np.concatenate([r, m], axis=1)   # ref left, mine right
    out = bpy.data.images.new("both", 1024, 512, alpha=True)
    out.pixels = both.ravel().tolist()
    side = OUT.replace(".png", "_vs_ref.png")
    out.filepath_raw = side
    out.file_format = "PNG"
    out.save()
    print("side-by-side", side)
