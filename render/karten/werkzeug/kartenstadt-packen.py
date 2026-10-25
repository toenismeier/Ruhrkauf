# Pilotdaten (karten/pilot/<stadt>-kern.json) -> kompakte Spieldatei karten/<stadt>-spiel.json
# Koordinaten in Dezimetern, ganzzahlig, um ox/oz verschoben (Plan-Ursprung 0, alles positiv), Polygone als flache Listen.
import json, sys
quelle, ziel, ox, oz = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
netz = json.load(open(sys.argv[5]))['kanten'] if len(sys.argv) > 5 else []
knotenNr = {}
kn = lambda k: knotenNr.setdefault(k, len(knotenNr))
TYP = {'haupt': 1, 'neben': 2, 'fussgaenger': 3}
d = json.load(open(quelle))
P = lambda pts: [v for x, z in pts for v in (round((x + ox) * 10), round((z + oz) * 10))]
P3 = lambda pts: [v for x, z, y in pts for v in (round((x + ox) * 10), round((z + oz) * 10), round(y * 10))]
FL = {'gruen': 1, 'wasser': 2, 'platz': 3, 'parkplatz': 4, 'bahnsteig': 5, 'bahngelaende': 6}
GL = {'rail': 1, 'light_rail': 2, 'tram': 3}
st = d['strassen']
out = {
  'stadt': d['stadt'], 'lizenz': d['lizenz'], 'quellen': d['quellen'], 'ursprung': [ox, oz], 'breite': 1800, 'tiefe': 1800,
  'fahrbahn': [P(p) for p in st['fahrbahn']], 'rad': [P(p) for p in st['rad']],
  'markierung': [P(p) for p in st['mittellinie']] + [P(p) for p in st['markierung'] if len(p) <= 6 and abs(p[0][0]-p[2][0]) + abs(p[0][1]-p[2][1]) > 2.5],
  'flaechen': [[FL[f['art']], P(f['umriss'])] for f in d['flaechen'] if f['art'] in FL],
  'gleise': [[GL[g['art']], P(g['punkte'])] for g in d['gleise'] if g['art'] in GL],
  'baeume': P(d['baeume']),
  'netz': [[TYP[k['typ']], round(k['breite'] * 10), k['spuren'], 1 if k['einbahn'] else 0, kn(k['a']), kn(k['b']), P(k['punkte'])] for k in netz],
  'gebaeude': [{'f': g['fkt'] or '', 'd': g['dach'] or '', 'h': round(g['h'] * 10), 't': round(g['traufe'] * 10),
                'b': P3(g['boden'][0]) if g['boden'] else [], 'r': [P3(r) for r in g['dachf']],
                'id': g.get('id') or ''} for g in d['gebaeude']],
}
json.dump(out, open(ziel, 'w'), separators=(',', ':'), ensure_ascii=False)
import os; print(ziel, os.path.getsize(ziel) // 1024, 'KB')
