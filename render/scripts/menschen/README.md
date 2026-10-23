# Stadtmenschen (Figuren-Atlas)

Quelle: Quaternius „Universal Base Characters“ und „Universal Animation Library“ (Standard, CC0 1.0).
Die Rohdaten liegen nicht im Repo (Ummos Rechner: `C:\Users\Ummo\Desktop\Projekte\WH\assets-roh`).

Ablauf:

1. Zips entpacken in einen Ordner, der beide Ordner `Universal Base Characters[Standard]` und `Universal Animation Library[Standard]` enthält.
2. Backen (Blender 4.2 LTS, headless): `blender -b --python render/scripts/menschen/backen.py -- <ordner> <ausgabe>`
3. Packen: `python3 render/scripts/menschen/packen.py <ausgabe> render/src/kit/menschen-atlas.js`

Ergebnis: `render/src/kit/menschen-atlas.js` (WebP als Base64 plus Index). Laufzeit: `render/src/kit/menschen.js`.

- 7 Körper (Frau langes Haar, Frau Dutt, Mann Scheitel, Mann kurz, Mann Bart, Junge, Mädchen), Proportionen auf Alltag zurückgenommen.
- Animationen: gehen (8 Bilder), gehen mit Tasche (8), stehen (2), reden (2); 5 Blickrichtungen gebacken, 3 im Shader gespiegelt.
- Kamera wie im Spiel (orthografisch, 30° Elevation, Blick aus +x/+z). Ändert sich die Spielkamera, neu backen.
- Kanäle: links (Schatten, Oberteil, Hose, Alpha), rechts (Haut, Haar, Schuhe); Tasche = Rest. Farben je Figur setzt das Spiel.
