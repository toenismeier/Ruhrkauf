# Baut alle Motive (szenen/*.py, je Datei ein dict S) und schreibt render/src/ui/illustrationen-daten.js.
# Aufruf aus render/illustrationen: python3 bauen.py [motiv ...]   (ohne Angabe: alle; vorhandene PNGs werden wiederverwendet mit --neu nur fehlende)
import json, subprocess, sys, os, glob, importlib.util, base64, io
from PIL import Image
HIER = os.path.dirname(os.path.abspath(__file__)); os.chdir(HIER); sys.path.insert(0, os.path.join(HIER, 'szenen'))
GROESSE = {'symbol': 168, 'karte': 720, 'kopf': 1170}  # Pixel der längeren Seite im Spiel (3-fach)
motive = {}
for f in sorted(glob.glob('szenen/*.py')):
    if f.endswith('werkzeug.py'): continue
    spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    for k, v in getattr(m, 'S', {}).items():
        if k in motive: raise SystemExit(f'Motiv doppelt: {k} ({f})')
        motive[k] = v
wahl = [a for a in sys.argv[1:] if not a.startswith('--')]
nur_fehlende = '--fehlende' in sys.argv
os.makedirs('ausgabe', exist_ok=True)
for name, sz in motive.items():
    roh = f'ausgabe/{name}.png'
    if wahl and name not in wahl: continue
    if not wahl and nur_fehlende and os.path.exists(roh): continue
    a = {k: v for k, v in sz.items() if k != 'groesse'}; a.setdefault('stil', 'illustriert'); a['aus'] = roh
    r = subprocess.run([sys.executable, 'render.py', json.dumps(a)], capture_output=True, text=True)
    print(name, 'ok' if 'Saved' in r.stdout + r.stderr else 'FEHLER\n' + (r.stderr or r.stdout)[-600:], flush=True)
# Ausgabe: auf Inhalt zuschneiden, auf Zielgröße, WebP als data-URL
daten = {}
for name, sz in motive.items():
    roh = f'ausgabe/{name}.png'
    if not os.path.exists(roh): continue
    im = Image.open(roh).convert('RGBA'); bb = im.getbbox()
    if bb: im = im.crop(bb)
    ziel = GROESSE[sz.get('groesse', 'symbol')]
    im.thumbnail((ziel, ziel), Image.LANCZOS)
    puffer = io.BytesIO(); im.save(puffer, 'WEBP', quality=88, method=6)
    daten[name] = {'u': 'data:image/webp;base64,' + base64.b64encode(puffer.getvalue()).decode(), 'b': im.width, 'h': im.height}
ziel = os.path.join(HIER, '..', 'src', 'ui', 'illustrationen-daten.js')
with open(ziel, 'w', encoding='utf-8') as f:
    f.write('// Erzeugt von render/illustrationen/bauen.py. Nicht von Hand ändern.\nexport const ILLUSTRATIONEN = ' + json.dumps(daten, ensure_ascii=False) + ';\n')
print(f'{len(daten)} Motive, {os.path.getsize(ziel) // 1024} KB -> {ziel}')
