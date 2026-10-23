# Backt den Figuren-Atlas für Stadt-Passanten aus Quaternius-Figuren (CC0).
# Aufruf (Blender 4.2, headless):
#   blender -b --python render/scripts/menschen/backen.py -- <quaternius-ordner> <ausgabe-ordner>
# <quaternius-ordner> enthält die entpackten Ordner
#   "Universal Base Characters[Standard]" und "Universal Animation Library[Standard]".
# Ausgabe: Einzelbilder je Pass (shade/maske) in <ausgabe-ordner>/frames, dazu frames.json.
# Packen zum Atlas: python3 render/scripts/menschen/packen.py
#
# Kamera wie im Spiel: orthografisch, 30° Elevation, Blick aus (+x,+z) (Spielkoordinaten).
# Richtung d (0..4): Blick der Figur zur Kamera = 0, je +45° Spiel-Gierwinkel; 5..7 spiegelt das Spiel.
import bpy, sys, os, json, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
Q = argv[0] if argv else '.'
AUS = argv[1] if len(argv) > 1 else './menschen-aus'
NUR = argv[2].split(',') if len(argv) > 2 else None   # optional: nur diese Körper (Probe)
UBC = os.path.join(Q, 'Universal Base Characters[Standard]')
UAL = os.path.join(Q, 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb')
HAAR = os.path.join(UBC, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)')
KOERPER_DATEI = {'w': 'Superhero_Female_FullBody.gltf', 'm': 'Superhero_Male_FullBody.gltf'}

FW, FH = 36, 64            # Bildgröße je Einzelbild (px)
ORTHO_H = 2.1              # sichtbare Höhe in Kameraebene (m) -> 30,5 px/m
FUSS_Y = 4                 # Fußpunkt: px über der Unterkante
RICHTUNGEN = 5

# Körper: Geschlecht, Haare, Maßstab, Kopf, Proportionen (Schulter, Arme, Hüfte)
KOERPER = [
    dict(id='frau_lang', g='w', haare=['Hair_Long'], s=1.0, kopf=1.0),
    dict(id='frau_dutt', g='w', haare=['Hair_Buns'], s=0.98, kopf=1.0),
    dict(id='mann_scheitel', g='m', haare=['Hair_SimpleParted'], s=1.0, kopf=1.0),
    dict(id='mann_kurz', g='m', haare=['Hair_Buzzed'], s=1.02, kopf=1.0),
    dict(id='mann_bart', g='m', haare=['Hair_Buzzed', 'Hair_Beard'], s=0.99, kopf=1.0, bauch=1.12),
    dict(id='kind_junge', g='m', haare=['Hair_SimpleParted'], s=0.66, kopf=1.28),
    dict(id='kind_maedchen', g='w', haare=['Hair_Long'], s=0.64, kopf=1.28),
]
# Animationen: Name, Bilder, Tasche
ANIMS = [
    dict(id='gehen', act='Walk_Loop', n=8, tasche=False),
    dict(id='gehen_tasche', act='Walk_Loop', n=8, tasche=True),
    dict(id='stehen', act='Idle_Loop', n=2, tasche=False),
    dict(id='reden', act='Idle_Talking_Loop', n=2, tasche=False),
]

# Regionen -> Kanäle. Pass A: (shade, oben, unten), Pass B: (haut, haar, schuhe). extra = alpha - Summe.
REG = {'oben': 0, 'unten': 1, 'haut': 2, 'haar': 3, 'schuhe': 4, 'extra': 5}

HAUT_KNOCHEN = ('Head', 'neck_01', 'hand_', 'index_', 'middle_', 'pinky_', 'ring_', 'thumb_')
FUSS_KNOCHEN = ('foot_', 'ball_')


def leeren():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def importiere(pfad):
    vor = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=pfad)
    return [o for o in bpy.data.objects if o not in vor]


