# Kartenstadt-Spieldatei bauen (render/karten/<stadt>-spiel.json), zwei Varianten:
#   'karte'  – kartentreu: Fahrbahnen, Spuren und Markierungen aus osm2streets, Haltestellen, Parkstreifen
#   'coffee' – abstrahiert: Straßen als saubere Bänder aus den OSM-Mittellinien (einheitliche Breite je Straße,
#              runde Kreuzungen, Mittellinie nur auf Hauptstraßen), keine Zufahrten, keine Haltestelleninseln
# Gemeinsam: Gebäude (LoD2 NRW), Flächen, Wege, Gleise, Bahnsteigdächer, Bauplatzflächen (bebaubar), Straßennetz mit
# Fahrspuren für den Verkehr. Je Variante: Bodenschichten, Höfe, Deko (Bäume, Hecken, Möbel, Lauben).
# Eingaben im Arbeitsordner: o2s-plain/lanes/marks.geojson, lod2-kern.json, osm-kern.json, netz.json
# Aufruf: python3 kartenstadt-bauen.py <arbeitsordner> <ziel.json> <radius_m> [mitte_x mitte_z]
import json, sys, math, os, base64, random
import numpy as np
import mapbox_earcut as earcut
from shapely.geometry import Polygon, MultiPolygon, box, Point, LineString
from shapely.ops import unary_union
from shapely.validation import make_valid
from shapely.prepared import prep
from shapely.strtree import STRtree

ordner, ziel, R = sys.argv[1], sys.argv[2], float(sys.argv[3])
MX, MZ = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (85.0, 90.0)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pilot', 'werkzeug'))
from geo import ring as lonlat_ring
RAND = 80
OX, OZ = R - MX + RAND, R - MZ + RAND
BREITE = TIEFE = int(2 * (R + RAND))
ZELLE = 240
lade = lambda n: json.load(open(os.path.join(ordner, n)))
log = lambda *a: print(*a, flush=True)

def polys_geojson(g):
    if g['type'] == 'Polygon': yield g['coordinates']
    elif g['type'] == 'MultiPolygon': yield from g['coordinates']
def gueltig(p):
    try:
        p = Polygon(p) if not isinstance(p, (Polygon, MultiPolygon)) else p
        return p if p.is_valid else make_valid(p)
    except Exception:
        return None
def teile(g):
    if g is None or g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if hasattr(g, 'geoms'): return [q for x in g.geoms for q in teile(x)]
    return []
def vereinigt(liste):
    liste = [g for g in liste if g is not None and not g.is_empty]
    return unary_union(liste).buffer(0) if liste else Polygon()

