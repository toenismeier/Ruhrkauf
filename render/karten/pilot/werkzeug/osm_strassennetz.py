# OSM-Rohdaten -> Straßennetz für Verkehr und Figuren (leben.js): Kanten zwischen Knoten (Kreuzungen/Enden),
# vereinfacht (Douglas-Peucker 1,5 m), Typ haupt/neben/fussgaenger, Breite, Spuren. Lokal x Ost, z Süd, Meter.
import sys, json, math
from lxml import etree
sys.path.insert(0, sys.path[0]); from geo import xz
HAUPT = {'trunk', 'primary', 'secondary', 'tertiary', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}
NEBEN = {'residential', 'unclassified', 'living_street'}   # service (Zufahrten, Parkplatzgassen) fährt kein Verkehr
FUSS = {'pedestrian'}
knoten, wege, tunnelknoten = {}, [], set()
for _, e in etree.iterparse(sys.argv[1], tag=('node', 'way')):
    if e.tag == 'node': knoten[e.get('id')] = (float(e.get('lon')), float(e.get('lat')))
    else:
        t = {k.get('k'): k.get('v') for k in e.iterfind('tag')}
        h = t.get('highway')
        if h and (h in HAUPT or h in NEBEN) and (t.get('tunnel') == 'yes' or t.get('layer', '0').startswith('-')):
            tunnelknoten.update(n.get('ref') for n in e.iterfind('nd'))   # Unterführungen: deren Endknoten sind Tunnelmünder
        if h and (h in HAUPT or h in NEBEN or h in FUSS) and t.get('tunnel') not in ('yes',) and t.get('area') != 'yes':
            t['_id'] = e.get('id')
            wege.append(([n.get('ref') for n in e.iterfind('nd')], t))
    e.clear()
zahl = {}
for refs, t in wege:
    for r in refs: zahl[r] = zahl.get(r, 0) + 1
    zahl[refs[0]] = zahl.get(refs[0], 0) + 1; zahl[refs[-1]] = zahl.get(refs[-1], 0) + 1
def dp(pts, eps=1.5):
    if len(pts) < 3: return pts
    (ax, az), (bx, bz) = pts[0], pts[-1]; L = math.hypot(bx - ax, bz - az) or 1e-9
    best, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs((bx - ax) * (az - pts[i][1]) - (ax - pts[i][0]) * (bz - az)) / L
        if d > best: best, idx = d, i
    return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps) if best > eps else [pts[0], pts[-1]]
kanten = []
for refs, t in wege:
    h = t.get('highway')
    typ = 'fussgaenger' if h in FUSS else 'haupt' if h in HAUPT else 'neben'
    try: spuren = int(t.get('lanes', '2' if typ == 'haupt' else '1').split(';')[0])
    except ValueError: spuren = 2
    einbahn = t.get('oneway') == 'yes'
    fb = max(5.5, spuren * 3.2) if typ != 'fussgaenger' else 0
    breite = fb + 7 if typ != 'fussgaenger' else 16
    teil = [refs[0]]
    for r in refs[1:]:
        teil.append(r)
        if zahl.get(r, 0) > 1 or r == refs[-1]:
            pts = [xz(*knoten[q]) for q in teil if q in knoten]
            if len(pts) >= 2:
                kanten.append({'way': int(t['_id']), 'typ': typ, 'breite': round(breite, 1), 'gehweg': 3.5 if typ != 'fussgaenger' else 0, 'spuren': spuren, 'einbahn': einbahn,
                               'a': teil[0], 'b': teil[-1], 'mund_a': teil[0] in tunnelknoten, 'mund_b': teil[-1] in tunnelknoten, 'punkte': [[round(x, 1), round(z, 1)] for x, z in dp(pts)]})
            teil = [r]
json.dump({'kanten': kanten}, open(sys.argv[2], 'w'), separators=(',', ':'))
import collections; print(len(kanten), collections.Counter(k['typ'] for k in kanten))