def region_attribut(obj, art):
    """Eckenattribut 'reg' (Gleitkomma, Regionsnummer) je Fläche nach Mehrheitsregion der Ecken."""
    me = obj.data
    if art == 'haar':
        vreg = [REG['haar']] * len(me.vertices)
    else:
        gnamen = {g.index: g.name for g in obj.vertex_groups}
        hoehe = max(v.co.z for v in me.vertices) if False else None
        zs = [(obj.matrix_world @ v.co).z for v in me.vertices]
        H = max(zs)
        vreg = []
        for v, z in zip(me.vertices, zs):
            gew = {}
            for g in v.groups:
                gew[gnamen[g.group]] = gew.get(gnamen[g.group], 0) + g.weight
            haut = sum(w for n, w in gew.items() if n.startswith(HAUT_KNOCHEN))
            fuss = sum(w for n, w in gew.items() if n.startswith(FUSS_KNOCHEN))
            if haut > 0.5:
                vreg.append(REG['haut'])
            elif fuss > 0.45 or z < 0.075 * H:
                vreg.append(REG['schuhe'])
            elif z < 0.545 * H:
                vreg.append(REG['unten'])
            else:
                vreg.append(REG['oben'])
    attr = me.color_attributes.new('reg', 'FLOAT_COLOR', 'CORNER')
    for poly in me.polygons:
        zaehl = {}
        for vi in poly.vertices:
            zaehl[vreg[vi]] = zaehl.get(vreg[vi], 0) + 1
        r = max(zaehl.items(), key=lambda kv: kv[1])[0]
        for li in poly.loop_indices:
            attr.data[li].color = (r / 10.0, 0, 0, 1)


def material_bauen():
    """Ein Emissionsmaterial, das je nach Pass (Szenen-Eigenschaft 'pass' über Wertknoten) ausgibt."""
    m = bpy.data.materials.new('maske')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(em.outputs[0], out.inputs[0])
    attr = nt.nodes.new('ShaderNodeAttribute'); attr.attribute_name = 'reg'
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(attr.outputs['Color'], sep.inputs[0])
    reg10 = nt.nodes.new('ShaderNodeMath'); reg10.operation = 'MULTIPLY'; reg10.inputs[1].default_value = 10.0
    nt.links.new(sep.outputs[0], reg10.inputs[0])

    def ist(k):
        a = nt.nodes.new('ShaderNodeMath'); a.operation = 'COMPARE'
        a.inputs[1].default_value = float(k); a.inputs[2].default_value = 0.25
        nt.links.new(reg10.outputs[0], a.inputs[0])
        return a.outputs[0]
    # Schattierung: Halbkugel + Sonne (Richtung wie sonneAuf im Spiel, Blender-Koordinaten)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    L = Vector((-40.0, -90.0, 120.0)).normalized()
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = L
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    lam = nt.nodes.new('ShaderNodeMath'); lam.operation = 'MAXIMUM'; lam.inputs[1].default_value = 0.0
    nt.links.new(dot.outputs['Value'], lam.inputs[0])
    sepn = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Normal'], sepn.inputs[0])
    hemi = nt.nodes.new('ShaderNodeMath'); hemi.operation = 'MULTIPLY_ADD'   # 0.5*nz + 0.5
    hemi.inputs[1].default_value = 0.5; hemi.inputs[2].default_value = 0.5
    nt.links.new(sepn.outputs['Z'], hemi.inputs[0])
    hemiw = nt.nodes.new('ShaderNodeMath'); hemiw.operation = 'MULTIPLY_ADD'  # 0.62 + 0.38*hemi
    hemiw.inputs[1].default_value = 0.30; hemiw.inputs[2].default_value = 0.42
    nt.links.new(hemi.outputs[0], hemiw.inputs[0])
    shade = nt.nodes.new('ShaderNodeMath'); shade.operation = 'MULTIPLY_ADD'  # hemiw + 0.30*lam
    shade.inputs[1].default_value = 0.30
    nt.links.new(lam.outputs[0], shade.inputs[0]); nt.links.new(hemiw.outputs[0], shade.inputs[2])
    # Pass-Wahl: Wertknoten 'PASS' (0 = A, 1 = B)
    pw = nt.nodes.new('ShaderNodeValue'); pw.name = 'PASS'; pw.outputs[0].default_value = 0
    def mix(a, b):  # a wenn PASS=0, b wenn PASS=1
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'FLOAT'
        nt.links.new(pw.outputs[0], mx.inputs['Factor'])
        if isinstance(a, float): mx.inputs[2].default_value = a
        else: nt.links.new(a, mx.inputs[2])
        if isinstance(b, float): mx.inputs[3].default_value = b
        else: nt.links.new(b, mx.inputs[3])
        return mx.outputs[0]
    comb = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(mix(shade.outputs[0], ist(REG['haut'])), comb.inputs[0])
    nt.links.new(mix(ist(REG['oben']), ist(REG['haar'])), comb.inputs[1])
    nt.links.new(mix(ist(REG['unten']), ist(REG['schuhe'])), comb.inputs[2])
    nt.links.new(comb.outputs[0], em.inputs['Color'])
    return m


