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
def gruen_art(t):
    # Unterart des Grüns: bestimmt Farbe und Bepflanzung (kartenstadt-bauen.py)
    if t.get('landuse') == 'cemetery' or t.get('amenity') == 'grave_yard': return 'friedhof'
    if t.get('leisure') == 'playground': return 'spielplatz'
    if t.get('natural') in ('wood', 'scrub') or t.get('landuse') == 'forest': return 'wald'
    if t.get('leisure') in ('park', 'garden') or t.get('landuse') in ('village_green', 'recreation_ground'): return 'park'
    if t.get('landuse') in ('brownfield', 'greenfield'): return 'wiese'
    return 'wiese'   # grass, meadow, grassland: Abstands- und Straßengrün, Wiesen
def art_flaeche(t):
    if t.get('natural') == 'water' or t.get('waterway') == 'riverbank' or t.get('water'): return 'wasser'
    if t.get('landuse') in ('brownfield', 'greenfield'): return 'gruen'   # Brache: Wiese mit Gehölz statt leerer Sandfläche
    if t.get('leisure') in ('park', 'garden', 'playground') or t.get('landuse') in ('grass', 'meadow', 'village_green', 'recreation_ground', 'cemetery') or t.get('natural') in ('scrub', 'wood', 'grassland') or t.get('landuse') == 'forest': return 'gruen'
    if t.get('railway') == 'platform' or t.get('public_transport') == 'platform' or t.get('highway') == 'platform':
        if t.get('layer', '0').startswith('-') or t.get('tunnel') == 'yes' or t.get('location') == 'underground': return None
        # Nur Eisenbahn-Bahnsteige sind hohe Bahnsteige; Bus- und Straßenbahnhaltestellen liegen auf Gehweghöhe
        zug = t.get('railway') == 'platform' and (t.get('train') == 'yes' or (t.get('bus') != 'yes' and t.get('tram') != 'yes' and t.get('highway') != 'platform'))
        return 'bahnsteig' if zug else 'haltestelle'
    if (t.get('highway') == 'pedestrian' and t.get('area') == 'yes') or t.get('area:highway') == 'pedestrian' or t.get('amenity') == 'marketplace': return 'platz'
    if t.get('place') == 'square': return 'platzort'   # benannter Platz ohne Fußgängerfläche (oft Schmuckplatz mit Grün)
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
        out['flaechen'].append({'art': a, 'umriss': pts(refs), **({'unter': gruen_art(t)} if a == 'gruen' else {})})
for mem, t in rel:
    if t.get('type') != 'multipolygon': continue
    a = art_flaeche(t)
    if not a: continue
    # Außenringe aus mehreren offenen Wegen zusammensetzen (z. B. Bahnsteige am Hbf)
    from shapely.geometry import LineString
    from shapely.ops import polygonize, unary_union
    linien = [LineString(pts(wege[ref][0])) for typ, ref, rolle in mem if typ == 'way' and rolle in ('outer', '') and ref in wege and len(pts(wege[ref][0])) > 1]
    for poly in polygonize(unary_union(linien)) if linien else []:
        if poly.area > 20:
            out['flaechen'].append({'art': a, 'umriss': [[round(x, 1), round(z, 1)] for x, z in poly.exterior.coords], **({'unter': gruen_art(t)} if a == 'gruen' else {})})
for nid, (lon, lat, t) in knoten.items():
    if t.get('natural') == 'tree':
        out['baeume'].append([round(c, 1) for c in xz(lon, lat)])
json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'), ensure_ascii=False)
import collections
print(len(out['wege']), 'Wege', len(out['sportfelder']), 'Sportfelder', len(out['gleise']), 'Gleise', collections.Counter(f['art'] for f in out['flaechen']), len(out['baeume']), 'Bäume')
