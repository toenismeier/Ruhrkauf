# Gruppe A: Haus und Betrieb (E47 P4). Motive siehe ILLUSTRATIONEN.md.
# Eigene Bausteine: Netz() baut beliebig gedrehte Quader, Walzen, Prismen und Bildflächen
# und schreibt sie als GLB nach .assets/haus-netze/ (wird beim Import neu erzeugt).
import os, json, struct, math
from werkzeug import *

HIER = os.path.dirname(os.path.abspath(__file__))
NETZE = os.path.join(HIER, '..', '.assets', 'haus-netze')
FL = 'flaechen/'

def _lin(h):
    h = h.lstrip('#'); return [(int(h[i:i+2], 16) / 255) ** 2.2 for i in (0, 2, 4)]

def _rot(p, rx, ry, rz):
    x, y, z = p
    a = math.radians(rx); y, z = y * math.cos(a) - z * math.sin(a), y * math.sin(a) + z * math.cos(a)
    a = math.radians(ry); x, z = x * math.cos(a) + z * math.sin(a), -x * math.sin(a) + z * math.cos(a)
    a = math.radians(rz); x, y = x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)
    return (x, y, z)

def _ohr(poly):
    """Ohrenschnitt für ein einfaches Polygon (2D, beliebiger Umlaufsinn) -> Dreiecke als Indextripel."""
    n = len(poly); idx = list(range(n))
    fl = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
    if fl < 0: idx.reverse()
    def kreuz(a, b, c): return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    def innen(p, a, b, c): return kreuz(a, b, p) >= 0 and kreuz(b, c, p) >= 0 and kreuz(c, a, p) >= 0
    out = []; schutz = 0
    while len(idx) > 3 and schutz < 10000:
        schutz += 1
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            a, b, c = poly[i0], poly[i1], poly[i2]
            if kreuz(a, b, c) <= 1e-12: continue
            if any(innen(poly[j], a, b, c) for j in idx if j not in (i0, i1, i2)): continue
            out.append((i0, i1, i2)); idx.pop(k); break
        else: break
    if len(idx) == 3: out.append(tuple(idx))
    return out, fl < 0

class Netz:
    """Sammelt Teile (je Farbe ein Material) und schreibt eine GLB. Koordinaten wie q(): z nach oben, Vorderseite -y."""
    def __init__(self, dreh=None): self.teile = {}; self.dreh = dreh  # dreh: Drehung (rx,ry,rz) des ganzen Netzes um den Ursprung
    def _teil(self, farbe, bild=None):
        k = (farbe, bild)
        if k not in self.teile: self.teile[k] = [[], [], [], bild]
        return self.teile[k]
    def _setze(self, verts, flaechen, farbe, pos, rot, um, bild=None, uvs=None):
        t = self._teil(farbe, bild); o = len(t[0])
        for v in verts:
            p = (v[0] - um[0], v[1] - um[1], v[2] - um[2]); p = _rot(p, *rot)
            p = (p[0] + um[0] + pos[0], p[1] + um[1] + pos[1], p[2] + um[2] + pos[2])
            t[0].append(_rot(p, *self.dreh) if self.dreh else p)
        t[2].extend(uvs or [(0, 0)] * len(verts))
        for f in flaechen:
            for i in range(1, len(f) - 1): t[1].append((o + f[0], o + f[i], o + f[i + 1]))
        return self
    def kasten(self, x, y, z, b, t, h, farbe, rx=0, ry=0, rz=0, um=None):
        """Quader mit Unterkante-Mitte (x,y,z); Drehung in Grad um um (relativ zur Unterkante-Mitte, Standard: dort)."""
        b2, t2 = b / 2, t / 2
        v = [(-b2, -t2, 0), (b2, -t2, 0), (b2, t2, 0), (-b2, t2, 0), (-b2, -t2, h), (b2, -t2, h), (b2, t2, h), (-b2, t2, h)]
        f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        return self._setze(v, f, farbe, (x, y, z), (rx, ry, rz), um or (0, 0, 0))
    def walze(self, x, y, z, r, h, farbe, rx=0, ry=0, rz=0, ecken=32, r2=None, um=None, deckel=True):
        """Zylinder/Kegelstumpf entlang lokaler z-Achse, Boden-Mitte (x,y,z). r2: oberer Radius."""
        r2 = r if r2 is None else r2; v = []
        for k in range(ecken):
            a = 2 * math.pi * k / ecken; v.append((r * math.cos(a), r * math.sin(a), 0))
        for k in range(ecken):
            a = 2 * math.pi * k / ecken; v.append((r2 * math.cos(a), r2 * math.sin(a), h))
        f = [(k, (k + 1) % ecken, ecken + (k + 1) % ecken, ecken + k) for k in range(ecken)]
        if deckel:
            f.append(tuple(reversed(range(ecken))))
            if r2 > 0: f.append(tuple(range(ecken, 2 * ecken)))
        return self._setze(v, f, farbe, (x, y, z), (rx, ry, rz), um or (0, 0, 0))
    def prisma(self, punkte, tiefe, farbe, x=0, y=0, z=0, ebene='xz', rx=0, ry=0, rz=0, um=None):
        """Polygon (2D) extrudiert. ebene 'xz': Punkte (x,z), Tiefe entlang y (Mitte bei y). 'xy': Punkte (x,y), Höhe entlang z ab z.
        'yz': Punkte (y,z), Tiefe entlang x."""
        n = len(punkte); tris, gedreht = _ohr(punkte)
        def p3(p, d):
            if ebene == 'xz': return (p[0], d, p[1])
            if ebene == 'xy': return (p[0], p[1], d)
            return (d, p[0], p[1])
        if ebene == 'xy': d0, d1 = 0, tiefe
        else: d0, d1 = -tiefe / 2, tiefe / 2
        v = [p3(p, d0) for p in punkte] + [p3(p, d1) for p in punkte]
        # Normalen nach außen: Dreiecke aus _ohr sind immer gegen den Uhrzeigersinn (2D).
        f = []
        for a, b, c in tris:
            if ebene == 'xz': f.append((a, b, c)); f.append((n + c, n + b, n + a))
            else: f.append((n + a, n + b, n + c)); f.append((c, b, a))
        ccw = not gedreht
        if ebene == 'xz': ccw = not ccw
        for k in range(n):
            k2 = (k + 1) % n
            f.append((k, k2, n + k2, n + k) if ccw else (k2, k, n + k, n + k2))
        return self._setze(v, f, farbe, (x, y, z), (rx, ry, rz), um or (0, 0, 0))
    def tafel(self, x, y, z, b, h, bild, rx=0, ry=0, rz=0, um=None, oben=False):
        """Bildfläche: senkrecht zur Kamera (Vorderseite -y), Unterkante-Mitte (x,y,z); oben=True: liegend, Bild-Oberkante nach +y."""
        b2 = b / 2
        if oben: v = [(-b2, 0, 0), (b2, 0, 0), (b2, h, 0), (-b2, h, 0)]
        else: v = [(-b2, 0, 0), (b2, 0, 0), (b2, 0, h), (-b2, 0, h)]
        uv = [(0, 1), (1, 1), (1, 0), (0, 0)]
        return self._setze(v, [(0, 1, 2, 3)], '#ffffff', (x, y, z), (rx, ry, rz), um or (0, 0, 0), bild=bild, uvs=uv)
    def kugel(self, x, y, z, r, farbe, ringe=12, ecken=20, sz=1.0):
        """Kugel mit Mittelpunkt (x,y,z); sz staucht/streckt in z."""
        v = [(0, 0, -r * sz)]
        for i in range(1, ringe):
            a = math.pi * i / ringe - math.pi / 2
            for k in range(ecken):
                b = 2 * math.pi * k / ecken; v.append((r * math.cos(a) * math.cos(b), r * math.cos(a) * math.sin(b), r * math.sin(a) * sz))
        v.append((0, 0, r * sz)); top = len(v) - 1; f = []
        for k in range(ecken): f.append((0, 1 + (k + 1) % ecken, 1 + k))
        for i in range(ringe - 2):
            for k in range(ecken):
                a0 = 1 + i * ecken; a1 = a0 + ecken
                f.append((a0 + k, a0 + (k + 1) % ecken, a1 + (k + 1) % ecken, a1 + k))
        o = 1 + (ringe - 2) * ecken
        for k in range(ecken): f.append((o + k, o + (k + 1) % ecken, top))
        return self._setze(v, f, farbe, (x, y, z), (0, 0, 0), (0, 0, 0))
    def bogen(self, x, y, z, r, a0, a1, dicke, h, farbe, schritte=None):
        """Gebogene Wand (Kreisbogen um (x,y), Winkel a0..a1 in Grad, gemessen von +x gegen den Uhrzeigersinn)."""
        n = schritte or max(2, int(abs(a1 - a0) / 6)); ri, ra = r - dicke / 2, r + dicke / 2; v = []
        for k in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * k / n); c, s = math.cos(a), math.sin(a)
            v += [(ri * c, ri * s, 0), (ra * c, ra * s, 0), (ra * c, ra * s, h), (ri * c, ri * s, h)]
        f = []
        for k in range(n):
            i, j = 4 * k, 4 * (k + 1)
            f += [(i + 1, j + 1, j + 2, i + 2), (j, i, i + 3, j + 3), (i + 3, i + 2, j + 2, j + 3), (i, j, j + 1, i + 1)]
        f += [(0, 1, 2, 3), (4 * n + 1, 4 * n, 4 * n + 3, 4 * n + 2)]
        if a1 < a0: f = [tuple(reversed(q_)) for q_ in f]
        return self._setze(v, f, farbe, (x, y, z), (0, 0, 0), (0, 0, 0))
    def flaeche(self, punkte, farbe):
        """Einzelne ebene Fläche aus 3D-Punkten (gegen den Uhrzeigersinn von außen gesehen)."""
        return self._setze(punkte, [tuple(range(len(punkte)))], farbe, (0, 0, 0), (0, 0, 0), (0, 0, 0))
    def glb(self, name):
        os.makedirs(NETZE, exist_ok=True); pfad = os.path.join(NETZE, name + '.glb')
        bin_ = bytearray(); views = []; acc = []; mats = []; prims = []; bilder = []; texs = []
        def ablage(daten, ziel=None):
            while len(bin_) % 4: bin_.append(0)
            o = len(bin_); bin_.extend(daten); v = {'buffer': 0, 'byteOffset': o, 'byteLength': len(daten)}
            if ziel: v['target'] = ziel
            views.append(v); return len(views) - 1
        for (farbe, bild), (verts, tris, uvs, _) in self.teile.items():
            if not tris: continue
            # glTF ist y-oben: Blender (X,Y,Z) -> glTF (X, Z, -Y)
            g = [(p[0], p[2], -p[1]) for p in verts]
            pv = ablage(b''.join(struct.pack('<3f', *p) for p in g), 34962)
            mn = [min(p[i] for p in g) for i in range(3)]; mx = [max(p[i] for p in g) for i in range(3)]
            acc.append({'bufferView': pv, 'componentType': 5126, 'count': len(g), 'type': 'VEC3', 'min': mn, 'max': mx}); ap = len(acc) - 1
            iv = ablage(b''.join(struct.pack('<3I', *t) for t in tris), 34963)
            acc.append({'bufferView': iv, 'componentType': 5125, 'count': len(tris) * 3, 'type': 'SCALAR'}); ai = len(acc) - 1
            attr = {'POSITION': ap}
            m = {'name': (farbe if not bild else 'bild-' + os.path.basename(bild).split('.')[0]), 'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 1}}
            if bild:
                uv = ablage(b''.join(struct.pack('<2f', *u) for u in uvs), 34962)
                acc.append({'bufferView': uv, 'componentType': 5126, 'count': len(uvs), 'type': 'VEC2'}); attr['TEXCOORD_0'] = len(acc) - 1
                with open(os.path.join(HIER, '..', bild), 'rb') as f: bv = ablage(f.read())
                bilder.append({'bufferView': bv, 'mimeType': 'image/png'}); texs.append({'source': len(bilder) - 1, 'sampler': 0})
                m['pbrMetallicRoughness']['baseColorTexture'] = {'index': len(texs) - 1}
            else:
                m['pbrMetallicRoughness']['baseColorFactor'] = _lin(farbe) + [1]
            mats.append(m); prims.append({'attributes': attr, 'indices': ai, 'material': len(mats) - 1})
        while len(bin_) % 4: bin_.append(0)
        j = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': name}],
             'meshes': [{'primitives': prims}], 'materials': mats, 'accessors': acc, 'bufferViews': views,
             'buffers': [{'byteLength': len(bin_)}]}
        if bilder: j.update(images=bilder, textures=texs, samplers=[{'magFilter': 9729, 'minFilter': 9987}])
        js = json.dumps(j).encode()
        while len(js) % 4: js += b' '
        with open(pfad, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
            f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
            f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bytes(bin_))
        return {'datei': os.path.relpath(pfad, os.path.join(HIER, '..'))}