def szene_bauen():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.cycles.pixel_filter_type = 'BOX'
    sc.cycles.filter_width = 1.2
    sc.cycles.max_bounces = 0
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = FW, FH
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.display_settings.display_device = 'sRGB'
    sc.sequencer_colorspace_settings.name = 'sRGB'
    # Kamera: Ortho, Elevation 30°, Azimut aus (+x, -y) Blender = (+x, +z) Spiel
    cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'
    cam_d.ortho_scale = ORTHO_H * FH / FH if FH >= FW else ORTHO_H
    cam_d.sensor_fit = 'VERTICAL'
    cam_d.ortho_scale = ORTHO_H
    cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    el = math.radians(30)
    richtung = Vector((math.cos(el) * math.sqrt(0.5), -math.cos(el) * math.sqrt(0.5), math.sin(el)))
    # Fußpunkt (0,0,0) soll FUSS_Y px über der Unterkante liegen: Bildmitte liegt (FH/2 - FUSS_Y) px darüber.
    px = ORTHO_H / FH
    oben = Vector((-math.sin(el) * math.sqrt(0.5), math.sin(el) * math.sqrt(0.5), math.cos(el)))  # Kamera-Hochachse
    mitte = oben * ((FH / 2 - FUSS_Y) * px)
    cam.location = mitte + richtung * 50
    cam.rotation_euler = (richtung * -1).to_track_quat('-Z', 'Y').to_euler()
    cam_d.clip_start, cam_d.clip_end = 1, 100
    return sc


def koerper_laden(k, mat):
    neu = importiere(os.path.join(UBC, 'Base Characters', 'Godot - UE', KOERPER_DATEI[k['g']]))
    arm = [o for o in neu if o.type == 'ARMATURE'][0]
    for o in neu:
        if o.type == 'MESH' and (o.name.startswith('Icosphere') or o.name.startswith('Eye')):
            bpy.data.objects.remove(o, do_unlink=True)
    koerper = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm][0]
    region_attribut(koerper, 'koerper')
    koerper.data.materials.clear(); koerper.data.materials.append(mat)
    teile = [koerper]
    for h in k['haare']:
        hn = importiere(os.path.join(HAAR, h + '.gltf'))
        for o in hn:
            if o.type == 'MESH' and not o.name.startswith('Icosphere') and not o.name.startswith('Eye'):
                for mod in o.modifiers:
                    if mod.type == 'ARMATURE':
                        mod.object = arm
                mw = o.matrix_world.copy(); o.parent = arm; o.matrix_world = mw
                region_attribut(o, 'haar')
                o.data.materials.clear(); o.data.materials.append(mat)
                teile.append(o)
        for o in hn:
            if o.name in bpy.data.objects and (o.type == 'ARMATURE' or o.name.startswith(('Icosphere', 'Eye'))):
                bpy.data.objects.remove(o, do_unlink=True)
    # Tasche: Quader am rechten Handknochen
    bpy.ops.mesh.primitive_cube_add(size=1)
    tasche = bpy.context.active_object; tasche.name = 'tasche'
    tasche.scale = (0.11, 0.30, 0.34)   # breite Seite in Gehrichtung (Figur blickt nach -Y)
    bpy.ops.object.transform_apply(scale=True)
    for v in tasche.data.vertices:
        v.co.z -= 0.17 + 0.07           # Ursprung = Griff über der Tasche
    me = tasche.data
    attr = me.color_attributes.new('reg', 'FLOAT_COLOR', 'CORNER')
    for d in attr.data: d.color = (REG['extra'] / 10.0, 0, 0, 1)
    tasche.data.materials.append(mat)
    # Hängt senkrecht: dreht mit der Figur, Ort folgt der rechten Hand
    tasche.parent = arm
    c = tasche.constraints.new('COPY_LOCATION'); c.target = arm; c.subtarget = 'hand_r'; c.head_tail = 0.6
    teile.append(tasche)
    return arm, teile, tasche


