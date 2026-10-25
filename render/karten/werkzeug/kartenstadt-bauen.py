# Kartenstadt-Spieldatei bauen (render/karten/<stadt>-spiel.json) aus den Zwischenständen der Pilot-Werkzeuge:
#   o2s-plain/lanes/marks.geojson (osm2streets), lod2-kern.json (LoD2 NRW), osm-kern.json (OSM-Flächen), netz.json (Straßennetz)
# Neu gegenüber kartenstadt-packen.py:
#   - Boden fertig trianguliert (earcut) und je Schicht und 240-m-Zelle zusammengefasst: zur Laufzeit keine Triangulierung.
#   - Gehwege mit Bordstein als Band um alle Fahrbahnen, Innenhöfe in Wohnblöcken als Hofgrün, übrige Fläche Hofpflaster.
#   - Dachflächen mit vorberechneten Dreiecken.
# Aufruf: python3 kartenstadt-bauen.py <arbeitsordner> <ziel.json> <radius_m> [mitte_x mitte_z]
import json, sys, math, os
import numpy as np
import mapbox_earcut as earcut
from shapely.geometry import Polygon, MultiPolygon, box, Point
from shapely.ops import unary_union
from shapely.validation import make_valid

ordner, ziel, R = sys.argv[1], sys.argv[2], float(sys.argv[3])
MX, MZ = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (85.0, 90.0)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pilot', 'werkzeug'))
from geo import ring as lonlat_ring
RAND = 80                              # Spielraum für Teile knapp außerhalb des Ausschnitts
OX, OZ = R - MX + RAND, R - MZ + RAND  # Plan-Ursprung: alles positiv, Mitte bei (R + RAND, R + RAND)
BREITE = TIEFE = int(2 * (R + RAND))
ZELLE = 240
lade = lambda n: json.load(open(os.path.join(ordner, n)))

def polys_geojson(g):
    if g['type'] == 'Polygon': yield g['coordinates']
    elif g['type'] == 'MultiPolygon': yield from g['coordinates']

def gueltig(p):
    try:
        p = Polygon(p) if not isinstance(p, (Polygon, MultiPolygon)) else p
        if not p.is_valid: p = make_valid(p)
        return p
    except Exception:
        return None

def teile(g):
    if g is None or g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if hasattr(g, 'geoms'): return [q for x in g.geoms for q in teile(x)]
    return []

# ── Eingaben
o2s = {k: lade(f'o2s-{k}.geojson') for k in ('plain', 'lanes', 'marks')}
fahrbahn, rad, mark, kreuz, parkstreifen = [], [], [], [], []
for f in o2s['plain']['features']:
    if f['properties'].get('type') == 'intersection':
        for p in polys_geojson(f['geometry']): kreuz.append(lonlat_ring(p[0]))
for f in o2s['lanes']['features']:
    t = f['properties'].get('type')
    ziel_liste = fahrbahn if t in ('Driving', 'Bus', 'Construction', 'LightRail') else parkstreifen if t in ('Parking', 'Shoulder') else rad if t == 'Biking' else None
    if ziel_liste is not None:
        for p in polys_geojson(f['geometry']): ziel_liste.append(lonlat_ring(p[0]))
for f in o2s['marks']['features']:
    t = f['properties'].get('type')
    if t in ('center line', 'vehicle stop line') or t == 'lane separator':
        for p in polys_geojson(f['geometry']):
            r = lonlat_ring(p[0])
            if t == 'lane separator' and len(r) <= 6 and abs(r[0][0] - r[2][0]) + abs(r[0][1] - r[2][1]) <= 2.5: continue
            mark.append(r)