# ---------------------------------------------------------------- Zusatzfarben (aus der Palette abgeleitet)
KARTON, KLEBE = '#c69a62', '#e3c99c'
ANTHRAZIT, GRAU_HELL, BODEN = '#3b3d40', '#c9ccd0', '#e3ddd2'
HOLZ_DUNKEL = '#7a5236'
BLAU, BLAU_HELL = '#2d5c9e', '#4a78b8'

S = {}
def motiv(name, netz, groesse='symbol', **k):
    d = {'groesse': groesse, 'teile': [netz.glb(name)]}; d.update(k); S[name] = d
def dunkler(h, f=0.78):
    h = h.lstrip('#'); return '#' + ''.join('%02x' % int(int(h[i:i+2], 16) * f) for i in (0, 2, 4))
def rad(n, x, y, z, r, b, farbe=SCHWARZ, nabe=METALL):
    """Rad mit Achse entlang y, Mitte (x,y,z), Breite b."""
    n.walze(x, y + b / 2, z, r, b, farbe, rx=90, ecken=24)
    n.walze(x, y - b / 2 + 0.002, z, r * 0.45, 0.006, nabe, rx=90, ecken=16)

def stab(n, p0, p1, r, farbe, ecken=12, kantig=False, r2=None):
    """Rundstab (oder Vierkant) von p0 nach p1; r2: Radius am Ende (Kegel)."""
    d = [p1[i] - p0[i] for i in range(3)]; l = math.sqrt(sum(c * c for c in d)); d = [c / l for c in d]
    a = math.degrees(math.asin(-d[1])); b = math.degrees(math.atan2(d[0], d[2]))
    if kantig: n.kasten(*p0, 2 * r, 2 * r, l, farbe, rx=a, ry=b)
    else: n.walze(*p0, r, l, farbe, rx=a, ry=b, ecken=ecken, r2=r2)

# ---------------------------------------------------------------- Kleidung (gemeinsam)
SCHNITTE = {
    'hemd':   [(-0.07, 0), (-0.21, -0.05), (-0.235, -0.13), (-0.215, -0.62), (0.215, -0.62), (0.235, -0.13), (0.21, -0.05), (0.07, 0), (0, -0.07)],
    'sakko':  [(-0.07, 0), (-0.22, -0.05), (-0.25, -0.14), (-0.235, -0.74), (0.235, -0.74), (0.25, -0.14), (0.22, -0.05), (0.07, 0), (0, -0.2)],
    'kleid':  [(-0.06, 0), (-0.16, -0.04), (-0.15, -0.3), (-0.27, -0.86), (0.27, -0.86), (0.15, -0.3), (0.16, -0.04), (0.06, 0), (0, -0.05)],
    'hose':   [(-0.17, 0), (0.17, 0), (0.16, -0.72), (0.025, -0.72), (0, -0.22), (-0.025, -0.72), (-0.16, -0.72)],
    'mantel': [(-0.07, 0), (-0.22, -0.05), (-0.26, -0.15), (-0.27, -0.95), (0.27, -0.95), (0.26, -0.15), (0.22, -0.05), (0.07, 0), (0, -0.18)],
}
def kleidung(n, x, y, z, art, farbe, dicke=0.05, knoepfe=True, buegel=True, haken_bis=None, s=1.0):
    """Kleidungsstück auf Bügel, Vorderseite -y; (x,y,z) = Bügelmitte oben; s skaliert."""
    P = lambda pts: [(a * s, b * s) for a, b in pts]
    n.prisma(P(SCHNITTE[art]), dicke, farbe, x=x, y=y, z=z)
    vy = y - dicke / 2
    if art in ('hemd', 'sakko', 'mantel'):
        tief = -0.07 if art == 'hemd' else -0.2
        n.prisma(P([(-0.075, 0), (-0.035, -0.012), (0, tief)]), 0.012, dunkler(farbe, 0.82), x=x, y=vy - 0.005, z=z)
        n.prisma(P([(0.075, 0), (0, tief), (0.035, -0.012)]), 0.012, dunkler(farbe, 0.82), x=x, y=vy - 0.005, z=z)
        if knoepfe:
            for k in range(3 if art != 'hemd' else 4):
                n.walze(x, vy, z - s * ((0.27 if art != 'hemd' else 0.14) + k * 0.11), 0.013 * s, 0.012, dunkler(farbe, 0.6), rx=90, ecken=12)
        if art in ('sakko', 'mantel'):
            for sx in (-1, 1): n.kasten(x + sx * 0.13 * s, vy - 0.003, z - 0.5 * s, 0.11 * s, 0.008, 0.012, dunkler(farbe, 0.7))
    if art == 'hose':
        n.kasten(x, vy - 0.002, z - 0.06 * s, 0.34 * s, 0.01, 0.02, dunkler(farbe, 0.75))
    if buegel:
        for sx in (-1, 1):
            n.kasten(x + sx * 0.11 * s, y, z - 0.012, 0.24 * s, 0.03, 0.022, HOLZ, ry=sx * 14, um=(-sx * 0.12 * s, 0, 0))
        hb = haken_bis if haken_bis else z + 0.09
        n.walze(x, y, z, 0.007, hb - z, METALL, ecken=10)

# ---------------------------------------------------------------- sortiment: Kleiderständer mit Bügelware
n = Netz()
L, H = 1.2, 1.38
for yy in (-L / 2, L / 2):
    n.kasten(0, yy, 0.05, 0.62, 0.06, 0.035, METALL_DUNKEL)
    for xx in (-0.27, 0.27): rad(n, xx, yy, 0.035, 0.035, 0.03)
    n.walze(0, yy, 0.085, 0.022, H - 0.085, METALL, ecken=20)
    n.kugel(0, yy, H + 0.03, 0.03, METALL)
n.walze(0, L / 2 + 0.02, H - 0.02, 0.019, L + 0.04, METALL, rx=90, ecken=20)
reihe = [('sakko', '#2f5d7c'), ('hemd', '#e9e4da'), ('sakko', '#2b2b2d'), ('kleid', '#d8a7a0'), ('hemd', '#6d8f5e'), ('mantel', '#c98a4b'), ('hemd', '#e9e4da'), ('sakko', '#9a6fa8')]
for k, (art, f) in enumerate(reihe):
    kleidung(n, 0, -0.46 + k * 0.13, H - 0.11, art, f, haken_bis=H - 0.005, s=1.12)
n.walze(0.18, -0.46 - 0.035, H - 0.33, 0.003, 0.1, SCHWARZ, ecken=6)
n.kasten(0.18, -0.46 - 0.035, H - 0.44, 0.08, 0.008, 0.12, ROT)
n.kasten(0.18, -0.46 - 0.04, H - 0.4, 0.05, 0.004, 0.014, WEISS)
motiv('sortiment', n)

# ---------------------------------------------------------------- ware: Kartons auf Palette mit Hubwagen
def palette(n, x, y, z=0):
    for xx in (-0.53, 0, 0.53):
        n.kasten(x + xx, y, z, 0.145, 0.8, 0.022, HOLZ)
        for yy in (-0.33, 0, 0.33):
            n.kasten(x + xx, y + yy, z + 0.022, 0.145, 0.14, 0.078, HOLZ_DUNKEL if yy else HOLZ)
        n.kasten(x + xx, y, z + 0.1, 0.145, 0.8, 0.022, HOLZ)
    for yy in (-0.335, -0.17, 0, 0.17, 0.335):
        n.kasten(x, y + yy, z + 0.122, 1.2, 0.13 if abs(yy) > 0.3 else 0.1, 0.022, HOLZ_HELL)
