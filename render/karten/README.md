# Kartendaten (Q01)

Je Stadt eine Datei `<stadt-id>.json` aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL). Format und Verwendung: `auftraege/wurf1/q01-staedte-kartendaten.md`. Koordinaten in Metern, x nach Osten, z nach Süden (Nord = −z), Ursprung = `mitte`.

| Stadt | Datei | Ausschnitt | Stand | Kontrollbild |
|---|---|---|---|---|
| Essen | `essen.json` | ±1.700 m um 51,4550 / 7,0120 | OSM 20.10.2026 | `kontrolle/essen-kern.png` (±800 m), `kontrolle/essen-lageplan.png` (±1.700 m) |

Inhalt je Datei: `strassen` (haupt, neben, wohn, fuss; Name, Tunnel, Brücke), `gleise` (fern, stadtbahn, u, tram; Oberleitung, Tunnel, Brücke, Dienstgleis), `bahnhoefe`, `bahnsteige`, `wasser`, `flaechen` (kleingarten, feld, wiese, wald, park, friedhof, industrie, bahn, wohnen, kern, platz, sport, parkplatz …), `gebaeude` (benannte Leitbauten mit Höhe), `bebauung` (alle übrigen Gebäudeumrisse, ganze Meter, Höhe falls bekannt), `wahrzeichen` (Id, Name, Lage), `hinweise`.

Erzeugung (macht Claude, Daten kommen über Ummos Rechner, weil Overpass aus der Cloud gesperrt ist):
`python3 -I werkzeug/osm-umwandeln.py <overpass.json> <stadt>.json <stadt-id> <lat> <lon> <radius_m> werkzeug/<stadt>-overrides.json`, Kontrollbild mit `werkzeug/kontrollbild.py`.
