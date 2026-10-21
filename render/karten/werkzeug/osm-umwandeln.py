"""Wandelt einen Overpass-Export (out geom) in eine Kartendatei für den Spiel-Stadtplan um.

Aufruf: python3 -I osm-umwandeln.py <overpass.json> <ziel.json> <stadt-id> <lat> <lon> <radius_m> [<overrides.json>]
Koordinaten in Metern, Ursprung = (lat, lon), x nach Osten, z nach Süden (Nord = -z). Daten © OpenStreetMap-Mitwirkende, ODbL.
"""
import json, math, sys
from shapely.geometry import LineString, Polygon, box
from shapely.ops import linemerge, unary_union

quelle, ziel, sid, LAT0, LON0, R = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
over = json.load(open(sys.argv[7], encoding='utf-8')) if len(sys.argv) > 7 else {}
d = json.load(open(quelle, encoding='utf-8'))
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 110574
RAHMEN = box(-R, -R, R, R)

def xy(g): return [((p['lon'] - LON0) * KX, -(p['lat'] - LAT0) * KZ) for p in g]
def runde(cs): return [[round(x, 1), round(z, 1)] for x, z in cs]
def linie(cs, tol):
    if len(cs) < 2: return []
    g = LineString(cs).intersection(RAHMEN)
    if g.is_empty: return []
    teile = [g] if g.geom_type == 'LineString' else [x for x in getattr(g, 'geoms', []) if x.geom_type == 'LineString']
    return [runde(t.simplify(tol).coords) for t in teile if t.length > 1]
def flaeche(cs, tol):
    if len(cs) < 4: return []
    p = Polygon(cs)
    if not p.is_valid: p = p.buffer(0)
    g = p.intersection(RAHMEN)
    if g.is_empty: return []
    teile = [g] if g.geom_type == 'Polygon' else [x for x in getattr(g, 'geoms', []) if x.geom_type == 'Polygon']
    return [runde(t.simplify(tol).exterior.coords) for t in teile if t.area > 4]
def ringe(rel):
    """Äußere Ringe einer Multipolygon-Relation aus den Mitgliedswegen zusammensetzen."""
    linien = [LineString(xy(m['geometry'])) for m in rel.get('members', []) if m.get('role') in ('outer', '') and m.get('geometry') and len(m['geometry']) > 1]
    if not linien: return []
    g = linemerge(linien)
    teile = [g] if g.geom_type == 'LineString' else list(g.geoms)
    return [list(t.coords) for t in teile if t.is_ring or (len(t.coords) > 3 and t.coords[0] == t.coords[-1])]
def geschlossen(e): g = e.get('geometry') or []; return len(g) > 3 and g[0] == g[-1]

STR = {'motorway': 'haupt', 'trunk': 'haupt', 'primary': 'haupt', 'motorway_link': 'haupt', 'trunk_link': 'haupt', 'primary_link': 'haupt',
       'secondary': 'neben', 'secondary_link': 'neben', 'tertiary': 'neben', 'tertiary_link': 'neben',
       'residential': 'wohn', 'unclassified': 'wohn', 'living_street': 'wohn', 'pedestrian': 'fuss'}
GLEIS = {'rail': 'fern', 'light_rail': 'stadtbahn', 'subway': 'u', 'tram': 'tram'}
LAND = {'allotments': 'kleingarten', 'farmland': 'feld', 'meadow': 'wiese', 'grass': 'wiese', 'village_green': 'wiese', 'forest': 'wald',
        'cemetery': 'friedhof', 'industrial': 'industrie', 'railway': 'bahn', 'residential': 'wohnen', 'retail': 'kern',
        'commercial': 'kern', 'construction': 'baustelle', 'brownfield': 'brache', 'religious': 'kirche', 'recreation_ground': 'park'}
NOTABEL = {'cathedral', 'church', 'chapel', 'train_station', 'townhall', 'civic', 'public', 'government', 'retail', 'museum', 'theatre'}

out = {'stadt': sid, 'quelle': 'OpenStreetMap, Overpass ' + d.get('osm3s', {}).get('timestamp_osm_base', ''), 'lizenz': '© OpenStreetMap-Mitwirkende, ODbL',
       'mitte': [LON0, LAT0], 'radius_m': R, 'achsen': 'x Ost, z Süd (Nord = -z), Meter',
       'strassen': [], 'gleise': [], 'bahnhoefe': [], 'bahnsteige': [], 'wasser': [], 'flaechen': [], 'gebaeude': [], 'bebauung': [], 'wahrzeichen': []}
