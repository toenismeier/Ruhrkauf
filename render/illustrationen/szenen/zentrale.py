# Gruppe B: Zentrale und Steuerung (E47 P4). Motive im dict S, Namen wie in ILLUSTRATIONEN.md.
import os, json, hashlib, math
from werkzeug import *

# ---------------------------------------------------------------------------
# Eigener Baustein: schräge und gedrehte Teile. render.py kennt nur achsparallele
# Quader und Zylinder; Schrägen (Flipchart-Beine, Zeichentisch, Stempelgriff) baut
# netz() als GLB nach .assets/b-gen/ (Cache über den Inhalt) und gibt einen
# 'teile'-Eintrag zurück. Alle Koordinaten in Weltmaß wie q()/zyl().
#   K(x, y, z, b, t, h, farbe, rot=(rx, ry, rz), um=None)  Quader, Unterkante z, gedreht um um (Standard: Mitte unten)
#   Z(x, y, z, r, h, farbe, rot=(rx, ry, rz), ecken=32, um=None)  Zylinder entlang z, gedreht um um
#   P(punkte_xz, y0, y1, farbe)  Prisma: Vieleck in x/z, entlang y ausgezogen
# ---------------------------------------------------------------------------
GEN = '.assets/b-gen/'

def K(x, y, z, b, t, h, farbe, rot=(0, 0, 0), um=None, bild=None, seite='+z'):
    """Quader; mit bild trägt die Seite seite ('+z' oder '-y') das PNG (oben im Bild = +y bzw. +z)."""
    return {'k': [x, y, z, b, t, h], 'f': farbe, 'rot': list(rot), 'um': um, 'bild': bild, 'seite': seite}

def Z(x, y, z, r, h, farbe, rot=(0, 0, 0), ecken=32, um=None, r2=None):
    return {'z': [x, y, z, r, h], 'f': farbe, 'rot': list(rot), 'ecken': ecken, 'um': um, 'r2': r2}

def P(punkte, y0, y1, farbe, rot=(0, 0, 0), um=(0, 0, 0)):
    return {'p': [list(p) for p in punkte], 'y': [y0, y1], 'f': farbe, 'rot': list(rot), 'um': list(um)}

def gruppe(teile, x=0, y=0, grad=0, dx=0, dy=0, dz=0):
    """Dreht eine Teilegruppe um die senkrechte Achse durch (x, y) und verschiebt sie danach."""
    out = []
    for t in teile:
        t = dict(t); t['nach'] = list(t.get('nach', [])) + [[x, y, 0, grad, dx, dy, dz]]; out.append(t)
    return out

def netz(teile):
    roh = json.dumps(teile, sort_keys=True)
    for t in teile:
        if t.get('bild'): roh += hashlib.md5(open(t['bild'], 'rb').read()).hexdigest()
    pfad = GEN + hashlib.md5(roh.encode()).hexdigest()[:16] + '.glb'
    if not os.path.exists(pfad):
        os.makedirs(GEN, exist_ok=True); _baue(teile, pfad)
    return {'datei': pfad}

