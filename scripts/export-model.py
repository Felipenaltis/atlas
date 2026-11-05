"""Blender script: export only the 206 adult bones, preserving model coordinates.

blender -b -t 2 --python scripts/export-model.py -- /path/to/Startup.blend
The original Z-Anatomy scene is never saved or modified on disk.
"""
import bpy
import json
import pathlib
import sys
from mathutils import Vector

root=pathlib.Path(__file__).resolve().parents[1]
bones=json.loads((root/'src/data/bones.json').read_text())
source=sys.argv[sys.argv.index('--')+1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
with bpy.data.libraries.load(source, link=False) as (src,dst):
    dst.collections=['Skeletal system']
collection=dst.collections[0]
bpy.context.scene.collection.children.link(collection)
bpy.context.view_layer.update()
source_objects={o.name:o for o in collection.all_objects}
missing=[name for bone in bones for name in bone['sources'] if name not in source_objects]
assert not missing,missing

export_collection=bpy.data.collections.new('Atlas skeleton')
bpy.context.scene.collection.children.link(export_collection)
material=bpy.data.materials.new('Ivory bone')
material.diffuse_color=(0.72,0.68,0.55,1)
material.use_nodes=True
bsdf=material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value=(0.72,0.68,0.55,1)
bsdf.inputs['Roughness'].default_value=0.69
export_objects=[]
for bone in bones:
    copies=[]
    for name in bone['sources']:
        original=source_objects[name]
        obj=bpy.data.objects.new('export_'+name,original.data.copy())
        export_collection.objects.link(obj)
        obj.matrix_world=original.matrix_world.copy()
        obj.data.materials.clear()
        obj.data.materials.append(material)
        for poly in obj.data.polygons:
            poly.material_index=0
            poly.use_smooth=True
        copies.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in copies:obj.select_set(True)
    bpy.context.view_layer.objects.active=copies[0]
    if len(copies)>1:bpy.ops.object.join()
    obj=copies[0]
    obj.name=bone['id']
    obj['boneId']=bone['id']
    obj['region']=bone['region']
    obj['nameEs']=bone['name']
    obj['source']='Z-Anatomy / BodyParts3D'
    export_objects.append(obj)

# Teeth are reference anatomy, not counted as bones and not selectable.
for name,original in source_objects.items():
    if any(w in name.lower() for w in ['incisor','canine','premolar','molar tooth']) and name.endswith(('.l','.r')):
        obj=bpy.data.objects.new('tooth_'+name,original.data.copy())
        export_collection.objects.link(obj)
        obj.matrix_world=original.matrix_world.copy()
        obj.data.materials.clear();obj.data.materials.append(material)
        for poly in obj.data.polygons:poly.material_index=0;poly.use_smooth=True
        obj['decorative']=True
        obj['region']='skull'
        export_objects.append(obj)

bpy.context.scene.collection.children.unlink(collection)
bpy.context.view_layer.update()
points=[o.matrix_world @ Vector(p) for o in export_objects for p in o.bound_box]
print('BOUNDS',[(min(p[i] for p in points),max(p[i] for p in points)) for i in range(3)])
bpy.ops.object.select_all(action='DESELECT')
for o in export_objects:o.hide_set(False);o.hide_viewport=False;o.hide_render=False;o.select_set(True)
bpy.context.view_layer.objects.active=export_objects[0]
target=root/'public/models/skeleton.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,
    export_extras=True,export_yup=True,export_animations=False,export_cameras=False,
    export_lights=False,export_apply=True,export_materials='EXPORT')
print('EXPORTED',len(bones),'bones',len(export_objects),'objects',target.stat().st_size,'bytes')