def karton(n, x, y, z, b, t, h, etikett=False, pfeile=False):
    n.kasten(x, y, z, b, t, h, KARTON)
    n.kasten(x, y, z + h, b * 0.985, 0.07, 0.003, KLEBE)
    n.kasten(x, y - t / 2 - 0.0015, z + h - 0.09, 0.07, 0.003, 0.09, KLEBE)
    n.kasten(x, y, z + h - 0.002, b - 0.004, 0.004, 0.005, dunkler(KARTON, 0.75))
    if etikett: n.tafel(x - b * 0.2, y - t / 2 - 0.003, z + h * 0.25, b * 0.4, b * 0.4 * 0.65, FL + 'a-etikett.png')
    if pfeile: n.tafel(x + b / 2 + 0.003, y, z + h * 0.35, t * 0.3, t * 0.3, FL + 'a-pfeile.png', rz=90)
n = Netz()
palette(n, 0, 0)
z0 = 0.144
karton(n, -0.3, -0.2, z0, 0.58, 0.38, 0.34, etikett=True)
karton(n, 0.3, -0.2, z0, 0.58, 0.38, 0.34, etikett=True, pfeile=True)
karton(n, -0.3, 0.2, z0, 0.58, 0.38, 0.34)
karton(n, 0.3, 0.2, z0, 0.58, 0.38, 0.34, pfeile=True)
karton(n, -0.25, -0.12, z0 + 0.34, 0.6, 0.52, 0.3, etikett=True)
karton(n, 0.33, 0.08, z0 + 0.34, 0.5, 0.6, 0.36, pfeile=True)
karton(n, -0.25, -0.1, z0 + 0.64, 0.4, 0.34, 0.24, etikett=True)
# Hubwagen, Gabeln von rechts (+x) unter der Palette
for yy in (-0.17, 0.17):
    n.kasten(0.12, yy, 0.022, 1.15, 0.16, 0.055, PETROL)
    rad(n, -0.4, yy, 0.022, 0.022, 0.06, SCHWARZ)
n.kasten(0.74, 0, 0.022, 0.2, 0.52, 0.09, PETROL)
n.kasten(0.82, 0, 0.11, 0.16, 0.24, 0.18, PETROL)
n.walze(0.82, 0, 0.29, 0.05, 0.12, METALL)
n.kasten(0.82, 0, 0.405, 0.12, 0.16, 0.03, ANTHRAZIT)
for yy in (-0.15, 0.15): rad(n, 0.82, yy, 0.08, 0.08, 0.06)
w = math.radians(24); lg = 0.72
for yy in (-0.07, 0.07):
    n.kasten(0.82, yy, 0.41, 0.035, 0.035, lg, ANTHRAZIT, ry=24)
gx, gz = 0.82 + lg * math.sin(w), 0.41 + lg * math.cos(w)
n.kasten(gx, 0, gz - 0.02, 0.05, 0.3, 0.045, SCHWARZ, ry=24)
n.kasten(gx - 0.02, 0, gz - 0.12, 0.03, 0.14, 0.02, METALL, ry=24)
motiv('ware', n)

def rundrechteck(b, t, r, ecken=6, x0=0, y0=0):
    pts = []
    for cx, cy, a0 in ((b / 2 - r, -t / 2 + r, -90), (b / 2 - r, t / 2 - r, 0), (-b / 2 + r, t / 2 - r, 90), (-b / 2 + r, -t / 2 + r, 180)):
        for k in range(ecken + 1):
            a = math.radians(a0 + 90 * k / ecken); pts.append((x0 + cx + r * math.cos(a), y0 + cy + r * math.sin(a)))
    return pts

# ---------------------------------------------------------------- kosten: Kassentisch mit Kasse, Kartenterminal, Bon
n = Netz()
B, T, HT = 1.5, 0.66, 0.86
n.kasten(0, 0.02, 0, B - 0.06, T - 0.08, 0.08, ANTHRAZIT)
n.kasten(0, 0, 0.08, B, T, HT - 0.08, HOLZ)
for xx in (-0.37, 0.37): n.kasten(xx, -T / 2 - 0.004, 0.16, 0.66, 0.008, 0.6, dunkler(HOLZ, 0.9))
n.tafel(0, -T / 2 - 0.01, 0.62, 0.84, 0.84 / 6.15, FL + 'a-band.png')
n.kasten(0, 0, HT, B + 0.04, T + 0.06, 0.045, ANTHRAZIT)
zt = HT + 0.045
# Kassenlade mit Bildschirm
n.kasten(0.28, 0.05, zt, 0.5, 0.44, 0.13, METALL_DUNKEL)
n.kasten(0.28, -0.175, zt + 0.02, 0.44, 0.012, 0.09, METALL)
n.kasten(0.28, -0.185, zt + 0.06, 0.16, 0.012, 0.02, ANTHRAZIT)
n.walze(0.46, -0.181, zt + 0.065, 0.014, 0.01, '#e0b23a', rx=90, ecken=12)
n.walze(0.28, 0.1, zt + 0.13, 0.11, 0.015, ANTHRAZIT, ecken=24)
n.kasten(0.28, 0.1, zt + 0.145, 0.05, 0.04, 0.2, ANTHRAZIT)
sy, sz = 0.07, zt + 0.3
n.kasten(0.28, sy, sz, 0.56, 0.045, 0.38, SCHWARZ, rx=-14)
n.tafel(0.28, sy - 0.0245, sz + 0.03, 0.52, 0.52 * 420 / 640, FL + 'a-kasse.png', rx=-14, um=(0, 0.0245, -0.03))
# Bondrucker mit Bon
n.kasten(-0.2, 0.1, zt, 0.2, 0.24, 0.13, ANTHRAZIT)
n.kasten(-0.2, 0.04, zt + 0.13, 0.14, 0.03, 0.006, SCHWARZ)
n.tafel(-0.2, 0.04, zt + 0.12, 0.1, 0.25, FL + 'a-bon.png', rx=18, um=(0, 0, 0))
n.walze(-0.2, 0.17, zt + 0.06, 0.012, 0.01, '#3f9b5c', rx=90, ecken=10)
# Kartenterminal auf Ständer
n.kasten(-0.55, -0.12, zt, 0.16, 0.2, 0.02, SCHWARZ)
n.kasten(-0.55, -0.1, zt + 0.02, 0.14, 0.24, 0.035, '#2a2b2e', rx=22, um=(0, -0.12, 0))
n.tafel(-0.55, -0.1 - 0.105, zt + 0.0551, 0.12, 0.21, FL + 'a-terminal.png', rx=22, oben=True, um=(0, -0.015, -0.0351))
n.kasten(-0.55, 0.04, zt, 0.1, 0.02, 0.1, SCHWARZ)
motiv('kosten', n)

# ---------------------------------------------------------------- leitung: Schreibtisch der Filialleitung
def buerostuhl(n, x, y, z=0, farbe=HOLZ_ROT, dreh=0, lehne=0.62):
    for k in range(5):
        a = dreh + 90 + k * 72
        n.kasten(x, y, z + 0.05, 0.3, 0.045, 0.035, ANTHRAZIT, rz=a, um=(-0.15, 0, 0))
        r = math.radians(a); rad(n, x + 0.3 * math.cos(r), y + 0.3 * math.sin(r), z + 0.03, 0.03, 0.025, SCHWARZ, ANTHRAZIT)
    n.walze(x, y, z + 0.08, 0.045, 0.06, ANTHRAZIT)
    n.walze(x, y, z + 0.14, 0.025, 0.24, METALL)
    n.kasten(x, y, z + 0.38, 0.22, 0.22, 0.03, ANTHRAZIT)
    n.kasten(x, y, z + 0.41, 0.52, 0.5, 0.09, farbe)
    n.kasten(x, y - 0.25 + 0.02, z + 0.41, 0.46, 0.01, 0.006, dunkler(farbe, 0.8))
    for sx in (-1, 1):
        n.kasten(x + sx * 0.29, y + 0.05, z + 0.42, 0.04, 0.04, 0.2, ANTHRAZIT)
        n.kasten(x + sx * 0.29, y, z + 0.62, 0.07, 0.34, 0.035, SCHWARZ)
    yb = y + 0.27
    n.kasten(x, yb, z + 0.38, 0.06, 0.04, 0.2, ANTHRAZIT)
    n.kasten(x, yb, z + 0.55, 0.52, 0.11, lehne, farbe, rx=-8, um=(0, 0, 0))
    for k in range(3):
        hk = 0.16 + k * 0.15
        n.kasten(x, yb - 0.057, z + 0.55 + hk, 0.46, 0.006, 0.008, dunkler(farbe, 0.75), rx=-8, um=(0, 0.057, -hk))
n = Netz()
DB, DT, DH = 1.6, 0.78, 0.74
n.kasten(-DB / 2 + 0.05, 0, 0, 0.05, DT - 0.06, DH - 0.04, ANTHRAZIT)
n.kasten(-DB / 2 + 0.05, 0, 0, 0.1, DT - 0.02, 0.025, ANTHRAZIT)
n.kasten(DB / 2 - 0.25, 0, 0, 0.44, DT - 0.06, DH - 0.04, HOLZ_HELL)
for k, (z_, h_) in enumerate([(0.03, 0.26), (0.31, 0.16), (0.49, 0.16)]):
    n.kasten(DB / 2 - 0.25, -DT / 2 + 0.03 - 0.004, z_, 0.4, 0.008, h_, dunkler(HOLZ_HELL, 0.93))
    n.kasten(DB / 2 - 0.25, -DT / 2 + 0.03 - 0.012, z_ + h_ - 0.06, 0.14, 0.012, 0.022, METALL_DUNKEL)