osm = lade('osm-kern.json'); lod = lade('lod2-kern.json'); netz = lade('netz.json')['kanten']
o2s = {k: lade(f'o2s-{k}.geojson') for k in ('plain', 'lanes', 'marks')}
gebiet = box(MX - R, MZ - R, MX + R, MZ + R)
im = lambda pts: any(abs(x - MX) <= R + 50 and abs(z - MZ) <= R + 50 for x, z in pts[:: max(1, len(pts) // 4)])

# ── Fahrspuren je OSM-Weg (osm2streets): Spuren links→rechts; Fahrbahnband = alles außer Geh- und Mischwegen
FAHRBAR = {'Driving', 'Bus', 'Construction', 'LightRail', 'Parking', 'Shoulder', 'Biking', 'SharedLeftTurn', 'Buffer(Curb)'}
VERKEHR = {'Driving', 'Bus'}
spuren_je_strasse = {}
for f in o2s['lanes']['features']:
    p = f['properties']
    spuren_je_strasse.setdefault(p['road'], {'ways': p['osm_way_ids'], 'spuren': []})['spuren'].append((p['index'], p['type'], p['direction'], p['width']))
spuren_je_weg = {}
for r in spuren_je_strasse.values():
    sp = sorted(r['spuren'])
    band = [s for s in sp if s[1] in FAHRBAR]
    if not band: continue
    gesamt = sum(s[3] for s in band)
    links, verkehr = 0.0, []
    for s in band:
        mitte = links + s[3] / 2
        if s[1] in VERKEHR:
            # Abstand von der Bandmitte nach links (positiv = links in Fahrtrichtung des Wegs)
            verkehr.append((round(gesamt / 2 - mitte, 2), 1 if s[2] == 'Fwd' else -1))
        links += s[3]
    for w in r['ways']:
        spuren_je_weg.setdefault(w, (gesamt, verkehr))

# ── Gemeinsame Flächen
kern = Polygon([(MX + 520 * math.cos(a / 24 * 2 * math.pi), MZ + 520 * math.sin(a / 24 * 2 * math.pi)) for a in range(24)])
flaechen_art = {}
for fl in osm['flaechen']:
    if not im(fl['umriss']) or len(fl['umriss']) < 4: continue
    g = gueltig(fl['umriss'])
    if g is None or g.is_empty: continue
    flaechen_art.setdefault(fl['art'], []).append(g)
# Benannte Plätze: in der Innenstadt Pflaster, außerhalb Schmuckplatz mit Rasenkern und Pflasterrand
for g in flaechen_art.pop('platzort', []):
    if kern.contains(g.centroid) or g.area < 600: flaechen_art.setdefault('platz', []).append(g); continue
    innen = g.buffer(-6, join_style=2)
    if not innen.is_empty: flaechen_art.setdefault('gruen', []).append(innen)
    flaechen_art.setdefault('platz', []).append(g.difference(innen) if not innen.is_empty else g)
gruen = vereinigt(flaechen_art.get('gruen', []))
# Plätze liegen über Grün: Spielplätze, Rasen und Sportfelder darauf wieder freistellen
_frei = vereinigt(flaechen_art.get('gruen', []) + flaechen_art.get('sport', []) + flaechen_art.get('kleingarten', []))
flaechen_art['platz'] = [q for g in flaechen_art.get('platz', []) for q in teile(g.difference(_frei)) if q.area > 5]
gleisflaeche = vereinigt([LineString(g['punkte']).buffer(2.4 if g['art'] == 'tram' else 3.0) for g in osm['gleise'] if len(g['punkte']) >= 2 and im(g['punkte']) and g['art'] != 'tram'])
# Gleisbett: alle Eisenbahngleise und Straßenbahn-Betriebsgleise, parallele Gleise zu einer Fläche geschlossen (kein Rasen zwischen Gleisen)
_bettlinien = [LineString(g['punkte']) for g in osm['gleise'] if len(g['punkte']) >= 2 and im(g['punkte']) and (g['art'] != 'tram' or g.get('dienst'))]
GLEISBETT = vereinigt([l.buffer(3.0) for l in _bettlinien]).buffer(5, join_style=1).buffer(-5, join_style=1).simplify(0.5).buffer(0)
_tramband = vereinigt([LineString(g['punkte']).buffer(2.0) for g in osm['gleise'] if g['art'] == 'tram' and len(g['punkte']) >= 2 and im(g['punkte'])])
GLEISBETT_P = prep(vereinigt([GLEISBETT.buffer(1.5)] + flaechen_art.get('bahnsteig', []) + [LineString(g['punkte']).buffer(2.2) for g in osm['gleise'] if g['art'] == 'tram' and len(g['punkte']) >= 2]))   # keine Bäume und Möbel in Gleis und auf Bahnsteigen
wege_linien = [w for w in osm.get('wege', []) if len(w['punkte']) >= 2 and im(w['punkte'])]

# ── Straßen je Variante
def strassen_karte():
    fahrbahn, rad, mark, kreuz, park, halte = [], [], [], [], [], []
    for f in o2s['plain']['features']:
        if f['properties'].get('type') == 'intersection':
            for p in polys_geojson(f['geometry']): kreuz.append(lonlat_ring(p[0]))
    # Zufahrten, Feld- und Fußwege (highway=service/track/footway …) zeichnen keine Fahrbahn: sie erzeugen das Straßengeflecht
    dienst = set(json.load(open(os.path.join(ordner, 'dienstwege.json')))) if os.path.exists(os.path.join(ordner, 'dienstwege.json')) else set()
    # Stadtbahnspuren nur als Fahrbahn, wenn die Straße auch Kfz-Spuren hat (eigene Bahntrassen sind keine Straße)
    _kfz_strassen = {f['properties'].get('road') for f in o2s['lanes']['features'] if f['properties'].get('type') in ('Driving', 'Bus')}
    for f in o2s['lanes']['features']:
        t = f['properties'].get('type')
        if dienst and all(w in dienst for w in f['properties'].get('osm_way_ids', [])) and f['properties'].get('osm_way_ids'): continue
        if f['properties'].get('road') not in _kfz_strassen: continue   # reine Bahntrassen und Wege: keine Spuren zeichnen
        ziel_l = fahrbahn if t in ('Driving', 'Bus', 'Construction', 'LightRail') else park if t in ('Parking', 'Shoulder') else rad if t == 'Biking' else None
        if ziel_l is not None:
            for p in polys_geojson(f['geometry']): ziel_l.append(lonlat_ring(p[0]))
    for f in o2s['marks']['features']:
        t = f['properties'].get('type')
        if t in ('center line', 'vehicle stop line', 'lane separator'):
            for p in polys_geojson(f['geometry']):
                r = lonlat_ring(p[0])
                if t == 'lane separator' and len(r) <= 6 and abs(r[0][0] - r[2][0]) + abs(r[0][1] - r[2][1]) <= 2.5: continue
                mark.append(r)
    fb = [g for g in (gueltig(p) for p in fahrbahn if len(p) >= 3 and im(p)) if g is not None and not g.is_empty]
    pk = [g for g in (gueltig(p) for p in park if len(p) >= 3 and im(p)) if g is not None and not g.is_empty]
    baum_fb = STRtree(fb)
    for p in kreuz:
        if len(p) < 3 or not im(p): continue
        g = gueltig(p)
        if g is not None and not g.is_empty and len(baum_fb.query(g.buffer(1.0))) >= 2: fb.append(g)
    strassen = vereinigt(fb).intersection(gebiet).simplify(0.25).buffer(0)
    # Im Gleisbett nur echte Straßenquerungen (Straßennetz) behalten; Restspuren von Bahntrassen entfallen
    netzband = vereinigt([LineString(k['punkte']).buffer(9) for k in netz if k['typ'] != 'fussgaenger' and im(k['punkte'])])
    strassen = strassen.difference(GLEISBETT.difference(netzband)).buffer(0)
    # Parallele Richtungsfahrbahnen mit schmalen Restspalten (< 7 m) zu einem Band schließen, Ränder glätten (keine Zacken und Inselreste)
    strassen = strassen.buffer(3.5, join_style=1).buffer(-3.5, join_style=1).buffer(-0.6, join_style=1).buffer(0.6, join_style=1).simplify(0.4).buffer(0)
    strassen = vereinigt([q for q in teile(strassen) if q.area > 60])
    # Einzelne Fahrbahninseln ohne Anschluss (Wendekreise, Knoten von Parkwegen) weglassen: sie wirken als Platten mit Loch
    strassen = vereinigt([q for q in teile(strassen) if q.area > 400])
    parkfl = vereinigt(pk).intersection(gebiet).difference(strassen).simplify(0.25).buffer(0)
    zus = {'rad': [g for g in (gueltig(p) for p in rad if len(p) >= 3 and im(p)) if g is not None],
           'markierung': [g for g in (gueltig(p) for p in mark if len(p) >= 3 and im(p)) if g is not None],
           'parkstreifen': [parkfl], 'haltestelle': flaechen_art.get('haltestelle', [])}
    return strassen, vereinigt([strassen, parkfl]), zus

def strassen_coffee():
    baender, fuss, striche = [], [], []
    grad = {}
    for k in netz:
        if k['typ'] != 'fussgaenger':
            for e in (k['a'], k['b']): grad[e] = grad.get(e, 0) + 1
    knoten_pkt = {}
    for k in netz:
        knoten_pkt[k['a']] = k['punkte'][0]; knoten_pkt[k['b']] = k['punkte'][-1]
    for k in netz:
        if not im(k['punkte']): continue
        ln = LineString(k['punkte'])
        if k['typ'] == 'fussgaenger':
            fuss.append(ln.buffer(5.5, join_style=1))
            continue
        gesamt = spuren_je_weg.get(k['way'], (None, None))[0] or (6.5 if k['typ'] == 'haupt' else 5.5)
        gesamt = min(max(gesamt, 5.0), 14.0)
        baender.append(ln.buffer(gesamt / 2, cap_style=1, join_style=1))
    strassen = vereinigt(baender).intersection(gebiet).simplify(0.2).buffer(0)
    # Mittellinie gestrichelt nur auf Hauptstraßen mit Gegenverkehr, nicht in Kreuzungen
    kreise = vereinigt([Point(knoten_pkt[n]).buffer(12) for n, g in grad.items() if g >= 3 and n in knoten_pkt])
    for k in netz:
        if k['typ'] != 'haupt' or k['einbahn'] or not im(k['punkte']): continue
        ln = LineString(k['punkte'])
        u = 2.0
        while u < ln.length - 2:
            a, b = ln.interpolate(u), ln.interpolate(min(u + 3.0, ln.length))
            striche.append(LineString([a, b]).buffer(0.12, cap_style=2))
            u += 9.0
    mark = vereinigt(striche).difference(kreise).intersection(strassen) if striche else Polygon()
    platz_fuss = vereinigt(fuss).difference(strassen).intersection(gebiet).simplify(0.3).buffer(0)
    return strassen, strassen, {'markierung': [mark], 'fusszone': [platz_fuss]}

def strassen_karte_baender():
    """Kartentreue: je OSM-Straße ein sauberes Band in echter Lage und Breite (osm2streets-Gesamtbreite), mit Markierungen
    aus den echten Spuren: Leitlinien zwischen gleichgerichteten Spuren, Mittellinie bei Gegenverkehr, Randlinien auf Hauptstraßen."""
    baender, fuss, striche, band_knoten = [], [], [], []
    grad, knoten_pkt = {}, {}
    for k in netz:
        knoten_pkt[k['a']] = k['punkte'][0]; knoten_pkt[k['b']] = k['punkte'][-1]
        if k['typ'] != 'fussgaenger':
            for e in (k['a'], k['b']): grad[e] = grad.get(e, 0) + 1
    def gestrichelt(ln, versatz, lang, luecke, breite=0.12):
        try: off = ln.offset_curve(versatz)
        except Exception: return
        for teil in (off.geoms if hasattr(off, 'geoms') else [off]):
            if teil.is_empty or teil.length < 4: continue
            u = 1.5
            while u < teil.length - 1.5:
                a_, b_ = teil.interpolate(u), teil.interpolate(min(u + lang, teil.length))
                striche.append(LineString([a_, b_]).buffer(breite, cap_style=2)); u += lang + luecke
    for k in netz:
        if not im(k['punkte']): continue
        ln = LineString(k['punkte'])
        if k['typ'] == 'fussgaenger':
            fuss.append(ln.buffer(5.5, join_style=1)); continue
        gesamt, spuren = spuren_je_weg.get(k['way'], (None, None))
        gesamt = min(max(gesamt or (6.5 if k['typ'] == 'haupt' else 5.5), 5.0), 20.0)
        baender.append(ln.buffer(gesamt / 2, cap_style=1, join_style=1)); band_knoten.append((k['a'], k['b']))
        if not spuren or ln.length < 15: continue
        sp = sorted(spuren, key=lambda s_: s_[0])   # Versatz links positiv
        for (o1, d1), (o2, d2) in zip(sp, sp[1:]):
            m = (o1 + o2) / 2
            if d1 == d2: gestrichelt(ln, m, 3.0, 6.0, 0.14)    # Leitlinie
            else: gestrichelt(ln, m - 0.18, 1e9, 0, 0.09); gestrichelt(ln, m + 0.18, 1e9, 0, 0.09)   # doppelte durchgezogene Mittellinie
        if k['typ'] == 'haupt' and gesamt >= 9:
            for sgn in (1, -1): gestrichelt(ln, sgn * (gesamt / 2 - 0.5), 1e9, 0, 0.1)
    # Überlappungszonen (Knoten, parallele OSM-Wege, Rampen): dort keine Markierung, sonst kreuzen sich Linien
    baum_b = STRtree(baender); ueber = []
    for i, bd in enumerate(baender):
        for j in baum_b.query(bd):
            j = int(j)
            if j > i and not (set(band_knoten[i]) & set(band_knoten[j])) and baender[j].intersects(bd):
                x = baender[j].intersection(bd)
                if x.area > 25: ueber.append(x)
    ueberlappung = vereinigt(ueber).buffer(1.0) if ueber else Polygon()
    strassen = vereinigt(baender).intersection(gebiet).buffer(1.5, join_style=1).buffer(-1.5, join_style=1).simplify(0.25).buffer(0)
    kreise = vereinigt([Point(knoten_pkt[n]).buffer(9) for n, g in grad.items() if g >= 3 and n in knoten_pkt])
    mark = vereinigt(striche).difference(kreise).difference(ueberlappung).intersection(strassen.buffer(-0.2)) if striche else Polygon()
    platz_fuss = vereinigt(fuss).difference(strassen).intersection(gebiet).simplify(0.3).buffer(0)
    return strassen, strassen, {'markierung': [mark], 'fusszone': [platz_fuss], 'haltestelle': flaechen_art.get('haltestelle', [])}

# ── Triangulierung
FARBE = {'pflaster': 0, 'gehweg': 1, 'bord': 2, 'fahrbahn': 3, 'rad': 4, 'markierung': 5, 'gruen': 6, 'hof': 7, 'wasser': 8, 'platz': 9, 'parkplatz': 10, 'bahnsteig': 11, 'schotter': 12,
         'parkstreifen': 13, 'hofkern': 14, 'gewerbe': 15, 'schulhof': 16, 'sport': 17, 'kleingarten': 18, 'weg': 19, 'linie': 20, 'ufer': 21, 'rasen2': 22,
         'haltestelle': 23, 'fusszone': 24, 'garten': 25, 'tunnel': 26}
def triangulieren(schichten, art, poly):
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
        if basis + len(alle) >= 65000:
            k = (art, k[1], k[2], len(schichten)); e = schichten.setdefault(k, {'p': [], 'i': []}); basis = 0
        for x, z in alle: e['p'] += [round((x + OX) * 10), round((z + OZ) * 10)]
        e['i'] += [int(v) + basis for v in idx]

def hoefe(strassen_alle):
    """Blockinnenräume: außerhalb der Innenstadt Garten (Rasen mit Baumgruppen), in Innenstadt und Gewerbe Hofpflaster
    mit Rasenkern. Keine Streifen und keine Heckenzeilen mehr (wirkten wie Weinbergzeilen)."""
    abstand = strassen_alle.buffer(7, join_style=2)
    sperre = vereinigt([abstand] + [g for a in ('platz', 'parkplatz', 'bahngelaende', 'bahnsteig', 'schulhof', 'sport', 'kleingarten', 'gruen', 'wasser') for g in flaechen_art.get(a, [])])
    alle = gebiet.difference(sperre)
    gewerbe_p = prep(vereinigt(flaechen_art.get('gewerbe', [])))
    alle = vereinigt([q.buffer(-2).buffer(2) for q in teile(alle) if q.area > 250]).simplify(1.0).buffer(0)
    gaerten, pflaster = [], []
    for q in teile(alle):
        if not (kern.contains(q.centroid) or gewerbe_p.contains(q.centroid)):
            gaerten.append(q); continue
        rasen = q.buffer(-7, join_style=1) if q.area > 600 else Polygon()
        if rasen.is_empty or rasen.area < 120: pflaster.append(q); continue
        gaerten.append(rasen); pflaster.append(q.difference(rasen))
    return vereinigt(gaerten), vereinigt(pflaster), []

def parkplaetze(strassen_alle):
    """Parkplätze: nur kompakte Flächen bekommen Stellreihen (parallel zur langen Seite, Rücken an Rücken, Fahrgasse 6 m),
    geparkte Autos (etwa 60 % der Stände) und eine Hecke an den Seiten ohne Straße. Verwinkelte Flächen werden Pflaster."""
    rr = random.Random(23)
    linien, pflaster, autos, hecken = [], [], [], []
    strasse_nah = prep(strassen_alle.buffer(6))
    for pk in teile(vereinigt(flaechen_art.get('parkplatz', [])).intersection(gebiet).difference(strassen_alle.buffer(1.0))):
        if pk.area < 120: continue
        r = pk.minimum_rotated_rectangle
        if pk.area < 250 or pk.area / max(r.area, 1) < 0.72: pflaster.append(pk); continue
        c = list(r.exterior.coords)[:4]
        l01, l12 = math.dist(c[0], c[1]), math.dist(c[1], c[2])
        a, b, d = (c[0], c[1], c[3]) if l01 >= l12 else (c[1], c[2], c[0])
        L, TT = math.dist(a, b), math.dist(a, d)
        if TT < 11: pflaster.append(pk); continue
        ux, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L; vx, vz = (d[0] - a[0]) / TT, (d[1] - a[1]) / TT
        innen = pk.buffer(-1.0, join_style=2); innen_p = prep(innen)
        P = lambda u, t: (a[0] + ux * u + vx * t, a[1] + uz * u + vz * t)
        striche = []
        reihen = []
        t = 1.0
        while t + 5 <= TT - 1.0:
            reihen.append(t)
            if t + 10 <= TT - 1.0: reihen.append(t + 5)
            t += 16
        for t0 in reihen:
            u = 1.0
            while u + 2.5 <= L - 1.0:
                stand = Polygon([P(u, t0), P(u + 2.5, t0), P(u + 2.5, t0 + 5), P(u, t0 + 5)])
                if innen_p.contains(stand):
                    striche.append(LineString([P(u, t0), P(u, t0 + 5)]).buffer(0.07, cap_style=2))
                    striche.append(LineString([P(u + 2.5, t0), P(u + 2.5, t0 + 5)]).buffer(0.07, cap_style=2))
                    if rr.random() < 0.6:
                        x, z = P(u + 1.25, t0 + 2.5)
                        autos.append((round(x, 1), round(z, 1), round(math.atan2(-vz, vx), 2), rr.randrange(8)))
                u += 2.5
        if striche: linien.append(vereinigt(striche))
        # Hecke an den Rändern, die nicht an eine Straße grenzen (dort liegen die Zufahrten)
        ring = pk.exterior; u = 1.0
        while u < ring.length:
            q = ring.interpolate(u)
            if not strasse_nah.contains(q): hecken.append((q.x, q.y))
            u += 2.2
    # doppelte Autos (überlappende Teilflächen) entfernen: 4,5 m Mindestabstand
    frei_autos = []
    for a_ in autos:
        if all(math.dist(a_[:2], b_[:2]) > 4.5 for b_ in frei_autos[-60:]): frei_autos.append(a_)
    return vereinigt(linien) if linien else Polygon(), vereinigt(pflaster) if pflaster else Polygon(), frei_autos, hecken

def boden_variante(name, schichten):
    log(f'[{name}] Straßen …')
    strassen, strassen_alle, zus = strassen_karte_baender() if name == 'karte' else strassen_coffee()
    # Gehweg mit geschlossenen Zwickeln: schmale Restspalten (< 9 m) zwischen parallelen Straßen werden Gehweg statt Streifenmuster
    gehweg_aussen = strassen_alle.buffer(3.4 if name == 'karte' else 3.0, join_style=2).buffer(4.5, join_style=1).buffer(-4.5, join_style=1).simplify(0.3).buffer(0)
    bord = strassen_alle.buffer(0.4, join_style=2).difference(strassen_alle)
    gehweg = gehweg_aussen.difference(strassen_alle).difference(bord).simplify(0.3).buffer(0)
    bord = bord.simplify(0.2).buffer(0)
    log(f'[{name}] Höfe …')
    garten, hofpflaster, hecken = hoefe(strassen_alle)
    log(f'[{name}] Triangulieren …')
    T = lambda art, g: triangulieren(schichten, art, g)
    pk_linien, pk_pflaster, pk_autos, pk_hecken = parkplaetze(strassen_alle)
    # verwinkelte Parkplätze werden begrünt statt als leere Pflasterfläche gezeigt
    T('gehweg', gehweg); T('bord', bord); T('garten', vereinigt([garten, pk_pflaster])); T('hofkern', hofpflaster)
    for art, liste in flaechen_art.items():
        # Bahngelände: Böschungsgrün (Schotter liegt nur unter den Gleisen, siehe gleis() in kartenstadt.js);
        # Bahnsteige baut die Laufzeit als erhöhte Körper; Parkplätze nur die kompakten (Rest ist Pflaster)
        a = {'bahngelaende': 'rasen2'}.get(art, art)
        if art == 'bahngelaende':
            # Schotter nur im Gleisbereich (auch Straßenbahn-Betriebshöfe), Rest Böschungsgrün
            T('rasen2', vereinigt(liste).intersection(gebiet).difference(GLEISBETT)); continue
        if art == 'parkplatz':
            g = vereinigt(liste).intersection(gebiet).difference(strassen_alle.buffer(1.0)).difference(pk_pflaster)
            T('parkplatz', g); continue
        if a in FARBE and a not in ('haltestelle', 'gewerbe', 'bahnsteig'):
            T(a, vereinigt(liste).intersection(gebiet))   # vereinigt: überlappende OSM-Flächen derselben Art flackern sonst
    breite = lambda w: 1.0 if w['art'] == 'steps' else 1.6 if w['art'] == 'path' else 2.2
    # Fußwege nur im Grünen (Parks, Gärten, Kleingärten, Schul- und Sportgelände); auf Pflaster wirken sie wie Straßengewirr
    gruenzone = vereinigt([garten] + [g for a in ('gruen', 'kleingarten', 'schulhof', 'sport') for g in flaechen_art.get(a, [])]).buffer(1)
    wege = vereinigt([LineString(w['punkte']).buffer(breite(w) / 2, cap_style=2, join_style=2) for w in wege_linien]).difference(gehweg_aussen).intersection(gebiet).intersection(gruenzone).simplify(0.25).buffer(0)
    T('weg', wege)
    log(f'[{name}] Plätze …')
    # Plätze: Pflasterraster als feine Fugenbänder, damit große Plätze nicht als leere Fläche wirken
    fugen = []
    plaetze = flaechen_art.get('platz', []) + [q for q in teile(vereinigt(zus.get('fusszone', []))) if q.area > 300]
    for pl in plaetze:
        if pl.area < 300: continue
        x0, z0, x1, z1 = pl.bounds; x = math.floor(x0 / 6) * 6
        while x < x1: fugen.append(LineString([(x, z0), (x, z1)]).buffer(0.09, cap_style=2)); x += 6
        z = math.floor(z0 / 6) * 6
        while z < z1: fugen.append(LineString([(x0, z), (x1, z)]).buffer(0.09, cap_style=2)); z += 6
        fugen = [vereinigt(fugen).intersection(pl.buffer(-1.5))]
        T('linie', fugen.pop())
    if not pk_linien.is_empty: T('linie', pk_linien)
    for f in osm.get('sportfelder', []):
        g = gueltig(f['umriss'])
        if g is None or g.is_empty or g.area < 150 or not im(f['umriss']): continue
        innen = g.minimum_rotated_rectangle.buffer(-1.2, join_style=2)
        if innen.is_empty: continue
        T('linie', innen.difference(innen.buffer(-0.18, join_style=2)))
        c = list(innen.exterior.coords)[:4]
        seiten = sorted([(math.dist(c[i], c[(i + 1) % 4]), i) for i in range(4)])
        i = seiten[0][1]; j = (i + 2) % 4
        m1 = ((c[i][0] + c[(i + 1) % 4][0]) / 2, (c[i][1] + c[(i + 1) % 4][1]) / 2); m2 = ((c[j][0] + c[(j + 1) % 4][0]) / 2, (c[j][1] + c[(j + 1) % 4][1]) / 2)
        mitte = ((m1[0] + m2[0]) / 2, (m1[1] + m2[1]) / 2)
        d = (m2[0] - m1[0], m2[1] - m1[1]); L = math.hypot(*d) or 1
        q = (-d[1] / L, d[0] / L); halb = seiten[2][0] / 2
        T('linie', LineString([(mitte[0] - q[0] * halb, mitte[1] - q[1] * halb), (mitte[0] + q[0] * halb, mitte[1] + q[1] * halb)]).buffer(0.09, cap_style=2))
        T('linie', Point(mitte).buffer(3.0).difference(Point(mitte).buffer(2.82)))
    for g in flaechen_art.get('wasser', []): T('ufer', g.buffer(1.2, join_style=2).difference(g).intersection(gebiet))
    if not gruen.is_empty:
        rr = random.Random(5); flecken = []
        for q in teile(gruen):
            if q.area < 2500: continue
            x0, z0, x1, z1 = q.bounds
            for _ in range(int(q.area / 1800)): flecken.append(Point(rr.uniform(x0, x1), rr.uniform(z0, z1)).buffer(rr.uniform(7, 16), 6))
        if flecken: T('rasen2', vereinigt(flecken).intersection(gruen))
    # Gleisbett unter allen Eisenbahngleisen (auch außerhalb von Bahngelände), sonst liegen Schienen auf Pflaster oder Rasen
    T('schotter', GLEISBETT.difference(strassen_alle.buffer(0.5)).intersection(gebiet))
    T('fahrbahn', strassen)
    # Tunnelmünder: Straßen, die in eine Unterführung abtauchen, enden in einer dunklen Rampe statt stumpf an Gleis oder Bahnsteig
    muender = []
    for k in netz:
        if not im(k['punkte']) or k['typ'] == 'fussgaenger': continue
        gesamt = min(max(spuren_je_weg.get(k['way'], (None, None))[0] or (6.5 if k['typ'] == 'haupt' else 5.5), 5.0), 14.0)
        ln = LineString(k['punkte'])
        for ende, flag in ((0, k.get('mund_a')), (1, k.get('mund_b'))):
            if not flag or ln.length < 4: continue
            a_, b_ = (0, min(9, ln.length)) if ende == 0 else (max(0, ln.length - 9), ln.length)
            stueck = LineString([ln.interpolate(a_), ln.interpolate(b_)])
            muender.append(stueck.buffer(gesamt / 2, cap_style=2))
    if muender: T('tunnel', vereinigt(muender).intersection(strassen.buffer(0.3)))
    fb_maske = prep(strassen_alle.buffer(0.3))
    for art, liste in zus.items():
        for g in liste:
            if g is None or g.is_empty: continue
            if art == 'markierung': g = g.intersection(strassen_alle.buffer(-0.15)).difference(GLEISBETT).difference(_tramband)   # nur auf Fahrbahn, nie im Gleis
            if art != 'markierung': g = g.difference(GLEISBETT.difference(strassen.buffer(0.3)))   # nichts Straßiges auf Gleisen   # keine Markierung neben der Fahrbahn (z. B. auf weggelassenen Zufahrten)
            T(art, g.intersection(gebiet))
    garten = vereinigt([garten, pk_pflaster])
    return {'strassen_alle': strassen_alle, 'gehweg_aussen': gehweg_aussen, 'garten': garten, 'hofpflaster': hofpflaster, 'hecken': hecken, 'wege': wege, 'plaetze': plaetze, 'pk_autos': pk_autos, 'pk_hecken': pk_hecken}

# ── Deko je Variante
DEKO = {'linde': 1, 'platane': 2, 'kastanie': 3, 'birke': 4, 'nadel': 5, 'busch': 6, 'laterne': 7, 'altlaterne': 8, 'bank': 9,
        'kuebel': 10, 'poller': 11, 'litfass': 12, 'muelleimer': 13, 'fahrradstaender': 14, 'laube': 15, 'strassenbaum': 16, 'pappel': 17, 'hecke': 18}
geb_polys = [Polygon([(p[0], p[1]) for p in g['boden'][0]]).buffer(0) for g in lod['gebaeude'] if g['boden'] and len(g['boden'][0]) >= 3]
geb_baum = STRtree(geb_polys)
def frei(x, z, rad):
    pt = Point(x, z)
    return all(geb_polys[i].distance(pt) >= rad for i in geb_baum.query(pt.buffer(rad)))
def deko(name, g):
    r = random.Random(77); out = []
    sperre_fb = prep(g['strassen_alle'].buffer(0.6))
    def setz(art, x, z, w=None):
        if GLEISBETT_P.contains(Point(x, z)): return   # nichts im Gleis
        if abs(x - MX) <= R and abs(z - MZ) <= R: out.append((DEKO[art], x, z, r.random() * 2 * math.pi if w is None else w))
    strassennah = prep(g['gehweg_aussen'].buffer(2))
    for x, z in osm['baeume']:
        if abs(x - MX) <= R and abs(z - MZ) <= R and not sperre_fb.contains(Point(x, z)):
            setz('strassenbaum' if strassennah.contains(Point(x, z)) else r.choice(['linde', 'kastanie', 'platane', 'birke']), x, z)
    log(f'[{name}] Deko Parks …')
    rauschen = lambda x, z: math.sin(x / 37.0) * math.cos(z / 29.0) + 0.6 * math.sin((x + z) / 19.0) + 0.4 * math.cos((x - 2 * z) / 23.0)
    wege_p = prep(g['wege'].buffer(1.5)) if not g['wege'].is_empty else None
    for flaeche, mix, basis, schritt in ((gruen, ['linde', 'kastanie', 'linde', 'birke', 'platane', 'nadel', 'pappel'], 0.55, 9),
                                         (g['garten'], ['birke', 'linde', 'kastanie', 'nadel', 'busch', 'busch'], 0.6, 7), (g['hofpflaster'], ['linde', 'platane', 'birke'], 0.3, 11)):
        if flaeche.is_empty: continue
        pf = prep(flaeche.buffer(-2.0))
        x0, z0, x1, z1 = flaeche.bounds
        x = x0
        while x < x1:
            z = z0
            while z < z1:
                px, pz = x + (r.random() - 0.5) * schritt * 0.8, z + (r.random() - 0.5) * schritt * 0.8
                n = rauschen(px, pz)
                dichte = basis * (0.15 if n < -0.2 else 1.0 if n > 0.6 else 0.55)
                if r.random() < dichte and pf.contains(Point(px, pz)) and (wege_p is None or not wege_p.contains(Point(px, pz))) and frei(px, pz, 3):
                    setz(r.choice(mix), px, pz)
                z += schritt
            x += schritt
    log(f'[{name}] Deko Ränder, Möbel …')
    if not gruen.is_empty:
        for q in teile(gruen):
            if q.area < 400: continue
            u = 0
            while u < q.exterior.length:
                p = q.exterior.interpolate(u)
                if r.random() < 0.55 and not sperre_fb.contains(p) and frei(p.x, p.y, 1.2): setz('busch', p.x, p.y)
                u += 3.2 * (1 + r.random() * 2)
    for x, z in g['pk_hecken']:
        if frei(x, z, 1.0): setz('hecke', x, z)
    # Bahnböschungen: Buschgruppen abseits der Gleise
    gleis_nah = prep(gleisflaeche.buffer(3))
    for q in teile(vereinigt(flaechen_art.get('bahngelaende', [])).intersection(gebiet)):
        x0, z0, x1, z1 = q.bounds; pq = prep(q.buffer(-1.5)); x = x0
        while x < x1:
            zz = z0
            while zz < z1:
                px, pz = x + r.uniform(-4, 4), zz + r.uniform(-4, 4)
                if r.random() < 0.35 and pq.contains(Point(px, pz)) and not gleis_nah.contains(Point(px, pz)) and frei(px, pz, 2):
                    setz(r.choice(['busch', 'busch', 'birke', 'pappel']), px, pz)
                zz += 9
            x += 9
    for ln in g['hecken']:
        for teil in (ln.geoms if hasattr(ln, 'geoms') else [ln]):
            if not hasattr(teil, 'interpolate'): continue
            u = 0
            while u < teil.length:
                p = teil.interpolate(u)
                if frei(p.x, p.y, 1.0): setz('hecke', p.x, p.y)
                u += 2.0
    for k in netz:
        if k['typ'] != 'fussgaenger' or not im(k['punkte']): continue
        ln = LineString(k['punkte']); u, i = 6, 0
        while u < ln.length - 3:
            p = ln.interpolate(u); q = ln.interpolate(min(ln.length, u + 1))
            dx, dz = q.x - p.x, q.y - p.y; l = math.hypot(dx, dz) or 1
            nx, nz = -dz / l, dx / l; seite = 1 if i % 2 else -1; w = math.atan2(-dz, dx)
            ok = lambda x, z, rad=1.0: not sperre_fb.contains(Point(x, z)) and frei(x, z, rad)
            if ok(p.x + nx * seite * 4.5, p.y + nz * seite * 4.5): setz('altlaterne', p.x + nx * seite * 4.5, p.y + nz * seite * 4.5, 0)
            if i % 2 == 0 and ok(p.x - nx * seite * 3.2, p.y - nz * seite * 3.2):
                setz('bank', p.x - nx * seite * 3.2, p.y - nz * seite * 3.2, w + (math.pi if seite > 0 else 0))
                setz('kuebel', p.x - nx * seite * 3.2 + dx / l * 2.2, p.y - nz * seite * 3.2 + dz / l * 2.2, 0)
            if i % 5 == 2 and ok(p.x + nx * seite * 2.0, p.y + nz * seite * 2.0): setz('litfass', p.x + nx * seite * 2.0, p.y + nz * seite * 2.0, 0)
            if i % 3 == 1 and ok(p.x + nx * seite * 3.6, p.y + nz * seite * 3.6): setz('muelleimer', p.x + nx * seite * 3.6, p.y + nz * seite * 3.6, 0)
            if i % 7 == 3 and ok(p.x - nx * seite * 4.2, p.y - nz * seite * 4.2): setz('fahrradstaender', p.x - nx * seite * 4.2, p.y - nz * seite * 4.2, w)
            if i % 2 == 1 and ok(p.x, p.y, 3): setz('strassenbaum', p.x, p.y)
            u += 14; i += 1
    for k in netz:
        if k['typ'] == 'fussgaenger' or not im(k['punkte']): continue
        ln = LineString(k['punkte'])
        gesamt = spuren_je_weg.get(k['way'], (None, None))[0] or (6.5 if k['typ'] == 'haupt' else 5.5)
        halb = min(max(gesamt, 5.0), 14.0) / 2 + 1.2
        u, i, abst = 8, 0, (28 if k['typ'] == 'haupt' else 34)
        while u < ln.length - 4:
            p = ln.interpolate(u); q = ln.interpolate(min(ln.length, u + 1))
            dx, dz = q.x - p.x, q.y - p.y; l = math.hypot(dx, dz) or 1
            nx, nz = -dz / l, dx / l; seite = 1 if i % 2 else -1
            x, z = p.x + nx * seite * halb, p.y + nz * seite * halb
            if not sperre_fb.contains(Point(x, z)) and frei(x, z, 1.0): setz('laterne', x, z, math.atan2(-nz * seite, -nx * seite))
            if k['typ'] == 'haupt':
                x2, z2 = p.x - nx * seite * (halb + 0.6) + dx / l * 9, p.y - nz * seite * (halb + 0.6) + dz / l * 9
                if not sperre_fb.contains(Point(x2, z2)) and frei(x2, z2, 3): setz('strassenbaum', x2, z2)
            u += abst; i += 1
    # Plätze: Baumreihe 3 m innerhalb des Randes, Bänke und Leuchten dazwischen, große Plätze mit Baumhain in der Mitte
    for pl in g['plaetze']:
        if pl.area < 300: continue
        innen = pl.buffer(-3, join_style=2)
        for ring in [q.exterior for q in teile(innen)]:
            u, i = 4, 0
            while u < ring.length - 2:
                pt = ring.interpolate(u); q2 = ring.interpolate(min(ring.length, u + 1)); w = math.atan2(-(q2.y - pt.y), q2.x - pt.x)
                if not sperre_fb.contains(pt):
                    if i % 3 == 0 and frei(pt.x, pt.y, 3): setz(r.choice(['linde', 'platane']), pt.x, pt.y)
                    elif i % 3 == 1 and frei(pt.x, pt.y, 1.2): setz('bank', pt.x, pt.y, w)
                    elif frei(pt.x, pt.y, 1.0): setz('altlaterne', pt.x, pt.y, 0)
                u += 6; i += 1
        kern_pl = pl.buffer(-14, join_style=2)
        if not kern_pl.is_empty and kern_pl.area > 150:
            x0, z0, x1, z1 = kern_pl.bounds; pk = prep(kern_pl); x = x0 + 4
            while x < x1:
                z = z0 + 4
                while z < z1:
                    if pk.contains(Point(x, z)) and frei(x, z, 3):
                        setz(r.choice(['platane', 'linde']) if r.random() < 0.6 else r.choice(['kuebel', 'bank', 'muelleimer']), x, z, r.choice([0, math.pi / 2]))
                    z += 11
                x += 11
    for kg in flaechen_art.get('kleingarten', []):
        x0, z0, x1, z1 = kg.bounds; pg = prep(kg.buffer(-3))
        x = x0 + 6
        while x < x1 - 4:
            z = z0 + 6
            while z < z1 - 4:
                if pg.contains(Point(x, z)) and frei(x, z, 2):
                    setz('laube', x + r.uniform(-2, 2), z + r.uniform(-2, 2), r.choice([0, math.pi / 2]))
                    for kk in range(4): setz('hecke', x - 7 + kk * 3.5, z - 7)
                    if r.random() < 0.6: setz(r.choice(['birke', 'kastanie', 'busch']), x + 4, z + 3)
                z += 14
            x += 14
    return out

def b64(arr, typ): return base64.b64encode(np.clip(np.asarray(arr, dtype=np.int64), 0, 65535).astype(typ).tobytes()).decode()
P = lambda pts: [v for x, z in pts for v in (round((x + OX) * 10), round((z + OZ) * 10))]
BP, BI = [], []
def boden_packen(schichten):
    liste = []
    for k, e in sorted(schichten.items(), key=lambda kv: (FARBE[kv[0][0]], kv[0][1:])):
        liste.append([FARBE[k[0]], len(BP) // 2, len(e['p']) // 2, len(BI), len(e['i'])]); BP.extend(e['p']); BI.extend(e['i'])
    return liste
def deko_packen(d):
    return {'typ': base64.b64encode(bytes(t for t, _, _, _ in d)).decode(), 'w': base64.b64encode(bytes(int((w % (2 * math.pi)) / (2 * math.pi) * 255) for _, _, _, w in d)).decode(),
            'p': b64([v for _, x, z, _ in d for v in (round((x + OX) * 10), round((z + OZ) * 10))], '<u2'), 'arten': list(DEKO)}

varianten, geo_var = {}, {}
for name in ('karte', 'coffee'):
    sch = {}
    geo_var[name] = boden_variante(name, sch)
    varianten[name] = {'boden': boden_packen(sch), 'deko': deko_packen(deko(name, geo_var[name]))}

# ── Bebaubare Fläche für Spielhäuser: ohne Fahrbahnen beider Varianten samt Gehweg, Gleise, Bahnsteige, Wasser, Parks
log('Bebaubar …')
sperre_bau = vereinigt([geo_var['karte']['gehweg_aussen'], geo_var['coffee']['gehweg_aussen'], gleisflaeche.buffer(2)] +
                       flaechen_art.get('bahnsteig', []) + flaechen_art.get('bahngelaende', []) + flaechen_art.get('wasser', []) +
                       [q for q in teile(gruen) if q.area > 2500])
bebaubar = gebiet.difference(sperre_bau).simplify(0.8).buffer(0)
bebaubar_out = [[P(list(q.exterior.coords))] + [P(list(i.coords)) for i in q.interiors] for q in teile(bebaubar) if q.area > 800]

# ── Bahnhof: erhöhte Bahnsteige, Dachmodule entlang der Bahnsteigachse, abgestellte Züge
# (Bahnsteige zusammengeführt und unter echten Gebäuden ausgespart; Dächer als Rechteckmodule à 30 m, dadurch keine Stufen)
_bau = vereinigt([Polygon([(p[0], p[1]) for p in g['boden'][0]]).buffer(0.5) for g in lod['gebaeude'] if g['boden'] and len(g['boden'][0]) >= 3 and (g['fkt'] or '').startswith('31001')])
W = lambda x, z: [round(x + OX, 1), round(z + OZ, 1)]
bahnsteige_out, daecher, zuege = [], [], []
_alle_bau = vereinigt([Polygon([(p[0], p[1]) for p in g['boden'][0]]).buffer(0) for g in lod['gebaeude'] if g['boden'] and len(g['boden'][0]) >= 3 and not (g['fkt'] or '').startswith(('51009', '53001'))])
_bau_p = prep(_alle_bau); _str_c = prep(geo_var['coffee']['strassen_alle']); _str_k = prep(geo_var['karte']['strassen_alle']); _dachgrund = {}
_steige = [q for q in teile(vereinigt(flaechen_art.get('bahnsteig', [])).intersection(gebiet).difference(_bau)) if q.area > 40]
_schienen = [LineString(g['punkte']) for g in osm['gleise'] if g['art'] == 'rail' and len(g['punkte']) >= 2 and im(g['punkte'])]
_benutzt = set()
_rz = random.Random(11)
def _achse(poly):
    c = list(poly.minimum_rotated_rectangle.exterior.coords)[:4]
    l01, l12 = math.dist(c[0], c[1]), math.dist(c[1], c[2])
    a_, b_ = (c[0], c[1]) if l01 >= l12 else (c[1], c[2])
    L = max(l01, l12); return a_, ((b_[0] - a_[0]) / L, (b_[1] - a_[1]) / L), L, min(l01, l12)
for g in _steige:
    ring = g.simplify(0.3).exterior.coords
    bahnsteige_out.append([v for x, z in list(ring)[:-1] for v in W(x, z)])
    a0, (ux, uz), L, Bq = _achse(g)
    if Bq < 4 or L < 30: continue
    u = 0.12 * L
    while u < 0.88 * L - 8:
        w = min(30, 0.88 * L - u)
        streifen = Polygon([(a0[0] + ux * u - uz * 500, a0[1] + uz * u + ux * 500), (a0[0] + ux * (u + w) - uz * 500, a0[1] + uz * (u + w) + ux * 500),
                            (a0[0] + ux * (u + w) + uz * 500, a0[1] + uz * (u + w) - ux * 500), (a0[0] + ux * u + uz * 500, a0[1] + uz * u - ux * 500)])
        teil = g.buffer(-0.8).intersection(streifen)
        if not teil.is_empty and teil.area > 40:
            _, (mx, mz), lm, bm = _achse(teil)
            if (mx * ux + mz * uz) < 0.7: mx, mz = ux, uz   # Modul folgt der Bahnsteigachse
            cc = teil.centroid
            Lm, Bm = w - 1.2, max(3, min(bm, Bq) * 0.72)
            qx_, qz_ = -mz, mx
            modul = Polygon([(cc.x + sx * mx * Lm / 2 + sy * qx_ * Bm / 2, cc.y + sx * mz * Lm / 2 + sy * qz_ * Bm / 2) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
            # kein Dach über Straße oder in einem Gebäude
            _grund = 'bau' if _bau_p.intersects(modul) else 'strasse_c' if _str_c.intersects(modul) else 'strasse_k' if _str_k.intersects(modul) else None
            _dachgrund[_grund] = _dachgrund.get(_grund, 0) + 1
            if _grund is None:
                daecher.append(W(cc.x, cc.y) + [round(mx, 3), round(mz, 3), round(Lm, 1), round(Bm, 1)])
        u += w
    # Züge an den Bahnsteigkanten: je Gleis höchstens einer, mittig am Bahnsteig
    zone = g.buffer(5).difference(g.buffer(0.8))
    for si, sl in enumerate(_schienen):
        if si in _benutzt or not sl.intersects(zone): continue
        stueck = sl.intersection(zone)
        teile_l = [q for q in (stueck.geoms if hasattr(stueck, 'geoms') else [stueck]) if q.geom_type == 'LineString']
        if not teile_l: continue
        lang = max(teile_l, key=lambda q: q.length)
        if lang.length < 70 or _rz.random() < 0.4: continue
        _benutzt.add(si)
        typ = 0 if _rz.random() < 0.5 else 1
        wagen = min(int(lang.length // 26.5), 7 if typ == 0 else 5)
        start = (lang.length - wagen * 26.5) / 2
        for k in range(wagen):
            p0 = lang.interpolate(start + k * 26.5 + 0.4); p1 = lang.interpolate(start + (k + 1) * 26.5 - 0.4)
            mx_, mz_ = (p0.x + p1.x) / 2, (p0.y + p1.y) / 2
            zuege.append(W(mx_, mz_) + [round(math.atan2(-(p1.y - p0.y), p1.x - p0.x), 3), typ, 1 if k == 0 else 2 if k == wagen - 1 else 0])
log(len(bahnsteige_out), 'Bahnsteige', len(daecher), 'Dachmodule', len(zuege), 'Zugwagen', _dachgrund)

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
# Kleine LoD2-Teile, die fast ganz auf einem größeren Gebäude stehen (Aufzugsschächte, Lüfter), wirken als schwebende Klötze: weglassen
_gp = [(Polygon([(p[0], p[1]) for p in g['boden'][0]]).buffer(0) if g['boden'] and len(g['boden'][0]) >= 3 else None) for g in lod['gebaeude']]
_baum = STRtree([q if q is not None else Point(1e9, 1e9) for q in _gp])
aufbau = set()
for i, q in enumerate(_gp):
    if q is None or q.area >= 80: continue
    for j in _baum.query(q):
        j = int(j); w = _gp[j]
        if j != i and w is not None and w.area > 3 * q.area and w.intersection(q).area > 0.7 * q.area: aufbau.add(i); break
log(f'{len(aufbau)} Dachaufbauten entfernt')
# Gebäudeteile über dem Gleisfeld (Bahnhofshallen-Teile, Überbauungen): weglassen, sonst laufen Gleise unter flache Blöcke
_gleis_p = prep(gleisflaeche)
for i, q in enumerate(_gp):
    if q is not None and q.area > 0 and _gleis_p.intersects(q) and q.intersection(gleisflaeche).area > 0.12 * q.area: aufbau.add(i)
_gleislinien = vereinigt([LineString(g['punkte']) for g in osm['gleise'] if len(g['punkte']) >= 2 and g['art'] != 'tram'])
for i, q in enumerate(_gp):
    if q is not None and i not in aufbau and q.area > 0 and math.dist((q.centroid.x, q.centroid.y), (190, 371)) > 45 and q.intersection(_gleislinien).length > 1.5: aufbau.add(i)   # Gleis läuft unter dem Bau durch (Hbf-Empfangsgebäude bleibt)
_bett_p = prep(GLEISBETT)
for i, q in enumerate(_gp):
    if q is not None and i not in aufbau and q.area > 0 and math.dist((q.centroid.x, q.centroid.y), (190, 371)) > 45 and _bett_p.contains(q.centroid): aufbau.add(i)   # Bau mitten im Gleisbett
log(f'{len(aufbau)} Dachaufbauten und Gleisüberbauten entfernt')
for gi, g in enumerate(lod['gebaeude']):
    if not g['boden'] or gi in aufbau: continue
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

# Gehwegseiten je Kante und Variante: Bit 0/1 Kartentreue links/rechts (v = −1/+1), Bit 2/3 Coffee. Eine Seite gilt nur,
# wenn mindestens 90 % der Gehweglinie neben der Fahrbahn liegen (sonst liefen Passanten über Fahrbahnen, z. B. bei getrennten Richtungsfahrbahnen)
_gleis_alle = vereinigt([LineString(g['punkte']).buffer(2.2) for g in osm['gleise'] if len(g['punkte']) >= 2 and im(g['punkte'])])
_fb_prep = {n: prep(geo_var[n]['strassen_alle'].union(_gleis_alle)) for n in ('karte', 'coffee')}
def fuss_seiten(k, gesamt):
    quer = 3.0 if k['typ'] == 'fussgaenger' else gesamt / 2 + 1.6
    ln = LineString(k['punkte'])
    if ln.length < 1: return 15
    bits = 0
    for vi, (name, seite) in enumerate([('karte', -1), ('karte', 1), ('coffee', -1), ('coffee', 1)]):
        n = ok = 0; rand = min(8.0, ln.length / 4); u = rand   # Kreuzungsbereiche an den Enden auslassen
        while u < ln.length - rand:
            a, b = ln.interpolate(u), ln.interpolate(min(u + 0.5, ln.length))
            dx, dz = b.x - a.x, b.y - a.y; l = math.hypot(dx, dz) or 1
            px, pz = a.x - dz / l * seite * quer, a.y + dx / l * seite * quer
            n += 1; ok += not _fb_prep[name].contains(Point(px, pz))
            u += 4.0
        if n == 0 or ok == n: bits |= 1 << vi
    return bits

# ── Straßennetz mit Fahrspuren: [Typ, Bandbreite (dm), Einbahn, Knoten a, Knoten b, Punkte, Spuren [Versatz links (dm), Richtung]…]
TYP = {'haupt': 1, 'neben': 2, 'fussgaenger': 3}
knoten = {}
kn = lambda k: knoten.setdefault(k, len(knoten))
netz_out = []
for k in netz:
    if not im(k['punkte']): continue
    gesamt, spuren = spuren_je_weg.get(k['way'], (None, None))
    if k['typ'] == 'fussgaenger': gesamt, spuren = 0, []
    elif not spuren:
        gesamt = 6.5 if k['typ'] == 'haupt' else 5.5
        spuren = [(gesamt / 4, -1), (-gesamt / 4, 1)] if not k['einbahn'] else [(0, 1)]
    gesamt = min(max(gesamt or 0, 0), 14.0)
    netz_out.append([TYP[k['typ']], round(gesamt * 10), 1 if k['einbahn'] else 0, kn(k['a']), kn(k['b']), P(k['punkte']),
                     [v for o, d in spuren for v in (round(o * 10), d)], fuss_seiten(k, gesamt), (1 if k.get('mund_a') else 0) | (2 if k.get('mund_b') else 0)])

out = {
    'stadt': 'essen', 'lizenz': '© OpenStreetMap-Mitwirkende, ODbL; Geobasis NRW, dl-de/zero-2-0',
    'quellen': ['Straßen: osm2streets (Apache-2.0) aus OpenStreetMap', 'Gleise, Flächen, Bäume, Straßennetz: OpenStreetMap', 'Gebäude: 3D-Gebäudemodell LoD2 NRW'],
    'ursprung': [OX, OZ], 'breite': BREITE, 'tiefe': TIEFE, 'farben': list(FARBE),
    'varianten': varianten, 'bp': b64(BP, '<u2'), 'bi': b64(BI, '<u2'),
    'gp': b64(GP, '<u2'), 'gi': b64(GI, '<u2'), 'fkt': list(FKT),
    'gleise': [[{'rail': 1, 'light_rail': 2, 'tram': 3}[g['art']], P(g['punkte'])] for g in osm['gleise'] if g['art'] in ('rail', 'light_rail', 'tram') and im(g['punkte'])],
    'bebaubar': bebaubar_out, 'daecher': daecher, 'bahnsteige': bahnsteige_out, 'zuege': zuege, 'netz': netz_out, 'gebaeude': gebaeude,
    'parkautos': {n: [[x + OX, z + OZ, w, f] for x, z, w, f in geo_var[n]['pk_autos']] for n in ('karte', 'coffee')},
}
json.dump(out, open(ziel, 'w'), separators=(',', ':'), ensure_ascii=False)
log(ziel, os.path.getsize(ziel) // 1024, 'KB', len(gebaeude), 'Gebäude', {k: len(v['boden']) for k, v in varianten.items()}, 'Bodenstücke', len(bebaubar_out), 'Bauflächen', len(daecher), 'Dächer')
