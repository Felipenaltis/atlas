"""Export other source systems on demand, excluding labels and construction guides.

blender -b -t 2 --python scripts/export-systems.py -- /path/to/Startup.blend
Meshes are simplified for web delivery; names and provenance remain in glTF extras.
"""
import bpy
import json
import pathlib
import re
import sys
import unicodedata
from mathutils import Vector

root=pathlib.Path(__file__).resolve().parents[1]
source=sys.argv[sys.argv.index('--')+1]
terms=json.loads((root/'src/data/terms.json').read_text())
def norm(s):return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()).strip()
term_map={norm(t['en']):t for t in terms}
systems=[('muscular','Muscular system'),('cardiovascular','Cardiovascular system'),('nervous','Nervous system'),('visceral','Visceral systems')]
with bpy.data.libraries.load(source,link=False) as (src,dst):dst.collections=[s[1] for s in systems]
for c in dst.collections:bpy.context.scene.collection.children.link(c)
bpy.context.view_layer.update()
all_entities=[]

def material(name,color):
    m=bpy.data.materials.new('Atlas '+name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.63
    return m
materials={'muscle':material('muscle',(.38,.095,.065)),'tendon':material('tendon',(.68,.65,.51)),
 'artery':material('artery',(.62,.055,.035)),'vein':material('vein',(.075,.19,.4)),
 'nerve':material('nerve',(.7,.49,.10)),'brain':material('brain',(.55,.39,.3)),
 'organ':material('organ',(.45,.16,.13)),'airway':material('airway',(.48,.49,.34)),
 'gland':material('gland',(.55,.34,.17))}

for (system,col_name),collection in zip(systems,dst.collections):
    export_col=bpy.data.collections.new('Atlas '+system);bpy.context.scene.collection.children.link(export_col)
    objects=[];entities=[]
    for original in list(collection.all_objects):
        name=original.name
        if original.type not in ['MESH','CURVE']:continue
        if '.' in name and not name.endswith(('.r','.l')):continue
        if any(x in name.lower() for x in ['-profile','-path','beziercircle','beziercurve','curve profile']):continue
        side=name[-1] if name.endswith(('.r','.l')) else None
        english=name[:-2] if side else name
        english=english.rstrip("'")
        term=term_map.get(norm(english))
        if not term:
            for candidate in [english.replace(' muscle',''),english+' muscle',english.replace(' fibres',' fibers')]:
                term=term_map.get(norm(candidate))
                if term:break
        es=(term.get('es') or english) if term else english
        latin=term['la'] if term else english
        id=system+'-'+norm(english).replace(' ','-')+('-'+side if side else '')
        if any(e['id']==id for e in entities):continue
        # Curves need evaluated geometry, including their original bevel profiles.
        if original.type=='CURVE':
            if original.data.bevel_depth==0 and not original.data.bevel_object:continue
            mesh=bpy.data.meshes.new_from_object(original.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        elif not original.data.polygons and original.modifiers:
            # Some tendon sheaths are edge-only Skin/Subdivision control cages.
            # Export their evaluated surfaces, not the invisible control edges.
            original.hide_set(False);original.hide_viewport=False;bpy.context.view_layer.update()
            mesh=bpy.data.meshes.new_from_object(original.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        else:mesh=original.data.copy()
        if not mesh.vertices or not mesh.polygons:raise ValueError('No exportable surface: '+name)
        obj=bpy.data.objects.new(id,mesh);export_col.objects.link(obj);obj.matrix_world=original.matrix_world.copy()
        originals=[m.name.lower() if m else '' for m in original.data.materials]
        converted=[]
        for mat in originals or ['']:
            key='muscle' if system=='muscular' else 'artery' if system=='cardiovascular' else 'nerve' if system=='nervous' else 'organ'
            if any(x in mat for x in ['vein','venous']):key='vein'
            elif any(x in mat for x in ['tendon','ligament','cartilage','fascia','white matter']):key='tendon'
            elif any(x in mat for x in ['brain','lobe','nucleus','grey','cerebell','thalam']):key='brain'
            elif any(x in mat for x in ['bronch','trachea','lung']):key='airway'
            elif 'gland' in mat:key='gland'
            converted.append(materials[key])
        obj.data.materials.clear()
        for m in converted:obj.data.materials.append(m)
        for p in obj.data.polygons:p.material_index=min(p.material_index,len(converted)-1);p.use_smooth=True
        # Preserve small structures; reduce large surfaces, with more detail for the brain.
        limit=6000 if system=='nervous' else 2500
        if len(mesh.vertices)>limit:
            bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
            mod=obj.modifiers.new('Web simplification','DECIMATE');mod.ratio=max(.12,limit/len(mesh.vertices));bpy.ops.object.modifier_apply(modifier=mod.name)
        obj['entityId']=id;obj['system']=system;obj['region']='body';obj['nameEs']=es
        obj['source']='Z-Anatomy / BodyParts3D'
        objects.append(obj)
        entities.append({'id':id,'system':system,'name':es,'latin':latin,'english':english,'side':side,'region':'body',
            'division':'systemic','kind':'estructura','description':'','landmarks':[],'articulations':[],'sources':[name],
            'termId':term['id'] if term else None,'translated':bool(term and term['es'])})
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.hide_set(False);obj.hide_viewport=False;obj.hide_render=False;obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    target=root/f'public/models/{system}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_extras=True,
        export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_apply=True)
    print('EXPORTED SYSTEM',system,'structures',len(entities),'vertices',sum(len(o.data.vertices) for o in objects),'bytes',target.stat().st_size,flush=True)
    all_entities.extend(entities)
    for obj in objects:bpy.data.objects.remove(obj,do_unlink=True)

(root/'src/data/structures.json').write_text(json.dumps(all_entities,ensure_ascii=False,separators=(',',':'))+'\n')
print('STRUCTURE TOTAL',len(all_entities),'translated',sum(e['translated'] for e in all_entities),flush=True)