n.kasten(-0.12, -0.02, 0.3, DB - 0.62, 0.025, DH - 0.34, ANTHRAZIT)
n.kasten(0, 0, DH - 0.04, DB, DT, 0.045, HOLZ)
zt = DH + 0.005
# Laptop (Bildschirm zum Stuhl, Deckel mit Logo zur Kamera)
lx, ly = 0.05, 0.08
n.kasten(lx, ly, zt, 0.44, 0.3, 0.018, METALL)
n.kasten(lx, ly + 0.03, zt + 0.018, 0.38, 0.14, 0.002, SCHWARZ)
n.kasten(lx, ly - 0.15, zt + 0.006, 0.44, 0.018, 0.3, METALL, rx=12, um=(0, 0.009, 0))
n.tafel(lx, ly - 0.15 - 0.0095, zt + 0.1, 0.11, 0.11, FL + 'a-logo.png', rx=12, um=(0, 0.0185, -0.094))
# Namensschild
n.kasten(-0.18, -0.29, zt, 0.42, 0.06, 0.015, ANTHRAZIT)
n.kasten(-0.18, -0.29, zt + 0.015, 0.42, 0.02, 0.11, ANTHRAZIT, rx=-10)
n.tafel(-0.18, -0.30 - 0.0015, zt + 0.02, 0.4, 0.4 * 220 / 800, FL + 'a-namensschild.png', rx=-10, um=(0, 0.0115, -0.005))
# Papiere, Tasse, Lampe
n.kasten(-0.55, -0.05, zt, 0.24, 0.32, 0.012, PAPIER, rz=8)
n.kasten(-0.53, -0.06, zt + 0.012, 0.24, 0.32, 0.006, WEISS, rz=-6)
n.walze(0.45, -0.2, zt, 0.045, 0.1, WEISS, ecken=24)
n.walze(0.45, -0.2, zt + 0.09, 0.037, 0.011, HOLZ_ROT, ecken=24)
n.kasten(0.505, -0.2, zt + 0.025, 0.04, 0.016, 0.05, WEISS)
n.walze(-0.6, 0.25, zt, 0.08, 0.02, SCHWARZ)
n.kasten(-0.6, 0.25, zt + 0.02, 0.025, 0.025, 0.38, SCHWARZ, ry=12)
n.kasten(-0.6 + 0.38 * math.sin(math.radians(12)), 0.25, zt + 0.02 + 0.38 * math.cos(math.radians(12)), 0.025, 0.025, 0.24, SCHWARZ, ry=110, um=(0, 0, 0))
hx, hz = -0.6 + 0.38 * math.sin(math.radians(12)) + 0.24 * math.sin(math.radians(110)), zt + 0.02 + 0.38 * math.cos(math.radians(12)) + 0.24 * math.cos(math.radians(110))
n.walze(hx, 0.25, hz - 0.11, 0.08, 0.11, SCHWARZ, r2=0.03)
n.walze(hx, 0.25, hz - 0.112, 0.06, 0.004, '#f3e3a8')
buerostuhl(n, 0.0, 0.62)
motiv('leitung', n)

# ---------------------------------------------------------------- notizen: Klemmbrett mit Liste und Stift (auf Aufsteller)
# Gebaut liegend (Unterkante bei y=0, Oberkante bei y=1.28), dann um 70° aufgerichtet.
n = Netz(dreh=(70, 0, 0))
Y = 0.64
n.prisma(rundrechteck(0.92, 1.28, 0.05, y0=Y), 0.025, HOLZ, ebene='xy')
n.kasten(0.02, Y - 0.045, 0.025, 0.8, 1.04, 0.002, PAPIER, rz=2)
n.tafel(-0.01, Y - 0.6, 0.0275, 0.8, 1.04, FL + 'a-liste.png', oben=True)
n.prisma(rundrechteck(0.44, 0.17, 0.035, y0=Y + 0.55), 0.012, METALL, ebene='xy', z=0.025)
for xx in (-0.15, 0.15): n.walze(xx, Y + 0.6, 0.037, 0.016, 0.008, METALL_DUNKEL)
n.walze(-0.21, Y + 0.585, 0.05, 0.022, 0.42, METALL_DUNKEL, ry=90)
# Stift liegt vor dem Brett auf dem Boden (Weltkoordinaten -> lokal)
welt = lambda p: _rot(p, -70, 0, 0)
r_ = 0.028; a0, a1 = (0.02, -0.3, r_), (0.6, -0.08, r_)
d_ = [a1[i] - a0[i] for i in range(3)]; l_ = math.sqrt(sum(c * c for c in d_)); e_ = [c / l_ for c in d_]
P_ = lambda t: tuple(a0[i] + e_[i] * t for i in range(3))
stab(n, welt(P_(0)), welt(P_(0.08)), 0.004, SCHWARZ, ecken=6, r2=r_)
stab(n, welt(P_(0.08)), welt(P_(0.58)), r_, PETROL, ecken=6)
stab(n, welt(P_(0.58)), welt(P_(0.66)), r_, METALL, ecken=6)
n.kasten(0, Y + 0.5, 0.05, 0.38, 0.13, 0.012, GRAU_HELL, rx=-16, um=(0, 0.065, 0))
# Aufsteller hinten (lokal nach -z, Fußpunkt auf dem Boden: z = -y·tan70)
t = math.tan(math.radians(70))
for xx in (-0.28, 0.28):
    stab(n, (xx, 0.8, -0.03), (xx * 1.25, 0.3, -0.3 * t), 0.02, ANTHRAZIT, kantig=True)
n.kasten(0, 0.8, -0.035, 0.66, 0.06, 0.012, ANTHRAZIT)
motiv('notizen', n)

# ---------------------------------------------------------------- post: Posteingangskorb mit Umschlägen und Siegel
def ablagekorb(n, z, farbe=PETROL):
    KB, KT = 0.72, 0.96
    n.kasten(0, 0, z, KB, KT, 0.02, farbe)
    for sx in (-1, 1):
        n.prisma([(-KT / 2, 0), (KT / 2, 0), (KT / 2, 0.14), (0.0, 0.14), (-KT / 2 + 0.12, 0.05), (-KT / 2, 0.05)], 0.02, farbe, x=sx * (KB / 2 - 0.01), z=z + 0.02, ebene='yz')
    n.kasten(0, KT / 2 - 0.01, z + 0.02, KB, 0.02, 0.14, farbe)
    n.kasten(0, -KT / 2 + 0.01, z + 0.02, KB, 0.02, 0.03, farbe)
    n.kasten(0, -KT / 2 - 0.01, z + 0.025, 0.2, 0.015, 0.02, dunkler(farbe, 0.8))
n = Netz()
ablagekorb(n, 0); ablagekorb(n, 0.32)
for xx in (-0.33, 0.33):
    for yy in (-0.2, 0.42): n.walze(xx, yy, 0.02, 0.014, 0.3, METALL, ecken=12)
for k, (dx, dy, rz, f) in enumerate([(0, -0.02, 0, '#e9e1d2'), (0.02, -0.05, 4, PAPIER), (-0.02, 0.0, -5, '#e4dccb'), (0.01, -0.08, 2, WEISS), (-0.01, -0.03, -3, '#f2ece0')]):
    n.kasten(dx, dy, 0.02 + k * 0.016, 0.6, 0.86, 0.014, f, rz=rz)
n.tafel(0.0, -0.46, 0.1001, 0.6, 0.38, FL + 'a-umschlag.png', oben=True, rz=2)
# oben: Umschlag mit Siegel, einer schräg herausstehend
n.kasten(-0.02, 0.05, 0.34, 0.6, 0.86, 0.014, '#e9e1d2', rz=-3)
n.kasten(0.03, 0.0, 0.354, 0.6, 0.86, 0.014, PAPIER, rz=5)
n.tafel(0.03, -0.43 + 0.0, 0.369, 0.6, 0.86, FL + 'a-umschlag-hinten.png', oben=True, rz=5, um=(0, 0.43, 0))
sxs, sys_ = 0.03 - 0.12 * math.sin(math.radians(5)), 0.0 - 0.12 + 0.0
n.walze(0.03 + 0.12 * math.sin(math.radians(5)), -0.12, 0.369, 0.075, 0.02, ROT, ecken=10)
n.walze(0.03 + 0.12 * math.sin(math.radians(5)), -0.12, 0.389, 0.05, 0.008, ROT_DUNKEL, ecken=24)
n.kasten(0.0, -0.35, 0.36, 0.52, 0.5, 0.012, '#e4dccb', rx=-14, rz=-8, um=(0, 0.25, 0))
motiv('post', n)

# ---------------------------------------------------------------- etagen: Schnitt durch drei Verkaufsebenen mit Rolltreppe
def rolltreppe(n, xa, xb, y, za, zb, b=0.24):
    """Rolltreppe von (xa, za) nach (xb, zb) (Oberkanten der Böden), Breite b entlang y."""
    d = 1 if xb > xa else -1
    l0, l1 = 0.1, 0.1  # Podeste
    p = lambda x: xa + d * x  # Abstand -> x
    lauf = abs(xb - xa) - l0 - l1
    ob = [(p(-0.04), za + 0.03), (p(l0), za + 0.03), (p(l0 + lauf), zb + 0.03), (p(l0 + lauf + l1), zb + 0.03)]
    un = [(p(l0 + lauf + l1), zb - 0.1), (p(l0 + lauf - 0.05), zb - 0.1), (p(l0 + 0.04), za), (p(-0.04), za)]
    prof = ob + un
    if d < 0: prof = list(reversed(prof))
    for s in (-1, 1):
        n.prisma(prof, 0.02, METALL_DUNKEL, y=y + s * (b / 2 - 0.01))
        gl = [(x, z + 0.0) for x, z in ob] + [(x, z + 0.17) for x, z in reversed(ob)]
        if d < 0: gl = list(reversed(gl))
        n.prisma(gl, 0.012, GLAS, y=y + s * (b / 2 - 0.01))
        w = math.degrees(math.atan2(zb - za, lauf))
        n.kasten((p(l0) + p(l0 + lauf)) / 2, y + s * (b / 2 - 0.01), (za + zb) / 2 + 0.2 - 0.012, math.hypot(lauf, zb - za) + 0.02, 0.03, 0.025, SCHWARZ, ry=-d * w)
        for x0, x1, z_ in ((p(-0.06), p(l0), za + 0.2), (p(l0 + lauf), p(l0 + lauf + l1 + 0.02), zb + 0.2)):
            n.kasten((x0 + x1) / 2, y + s * (b / 2 - 0.01), z_ - 0.012, abs(x1 - x0), 0.03, 0.025, SCHWARZ)
    stufen = 12
    for k in range(stufen):
        x_ = p(l0 + lauf * (k + 0.5) / stufen); z_ = za + (zb - za) * (k + 1) / stufen
        n.kasten(x_, y, z_ - 0.03, lauf / stufen + 0.002, b - 0.04, 0.03, METALL if k % 2 else GRAU_HELL)
def ministaender(n, x, y, z, farben):
    for xx in (-0.2, 0.2): n.walze(x + xx, y, z, 0.008, 0.36, METALL, ecken=8)
    n.walze(x - 0.2, y, z + 0.34, 0.007, 0.4, METALL, ry=90, ecken=8)
    for k, f in enumerate(farben):
        n.kasten(x - 0.15 + k * 0.075, y, z + 0.12, 0.05, 0.2, 0.22, f)
