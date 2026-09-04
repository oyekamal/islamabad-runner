"""Shared helpers for building stylized low-poly game assets with bpy.

Conventions
-----------
* Blender is Z-up.  Characters/vehicles face +Y in Blender, which the glTF
  exporter converts to -Z in Three.js (the running direction of the game).
* Units are metres.  The runner is ~1.8 m tall.  Lane spacing is 2.2 m.
* Colours are flat materials (no textures) so the whole set stays tiny and
  loads instantly on low-end Android phones.
"""
import math
import os
import sys

import bpy
from mathutils import Vector, Euler

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "public", "models")

_materials = {}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _materials.clear()
    sc = bpy.context.scene
    sc.render.fps = 30


def hex_to_rgb(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    # convert sRGB to linear for correct look in glTF
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), 1.0)


def mat(name, color, rough=0.9, metal=0.0, emissive=None, emissive_strength=1.0, alpha=None):
    """Get or create a flat-coloured principled material."""
    if name in _materials:
        return _materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = hex_to_rgb(color)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emissive:
        bsdf.inputs["Emission Color"].default_value = hex_to_rgb(emissive)
        bsdf.inputs["Emission Strength"].default_value = emissive_strength
    if alpha is not None:
        bsdf.inputs["Alpha"].default_value = alpha
        m.blend_method = 'BLEND'
    _materials[name] = m
    return m


