import json, sys
sys.path.insert(0,'werkzeug'); from geo import ring
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from matplotlib import cm
fig, ax = plt.subplots(figsize=(12,12), dpi=110); ax.set_facecolor('#efe9dc')
def polys(g):
    if g['type']=='Polygon': yield g['coordinates']
    elif g['type']=='MultiPolygon': yield from g['coordinates']
for fn,key in [('o2s-plain.geojson',None),('o2s-lanes.geojson',1)]:
    for f in json.load(open(fn))['features']:
        t=f['properties'].get('type')
        if key is None and t!='intersection': continue
        if key and t not in ('Driving','Bus','Shoulder','LightRail','Parking'): continue
        for p in polys(f['geometry']): ax.add_patch(Polygon([(x,-z) for x,z in ring(p[0])], fc='#5d6168', ec='none'))
for g in json.load(open('lod2-kern.json'))['gebaeude']:
    c = cm.viridis(min(g['h'],60)/60)
    for r in g['boden']: ax.add_patch(Polygon([(p[0],-p[1]) for p in r], fc=c, ec='#333', lw=0.2))
r=float(sys.argv[2]); ax.set_xlim(85-r,85+r); ax.set_ylim(-90-r,-90+r); ax.set_aspect('equal'); ax.axis('off')
plt.savefig(sys.argv[1], bbox_inches='tight', pad_inches=0)