def regal(n, x, y, z, b, h, farben):
    n.kasten(x, y + 0.08, z, b, 0.03, h, HOLZ)
    for k in range(3):
        zz = z + 0.03 + k * (h - 0.05) / 3
        n.kasten(x, y, zz, b, 0.18, 0.02, HOLZ_HELL)
        for j in range(int(b / 0.09)):
            n.kasten(x - b / 2 + 0.05 + j * 0.09, y, zz + 0.02, 0.07, 0.14, 0.09 + 0.02 * ((j + k) % 2), farben[(j + k) % len(farben)])
n = Netz()
W, D, ZS, DS = 1.8, 1.4, [0, 0.74, 1.48], 0.09
def boden(x0, x1, y0, y1, z):
    n.kasten((x0 + x1) / 2, (y0 + y1) / 2, z, x1 - x0, y1 - y0, DS - 0.012, '#a9a39a')
    n.kasten((x0 + x1) / 2, (y0 + y1) / 2, z + DS - 0.012, x1 - x0, y1 - y0, 0.012, BODEN)
x0, x1, y0, y1, yb = -W / 2, W / 2, -D / 2, D / 2, -0.4
boden(x0, x1, y0, y1, -DS)
for z in ZS[1:]:
    boden(x0, x1, yb, y1, z - DS); boden(0.32, x1, y0, yb, z - DS); boden(x0, -0.62, y0, yb, z - DS)
WH = ZS[2] + 0.68
n.kasten(0, y1 + 0.03, -DS, W + 0.06, 0.06, WH + DS, CREME)
n.kasten(x0 - 0.03, 0, -DS, 0.06, D, WH + DS, CREME)
n.kasten(-0.03, y1 + 0.03, WH, W + 0.12, 0.07, 0.03, GRAU_HELL)
n.kasten(x0 - 0.03, 0, WH, 0.07, D + 0.06, 0.03, GRAU_HELL)
for z in ZS:
    for xx in (-0.5, 0.05, 0.6): n.kasten(xx, y1 - 0.002, z + 0.24, 0.32, 0.01, 0.32, GLAS)
    for yy in (-0.2, 0.35): n.kasten(x0 + 0.002, yy, z + 0.24, 0.01, 0.32, 0.32, GLAS)
for xx, yy in ((x1 - 0.04, y0 + 0.04), (x1 - 0.04, -0.1), (x0 + 0.04, y0 + 0.04)):
    for z in ZS[:2]: n.kasten(xx, yy, z, 0.06, 0.06, ZS[1] - DS, '#d9d4cb')
rolltreppe(n, -0.62, 0.32, -0.55, ZS[0], ZS[1])
rolltreppe(n, -0.62, 0.32, -0.55, ZS[1], ZS[2])
n.tafel(x0 + 0.005, 0.075, ZS[2] + 0.3, 0.18, 0.18, FL + 'a-logo.png', rz=90)
# Einrichtung je Ebene: unten Kosmetiktheken, Mitte Kleiderständer, oben Regal und Tisch
for xx in (0.0, 0.55):
    n.kasten(xx, -0.1, 0, 0.36, 0.22, 0.26, WEISS); n.kasten(xx, -0.1, 0.26, 0.38, 0.24, 0.025, ANTHRAZIT)
    n.kasten(xx - 0.08, -0.1, 0.285, 0.08, 0.08, 0.1, '#d8a7a0'); n.kasten(xx + 0.07, -0.1, 0.285, 0.06, 0.06, 0.07, ROT_DUNKEL)
ministaender(n, -0.15, -0.15, ZS[1], ['#2f5d7c', '#e9e4da', '#2b2b2d', '#c98a4b'])
ministaender(n, 0.5, -0.15, ZS[1], ['#d8a7a0', '#6d8f5e', '#e9e4da', '#9a6fa8'])
regal(n, -0.3, 0.5, ZS[2], 0.8, 0.52, KLEIDUNG[1:])
n.kasten(0.45, 0.05, ZS[2], 0.44, 0.34, 0.24, HOLZ); n.kasten(0.38, 0.05, ZS[2] + 0.24, 0.14, 0.16, 0.05, '#2f5d7c'); n.kasten(0.54, 0.02, ZS[2] + 0.24, 0.14, 0.16, 0.08, CREME)
motiv('etagen', n)

# ---------------------------------------------------------------- flaeche: Shop-in-Shop-Modul mit Markenschild
def puppe(n, x, y, z, farbe):
    n.walze(x, y, z, 0.13, 0.025, ANTHRAZIT); n.walze(x, y, z + 0.025, 0.012, 0.42, METALL, ecken=10)
    n.walze(x, y, z + 0.44, 0.1, 0.42, farbe, r2=0.125, ecken=24)
    n.kugel(x, y, z + 0.86, 0.125, farbe, sz=0.35)
    n.walze(x, y, z + 0.89, 0.03, 0.06, CREME, ecken=12)
    n.kugel(x, y, z + 1.0, 0.065, CREME, sz=1.2)
n = Netz()
PB, PT = 1.7, 1.3
n.kasten(0, 0, 0, PB, PT, 0.05, ANTHRAZIT)
n.kasten(0, 0, 0.05, PB - 0.04, PT - 0.04, 0.012, HOLZ_HELL)
for k in range(1, 8): n.kasten(-PB / 2 + k * PB / 8, 0, 0.062, 0.006, PT - 0.04, 0.001, dunkler(HOLZ_HELL, 0.9))
WH = 1.4
n.kasten(0, PT / 2 - 0.04, 0.05, PB, 0.08, WH, '#56606b')
n.kasten(-PB / 2 + 0.04, -0.04, 0.05, 0.08, PT - 0.08, WH, '#56606b')
n.kasten(0, PT / 2 - 0.05, WH + 0.05, PB + 0.02, 0.12, 0.22, SCHWARZ)
n.kasten(-PB / 2 + 0.05, -0.04, WH + 0.05, 0.12, PT - 0.06, 0.22, SCHWARZ)
n.tafel(0.12, PT / 2 - 0.115, WH + 0.06, 0.8, 0.8 * 220 / 900, FL + 'a-fundus.png')
for k in range(3):
    z_ = 0.4 + k * 0.32
    n.kasten(0.25, PT / 2 - 0.2, z_, 1.0, 0.24, 0.025, HOLZ_HELL)
    for j in range(5):
        f = KLEIDUNG[(j * 3 + k) % len(KLEIDUNG)]
        for s_ in range(3 if (j + k) % 2 else 2):
            n.kasten(-0.15 + j * 0.2, PT / 2 - 0.2, z_ + 0.025 + s_ * 0.045, 0.16, 0.18, 0.04, f if s_ % 2 == 0 else dunkler(f, 0.92))
n.walze(-PB / 2 + 0.12, -0.45, 1.1, 0.016, 0.85, METALL, rx=-90, ecken=12)
for k, f in enumerate(['#2b2b2d', '#e9e4da', '#2f5d7c', '#c98a4b']):
    n.kasten(-PB / 2 + 0.12, -0.35 + k * 0.17, 0.48, 0.42, 0.05, 0.6, f, um=(0, 0, 0))
    n.kasten(-PB / 2 + 0.12, -0.35 + k * 0.17, 1.06, 0.3, 0.02, 0.045, HOLZ)
n.kasten(0.3, -0.25, 0.062, 0.62, 0.42, 0.3, HOLZ)
n.kasten(0.3, -0.25, 0.362, 0.66, 0.46, 0.03, HOLZ_HELL)
for j, f in enumerate(['#e9e4da', '#2f5d7c', '#d8a7a0']):
    for s_ in range(3): n.kasten(0.1 + j * 0.2, -0.25, 0.392 + s_ * 0.04, 0.16, 0.2, 0.035, f if s_ % 2 == 0 else dunkler(f, 0.9))
puppe(n, -0.3, -0.25, 0.062, '#2f5d7c')
motiv('flaeche', n)

# ---------------------------------------------------------------- umbau: Gerüst mit Farbeimer und Leiter
n = Netz()
GX, GY, LV = (-0.7, 0, 0.7), (-0.2, 0.2), (0.8, 1.6)
n.kasten(0, 0.48, 0, 2.0, 0.12, 2.2, CREME)
n.kasten(0.45, 0.415, 0.0, 1.1, 0.01, 2.2, '#9dc2dc')
for xx in GX:
    for yy in GY:
        n.kasten(xx, yy, 0, 0.12, 0.12, 0.012, METALL_DUNKEL)
        n.walze(xx, yy, 0.012, 0.022, 2.15, METALL, ecken=14)
    n.kasten(xx, 0, -0.0, 0.16, 0.6, 0.0, HOLZ)
for z in LV:
    for yy in GY:
        n.walze(-0.72, yy, z - 0.02, 0.018, 1.44, METALL, ry=90, ecken=12)
    for xx in GX:
        n.walze(xx, -0.22, z - 0.02, 0.018, 0.44, METALL, rx=-90, ecken=12)
    for b in range(2):
        for k in range(3):
            n.kasten(-0.35 + b * 0.7, -0.13 + k * 0.13, z, 0.68, 0.12, 0.03, HOLZ if k != 1 else HOLZ_HELL)
    n.kasten(0, -0.235, z + 0.03, 1.4, 0.015, 0.1, HOLZ_DUNKEL)
    n.walze(-0.72, -0.2, z + 0.45, 0.016, 1.44, METALL, ry=90, ecken=12)
w = math.degrees(math.atan2(0.7, 0.78))
stab(n, (-0.7, -0.24, 0.05), (0.0, -0.24, 0.78), 0.016, METALL_DUNKEL)
stab(n, (0.7, -0.24, 0.83), (0.0, -0.24, 1.56), 0.016, METALL_DUNKEL)
n.kasten(0.35, -0.255, 1.69, 0.66, 0.008, 0.32, METALL_DUNKEL)
n.tafel(0.35, -0.26, 1.7, 0.64, 0.64 * 420 / 900, FL + 'a-plane.png')
# Leiter an der linken Feldseite
lw = 22; ll = 1.0
for sx in (-0.17, 0.17):
    n.kasten(-0.35 + sx, -0.62, 0, 0.04, 0.035, ll, HOLZ_HELL, rx=-lw)
for k in range(6):
    t_ = 0.12 + k * 0.155
    n.kasten(-0.35, -0.62 + t_ * math.sin(math.radians(lw)), t_ * math.cos(math.radians(lw)), 0.34, 0.025, 0.025, HOLZ)
