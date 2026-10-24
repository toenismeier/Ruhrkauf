# Kalibriert die Schriftgrößen je Stil auf die Tintenhöhen der Vorlage und meldet die Breitenabweichung
# (Maß dafür, wie ähnlich die Schrift der Vorlage ist). Aufruf: python3 ui-referenz/kalibriere.py <schrift.ttf>
import json, subprocess, sys, os
schrift = sys.argv[1]
STIL = {'kopf': ['Kopf Titel'], 'kopf2': ['Kopf Adresse'], 'text': ['Sprecher', 'On Menu'], 'segment': ['Segment HOT', 'Segment COLD'],
        'titel': ['Karte Titel'], 'marke': ['SALES LAST WEEK', 'PRICE'], 'zahl': [], 'klein': [],
        'stepper': ['Preis 9,75'], 'reiter': ['Reiter Wort 1', 'Reiter Wort 2']}
gr = {'kopf': 18, 'kopf2': 18, 'text': 16, 'segment': 18, 'titel': 23, 'marke': 15, 'zahl': 34, 'klein': 13.5, 'stepper': 18, 'reiter': 16}
def lauf(gr):
    env = dict(os.environ, JSON_AUS='/tmp/kal.json')
    subprocess.run(['node', 'ui-referenz/abgleich.cjs', '26', schrift, 'out/ui-referenz', json.dumps(gr)], env=env, capture_output=True, check=True)
    return {r['name']: r for r in json.load(open('/tmp/kal.json'))}
for runde in range(3):
    r = lauf(gr)
    for k, namen in STIL.items():
        q = [ (x['s']['unten']-x['s']['oben'])/(x['e']['unten']-x['e']['oben']) for n in namen if (x:=r.get(n)) and x['s'] and x['e'] ]
        if q: gr[k] = round(gr[k] * sum(q)/len(q), 2)
    # Zahl und Abweichung über das Verhältnis zur Kopfzeile (Großbuchstaben), weil ihre Fenster bei falscher Größe abschneiden.
    if runde == 2:
        pass
gr['zahl'] = round(gr['kopf'] * 17.7 / 10.3, 2)
gr['klein'] = round(gr['kopf2'] * 0.95, 2)
r = lauf(gr)
print(os.path.basename(schrift), json.dumps(gr))
breiten = []
for k, namen in STIL.items():
    for n in namen:
        x = r.get(n)
        if x and x['s'] and x['e']:
            bs = x['s']['rechts']-x['s']['links']; be = x['e']['rechts']-x['e']['links']
            hs = x['s']['unten']-x['s']['oben']; he = x['e']['unten']-x['e']['oben']
            breiten.append(be/bs); print(f'  {n:18} Höhe {hs:5.1f}→{he:5.1f}  Breite {bs:6.1f}→{be:6.1f} ({be/bs*100-100:+.0f} %)')
print(f'  Breitenabweichung im Mittel: {sum(abs(b-1) for b in breiten)/len(breiten)*100:.1f} %')