def _baue(teile, pfad):
    import bpy, bmesh
    from mathutils import Matrix, Vector, Euler
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); mats = []
    def mat_index(schluessel):
        if schluessel not in mats: mats.append(schluessel)
        return mats.index(schluessel)
    for t in teile:
        vorher = set(bm.faces); piv = Vector(t['um']) if t.get('um') else None
        if 'k' in t:
            x, y, z, b, tt, h = t['k']
            m = Matrix.Translation((x, y, z + h / 2)) @ Matrix.Diagonal((b, tt, h, 1))
            bmesh.ops.create_cube(bm, size=1, matrix=m)
            piv = piv or Vector((x, y, z))
        elif 'z' in t:
            x, y, z, r, h = t['z']
            m = Matrix.Translation((x, y, z + h / 2))
            bmesh.ops.create_cone(bm, cap_ends=True, segments=t['ecken'], radius1=r, radius2=t['r2'] if t['r2'] is not None else r, depth=h, matrix=m)
            piv = piv or Vector((x, y, z))
        else:
            y0, y1 = t['y']; vs0 = [bm.verts.new((px, y0, pz)) for px, pz in t['p']]; vs1 = [bm.verts.new((px, y1, pz)) for px, pz in t['p']]
            n = len(vs0); bm.faces.new(vs0); bm.faces.new(list(reversed(vs1)))
            for i in range(n):
                bm.faces.new([vs0[i], vs0[(i + 1) % n], vs1[(i + 1) % n], vs1[i]])
        neu = [f for f in bm.faces if f not in vorher]
        bmesh.ops.recalc_face_normals(bm, faces=neu)
        mi = mat_index(('f', t['f']))
        for f in neu: f.material_index = mi; f.smooth = False
        if t.get('bild'):
            x, y, z, b, tt, h = t['k']; mib = mat_index(('b', t['f'], t['bild']))
            for f in neu:
                nv = f.normal
                if (t['seite'] == '+z' and nv.z > 0.9) or (t['seite'] == '-y' and nv.y < -0.9):
                    f.material_index = mib
                    for lp in f.loops:
                        co = lp.vert.co
                        u = (co.x - (x - b / 2)) / b
                        v = (co.y - (y - tt / 2)) / tt if t['seite'] == '+z' else (co.z - z) / h
                        lp[uvl].uv = (u, v)
        rot = t.get('rot') or [0, 0, 0]
        if piv is not None and any(rot):
            R = Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4()
            M = Matrix.Translation(piv) @ R @ Matrix.Translation(-piv)
            vs = {v for f in neu for v in f.verts}
            bmesh.ops.transform(bm, matrix=M, verts=list(vs))
        for gx, gy, gz, gr, dx, dy, dz in t.get('nach', []):
            p = Vector((gx, gy, gz))
            M = Matrix.Translation(Vector((dx, dy, dz))) @ Matrix.Translation(p) @ Matrix.Rotation(math.radians(gr), 4, 'Z') @ Matrix.Translation(-p)
            bmesh.ops.transform(bm, matrix=M, verts=list({v for f in neu for v in f.verts}))
    me =bpy.data.meshes.new('b'); bm.to_mesh(me); bm.free()
    for s in mats:
        h = s[1]; mt = bpy.data.materials.new('b' + h.lstrip('#')); mt.use_nodes = True
        rgb = [((int(h.lstrip('#')[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)]
        bs = mt.node_tree.nodes['Principled BSDF']; bs.inputs['Base Color'].default_value = (*rgb, 1)
        if s[0] == 'b':
            tex = mt.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(os.path.abspath(s[2]))
            mt.node_tree.links.new(tex.outputs['Color'], bs.inputs['Base Color'])
        me.materials.append(mt)
    ob = bpy.data.objects.new('b', me); bpy.context.scene.collection.objects.link(ob)
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(pfad), export_format='GLB', use_selection=False, export_apply=True)

# ---------------------------------------------------------------------------
# Kleine Bausteine der Gruppe
# ---------------------------------------------------------------------------
FASSADE, FASSADE_KANTE = '#ece6dc', '#d6cfc3'
LEDER, LEDER_HELL, LEDER_DUNKEL, GRAPHIT = '#9a5532', '#b06a43', '#7d4428', '#3b3d40'
KORK, TAFEL, TAFEL_RAHMEN = '#c99b63', '#f7f7f5', '#b7bcc1'
BAUM, BAUM_DUNKEL, STAMM = '#6d8f5e', '#56774a', '#7a5a3c'

def hoch(teile, dz):
    """Teilegruppe anheben (z. B. auf ein Dach)."""
    return gruppe(teile, dz=dz)

def baum(x, y, s=1.0):
    return [Z(x, y, 0, 0.03 * s, 0.2 * s, STAMM, ecken=10), Z(x, y, 0.14 * s, 0.14 * s, 0.17 * s, BAUM, ecken=12, r2=0.1 * s),
            Z(x, y, 0.31 * s, 0.1 * s, 0.15 * s, BAUM_DUNKEL, ecken=12, r2=0.02 * s)]

def buerostuhl(x, y, grad, polster=LEDER):
    """Chefsessel mit Fünfstern; bei grad=0 blickt der Sitz nach −y (Lehne bei +y)."""
    t = [Z(x, y, 0.0, 0.03, 0.05, SCHWARZ, ecken=12)]
    for k in range(5):
        a = math.radians(k * 72 + 36)
        t += [K(x, y + 0.1, 0.03, 0.035, 0.2, 0.025, GRAPHIT, um=(x, y, 0), rot=(0, 0, k * 72 + 36)),
              Z(x - 0.19 * math.sin(a), y + 0.19 * math.cos(a), 0.0, 0.022, 0.03, SCHWARZ, ecken=10)]
    t += [Z(x, y, 0.05, 0.022, 0.2, METALL, ecken=12),
          K(x, y, 0.24, 0.34, 0.32, 0.07, polster), K(x, y - 0.01, 0.31, 0.28, 0.25, 0.012, LEDER_HELL),
          K(x, y + 0.17, 0.27, 0.32, 0.06, 0.40, polster, rot=(-10, 0, 0), um=(x, y + 0.17, 0.27)),
          K(x, y + 0.138, 0.33, 0.24, 0.008, 0.26, LEDER_HELL, rot=(-10, 0, 0), um=(x, y + 0.17, 0.27))]
    for sx in (-1, 1):
        t += [K(x + sx * 0.19, y + 0.02, 0.36, 0.045, 0.26, 0.035, GRAPHIT), K(x + sx * 0.19, y + 0.08, 0.29, 0.03, 0.03, 0.07, METALL_DUNKEL)]
    return gruppe(t, x, y, grad)

def flasche(x, y, z, deckel='#2f5d7c'):
    return [Z(x, y, z, 0.034, 0.15, GLAS, ecken=18), Z(x, y, z + 0.15, 0.034, 0.035, GLAS, ecken=18, r2=0.016),
            Z(x, y, z + 0.185, 0.018, 0.025, deckel, ecken=14), Z(x, y, z + 0.05, 0.0355, 0.05, WEISS, ecken=18)]

def wasserglas(x, y, z):
    return [Z(x, y, z, 0.028, 0.08, '#d6e8f2', ecken=16, r2=0.033), Z(x, y, z + 0.006, 0.025, 0.04, '#b4d3e8', ecken=16, r2=0.028)]

def tafelstaender(b, h, z0, farbe=TAFEL_RAHMEN, rollen=True):
    """Zwei Pfosten mit Fuß und Rollen links und rechts einer Tafel (Tafel selbst bei y≈0)."""
    t = []
    for sx in (-1, 1):
        x = sx * (b / 2 + 0.035)
        t += [K(x, 0, 0.06, 0.045, 0.045, z0 + h - 0.02, farbe), K(x, 0, 0.05, 0.06, 0.56, 0.04, farbe)]
        if rollen:
            for sy in (-1, 1): t += [Z(x, sy * 0.24, 0.0, 0.03, 0.05, SCHWARZ, ecken=14)]
    return t

S = {}

# zentrale: Bürohochhaus mit Hartwig-Schild ---------------------------------
def _hochhaus(x, y, b, t, etagen, eh=0.26):
    f = [K(x, y, 0, b - 0.06, t - 0.06, etagen * eh + 0.04, GLAS)]
    for i in range(etagen + 1):
        f.append(K(x, y, i * eh, b, t, 0.1, FASSADE))
    for k in range(1, 6):
        f.append(K(x - b / 2 + k * b / 6, y - t / 2 + 0.025, 0, 0.03, 0.05, etagen * eh, FASSADE_KANTE))
    for k in range(1, 5):
        f.append(K(x + b / 2 - 0.025, y - t / 2 + k * t / 5, 0, 0.05, 0.03, etagen * eh, FASSADE_KANTE))
    top = etagen * eh + 0.1
    f += [K(x, y, top - 0.004, b - 0.1, t - 0.1, 0.01, '#a7adb3'),
          K(x, y - t / 2 + 0.025, top, b, 0.05, 0.06, FASSADE), K(x, y + t / 2 - 0.025, top, b, 0.05, 0.06, FASSADE),
          K(x - b / 2 + 0.025, y, top, 0.05, t, 0.06, FASSADE), K(x + b / 2 - 0.025, y, top, 0.05, t, 0.06, FASSADE)]
    return f, top

def m_zentrale():
    tx, ty, tb, tt = -0.2, 0.2, 1.1, 0.95
    turm, top = _hochhaus(tx, ty, tb, tt, 7)
    ax, ay, ab, at = 0.68, -0.32, 0.9, 0.75
    anbau, atop = _hochhaus(ax, ay, ab, at, 4)
    f = turm + anbau
    f += [K(tx + 0.18, ty + 0.18, top, 0.42, 0.34, 0.2, '#c9ccd0'), K(tx + 0.18, ty + 0.18, top + 0.2, 0.36, 0.28, 0.02, '#aeb3b8'),
          Z(tx - 0.28, ty + 0.25, top, 0.07, 0.12, '#c9ccd0', ecken=18)]
    for sx in (-0.3, 0.3):
        f.append(K(tx + sx, ty - tt / 2 + 0.12, top, 0.04, 0.04, 0.08, METALL_DUNKEL))
    f += [K(tx, ty - tt / 2 + 0.09, top + 0.06, tb - 0.1, 0.05, 0.33, ROT_DUNKEL),
          K(tx, ty - tt / 2 + 0.06, top + 0.075, tb - 0.14, 0.012, 0.30, ROT, bild='flaechen/b-schild.png', seite='-y')]
    ex = tx - 0.2
    f += [K(ex, ty - tt / 2 - 0.01, 0.0, 0.36, 0.03, 0.34, '#2f4b5c'), K(ex, ty - tt / 2 - 0.02, 0.0, 0.012, 0.035, 0.34, METALL),
          K(ex, ty - tt / 2 - 0.13, 0.36, 0.5, 0.26, 0.035, METALL_DUNKEL), K(ex, ty - tt / 2 - 0.255, 0.355, 0.5, 0.012, 0.045, ROT)]
    for sx in (-0.22, 0.22):
        f.append(Z(ex + sx, ty - tt / 2 - 0.23, 0.0, 0.012, 0.36, METALL, ecken=10))
    f += [K(ax, ay - at / 2 - 0.007, atop - 0.36, 0.24, 0.012, 0.24, ROT, bild='flaechen/b-logo.png', seite='-y')]
    f += hoch(baum(ax - 0.2, ay + 0.1, 0.7) + baum(ax + 0.18, ay - 0.12, 0.6), atop)
    f += baum(-0.95, -0.42, 1.0) + baum(-0.66, -0.62, 0.8)
    return [netz(f)]
S['zentrale'] = {'groesse': 'symbol', 'teile': m_zentrale()}

# vorstand: Konferenztisch mit Stühlen und Wasserflaschen -------------------
def m_vorstand():
    f = [K(0, 0, 0.42, 2.0, 0.86, 0.05, HOLZ), K(0, 0, 0.40, 1.94, 0.80, 0.02, '#8e6440')]
    for sx in (-0.72, 0.72):
        f += [K(sx, 0, 0.0, 0.08, 0.56, 0.40, '#6e4a30'), K(sx, 0, 0.0, 0.14, 0.62, 0.03, '#5c3d27')]
    f += [K(0, 0, 0.28, 1.4, 0.05, 0.06, '#6e4a30')]
    f += [K(0, 0, 0.47, 0.2, 0.2, 0.025, GRAPHIT), Z(0, 0, 0.495, 0.05, 0.01, '#6b6e72', ecken=16)]
    for x in (-0.6, 0.0, 0.6):
        for sy in (-1, 1):
            y = sy * 0.25
            f += [K(x, y, 0.47, 0.17, 0.2, 0.008, PAPIER), K(x + 0.03, y, 0.478, 0.012, 0.16, 0.012, PETROL, rot=(0, 0, 18))]
            f += wasserglas(x + 0.14, y - sy * 0.04, 0.47)
        f += flasche(x - 0.16 + (0.32 if x == 0 else 0), 0.02, 0.47)
    for x in (-0.6, 0.0, 0.6):
        f += buerostuhl(x, 0.62, 0) + buerostuhl(x, -0.62, 180)
    f += buerostuhl(1.25, 0, -90) + buerostuhl(-1.25, 0, 90)
    return [netz(f)]
S['vorstand'] = {'groesse': 'symbol', 'teile': m_vorstand()}

# organisation: Pinnwand mit Organigramm-Karten -----------------------------
def karte_pin(cx, cz, w, h, streifen, y=-0.036, haut='#d9a982'):
    """Organigramm-Karte mit farbigem Kopf, Avatar, Textzeilen und Pinnnadel."""
    return [K(cx, y, cz, w, 0.01, h, WEISS), K(cx, y - 0.006, cz + h - 0.045, w, 0.003, 0.045, streifen),
            Z(cx - w / 2 + 0.06, y - 0.005, cz + h * 0.42, 0.034, 0.004, haut, rot=(90, 0, 0), ecken=18),
            K(cx + 0.04, y - 0.006, cz + h * 0.48, w * 0.45, 0.003, 0.018, '#7d858c'),
            K(cx + 0.02, y - 0.006, cz + h * 0.28, w * 0.38, 0.003, 0.014, '#aab1b7'),
            Z(cx, y - 0.005, cz + h - 0.022, 0.016, 0.03, ROT, rot=(90, 0, 0), ecken=14)]

def m_organisation():
    b, h, z0 = 1.6, 1.05, 0.5
    f = tafelstaender(b, h, z0, farbe=METALL, rollen=False)
    f += [K(0, 0, z0, b + 0.04, 0.06, h, '#7d5a3a'), K(0, -0.031, z0 + 0.045, b - 0.05, 0.004, h - 0.09, KORK)]
    for k in range(40):  # Korkkörnung
        x = -b / 2 + 0.06 + ((k * 0.37) % 1) * (b - 0.12); z = z0 + 0.07 + ((k * 0.61) % 1) * (h - 0.14)
        f += [K(x, -0.0335, z, 0.012, 0.002, 0.012, '#b38652')]
    def linie(x0, z0_, x1, z1):
        return K((x0 + x1) / 2, -0.035, min(z0_, z1), max(abs(x1 - x0), 0.014), 0.004, max(abs(z1 - z0_), 0.014), GRAPHIT)
    o = z0
    f += karte_pin(0, o + 0.74, 0.40, 0.22, ROT)
    f += [linie(0, o + 0.66, 0, o + 0.74), linie(-0.52, o + 0.66, 0.52, o + 0.66)]
    for x in (-0.52, 0, 0.52):
        f += [linie(x, o + 0.6, x, o + 0.66)] + karte_pin(x, o + 0.40, 0.36, 0.2, PETROL)
    for x0, kinder in ((-0.52, (-0.66, -0.38)), (0.52, (0.38, 0.66))):
        f += [linie(x0, o + 0.33, x0, o + 0.40), linie(kinder[0], o + 0.33, kinder[1], o + 0.33)]
        for x in kinder:
            f += [linie(x, o + 0.29, x, o + 0.33)] + karte_pin(x, o + 0.10, 0.24, 0.19, '#c98a4b')
    f += [linie(0, o + 0.31, 0, o + 0.40)] + karte_pin(0, o + 0.10, 0.24, 0.19, '#c98a4b')
    # Ablage mit Nadeldose am Rahmen
    f += [K(0.5, -0.07, z0, 0.4, 0.1, 0.03, '#7d5a3a'), K(0.5, -0.115, z0, 0.4, 0.01, 0.05, '#7d5a3a'),
          Z(0.6, -0.07, z0 + 0.03, 0.035, 0.04, GLAS, ecken=16), Z(0.42, -0.07, z0 + 0.03, 0.03, 0.04, '#e9e4da', ecken=16)]
    return [netz(f)]
S['organisation'] = {'groesse': 'symbol', 'teile': m_organisation()}

# reporting: Ordner und Monitor mit Balkendiagramm --------------------------
def ordner(x, y, z, farbe, h=0.42, t=0.32):
    return [K(x, y, z, 0.09, t, h, farbe), K(x, y - t / 2 - 0.002, z + h * 0.52, 0.064, 0.004, h * 0.34, WEISS),
            K(x, y - t / 2 - 0.004, z + h * 0.62, 0.044, 0.003, 0.012, '#9aa3aa'), K(x, y - t / 2 - 0.004, z + h * 0.7, 0.044, 0.003, 0.012, '#9aa3aa'),
            Z(x, y - t / 2 + 0.001, z + h * 0.24, 0.024, 0.006, '#22262a', rot=(90, 0, 0), ecken=16),
            K(x, y - t / 2 - 0.002, z + 0.0, 0.092, 0.006, 0.03, METALL)]

def m_reporting():
    f = []
    zt = 0.0
    mx = 0.18
    f += [K(mx, 0.16, zt, 0.32, 0.2, 0.02, GRAPHIT), K(mx, 0.2, zt + 0.02, 0.07, 0.04, 0.24, GRAPHIT),
          K(mx, 0.15, zt + 0.16, 1.0, 0.05, 0.64, SCHWARZ), K(mx, 0.124, zt + 0.185, 0.95, 0.004, 0.59, WEISS, bild='flaechen/b-balken.png', seite='-y'),
          K(mx + 0.42, 0.124, zt + 0.17, 0.02, 0.003, 0.008, '#7fd3e6')]
    f += [K(mx - 0.05, -0.2, zt, 0.58, 0.18, 0.022, '#d8dce0')]
    for r in range(4):
        f += [K(mx - 0.05, -0.27 + r * 0.04, zt + 0.022, 0.52, 0.026, 0.008, '#b7bdc3')]
    f += [K(mx + 0.38, -0.2, zt, 0.07, 0.11, 0.025, '#d8dce0'), K(mx + 0.38, -0.23, zt + 0.025, 0.004, 0.04, 0.004, '#b7bdc3')]
    for k, farbe in enumerate((PETROL, '#2f5d7c', ROT, '#5a6f7d')):
        f += ordner(-0.66 + k * 0.1, 0.12, zt, farbe)
    f += [K(-0.4, -0.26, zt, 0.42, 0.3, 0.008, WEISS, rot=(0, 0, 14)), K(-0.4, -0.26, zt + 0.008, 0.4, 0.28, 0.004, WEISS, bild='flaechen/b-balken.png', rot=(0, 0, 14))]
    return [netz(f)]
S['reporting'] = {'groesse': 'symbol', 'teile': m_reporting()}

# finanzen: Geldzählmaschine mit Banknoten ----------------------------------
SCHEIN, SCHEIN_D = '#7fa3c8', '#5e84ab'

def notenbuendel(x, y, z, b=0.52, t=0.27, h=0.08, grad=0, band=True):
    f = [K(x, y, z, b, t, h, SCHEIN), K(x, y, z + h, b, t, 0.004, WEISS, bild='flaechen/b-schein.png')]
    for k in range(3):
        f += [K(x, y, z + 0.012 + k * 0.022, b + 0.004, t + 0.004, 0.004, SCHEIN_D)]
    if band:
        f += [K(x, y, z - 0.002, 0.09, t + 0.012, h + 0.01, '#f1e3c6')]
    return gruppe(f, x, y, grad)

def m_finanzen():
    hell, mittel, dunkel = '#eef0f2', '#d5d9de', '#2d3a46'
    f = []
    for sx in (-0.42, 0.42):
        for sy in (-0.32, 0.32): f += [Z(sx, sy, 0, 0.04, 0.04, SCHWARZ, ecken=14)]
    f += [K(0, 0, 0.04, 1.0, 0.8, 0.32, mittel), K(0, -0.06, 0.04, 1.02, 0.66, 0.31, hell)]
    f += [Z(-0.49, 0.12, 0.34, 0.28, 0.98, hell, rot=(0, 90, 0), um=(-0.49, 0.12, 0.34), ecken=24),
          Z(0.49, 0.12, 0.34, 0.24, 0.012, mittel, rot=(0, 90, 0), um=(0.49, 0.12, 0.34), ecken=24)]
    # Einzug oben mit Scheinen
    f += [K(0, 0.2, 0.55, 0.72, 0.16, 0.12, dunkel)]
    for k in range(4):
        f += [K(0, 0.22 + k * 0.02, 0.6, 0.62, 0.012, 0.24, SCHEIN if k % 2 else SCHEIN_D, rot=(-22, 0, 0))]
    f += [K(sx, 0.24, 0.6, 0.03, 0.2, 0.22, mittel, rot=(-22, 0, 0)) for sx in (-0.36, 0.36)]
    # Bedienfeld schräg vorn
    f += [K(0, -0.3, 0.33, 0.9, 0.3, 0.05, dunkel, bild='flaechen/b-zaehler.png', rot=(24, 0, 0))]
    # Ausgabe vorn mit Bündel
    f += [K(0, -0.4, 0.08, 0.74, 0.03, 0.18, dunkel), K(0, -0.5, 0.07, 0.74, 0.22, 0.02, mittel)]
    f += notenbuendel(0, -0.5, 0.09, b=0.5, t=0.24, h=0.07, band=False)
    f += [K(-0.46, -0.5, 0.07, 0.03, 0.22, 0.12, mittel), K(0.46, -0.5, 0.07, 0.03, 0.22, 0.12, mittel)]
    # Bündel daneben
    f += notenbuendel(0.82, -0.18, 0, grad=-14) + notenbuendel(0.84, -0.2, 0.084, grad=-4)
    return [netz(f)]
S['finanzen'] = {'groesse': 'symbol', 'teile': m_finanzen()}

# planung: Planungstafel mit Magnetkarten -----------------------------------
def m_planung():
    b, h, z0 = 1.6, 1.0, 0.55
    f = tafelstaender(b, h, z0)
    f += [K(0, 0, z0 - 0.03, b + 0.06, 0.05, h + 0.06, TAFEL_RAHMEN), K(0, -0.026, z0, b, 0.004, h, WEISS, bild='flaechen/b-planung.png', seite='-y')]
    def spalte(px): return -b / 2 + px / 1200 * b
    def zeile(k): return z0 + h - (110 + 86 + 172 * k) / 800 * h
    balken = [(0, 160, 540, ROT), (0, 600, 900, ROT), (1, 300, 820, PETROL), (2, 160, 420, '#6d8f5e'), (2, 470, 1120, '#6d8f5e'), (3, 360, 760, '#c98a4b'), (3, 820, 1000, '#c98a4b')]
    for k, a, e, farbe in balken:
        x0, x1 = spalte(a + 10), spalte(e - 10)
        f += [K((x0 + x1) / 2, -0.034, zeile(k) - 0.05, x1 - x0, 0.012, 0.1, farbe), Z(x0 + 0.04, -0.04, zeile(k), 0.018, 0.012, '#2e3033', rot=(90, 0, 0), ecken=14)]
    f += [K(0, -0.07, z0 - 0.05, 0.9, 0.1, 0.025, TAFEL_RAHMEN), K(0, -0.115, z0 - 0.05, 0.9, 0.01, 0.045, TAFEL_RAHMEN)]
    for k, farbe in enumerate((ROT, PETROL, SCHWARZ)):
        f += [Z(-0.3 + k * 0.12, -0.07, z0 - 0.007, 0.014, 0.12, farbe, rot=(0, 90, 0), um=(-0.3 + k * 0.12, -0.07, z0 - 0.007), ecken=12)]
    f += [K(0.25, -0.07, z0 - 0.025, 0.14, 0.06, 0.04, '#2f5d7c'), K(0.25, -0.07, z0 - 0.005, 0.14, 0.06, 0.02, '#d8dce0')]
    return [netz(f)]
S['planung'] = {'groesse': 'symbol', 'teile': m_planung()}

# forecast: Flipchart mit Linie ---------------------------------------------
def stab(p0, p1, d, farbe, rund=False):
    """Stange von p0 nach p1 (Quader oder Zylinder mit Dicke d)."""
    dx, dy, dz = (p1[i] - p0[i] for i in range(3)); l = math.sqrt(dx * dx + dy * dy + dz * dz)
    a = math.degrees(math.asin(-dy / l)); b = math.degrees(math.atan2(dx, dz))
    if rund: return Z(p0[0], p0[1], p0[2], d / 2, l, farbe, rot=(a, b, 0), um=tuple(p0), ecken=12)
    return K(p0[0], p0[1], p0[2], d, d, l, farbe, rot=(a, b, 0), um=tuple(p0))

def kipp_x(p, piv, grad):
    """Punkt p um die x-Achse durch piv drehen (wie K/Z mit rot=(grad, 0, 0))."""
    c, s = math.cos(math.radians(grad)), math.sin(math.radians(grad))
    dy, dz = p[1] - piv[1], p[2] - piv[2]
    return (p[0], piv[1] + dy * c - dz * s, piv[2] + dy * s + dz * c)

def m_forecast():
    z0, kipp = 0.62, (-9, 0, 0)
    piv = (0, 0, z0)
    f = [stab((-0.5, -0.02, 0), (-0.46, 0.2, 1.6), 0.05, METALL_DUNKEL), stab((0.5, -0.02, 0), (0.46, 0.2, 1.6), 0.05, METALL_DUNKEL),
         stab((0, 0.72, 0), (0, 0.2, 1.5), 0.045, METALL_DUNKEL)]
    for sx in (-0.5, 0.5): f += [Z(sx, -0.02, 0, 0.035, 0.03, SCHWARZ, ecken=12)]
    f += [Z(0, 0.72, 0, 0.035, 0.03, SCHWARZ, ecken=12)]
    f += [K(0, 0, z0, 0.84, 0.04, 1.02, '#c9ced3', rot=kipp, um=piv),
          K(0, -0.024, z0 + 0.03, 0.76, 0.008, 0.94, WEISS, bild='flaechen/b-flipchart.png', seite='-y', rot=kipp, um=piv)]
    for k in range(3):
        f += [K(0, -0.03 - k * 0.004, z0 + 0.93 - k * 0.012, 0.76, 0.004, 0.06 + k * 0.012, '#f4f2ec', rot=kipp, um=piv)]
    f += [K(0, -0.02, z0 + 0.96, 0.9, 0.08, 0.07, GRAPHIT, rot=kipp, um=piv)]
    for sx in (-0.3, 0.3):
        p = kipp_x((sx, -0.06, z0 + 0.995), piv, kipp[0])
        f += [Z(*p, 0.02, 0.012, METALL, rot=(90 + kipp[0], 0, 0), ecken=12)]
    f += [K(0, -0.06, z0 - 0.05, 1.0, 0.14, 0.03, GRAPHIT), K(0, -0.125, z0 - 0.05, 1.0, 0.01, 0.06, GRAPHIT)]
    for k, farbe in enumerate((ROT, PETROL, SCHWARZ)):
        x = -0.22 + k * 0.13
        f += [Z(x, -0.09, z0 - 0.002, 0.016, 0.13, farbe, rot=(0, 90, 0), um=(x, -0.09, z0 - 0.002), ecken=12),
              Z(x + 0.13, -0.09, z0 - 0.002, 0.012, 0.03, '#eef0f2', rot=(0, 90, 0), um=(x + 0.13, -0.09, z0 - 0.002), ecken=12)]
    return [netz(f)]
S['forecast'] = {'groesse': 'symbol', 'teile': m_forecast()}

# boni: Geschenkbox mit Schleife und Umschlag --------------------------------
def _ellipse(cx, cz, rx, rz, neig, n=20):
    c, s = math.cos(math.radians(neig)), math.sin(math.radians(neig))
    return [(cx + rx * math.cos(2 * math.pi * i / n) * c - rz * math.sin(2 * math.pi * i / n) * s,
             cz + rx * math.cos(2 * math.pi * i / n) * s + rz * math.sin(2 * math.pi * i / n) * c) for i in range(n)]

def schlaufe(s):
    """Eine Schleifenschlaufe (Vieleck in x/z) mit dunklem Innenloch; s = −1 links, +1 rechts."""
    return [P(_ellipse(s * 0.17, 0.09, 0.18, 0.085, s * 24), -0.035, 0.035, ROT),
            P(_ellipse(s * 0.19, 0.1, 0.09, 0.035, s * 24), -0.045, 0.045, ROT_DUNKEL)]

def m_boni():
    karton, deckel = '#f1ece2', '#f8f5ef'
    b = 0.86
    f = [K(0, 0, 0, b, b, 0.58, karton), K(0, 0, 0.54, b + 0.06, b + 0.06, 0.14, deckel)]
    for sx, sy, w, t in ((0, -1, 0.13, 0.014), (1, 0, 0.014, 0.13)):
        f += [K(sx * (b / 2 + 0.002), sy * (b / 2 + 0.002), 0, w if sy else 0.014, t if sx else 0.014, 0.54, ROT),
              K(sx * (b / 2 + 0.032), sy * (b / 2 + 0.032), 0.54, w if sy else 0.014, t if sx else 0.014, 0.14, ROT)]
    f += [K(0, 0, 0.68, 0.13, b + 0.07, 0.008, ROT), K(0, 0, 0.68, b + 0.07, 0.13, 0.008, ROT)]
    zs = 0.688
    for s in (-1, 1):
        f += gruppe(schlaufe(s), 0, 0, 45, dz=zs)
    f += [Z(0, 0, zs - 0.01, 0.075, 0.13, ROT, rot=(90, 0, 45), um=(0, 0, zs + 0.06), ecken=16)]
    for gr in (18, 72):
        f += [K(0, -0.17, zs, 0.085, 0.34, 0.01, ROT, rot=(0, 0, gr), um=(0, 0, zs))]
    # Umschlag lehnt vorn an der Box
    f += [K(-0.1, -0.555, 0, 0.62, 0.02, 0.42, '#efebe2', rot=(-17, 0, 0), um=(-0.1, -0.555, 0)),
          K(-0.1, -0.567, 0.01, 0.6, 0.004, 0.4, WEISS, bild='flaechen/b-umschlag.png', seite='-y', rot=(-17, 0, 0), um=(-0.1, -0.555, 0))]
    return [netz(f)]
S['boni'] = {'groesse': 'symbol', 'teile': m_boni()}

# freigaben: Stempel auf Bestellschein ---------------------------------------
def m_freigaben():
    f = [K(0.0, 0.0, 0, 1.08, 1.46, 0.006, WEISS, rot=(0, 0, 8)), K(0.0, 0.0, 0.006, 1.06, 1.44, 0.004, WEISS, bild='flaechen/b-bestellschein.png', rot=(0, 0, 8))]
    f += [K(-0.1, 0.12, -0.004, 1.08, 1.46, 0.006, '#e4e0d6', rot=(0, 0, -4))]
    # Stempel steht auf dem Schein neben dem Abdruck
    sx, sy, s = -0.32, -0.12, 1.55
    stempel = [K(0, 0, 0.01, 0.42, 0.26, 0.04, '#2e3033'), K(0, 0, 0.05, 0.44, 0.28, 0.1, HOLZ), K(0, 0, 0.15, 0.36, 0.2, 0.03, '#a07148'),
               Z(0, 0, 0.18, 0.05, 0.22, HOLZ_ROT, ecken=20), Z(0, 0, 0.38, 0.07, 0.04, HOLZ_ROT, ecken=20, r2=0.11),
               Z(0, 0, 0.42, 0.11, 0.1, HOLZ_ROT, ecken=24), Z(0, 0, 0.52, 0.11, 0.05, HOLZ_ROT, ecken=24, r2=0.06),
               K(0, -0.141, 0.08, 0.2, 0.004, 0.05, WEISS), K(0, -0.144, 0.095, 0.12, 0.002, 0.02, ROT)]
    f += [skaliert(t, s, (sx, sy, 0)) for t in stempel]
    # Stempelkissen
    px, py = 0.5, 0.56
    f += [K(px, py, 0.01, 0.5, 0.34, 0.06, '#2f5d7c'), K(px, py, 0.07, 0.44, 0.28, 0.005, ROT_DUNKEL),
          K(px, py + 0.22, 0.01, 0.5, 0.06, 0.32, '#2f5d7c', rot=(-28, 0, 0), um=(px, py + 0.17, 0.07))]
    return [netz(f)]

def skaliert(t, s, ziel):
    """Teil, das um den Ursprung gebaut ist, mit Faktor s an ziel setzen (nur K und Z ohne um)."""
    t = dict(t)
    if 'k' in t:
        x, y, z, b, tt, h = t['k']; t['k'] = [ziel[0] + x * s, ziel[1] + y * s, ziel[2] + z * s, b * s, tt * s, h * s]
    else:
        x, y, z, r, h = t['z']; t['z'] = [ziel[0] + x * s, ziel[1] + y * s, ziel[2] + z * s, r * s, h * s]
        if t.get('r2') is not None: t['r2'] = t['r2'] * s
    return t
S['freigaben'] = {'groesse': 'symbol', 'teile': m_freigaben()}

# saison: Kollektionstafel mit Stoffmustern ---------------------------------
def stoff(x, z, farbe, muster, y=-0.035):
    t = [K(x, y, z, 0.2, 0.01, 0.2, farbe)]
    if muster == 'streifen':
        for k in range(3): t += [K(x, y - 0.006, z + 0.04 + k * 0.06, 0.2, 0.002, 0.018, '#eae6dc')]
    if muster == 'karo':
        for k in range(2):
            t += [K(x, y - 0.006, z + 0.06 + k * 0.08, 0.2, 0.002, 0.016, '#2b2b2d'), K(x - 0.04 + k * 0.08, y - 0.007, z, 0.016, 0.002, 0.2, '#2b2b2d')]
    if muster == 'punkte':
        for i in range(3):
            for j in range(3): t += [K(x - 0.06 + i * 0.06, y - 0.006, z + 0.04 + j * 0.06, 0.02, 0.002, 0.02, '#f4f1ea')]
    t += [K(x, y - 0.002, z - 0.07, 0.16, 0.006, 0.05, WEISS), K(x - 0.02, y - 0.006, z - 0.05, 0.1, 0.002, 0.01, '#9aa3aa'),
          K(x, y - 0.006, z + 0.17, 0.06, 0.004, 0.035, METALL)]
    return t

def m_saison():
    kipp, z0 = -10, 0.55
    piv = (0, 0, z0)
    holz, holz_d = '#b98a5c', '#8e6440'
    f = [stab((-0.46, 0.06, 0), (-0.14, 0.36, 1.86), 0.06, holz), stab((0.46, 0.06, 0), (0.14, 0.36, 1.86), 0.06, holz),
         stab((0, 0.95, 0), (0, 0.4, 1.78), 0.055, holz_d), K(0, 0.3, 1.45, 0.4, 0.04, 0.05, holz)]
    f += [K(0, -0.1, z0 - 0.06, 1.15, 0.16, 0.05, holz), K(0, -0.17, z0 - 0.06, 1.15, 0.02, 0.09, holz)]
    for sx in (-0.36, 0.36): f += [K(sx, 0.03, z0 - 0.06, 0.04, 0.2, 0.04, holz_d)]
    tafel = [K(0, 0, z0, 1.06, 0.05, 1.16, '#2b2b2d'), K(0, -0.026, z0 + 0.96, 1.0, 0.004, 0.18, '#2b2b2d', bild='flaechen/b-kollektion.png', seite='-y')]
    farben = [('#d23c32', 'karo'), ('#2f5d7c', 'streifen'), ('#c98a4b', None), ('#6d8f5e', 'punkte'), ('#e9e4da', 'streifen'), ('#9a6fa8', None),
              ('#d8a7a0', 'punkte'), ('#5a6f7d', 'karo'), ('#b98a5c', None)]
    for k, (farbe, muster) in enumerate(farben):
        tafel += stoff(-0.32 + (k % 3) * 0.32, z0 + 0.66 - (k // 3) * 0.3, farbe, muster)
    for t in tafel:
        t['rot'] = [kipp, 0, 0]; t['um'] = list(piv)
    f += tafel
    # Stoffballen am Fuß
    for (y, z, farbe) in ((-0.1, 0.08, '#2f5d7c'), (0.07, 0.08, '#e9e4da'), (-0.015, 0.225, '#d8a7a0')):
        f += [Z(0.58, y, z, 0.08, 0.56, farbe, rot=(0, 90, 0), um=(0.58, y, z), ecken=24),
              Z(1.14, y, z, 0.03, 0.02, '#eae6dc', rot=(0, 90, 0), um=(1.14, y, z), ecken=14)]
    return [netz(f)]
S['saison'] = {'groesse': 'symbol', 'teile': m_saison()}

# allokation: Lieferwagen mit Hartwig-Aufschrift -----------------------------
def m_allokation():
    weiss, grau = '#f2f3f4', '#d5d9dd'
    f = [K(-0.2, 0, 0.12, 2.3, 0.86, 0.12, GRAPHIT)]
    for wx in (-0.85, 0.62):
        for wy, zug in ((-0.32, 1), (0.47, 1)):
            f += [Z(wx, wy, 0.2, 0.2, 0.15, '#26282b', rot=(90, 0, 0), um=(wx, wy, 0.2), ecken=28)]
        f += [Z(wx, -0.47, 0.2, 0.11, 0.012, METALL, rot=(90, 0, 0), um=(wx, -0.47, 0.2), ecken=24),
              Z(wx, -0.482, 0.2, 0.035, 0.008, METALL_DUNKEL, rot=(90, 0, 0), um=(wx, -0.482, 0.2), ecken=16)]
    # Koffer
    f += [K(-0.4, 0, 0.22, 1.6, 0.9, 1.08, weiss), K(-0.4, 0, 1.3, 1.62, 0.92, 0.03, grau)]
    f += [K(-0.4, -0.452, 0.58, 1.3, 0.006, 0.39, ROT, bild='flaechen/b-schild.png', seite='-y'), K(-0.4, -0.452, 0.27, 1.6, 0.006, 0.06, ROT)]
    # Fahrerhaus als Profil
    kab = [(0.4, 0.22), (1.05, 0.22), (1.07, 0.62), (1.02, 0.74), (0.84, 1.12), (0.4, 1.16)]
    f += [P(kab, -0.44, 0.44, weiss)]
    n = (0.93, 0.37)
    a, b = (1.005, 0.76), (0.85, 1.10)
    f += [P([a, b, (b[0] + n[0] * 0.012, b[1] + n[1] * 0.012), (a[0] + n[0] * 0.012, a[1] + n[1] * 0.012)], -0.4, 0.4, '#5d8fb0')]
    f += [P([(0.5, 0.8), (0.94, 0.8), (0.82, 1.08), (0.5, 1.08)], -0.446, -0.438, '#5d8fb0')]
    f += [K(0.66, -0.443, 0.24, 0.006, 0.006, 0.54, grau), K(0.82, -0.447, 0.66, 0.08, 0.008, 0.025, METALL_DUNKEL)]
    f += [K(0.95, -0.5, 0.82, 0.04, 0.1, 0.14, GRAPHIT), K(0.95, -0.46, 0.88, 0.02, 0.06, 0.02, GRAPHIT)]
    # Front
    f += [K(1.08, 0, 0.14, 0.08, 0.9, 0.14, GRAPHIT), K(1.07, 0, 0.3, 0.03, 0.46, 0.12, GRAPHIT),
          K(1.085, 0, 0.17, 0.01, 0.28, 0.07, WEISS)]
    for k in range(3): f += [K(1.087, 0, 0.32 + k * 0.035, 0.004, 0.42, 0.012, '#4a4d52')]
    for sy in (-0.32, 0.32):
        f += [K(1.07, sy, 0.44, 0.03, 0.16, 0.09, '#f6e7a8')]
    f += [K(1.08, 0, 0.43, 0.14, 0.012, 0.14, ROT, bild='flaechen/b-logo.png', seite='-y', rot=(0, 0, 90), um=(1.08, 0, 0.43))]
    f += [K(-1.2, 0, 0.22, 0.012, 0.86, 1.06, grau), K(-1.2, 0, 0.22, 0.016, 0.01, 1.06, METALL_DUNKEL)]
    return [netz(f)]
S['allokation'] = {'groesse': 'symbol', 'teile': m_allokation()}

# reduzierung: Preisschild mit rotem −30 % ----------------------------------
def m_reduzierung():
    f = [Z(0, 0.05, 0, 0.3, 0.035, METALL_DUNKEL, ecken=36), Z(0, 0.05, 0.035, 0.27, 0.012, METALL, ecken=36),
         Z(0, 0.05, 0.04, 0.022, 1.36, METALL, ecken=16), K(0, 0.05, 1.36, 0.1, 0.06, 0.08, GRAPHIT), Z(0, 0.05, 1.44, 0.03, 0.03, GRAPHIT, ecken=16)]
    zo = 1.2
    f += [K(0, -0.02, zo - 1.06, 0.72, 0.014, 1.06, '#e8e9eb'), K(0, -0.03, zo - 1.05, 0.7, 0.004, 1.04, WEISS, bild='flaechen/b-preis.png', seite='-y')]
    loch = zo - 0.01 - 1.04 * 100 / 900
    for dx in (-0.012, 0.012):
        f += [stab((dx, -0.036, loch), (dx * 0.3, -0.0, 1.37), 0.02, ROT_DUNKEL, rund=True)]
    # zweites, kleineres Schild dahinter, schräg gedreht
    t2 = [K(0, 0.0, 0.62, 0.48, 0.012, 0.72, '#e8e9eb'), K(0, -0.008, 0.627, 0.47, 0.004, 0.706, WEISS, bild='flaechen/b-preis.png', seite='-y')]
    f += gruppe(t2, 0, 0, 28, dx=0.36, dy=0.24)
    f += [stab((0.36, 0.236, 1.33), (0.03, 0.05, 1.38), 0.02, ROT_DUNKEL, rund=True)]
    return [netz(f)]
S['reduzierung'] = {'groesse': 'symbol', 'teile': m_reduzierung()}

# marken: Kleidersack mit Markenetikett -------------------------------------
def kleiderbuegel(x, y, z, breite=0.36, farbe=HOLZ, hals=0.15):
    """Holzbügel; der Haken greift von oben (Scheitel bei z) über eine Stange in x-Richtung."""
    za = z - hals
    return [stab((x, y, za), (x - breite, y, za - 0.11), 0.035, farbe), stab((x, y, za), (x + breite, y, za - 0.11), 0.035, farbe),
            Z(x, y, za - 0.01, 0.012, hals - 0.02, METALL, ecken=10),
            stab((x, y, z - 0.03), (x, y - 0.035, z - 0.003), 0.022, METALL, rund=True), stab((x, y - 0.035, z - 0.003), (x, y + 0.01, z + 0.012), 0.022, METALL, rund=True),
            stab((x, y + 0.01, z + 0.012), (x, y + 0.04, z - 0.02), 0.022, METALL, rund=True)]

def m_marken():
    sack, kante = '#66788a', '#4f5f70'
    f = [Z(-0.66, 0.05, 0, 0.26, 0.035, METALL_DUNKEL, ecken=36), Z(-0.66, 0.05, 0.035, 0.024, 1.86, METALL, ecken=16),
         K(-0.28, 0.05, 1.86, 0.8, 0.04, 0.04, METALL), Z(0.12, 0.05, 1.85, 0.028, 0.06, METALL_DUNKEL, ecken=12)]
    f += kleiderbuegel(0.0, 0.05, 1.905, 0.29, hals=0.26)
    schulter = [(0.42, 1.44), (0.405, 1.53), (0.36, 1.6), (0.08, 1.75), (0.035, 1.765)]
    sil = [(-0.34, 0.14), (0.34, 0.14), (0.4, 0.8)] + schulter + [(-x, z) for x, z in reversed(schulter)] + [(-0.4, 0.8)]
    f += [P(sil, -0.02, 0.12, sack), P([(px * 1.012, pz + (0.004 if pz > 1 else -0.004)) for px, pz in sil], -0.03, -0.02, kante)]
    f += [P([(px * 0.97, pz + (-0.01 if pz > 1 else 0.01)) for px, pz in sil], -0.036, -0.026, sack)]
    for x0, z0, z1 in ((-0.22, 0.25, 0.7), (0.24, 0.3, 0.62), (-0.18, 0.86, 1.05)):  # Falten
        f += [K(x0, -0.039, z0, 0.012, 0.004, z1 - z0, kante)]
    f += [K(0.0, -0.04, 0.2, 0.022, 0.006, 0.86, METALL), K(0.0, -0.045, 1.0, 0.05, 0.008, 0.08, METALL_DUNKEL), Z(0.0, -0.046, 0.98, 0.016, 0.01, METALL, rot=(90, 0, 0), ecken=12)]
    f += [K(0, -0.041, 1.13, 0.5, 0.006, 0.25, '#2b2b2d', bild='flaechen/b-etikett.png', seite='-y')]
    return [netz(f)]
S['marken'] = {'groesse': 'symbol', 'teile': m_marken()}

# produkte: Bügel mit Hemd und Schnittmuster --------------------------------
def hemd(x, y, z, farbe='#b9d3ea', dunkel='#93b4d1', s=1.0):
    """Hemd von vorn (Fläche in x/z), Saum bei z, Kragen oben; s skaliert."""
    def p(pts): return [(x + px * s, z + pz * s) for px, pz in pts]
    sil = [(-0.12, 0.86), (-0.32, 0.8), (-0.46, 0.5), (-0.36, 0.46), (-0.28, 0.62), (-0.28, 0.0), (0.28, 0.0), (0.28, 0.62), (0.36, 0.46), (0.46, 0.5), (0.32, 0.8), (0.12, 0.86)]
    t = [P(p(sil), y - 0.03, y + 0.03, farbe)]
    t += [P(p([(-0.13, 0.87), (0, 0.74), (-0.02, 0.9)]), y - 0.04, y - 0.03, WEISS), P(p([(0.13, 0.87), (0.02, 0.9), (0, 0.74)]), y - 0.04, y - 0.03, WEISS)]
    t += [K(x, y - 0.034, z + 0.02 * s, 0.012, 0.004, 0.72 * s, dunkel), K(x + 0.15 * s, y - 0.036, z + 0.48 * s, 0.12 * s, 0.004, 0.13 * s, dunkel)]
    for k in range(5): t += [Z(x - 0.03 * s, y - 0.034, z + (0.1 + k * 0.14) * s, 0.013, 0.006, WEISS, rot=(90, 0, 0), ecken=10)]
    t += [P(p([(-0.46, 0.5), (-0.36, 0.46), (-0.38, 0.42), (-0.47, 0.46)]), y - 0.031, y + 0.031, WEISS)]
    t += [P(p([(0.46, 0.5), (0.47, 0.46), (0.38, 0.42), (0.36, 0.46)]), y - 0.031, y + 0.031, WEISS)]
    return t

def schere(x, y, z, grad):
    t = [K(x, y + 0.1, z, 0.03, 0.22, 0.01, METALL, rot=(0, 0, 8), um=(x, y, z)), K(x, y + 0.1, z + 0.01, 0.03, 0.22, 0.01, METALL, rot=(0, 0, -8), um=(x, y, z)),
         Z(x - 0.04, y - 0.06, z, 0.045, 0.018, ROT, ecken=16), Z(x + 0.04, y - 0.06, z, 0.045, 0.018, ROT, ecken=16),
         Z(x - 0.04, y - 0.06, z, 0.025, 0.02, '#f4f1ea', ecken=16), Z(x + 0.04, y - 0.06, z, 0.025, 0.02, '#f4f1ea', ecken=16)]
    return gruppe(t, x, y, grad)

def m_produkte():
    zt = 0.46
    f = [K(0.25, 0, zt, 1.24, 0.86, 0.05, HOLZ_HELL)]
    for sx in (-0.32, 0.82):
        for sy in (-0.38, 0.38): f += [K(sx, sy, 0, 0.05, 0.05, zt, HOLZ)]
    f += [K(0.25, 0, 0.1, 1.14, 0.76, 0.03, HOLZ)]
    f += [K(0.3, 0.0, zt + 0.05, 0.86, 0.66, 0.004, '#efe6cf', bild='flaechen/b-schnitt.png', rot=(0, 0, -8))]
    f += schere(0.66, -0.3, zt + 0.054, 35)
    f += [Z(-0.18, -0.24, zt + 0.05, 0.08, 0.05, '#f2c14e', ecken=24), Z(-0.18, -0.24, zt + 0.1, 0.03, 0.005, '#c99a2e', ecken=16),
          K(-0.08, -0.3, zt + 0.05, 0.2, 0.03, 0.003, '#f2c14e', rot=(0, 0, -12))]
    # Ständer mit Bügel und Hemd
    f += [Z(-0.9, 0.2, 0, 0.24, 0.035, METALL_DUNKEL, ecken=36), Z(-0.9, 0.2, 0.035, 0.022, 1.98, METALL, ecken=16),
          K(-0.64, 0.2, 1.98, 0.54, 0.04, 0.04, METALL), Z(-0.37, 0.2, 1.97, 0.028, 0.06, METALL_DUNKEL, ecken=12)]
    f += kleiderbuegel(-0.52, 0.2, 2.025, 0.36, hals=0.2)
    f += hemd(-0.52, 0.2, 0.7, s=1.25)
    return [netz(f)]
S['produkte'] = {'groesse': 'symbol', 'teile': m_produkte()}

# neu: Zeichentisch mit Skizze und Stoffrollen ------------------------------
def m_neu():
    kipp, piv = 24, (0, -0.4, 0.82)
    gestell = '#5a5d61'
    f = []
    for sx in (-0.56, 0.56):
        f += [K(sx, -0.34, 0, 0.05, 0.05, 0.82, gestell), K(sx, 0.3, 0, 0.05, 0.05, 1.08, gestell), K(sx, -0.02, 0, 0.07, 0.8, 0.04, gestell),
              K(sx, -0.02, 0.4, 0.04, 0.64, 0.04, gestell)]
    f += [K(0, 0.3, 0.4, 1.12, 0.04, 0.04, gestell)]
    platte = [K(0, 0, 0.82, 1.3, 0.8, 0.04, HOLZ_HELL), K(0, -0.395, 0.82, 1.3, 0.03, 0.08, HOLZ),
              K(-0.05, 0.02, 0.86, 0.88, 0.62, 0.004, WEISS, bild='flaechen/b-skizze.png'),
              K(0, -0.28, 0.864, 1.24, 0.07, 0.012, PETROL), K(0.48, 0.0, 0.864, 0.06, 0.6, 0.01, '#d9dde1'),
              K(0.3, -0.12, 0.864, 0.02, 0.2, 0.02, '#f2c14e'), K(0.3, -0.225, 0.864, 0.02, 0.02, 0.02, SCHWARZ)]
    for t in platte: t['rot'] = [kipp, 0, 0]; t['um'] = list(piv)
    f += platte
    # Korb mit Stoffrollen
    bx, by = 0.98, -0.16
    for k, (farbe, dx, dy, rx, ry) in enumerate((('#2f5d7c', -0.08, 0.07, -7, -9), ('#d8a7a0', 0.09, 0.07, -5, 10), ('#e9e4da', -0.06, -0.09, 8, -4), ('#c98a4b', 0.09, -0.08, 7, 11))):
        hh = 0.9 - k * 0.08
        piv = (bx + dx, by + dy, 0.05)
        f += [Z(*piv, 0.075, hh, farbe, rot=(rx, ry, 0), ecken=22),
              Z(piv[0], piv[1], piv[2] + hh, 0.06, 0.006, '#f4f1ea', rot=(rx, ry, 0), um=piv, ecken=20),
              Z(piv[0], piv[1], piv[2] + hh, 0.022, 0.01, '#8a6a48', rot=(rx, ry, 0), um=piv, ecken=14)]
    f += [Z(bx, by, 0, 0.22, 0.34, '#a07148', ecken=28, r2=0.245), Z(bx, by, 0.34, 0.25, 0.035, '#8a5a3a', ecken=28)]
    for k in range(3): f += [Z(bx, by, 0.08 + k * 0.09, 0.234 + k * 0.0066, 0.014, '#8a5a3a', ecken=28)]
    return [netz(f)]
S['neu'] = {'groesse': 'symbol', 'teile': m_neu()}

# systeme: Serverschrank -----------------------------------------------------
def m_systeme():
    korpus, rahmen, einschub = '#565b62', '#6d7279', '#d5d9dd'
    b, t, h = 0.86, 0.86, 1.62
    f = []
    for sx in (-1, 1):
        for sy in (-1, 1): f += [Z(sx * 0.34, sy * 0.34, 0, 0.035, 0.05, SCHWARZ, ecken=14)]
    f += [K(0, 0, 0.05, b, t, h, korpus), K(0, 0, 0.05 + h, b + 0.02, t + 0.02, 0.05, rahmen)]
    f += [K(-b / 2 + 0.04, -t / 2 - 0.005, 0.05, 0.08, 0.01, h, rahmen), K(b / 2 - 0.04, -t / 2 - 0.005, 0.05, 0.08, 0.01, h, rahmen)]
    for k in range(5):
        f += [K(-0.2 + k * 0.1, -t / 2 + 0.2, 0.05 + h + 0.05, 0.06, 0.3, 0.008, '#2a2b2e')]
    z = 0.12
    for k, uh in enumerate((0.12, 0.08, 0.08, 0.2, 0.08, 0.12, 0.08, 0.16, 0.08, 0.12, 0.09)):
        if k == 10:  # Patchfeld mit Kabeln
            f += [K(0, -t / 2 - 0.004, z, b - 0.18, 0.012, uh - 0.015, '#2a2b2e')]
            for i in range(12):
                f += [K(-0.28 + i * 0.05, -t / 2 - 0.012, z + 0.03, 0.026, 0.004, 0.022, '#6b6e72')]
            for i, c in enumerate(('#2f5d7c', '#c98a4b', '#7fd3e6', ROT, '#2f5d7c', '#f2c14e')):
                x = -0.26 + i * 0.1
                f += [stab((x, -t / 2 - 0.015, z + 0.04), (x + 0.02, -t / 2 - 0.05, z - 0.06), 0.014, c, rund=True)]
            z += uh + 0.025
            continue
        f += [K(0, -t / 2 - 0.004, z, b - 0.18, 0.012, uh - 0.015, einschub)]
        if uh >= 0.12:
            for i in range(6): f += [K(-0.24 + i * 0.075, -t / 2 - 0.012, z + 0.02, 0.055, 0.004, uh - 0.055, '#9aa3aa')]
        else:
            f += [K(-0.08, -t / 2 - 0.012, z + 0.02, 0.36, 0.004, uh - 0.055, '#2a2b2e')]
        for i, c in enumerate(('#7fd3e6', '#7fd3e6' if k % 3 else '#f2c14e', ROT if k == 3 else '#7fd3e6')):
            f += [K(0.22 + i * 0.045, -t / 2 - 0.013, z + uh * 0.45, 0.022, 0.004, 0.022, c)]
        z += uh + 0.025
    for k in range(8):
        f += [K(b / 2 + 0.003, 0, 0.3 + k * 0.05, 0.004, 0.42, 0.018, '#2a2b2e'), K(b / 2 + 0.003, 0, 1.08 + k * 0.05, 0.004, 0.42, 0.018, '#2a2b2e')]
    return [netz(f)]
S['systeme'] = {'groesse': 'symbol', 'teile': m_systeme()}

# projekte: Kanbantafel ------------------------------------------------------
def m_projekte():
    b, h, z0 = 1.1, 1.34, 0.42
    rahmen = '#d5d9dd'
    f = tafelstaender(b, h, z0, farbe=rahmen)
    f += [K(0, 0, z0 - 0.03, b + 0.06, 0.05, h + 0.06, rahmen), K(0, -0.026, z0, b, 0.004, h, WEISS, bild='flaechen/b-kanban.png', seite='-y')]
    gelb, blau, rosa, gruen = '#f2d36b', '#9dc2dc', '#e8a59c', '#a8c69a'
    zettel = {0: [gelb, gelb, blau, rosa, gelb, blau, gelb, rosa], 1: [blau, gelb, gruen, rosa], 2: [gruen, gelb, gruen]}
    for sp, farben in zettel.items():
        for k, farbe in enumerate(farben):
            cx = -b / 2 + (sp + 0.5) * b / 3 + (-0.085 if k % 2 == 0 else 0.085)
            cz = z0 + h - 0.33 - (k // 2) * 0.22
            dreh = (-5, 4, 3, -6, 6, -3, -4, 5)[k % 8]
            zt = [K(cx, -0.033, cz, 0.155, 0.008, 0.155, farbe), K(cx, -0.038, cz + 0.1, 0.1, 0.002, 0.016, '#6b6e72'), K(cx - 0.015, -0.038, cz + 0.065, 0.08, 0.002, 0.014, '#8d9399')]
            for t in zt: t['rot'] = [0, dreh, 0]; t['um'] = [cx, -0.033, cz + 0.08]
            f += zt
            if (sp + k) % 3 == 0: f += [Z(cx + 0.045, -0.038, cz + 0.02, 0.022, 0.01, '#d9a982', rot=(90, 0, 0), ecken=16)]
    f += [K(0, -0.07, z0 - 0.05, 0.8, 0.1, 0.025, rahmen), K(0, -0.115, z0 - 0.05, 0.8, 0.01, 0.045, rahmen)]
    f += [K(-0.18, -0.07, z0 - 0.025, 0.18, 0.08, 0.06, gelb), K(-0.18, -0.07, z0 + 0.035, 0.18, 0.08, 0.003, '#e8c24f')]
    f += [Z(0.08, -0.07, z0 - 0.007, 0.014, 0.12, SCHWARZ, rot=(0, 90, 0), um=(0.08, -0.07, z0 - 0.007), ecken=12)]
    return [netz(f)]
S['projekte'] = {'groesse': 'symbol', 'teile': m_projekte()}

# it: Kassen-PC mit Scanner --------------------------------------------------
def m_it():
    f = [K(0, 0, 0, 1.56, 0.8, 0.24, '#55595f'), K(0, -0.405, 0.03, 1.42, 0.012, 0.18, '#686c72'),
         K(0, -0.414, 0.17, 0.4, 0.006, 0.025, '#2a2b2e'), Z(0.56, -0.412, 0.1, 0.022, 0.008, METALL, rot=(90, 0, 0), ecken=14)]
    kipp, piv = -16, (0, -0.02, 0.48)
    f += [K(0, 0.08, 0.24, 0.42, 0.34, 0.03, '#2e3033'), stab((0, 0.12, 0.27), (0, 0.06, 0.5), 0.07, '#2e3033')]
    schirm = [K(0, 0.0, 0.42, 0.86, 0.06, 0.6, '#2e3033'), K(0, -0.031, 0.445, 0.81, 0.004, 0.55, WEISS, bild='flaechen/b-kasse.png', seite='-y')]
    for t in schirm: t['rot'] = [kipp, 0, 0]; t['um'] = list(piv)
    f += schirm
    # Bondrucker
    f += [K(0.56, 0.1, 0.24, 0.34, 0.4, 0.22, '#3b3d40'), K(0.56, 0.02, 0.46, 0.3, 0.14, 0.01, '#2a2b2e'),
          K(0.56, -0.02, 0.45, 0.22, 0.012, 0.16, WEISS, rot=(-25, 0, 0), um=(0.56, -0.02, 0.45)), K(0.56, -0.082, 0.585, 0.22, 0.012, 0.06, WEISS, rot=(-60, 0, 0), um=(0.56, -0.087, 0.586))]
    # Handscanner in Halter
    sx, sy = -0.6, -0.14
    f += [K(sx, sy, 0.24, 0.18, 0.22, 0.03, '#2e3033'), K(sx, sy + 0.08, 0.27, 0.12, 0.06, 0.12, '#2e3033')]
    f += [stab((sx, sy - 0.02, 0.27), (sx, sy + 0.06, 0.52), 0.07, '#3b3d40'),
          K(sx, sy - 0.06, 0.5, 0.1, 0.26, 0.11, '#3b3d40', rot=(10, 0, 0), um=(sx, sy + 0.06, 0.5)),
          K(sx, sy - 0.195, 0.515, 0.09, 0.012, 0.085, ROT, rot=(10, 0, 0), um=(sx, sy - 0.19, 0.515)),
          K(sx, sy - 0.02, 0.45, 0.025, 0.04, 0.06, ROT_DUNKEL)]
    f += [stab((sx, sy + 0.12, 0.3), (sx + 0.12, sy + 0.25, 0.25), 0.02, SCHWARZ, rund=True), stab((sx + 0.12, sy + 0.25, 0.25), (sx + 0.4, sy + 0.32, 0.25), 0.02, SCHWARZ, rund=True)]
    return [netz(f)]
S['it'] = {'groesse': 'symbol', 'teile': m_it()}