# Farbeimer mit Rolle
ex, ey = 0.45, -0.62
n.walze(ex, ey, 0, 0.13, 0.2, GRAU_HELL, r2=0.14, ecken=28)
n.walze(ex, ey, 0.2, 0.128, 0.004, PETROL, ecken=28)
n.walze(ex, ey, 0.2, 0.145, 0.012, METALL, ecken=28, deckel=False)
for a in (-1, 1):
    n.kasten(ex + a * 0.14, ey, 0.17, 0.012, 0.012, 0.12, METALL_DUNKEL, ry=a * 35)
n.kasten(ex, ey, 0.26, 0.16, 0.012, 0.012, METALL_DUNKEL)
for k, (dx, h) in enumerate([(-0.08, 0.06), (-0.02, 0.1), (0.05, 0.05)]):
    n.kasten(ex + dx, ey - 0.13 - 0.002, 0.2 - h, 0.025, 0.006, h, PETROL)
n.walze(ex + 0.3, ey - 0.02, 0.04, 0.04, 0.2, PETROL, ry=90, rz=-25, ecken=20)
n.walze(ex + 0.3, ey - 0.02, 0.04, 0.012, 0.32, SCHWARZ, ry=-90, rz=-25, ecken=8)
motiv('umbau', n)

# ---------------------------------------------------------------- hausbesuch: Eingangstür mit Drehtür
n = Netz()
R, HT = 0.55, 1.15
n.kasten(0, 0.3, 0, 2.6, 0.12, 1.75, CREME)
for sx in (-1, 1):
    for k in range(2):
        cx = sx * (R + 0.2 + k * 0.33)
        n.kasten(cx, 0.235, 0.12, 0.29, 0.02, 1.05, GLAS)
        n.kasten(cx, 0.225, 0.12, 0.31, 0.012, 0.03, METALL_DUNKEL)
    n.kasten(sx * (R + 0.04), 0.23, 0, 0.08, 0.06, HT + 0.12, METALL_DUNKEL)
n.kasten(0, 0.23, 1.17, 2.6, 0.03, 0.03, METALL_DUNKEL)
n.walze(0, 0, 0, R + 0.06, 0.03, METALL_DUNKEL, ecken=48)
n.walze(0, 0, HT, R + 0.05, 0.16, METALL, ecken=48)
n.walze(0, 0, HT + 0.16, R + 0.07, 0.03, METALL_DUNKEL, ecken=48)
for a0, a1 in ((-55, 55), (125, 235)):
    n.bogen(0, 0, 0.03, R, a0, a1, 0.02, HT - 0.03, GLAS)
    n.bogen(0, 0, 0.03, R + 0.005, a0, a1, 0.03, 0.06, METALL_DUNKEL)
    for a in (a0, a1):
        r_ = math.radians(a); n.walze(R * math.cos(r_), R * math.sin(r_), 0.03, 0.022, HT - 0.03, METALL_DUNKEL, ecken=12)
n.walze(0, 0, 0.03, 0.035, HT - 0.03, METALL, ecken=16)
for k in range(4):
    a = 30 + k * 90; r_ = math.radians(a)
    cx, cy = (R - 0.04) / 2 * math.cos(r_), (R - 0.04) / 2 * math.sin(r_)
    n.kasten(cx, cy, 0.05, R - 0.07, 0.02, HT - 0.08, GLAS, rz=a)
    n.kasten(cx, cy, 0.05, R - 0.06, 0.03, 0.05, METALL_DUNKEL, rz=a)
    n.kasten(cx, cy, HT - 0.07, R - 0.06, 0.03, 0.04, METALL_DUNKEL, rz=a)
    ex_, ey_ = (R - 0.05) * math.cos(r_), (R - 0.05) * math.sin(r_)
    n.kasten(ex_, ey_, 0.05, 0.03, 0.03, HT - 0.08, METALL_DUNKEL, rz=a)
    n.kasten(cx, cy, 0.5, 0.25, 0.03, 0.025, METALL, rz=a)
n.tafel(0, 0.235, 1.3, 1.1, 1.1 * 200 / 900, FL + 'a-eingang.png')
n.kasten(0, -0.75, 0, 1.0, 0.45, 0.015, '#45474b')
for k in range(8): n.kasten(-0.42 + k * 0.12, -0.75, 0.015, 0.06, 0.4, 0.004, '#5a5d61')
for sx in (-1, 1):
    n.kasten(sx * 1.05, -0.2, 0, 0.32, 0.32, 0.36, ANTHRAZIT)
    n.kugel(sx * 1.05, -0.2, 0.52, 0.2, '#6d8f5e', sz=0.9)
motiv('hausbesuch', n)

# ---------------------------------------------------------------- ebenen: gestapelte Kartenebenen
n = Netz()
EB, EZ = 1.2, [0, 0.42, 0.84]
for k, z in enumerate(EZ):
    n.kasten(0, 0, z, EB, EB, 0.035, WEISS)
    n.tafel(0, -EB / 2 + 0.02, z + 0.0355, EB - 0.04, EB - 0.04, FL + f'a-karte{k + 1}.png', oben=True)
for xx in (-EB / 2 + 0.04, EB / 2 - 0.04):
    for yy in (-EB / 2 + 0.04, EB / 2 - 0.04):
        n.walze(xx, yy, 0.035, 0.018, EZ[-1] - 0.035, METALL, ecken=12)
        for z in EZ[1:]: n.walze(xx, yy, z - 0.01, 0.03, 0.01, METALL_DUNKEL, ecken=16)
px, py, pz = -0.6 + 0.02 + 0.3125 * (EB - 0.04), 0.6 - 0.02 - 0.375 * (EB - 0.04), EZ[-1] + 0.036
n.walze(px, py, pz, 0.004, 0.2, ROT_DUNKEL, r2=0.055, ecken=20)
n.kugel(px, py, pz + 0.24, 0.09, ROT)
n.kugel(px, py, pz + 0.24, 0.035, WEISS, sz=1.0)
motiv('ebenen', n)

# ---------------------------------------------------------------- liste: Aktenordner im Regal
def ordner(n, x, y, z, farbe, ry=0, um=None):
    OB, OT, OH = 0.085, 0.3, 0.34
    n.kasten(x, y, z, OB, OT, OH, farbe, ry=ry, um=um)
    if ry == 0:
        n.tafel(x, y - OT / 2 - 0.002, z + 0.13, 0.055, 0.14, FL + 'a-ruecken.png')
        n.walze(x, y - OT / 2 + 0.002, z + 0.07, 0.022, 0.006, SCHWARZ, rx=90, ecken=16)
        n.walze(x, y - OT / 2 + 0.003, z + 0.07, 0.03, 0.002, METALL, rx=90, ecken=16)
n = Netz()
RB, RT, RH = 1.25, 0.38, 1.0
for sx in (-1, 1): n.kasten(sx * (RB / 2 - 0.02), 0, 0, 0.04, RT, RH, HOLZ)
n.kasten(0, RT / 2 - 0.01, 0, RB, 0.02, RH, HOLZ_DUNKEL)
for z in (0, 0.48, RH - 0.04): n.kasten(0, 0, z + (0.04 if z == 0 else 0), RB - 0.08, RT, 0.04, HOLZ)
n.kasten(0, -RT / 2 + 0.01, 0, RB - 0.08, 0.02, 0.04, HOLZ_DUNKEL)
reihe1 = [PETROL, PETROL, '#2f5d7c', CREME, CREME, ROT, SCHWARZ, SCHWARZ]
for k, f in enumerate(reihe1):
    ordner(n, -RB / 2 + 0.09 + k * 0.09, 0.02, 0.52, f)
ordner(n, -RB / 2 + 0.09 + 8 * 0.09 + 0.06, 0.02, 0.52, '#6d8f5e', ry=22, um=(0.0425, 0, 0))
reihe2 = ['#2b2b2d', '#2b2b2d', PETROL, CREME, '#2f5d7c']
for k, f in enumerate(reihe2):
    ordner(n, -RB / 2 + 0.09 + k * 0.09, 0.02, 0.08, f)
n.kasten(0.33, 0.0, 0.08, 0.42, 0.32, 0.22, KARTON)
n.kasten(0.33, -0.161, 0.12, 0.12, 0.004, 0.05, WEISS)
n.kasten(0.33, 0.0, 0.3, 0.44, 0.34, 0.035, dunkler(KARTON, 0.92))
n.kasten(0.33, 0.0, 0.335, 0.3, 0.22, 0.03, PAPIER, rz=4)
motiv('liste', n)

# ---------------------------------------------------------------- deutschland: Deutschlandkarte als Tischmodell mit Stecknadeln
UMRISS = [(7.2, 53.3), (7.3, 53.68), (8.0, 53.7), (8.5, 53.55), (8.7, 53.88), (9.0, 53.88), (8.9, 54.1), (8.6, 54.35), (8.9, 54.6), (8.7, 54.9),
          (9.4, 54.83), (10.0, 54.6), (10.15, 54.45), (11.1, 54.4), (10.8, 54.0), (11.4, 53.95), (12.1, 54.18), (12.5, 54.45), (13.1, 54.45),
          (13.4, 54.68), (13.7, 54.3), (14.2, 53.95), (14.4, 53.3), (14.1, 52.9), (14.6, 52.6), (14.7, 52.1), (14.75, 51.5), (15.0, 51.1),
          (14.8, 50.85), (14.3, 50.9), (13.5, 50.65), (12.9, 50.4), (12.1, 50.3), (12.5, 49.95), (12.4, 49.7), (12.9, 49.35), (13.6, 48.95),
          (13.8, 48.6), (13.0, 48.25), (12.8, 47.9), (13.0, 47.6), (12.6, 47.68), (12.2, 47.6), (11.4, 47.42), (10.9, 47.5), (10.5, 47.55),
          (10.0, 47.5), (9.6, 47.55), (8.9, 47.65), (8.6, 47.8), (7.6, 47.6), (7.55, 48.1), (7.8, 48.6), (8.2, 48.97), (7.6, 49.1),
          (6.9, 49.2), (6.4, 49.45), (6.5, 49.8), (6.1, 50.15), (6.15, 50.5), (6.0, 50.75), (5.9, 50.95), (6.1, 51.2), (6.0, 51.5),
          (6.1, 51.85), (6.8, 51.95), (7.05, 52.25), (6.7, 52.5), (7.05, 52.65), (7.2, 53.0)]
