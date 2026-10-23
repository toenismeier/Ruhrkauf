# Packt die gebackenen Einzelbilder zum Figuren-Atlas und schreibt ihn als JS-Modul (WebP, Base64).
# Aufruf: python3 render/scripts/menschen/packen.py <ausgabe-ordner-von-backen> <ziel-js> [vorschau-png]
# Atlas: linke Hälfte = (Schatten, Oberteil, Hose, Alpha), rechte Hälfte = (Haut, Haar, Schuhe, 255).
# Gewichte sind nicht vormultipliziert; Tasche = 1 - Summe der Regionen.
# Farben werden 3 px in die leeren Ränder fortgesetzt, damit lineare Filterung an der Kante nicht abdunkelt.
import sys, json, os, io, base64
import numpy as np
from PIL import Image

QUELLE, ZIEL_JS = sys.argv[1:3]
VORSCHAU = sys.argv[3] if len(sys.argv) > 3 else None
meta = json.load(open(os.path.join(QUELLE, 'frames.json')))
FW, FH = meta['fw'], meta['fh']
SPALTEN = 32

namen = []
for k in meta['koerper']:
    for a in meta['anims']:
        namen += k['anims'][a['id']]
zeilen = (len(namen) + SPALTEN - 1) // SPALTEN
W, H = SPALTEN * FW, zeilen * FH
feld = np.zeros((H, W * 2, 4), np.uint8)
feld[:, W:, 3] = 255


def fortsetzen(rgb, gueltig, schritte=2):
    rgb = rgb.astype(np.float32); g = gueltig.copy()
    for _ in range(schritte):
        summe = np.zeros_like(rgb); n = np.zeros(g.shape, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                gs = np.roll(np.roll(g, dy, 0), dx, 1); rs = np.roll(np.roll(rgb, dy, 0), dx, 1)
                summe += rs * gs[..., None]; n += gs
        neu = (~g) & (n > 0)
        rgb[neu] = summe[neu] / n[neu][:, None]
        g = g | neu
    return np.clip(rgb + 0.5, 0, 255).astype(np.uint8)


for i, n in enumerate(namen):
    A = np.array(Image.open(os.path.join(QUELLE, 'frames', n + '_a.png')).convert('RGBA'))
    B = np.array(Image.open(os.path.join(QUELLE, 'frames', n + '_b.png')).convert('RGBA'))
    alpha = A[..., 3].copy(); alpha[alpha < 20] = 0
    g = alpha > 0
    x, y = (i % SPALTEN) * FW, (i // SPALTEN) * FH
    feld[y:y + FH, x:x + FW, :3] = fortsetzen(A[..., :3], g)
    feld[y:y + FH, x:x + FW, 3] = alpha
    feld[y:y + FH, W + x:W + x + FW, :3] = fortsetzen(B[..., :3], g)
# Quantisieren: Schatten 64 Stufen, Regionsgewichte 16 Stufen, Alpha 32 Stufen (Kante) – kleinere Datei, optisch gleich
q = lambda a, st: (np.round(a.astype(np.float32) / 255 * (st - 1)) * 255 / (st - 1)).astype(np.uint8)
feld[:, :W, 0] = q(feld[:, :W, 0], 64)
feld[:, :W, 1:3] = q(feld[:, :W, 1:3], 16)
feld[:, :W, 3] = q(feld[:, :W, 3], 32)
feld[:, W:, 0:3] = q(feld[:, W:, 0:3], 16)
atlas = Image.fromarray(feld, 'RGBA')
puffer = io.BytesIO()
atlas.save(puffer, 'WEBP', lossless=True, quality=100, method=6, exact=True)
daten = puffer.getvalue()

index = {'fw': FW, 'fh': FH, 'spalten': SPALTEN, 'breite': W * 2, 'hoehe': H, 'orthoH': meta['orthoH'], 'fussY': meta['fussY'],
         'richtungen': meta['richtungen'], 'anims': {a['id']: a['n'] for a in meta['anims']}, 'koerper': []}
pos = 0
for k in meta['koerper']:
    e = {'id': k['id'], 'start': {}}
    for a in meta['anims']:
        e['start'][a['id']] = pos
        pos += len(k['anims'][a['id']])
    index['koerper'].append(e)
with open(ZIEL_JS, 'w') as fh:
    fh.write('// Erzeugt von render/scripts/menschen/packen.py aus Quaternius-Figuren (CC0). Nicht von Hand ändern.\n')
    fh.write('export const ATLAS_INDEX = ' + json.dumps(index) + ';\n')
    fh.write("export const ATLAS_WEBP = 'data:image/webp;base64," + base64.b64encode(daten).decode() + "';\n")
print('Atlas', W * 2, 'x', H, 'Bilder', len(namen), 'WebP-Bytes', len(daten))
ZIEL_PNG = os.path.join(QUELLE, 'atlas-kontrolle.png'); atlas.save(ZIEL_PNG)

if VORSCHAU:
    import random
    random.seed(3)
    OBEN = [(190, 157, 120), (81, 140, 136), (75, 94, 123), (154, 67, 76), (60, 60, 64), (226, 220, 206), (120, 90, 140)]
    UNTEN = [(52, 58, 72), (40, 42, 48), (110, 96, 80), (70, 84, 110), (150, 140, 120)]
    HAUT = [(239, 196, 159), (226, 182, 146), (211, 160, 124), (240, 205, 175)]
    HAAR = [(222, 196, 140), (190, 160, 110), (120, 88, 60), (70, 50, 36), (170, 170, 170)]
    SCHUH = [(40, 36, 34), (230, 228, 222), (90, 60, 40)]
    TASCHE = (200, 60, 50)
    src = Image.open(ZIEL_PNG).convert('RGBA')
    px = src.load()
    out = Image.new('RGBA', (len(namen) and min(len(namen), 40) * FW, ((len(namen) + 39) // 40) * FH), (236, 230, 218, 255))
    po = out.load()
    for i, n in enumerate(namen):
        sx, sy = (i % SPALTEN) * FW, (i // SPALTEN) * FH
        ox, oy = (i % 40) * FW, (i // 40) * FH
        farben = [random.choice(OBEN), random.choice(UNTEN), random.choice(HAUT), random.choice(HAAR), random.choice(SCHUH), TASCHE]
        for yy in range(FH):
            for xx in range(FW):
                s, t, u, a = px[sx + xx, sy + yy]
                if a < 100:
                    continue
                h, hr, sc, _ = px[W + sx + xx, sy + yy]
                w = [t / 255, u / 255, h / 255, hr / 255, sc / 255]
                w.append(max(0.0, 1 - sum(w)))
                c = [sum(w[j] * farben[j][ch] for j in range(6)) * s / 255 for ch in range(3)]
                po[ox + xx, oy + yy] = tuple(int(min(255, v)) for v in c) + (255,)
    out = out.resize((out.width * 3, out.height * 3), Image.NEAREST)
    out.save(VORSCHAU)
