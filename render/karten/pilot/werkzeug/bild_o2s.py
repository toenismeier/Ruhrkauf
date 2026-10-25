import json, sys
sys.path.insert(0, 'werkzeug'); from geo import ring
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
F = {'Driving':'#5d6168','Bus':'#8a4a4a','Biking':'#4f7a5a','Sidewalk':'#d9d3c7','Footway':'#e8e0cf','SharedUse':'#cfc7b5','Shoulder':'#7a7e85','LightRail':'#9b8b6a','Construction':'#b9a46a','Parking':'#6d7178'}
fig, ax = plt.subplots(figsize=(12,12), dpi=110); ax.set_facecolor('#b8c4a8')
def polys(g):
    if g['type']=='Polygon': yield g['coordinates']
    elif g['type']=='MultiPolygon': yield from g['coordinates']
for f in json.load(open('o2s-plain.geojson'))['features']:
    if f['properties'].get('type')=='intersection':
        for p in polys(f['geometry']): ax.add_patch(Polygon([(x,-z) for x,z in ring(p[0])], fc='#55595f', ec='none'))
for f in json.load(open('o2s-lanes.geojson'))['features']:
    for p in polys(f['geometry']): ax.add_patch(Polygon([(x,-z) for x,z in ring(p[0])], fc=F.get(f['properties'].get('type'),'#999'), ec='none'))
for f in json.load(open('o2s-marks.geojson'))['features']:
    t=f['properties'].get('type'); c = '#f2f2f2' if t!='center line' else '#e8d36a'
    for p in polys(f['geometry']): ax.add_patch(Polygon([(x,-z) for x,z in ring(p[0])], fc=c, ec='none'))
r = float(sys.argv[2]) if len(sys.argv)>2 else 600; cx, cz = 85, 90
ax.set_xlim(cx-r, cx+r); ax.set_ylim(-cz-r, -cz+r); ax.set_aspect('equal'); ax.axis('off')
plt.savefig(sys.argv[1], bbox_inches='tight', pad_inches=0)