STAEDTE = [(7.01, 51.46, ROT), (6.78, 51.23, ROT), (6.96, 50.94, ROT), (13.4, 52.52, ROT), (10.0, 53.55, ROT), (11.58, 48.14, ROT),
           (8.68, 50.11, ROT), (9.18, 48.78, ROT), (12.37, 51.34, ROT), (9.73, 52.37, ROT), (7.47, 51.51, PETROL), (8.8, 53.08, PETROL)]
def geo(lon, lat, s=0.16): return ((lon - 10.45) * 0.63 * s, (lat - 51.2) * s)
n = Netz(dreh=(0, 0, 24))
TB, TT, H0, NG = 1.4, 1.3, 0.62, 28
L = TT / math.cos(math.radians(NG)); H1 = H0 + TT * math.tan(math.radians(NG))
n.kasten(0, 0, 0, TB + 0.06, TT + 0.06, 0.06, ANTHRAZIT)
n.prisma([(-TT / 2, 0), (TT / 2, 0), (TT / 2, H1), (-TT / 2, H0)], TB, HOLZ_ROT, z=0.06, ebene='yz')
for sx in (-1, 1): n.kasten(sx * (TB / 2 + 0.003), 0, 0.12, 0.006, TT - 0.12, 0.012, dunkler(HOLZ_ROT, 0.8))
n.kasten(0, -TT / 2 - 0.003, 0.16, TB - 0.12, 0.006, H0 - 0.24, dunkler(HOLZ_ROT, 0.9))
n.tafel(0, -TT / 2 - 0.008, H0 - 0.2, 0.42, 0.42 * 160 / 600, FL + 'a-netz.png')
Z0 = H0 + 0.06
def platte(x, y, dz):
    p = _rot((x, y + L / 2, dz), NG, 0, 0); return (p[0], p[1] - TT / 2, p[2] + Z0)
for (dz, b_, t_, h_, f) in ((0, TB + 0.04, L + 0.04, 0.05, HOLZ), (0.05, TB - 0.08, L - 0.08, 0.012, '#9dc2dc')):
    c = platte(0, 0, dz); n.kasten(c[0], c[1], c[2], b_, t_, h_, f, rx=NG)
pts = [geo(a_, b_) for a_, b_ in UMRISS]
c = platte(0, 0, 0.062); n.prisma(pts, 0.05, CREME, x=c[0], y=c[1], z=c[2], ebene='xy', rx=NG)
for a_, b_, f in STAEDTE:
    x, y = geo(a_, b_); p = platte(x, y, 0.11); d = _rot((0, 0, 1), NG, 0, 0)
    n.walze(*p, 0.006, 0.15, METALL, rx=NG, ecken=8)
    n.kugel(p[0] + d[0] * 0.16, p[1] + d[1] * 0.16, p[2] + d[2] * 0.16, 0.034, f, ringe=8, ecken=14)
motiv('deutschland', n)

# ---------------------------------------------------------------- ziel: Zielscheibe mit Dartpfeil
def vek(rx, rz):
    """Richtung der lokalen z-Achse nach Drehung rx, dann rz."""
    return _rot((0, 0, 1), rx, 0, rz)
def pfeil(n, q, rx, rz, tief=0.04):
    d = vek(rx, rz); p = lambda t: (q[0] + d[0] * t, q[1] + d[1] * t, q[2] + d[2] * t)
    n.walze(*p(-tief), 0.004, 0.06, METALL, rx=rx, rz=rz, r2=0.012, ecken=10)
    n.walze(*p(-tief + 0.06), 0.02, 0.13, METALL_DUNKEL, rx=rx, rz=rz, ecken=14)
    n.walze(*p(-tief + 0.19), 0.009, 0.14, SCHWARZ, rx=rx, rz=rz, ecken=8)
    n.kasten(*p(-tief + 0.26), 0.17, 0.006, 0.15, ROT, rx=rx, rz=rz)
    n.kasten(*p(-tief + 0.26), 0.006, 0.17, 0.15, ROT_DUNKEL, rx=rx, rz=rz)
n = Netz()
NG = 12; RX = 90 - NG
a = vek(RX, 0); u = _rot((0, 1, 0), RX, 0, 0)
P0 = (0, 0.05, 1.0)
P = lambda t: (P0[0] + a[0] * t, P0[1] + a[1] * t, P0[2] + a[2] * t)
n.walze(*P0, 0.6, 0.1, HOLZ_HELL, rx=RX, ecken=48)
for k, (r, f) in enumerate([(0.55, CREME), (0.45, PETROL), (0.35, CREME), (0.25, PETROL), (0.15, CREME), (0.06, ROT)]):
    n.walze(*P(0.1 + k * 0.004), r, 0.005, f, rx=RX, ecken=48)
# Staffelei
for sx in (-1, 1):
    n.kasten(sx * 0.42, 0.12, 0, 0.06, 0.05, 1.55, HOLZ, rx=-NG, ry=-sx * 8)
n.kasten(0, 0.62, 0, 0.06, 0.05, 1.28, HOLZ, rx=27)
unten = (P0[0] - u[0] * 0.6, P0[1] - u[1] * 0.6, P0[2] - u[2] * 0.6)
n.kasten(0, unten[1] - 0.02, unten[2] - 0.06, 1.0, 0.16, 0.05, HOLZ_DUNKEL)
n.kasten(0, unten[1] - 0.09, unten[2] - 0.06, 1.0, 0.02, 0.1, HOLZ_DUNKEL)
mitte = P(0.124)
pfeil(n, mitte, RX - 10, -40)
q2 = (mitte[0] - 0.2, mitte[1] + u[1] * 0.18 - 0.0, mitte[2] + u[2] * 0.18)
pfeil(n, (q2[0], q2[1] - 0.0, q2[2]), RX - 4, -28)
motiv('ziel', n)

# ---------------------------------------------------------------- personal: drei Namensschilder an einer Garderobe (Figuren folgen)
n = Netz()
GB = 1.7
for sx in (-1, 1):
    n.kasten(sx * GB / 2, 0, 0, 0.08, 0.5, 0.05, ANTHRAZIT)
    n.walze(sx * GB / 2, 0, 0.05, 0.028, 1.75, ANTHRAZIT, ecken=16)
n.kasten(0, 0, 1.74, GB + 0.12, 0.34, 0.03, HOLZ)
n.walze(-GB / 2, 0.0, 1.6, 0.02, GB, METALL, ry=90, ecken=12)
n.walze(-GB / 2, 0.12, 0.18, 0.018, GB, METALL, ry=90, ecken=12)
n.walze(-GB / 2, -0.12, 0.18, 0.018, GB, METALL, ry=90, ecken=12)
jacken = [('#2f5d7c', 1), ('#c98a4b', 2), (HOLZ_ROT, 3)]
for k, (f, b) in enumerate(jacken):
    x = -0.52 + k * 0.52
    kleidung(n, x, 0, 1.5, 'sakko', f, haken_bis=1.62, s=1.05)
    n.tafel(x - 0.13, -0.025 - 0.007, 1.5 - 0.32, 0.15, 0.15 * 220 / 400, FL + f'a-badge-{b}.png')
    n.kasten(x - 0.13, -0.025 - 0.006, 1.5 - 0.32 + 0.0825, 0.02, 0.004, 0.02, METALL)
    # Schuhpaar
    for sy in (-0.06, 0.06):
        n.kasten(x - 0.06 + sy, -0.02, 0.2, 0.09, 0.24, 0.06, dunkler(f, 0.5) if k != 1 else '#6b4a33')
        n.kasten(x - 0.06 + sy, 0.06, 0.26, 0.09, 0.08, 0.05, dunkler(f, 0.5) if k != 1 else '#6b4a33')
n.kugel(-0.5, 0.0, 1.77, 0.12, '#2f5d7c', sz=0.6)
n.walze(-0.5, -0.06, 1.77, 0.13, 0.012, '#2f5d7c', ecken=24)
n.kasten(0.45, 0.0, 1.77, 0.32, 0.24, 0.07, '#d8a7a0')
n.kasten(0.45, 0.0, 1.84, 0.3, 0.22, 0.05, dunkler('#d8a7a0', 0.9))
motiv('personal', n)

def brüstung(n, B, D, z, h, farbe, kappe, dach):
    n.kasten(0, 0, z, B - 0.02, D - 0.02, h - 0.06, dach)
    for sy in (-1, 1): n.kasten(0, sy * (D / 2 - 0.0), z, B + 0.04, 0.04, h, farbe)
    for sx in (-1, 1): n.kasten(sx * (B / 2 - 0.0), 0, z, 0.04, D + 0.04, h, farbe)
    for sy in (-1, 1): n.kasten(0, sy * (D / 2 - 0.0), z + h, B + 0.07, 0.07, 0.03, kappe)
    for sx in (-1, 1): n.kasten(sx * (B / 2 - 0.0), 0, z + h, 0.07, D + 0.07, 0.03, kappe)

# ---------------------------------------------------------------- haus: Warenhausfassade mit rotem Band und H-Logo
def kacheln(n, ebene, a0, a1, z0, z1, flaeche_pos, farbe, gr=0.1, abst=0.12):
    """Wabenfassade: Raster kleiner Kacheln auf einer Fassadenfläche. ebene 'x': Fläche quer zu y (Front), sonst quer zu x."""
    na = int((a1 - a0) / abst); nz = int((z1 - z0) / abst)
    oa = a0 + ((a1 - a0) - (na - 1) * abst) / 2; oz = z0 + ((z1 - z0) - (nz - 1) * abst) / 2 - gr / 2
    for i in range(na):
        for j in range(nz):
            if ebene == 'x': n.kasten(oa + i * abst, flaeche_pos, oz + j * abst, gr, 0.025, gr, farbe)
            else: n.kasten(flaeche_pos, oa + i * abst, oz + j * abst, 0.025, gr, gr, farbe)
n = Netz()
HB, HD = 2.3, 1.5
n.kasten(0, 0, 0, HB, HD, 0.05, ANTHRAZIT)
n.kasten(0, 0, 0.05, HB - 0.04, HD - 0.04, 0.6, ANTHRAZIT)
# Schaufenster vorne und rechts
def fenster_reihe(xa, xb, y, seite='x'):
    k = int((xb - xa) / 0.42 + 0.5); w = (xb - xa) / k
    for i in range(k):
        c = xa + (i + 0.5) * w
        if seite == 'x': n.kasten(c, y, 0.1, w - 0.05, 0.02, 0.46, GLAS)
        else: n.kasten(y, c, 0.1, 0.02, w - 0.05, 0.46, GLAS)
