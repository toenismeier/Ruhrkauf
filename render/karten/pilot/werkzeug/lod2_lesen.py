# LoD2 NRW (CityGML 1.0) -> kompakte Gebäudeliste im lokalen Essen-System (x Ost, z Süd, y Höhe über Gelände)
import sys, json, glob
from lxml import etree
from pyproj import Transformer
sys.path.insert(0, 'werkzeug'); from geo import xz
T = Transformer.from_crs(25832, 4326, always_xy=True)
NS = {'bldg':'http://www.opengis.net/citygml/building/1.0','gml':'http://www.opengis.net/gml','gen':'http://www.opengis.net/citygml/generics/1.0'}
CX, CZ, R = 85, 90, float(sys.argv[2]) if len(sys.argv) > 2 else 620
out = []
def flaechen(el, art):
    for s in el.iterfind(f'.//bldg:{art}', NS):
        for pl in s.iterfind('.//gml:posList', NS):
            v = list(map(float, pl.text.split())); pts = [v[i:i+3] for i in range(0, len(v), 3)]
            yield pts
for f in sorted(glob.glob('roh/lod2/*.gml')):
    for _, b in etree.iterparse(f, tag='{%s}Building' % NS['bldg']):
        teile = b.findall('.//bldg:BuildingPart', NS) or [b]
        for t in teile:
            dach = t.findtext('bldg:roofType', namespaces=NS) or b.findtext('bldg:roofType', namespaces=NS)
            fkt = t.findtext('bldg:function', namespaces=NS) or b.findtext('bldg:function', namespaces=NS)
            boden = list(flaechen(t, 'GroundSurface'))
            if not boden: continue
            g0 = min(p[2] for r in boden for p in r)
            def lok(r):
                q = []
                for e, n, h in r:
                    lon, lat = T.transform(e, n); x, z = xz(lon, lat); q.append([round(x, 1), round(z, 1), round(h - g0, 1)])
                return q
            bo = [lok(r) for r in boden]
            mx = sum(p[0] for p in bo[0]) / len(bo[0]); mz = sum(p[1] for p in bo[0]) / len(bo[0])
            if abs(mx - CX) > R or abs(mz - CZ) > R: continue
            dachf = [lok(r) for r in flaechen(t, 'RoofSurface')]
            waende = [lok(r) for r in flaechen(t, 'WallSurface')]
            hoehe = max((p[2] for r in dachf for p in r), default=0)
            out.append({'dach': dach, 'fkt': fkt, 'boden': bo, 'dachf': dachf, 'waende': waende, 'id': b.get('{http://www.opengis.net/gml}id'), 'h': round(hoehe, 1),
                        'traufe': round(min((p[2] for r in dachf for p in r), default=0), 1)})
        b.clear()
json.dump({'quelle': '3D-Gebäudemodell LoD2 NRW, Geobasis NRW, dl-de/zero-2-0', 'gebaeude': out}, open(sys.argv[1], 'w'), separators=(',', ':'))
print(len(out), 'Gebäudeteile')
