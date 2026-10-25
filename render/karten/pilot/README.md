# Pilot Kartenweg Essen (25.10.2026)

Echter Stadtausschnitt aus Kartendaten statt Kit-Raster. Nur Katalog, nicht im Spiel, nicht gemergt.

| Teil | Quelle | Lizenz |
|---|---|---|
| Fahrbahnen, Kreuzungsflächen, Markierungen | osm2streets-js 0.1.4 (npm, Stand 2023) aus OpenStreetMap | Apache-2.0 / ODbL |
| Gleise, Bahnsteige, Grün, Wasser, Plätze, Bäume | OpenStreetMap (API 0.6, 25.10.2026) | ODbL |
| Gebäude mit Dachflächen, Höhe, Funktion | 3D-Gebäudemodell LoD2 NRW (opengeodata.nrw.de) | dl-de/zero-2-0 |

Ausschnitt ±900 m um Kettwiger Straße (51,45419 / 7,01322), Koordinaten wie `../essen.json` (x Ost, z Süd, Meter).
`essen-kern.json`: 10.627 Fahrbahnflächen, 5.521 Gebäudeteile, 303 Gleise, 994 Bäume.

Rendern: `cd render && node render-katalog.js pilot-osm-essen` (Baustein `src/kit/karten/pilot-osm.js`).

Daten neu erzeugen (Ubuntu, alle Quellen aus der Cloud erreichbar, kein Umweg über Ummos Rechner):
1. OSM laden: `curl "https://api.openstreetmap.org/api/0.6/map?bbox=..."` (je Kachel höchstens 50.000 Knoten, sonst teilen und zusammenführen).
2. Straßen: `node werkzeug/lauf-o2s.mjs essen.osm` (braucht `npm i osm2streets-js`).
3. Gebäude: LoD2-Kacheln `LoD2_32_<E>_<N>_1_NW.gml` von opengeodata.nrw.de, dann `python3 werkzeug/lod2_lesen.py lod2-kern.json 900`.
4. Flächen: `python3 werkzeug/osm_flaechen.py essen.osm osm-kern.json`, zusammen: `python3 werkzeug/zusammen.py essen-kern.json`.