for e in d['elements']:
    t = e.get('tags', {}); g = e.get('geometry')
    if e['type'] == 'way' and not g: continue
    cs = xy(g) if g else []
    if e['type'] == 'way' and 'highway' in t and t['highway'] in STR and t.get('area') != 'yes':
        for l in linie(cs, 1.5):
            s = {'klasse': STR[t['highway']], 'punkte': l}
            if t.get('name'): s['name'] = t['name']
            if t.get('lanes'): s['spuren'] = t['lanes']
            if t.get('tunnel') == 'yes': s['tunnel'] = True
            if t.get('bridge') == 'yes': s['bruecke'] = True
            out['strassen'].append(s)
    elif e['type'] == 'way' and t.get('highway') == 'pedestrian' and t.get('area') == 'yes' or t.get('place') == 'square' or t.get('area:highway') == 'pedestrian':
        for f in (flaeche(cs, 1.0) if e['type'] == 'way' and geschlossen(e) else []): out['flaechen'].append({'art': 'platz', 'name': t.get('name', ''), 'umriss': f})
    elif e['type'] == 'way' and t.get('railway') in GLEIS:
        for l in linie(cs, 1.0):
            gl = {'art': GLEIS[t['railway']], 'punkte': l}
            if t.get('service'): gl['dienst'] = t['service']
            if t.get('electrified') in ('contact_line', 'yes') or t['railway'] == 'tram': gl['oberleitung'] = True
            if t.get('tunnel') in ('yes', 'building_passage') or t.get('layer', '0').startswith('-'): gl['tunnel'] = True
            if t.get('bridge') == 'yes': gl['bruecke'] = True
            out['gleise'].append(gl)
    elif e['type'] == 'way' and (t.get('railway') == 'platform' or t.get('public_transport') == 'platform') and g:
        teile = flaeche(cs, 0.5) if geschlossen(e) else linie(cs, 0.5)
        for f in teile: out['bahnsteige'].append({'name': t.get('name', ''), 'punkte': f, 'flaeche': geschlossen(e)})
    elif e['type'] == 'way' and t.get('waterway') in ('river', 'canal', 'stream'):
        for l in linie(cs, 2.0): out['wasser'].append({'art': t['waterway'], 'name': t.get('name', ''), 'linie': l})
    elif 'building' in t:
        polys = [cs] if e['type'] == 'way' and geschlossen(e) else ringe(e) if e['type'] == 'relation' else []
        for p in polys:
            for f in flaeche(p, 0.8):
                h = None
                try: h = float(str(t.get('height', '')).split()[0].replace(',', '.')) if t.get('height') else None
                except (ValueError, IndexError): pass
                if h is None and t.get('building:levels'):
                    try: h = round(float(t['building:levels'].split(';')[0]) * 3.3, 1)
                    except (ValueError, IndexError): pass
                notabel = t.get('name') and (t['building'] in NOTABEL or t.get('amenity') in ('townhall', 'theatre', 'place_of_worship') or t.get('shop') == 'mall' or (h or 0) >= 40)
                if notabel:
                    out['gebaeude'].append({'art': t['building'], 'name': t['name'], 'umriss': f, 'hoehe_m': h})
                else:
                    b = {'umriss': [[round(x), round(z)] for x, z in f]}
                    if h: b['h'] = round(h)
                    out['bebauung'].append(b)
    else:
        art = None
        if t.get('natural') == 'water' or t.get('landuse') in ('basin', 'reservoir'): art = 'wasser'
        elif t.get('landuse') in LAND: art = LAND[t['landuse']]
        elif t.get('leisure') in ('park', 'garden'): art = 'park'
        elif t.get('leisure') in ('pitch', 'playground'): art = 'sport'
        elif t.get('amenity') == 'parking' and 'building' not in t: art = 'parkplatz'
        if art:
            polys = [cs] if e['type'] == 'way' and geschlossen(e) else ringe(e) if e['type'] == 'relation' else []
            for p in polys:
                for f in flaeche(p, 1.5):
                    (out['wasser'] if art == 'wasser' else out['flaechen']).append({'art': art if art != 'wasser' else 'see', 'name': t.get('name', ''), 'umriss': f})

for b in out['gebaeude']:
    if b['art'] == 'train_station' or 'Hauptbahnhof' in b['name']: out['bahnhoefe'].append({'name': b['name'], 'umriss': b['umriss']})
for b in out['gebaeude']:
    for name, o in over.get('gebaeude', {}).items():
        if b['name'] == name: b.update(o)
for w in over.get('wahrzeichen', []):
    treffer = [b for b in out['gebaeude'] if b['name'] == w['gebaeude']]
    if treffer:
        xs = [p[0] for p in treffer[0]['umriss']]; zs = [p[1] for p in treffer[0]['umriss']]
        w = {**w, 'pos': [round(sum(xs) / len(xs), 1), round(sum(zs) / len(zs), 1)]}
    out['wahrzeichen'].append(w)
out['hinweise'] = over.get('hinweise', [])
json.dump(out, open(ziel, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in out.items() if isinstance(v, list)})
