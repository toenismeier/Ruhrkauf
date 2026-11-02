# Schneidet aus out/katalog-umbau-karten.png je Karte vorher|nachher und setzt ein geteiltes Kartenbild zusammen.
import sys
from PIL import Image, ImageEnhance, ImageDraw
QUELLE, ZIEL = sys.argv[1], sys.argv[2]
NAMEN = ['komplett', 'moebel', 'oberflaeche', 'klima', 'licht', 'brandschutz', 'foerdertechnik', 'fassade']
KW, KH, KOPF, BESCHR = 720, 480, 90, 54
im = Image.open(QUELLE).convert('RGB')
import os; os.makedirs(ZIEL, exist_ok=True)
for i, n in enumerate(NAMEN):
    y = KOPF + i * (KH + BESCHR)
    vor = im.crop((0, y, KW, y + KH)); nach = im.crop((KW, y, 2 * KW, y + KH))
    if n == 'licht':  # alte Leuchtstoffröhren: dunkler, gelblich, flau
        vor = ImageEnhance.Brightness(vor).enhance(0.74)
        vor = ImageEnhance.Contrast(vor).enhance(0.8)
        gelb = Image.new('RGB', vor.size, (255, 214, 140)); vor = Image.blend(vor, gelb, 0.10)
    teil = vor.copy(); teil.paste(nach.crop((KW // 2, 0, KW, KH)), (KW // 2, 0))
    d = ImageDraw.Draw(teil); d.rectangle((KW // 2 - 1, 0, KW // 2 + 1, KH), fill=(255, 255, 255))
    teil.save(os.path.join(ZIEL, n + '.webp'), quality=82)
    teil.save(os.path.join(ZIEL, n + '.png'))
print('ok', ZIEL)

# Für das Spiel: Kartenbilder als Daten-URLs in ein Modul (kein Bild-Loader im Bündel nötig), 600 px breit.
import base64, io
MODUL = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'ui', 'umbau-karten-bilder.js')
zeilen = ['// Erzeugt von scripts/umbau/karten-schneiden.py aus src/kataloge/umbau-karten.js (vorher | nachher). Nicht von Hand ändern.', 'export const KARTEN_BILDER = {']
for n in NAMEN:
    b = Image.open(os.path.join(ZIEL, n + '.png')).resize((600, 400), Image.LANCZOS)
    buf = io.BytesIO(); b.save(buf, 'WEBP', quality=80)
    zeilen.append(f"  {n}: 'data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode()}',")
zeilen.append('};')
open(MODUL, 'w').write('\n'.join(zeilen) + '\n')
print('modul', MODUL, os.path.getsize(MODUL))