fenster_reihe(-HB / 2 + 0.06, -0.3, -HD / 2 + 0.015); fenster_reihe(0.3, HB / 2 - 0.06, -HD / 2 + 0.015)
fenster_reihe(-HD / 2 + 0.06, HD / 2 - 0.06, HB / 2 - 0.015, 'y')
n.kasten(0, -HD / 2 + 0.005, 0.05, 0.6, 0.02, 0.52, SCHWARZ)
for xx in (-0.135, 0.135): n.kasten(xx, -HD / 2 - 0.005, 0.07, 0.25, 0.01, 0.46, GLAS)
n.kasten(0, -HD / 2 - 0.005, 0.07, 0.01, 0.012, 0.46, METALL_DUNKEL)
for xx in (-0.035, 0.035): n.kasten(xx, -HD / 2 - 0.014, 0.22, 0.014, 0.014, 0.16, METALL)
n.tafel(-0.75, -HD / 2 + 0.003, 0.18, 0.3, 0.3 * 420 / 900, FL + 'plakat.png')
n.tafel(0.75, -HD / 2 + 0.003, 0.18, 0.3, 0.3 * 420 / 900, FL + 'plakat.png')
# Vordach
n.kasten(0.09, -0.09, 0.62, HB + 0.18, HD + 0.18, 0.05, ANTHRAZIT)
n.kasten(0.09, -0.09, 0.67, HB + 0.16, HD + 0.16, 0.006, METALL_DUNKEL)
# Obergeschosse mit Wabenfassade
z0, z1 = 0.67, 1.72
n.kasten(0, 0, z0, HB, HD, z1 - z0, '#d7cfc1')
kacheln(n, 'x', -HB / 2 + 0.03, HB / 2 - 0.03, z0 + 0.03, z1 - 0.02, -HD / 2 - 0.0125, CREME)
kacheln(n, 'y', -HD / 2 + 0.03, HD / 2 - 0.03, z0 + 0.03, z1 - 0.02, HB / 2 + 0.0125, CREME)
# rotes Band mit Logo
brüstung(n, HB, HD, z1, 0.34, ROT, ROT_DUNKEL, '#a9a39a')
n.tafel(-0.05, -HD / 2 - 0.022, z1 + 0.05, 1.5, 1.5 / 6.15, FL + 'a-band.png')
n.tafel(HB / 2 + 0.022, 0, z1 + 0.04, 0.26, 0.26, FL + 'a-logo.png', rz=90)
# Dachaufbauten
n.kasten(0.35, 0.25, z1 + 0.28, 0.8, 0.5, 0.2, GRAU_HELL)
for xx in (0.1, 0.35, 0.6): n.walze(xx, 0.25, z1 + 0.48, 0.08, 0.04, METALL, ecken=20)
n.kasten(-0.65, 0.4, z1 + 0.28, 0.3, 0.3, 0.16, METALL)
motiv('haus', n)

# ---------------------------------------------------------------- wettbewerber: fremdes Kaufhaus (blau)
n = Netz()
WB, WD, WHH = 1.7, 1.4, 2.25
n.kasten(0, 0, 0, WB, WD, 0.05, ANTHRAZIT)
n.kasten(0, 0, 0.05, WB - 0.03, WD - 0.03, 0.55, SCHWARZ)
for k in range(4):
    n.kasten(-WB / 2 + 0.22 + k * 0.33, -WD / 2 + 0.005, 0.1, 0.28, 0.02, 0.44, GLAS)
for k in range(3):
    n.kasten(WB / 2 - 0.005, -WD / 2 + 0.55 + k * 0.3, 0.1, 0.02, 0.26, 0.44, GLAS)
for i in range(4):
    z = 0.6 + i * 0.36
    n.kasten(0, 0, z, WB, WD, 0.2, '#e1e5ea')
    n.kasten(0, 0, z + 0.2, WB - 0.02, WD - 0.02, 0.16, '#5d7fa8')
    for k in range(9): n.kasten(-WB / 2 + 0.1 + k * 0.19, -WD / 2 + 0.003, z + 0.2, 0.025, 0.012, 0.16, '#e1e5ea')
    for k in range(7): n.kasten(WB / 2 - 0.003, -WD / 2 + 0.1 + k * 0.2, z + 0.2, 0.012, 0.025, 0.16, '#e1e5ea')
zt = 0.6 + 4 * 0.36
brüstung(n, WB, WD, zt, 0.33, BLAU, dunkler(BLAU, 0.8), '#a9a39a')
n.tafel(-0.12, -WD / 2 - 0.022, zt + 0.04, 1.3, 1.3 / 6.15, FL + 'a-konkurrenz.png')
# Glas-Eckturm
ex, ey, er = WB / 2 - 0.05, -WD / 2 + 0.05, 0.36
n.walze(ex, ey, 0, er, zt + 0.5, GLAS, ecken=40)
for z in [0.6 + i * 0.36 for i in range(5)] + [zt + 0.48]:
    n.walze(ex, ey, z - 0.02, er + 0.02, 0.05, BLAU, ecken=40)
n.walze(ex, ey, zt + 0.53, er + 0.04, 0.06, dunkler(BLAU, 0.8), ecken=40)
n.walze(ex, ey, zt + 0.59, 0.03, 0.35, METALL, ecken=10)
n.kugel(ex, ey, zt + 0.98, 0.07, BLAU_HELL)
motiv('wettbewerber', n)

# ---------------------------------------------------------------- bahn: ICE-Triebkopf
def rumpf(n, schnitt, xs, farbe_fn, punkte=48, e=4.0):
    """Rumpf aus Querschnitten: schnitt(x) -> (halbe Breite, z unten, z oben); farbe_fn(x, y, z, winkel) -> Farbe."""
    def ring(x):
        w, zb, zt = schnitt(x); zc, b = (zb + zt) / 2, (zt - zb) / 2; r = []
        for k in range(punkte):
            t = 2 * math.pi * k / punkte; c, s = math.cos(t), math.sin(t)
            r.append((x, w * math.copysign(abs(c) ** (2 / e), c), zc + b * math.copysign(abs(s) ** (2 / e), s)))
        return r
    ringe = [ring(x) for x in xs]
    for i in range(len(xs) - 1):
        A, B = ringe[i], ringe[i + 1]
        for k in range(punkte):
            k2 = (k + 1) % punkte
            q_ = [A[k], A[k2], B[k2], B[k]]
            m = [sum(p[j] for p in q_) / 4 for j in range(3)]
            n.flaeche(q_, farbe_fn(m[0], m[1], m[2], math.degrees(2 * math.pi * (k + 0.5) / punkte)))
    n.flaeche(list(reversed(ringe[0])), farbe_fn(xs[0], 0, 0, -1))
    n.flaeche(ringe[-1], farbe_fn(xs[-1], 0, 0, -2))
    return ring
LK, LN = 2.5, 1.75   # Wagenkasten und lange, flach auslaufende Nase (ICE 3)
def ice_schnitt(x):
    if x <= LK: return 0.31, 0.1, 0.98
    s = min(1, (x - LK) / LN)
    # Dach fällt früh und lang, Boden steigt erst an der Spitze: spitze, niedrige Nase
    return 0.31 * (1 - 0.7 * s ** 2.2), 0.1 + 0.16 * s ** 3, 0.98 - 0.74 * s ** 1.25
def ice_farbe(x, y, z, t):
    if t == -1: return GRAU_HELL
    if t == -2: return WEISS
    w, zb, zt = ice_schnitt(x)
    if x > LK:
        s = (x - LK) / LN
        # große dunkle Frontscheibe, seitlich herumgezogen
        if 0.03 < s < 0.5 and 28 < t < 152: return '#1d232a'
    if z < 0.21 and x < LK + LN * 0.5: return '#5b6066'   # Schürze über den Drehgestellen
    if 0.34 < z < 0.43 and x < LK + 0.04: return ROT   # rotes Band bis in die Nase
    if x < LK - 0.02 and 0.58 < z < 0.8 and abs(y) > 0.2:   # durchgehendes Fensterband
        return '#cfd4d8' if (x % 0.42) < 0.035 else '#22282f'
    return WEISS
n = Netz()
xs = [0, 0.02] + [0.04 + k * 0.04 for k in range(int((LK - 0.04) / 0.04) + 1)] + [LK + LN * (k / 110) for k in range(1, 111)]
rumpf(n, ice_schnitt, xs, ice_farbe, punkte=120)
# Türen als Fugen, Dachkante
for xx in (2.12, 2.26): n.kasten(xx, -0.305, 0.24, 0.012, 0.012, 0.62, '#b8bec4')
n.kasten(1.1, 0, 0.975, 1.9, 0.4, 0.035, '#d5d9dc')
# Stromabnehmer: Sockel auf dem Dach, Unter- und Oberarm verbunden, Wippe
px, pz = 0.55, 1.01
n.kasten(px, 0, pz - 0.01, 0.3, 0.26, 0.05, '#4a4f55')
stab(n, (px - 0.1, 0, pz + 0.04), (px + 0.22, 0, pz + 0.24), 0.016, METALL_DUNKEL)
stab(n, (px + 0.22, 0, pz + 0.24), (px - 0.02, 0, pz + 0.42), 0.014, METALL_DUNKEL)
n.kasten(px - 0.02, 0, pz + 0.42, 0.06, 0.42, 0.025, SCHWARZ)
# Scheinwerfer unten an der Nase
for sy in (-1, 1):
    x_ = LK + LN * 0.8; w, zb, zt = ice_schnitt(x_)
    n.kugel(x_, sy * w * 0.62, zb + 0.06, 0.024, '#fff6d6', ringe=8, ecken=12)
# Räder nur als dunkle Andeutung unter der Schürze
for bx in (0.45, 2.05):
    for dx in (-0.2, 0.2):
        for sy in (-1, 1): rad(n, bx + dx, sy * 0.24, 0.08, 0.075, 0.04, SCHWARZ, METALL_DUNKEL)
# Gleis schmal: zwei Schienen, wenige Schwellen, kein Schotterbett
for sy in (-1, 1): n.kasten(2.0, sy * 0.24, -0.02, 4.6, 0.035, 0.03, METALL)
for k in range(12): n.kasten(-0.2 + k * 0.4, 0, -0.06, 0.1, 0.66, 0.04, '#a59f96')
motiv('bahn', n, groesse='symbol')

