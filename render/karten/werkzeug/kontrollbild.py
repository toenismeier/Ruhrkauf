"""Lageplan aus einer Kartendatei zeichnen: python3 -I kontrollbild.py <karte.json> <bild.png> [halbbreite_m]"""
import json, sys
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as P
d = json.load(open(sys.argv[1], encoding='utf-8')); H = float(sys.argv[3]) if len(sys.argv) > 3 else d['radius_m']
FL = {'kleingarten': '#b8d98a', 'feld': '#e8dfa0', 'wiese': '#cfe8b0', 'wald': '#8fbf7a', 'park': '#a9d68c', 'friedhof': '#a8c8a0', 'industrie': '#d9cfd9',
      'bahn': '#e2dccf', 'wohnen': '#efe9e1', 'kern': '#f2d9d0', 'platz': '#f3e8c8', 'sport': '#bfe0b0', 'parkplatz': '#e0e0e0', 'kirche': '#e6dccc'}
fig, ax = plt.subplots(figsize=(14, 14), dpi=110)
ax.set_facecolor('#f7f5f0')
for f in sorted(d['flaechen'], key=lambda f: f['art'] != 'wohnen'):
    ax.add_patch(P(f['umriss'], closed=True, fc=FL.get(f['art'], '#eeeeee'), ec='none', zorder=1))
for w in d['wasser']:
    if 'umriss' in w: ax.add_patch(P(w['umriss'], closed=True, fc='#9ccbe8', ec='none', zorder=2))
    else: ax.plot(*zip(*w['linie']), color='#7fb6dd', lw=4, zorder=2)
for b in d['bebauung']: ax.add_patch(P(b['umriss'], closed=True, fc='#c9c2b8', ec='none', zorder=3))
for b in d['gebaeude']: ax.add_patch(P(b['umriss'], closed=True, fc='#c0392b' if b['art'] in ('rathaus', 'bahnhof', 'kirche', 'cathedral', 'church') else '#8e6f5e', ec='none', zorder=4))
BR = {'haupt': (3.2, '#f0b04a'), 'neben': (2.2, '#ffffff'), 'wohn': (1.1, '#ffffff'), 'fuss': (2.6, '#e2a6c7')}
for s in d['strassen']:
    w, c = BR[s['klasse']]
    ax.plot(*zip(*s['punkte']), color=c, lw=w, alpha=0.5 if s.get('tunnel') else 1, zorder=5, solid_capstyle='round')
for g in d['gleise']:
    c = {'fern': '#333333', 'stadtbahn': '#2e6fb5', 'u': '#2e6fb5', 'tram': '#b5352e'}[g['art']]
    ax.plot(*zip(*g['punkte']), color=c, lw=0.9, ls=':' if g.get('tunnel') else '-', zorder=6)
for w in d['wahrzeichen']:
    if w.get('pos'):
        ax.plot(*w['pos'], 'o', color='#c0392b', ms=9, zorder=8)
        ax.annotate(w['name'], w['pos'], xytext=(8, 8), textcoords='offset points', fontsize=11, weight='bold', zorder=9,
                    bbox=dict(boxstyle='round,pad=0.25', fc='white', ec='#c0392b', lw=1))
gesehen = set()
for s in d['strassen']:
    n = s.get('name')
    if n in ('Kettwiger Straße', 'Limbecker Straße', 'Viehofer Straße', 'Rüttenscheider Straße', 'Huyssenallee', 'Hindenburgstraße', 'Altendorfer Straße') and n not in gesehen and len(s['punkte']) > 1:
        gesehen.add(n); p = s['punkte'][len(s['punkte']) // 2]
        ax.annotate(n, p, fontsize=9, style='italic', color='#7a1f4f', zorder=9)
ax.set_xlim(-H, H); ax.set_ylim(H, -H); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([])
ax.set_title(f"{d['stadt']} – Lageplan aus Kartendaten (±{int(H)} m, Norden oben)  {d['lizenz']}", fontsize=11)
plt.tight_layout(); plt.savefig(sys.argv[2])
