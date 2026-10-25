# Gemeinsame Teile für alle Motive (E47 P4). Pfade relativ zu render/illustrationen.
F = '.assets/furniture-kit/Models/GLTF format/'
MM = '.assets/mini-market/Models/GLB format/'
CAR = '.assets/car-kit/Models/GLB format/'
STADT = '.assets/city-kit-commercial/Models/GLB format/'
RETRO = '.assets/retro-urban-kit/Models/GLB format/'
ESSEN = '.assets/food-kit/Models/GLB format/'

# Hartwig-Palette: Rot nur für Marke, Petrol für Bedienung, warme Hölzer, kühles Metall, Kleidung gedeckt.
ROT, ROT_DUNKEL = '#d23c32', '#a62a22'
PETROL = '#1f6f8b'
HOLZ, HOLZ_HELL, HOLZ_ROT = '#b98a5c', '#d9c4a5', '#8a3a22'
METALL, METALL_DUNKEL, SCHWARZ = '#8d9399', '#5a5d61', '#2e3033'
WEISS, PAPIER, CREME = '#eef0f2', '#f4f1ea', '#ece6dc'
GLAS = '#9dc2dc'
KLEIDUNG = ['#d23c32', '#2f5d7c', '#e9e4da', '#6d8f5e', '#2b2b2d', '#c98a4b', '#9a6fa8', '#d8a7a0']

def q(x, y, z, b, t, h, farbe, **k):
    """Quader: Mitte x/y, Unterkante z, Breite b (x), Tiefe t (y), Höhe h."""
    d = {'quader': [x, y, z, b, t, h], 'farbe': farbe}; d.update(k); return d

def zyl(x, y, z, r, h, farbe, achse='z', **k):
    d = {'zylinder': [x, y, z, r, h], 'farbe': farbe, 'achse': achse}; d.update(k); return d

def bild(x, y, z, b, h, datei, dicke=0.004, **k):
    """Bildfläche zur Kamera (Vorderseite = -y)."""
    d = {'quader': [x, y, z, b, dicke, h], 'farbe': WEISS, 'bild': datei}; d.update(k); return d

def lautsprecher(x, y, h=1.25):
    f = [q(x, y, 0, 0.26, 0.26, h, '#3b3d40', fase=0.015)]
    for k, z in enumerate([h * 0.82, h * 0.6, h * 0.38]):
        f += [zyl(x, y - 0.131, z, 0.085 if k else 0.06, 0.012, '#6b6e72', 'y'), zyl(x, y - 0.138, z, 0.045 if k else 0.03, 0.012, '#2a2b2e', 'y')]
    return f