def _finish(obj, name, material, parent=None, rot=None, shade_smooth=False):
    obj.name = name
    if material is not None:
        obj.data.materials.append(material)
    if rot:
        # rotate geometry about the object's own origin (its placement point)
        obj.data.transform(Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4())
    if parent is not None:
        obj.parent = parent
    if shade_smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def box(name, size, loc, material, parent=None, rot=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.scale = Vector(size)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = o.modifiers.new("Bevel", 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = 'ANGLE'
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return _finish(o, name, material, parent, rot)


def cyl(name, radius, depth, loc, material, parent=None, rot=None, verts=16, smooth=True, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius, radius2=r2, depth=depth, location=loc)
    o = bpy.context.active_object
    return _finish(o, name, material, parent, rot, shade_smooth=smooth)


def sphere(name, radius, loc, material, parent=None, seg=16, rings=10, scale=None, smooth=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=radius, location=loc)
    o = bpy.context.active_object
    if scale:
        o.scale = Vector(scale)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, name, material, parent, None, shade_smooth=smooth)


def cone(name, r1, r2, depth, loc, material, parent=None, rot=None, verts=16, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc)
    o = bpy.context.active_object
    return _finish(o, name, material, parent, rot, shade_smooth=smooth)


def torus(name, major, minor, loc, material, parent=None, rot=None, seg=24, ring=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc,
                                     major_segments=seg, minor_segments=ring)
    o = bpy.context.active_object
    return _finish(o, name, material, parent, rot, shade_smooth=True)


def empty(name, loc=(0, 0, 0), parent=None):
    bpy.ops.object.empty_add(location=loc)
    o = bpy.context.active_object
    o.name = name
    if parent is not None:
        o.parent = parent
    return o


def join(objs, name):
    """Join several mesh objects into one (keeps per-face materials)."""
    objs = [o for o in objs if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    j = bpy.context.active_object
    j.name = name
    return j


def set_origin(obj, loc):
    bpy.context.scene.cursor.location = Vector(loc)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')


def all_mesh_objects():
    return [o for o in bpy.context.scene.objects if o.type == 'MESH']


def bake_vertex_colors(obj):
    """Collapse all of an object's flat materials into one vertex-coloured material (1 draw call)."""
    mesh = obj.data
    if not mesh.materials:
        return
    attr = mesh.color_attributes.get("Col") or mesh.color_attributes.new("Col", 'FLOAT_COLOR', 'CORNER')
    for poly in mesh.polygons:
        m = mesh.materials[poly.material_index] if poly.material_index < len(mesh.materials) else None
        c = (0.8, 0.8, 0.8, 1.0)
        if m is not None and m.use_nodes:
            bsdf = m.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                base = bsdf.inputs["Base Color"].default_value
                es = bsdf.inputs["Emission Strength"].default_value
                ec = bsdf.inputs["Emission Color"].default_value
                k = min(1.0, es * 0.5)
                c = (min(1, base[0] + ec[0] * k), min(1, base[1] + ec[1] * k), min(1, base[2] + ec[2] * k), 1.0)
        for li in poly.loop_indices:
            attr.data[li].color = c
    mesh.color_attributes.active_color = attr
    mesh.color_attributes.render_color_index = mesh.color_attributes.find("Col")
    vc = _materials.get("__vertex_color__")
    if vc is None:
        vc = bpy.data.materials.new("vertex_color")
        vc.use_nodes = True
        nt = vc.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        node = nt.nodes.new("ShaderNodeVertexColor")
        node.layer_name = "Col"
        nt.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.9
        _materials["__vertex_color__"] = vc
    mesh.materials.clear()
    mesh.materials.append(vc)


def export(filename, objects=None, animations=False, bake=False):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, filename)
    bpy.ops.object.select_all(action='DESELECT')
    if objects is None:
        objects = list(bpy.context.scene.objects)
    for o in objects:
        o.select_set(True)
        if bake and o.type == 'MESH':
            bake_vertex_colors(o)
    kwargs = dict(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=animations,
        export_materials='EXPORT',
        export_image_format='NONE',
        export_texcoords=False,
        export_vertex_color='ACTIVE',
        export_normals=True,
        export_tangents=False,
        export_skins=animations,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
    )
    if animations:
        kwargs.update(export_animation_mode='ACTIONS', export_nla_strips=True, export_frame_range=False,
                      export_force_sampling=True, export_optimize_animation_size=True)
    bpy.ops.export_scene.gltf(**kwargs)
    size = os.path.getsize(path)
    print(f"exported {filename}  {size/1024:.1f} KB")
    return path


# ---------------------------------------------------------------------------
# Rigging helpers
# ---------------------------------------------------------------------------

def make_armature(name, bones):
    """bones: list of (name, head, tail, parent_name or None)."""
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm = bpy.context.active_object
    arm.name = name
    arm.data.name = name
    eb = arm.data.edit_bones
    # remove default bone
    for b in list(eb):
        eb.remove(b)
    created = {}
    for bname, head, tail, parent in bones:
        b = eb.new(bname)
        b.head = Vector(head)
        b.tail = Vector(tail)
        b.roll = 0.0
        created[bname] = b
    for bname, head, tail, parent in bones:
        if parent:
            created[bname].parent = created[parent]
            created[bname].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def bind_rigid(mesh_obj, arm, groups):
    """groups: dict bone_name -> list of part object names that were joined into mesh_obj.
    Requires that each part's vertices carry a vertex group of the part name (see tag_part)."""
    for bone_name, parts in groups.items():
        vg = mesh_obj.vertex_groups.get(bone_name) or mesh_obj.vertex_groups.new(name=bone_name)
        idxs = []
        for pname in parts:
            src = mesh_obj.vertex_groups.get("part:" + pname)
            if src is None:
                continue
            for v in mesh_obj.data.vertices:
                for g in v.groups:
                    if g.group == src.index:
                        idxs.append(v.index)
        if idxs:
            vg.add(idxs, 1.0, 'REPLACE')
    # remove part tags
    for vg in list(mesh_obj.vertex_groups):
        if vg.name.startswith("part:"):
            mesh_obj.vertex_groups.remove(vg)
    mesh_obj.parent = arm
    mod = mesh_obj.modifiers.new("Armature", 'ARMATURE')
    mod.object = arm


def tag_part(obj):
    """Give every vertex of obj a vertex group named part:<name> so we can find them after joining."""
    vg = obj.vertex_groups.new(name="part:" + obj.name)
    vg.add([v.index for v in obj.data.vertices], 1.0, 'REPLACE')


def new_action(arm, name, frame_end, loop=True):
    act = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = act
    try:
        # Blender 4.4+ slotted actions
        slot = act.slots.new(id_type='OBJECT', name=arm.name)
        arm.animation_data.action_slot = slot
    except Exception:
        pass
    act.frame_range = (0, frame_end)
    act.use_frame_range = True
    act.use_cyclic = loop
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = frame_end
    return act


def key_pose(arm, frame, pose):
    """pose: dict bone -> (rx, ry, rz) degrees, optional 'loc:Bone' -> (x,y,z)."""
    bpy.context.scene.frame_set(frame)
    for k, v in pose.items():
        if k.startswith("loc:"):
            pb = arm.pose.bones[k[4:]]
            pb.location = Vector(v)
            pb.keyframe_insert("location", frame=frame)
        else:
            pb = arm.pose.bones[k]
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = Euler([math.radians(a) for a in v], 'XYZ')
            pb.keyframe_insert("rotation_euler", frame=frame)


def push_action_to_nla(arm, act):
    """Stash the action as an NLA strip so the exporter picks up every action."""
    track = arm.animation_data.nla_tracks.new()
    track.name = act.name
    strip = track.strips.new(act.name, int(act.frame_range[0]), act)
    strip.name = act.name
    arm.animation_data.action = None


def beam(name, p1, p2, thick, material, thick2=None, bevel=0.0):
    """Box aligned along the segment p1->p2 (its local Z axis follows the segment)."""
    p1 = Vector(p1); p2 = Vector(p2)
    d = p2 - p1
    L = d.length
    mid = (p1 + p2) / 2
    bpy.ops.mesh.primitive_cube_add(size=1, location=mid)
    o = bpy.context.active_object
    o.scale = Vector((thick, thick2 or thick, L))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = o.modifiers.new("Bevel", 'BEVEL'); mod.width = bevel; mod.segments = 2; mod.limit_method = 'ANGLE'
        bpy.ops.object.modifier_apply(modifier=mod.name)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.transform(q.to_matrix().to_4x4())
    return _finish(o, name, material)


def bake_pose_to_static(arm, mesh_obj, frame, name):
    """Duplicate the skinned mesh with the armature evaluated at `frame` -> plain static mesh."""
    bpy.context.scene.frame_set(frame)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = mesh_obj.evaluated_get(depsgraph)
    new_mesh = bpy.data.meshes.new_from_object(eval_obj)
    new_obj = bpy.data.objects.new(name, new_mesh)
    bpy.context.collection.objects.link(new_obj)
    for m in mesh_obj.data.materials:
        if m.name not in [mm.name for mm in new_mesh.materials]:
            pass
    return new_obj


def action_fcurves(act):
    """All fcurves of an action (works with Blender 4.4+ layered actions and older flat ones)."""
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                out.extend(cb.fcurves)
    return out
