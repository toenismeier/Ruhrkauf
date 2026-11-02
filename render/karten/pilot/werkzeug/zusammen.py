import json, sys
sys.path.insert(0, 'werkzeug'); from geo import ring
def polys(g):
    if g['type'] == 'Polygon': yield g['coordinates']
    elif g['type'] == 'MultiPolygon': yield from g['coordinates']
R = lambda p: [[round(x, 2), round(z, 2)] for x, z in ring(p[0])]
st = {'fahrbahn': [], 'rad': [], 'markierung': [], 'mittellinie': []}
for f in json.load(open('o2s-plain.geojson'))['features']:
    if f['properties'].get('type') == 'intersection':
        for p in polys(f['geometry']): st['fahrbahn'].append(R(p))
for f in json.load(open('o2s-lanes.geojson'))['features']:
    t = f['properties'].get('type')
    ziel = 'fahrbahn' if t in ('Driving', 'Bus', 'Shoulder', 'Parking', 'Construction', 'LightRail') else 'rad' if t == 'Biking' else None
    if ziel:
        for p in polys(f['geometry']): st[ziel].append(R(p))
for f in json.load(open('o2s-marks.geojson'))['features']:
    t = f['properties'].get('type')
    ziel = 'mittellinie' if t == 'center line' else 'markierung' if t in ('lane separator', 'vehicle stop line') else None
    if ziel:
        for p in polys(f['geometry']): st[ziel].append(R(p))
osm = json.load(open('osm-kern.json')); lod = json.load(open('lod2-kern.json'))
out = {'stadt': 'essen', 'ausschnitt': {'mitte': [85, 90], 'radius': 900},
       'quellen': ['Straßen: osm2streets (Apache-2.0) aus OpenStreetMap', 'Gleise, Flächen, Bäume: OpenStreetMap', 'Gebäude: 3D-Gebäudemodell LoD2 NRW'],
       'lizenz': '© OpenStreetMap-Mitwirkende, ODbL; Geobasis NRW, dl-de/zero-2-0',
       'strassen': st, **osm, 'gebaeude': lod['gebaeude']}
json.dump(out, open(sys.argv[1], 'w'), separators=(',', ':'), ensure_ascii=False)
print({k: len(v) for k, v in st.items()}, len(out['gebaeude']))
