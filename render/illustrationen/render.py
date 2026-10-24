# Iso-Renderer (E47 P4): lädt GLB-Teile in eine Szene, rendert orthografisch in der festen Spielkamera.
import bpy, math, sys, json, mathutils
args = json.loads(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for teil in args.get('teile', []):
    vorher = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=teil['datei'])
    neu = [o for o in bpy.data.objects if o not in vorher]
    farben = teil.get('farben', {})
    for o in neu:
        if o.type == 'MESH':
            for slot in o.material_slots:
                if not slot.material: continue
                m = slot.material.copy(); slot.material = m
                basis = slot.material.name.split('.')[0]
                if basis in farben or '*' in farben:
                    h = farben.get(basis, farben.get('*')).lstrip('#')
                    rgb = [((int(h[i:i+2], 16) / 255) ** 2.2) for i in (0, 2, 4)]
                    bc = m.node_tree.nodes['Principled BSDF'].inputs['Base Color']
                    for l in list(bc.links): m.node_tree.links.remove(l)
                    bc.default_value = (*rgb, 1)
                    m.diffuse_color = (*rgb, 1)
    for o in neu:
        if o.parent is None:
            o.location = mathutils.Vector(teil.get('pos', [0, 0, 0]))
            o.rotation_euler[2] += math.radians(teil.get('dreh', 0))
            s = teil.get('skala', 1); o.scale = (o.scale[0]*s, o.scale[1]*s, o.scale[2]*s)
def mat_farbe(h, emission=False, bild=None):
    m = bpy.data.materials.new('m'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    rgb = [((int(h.lstrip('#')[i:i+2], 16) / 255) ** 2.2) for i in (0, 2, 4)]
    bs.inputs['Base Color'].default_value = (*rgb, 1); m.diffuse_color = (*rgb, 1)
    if bild:
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(bild)
        nt.links.new(tex.outputs['Color'], bs.inputs['Base Color'])
        tex.interpolation = 'Closest' if False else 'Linear'
    elif emission:
        bs.inputs['Emission Color'].default_value = (*rgb, 1); bs.inputs['Emission Strength'].default_value = 0.6
    return m
# Eigene Grundformen: Quader {'quader': [x,y,z, b,t,h], 'farbe': '#hex', 'bild': pfad, 'dreh': grad}
for q in args.get('formen', []):
    if 'zylinder' in q:
        x, y, z, r, hh = q['zylinder']; achse = q.get('achse', 'z')
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=hh, vertices=q.get('ecken', 40), location=(x, y, z))
        o = bpy.context.active_object
        if achse == 'y': o.rotation_euler[0] = math.radians(90)
        if achse == 'x': o.rotation_euler[1] = math.radians(90)
        if achse == 'z': o.location.z = z + hh / 2
        o.data.materials.append(mat_farbe(q.get('farbe', '#888888')))
        continue
    x, y, z, bb, tt, hh = q['quader']
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z + hh / 2))
    o = bpy.context.active_object; o.scale = (bb, tt, hh); o.rotation_euler[2] = math.radians(q.get('dreh', 0))
    if q.get('bild'):
        bpy.ops.object.transform_apply(scale=True); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.uv.cube_project(cube_size=1, scale_to_bounds=True); bpy.ops.object.mode_set(mode='OBJECT')
    o.data.materials.append(mat_farbe(q.get('farbe', '#888888'), q.get('leuchtet', False), q.get('bild')))
    if q.get('fase'):
        mod = o.modifiers.new('fase', 'BEVEL'); mod.width = q['fase']; mod.segments = 3
for o in bpy.data.objects:
    if o.type == 'MESH' and args.get('fase_alle', 0.012) and not any(m.type == 'BEVEL' for m in o.modifiers):
        mod = o.modifiers.new('kante', 'BEVEL'); mod.width = args.get('fase_alle', 0.012); mod.segments = 2; mod.limit_method = 'ANGLE'; mod.use_clamp_overlap = True