osm = lade('osm-kern.json'); lod = lade('lod2-kern.json'); netz = lade('netz.json')['kanten']
gebiet = box(MX - R, MZ - R, MX + R, MZ + R)
im = lambda pts: any(abs(x - MX) <= R + 50 and abs(z - MZ) <= R + 50 for x, z in pts[:: max(1, len(pts) // 4)])

# ── Bodenschichten (Shapely)
print('Fahrbahnen vereinigen …', flush=True)
fb_polys = [g for g in (gueltig(p) for p in fahrbahn if len(p) >= 3 and im(p)) if g is not None and not g.is_empty]
park_polys = [g for g in (gueltig(p) for p in parkstreifen if len(p) >= 3 and im(p)) if g is not None and not g.is_empty]
# Kreuzungsflächen nur dort, wo Fahrbahnen ankommen: reine Fußweg-Kreuzungen wären graue Asphaltflecken auf Plätzen
from shapely.strtree import STRtree
baum_fb = STRtree(fb_polys)
for p in kreuz:
    if len(p) < 3 or not im(p): continue
    g = gueltig(p)
    if g is None or g.is_empty: continue
    nah = baum_fb.query(g.buffer(1.0))
    if len(nah) >= 2: fb_polys.append(g)
strassen = unary_union(fb_polys).intersection(gebiet).simplify(0.25).buffer(0)
parkflaeche = unary_union(park_polys).intersection(gebiet).difference(strassen).simplify(0.25).buffer(0) if park_polys else None
strassen_alle = unary_union([strassen] + ([parkflaeche] if parkflaeche is not None else [])).buffer(0)
print('Gehwege …', flush=True)
gehweg_aussen = strassen_alle.buffer(3.4, join_style=2)
bord = strassen_alle.buffer(0.45, join_style=2).difference(strassen_alle)
gehweg = gehweg_aussen.difference(strassen_alle).difference(bord).simplify(0.3).buffer(0)
bord = bord.simplify(0.2).buffer(0)
flaechen_art = {}
for fl in osm['flaechen']:
    if not im(fl['umriss']) or len(fl['umriss']) < 4: continue
    g = gueltig(fl['umriss'])
    if g is None or g.is_empty: continue
    flaechen_art.setdefault(fl['art'], []).append(g)
gruen = unary_union(flaechen_art.get('gruen', [])) if flaechen_art.get('gruen') else None
# Innenhöfe: Fläche weiter als 14 m von jeder Fahrbahn, außerhalb des Kerns (dort Pflaster), ohne OSM-Plätze
print('Innenhöfe …', flush=True)
abstand = strassen_alle.buffer(14, join_style=2)
kern = Polygon([(MX + 520 * math.cos(a / 24 * 2 * math.pi), MZ + 520 * math.sin(a / 24 * 2 * math.pi)) for a in range(24)])
sperre = unary_union([abstand] + [g for a in ('platz', 'parkplatz', 'bahngelaende', 'bahnsteig', 'gewerbe', 'schulhof', 'sport', 'kleingarten') for g in flaechen_art.get(a, [])])
hof_alle = gebiet.difference(sperre)
hof_alle = unary_union([q.buffer(-2).buffer(2) for q in teile(hof_alle) if q.area > 250]).simplify(1.0).buffer(0)
# Im Kern sind Höfe gepflastert (Hofpflaster mit Bäumen), außerhalb begrünt
hof = hof_alle.difference(kern).buffer(0)
hofkern = hof_alle.intersection(kern).buffer(0)

# ── Triangulierung und Zellen
FARBE = {'pflaster': 0, 'gehweg': 1, 'bord': 2, 'fahrbahn': 3, 'rad': 4, 'markierung': 5, 'gruen': 6, 'hof': 7, 'wasser': 8, 'platz': 9, 'parkplatz': 10, 'bahnsteig': 11, 'schotter': 12,
         'parkstreifen': 13, 'hofkern': 14, 'gewerbe': 15, 'schulhof': 16, 'sport': 17, 'kleingarten': 18, 'weg': 19, 'linie': 20, 'ufer': 21, 'rasen2': 22}
schichten = {}
def ablegen(art, poly):
    for q in teile(poly):
        if q.area < 0.3: continue
        ext = list(q.exterior.coords)[:-1]
        if len(ext) < 3: continue
        loecher = [list(i.coords)[:-1] for i in q.interiors if len(i.coords) > 3]
        alle = ext + [p for l in loecher for p in l]
        ringe = np.array([len(ext)] + [len(ext) + sum(len(l) for l in loecher[:k + 1]) for k in range(len(loecher))], dtype=np.uint32)
        idx = earcut.triangulate_float64(np.array(alle, dtype=np.float64), ringe)
        if not len(idx): continue
        cx, cz = alle[0]
        k = (art, int((cx + OX) // ZELLE), int((cz + OZ) // ZELLE))
        e = schichten.setdefault(k, {'p': [], 'i': []})
        basis = len(e['p']) // 2
        for x, z in alle: e['p'] += [round((x + OX) * 10), round((z + OZ) * 10)]
        e['i'] += [int(v) + basis for v in idx]
def ablegen_liste(art, liste):
    for p in liste:
        if len(p) >= 3 and im(p):
            g = gueltig(p)
            if g is not None: ablegen(art, g.intersection(gebiet))

print('Triangulieren …', flush=True)
ablegen('gehweg', gehweg); ablegen('bord', bord); ablegen('hof', hof); ablegen('hofkern', hofkern)
for art, liste in flaechen_art.items():
    a = {'bahngelaende': 'schotter'}.get(art, art)
    if a in FARBE:
        for g in liste: ablegen(a, g.intersection(gebiet))
# Parkwege und Pfade (nicht über Fahrbahn und Gehweg), Treppen schmal
from shapely.geometry import LineString
wege_poly = []
for w in osm.get('wege', []):
    if len(w['punkte']) < 2 or not im(w['punkte']): continue
    breite = 1.0 if w['art'] == 'steps' else 1.6 if w['art'] == 'path' else 2.2
    wege_poly.append(LineString(w['punkte']).buffer(breite / 2, cap_style=2, join_style=2))
if wege_poly:
    wege = unary_union(wege_poly).difference(gehweg_aussen).intersection(gebiet).simplify(0.25).buffer(0)
    ablegen('weg', wege)
else:
    wege = None
# Sportfelder: weiße Außenlinie und Mittellinie
for f in osm.get('sportfelder', []):
    g = gueltig(f['umriss'])
    if g is None or g.is_empty or g.area < 150 or not im(f['umriss']): continue
    r = g.minimum_rotated_rectangle
    innen = r.buffer(-1.2, join_style=2)
    if innen.is_empty: continue
    ablegen('linie', innen.difference(innen.buffer(-0.18, join_style=2)))
    c = list(innen.exterior.coords)[:4]
    seiten = sorted([(math.dist(c[i], c[(i + 1) % 4]), i) for i in range(4)])
    i = seiten[0][1]; j = (i + 2) % 4
    m1 = ((c[i][0] + c[(i + 1) % 4][0]) / 2, (c[i][1] + c[(i + 1) % 4][1]) / 2); m2 = ((c[j][0] + c[(j + 1) % 4][0]) / 2, (c[j][1] + c[(j + 1) % 4][1]) / 2)
    mitte = ((c[i][0] + c[(i + 1) % 4][0] + c[j][0] + c[(j + 1) % 4][0]) / 4, (c[i][1] + c[(i + 1) % 4][1] + c[j][1] + c[(j + 1) % 4][1]) / 4)
    d = (m2[0] - m1[0], m2[1] - m1[1]); L = math.hypot(*d) or 1
    q = (-d[1] / L, d[0] / L); halb = seiten[2][0] / 2
    ablegen('linie', LineString([(mitte[0] - q[0] * halb, mitte[1] - q[1] * halb), (mitte[0] + q[0] * halb, mitte[1] + q[1] * halb)]).buffer(0.09, cap_style=2))
    ablegen('linie', Point(mitte).buffer(3.0).difference(Point(mitte).buffer(2.82)))
# Ufer: heller Rand um Wasser
for g in flaechen_art.get('wasser', []):
    ablegen('ufer', g.buffer(1.2, join_style=2).difference(g).intersection(gebiet))
# Rasenvariation: etwas dunklere Flecken in großen Grünflächen (Mähmuster, Baumschatten-Inseln)
if gruen is not None:
    import random as _r
    rr = _r.Random(5)
    flecken = []
    for q in teile(gruen):
        if q.area < 2500: continue
        x0, z0, x1, z1 = q.bounds
        for _ in range(int(q.area / 1800)):
            px, pz = rr.uniform(x0, x1), rr.uniform(z0, z1)
            flecken.append(Point(px, pz).buffer(rr.uniform(7, 16), 6))
    if flecken: ablegen('rasen2', unary_union(flecken).intersection(gruen).buffer(0))
ablegen('fahrbahn', strassen)
if parkflaeche is not None: ablegen('parkstreifen', parkflaeche)
ablegen_liste('rad', rad); ablegen_liste('markierung', mark)
import base64
def b64(arr, typ): return base64.b64encode(np.clip(np.asarray(arr, dtype=np.int64), 0, 65535).astype(typ).tobytes()).decode()
BP, BI, boden = [], [], []
for k, e in sorted(schichten.items()):
    # Stücke mit mehr als 65.000 Punkten gibt es bei 240-m-Zellen nicht; Indizes bleiben Uint16 je Stück
    n = len(e['p']) // 2
    assert n < 65000, (k, n)
    boden.append([FARBE[k[0]], len(BP) // 2, n, len(BI), len(e['i'])]); BP += e['p']; BI += e['i']

# ── Gebäude mit Dachdreiecken
def dach_index(ring):
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    if len(pts) < 3: return pts, []
    nx = ny = nz = 0
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        nx += (a[2] - b[2]) * (a[1] + b[1]); ny += (a[1] - b[1]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[2] + b[2])
    ax, ay, az = abs(nx), abs(ny), abs(nz)
    proj = [(p[0], p[1]) for p in pts] if ay >= ax and ay >= az else [(p[1], p[2]) for p in pts] if ax >= az else [(p[0], p[2]) for p in pts]
    idx = earcut.triangulate_float64(np.array(proj, dtype=np.float64), np.array([len(proj)], dtype=np.uint32))
    return pts, [int(v) for v in idx]
P3 = lambda pts: [v for x, z, y in pts for v in (round((x + OX) * 10), round((z + OZ) * 10), round(y * 10))]
gebaeude, GP, GI, FKT = [], [], [], {}
for g in lod['gebaeude']:
    if not g['boden']: continue
    b = g['boden'][0]
    mx = sum(p[0] for p in b) / len(b); mz = sum(p[1] for p in b) / len(b)
    if abs(mx - MX) > R or abs(mz - MZ) > R: continue
    eintrag = [FKT.setdefault(g['fkt'] or '', len(FKT)), int(g['dach'] or 0), round(g['h'] * 10), round(g['traufe'] * 10), len(GP) // 3, len(b)]
    GP += P3(b)
    for r in g['dachf']:
        pts, idx = dach_index(r)
        if not idx: continue
        eintrag += [len(GP) // 3, len(pts), len(GI), len(idx)]; GP += P3(pts); GI += idx
    gebaeude.append(eintrag)

P = lambda pts: [v for x, z in pts for v in (round((x + OX) * 10), round((z + OZ) * 10))]
# Deko: Typ, Lage (Dezimeter), Winkel (0..255) – Bäume nach Art, Hecken, Straßenmöbel, Gartenlauben
DEKO = {'linde': 1, 'platane': 2, 'kastanie': 3, 'birke': 4, 'nadel': 5, 'busch': 6, 'laterne': 7, 'altlaterne': 8, 'bank': 9,
        'kuebel': 10, 'poller': 11, 'litfass': 12, 'muelleimer': 13, 'fahrradstaender': 14, 'laube': 15, 'strassenbaum': 16, 'pappel': 17, 'hecke': 18}
def deko_punkte():
    import random
    from shapely.prepared import prep
    from shapely.strtree import STRtree
    r = random.Random(77)
    out = []
    geb_polys = [Polygon([(p[0], p[1]) for p in g['boden'][0]]).buffer(0) for g in lod['gebaeude'] if g['boden'] and len(g['boden'][0]) >= 3]
    geb_baum = STRtree(geb_polys)
    belegt = []
    def frei(x, z, rad):
        pt = Point(x, z)
        for i in geb_baum.query(pt.buffer(rad)):
            if geb_polys[i].distance(pt) < rad: return False
        return True
    sperre_fb = prep(strassen_alle.buffer(0.6))
    def setz(art, x, z, w=None):
        if abs(x - MX) > R or abs(z - MZ) > R: return
        out.append((DEKO[art], x, z, r.random() * 2 * math.pi if w is None else w))
    # OSM-Einzelbäume: an Straßen Platane/Linde, sonst gemischt
    strassennah = prep(gehweg_aussen.buffer(2))
    print('Deko: Einzelbäume …', flush=True)
    for x, z in osm['baeume']:
        if abs(x - MX) <= R and abs(z - MZ) <= R:
            setz('strassenbaum' if strassennah.contains(Point(x, z)) else r.choice(['linde', 'kastanie', 'platane', 'birke']), x, z)
    print('Deko: Parks …', flush=True)
    # Parks: Baumgruppen (Klumpen über Rauschen) mit offenen Wiesen, Nadelbäume eingestreut, Büsche am Rand und an Wegen
    def rauschen(x, z):
        return math.sin(x / 37.0) * math.cos(z / 29.0) + 0.6 * math.sin((x + z) / 19.0) + 0.4 * math.cos((x - 2 * z) / 23.0)
    wege_p = prep(wege.buffer(1.5)) if wege is not None and not wege.is_empty else None
    for flaeche, art_mix, dichte_basis, schritt in ((gruen, ['linde', 'kastanie', 'linde', 'birke', 'platane', 'nadel', 'pappel'], 0.55, 9),
                                                   (hof, ['birke', 'linde', 'kastanie', 'nadel'], 0.35, 11), (hofkern, ['linde', 'platane', 'birke'], 0.18, 14)):
        if flaeche is None or flaeche.is_empty: continue
        pf = prep(flaeche.buffer(-2.5))
        x0, z0, x1, z1 = flaeche.bounds
        x = x0
        while x < x1:
            z = z0
            while z < z1:
                px, pz = x + (r.random() - 0.5) * schritt * 0.8, z + (r.random() - 0.5) * schritt * 0.8
                n = rauschen(px, pz)
                dichte = dichte_basis * (0.15 if n < -0.2 else 1.0 if n > 0.6 else 0.55)
                if r.random() < dichte and pf.contains(Point(px, pz)) and (wege_p is None or not wege_p.contains(Point(px, pz))) and frei(px, pz, 3):
                    setz(r.choice(art_mix), px, pz)
                z += schritt
            x += schritt
    print('Deko: Ränder, Möbel, Lauben …', flush=True)
    # Büsche entlang der Parkränder und Hecken an Höfen
    for flaeche, abstand, art in ((gruen, 3.2, 'busch'), (hof, 2.4, 'hecke')):
        if flaeche is None: continue
        for q in teile(flaeche):
            if q.area < 400: continue
            rand = q.exterior
            L = rand.length
            u = 0
            while u < L:
                p = rand.interpolate(u)
                if r.random() < (0.55 if art == 'busch' else 0.8) and not sperre_fb.contains(p) and frei(p.x, p.y, 1.2): setz(art, p.x, p.y)
                u += abstand * (1 if art == 'hecke' else 1 + r.random() * 2)
    # Fußgängerzonen und Plätze: Laternen, Bänke, Kübel, Litfaßsäulen, Mülleimer, Fahrradständer
    for k in netz:
        if k['typ'] != 'fussgaenger' or not im(k['punkte']): continue
        ln = LineString(k['punkte'])
        u, i = 6, 0
        while u < ln.length - 3:
            p = ln.interpolate(u); q = ln.interpolate(min(ln.length, u + 1))
            dx, dz = q.x - p.x, q.y - p.y; l = math.hypot(dx, dz) or 1
            nx, nz = -dz / l, dx / l
            seite = 1 if i % 2 else -1
            w = math.atan2(-dz, dx)
            setz('altlaterne', p.x + nx * seite * 4.5, p.y + nz * seite * 4.5, 0)
            if i % 2 == 0:
                setz('bank', p.x - nx * seite * 3.2, p.y - nz * seite * 3.2, w + (math.pi if seite > 0 else 0))
                setz('kuebel', p.x - nx * seite * 3.2 + dx / l * 2.2, p.y - nz * seite * 3.2 + dz / l * 2.2, 0)
            if i % 5 == 2: setz('litfass', p.x + nx * seite * 2.0, p.y + nz * seite * 2.0, 0)
            if i % 3 == 1: setz('muelleimer', p.x + nx * seite * 3.6, p.y + nz * seite * 3.6, 0)
            if i % 7 == 3: setz('fahrradstaender', p.x - nx * seite * 4.2, p.y - nz * seite * 4.2, w)
            if i % 2 == 1 and frei(p.x, p.y, 3): setz('strassenbaum', p.x, p.y)
            u += 14; i += 1
    # Laternen an Haupt- und Nebenstraßen (Gehwegkante)
    for k in netz:
        if k['typ'] == 'fussgaenger' or not im(k['punkte']): continue
        ln = LineString(k['punkte']); halb = k['breite'] / 2 - 2.6
        u, i = 8, 0
        abst = 28 if k['typ'] == 'haupt' else 34
        while u < ln.length - 4:
            p = ln.interpolate(u); q = ln.interpolate(min(ln.length, u + 1))
            dx, dz = q.x - p.x, q.y - p.y; l = math.hypot(dx, dz) or 1
            nx, nz = -dz / l, dx / l
            seite = 1 if i % 2 else -1
            x, z = p.x + nx * seite * halb, p.y + nz * seite * halb
            if not sperre_fb.contains(Point(x, z)) and frei(x, z, 1.0):
                setz('laterne', x, z, math.atan2(nz * seite, -nx * seite) if False else math.atan2(-(-nz * seite), -nx * seite))
            # Alleebäume an Hauptstraßen zwischen den Laternen
            if k['typ'] == 'haupt':
                x2, z2 = p.x + nx * -seite * (halb + 0.3) + dx / l * 9, p.y + nz * -seite * (halb + 0.3) + dz / l * 9
                if not sperre_fb.contains(Point(x2, z2)) and frei(x2, z2, 3): setz('strassenbaum', x2, z2)
            u += abst; i += 1
    # Kleingärten: Lauben im Raster mit Hecken
    for g in flaechen_art.get('kleingarten', []):
        x0, z0, x1, z1 = g.bounds
        pg = prep(g.buffer(-3))
        x = x0 + 6
        while x < x1 - 4:
            z = z0 + 6
            while z < z1 - 4:
                if pg.contains(Point(x, z)) and frei(x, z, 2):
                    setz('laube', x + r.uniform(-2, 2), z + r.uniform(-2, 2), r.choice([0, math.pi / 2]))
                    for k in range(4): setz('hecke', x - 7 + k * 3.5, z - 7)
                    if r.random() < 0.6: setz(r.choice(['birke', 'kastanie', 'busch']), x + 4, z + 3)
                z += 14
            x += 14
    return out

GL = {'rail': 1, 'light_rail': 2, 'tram': 3}
TYP = {'haupt': 1, 'neben': 2, 'fussgaenger': 3}
knoten = {}
kn = lambda k: knoten.setdefault(k, len(knoten))
out = {
    'stadt': 'essen', 'lizenz': '© OpenStreetMap-Mitwirkende, ODbL; Geobasis NRW, dl-de/zero-2-0',
    'quellen': ['Straßen: osm2streets (Apache-2.0) aus OpenStreetMap', 'Gleise, Flächen, Bäume, Straßennetz: OpenStreetMap', 'Gebäude: 3D-Gebäudemodell LoD2 NRW'],
    'ursprung': [OX, OZ], 'breite': BREITE, 'tiefe': TIEFE, 'farben': list(FARBE),
    'boden': boden, 'bp': b64(BP, '<u2'), 'bi': b64(BI, '<u2'),
    'gp': b64(GP, '<u2'), 'gi': b64(GI, '<u2'), 'fkt': list(FKT),
    'gleise': [[GL[g['art']], P(g['punkte'])] for g in osm['gleise'] if g['art'] in GL and im(g['punkte'])],
    'deko': (lambda d: {'typ': base64.b64encode(bytes(t for t, _, _, _ in d)).decode(), 'w': base64.b64encode(bytes(int((w % (2 * math.pi)) / (2 * math.pi) * 255) for _, _, _, w in d)).decode(),
              'p': b64([v for _, x, z, _ in d for v in (round((x + OX) * 10), round((z + OZ) * 10))], '<u2'), 'arten': list(DEKO)})(deko_punkte()),
    'netz': [[TYP[k['typ']], round(k['breite'] * 10), k['spuren'], 1 if k['einbahn'] else 0, kn(k['a']), kn(k['b']), P(k['punkte'])] for k in netz if im(k['punkte'])],
    'gebaeude': gebaeude,
}
json.dump(out, open(ziel, 'w'), separators=(',', ':'), ensure_ascii=False)
print(ziel, os.path.getsize(ziel) // 1024, 'KB', len(gebaeude), 'Gebäude', len(boden), 'Bodenstücke')
