# Gruppe C (E47 P4): Marketing, Online und Menü.
# Für schräge Flächen, Drehkörper und Zahnräder reichen q()/zyl() nicht; deshalb baut diese Datei eigene Netze
# und schreibt sie beim Laden als GLB nach .assets/c-netze/ (nicht im Repo, wird bei jedem Bauen neu erzeugt).
import os, math, json, struct, hashlib
from werkzeug import *

HIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NETZE = '.assets/c-netze'
FL = 'flaechen/'


# ---------- Netzbausteine (Blender-Koordinaten: z oben, Vorderseite -y) ----------
def _mat(rx, ry, rz):
    a, b, c = (math.radians(v) for v in (rx, ry, rz))
    X = [[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]]
    Y = [[math.cos(b), 0, math.sin(b)], [0, 1, 0], [-math.sin(b), 0, math.cos(b)]]
    Z = [[math.cos(c), -math.sin(c), 0], [math.sin(c), math.cos(c), 0], [0, 0, 1]]
    mm = lambda A, B: [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    return mm(Z, mm(Y, X))


class T:
    """Ein Teil: Punkte, Flächen (Indexlisten, gegen den Uhrzeigersinn von außen), Farbe oder Bild."""
    def __init__(s, v, f, farbe='#888888', uv=None, bild=None):
        s.v = [list(map(float, p)) for p in v]; s.f = f; s.farbe = farbe; s.uv = uv; s.bild = bild

    def dreh(s, rx=0, ry=0, rz=0, um=(0, 0, 0)):
        M = _mat(rx, ry, rz)
        s.v = [[sum(M[i][k] * (p[k] - um[k]) for k in range(3)) + um[i] for i in range(3)] for p in s.v]
        return s

    def schieb(s, x=0, y=0, z=0):
        s.v = [[p[0] + x, p[1] + y, p[2] + z] for p in s.v]; return s

    def skal(s, a=1, b=None, c=None):
        b = a if b is None else b; c = a if c is None else c
        s.v = [[p[0] * a, p[1] * b, p[2] * c] for p in s.v]; return s


def kasten(x, y, z, b, t, h, farbe, rx=0, ry=0, rz=0, um=None):
    """Quader wie q(): Mitte x/y, Unterkante z; Drehung um 'um' (Standard: Mitte der Unterkante)."""
    X, Y = b / 2, t / 2
    v = [(-X, -Y, 0), (X, -Y, 0), (X, Y, 0), (-X, Y, 0), (-X, -Y, h), (X, -Y, h), (X, Y, h), (-X, Y, h)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    t_ = T(v, f, farbe).schieb(x, y, z)
    if rx or ry or rz: t_.dreh(rx, ry, rz, um or (x, y, z))
    return t_


def drehkoerper(profil, farbe, n=32, achse='z', winkel=360, start=0):
    """Drehkörper um die lokale z-Achse aus Profil [(r, z), …]; r = 0 schließt mit einer Spitze."""
    v, f, ringe = [], [], []
    voll = winkel >= 360
    m = n if voll else n + 1
    for r, z in profil:
        if r == 0:
            ringe.append([len(v)]); v.append((0, 0, z)); continue
        ring = []
        for k in range(m):
            w = math.radians(start + winkel * k / n)
            ring.append(len(v)); v.append((r * math.cos(w), r * math.sin(w), z))
        ringe.append(ring)
    for a, b in zip(ringe, ringe[1:]):
        if len(a) == 1 and len(b) == 1: continue
        if len(a) == 1:
            for k in range(m - (0 if voll else 1)): f.append((a[0], b[k], b[(k + 1) % m]))
        elif len(b) == 1:
            for k in range(m - (0 if voll else 1)): f.append((a[k], b[0], a[(k + 1) % m]))
        else:
            for k in range(m - (0 if voll else 1)): f.append((a[k], b[k], b[(k + 1) % m], a[(k + 1) % m]))
    # offene Enden mit r > 0 schließen
    if len(ringe[0]) > 1 and voll: f.append(tuple(ringe[0]))
    if len(ringe[-1]) > 1 and voll: f.append(tuple(reversed(ringe[-1])))
    # Ausrichtung: Profil läuft von unten nach oben, Außenseite muss nach außen zeigen
    f = [tuple(reversed(x)) for x in f]
    t_ = T(v, f, farbe)
    if achse == 'y': t_.dreh(rx=-90)
    if achse == 'x': t_.dreh(ry=90)
    return t_


def walze(x, y, z, r, h, farbe, achse='z', n=32):
    """Zylinder wie zyl(): achse z steht auf z, sonst mittig auf x/y/z."""
    if achse == 'z': return drehkoerper([(0, 0), (r, 0), (r, h), (0, h)], farbe, n).schieb(x, y, z)
    t_ = drehkoerper([(0, -h / 2), (r, -h / 2), (r, h / 2), (0, h / 2)], farbe, n, achse)
    return t_.schieb(x, y, z)


def stab(p1, p2, r, farbe, n=16):
    """Zylinder zwischen zwei Punkten."""
    d = [p2[i] - p1[i] for i in range(3)]; L = math.sqrt(sum(c * c for c in d))
    t_ = drehkoerper([(0, 0), (r, 0), (r, L), (0, L)], farbe, n)
    ux, uy, uz = (c / L for c in d)
    ry = math.degrees(math.acos(max(-1, min(1, uz)))); rz = math.degrees(math.atan2(uy, ux))
    return t_.dreh(ry=ry).dreh(rz=rz).schieb(*p1)


def ring(R, r, farbe, n=40, m=12, w0=0, w1=360):
    """Torus (oder Torusbogen von w0 bis w1 Grad) in der xy-Ebene."""
    v, f = [], []
    voll = w1 - w0 >= 360
    ni = n if voll else n + 1
    for i in range(ni):
        a = math.radians(w0 + (w1 - w0) * i / n)
        for j in range(m):
            b = 2 * math.pi * j / m
            v.append(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
    for i in range(n):
        i2 = (i + 1) % ni
        for j in range(m):
            a, b_ = i * m + j, i2 * m + j
            c, d = i2 * m + (j + 1) % m, i * m + (j + 1) % m
            f.append((a, b_, c, d))
    if not voll:
        f.append(tuple(range(m))); f.append(tuple(reversed(range(n * m, n * m + m))))
    return T(v, f, farbe)


def vereint(teile, farbe=None):
    """Mehrere Teile gleicher Farbe zu einem Objekt zusammenfassen."""
    v, f = [], []
    for t in teile:
        o = len(v); v += t.v; f += [tuple(i + o for i in x) for x in t.f]
    return T(v, f, farbe or teile[0].farbe)


def gitter(fn, nu, nv, farbe=WEISS, bild=None):
    """Fläche aus fn(u, v) -> (x, y, z), u, v in [0, 1]; v = 1 ist oben im Bild."""
    v, uv, f = [], [], []
    for j in range(nv + 1):
        for i in range(nu + 1):
            v.append(fn(i / nu, j / nv)); uv.append((i / nu, 1 - j / nv))
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i; f.append((a, a + 1, a + nu + 2, a + nu + 1))
    return T(v, f, farbe, uv=uv if bild else None, bild=bild)


def bildscheibe(r, datei, n=48):
    """Runde Bildfläche in der xz-Ebene bei y = 0, Vorderseite -y."""
    v, uv, f = [(0, 0, 0)], [(0.5, 0.5)], []
    for k in range(n):
        w = 2 * math.pi * k / n; v.append((r * math.cos(w), 0, r * math.sin(w))); uv.append((0.5 + 0.5 * math.cos(w), 0.5 - 0.5 * math.sin(w)))
    for k in range(n): f.append((0, 1 + k, 1 + (k + 1) % n))
    return T(v, f, WEISS, uv=uv, bild=datei)


def fenster(x0, x1, y0, y1, z0, z1, reihen, spalten_v, spalten_s, farbe, rahmen=0.2):
    """Fensterreihen auf Vorder- (-y) und rechter Seite (+x) eines Baukörpers."""
    t = []
    hz = (z1 - z0) / reihen
    for r in range(reihen):
        z = z0 + r * hz + hz * rahmen
        bv = (x1 - x0) / spalten_v
        for s in range(spalten_v):
            t.append(kasten(x0 + bv * (s + 0.5), y0 - 0.006, z, bv * (1 - 2 * rahmen), 0.02, hz * (1 - 2 * rahmen), farbe))
        bs = (y1 - y0) / spalten_s
        for s in range(spalten_s):
            t.append(kasten(x1 + 0.006, y0 + bs * (s + 0.5), z, 0.02, bs * (1 - 2 * rahmen), hz * (1 - 2 * rahmen), farbe))
    return vereint(t)


def _ohr(pg):
    """Ohrenschnitt-Triangulierung eines einfachen Polygons (gegen den Uhrzeigersinn)."""
    idx = list(range(len(pg))); tri = []
    kreuz = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    def drin(p, a, b, c):
        return kreuz(a, b, p) >= 0 and kreuz(b, c, p) >= 0 and kreuz(c, a, p) >= 0
    sicher = 0
    while len(idx) > 3 and sicher < 10000:
        sicher += 1
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            a, b, c = pg[i0], pg[i1], pg[i2]
            if kreuz(a, b, c) <= 1e-12: continue
            if any(drin(pg[j], a, b, c) for j in idx if j not in (i0, i1, i2)): continue
            tri.append((i0, i1, i2)); idx.pop(k); break
    tri.append(tuple(idx)); return tri


def prisma(pg, tiefe, farbe):
    """Polygon [(x, z), …] gegen den Uhrzeigersinn in der xz-Ebene, nach +y um 'tiefe' ausgezogen (Vorderseite y = 0)."""
    flaeche = sum(pg[i][0] * pg[(i + 1) % len(pg)][1] - pg[(i + 1) % len(pg)][0] * pg[i][1] for i in range(len(pg)))
    if flaeche < 0: pg = list(reversed(pg))
    n = len(pg); v = [(x, 0, z) for x, z in pg] + [(x, tiefe, z) for x, z in pg]
    f = []
    for a, b, c in _ohr(pg):
        f.append((a, c, b)); f.append((n + a, n + b, n + c))
    for i in range(n):
        j = (i + 1) % n; f.append((i, j, n + j, n + i))
    return T(v, f, farbe)


def rundrechteck(b, h, r, n=6):
    """Polygon eines Rechtecks mit runden Ecken (Mitte 0/0)."""
    pts = []
    for cx, cz, w0 in ((b / 2 - r, -h / 2 + r, -90), (b / 2 - r, h / 2 - r, 0), (-b / 2 + r, h / 2 - r, 90), (-b / 2 + r, -h / 2 + r, 180)):
        for k in range(n + 1):
            w = math.radians(w0 + 90 * k / n); pts.append((cx + r * math.cos(w), cz + r * math.sin(w)))
    return pts


def platte(b, h, tiefe, r, farbe, n=6):
    """Abgerundete Platte, Vorderseite bei y = 0, Mitte 0/0."""
    return prisma(rundrechteck(b, h, r, n), tiefe, farbe)


def zahnrad(R, zaehne, tiefe, farbe, loch=0.0, zahn=0.18):
    pts = []
    for k in range(zaehne):
        w = 2 * math.pi * k / zaehne; s = 2 * math.pi / zaehne
        for a, rr in ((-0.32, R), (-0.18, R * (1 + zahn)), (0.18, R * (1 + zahn)), (0.32, R)):
            pts.append((rr * math.cos(w + a * s), rr * math.sin(w + a * s)))
        for a in (0.4, 0.5, 0.6):
            pts.append((R * math.cos(w + a * s), R * math.sin(w + a * s)))
    return prisma(pts, tiefe, farbe)


def bildflaeche(b, h, datei, rueck=None):
    """Bild auf einer Fläche: Mitte 0/0, Vorderseite zeigt nach -y (y = 0)."""
    v = [(-b / 2, 0, -h / 2), (b / 2, 0, -h / 2), (b / 2, 0, h / 2), (-b / 2, 0, h / 2)]
    return T(v, [(0, 1, 2, 3)], WEISS, uv=[(0, 1), (1, 1), (1, 0), (0, 0)], bild=datei)


# ---------- GLB schreiben ----------
def _lin(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return [(int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)] + [1.0]


def glb(name, teile):
    """Schreibt die Teile als GLB (ein Objekt je Teil) und gibt den Eintrag für 'teile' zurück."""
    teile = [t for t in teile if t is not None]
    binr = bytearray(); bviews, accs, meshes, nodes, mats, texs, imgs = [], [], [], [], [], [], []
    matidx = {}
    def ablage(daten, ziel=None):
        while len(binr) % 4: binr.append(0)
        o = len(binr); binr.extend(daten)
        bv = {'buffer': 0, 'byteOffset': o, 'byteLength': len(daten)}
        if ziel: bv['target'] = ziel
        bviews.append(bv); return len(bviews) - 1
    def material(t):
        sch = ('b:' + t.bild) if t.bild else ('f:' + t.farbe)
        if sch in matidx: return matidx[sch]
        m = {'name': 'c' + hashlib.md5(sch.encode()).hexdigest()[:8], 'doubleSided': True,
             'pbrMetallicRoughness': {'metallicFactor': 0.0, 'roughnessFactor': 1.0}}
        if t.bild:
            with open(os.path.join(HIER, t.bild), 'rb') as fh: png = fh.read()
            imgs.append({'bufferView': ablage(png), 'mimeType': 'image/png'})
            texs.append({'source': len(imgs) - 1, 'sampler': 0})
            m['pbrMetallicRoughness']['baseColorTexture'] = {'index': len(texs) - 1}
        else:
            m['pbrMetallicRoughness']['baseColorFactor'] = _lin(t.farbe)
        mats.append(m); matidx[sch] = len(mats) - 1; return matidx[sch]
    for k, t in enumerate(teile):
        tris = []
        for fl in t.f:
            for i in range(1, len(fl) - 1): tris.append((fl[0], fl[i], fl[i + 1]))
        pos = [(p[0], p[2], -p[1]) for p in t.v]
        pb = b''.join(struct.pack('<3f', *p) for p in pos)
        ib = b''.join(struct.pack('<3I', *tr) for tr in tris)
        accs.append({'bufferView': ablage(pb, 34962), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3',
                     'min': [min(p[i] for p in pos) for i in range(3)], 'max': [max(p[i] for p in pos) for i in range(3)]})
        attr = {'POSITION': len(accs) - 1}
        if t.uv:
            ub = b''.join(struct.pack('<2f', *u) for u in t.uv)
            accs.append({'bufferView': ablage(ub, 34962), 'componentType': 5126, 'count': len(t.uv), 'type': 'VEC2'}); attr['TEXCOORD_0'] = len(accs) - 1
        accs.append({'bufferView': ablage(ib, 34963), 'componentType': 5125, 'count': len(tris) * 3, 'type': 'SCALAR'})
        meshes.append({'primitives': [{'attributes': attr, 'indices': len(accs) - 1, 'material': material(t)}]})
        nodes.append({'mesh': k, 'name': f'{name}-{k}'})
    while len(binr) % 4: binr.append(0)
    g = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes,
         'meshes': meshes, 'accessors': accs, 'bufferViews': bviews, 'materials': mats,
         'buffers': [{'byteLength': len(binr)}]}
    if imgs: g.update(images=imgs, textures=texs, samplers=[{'magFilter': 9729, 'minFilter': 9987}])
    js = json.dumps(g, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    daten = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binr)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binr), 0x004E4942) + bytes(binr)
    os.makedirs(os.path.join(HIER, NETZE), exist_ok=True)
    pfad = f'{NETZE}/{name}.glb'
    with open(os.path.join(HIER, pfad), 'wb') as fh: fh.write(daten)
    return {'datei': pfad}


def motiv(name, groesse, teile, **k):
    d = {'groesse': groesse, 'teile': [glb(name, teile)]}; d.update(k); return d




def rundrechteck2(b, h, ru, ro, n=8):
    """Rechteck mit unteren Eckradien ru und oberen ro (Mitte unten bei 0/0)."""
    pts = []
    for cx, cz, w0, r in ((b / 2 - ru, ru, -90, ru), (b / 2 - ro, h - ro, 0, ro), (-b / 2 + ro, h - ro, 90, ro), (-b / 2 + ru, ru, 180, ru)):
        for k in range(n + 1):
            w = math.radians(w0 + 90 * k / n); pts.append((cx + r * math.cos(w), cz + r * math.sin(w)))
    return pts


def oben(t):
    """Bildfläche flach hinlegen (Bild-Oben zeigt nach +y)."""
    return t.dreh(rx=-90)


def kette(punkte, r, farbe, n=10):
    """Kabel/Schnur als Folge von Stäben mit Gelenkkugeln."""
    t = [stab(a, b, r, farbe, n) for a, b in zip(punkte, punkte[1:])]
    t += [drehkoerper([(0, -r), (r * 0.7, -r * 0.7), (r, 0), (r * 0.7, r * 0.7), (0, r)], farbe, n).schieb(*p) for p in punkte[1:-1]]
    return vereint(t)


def schrauben(punkte, r, farbe, achse='y', h=0.012):
    return vereint([walze(x, y, z, r, h, farbe, achse, 12) for x, y, z in punkte])


# Zusatzfarben dieser Gruppe (aus der Palette abgeleitet)
STEIN, STEIN_D = '#d8d0c2', '#b9b0a0'
NUSS = '#8a5a36'
SILBER, SILBER_H = '#c9cdd2', '#e3e6e9'
ANTHRAZIT = '#3b3d40'
GOLD, GOLD_D = '#e0b04a', '#c08f2e'
KRAFT = '#c9a36b'
TINTE = '#2b2f36'


def _tisch(b, t, h, farbe=HOLZ, bein=0.06):
    teile = [kasten(0, 0, h - 0.05, b, t, 0.05, farbe), kasten(0, 0, h - 0.13, b - 0.12, t - 0.12, 0.08, farbe)]
    teile += [kasten(sx * (b / 2 - 0.08), sy * (t / 2 - 0.08), 0, bein, bein, h - 0.05, farbe) for sx in (-1, 1) for sy in (-1, 1)]
    return teile


S = {}


# ================= Kanalkarten =================
def _plakatwand():
    t = [kasten(0, 0.2, 0, 0.72, 0.72, 0.14, STEIN_D), kasten(0, 0.2, 0.14, 0.38, 0.38, 0.03, METALL_DUNKEL),
         schrauben([(dx, 0.2 + dy, 0.17) for dx in (-0.14, 0.14) for dy in (-0.14, 0.14)], 0.024, METALL, 'z', 0.03),
         walze(0, 0.2, 0.17, 0.1, 1.38, METALL), kasten(0, 0.2, 1.5, 0.32, 0.3, 0.12, METALL_DUNKEL)]
    # Träger hinter der Tafel
    t += [kasten(0, 0.17, z, 2.4, 0.07, 0.08, METALL_DUNKEL) for z in (1.78, 2.5)]
    t += [kasten(x, 0.17, 1.3, 0.06, 0.06, 1.5, METALL_DUNKEL) for x in (-1.0, -0.33, 0.33, 1.0)]
    # Tafel mit Plakat und Rahmen
    t += [kasten(0, 0.09, 1.62, 2.56, 0.1, 1.22, '#3a3d42'),
          bildflaeche(2.42, 1.08, FL + 'c-plakat.png').schieb(0, 0.036, 2.23),
          kasten(0, 0.024, 1.62, 2.56, 0.034, 0.07, SILBER), kasten(0, 0.024, 2.77, 2.56, 0.034, 0.07, SILBER),
          kasten(-1.245, 0.024, 1.62, 0.07, 0.034, 1.22, SILBER), kasten(1.245, 0.024, 1.62, 0.07, 0.034, 1.22, SILBER)]
    # Laufsteg mit Geländer und Streben
    t += [kasten(0, -0.17, 1.42, 2.5, 0.36, 0.035, METALL_DUNKEL)]
    t += [kasten(x, -0.17, 1.455, 0.012, 0.34, 0.006, METALL) for x in [-1.1 + 0.1 * k for k in range(23)]]
    t += [stab((x, 0.14, 1.3), (x, -0.32, 1.42), 0.018, METALL_DUNKEL) for x in (-1.0, 1.0, -0.33, 0.33)]
    pf = [-1.2, -0.6, 0, 0.6, 1.2]
    t += [stab((x, -0.33, 1.455), (x, -0.33, 1.7), 0.014, SILBER) for x in pf]
    t += [stab((-1.22, -0.33, 1.7), (1.22, -0.33, 1.7), 0.016, SILBER), stab((-1.22, -0.33, 1.58), (1.22, -0.33, 1.58), 0.011, SILBER)]
    # Leiter am Mast
    t += [stab((x, 0.0, 0.17), (x, 0.0, 1.42), 0.013, SILBER) for x in (-0.12, 0.12)]
    t += [stab((-0.12, 0.0, z), (0.12, 0.0, z), 0.01, SILBER) for z in [0.3 + 0.14 * k for k in range(8)]]
    # Strahler
    for x in (-0.85, 0, 0.85):
        t += [stab((x, 0.06, 2.84), (x, -0.36, 3.02), 0.016, METALL_DUNKEL), kasten(x, 0.06, 2.79, 0.08, 0.06, 0.06, METALL_DUNKEL),
              kasten(x, -0.42, 2.95, 0.26, 0.14, 0.09, ANTHRAZIT, rx=-25), kasten(x, -0.42, 2.945, 0.22, 0.11, 0.012, '#fff1c2', rx=-25, um=(x, -0.42, 2.95))]
    return t


S['kanal-plakat'] = motiv('kanal-plakat', 'karte', _plakatwand())


def _broschuere(x, y, z, rz, bild=None, b=0.6, t=0.84, rand=ROT):
    teile = [kasten(x, y, z, b, t, 0.005, rand, rz=rz), kasten(x, y, z + 0.005, b - 0.012, t - 0.008, 0.016, PAPIER, rz=rz),
             kasten(x, y, z + 0.021, b, t, 0.005, rand, rz=rz)]
    if bild: teile.append(oben(bildflaeche(b - 0.004, t - 0.004, bild)).dreh(rz=rz).schieb(x, y, z + 0.0265))
    return teile


def _prospekte():
    t = []
    dz = 0.026
    for k, rz in enumerate([2, -1.5, 1, -2.5, 0.5, 2.2, -1, 1.5, -0.5, 1]):
        t += _broschuere(0.1, -0.12, k * dz, rz, FL + 'c-prospekt.png' if k == 9 else None, rand=ROT if k % 3 else '#c8352c')
    # Ständer aus Acryl mit aufgestelltem Prospekt
    sx, sy = -0.78, 0.32; acryl, acryl_d = '#d6e7f0', '#b5d0de'
    t += [kasten(sx, sy, 0, 0.7, 0.42, 0.025, acryl_d), kasten(sx, sy + 0.12, 0.025, 0.68, 0.025, 0.98, acryl, rx=-14, um=(sx, sy + 0.12, 0.025))]
    t += [kasten(sx, sy + 0.08, 0.025, 0.6, 0.022, 0.84, PAPIER, rx=-14, um=(sx, sy + 0.12, 0.025)),
          bildflaeche(0.596, 0.836, FL + 'c-prospekt.png').schieb(sx, sy + 0.08 - 0.0125, 0.025 + 0.42).dreh(rx=-14, um=(sx, sy + 0.12, 0.025))]
    t += [kasten(sx, sy - 0.12, 0.025, 0.68, 0.025, 0.13, acryl), kasten(sx, sy - 0.02, 0.025, 0.68, 0.2, 0.012, acryl)]
    # verschnürtes Bündel
    bx, by = 0.95, 0.55
    for k, rz in enumerate([0, 1.5, -1, 0.5, 0]):
        t += _broschuere(bx, by, k * dz, rz, FL + 'c-prospekt.png' if k == 4 else None)
    h = 5 * dz + 0.004
    band = '#efe9dd'
    t += [kasten(bx, by, -0.002, 0.07, 0.86, h, band), kasten(bx, by, h - 0.002, 0.07, 0.86, 0.004, band),
          kasten(bx, by, -0.002, 0.62, 0.07, h, band), kasten(bx, by, h - 0.002, 0.62, 0.07, 0.006, band),
          kasten(bx, by, h + 0.002, 0.1, 0.1, 0.012, band)]
    return t


S['kanal-prospekt'] = motiv('kanal-prospekt', 'karte', _prospekte())


def _zeitung_offen():
    t = []
    B, L = 0.72, 1.0
    def hoehe(x): return 0.028 + 0.045 * math.exp(-(x / 0.12) ** 2)
    for seite, bild in ((-1, 'c-zeitung-links.png'), (1, 'c-zeitung-rechts.png')):
        xs = [seite * B * k / 24 for k in range(25)]
        prof = [(x, hoehe(x)) for x in xs] + [(seite * B, 0.0), (0, 0.0)]
        t.append(prisma(prof, L, '#e6e1d5').schieb(0, -L / 2, 0))
        if seite < 0:
            t.append(gitter(lambda u, v: (-B + B * u, -L / 2 + L * v, hoehe(-B + B * u) + 0.002), 24, 1, bild=FL + bild))
        else:
            t.append(gitter(lambda u, v: (B * u, -L / 2 + L * v, hoehe(B * u) + 0.002), 24, 1, bild=FL + bild))
        # Blattkanten
        t += [kasten(seite * B / 2, -L / 2 - 0.001, z, B - 0.02, 0.004, 0.003, '#c9c2b4') for z in (0.008, 0.016)]
    # Stift auf der linken Seite
    t += [stab((-0.62, -0.38, 0.045), (-0.22, -0.2, 0.045), 0.018, PETROL), stab((-0.22, -0.2, 0.045), (-0.16, -0.173, 0.045), 0.012, SILBER),
          stab((-0.6, -0.371, 0.07), (-0.48, -0.317, 0.07), 0.006, SILBER)]
    t = [p.dreh(rz=-6).schieb(-0.12, -0.05, 0) for p in t]
    # Tasse mit Untertasse
    cx, cy = -0.4, 0.7
    t += [drehkoerper([(0, 0), (0.14, 0), (0.22, 0.028), (0.205, 0.034), (0.12, 0.016), (0, 0.016)], WEISS).schieb(cx, cy, 0),
          drehkoerper([(0, 0.016), (0.075, 0.016), (0.105, 0.06), (0.12, 0.19), (0.108, 0.19), (0.096, 0.07), (0, 0.065)], WEISS).schieb(cx, cy, 0),
          walze(cx, cy, 0.158, 0.103, 0.006, '#5a3a28'),
          ring(0.055, 0.016, WEISS, 20, 8, -80, 80).dreh(rx=90).schieb(cx + 0.115, cy, 0.12),
          ]
    # Bistrotisch
    hz = 0.78
    t = [p.schieb(0, 0, hz + 0.045) for p in t]
    t += [walze(0, 0, hz, 1.05, 0.045, HOLZ, n=64), walze(0, 0, hz - 0.03, 0.98, 0.03, '#9a7049', n=64),
          walze(0, 0, 0.06, 0.055, hz - 0.08, ANTHRAZIT), walze(0, 0, hz - 0.12, 0.12, 0.09, ANTHRAZIT),
          walze(0, 0, 0, 0.42, 0.05, ANTHRAZIT, n=40), walze(0, 0, 0.05, 0.12, 0.03, ANTHRAZIT)]
    return t


S['kanal-anzeigen'] = motiv('kanal-anzeigen', 'karte', _zeitung_offen())


def _radio_studio():
    t = []
    # Radio aus Nussbaum
    rx0, ry0 = 0.3, 0.0
    t.append(prisma(rundrechteck2(1.1, 0.72, 0.05, 0.26), 0.42, NUSS).schieb(rx0, ry0, 0.04))
    t += [kasten(rx0 + dx, ry0 + dy, 0, 0.08, 0.06, 0.04, ANTHRAZIT) for dx in (-0.45, 0.45) for dy in (0.06, 0.36)]
    t.append(platte(0.5, 0.44, 0.02, 0.07, '#e3d3b4').schieb(rx0 - 0.23, ry0 - 0.015, 0.36))
    t += [kasten(rx0 - 0.23 + dx, ry0 - 0.03, 0.15, 0.032, 0.02, 0.42, '#6e4529') for dx in (-0.18, -0.09, 0, 0.09, 0.18)]
    t.append(platte(0.36, 0.17, 0.02, 0.04, '#f2e6c8').schieb(rx0 + 0.29, ry0 - 0.015, 0.52))
    t += [kasten(rx0 + 0.15 + 0.035 * k, ry0 - 0.02, 0.47 if k % 2 else 0.49, 0.008, 0.01, 0.06 if k % 2 else 0.04, '#6b5a45') for k in range(9)]
    t.append(kasten(rx0 + 0.33, ry0 - 0.025, 0.45, 0.012, 0.01, 0.15, ROT))
    t += [walze(rx0 + dx, ry0 - 0.03, 0.24, 0.06, 0.06, '#3b2a1e', 'y') for dx in (0.18, 0.4)]
    t += [walze(rx0 + dx, ry0 - 0.065, 0.24, 0.035, 0.012, '#c9a36b', 'y') for dx in (0.18, 0.4)]
    t += [kasten(rx0 + dx, ry0 - 0.075, 0.26, 0.01, 0.008, 0.03, '#f2e6c8') for dx in (0.18, 0.4)]
    t.append(kasten(rx0 + 0.29, ry0 - 0.006, 0.08, 0.2, 0.01, 0.05, '#c9a36b'))
    # Antenne und Griff
    t += [walze(rx0 + 0.38, ry0 + 0.3, 0.73, 0.03, 0.04, SILBER), stab((rx0 + 0.38, ry0 + 0.3, 0.75), (rx0 + 0.72, ry0 + 0.42, 1.32), 0.012, SILBER),
          drehkoerper([(0, -0.025), (0.025, 0), (0, 0.025)], SILBER, 12).schieb(rx0 + 0.72, ry0 + 0.42, 1.32)]
    # Studiomikrofon auf Tischstativ
    mx, my = -0.62, -0.32
    t += [drehkoerper([(0, 0), (0.2, 0), (0.21, 0.02), (0.19, 0.045), (0.03, 0.05), (0, 0.05)], ANTHRAZIT).schieb(mx, my, 0),
          walze(mx, my, 0.05, 0.022, 0.72, SILBER), walze(mx, my, 0.4, 0.035, 0.05, ANTHRAZIT),
          stab((mx - 0.15, my, 0.95), (mx, my, 0.77), 0.014, ANTHRAZIT), stab((mx + 0.15, my, 0.95), (mx, my, 0.77), 0.014, ANTHRAZIT),
          walze(mx, my, 0.75, 0.03, 0.04, ANTHRAZIT)]
    for z in (0.95, 1.2): t.append(ring(0.15, 0.013, ANTHRAZIT, 32, 8).schieb(mx, my, z))
    for w in (45, 135, 225, 315):
        x, y = mx + 0.15 * math.cos(math.radians(w)), my + 0.15 * math.sin(math.radians(w))
        t.append(stab((x, y, 0.95), (mx + 0.09 * math.cos(math.radians(w)), my + 0.09 * math.sin(math.radians(w)), 1.07), 0.006, '#e9e4da'))
        t.append(stab((x, y, 1.2), (mx + 0.09 * math.cos(math.radians(w)), my + 0.09 * math.sin(math.radians(w)), 1.07), 0.006, '#e9e4da'))
    t += [drehkoerper([(0, 0.82), (0.07, 0.82), (0.088, 0.86), (0.088, 1.16), (0, 1.16)], '#2f3135').schieb(mx, my, 0),
          walze(mx, my, 1.16, 0.093, 0.04, SILBER),
          drehkoerper([(0, 1.2), (0.09, 1.2), (0.09, 1.38)] + [(0.09 * math.cos(math.radians(a)), 1.38 + 0.09 * math.sin(math.radians(a))) for a in (20, 40, 60, 80)] + [(0, 1.47)], '#a7adb3').schieb(mx, my, 0)]
    t += [ring(0.092, 0.005, '#7b8187', 32, 6).schieb(mx, my, z) for z in (1.24, 1.28, 1.32, 1.36, 1.4)]
    t.append(walze(mx, my - 0.088, 1.06, 0.012, 0.01, ROT, 'y'))
    # Kabel vom Mikrofon zum Radio
    t.append(kette([(mx, my, 0.83), (mx + 0.03, my - 0.02, 0.6), (mx + 0.05, my - 0.04, 0.06), (mx + 0.2, my - 0.15, 0.015), (mx + 0.45, my - 0.1, 0.015), (mx + 0.55, my + 0.1, 0.015), (rx0 - 0.3, ry0 + 0.3, 0.015), (rx0 - 0.1, ry0 + 0.45, 0.06)], 0.012, '#26282b'))
    return t


S['kanal-radio'] = motiv('kanal-radio', 'karte', _radio_studio())


def _laptop(x=0, y=0, w=1.3, d=0.9, bild=FL + 'c-shop.png', neig=-14, tasten=True):
    t = [kasten(x, y, 0, w, d, 0.05, SILBER), kasten(x, y - d * 0.3, 0.05, w * 0.31, d * 0.24, 0.003, '#b4b9bf')]
    t.append(kasten(x, y + d * 0.09, 0.05, w * 0.88, d * 0.47, 0.003, ANTHRAZIT))
    if tasten:
        keys = []
        nx, ny = 13, 5; kw = w * 0.88 / nx; kd = d * 0.47 / ny
        for r in range(ny):
            for c in range(nx):
                if r == 0 and 4 <= c <= 8:
                    if c == 4: keys.append(kasten(x - w * 0.44 + kw * 6.5, y + d * 0.09 - d * 0.235 + kd * 0.5, 0.053, kw * 4.6, kd * 0.72, 0.012, SILBER_H))
                    continue
                keys.append(kasten(x - w * 0.44 + kw * (c + 0.5), y + d * 0.09 - d * 0.235 + kd * (r + 0.5), 0.053, kw * 0.78, kd * 0.72, 0.012, SILBER_H))
        t.append(vereint(keys))
    hy = y + d / 2; um = (x, hy, 0.05)
    deckel = [kasten(x, hy - 0.016, 0.05, w, 0.032, d * 0.92, SILBER), kasten(x, hy - 0.034, 0.06, w * 0.97, 0.004, d * 0.89, '#2e3033'),
              bildflaeche(w * 0.9, w * 0.9 * 0.622, bild).schieb(x, hy - 0.037, 0.05 + d * 0.48),
              walze(x, hy - 0.036, 0.05 + d * 0.88, 0.008, 0.004, '#555', 'y'),
              kasten(x, hy - 0.016, 0.03, w * 0.5, 0.034, 0.03, '#a9aeb4')]
    return t + [p.dreh(rx=neig, um=um) for p in deckel]


def _tuete(x, y, z=0, b=0.42, t=0.24, h=0.56, rz=0):
    teile = [kasten(0, 0, 0, b, t, h, CREME), kasten(0, 0, h - 0.004, b - 0.03, t - 0.03, 0.006, '#b8ac98'),
             bildflaeche(b * 0.86, b * 0.86 * 1.25, FL + 'c-tuete.png').schieb(0, -t / 2 - 0.002, h * 0.47),
             kasten(0, -t / 2 - 0.001, h - 0.05, b, 0.004, 0.05, ROT), kasten(b / 2 + 0.001, 0, h - 0.05, 0.004, t, 0.05, ROT)]
    for yy in (-t / 2 + 0.04, t / 2 - 0.04):
        teile.append(ring(0.1, 0.012, ANTHRAZIT, 24, 8, 0, 180).dreh(rx=90).schieb(0, yy, h - 0.01))
    teile += [kasten(-0.06, 0.0, h - 0.06, 0.18, 0.012, 0.16, '#d8a7a0', rz=10, ry=-12), kasten(0.07, 0.02, h - 0.06, 0.16, 0.012, 0.14, '#e9c9c4', rz=-8, ry=14)]
    return [p.dreh(rz=rz).schieb(x, y, z) for p in teile]


def _maus(x, y):
    return [drehkoerper([(0, 0), (0.06, 0), (0.068, 0.018), (0.055, 0.038), (0.03, 0.046), (0, 0.048)], SILBER_H, 24).skal(1, 1.6, 1).schieb(x, y, 0),
            kasten(x, y + 0.04, 0.04, 0.004, 0.06, 0.012, '#9aa0a6')]


S['kanal-online'] = motiv('kanal-online', 'karte', _laptop() + _tuete(-1.02, 0.25) + _maus(0.9, -0.05))


def _handy(b=0.25, h=0.5, bild=FL + 'c-social.png'):
    """Smartphone, Mitte 0/0, Vorderseite -y bei y = -0.001."""
    return [platte(b, h, 0.026, 0.04, '#26282b'), bildflaeche(b - 0.024, h - 0.03, bild).schieb(0, -0.002, 0),
            kasten(0, -0.0025, h / 2 - 0.035, 0.05, 0.003, 0.012, '#111'), kasten(b / 2 + 0.002, 0.013, 0.06, 0.006, 0.012, 0.07, '#3a3c40')]


def _ringlicht():
    t = []
    H = 0.74
    t += _tisch(1.5, 0.8, H, HOLZ)
    t += [kasten(0.35, -0.401, H - 0.12, 0.4, 0.006, 0.06, '#a77b50'), kasten(0.35, -0.406, H - 0.1, 0.08, 0.006, 0.018, METALL)]
    # Tischstativ
    cx, cy = -0.05, 0.12
    hub = (cx, cy, H + 0.2)
    for w in (90, 210, 330):
        fx, fy = cx + 0.24 * math.cos(math.radians(w)), cy + 0.24 * math.sin(math.radians(w))
        t += [stab(hub, (fx, fy, H + 0.012), 0.016, ANTHRAZIT), walze(fx, fy, H, 0.022, 0.018, '#26282b')]
    t += [walze(cx, cy, H + 0.17, 0.035, 0.07, ANTHRAZIT), walze(cx, cy, H + 0.24, 0.018, 0.34, SILBER), walze(cx, cy, H + 0.4, 0.028, 0.04, ANTHRAZIT),
          walze(cx + 0.03, cy, H + 0.42, 0.008, 0.06, ANTHRAZIT, 'x')]
    rz = H + 0.98; R = 0.38
    t += [drehkoerper([(R - 0.06, 0), (R + 0.06, 0), (R + 0.06, 0.05), (R - 0.06, 0.05)], ANTHRAZIT, 64, 'y').schieb(cx, cy + 0.06, rz),
          ring(R, 0.05, '#fbf8ef', 64, 12).dreh(rx=90).schieb(cx, cy + 0.04, rz)]
    t += [kasten(cx, cy + 0.06, H + 0.56, 0.1, 0.07, 0.05, ANTHRAZIT), stab((cx, cy + 0.06, H + 0.58), (cx, cy + 0.06, rz - R), 0.018, ANTHRAZIT)]
    # Handyhalter
    t += [stab((cx, cy + 0.05, rz - R + 0.03), (cx, cy + 0.05, rz - 0.27), 0.012, SILBER), kasten(cx, cy + 0.035, rz - 0.28, 0.27, 0.03, 0.035, ANTHRAZIT),
          kasten(cx, cy + 0.035, rz + 0.235, 0.27, 0.03, 0.035, ANTHRAZIT), kasten(cx, cy + 0.05, rz - 0.28, 0.025, 0.025, 0.55, ANTHRAZIT)]
    t += [p.schieb(cx, cy + 0.006, rz) for p in _handy(0.24, 0.48)]
    t.append(kette([(cx + 0.03, cy + 0.08, H + 0.5), (cx + 0.04, cy + 0.07, H + 0.25), (cx + 0.18, cy + 0.2, H + 0.012), (0.55, 0.3, H + 0.012), (0.75, 0.38, H + 0.012)], 0.008, '#26282b'))
    # Produkt im Bild: Tüte und Schuhkarton vor dem Licht
    t += _tuete(0.48, -0.12, H, 0.3, 0.17, 0.4, -10)
    t += [kasten(-0.52, -0.12, H, 0.34, 0.22, 0.13, '#e9e4da', rz=8), kasten(-0.52, -0.12, H + 0.13, 0.36, 0.24, 0.035, ROT, rz=8),
          kasten(-0.52, -0.12, H + 0.165, 0.12, 0.244, 0.004, WEISS, rz=8)]
    # Pflanze
    t += [drehkoerper([(0, 0), (0.07, 0), (0.09, 0.14), (0, 0.14)], '#e9e4da', 24).schieb(-0.6, 0.26, H)]
    for k in range(7):
        w = k * 360 / 7
        t.append(kasten(-0.6, 0.26, H + 0.12, 0.05, 0.012, 0.22, '#6d8f5e', rx=0, ry=25 + 8 * (k % 2), rz=w, um=(-0.6, 0.26, H + 0.12)))
    return t


S['kanal-social'] = motiv('kanal-social', 'karte', _ringlicht())


def _puppe(x, y, z, kleid='#2f5d7c', s=1.0):
    haut = '#f1ece3'
    t = [walze(0, 0, 0, 0.15, 0.025, METALL_DUNKEL), walze(0, 0, 0.025, 0.014, 0.33, SILBER),
         drehkoerper([(0, 0.34), (0.27, 0.34), (0.2, 0.62), (0.115, 0.76), (0.13, 0.84), (0.15, 0.94), (0.16, 0.99), (0.07, 1.04), (0, 1.04)], kleid, 40),
         drehkoerper([(0, 0.74), (0.12, 0.74), (0.122, 0.79), (0, 0.79)], '#2b2b2d', 40),
         walze(0, 0, 1.03, 0.035, 0.07, haut),
         drehkoerper([(0, 0), (0.05, 0.01), (0.072, 0.06), (0.068, 0.11), (0.045, 0.15), (0, 0.16)], haut, 24).schieb(0, 0, 1.09)]
    for sg in (-1, 1):
        t += [stab((sg * 0.15, 0, 0.96), (sg * 0.21, -0.02, 0.68), 0.032, kleid), stab((sg * 0.21, -0.02, 0.68), (sg * 0.2, -0.05, 0.52), 0.022, haut)]
    t.append(walze(-0.06, -0.12, 0.86, 0.022, 0.012, ROT, 'y'))
    return [p.skal(s).schieb(x, y, z) for p in t]


def _schaufenster():
    t = []
    X0, X1, Y0, Y1 = -1.05, 1.05, -0.12, 0.66
    oz0, oz1, ox, oben_h = 0.3, 1.78, 0.88, 0.5
    my = (Y0 + Y1) / 2
    t += [kasten(0, my, 0, X1 - X0, Y1 - Y0, oz0, STEIN_D),
          kasten((X0 - ox) / 2, my, oz0, -ox - X0, Y1 - Y0, oz1 - oz0, STEIN),
          kasten((X1 + ox) / 2, my, oz0, X1 - ox, Y1 - Y0, oz1 - oz0, STEIN),
          kasten(0, my, oz1, X1 - X0, Y1 - Y0, oben_h, STEIN),
          kasten(0, my - 0.02, oz1 + oben_h, X1 - X0 + 0.08, Y1 - Y0 + 0.05, 0.05, STEIN_D)]
    # Innenraum
    t += [kasten(0, (Y1 + 0.0) / 2, oz0, 2 * ox, Y1, 0.06, HOLZ_HELL), kasten(0, Y1 - 0.06, oz0, 2 * ox, 0.04, oz1 - oz0, '#efe6d6'),
          kasten(-ox + 0.02, Y1 / 2, oz0, 0.04, Y1, oz1 - oz0, '#e7dcc8')]
    t += [kasten(x, Y1 - 0.082, oz0 + 0.06, 0.05, 0.012, oz1 - oz0 - 0.06, '#e3d6bf') for x in (-0.6, -0.2, 0.2, 0.6)]
    # Rahmen, Fensterbank
    rf = METALL_DUNKEL
    t += [kasten(0, Y0 + 0.025, oz0, 2 * ox, 0.05, 0.05, rf), kasten(0, Y0 + 0.025, oz1 - 0.05, 2 * ox, 0.05, 0.05, rf),
          kasten(-ox + 0.025, Y0 + 0.025, oz0, 0.05, 0.05, oz1 - oz0, rf), kasten(ox - 0.025, Y0 + 0.025, oz0, 0.05, 0.05, oz1 - oz0, rf),
          kasten(0, Y0 - 0.03, oz0 - 0.04, 2 * ox + 0.1, 0.1, 0.04, STEIN_D)]
    # Schriftband
    t += [kasten(0, Y0 - 0.025, oz1 + 0.08, 1.96, 0.05, 0.34, ROT), bildflaeche(1.9, 0.304, FL + 'c-band.png').schieb(0, Y0 - 0.052, oz1 + 0.25)]
    # Gehweg
    t.append(kasten(0, Y0 - 0.3, -0.05, X1 - X0 + 0.2, 0.6, 0.05, '#c4bdb1'))
    t += [kasten(x, Y0 - 0.3, -0.002, 0.012, 0.6, 0.004, '#a9a296') for x in (-0.7, -0.1, 0.5)]
    # Auslage
    fz = oz0 + 0.06
    t += _puppe(-0.12, 0.3, fz, '#2f5d7c', 0.95)
    t += [kasten(-0.6, 0.38, fz, 0.3, 0.3, 0.32, '#f6f1e8')] + [kasten(-0.6, 0.38, fz + 0.32 + 0.036 * k, 0.24, 0.2, 0.034, c, rz=(k - 1) * 5) for k, c in enumerate(['#2f5d7c', '#e9e4da', '#6d8f5e'])]
    t += _tuete(0.42, 0.22, fz, 0.26, 0.15, 0.34, -15) + _tuete(0.62, 0.42, fz, 0.22, 0.13, 0.3, 12)
    t += [kasten(-0.5, 0.0, fz, 0.42, 0.03, 0.15, ANTHRAZIT, rx=-12), bildflaeche(0.4, 0.133, FL + 'c-fensterschrift.png').schieb(-0.5, -0.017, fz + 0.075).dreh(rx=-12, um=(-0.5, 0.0, fz))]
    return t


S['kanal-schaufenster'] = motiv('kanal-schaufenster', 'karte', _schaufenster())


def _briefkasten():
    t = []
    t.append(kasten(0, 0, -0.06, 1.7, 1.25, 0.06, '#c4bdb1'))
    t += [kasten(x, 0, -0.002, 0.012, 1.25, 0.004, '#a9a296') for x in (-0.45, 0.4)] + [kasten(0, y, -0.002, 1.7, 0.012, 0.004, '#a9a296') for y in (-0.2, 0.35)]
    px, py = -0.25, 0.2
    t += [kasten(px, py, 0, 0.22, 0.22, 0.02, METALL_DUNKEL), kasten(px, py, 0.02, 0.09, 0.09, 0.85, METALL_DUNKEL)]
    bz = 0.82; P2 = '#195a71'
    t += [kasten(px, py, bz, 0.66, 0.4, 0.52, PETROL), kasten(px, py - 0.01, bz + 0.52, 0.72, 0.46, 0.045, P2)]
    t += [kasten(px, py - 0.205, bz + 0.38, 0.5, 0.02, 0.09, SILBER), kasten(px, py - 0.215, bz + 0.395, 0.42, 0.006, 0.02, '#1d1f22')]
    # Umschlag steckt im Schlitz
    t += [kasten(px + 0.02, py - 0.212, bz + 0.40, 0.44, 0.006, 0.27, '#f7f3ea', rx=-8, rz=4, um=(px, py - 0.212, bz + 0.4)),
          bildflaeche(0.43, 0.27, FL + 'c-mailing.png').schieb(0.02, -0.004, 0.135).dreh(rx=-8, rz=4).schieb(px, py - 0.212, bz + 0.40)]
    t += [kasten(px, py - 0.204, bz + 0.05, 0.56, 0.012, 0.28, '#2a7d99'), walze(px + 0.2, py - 0.215, bz + 0.2, 0.022, 0.012, SILBER, 'y'),
          kasten(px - 0.1, py - 0.212, bz + 0.15, 0.24, 0.006, 0.09, WEISS), kasten(px - 0.1, py - 0.216, bz + 0.19, 0.16, 0.003, 0.012, '#555'),
          kasten(px - 0.1, py - 0.216, bz + 0.17, 0.11, 0.003, 0.01, '#888')]
    # Hausnummer
    t += [kasten(px + 0.334, py + 0.05, bz + 0.22, 0.006, 0.12, 0.12, WEISS), kasten(px + 0.338, py + 0.05, bz + 0.245, 0.003, 0.02, 0.07, TINTE)]
    # Handy im Ständer
    hx, hy = 0.45, -0.25
    t += [kasten(hx, hy + 0.05, 0, 0.32, 0.26, 0.025, ANTHRAZIT), kasten(hx, hy + 0.12, 0.025, 0.2, 0.025, 0.42, ANTHRAZIT, rx=-18, um=(hx, hy + 0.12, 0.025)),
          kasten(hx, hy - 0.06, 0.025, 0.3, 0.05, 0.04, ANTHRAZIT)]
    t += [p.dreh(rx=-18).schieb(hx, hy + 0.06, 0.04 + 0.26) for p in _handy(0.26, 0.52, FL + 'c-handy-mail.png')]
    # Briefe am Boden
    t += [kasten(0.35, 0.35, 0, 0.36, 0.24, 0.008, '#f7f3ea', rz=12), kasten(0.4, 0.38, 0.008, 0.36, 0.24, 0.008, '#e9e4da', rz=-6),
          oben(bildflaeche(0.36, 0.225, FL + 'c-mailing.png')).dreh(rz=-6).schieb(0.4, 0.38, 0.0165)]
    return t


S['kanal-crm'] = motiv('kanal-crm', 'karte', _briefkasten())


# ================= Reiter und Menü =================
def _werbetafel():
    t = [kasten(0, 0.12, 0, 0.56, 0.56, 0.12, STEIN_D), kasten(0, 0.12, 0.12, 0.3, 0.3, 0.03, METALL_DUNKEL),
         schrauben([(dx, 0.12 + dy, 0.15) for dx in (-0.1, 0.1) for dy in (-0.1, 0.1)], 0.02, METALL, 'z', 0.025),
         walze(0, 0.12, 0.15, 0.075, 0.95, METALL)]
    t += [stab((0, 0.12, 0.75), (x, 0.12, 1.05), 0.03, METALL_DUNKEL) for x in (-0.55, 0.55)]
    t += [kasten(0, 0.12, 1.02, 1.82, 0.12, 0.94, '#3a3d42'),
          bildflaeche(1.68, 0.84, FL + 'c-werbetafel.png').schieb(0, 0.059, 1.49),
          kasten(0, 0.045, 1.02, 1.82, 0.05, 0.07, SILBER), kasten(0, 0.045, 1.89, 1.82, 0.05, 0.07, SILBER),
          kasten(-0.875, 0.045, 1.02, 0.07, 0.05, 0.94, SILBER), kasten(0.875, 0.045, 1.02, 0.07, 0.05, 0.94, SILBER)]
    for x in (-0.5, 0.5):
        t += [stab((x, 0.07, 1.96), (x, -0.25, 2.12), 0.022, METALL_DUNKEL), kasten(x, -0.3, 2.04, 0.3, 0.16, 0.1, ANTHRAZIT, rx=-25),
              kasten(x, -0.3, 2.035, 0.25, 0.12, 0.012, '#fff1c2', rx=-25, um=(x, -0.3, 2.04))]
    return t


S['marketing'] = motiv('marketing', 'symbol', _werbetafel())


def _stadt():
    t = [kasten(0, 0, 0, 1.7, 1.4, 0.07, '#c4bdb1'), kasten(0, 0, -0.08, 1.74, 1.44, 0.08, STEIN_D)]
    # Hochhaus
    hx, hy, hb, ht, hh = -0.38, 0.28, 0.5, 0.5, 1.75
    t += [kasten(hx, hy, 0.07, hb, ht, hh, '#dfe6eb'), kasten(hx, hy, 0.07 + hh, hb + 0.04, ht + 0.04, 0.05, SILBER),
          kasten(hx, hy, 0.12 + hh, 0.22, 0.22, 0.12, SILBER), stab((hx, hy, 0.24 + hh), (hx, hy, 0.5 + hh), 0.012, METALL_DUNKEL),
          fenster(hx - hb / 2, hx + hb / 2, hy - ht / 2, hy + ht / 2, 0.17, 0.07 + hh - 0.05, 11, 3, 3, '#5f86a3', 0.18)]
    # Warenhaus Hartwig
    wx, wy, wb, wt, wh = 0.4, 0.22, 0.72, 0.62, 0.9
    t += [kasten(wx, wy, 0.07, wb, wt, wh, STEIN), kasten(wx, wy, 0.07 + wh, wb + 0.04, wt + 0.04, 0.05, STEIN_D),
          kasten(wx, wy - 0.005, 0.07 + wh - 0.2, wb + 0.01, wt + 0.01, 0.12, ROT),
          oben(bildflaeche(0.1, 0.1, FL + 'c-logo.png')).dreh(rx=90).schieb(wx - 0.22, wy - wt / 2 - 0.012, 0.07 + wh - 0.14),
          fenster(wx - wb / 2, wx + wb / 2, wy - wt / 2, wy + wt / 2, 0.38, 0.07 + wh - 0.22, 2, 3, 3, '#5f86a3', 0.16),
          kasten(wx, wy - wt / 2 - 0.006, 0.07, 0.6, 0.02, 0.25, '#4f7894'), kasten(wx, wy - wt / 2 - 0.06, 0.32, 0.66, 0.12, 0.025, ROT_DUNKEL)]
    # Altbau mit Satteldach
    ax, ay = -0.42, -0.38
    t += [kasten(ax, ay, 0.07, 0.48, 0.4, 0.5, '#ead9c0'),
          prisma([(-0.27, 0), (0.27, 0), (0, 0.24)], 0.44, HOLZ_ROT).schieb(ax, ay - 0.22, 0.57),
          fenster(ax - 0.24, ax + 0.24, ay - 0.2, ay + 0.2, 0.13, 0.55, 2, 2, 2, '#5f86a3', 0.22),
          kasten(ax + 0.12, ay + 0.06, 0.62, 0.08, 0.08, 0.18, '#9a6a52')]
    # Baum
    t += [walze(0.42, -0.42, 0.07, 0.03, 0.2, NUSS),
          drehkoerper([(0, 0), (0.15, 0.04), (0.17, 0.14), (0.12, 0.26), (0, 0.32)], '#6d8f5e', 16).schieb(0.42, -0.42, 0.22)]
    return t


S['staedte'] = motiv('staedte', 'symbol', _stadt())


def _kundenkarte():
    t = []
    # Kartenterminal
    t += [kasten(0, 0, 0, 0.62, 0.95, 0.1, ANTHRAZIT), kasten(0, 0.12, 0.1, 0.62, 0.7, 0.06, ANTHRAZIT),
          kasten(0, 0.33, 0.16, 0.5, 0.26, 0.004, '#1d1f22'), oben(bildflaeche(0.46, 0.22, FL + 'c-leser.png')).schieb(0, 0.32, 0.165)]
    keys = []
    for r in range(4):
        for c in range(3):
            keys.append(kasten(-0.16 + c * 0.16, 0.12 - r * 0.1 + 0.02, 0.16, 0.12, 0.07, 0.025, '#d8dbdf'))
    t.append(vereint(keys))
    t += [kasten(-0.16 + c * 0.16, -0.32, 0.1, 0.12, 0.07, 0.025, col) for c, col in enumerate(['#d23c32', '#e0b04a', '#5f9a6a'])]
    t += [kasten(0, -0.47, 0.03, 0.5, 0.01, 0.025, '#1d1f22')]
    # Karte steht im Schlitz hinten
    cz = 0.16
    t += [kasten(0, 0.45, 0.16, 0.66, 0.06, 0.05, ANTHRAZIT), kasten(0, 0.45, 0.205, 0.6, 0.012, 0.004, '#111')]
    kb, kh = 0.86, 0.54
    t += [kasten(0, 0.45, cz, kb, 0.014, kh + 0.05, '#c8352c', rx=-6, um=(0, 0.45, cz)),
          bildflaeche(kb - 0.004, kh, FL + 'c-kundenkarte.png').schieb(0, 0.442, cz + 0.05 + kh / 2).dreh(rx=-6, um=(0, 0.45, cz))]
    return t


S['kundenkarte'] = motiv('kundenkarte', 'symbol', _kundenkarte())


def _briefstapel():
    t = []
    farben = ['#f7f3ea', '#cfe1ea', '#e9e4da', '#f2d38a', '#f7f3ea']
    for k, (c, rz) in enumerate(zip(farben, [4, -3, 2, -5, 0])):
        t += [kasten(0, 0, k * 0.035, 0.9, 0.58, 0.033, c, rz=rz)]
    t.append(oben(bildflaeche(0.89, 0.57, FL + 'c-mailing.png')).schieb(0, 0, 5 * 0.035 + 0.001))
    # aufgestellter Umschlag hinten
    t += [kasten(0.05, 0.38, 0, 0.86, 0.025, 0.55, '#f7f3ea', rx=-14, um=(0.05, 0.38, 0)),
          bildflaeche(0.85, 0.53, FL + 'c-mailing.png').schieb(0.05, 0.366, 0.275).dreh(rx=-14, um=(0.05, 0.38, 0))]
    # Kordel mit Schleife
    h = 5 * 0.035 + 0.004; s = KRAFT
    t += [kasten(0, 0, -0.004, 0.025, 0.6, h + 0.006, s), kasten(0, 0, -0.004, 0.92, 0.025, h + 0.006, s),
          ring(0.06, 0.012, s, 20, 6).dreh(rx=90).dreh(rz=30).schieb(-0.06, 0, h + 0.04), ring(0.06, 0.012, s, 20, 6).dreh(rx=90).dreh(rz=-30).schieb(0.06, 0, h + 0.04),
          drehkoerper([(0, 0), (0.025, 0.005), (0.03, 0.02), (0, 0.035)], s, 12).schieb(0, 0, h - 0.002),
          stab((0, -0.01, h), (-0.1, -0.12, h - 0.002), 0.01, s), stab((0, -0.01, h), (0.07, -0.14, h - 0.002), 0.01, s)]
    return t


S['crm'] = motiv('crm', 'symbol', _briefstapel())


def _kalender():
    t = [kasten(0, 0.28, 0, 1.3, 0.1, 1.55, '#a9bfcc'), kasten(0, 0.22, 0, 1.3, 0.04, 0.1, '#7f98a8')]
    t += [kasten(0, 0.22, 0.12, 0.92, 0.012, 1.12, '#cfc7b8'),
          kasten(0, 0.208, 0.14, 0.88, 0.012, 0.96, PAPIER), kasten(0.004, 0.198, 0.15, 0.88, 0.01, 0.96, '#f6f2ea'),
          bildflaeche(0.88, 0.94, FL + 'c-kalender.png').schieb(0, 0.19, 0.62)]
    # Spiralbindung
    for k in range(9):
        x = -0.36 + k * 0.09
        t.append(ring(0.03, 0.007, SILBER, 16, 6).dreh(ry=90).schieb(x, 0.205, 1.11))
    # Aufhänger und Nagel
    t += [stab((-0.12, 0.215, 1.15), (0, 0.215, 1.3), 0.008, SILBER), stab((0.12, 0.215, 1.15), (0, 0.215, 1.3), 0.008, SILBER),
          walze(0, 0.215, 1.3, 0.018, 0.04, METALL_DUNKEL, 'y')]
    # Stift am Band
    t += [stab((0.44, 0.2, 0.5), (0.5, 0.18, 0.95), 0.022, ROT), stab((0.44, 0.2, 0.5), (0.43, 0.2, 0.45), 0.012, SILBER),
          kette([(0.48, 0.2, 0.9), (0.5, 0.21, 1.08), (0.36, 0.215, 1.12)], 0.006, ANTHRAZIT)]
    return t


S['kalender'] = motiv('kalender', 'symbol', _kalender())


def _paket(x, y, b=0.62, t=0.48, h=0.42, rz=0):
    teile = [kasten(0, 0, 0, b, t, h, KRAFT), kasten(0, 0, h, b, 0.1, 0.004, '#e8d3a6'), kasten(0, -t / 2 - 0.002, h - 0.15, 0.1, 0.004, 0.15, '#e8d3a6'),
             kasten(0, -0.0, h - 0.002, 0.008, t, 0.004, '#a88752'),
             bildflaeche(0.34, 0.255, FL + 'c-paket.png').schieb(-b / 2 + 0.2 + 0.0, -t / 2 - 0.003, 0.17),
             kasten(b / 2 + 0.002, 0.0, 0.08, 0.004, 0.16, 0.12, WEISS), kasten(b / 2 + 0.004, 0.0, 0.1, 0.002, 0.1, 0.02, '#888')]
    teile[4].schieb(0.02, 0, 0)
    return [p.dreh(rz=rz).schieb(x, y, 0) for p in teile]


S['online'] = motiv('online', 'symbol', _laptop(0.15, 0.25, 1.15, 0.8, neig=-12) + _paket(-0.55, -0.35, 0.6, 0.46, 0.42, 6))


def _handelsbote():
    t = []
    W, H, a = 0.78, 1.0, 16
    # Vorderseite lehnt nach hinten, Rückseite stützt
    vorne = [kasten(0, 0.015, 0, W, 0.03, H, '#e6e1d5'), bildflaeche(W - 0.01, (W - 0.01) * 1.3, FL + 'c-handelsbote.png').schieb(0, -0.002, H / 2)]
    t += [p.dreh(rx=-a) for p in vorne]
    hinten = [kasten(0, 0.015, 0, W, 0.03, H, '#ddd7c9')]
    oy = H * math.sin(math.radians(a)) * 2 + 0.03
    t += [p.dreh(rx=a).schieb(0, oy, 0) for p in hinten]
    top = (0, H * math.sin(math.radians(a)) + 0.015, H * math.cos(math.radians(a)))
    t.append(walze(top[0], top[1], top[2] - 0.01, 0.032, W, '#e6e1d5', 'x'))
    # Seitenkanten: gefaltete Lagen
    t += [stab((W / 2 + 0.001, 0.015 + 0.004 * k, 0.02), (W / 2 + 0.001, top[1] - 0.004, top[2] - 0.03), 0.003, '#c9c1b2') for k in (1, 3)]
    return t


S['zeitung'] = motiv('zeitung', 'symbol', _handelsbote())


def _buch():
    t = []
    B, L = 0.72, 1.0
    def hz(x): u = abs(x) / B; return 0.09 + 0.15 * math.sin(math.pi * u * 0.8)
    t += [kasten(-B / 2 - 0.02, 0, 0, B + 0.06, L + 0.08, 0.035, HOLZ_ROT), kasten(B / 2 + 0.02, 0, 0, B + 0.06, L + 0.08, 0.035, HOLZ_ROT),
          walze(0, 0, 0.0, 0.05, L + 0.08, '#6e2c19', 'y').schieb(0, 0, 0.03)]
    for s, bild in ((-1, 'c-buch-links.png'), (1, 'c-buch-rechts.png')):
        xs = [s * B * k / 30 for k in range(31)]
        prof = [(x, hz(x)) for x in xs] + [(s * B, 0.035), (0, 0.035)]
        t.append(prisma(prof, L, '#f1e9d6').schieb(0, -L / 2, 0))
        if s < 0:
            t.append(gitter(lambda u, v: (-B + B * u, -L / 2 + L * v, hz(-B + B * u) + 0.002), 30, 1, bild=FL + bild))
        else:
            t.append(gitter(lambda u, v: (B * u, -L / 2 + L * v, hz(B * u) + 0.002), 30, 1, bild=FL + bild))
        for f in (0.35, 0.6, 0.85):
            band = [(x, 0.035 + (hz(x) - 0.035) * f) for x in xs]
            pg = band + [(x, z - 0.006) for x, z in reversed(band)]
            t.append(prisma(pg, 0.004, '#d9cdb5').schieb(0, -L / 2 - 0.003, 0))
    # Lesebändchen
    t += [kasten(0.06, -0.1, hz(0.06) + 0.003, 0.035, 0.85, 0.003, ROT), kasten(0.06, -L / 2 - 0.01, 0.0, 0.035, 0.004, hz(0.06) + 0.006, ROT),
          kasten(0.06, -L / 2 - 0.08, 0.0, 0.035, 0.14, 0.003, ROT)]
    return t


S['chronik'] = motiv('chronik', 'symbol', _buch())


def _pokal(x=0, y=0, z=0, s=1.0, sockel=True):
    t = []
    if sockel:
        t += [kasten(0, 0, 0, 0.62, 0.62, 0.26, '#3a2e28'), kasten(0, 0, 0.26, 0.5, 0.5, 0.06, '#4a3a30'),
              kasten(0, -0.312, 0.07, 0.36, 0.006, 0.12, GOLD), kasten(0, -0.316, 0.115, 0.22, 0.003, 0.012, GOLD_D), kasten(0, -0.316, 0.095, 0.16, 0.003, 0.01, GOLD_D)]
    b = 0.32 if sockel else 0
    prof = [(0, b), (0.21, b), (0.21, b + 0.04), (0.13, b + 0.07), (0.05, b + 0.12), (0.045, b + 0.24), (0.085, b + 0.27), (0.045, b + 0.3), (0.05, b + 0.35),
            (0.13, b + 0.4), (0.23, b + 0.48), (0.3, b + 0.62), (0.34, b + 0.77), (0.355, b + 0.82), (0.32, b + 0.82), (0.29, b + 0.7), (0, b + 0.58)]
    t.append(drehkoerper(prof, GOLD, 48))
    t.append(ring(0.34, 0.018, GOLD_D, 48, 8).schieb(0, 0, b + 0.8))
    for w in (45, 225):
        t.append(ring(0.15, 0.03, GOLD, 24, 8, -110, 110).dreh(rx=90).schieb(0.3, 0, b + 0.6).dreh(rz=w))
    t.append(drehkoerper([(0.21, b + 0.035), (0.23, b + 0.035), (0.23, b + 0.045), (0.21, b + 0.045)], GOLD_D, 48))
    return [p.skal(s).schieb(x, y, z) for p in t]


S['pokal'] = motiv('pokal', 'symbol', _pokal())


def _podest():
    t = []
    for x, h, n, top in ((-0.62, 0.46, 2, SILBER), (0, 0.7, 1, GOLD), (0.62, 0.32, 3, '#c98a4b')):
        t += [kasten(x, 0, 0, 0.6, 0.6, h, '#f1ece3'), kasten(x, 0, h, 0.6, 0.6, 0.05, top),
              kasten(x, -0.302, 0, 0.6, 0.006, 0.05, '#cfc7b8'),
              bildflaeche(min(0.34, h - 0.1), min(0.34, h - 0.1), FL + f'c-platz-{n}.png').schieb(x, -0.302, (h + 0.05) / 2)]
    t += _pokal(0, 0, 0.75, 0.38, False)
    return t


S['podest'] = motiv('podest', 'symbol', _podest())


def _aktenschrank():
    t = []
    B, T_, H = 0.72, 0.78, 1.36; farbe, front = '#aeb4ba', '#c6cbd0'
    t += [kasten(0, 0, 0, B, T_, 0.06, METALL_DUNKEL), kasten(0, 0, 0.06, B, T_, H - 0.06, farbe), kasten(0, 0, H, B + 0.02, T_ + 0.02, 0.03, METALL)]
    for k, z in enumerate((0.1, 0.52)):
        t += [kasten(0, -T_ / 2 - 0.012, z, B - 0.06, 0.024, 0.38, front),
              kasten(0, -T_ / 2 - 0.03, z + 0.26, 0.3, 0.012, 0.035, SILBER_H), kasten(-0.13, -T_ / 2 - 0.02, z + 0.25, 0.03, 0.02, 0.05, SILBER), kasten(0.13, -T_ / 2 - 0.02, z + 0.25, 0.03, 0.02, 0.05, SILBER),
              kasten(0, -T_ / 2 - 0.026, z + 0.1, 0.24, 0.008, 0.1, METALL_DUNKEL), bildflaeche(0.21, 0.084, FL + 'c-schild.png').schieb(0, -T_ / 2 - 0.031, z + 0.15)]
    # obere Schublade herausgezogen
    z = 0.94; dy = -0.42
    t += [kasten(0, -T_ / 2 - 0.001, z, B - 0.06, 0.004, 0.38, '#2e3033')]
    t += [kasten(-B / 2 + 0.05, -T_ / 2 + dy / 2 + 0.02, z + 0.04, 0.02, -dy + 0.06, 0.28, front), kasten(B / 2 - 0.05, -T_ / 2 + dy / 2 + 0.02, z + 0.04, 0.02, -dy + 0.06, 0.28, front),
          kasten(0, -T_ / 2 + dy / 2 + 0.02, z + 0.04, B - 0.1, -dy + 0.06, 0.02, front)]
    fy = -T_ / 2 + dy
    t += [kasten(0, fy - 0.012, z, B - 0.06, 0.024, 0.38, front),
          kasten(0, fy - 0.03, z + 0.26, 0.3, 0.012, 0.035, SILBER_H), kasten(-0.13, fy - 0.02, z + 0.25, 0.03, 0.02, 0.05, SILBER), kasten(0.13, fy - 0.02, z + 0.25, 0.03, 0.02, 0.05, SILBER),
          kasten(0, fy - 0.026, z + 0.1, 0.24, 0.008, 0.1, METALL_DUNKEL), bildflaeche(0.21, 0.084, FL + 'c-schild.png').schieb(0, fy - 0.031, z + 0.15)]
    # Hängemappen
    for k, c in enumerate(['#2f5d7c', '#6d8f5e', '#e0b04a', '#2f5d7c', ROT, '#9a6fa8', '#6d8f5e']):
        yy = fy + 0.08 + k * 0.065
        t += [kasten(0, yy, z + 0.06, B - 0.14, 0.012, 0.3, '#e9e4da' if k % 2 else '#d9cdb5'),
              kasten(-0.18 + (k % 4) * 0.12, yy, z + 0.36, 0.1, 0.014, 0.06, c)]
    return t


S['speichern'] = motiv('speichern', 'symbol', _aktenschrank())


def _aktenregal():
    t = []
    B, T_, H = 1.3, 0.48, 1.42
    t += [kasten(-B / 2 + 0.025, 0, 0, 0.05, T_, H, HOLZ), kasten(B / 2 - 0.025, 0, 0, 0.05, T_, H, HOLZ),
          kasten(0, T_ / 2 - 0.01, 0, B, 0.02, H, '#a77b50')]
    for z in (0.0, 0.08, 0.72, H - 0.04):
        t.append(kasten(0, 0, z, B - 0.1, T_, 0.04 if z else 0.08, HOLZ))
    reihen = [(0.12, [1, 2, 3, 4, 3, 1, 2]), (0.76, [2, 3, 1, 4, 2])]
    for z0, folge in reihen:
        x = -B / 2 + 0.05 + 0.07
        for k, n in enumerate(folge):
            c = {1: '#2f5d7c', 2: '#6d8f5e', 3: ROT, 4: '#c98a4b'}[n]
            t += [kasten(x, -0.02, z0, 0.11, 0.4, 0.5, c), bildflaeche(0.106, 0.4, FL + f'c-ordner-{n}.png').schieb(x, -0.221, z0 + 0.25)]
            x += 0.12
        if z0 > 0.5:
            # schräg gelehnter Ordner und Archivkarton
            t += [kasten(x + 0.02, -0.02, z0, 0.11, 0.4, 0.5, '#2f5d7c', ry=22, um=(x - 0.04, -0.02, z0)),
                  bildflaeche(0.106, 0.4, FL + 'c-ordner-1.png').schieb(x + 0.02, -0.221, z0 + 0.25).dreh(ry=22, um=(x - 0.04, -0.02, z0))]
            t += [kasten(0.42, -0.02, z0, 0.3, 0.4, 0.3, KRAFT), kasten(0.42, -0.222, z0 + 0.12, 0.12, 0.004, 0.08, WEISS), kasten(0.42, -0.02, z0 + 0.3, 0.32, 0.42, 0.03, '#b8935b')]
    return t


S['spielstaende'] = motiv('spielstaende', 'symbol', _aktenregal())


def _zahnraeder():
    t = [kasten(0, 0.05, 0, 1.45, 0.55, 0.08, HOLZ), kasten(0, 0.05, -0.04, 1.4, 0.5, 0.04, '#7a5636')]
    raeder = [(-0.28, 0.66, 0.4, 14, SILBER, 0), (0.42, 0.37, 0.23, 8, GOLD, 12), (0.23, 1.07, 0.16, 6, PETROL, 8)]
    for x, z, R, n, c, w in raeder:
        t.append(kasten(x, 0.18, 0.08, 0.09, 0.08, z - 0.08, METALL_DUNKEL))
        t.append(zahnrad(R, n, 0.08, c, zahn=0.2).dreh(ry=w).schieb(x, -0.04, z))
        t.append(walze(x, -0.06, z, R * 0.32, 0.04, c if c != SILBER else '#b4b9bf', 'y'))
        t.append(walze(x, -0.085, z, R * 0.12, 0.02, METALL_DUNKEL, 'y'))
        if R > 0.3:
            for k in range(4):
                a = math.radians(45 + 90 * k); t.append(walze(x + 0.22 * math.cos(a), -0.042, z + 0.22 * math.sin(a), 0.07, 0.006, '#7e848a', 'y'))
        t.append(walze(x, 0.06, z, 0.025, 0.16, METALL_DUNKEL, 'y'))
    t += [schrauben([(sx * 0.65, -0.18, 0.08) for sx in (-1, 1)], 0.03, METALL_DUNKEL, 'z', 0.012)]
    return t


S['einstellungen'] = motiv('einstellungen', 'symbol', _zahnraeder())


def _box():
    t = [kasten(0, 0, 0.03, 0.62, 0.52, 0.95, NUSS), kasten(0, -0.262, 0.05, 0.58, 0.012, 0.91, ANTHRAZIT)]
    t += [kasten(x, y, 0, 0.06, 0.06, 0.03, '#26282b') for x in (-0.25, 0.25) for y in (-0.2, 0.2)]
    def treiber(z, R, kalotte=False):
        d = [ring(R + 0.012, 0.01, SILBER, 40, 6).dreh(rx=90).schieb(0, -0.27, z), ring(R - 0.01, 0.022, '#26282b', 40, 8).dreh(rx=90).schieb(0, -0.27, z)]
        if kalotte:
            d.append(drehkoerper([(0, -0.07), (R * 0.5, -0.06), (R * 0.75, -0.035), (R - 0.02, 0)], '#4a4d52', 24, 'y').schieb(0, -0.27, z))
        else:
            d += [drehkoerper([(R - 0.02, 0.0), (R * 0.32, 0.06), (R * 0.32, 0.061)], '#4a4d52', 40, 'y').schieb(0, -0.27, z),
                  drehkoerper([(0, 0.02), (R * 0.2, 0.03), (R * 0.32, 0.06)], '#2a2b2e', 24, 'y').schieb(0, -0.27, z)]
        d.append(schrauben([(0.0 + (R + 0.04) * math.cos(math.radians(a)), -0.275, z + (R + 0.04) * math.sin(math.radians(a))) for a in (45, 135, 225, 315)], 0.012, SILBER))
        return d
    t += treiber(0.38, 0.2) + treiber(0.77, 0.075, True)
    t += [kasten(0, -0.268, 0.1, 0.22, 0.012, 0.05, '#1d1f22'), kasten(0, -0.27, 0.098, 0.24, 0.006, 0.054, SILBER)]
    t += [bildflaeche(0.06, 0.06, FL + 'c-logo.png').schieb(0.2, -0.27, 0.92)]
    return t


S['klang'] = motiv('klang', 'symbol', _box())


def _infotafel():
    t = []
    for x in (-0.54, 0.54):
        t += [kasten(x, 0, 0, 0.14, 0.14, 0.06, STEIN_D), kasten(x, 0, 0.06, 0.08, 0.08, 1.62, HOLZ)]
    t += [kasten(0, 0.0, 0.42, 1.0, 0.07, 1.2, HOLZ_ROT), kasten(0, -0.03, 0.47, 0.92, 0.02, 1.1, '#f1ece3'),
          bildflaeche(0.88, 1.056, FL + 'c-info.png').schieb(0, -0.041, 1.02)]
    t.append(prisma([(-0.24, 0), (0.24, 0), (0, 0.17)], 1.32, '#4a5a66').dreh(rz=90).schieb(0.66, 0.0, 1.66))
    t.append(kasten(0, 0, 1.62, 1.22, 0.16, 0.05, HOLZ_ROT))
    # Prospektkasten am Pfosten
    t += [kasten(0.54, -0.12, 0.62, 0.26, 0.12, 0.3, PETROL), kasten(0.54, -0.12, 0.92, 0.24, 0.1, 0.004, '#195a71'),
          kasten(0.54, -0.12, 0.86, 0.18, 0.04, 0.16, PAPIER, rx=-8), kasten(0.54, -0.182, 0.7, 0.14, 0.004, 0.08, WEISS)]
    t.append(schrauben([(x, -0.045, z) for x in (-0.45, 0.45) for z in (0.5, 1.55)], 0.015, SILBER))
    return t


S['einfuehrung'] = motiv('einfuehrung', 'symbol', _infotafel())


def _stoppuhr():
    t = []
    t += [drehkoerper([(0, 0), (0.47, 0), (0.52, 0.03), (0.53, 0.09), (0.5, 0.17), (0, 0.18)], SILBER, 64, 'y'),
          ring(0.49, 0.035, '#a9aeb4', 64, 10).dreh(rx=90).schieb(0, -0.005, 0),
          bildscheibe(0.465, FL + 'c-ziffernblatt.png').schieb(0, -0.012, 0)]
    t += [walze(0, 0.09, 0.5, 0.05, 0.1, '#a9aeb4'), walze(0, 0.09, 0.6, 0.085, 0.07, SILBER), walze(0, 0.09, 0.67, 0.07, 0.012, '#a9aeb4'),
          ring(0.1, 0.022, SILBER, 32, 8).dreh(rx=90).schieb(0, 0.09, 0.79)]
    a = math.radians(42)
    t += [stab((0.5 * math.cos(a), 0.09, 0.5 * math.sin(a)), (0.6 * math.cos(a), 0.09, 0.6 * math.sin(a)), 0.035, '#a9aeb4'),
          stab((0.6 * math.cos(a), 0.09, 0.6 * math.sin(a)), (0.66 * math.cos(a), 0.09, 0.66 * math.sin(a)), 0.055, ROT)]
    a = math.radians(138)
    t += [stab((0.5 * math.cos(a), 0.09, 0.5 * math.sin(a)), (0.6 * math.cos(a), 0.09, 0.6 * math.sin(a)), 0.035, '#a9aeb4'),
          stab((0.6 * math.cos(a), 0.09, 0.6 * math.sin(a)), (0.66 * math.cos(a), 0.09, 0.66 * math.sin(a)), 0.055, SILBER)]
    return [p.dreh(rz=22) for p in t]


S['messung'] = motiv('messung', 'symbol', _stoppuhr())


def _liegestuhl():
    t = []
    h = HOLZ
    for s in (-1, 1):
        t += [stab((s * 0.34, -0.62, 0.0), (s * 0.34, 0.44, 1.08), 0.03, h), stab((s * 0.29, 0.56, 0.0), (s * 0.29, -0.44, 0.47), 0.03, h),
              walze(s * 0.315, -0.1, 0.39, 0.025, 0.03, METALL_DUNKEL, 'x')]
    t += [stab((-0.37, 0.44, 1.08), (0.37, 0.44, 1.08), 0.032, h), stab((-0.32, -0.44, 0.47), (0.32, -0.44, 0.47), 0.03, h),
          stab((-0.32, 0.5, 0.06), (0.32, 0.5, 0.06), 0.025, h), stab((-0.37, -0.56, 0.06), (0.37, -0.56, 0.06), 0.025, h)]
    def p(u, v):
        x = -0.3 + 0.6 * u
        y = -0.44 + 0.88 * v; z = 0.47 + 0.61 * v - 0.3 * math.sin(math.pi * v) ** 1.2
        return (x, y - 0.06 * math.sin(math.pi * v), z + 0.035)
    t.append(gitter(p, 6, 20, bild=FL + 'c-streifen.png'))
    t.append(gitter(lambda u, v: (lambda q: (q[0], q[1] + 0.004, q[2] - 0.012))(p(u, v)), 6, 20, '#195a71'))
    # Beistelltisch mit Glas
    tx, ty = 0.78, -0.2
    t += [walze(tx, ty, 0.44, 0.22, 0.03, HOLZ), walze(tx, ty, 0.0, 0.03, 0.44, HOLZ), walze(tx, ty, 0, 0.14, 0.02, HOLZ)]
    t += [drehkoerper([(0, 0.47), (0.06, 0.47), (0.07, 0.64), (0.062, 0.64), (0.054, 0.49), (0, 0.49)], '#e8f1f5', 24).schieb(tx, ty, 0),
          drehkoerper([(0, 0.49), (0.054, 0.49), (0.062, 0.6), (0, 0.6)], '#f2d38a', 24).schieb(tx, ty, 0),
          stab((tx + 0.01, ty, 0.5), (tx + 0.05, ty - 0.02, 0.74), 0.008, ROT),
          drehkoerper([(0, -0.012), (0.035, -0.01), (0.04, 0), (0, 0.004)], '#e0b04a', 16).dreh(ry=70).schieb(tx - 0.05, ty - 0.02, 0.63)]
    return t


S['ruhestand'] = motiv('ruhestand', 'symbol', _liegestuhl())


def _werkzeugkiste():
    t = []
    B, T_, H, w = 1.0, 0.5, 0.38, 0.03; c, c2 = '#2f5d7c', '#244b66'
    t += [kasten(0, 0, 0, B, T_, w, c2), kasten(0, -T_ / 2 + w / 2, 0, B, w, H, c), kasten(0, T_ / 2 - w / 2, 0, B, w, H, c),
          kasten(-B / 2 + w / 2, 0, 0, w, T_, H, c), kasten(B / 2 - w / 2, 0, 0, w, T_, H, c),
          kasten(0, -T_ / 2 - 0.004, H - 0.06, B + 0.01, 0.01, 0.03, c2), kasten(B / 2 + 0.004, 0, H - 0.06, 0.01, T_ + 0.01, 0.03, c2)]
    for s in (-1, 1):
        t.append(prisma([(-0.12, 0), (0.12, 0), (0.05, 0.3), (-0.05, 0.3)], 0.03, c).dreh(rz=90).schieb(s * (B / 2 - 0.02) + (0.03 if s < 0 else 0), 0, H - 0.02))
    t.append(stab((-B / 2 + 0.02, 0, H + 0.24), (B / 2 - 0.02, 0, H + 0.24), 0.03, SILBER))
    t += [kasten(x, -T_ / 2 - 0.012, H - 0.12, 0.08, 0.02, 0.1, SILBER) for x in (-0.3, 0.3)]
    t += [bildflaeche(0.1, 0.1, FL + 'c-logo.png').schieb(0, -T_ / 2 - 0.003, 0.17)]
    # Hammer
    t += [stab((-0.3, 0.06, 0.05), (-0.18, 0.08, 0.82), 0.03, HOLZ), kasten(-0.18, 0.08, 0.78, 0.34, 0.07, 0.08, METALL_DUNKEL, ry=-9, rz=10),
          kasten(-0.03, 0.105, 0.808, 0.06, 0.05, 0.05, METALL_DUNKEL, ry=-9, rz=10)]
    # Schraubendreher
    t += [stab((0.15, -0.08, 0.05), (0.22, -0.06, 0.45), 0.012, SILBER), stab((0.22, -0.06, 0.45), (0.27, -0.045, 0.72), 0.04, '#e0b04a'),
          stab((0.27, -0.045, 0.72), (0.28, -0.04, 0.76), 0.03, ANTHRAZIT)]
    # Schraubenschlüssel
    sl = prisma([(-0.025, 0), (0.025, 0), (0.025, 0.55), (0.06, 0.6), (0.05, 0.68), (0.015, 0.64), (-0.015, 0.64), (-0.05, 0.68), (-0.06, 0.6), (-0.025, 0.55)], 0.02, SILBER)
    t.append(sl.dreh(ry=14).schieb(0.32, 0.08, 0.04))
    # Zollstock
    t += [kasten(-0.1, 0.13, 0.05, 0.05, 0.02, 0.5, '#e0b04a', ry=-4)]
    return t


S['werkzeuge'] = motiv('werkzeuge', 'symbol', _werkzeugkiste())


def _ablage():
    t = []
    B, T_ = 0.82, 1.0; c = HOLZ_HELL; c2 = '#c7ad86'
    for k, z in enumerate((0.0, 0.32, 0.64)):
        t += [kasten(0, 0, z, B, T_, 0.03, c), kasten(-B / 2 + 0.015, 0, z + 0.03, 0.03, T_, 0.12, c2), kasten(B / 2 - 0.015, 0, z + 0.03, 0.03, T_, 0.12, c2),
              kasten(0, T_ / 2 - 0.015, z + 0.03, B - 0.06, 0.03, 0.14, c2), kasten(0, -T_ / 2 + 0.015, z + 0.03, B - 0.06, 0.03, 0.05, c2)]
        n = [5, 3, 6][k]
        for j in range(n):
            t.append(kasten(0.01 * (j % 2), 0.03 - 0.03 * (j % 3), z + 0.03 + j * 0.012, 0.62, 0.86, 0.01, '#f7f5f0' if j % 2 else '#eceae4', rz=(j % 3 - 1) * 1.5))
        if k == 2:
            t.append(oben(bildflaeche(0.62, 0.84, FL + 'c-blatt.png')).schieb(0.0, 0.03, z + 0.03 + n * 0.012 + 0.001))
        if k == 1:
            t += [kasten(0.03, -0.08, z + 0.03 + n * 0.012, 0.64, 0.84, 0.02, '#2f5d7c', rz=-4), kasten(0.03, -0.08, z + 0.05 + n * 0.012, 0.3, 0.2, 0.003, WEISS, rz=-4)]
    for x in (-B / 2 + 0.05, B / 2 - 0.05):
        for y in (-T_ / 2 + 0.06, T_ / 2 - 0.06):
            t.append(walze(x, y, 0.03, 0.018, 0.74, SILBER))
    return t


S['menue'] = motiv('menue', 'symbol', _ablage())
