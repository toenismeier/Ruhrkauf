"""KayKit Furniture Bits (CC0, Kay Lousberg) -> render/src/kit/moebel/kaykit-daten.js

Flacher Stil wie der Baukasten: Farbe je Dreieck aus der Palettentextur (UV der Dreiecksmitte),
gruppiert nach Farbe, Positionen als Int16 in Millimetern, Indizes Uint16, Base64.
Aufruf: python3 render/scripts/kaykit/umwandeln.py <Ordner mit gltf/ und texture/>
"""
import base64, json, struct, sys, os
import numpy as np
from PIL import Image

QUELLE = sys.argv[1]
ZIEL = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'kit', 'moebel', 'kaykit-daten.js')
MODELLE = ['couch', 'couch_pillows', 'armchair', 'armchair_pillows', 'bed_double_A', 'bed_double_B', 'bed_single_A',
           'lamp_standing', 'lamp_table', 'rug_rectangle_A', 'rug_rectangle_stripes_A', 'rug_oval_A', 'table_low',
           'table_medium', 'chair_A', 'chair_stool', 'shelf_A_big', 'shelf_B_large_decorated', 'cabinet_medium_decorated',
           'pictureframe_large_A', 'cactus_medium_A', 'book_set']
tex = np.asarray(Image.open(os.path.join(QUELLE, 'texture', 'furniturebits_texture.png')).convert('RGB')).astype(int)
TH, TW = tex.shape[:2]
TYP = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4)}
N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}

def acc(j, buf, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    c, s = TYP[a['componentType']]; n = N[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(buf, dtype='<' + c, count=a['count'] * n, offset=off).reshape(-1, n) if n > 1 else \
        np.frombuffer(buf, dtype='<' + c, count=a['count'], offset=off)

ZELLE = 128
def farbe(u, v):
    # Die Textur ist eine Palette aus Feldern mit senkrechtem Verlauf. Flacher Stil: je Feld (128 px) eine Farbe aus der Feldmitte.
    x = min(TW - 1, max(0, int(u * TW))); y = min(TH - 1, max(0, int(v * TH)))
    cx = (x // ZELLE) * ZELLE + ZELLE // 2; cy = (y // ZELLE) * ZELLE + ZELLE // 2
    r, g, b = tex[cy, cx]
    m = (r + g + b) / 3
    r, g, b = [int(round((m + (c - m) * 0.85) / 12) * 12) for c in (r, g, b)]
    return '#%02x%02x%02x' % tuple(min(255, max(0, c)) for c in (r, g, b))

aus = {}
for name in MODELLE:
    j = json.load(open(os.path.join(QUELLE, 'gltf', name + '.gltf')))
    buf = open(os.path.join(QUELLE, 'gltf', j['buffers'][0]['uri']), 'rb').read()
    gruppen = {}
    for m in j['meshes']:
        for p in m['primitives']:
            pos = acc(j, buf, p['attributes']['POSITION']); uv = acc(j, buf, p['attributes']['TEXCOORD_0']); idx = acc(j, buf, p['indices'])
            for t in range(0, len(idx), 3):
                a, b, c = idx[t:t + 3]
                f = farbe(*(uv[[a, b, c]].mean(axis=0)))
                gruppen.setdefault(f, []).append((a, b, c))
    eintrag = []
    for f, tris in gruppen.items():
        ids = sorted({k for t in tris for k in t}); neu = {k: i for i, k in enumerate(ids)}
        p = np.round(pos[ids] * 1000).astype('<i2')
        ind = np.array([neu[k] for t in tris for k in t], dtype='<u2')
        eintrag.append([f, base64.b64encode(p.tobytes()).decode(), base64.b64encode(ind.tobytes()).decode()])
    aus[name] = eintrag
with open(ZIEL, 'w') as o:
    o.write('// Automatisch erzeugt aus KayKit Furniture Bits 1.0 (CC0, Kay Lousberg, www.kaylousberg.com).\n')
    o.write('// scripts/kaykit/umwandeln.py; je Modell [Farbe, Positionen Int16 mm, Indizes Uint16] in Base64.\n')
    o.write('export const KAYKIT = ' + json.dumps(aus, separators=(',', ':')) + ';\n')
print(ZIEL, os.path.getsize(ZIEL), 'Bytes', sum(len(v) for v in aus.values()), 'Farbgruppen', len({g[0] for v in aus.values() for g in v}), 'Farben')