bpy.context.view_layer.update()
# Rahmen über alle Netze
pts = [o.matrix_world @ mathutils.Vector(c) for o in bpy.data.objects if o.type == 'MESH' for c in o.bound_box]
mn = mathutils.Vector([min(p[i] for p in pts) for i in range(3)]); mx = mathutils.Vector([max(p[i] for p in pts) for i in range(3)])
mitte = (mn + mx) / 2; gr = (mx - mn).length
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = gr * args.get('rand', 1.05)
el, az = math.radians(args.get('neigung', 30)), math.radians(args.get('dreh', 45))
d = mathutils.Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
cam.location = mitte + d * gr * 3
cam.rotation_euler = (mitte - cam.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.view_layer.update()
# Bildausschnitt eng auf die projizierten Ecken legen (Kameraraum)
inv = cam.matrix_world.inverted(); cp = [inv @ p for p in pts]
x0, x1 = min(p.x for p in cp), max(p.x for p in cp); y0, y1 = min(p.y for p in cp), max(p.y for p in cp)
cam.location = cam.matrix_world @ mathutils.Vector(((x0 + x1) / 2, (y0 + y1) / 2, 0))
cam.data.ortho_scale = max(x1 - x0, y1 - y0) * args.get('rand', 1.08)
# Licht: Sonne von links oben, weiche Umgebung (wie die Stadt)
sun = bpy.data.objects.new('sonne', bpy.data.lights.new('sonne', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = args.get('sonne', 3.2); sun.data.angle = math.radians(8)
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes['Background'].inputs[1].default_value = args.get('umgebung', 0.9)
sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = args.get('look', 'None') if args.get('look') else 'None'
stil = args.get('stil', 'eevee')
if stil == 'flach':
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'
    sh.show_shadows = True; sh.shadow_intensity = 0.25; sh.show_cavity = True; sh.cavity_type = 'BOTH'
    sh.curvature_ridge_factor = 1.2; sh.curvature_valley_factor = 1.0; sh.show_object_outline = args.get('kontur', False)
    sc.display.light_direction = (-0.55, -0.35, 0.75)
def illustriert(m):
    # Feste Flächentöne wie eine Vektorillustration: Helligkeit nur aus der Flächenrichtung (Licht von links oben).
    nt = m.node_tree; bs = nt.nodes.get('Principled BSDF')
    if not bs: return
    farbe_quelle = bs.inputs['Base Color'].links[0].from_socket if bs.inputs['Base Color'].links else None
    rgb = nt.nodes.new('ShaderNodeRGB'); rgb.outputs[0].default_value = bs.inputs['Base Color'].default_value
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    L = mathutils.Vector(args.get('licht', (-0.45, -0.25, 0.86))).normalized(); dot.inputs[1].default_value = L
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -0.2; mr.inputs['From Max'].default_value = 1.0
    mr.inputs['To Min'].default_value = args.get('dunkel', 0.60); mr.inputs['To Max'].default_value = args.get('hell', 1.05)
    nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    nt.links.new(farbe_quelle if farbe_quelle else rgb.outputs[0], mul.inputs['A'])
    nt.links.new(mr.outputs['Result'], mul.inputs['B'])
    # Kontaktschatten (AO) dunkelt Ecken und Fugen ab, wie gezeichnete Schlagschatten
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = args.get('ao_weite', 0.12); ao.samples = 16
    aomr = nt.nodes.new('ShaderNodeMapRange'); aomr.inputs['To Min'].default_value = args.get('ao_min', 0.72); aomr.inputs['To Max'].default_value = 1.0
    nt.links.new(ao.outputs['AO'], aomr.inputs['Value'])
    mul2 = nt.nodes.new('ShaderNodeMix'); mul2.data_type = 'RGBA'; mul2.blend_type = 'MULTIPLY'; mul2.inputs['Factor'].default_value = 1.0
    nt.links.new(mul.outputs['Result'], mul2.inputs['A']); nt.links.new(aomr.outputs['Result'], mul2.inputs['B'])
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(mul2.outputs['Result'], em.inputs['Color'])
    out = nt.nodes.get('Material Output'); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
for m in bpy.data.materials:
    if stil == 'illustriert' and m.use_nodes: illustriert(m); continue
    if m.use_nodes:
        b = m.node_tree.nodes.get('Principled BSDF')
        if b:
            b.inputs['Roughness'].default_value = 0.85
            if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = 0.15
sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = args.get('px', 1024)
try: sc.eevee.taa_render_samples = 32
except Exception: pass
if stil == 'illustriert' and args.get('cycles', False):
    sc.render.engine = 'CYCLES'; sc.cycles.samples = args.get('samples', 48); sc.cycles.use_denoising = True
    sc.cycles.device = 'CPU'; sc.render.threads_mode = 'AUTO'
sc.render.filepath = args['aus']
bpy.ops.render.render(write_still=True)