def proportionen(arm, k):
    """Superhero -> Alltagsproportionen: schmalere Schultern/Brust, dünnere Arme, Kopf je Körper."""
    pb = arm.pose.bones
    for n in ('neck_01', 'clavicle_l', 'clavicle_r', 'thigh_l', 'thigh_r'):
        arm.data.bones[n].inherit_scale = 'NONE'
    for n in ('upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r', 'Head', 'calf_l', 'calf_r'):
        arm.data.bones[n].inherit_scale = 'NONE'
    breit = 0.84 if k['g'] == 'm' else 0.9
    bauch = k.get('bauch', 1.0)
    return {
        'spine_03': (breit, 1.0, 0.92 * bauch),
        'spine_02': (0.9 * bauch, 1.0, 0.95 * bauch),
        'spine_01': (0.95 * bauch, 1.0, 1.0 * bauch),
        'upperarm_l': (0.8, 1.0, 0.8), 'upperarm_r': (0.8, 1.0, 0.8),
        'lowerarm_l': (0.85, 1.0, 0.85), 'lowerarm_r': (0.85, 1.0, 0.85),
        'thigh_l': (0.9, 1.0, 0.9), 'thigh_r': (0.9, 1.0, 0.9),
        'calf_l': (0.92, 1.0, 0.92), 'calf_r': (0.92, 1.0, 0.92),
        'Head': (k['kopf'],) * 3,
        'neck_01': (0.9, 1.0, 0.9),
    }


def main():
    leeren()
    os.makedirs(os.path.join(AUS, 'frames'), exist_ok=True)
    importiere(UAL)
    aktionen = {a.name.split('_Armature')[0]: a for a in bpy.data.actions}
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    sc = szene_bauen()
    mat = material_bauen()
    pass_knoten = mat.node_tree.nodes['PASS']
    meta = {'fw': FW, 'fh': FH, 'orthoH': ORTHO_H, 'fussY': FUSS_Y, 'richtungen': RICHTUNGEN, 'koerper': [], 'anims': []}
    for k in KOERPER:
        if NUR and k['id'] not in NUR:
            continue
        arm, teile, tasche = koerper_laden(k, mat)
        skal = proportionen(arm, k)
        arm.scale = (k['s'],) * 3
        arm.rotation_mode = 'XYZ'
        if arm.animation_data is None:
            arm.animation_data_create()
        kmeta = {'id': k['id'], 'anims': {}}
        for an in ANIMS:
            act = aktionen[an['act']]
            arm.animation_data.action = act
            f0, f1 = act.frame_range
            lang = f1 - f0
            tasche.hide_render = not an['tasche']
            bilder = []
            for d in range(RICHTUNGEN):
                ry = -math.pi / 4 + d * math.pi / 4          # Spiel-Gierwinkel
                arm.rotation_euler = (0, 0, ry + math.pi / 2)
                for i in range(an['n']):
                    f = f0 + lang * i / an['n'] + (lang * 0.25 if an['id'] in ('stehen', 'reden') and i else 0)
                    sc.frame_set(int(math.floor(f)), subframe=f - math.floor(f))
                    for n, s in skal.items():
                        arm.pose.bones[n].scale = s
                    bpy.context.view_layer.update()
                    for p in (0, 1):
                        pass_knoten.outputs[0].default_value = p
                        name = f"{k['id']}_{an['id']}_{d}_{i}_{'ab'[p]}.png"
                        sc.render.filepath = os.path.join(AUS, 'frames', name)
                        bpy.ops.render.render(write_still=True)
                    bilder.append(f"{k['id']}_{an['id']}_{d}_{i}")
            kmeta['anims'][an['id']] = bilder
        meta['koerper'].append(kmeta)
        for o in teile + [arm]:
            if o.name in bpy.data.objects:
                bpy.data.objects.remove(o, do_unlink=True)
    meta['anims'] = [{'id': a['id'], 'n': a['n']} for a in ANIMS]
    with open(os.path.join(AUS, 'frames.json'), 'w') as fh:
        json.dump(meta, fh, indent=1)


main()
