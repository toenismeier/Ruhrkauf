# OSM-Rohdaten -> Gleise, Bahnsteige, Grün, Wasser, Plätze, Parkplätze, Bäume (lokal x Ost, z Süd)
import sys, json
from lxml import etree
sys.path.insert(0, 'werkzeug'); from geo import xz
knoten, wege, rel = {}, {}, []
for _, e in etree.iterparse(sys.argv[1], events=('end',), tag=('node', 'way', 'relation')):
    tags = {t.get('k'): t.get('v') for t in e.iterfind('tag')}
    if e.tag == 'node':
        knoten[e.get('id')] = (float(e.get('lon')), float(e.get('lat')), tags)
    elif e.tag == 'way':
        wege[e.get('id')] = ([n.get('ref') for n in e.iterfind('nd')], tags)
    else:
        rel.append(([(m.get('type'), m.get('ref'), m.get('role')) for m in e.iterfind('member')], tags))
    e.clear()
def pts(refs): return [[round(c, 1) for c in xz(knoten[r][0], knoten[r][1])] for r in refs if r in knoten]
def art_flaeche(t):
    if t.get('natural') == 'water' or t.get('waterway') == 'riverbank' or t.get('water'): return 'wasser'
    if t.get('leisure') in ('park', 'garden', 'playground') or t.get('landuse') in ('grass', 'meadow', 'village_green', 'recreation_ground', 'cemetery') or t.get('natural') in ('scrub', 'wood', 'grassland') or t.get('landuse') == 'forest': return 'gruen'
    if t.get('railway') == 'platform' or t.get('public_transport') == 'platform': return 'bahnsteig'
    if (t.get('highway') == 'pedestrian' and t.get('area') == 'yes') or t.get('area:highway') == 'pedestrian' or t.get('place') == 'square' or t.get('amenity') == 'marketplace': return 'platz'
    if t.get('amenity') == 'parking' and t.get('parking', 'surface') == 'surface': return 'parkplatz'
    if t.get('landuse') == 'railway': return 'bahngelaende'
    if t.get('leisure') in ('pitch', 'sports_centre', 'track') : return 'sport'
    if t.get('amenity') in ('school', 'kindergarten', 'college', 'university') or t.get('landuse') == 'education': return 'schulhof'
    if t.get('landuse') in ('industrial', 'commercial', 'retail', 'construction', 'brownfield'): return 'gewerbe'
    if t.get('landuse') in ('allotments',): return 'kleingarten'
    if t.get('landuse') in ('residential',): return 'wohnen'
    return None
out = {'gleise': [], 'flaechen': [], 'baeume': [], 'wege': [], 'sportfelder': []}
for wid, (refs, t) in wege.items():
    r = t.get('railway')
    if r in ('rail', 'light_rail', 'tram') and t.get('tunnel') not in ('yes', 'building_passage') and not t.get('layer', '0').startswith('-'):
        out['gleise'].append({'art': r, 'punkte': pts(refs), 'bruecke': t.get('bridge') == 'yes', 'dienst': bool(t.get('service'))})
        continue
    h = t.get('highway')
    if h in ('footway', 'path', 'cycleway', 'track', 'bridleway', 'steps') and t.get('footway') not in ('sidewalk', 'crossing') and t.get('area') != 'yes' and t.get('tunnel') != 'yes':
        out['wege'].append({'art': h, 'punkte': pts(refs)})
    if t.get('leisure') == 'pitch' and len(refs) > 3 and refs[0] == refs[-1]:
        out['sportfelder'].append({'sport': t.get('sport', ''), 'umriss': pts(refs)})
    a = art_flaeche(t)
    if a and len(refs) > 3 and refs[0] == refs[-1]:
        out['flaechen'].append({'art': a, 'umriss': pts(refs)})
for mem, t in rel:
    if t.get('type') != 'multipolygon': continue
    a = art_flaeche(t)
    if not a: continue
    for typ, ref, rolle in mem:
        if typ == 'way' and rolle == 'outer' and ref in wege and wege[ref][0][0] == wege[ref][0][-1]:
            out['flaechen'].append({'art': a, 'umriss': pts(wege[ref][0])})
for nid, (lon, lat, t) in knoten.items():
    if t.get('natural') == 'tree':
        out['baeume'].append([round(c, 1) for c in xz(lon, lat)])
json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'), ensure_ascii=False)
import collections
print(len(out['wege']), 'Wege', len(out['sportfelder']), 'Sportfelder', len(out['gleise']), 'Gleise', collections.Counter(f['art'] for f in out['flaechen']), len(out['baeume']), 'Bäume')
