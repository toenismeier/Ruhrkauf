# Q01: Städte aus echten Kartendaten – wiedererkennbar wie im Original

Branch `feat/q01-staedte-karte`. Mehrere Chats. Übergabedatei `auftraege/wurf1/q01-stand.md` (anlegen, am Ende jedes Chats fortschreiben).

## Ziel (Ummo, 20.10.2026)
- Größter Kritikpunkt am Wurf 1: Die Städte fühlen sich „kein bisschen“ nach der Stadt an, die sie darstellen.
- Essen muss an **Kettwiger Straße, Gleisharfe am Hauptbahnhof und Rathaus** erkennbar sein. Das gilt entsprechend für alle Standorte.
- Ansatz wie Coffee Inc 2: echter Grundriss, stilisiert, verdichtet und zugespitzt, nicht maßstabsgetreu. Handarbeit je Stadt ist ausdrücklich gewollt.
- Zu monoton heute: gleiche Schrebergärten 1:1, gleichförmige Felder am Stadtrand (Hannover), „wirklich Copy and Paste“. Mit echten Grundrissen hat keine Stadt mehr denselben Plan.

## Phase 0: Kartendaten (macht Claude, nicht GPT)
GPT kann keine Daten laden. Claude zieht die Daten aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL) und legt sie unter `render/karten/<stadt-id>.json` ab, zuerst Essen.
Format (Meter, lokal projiziert, Ursprung = Kartenmitte, Nord = −z):
```
{ "stadt": "essen", "quelle": "OSM <Datum>", "mitte": [lon, lat], "radius_m": 1800,
  "strassen":   [{ "klasse": "haupt|neben|wohn|fuss|platz", "name": "Kettwiger Straße", "punkte": [[x,z], ...] }],
  "gleise":     [{ "art": "fern|sbahn|tram|u", "punkte": [[x,z], ...], "oberleitung": true }],
  "bahnhoefe":  [{ "name": "Essen Hbf", "umriss": [[x,z], ...], "bahnsteige": [[[x,z], ...]] }],
  "wasser":     [{ "art": "fluss|see|kanal", "umriss": [[x,z], ...] }],
  "flaechen":   [{ "art": "park|wald|kleingarten|feld|friedhof|industrie|wohnen|kern", "umriss": [[x,z], ...] }],
  "gebaeude":   [{ "art": "rathaus|kirche|hochhaus|kaufhaus|bahnhof|sonstig", "name": "...", "umriss": [[x,z], ...], "hoehe_m": 106 }],
  "wahrzeichen":[{ "id": "essen-rathaus", "name": "Rathaus Essen", "pos": [x,z] }] }
```
Gebäudeumrisse nur für Leitbauten und Wahrzeichen, nicht für jedes Haus.

## Phase 1: Musterstadt Essen (1 bis 2 Chats)
1. **Plan aus Karte:** `stadtplan.js` erhält einen zweiten Weg `planAusKarte(karte)`: Straßen, Gleise, Wasser, Flächen und Plätze kommen aus der JSON, auf das Kachelraster der Karte gelegt (Straßen auf die Rasterachsen „gezogen“, so wenig Verzerrung wie möglich; Krümmungen bleiben als Diagonalen/Bögen, wo das Kit sie kann). Städte ohne Kartendatei laufen weiter über den heutigen Weg.
2. **Bebauung je Fläche:** Die vorhandenen Hausbauer füllen die Baublöcke zwischen den Straßen. Bauweise nach Flächenart und Lage: Kern = Geschäftshäuser und Kaufhäuser, Gründerzeit-Ring, Nachkriegszeilen, Zechensiedlung (Ruhrgebiet), Einfamilienhäuser, Gewerbe. Zuordnung je Stadt in `render/src/kit/karten/<stadt>.js` (Viertel → Bauweise), Standard aus der Region.
3. **Gleise und Bahnhof:** Gleise exakt aus der Karte. Züge stehen nur auf Gleisen und an Bahnsteigen. Oberleitung nur über elektrifizierten Gleisen, durchgehend bis zum Gleisende. Gleisende nur am Prellbock, an der Wendeschleife oder am Kartenrand. Straßenbahn folgt ihren echten Strecken.
4. **Wahrzeichen von Hand:** Für Essen mindestens Rathaus (Hochhaus), Hauptbahnhof mit Gleisharfe, Limbecker Platz, Münster, Kettwiger Straße als Fußgängerzone mit typischer Möblierung. Neues Modul `render/src/kit/wahrzeichen/essen.js`, stilisiert im Kit-Stil, eigene Teilebudgets.
5. **Eigene Häuser:** Hartwig, Volkskauf, Sport und FUNDUS an plausiblen echten Lagen (Hartwig an der Kettwiger Straße bzw. am Limbecker Platz, FUNDUS im Retail Park). Standortlogik aus `massstab-staedte.md` Phase 2 gilt weiter.
6. **Vielfalt statt Kopie:** Kleingärten mit unregelmäßigen Parzellen, Lauben in mindestens 6 Größen/Farben, Wege, verwilderte Ecken. Felder in Streifen unterschiedlicher Breite und Fruchtfarbe mit Feldwegen, Hecken und Höfen. Messgröße in `pruef-gestaltung`: Anteil identischer Bauteil-Gruppen in gleicher Lage je 100 × 100 m höchstens 15 %.
7. **Kamera:** Startansicht beim Ankommen zeigt die wiedererkennbare Mitte (Essen: Hauptbahnhof mit Blick auf die Kettwiger Straße).

Abnahme Phase 1: Katalog `render/src/kataloge/karte-essen.js` mit 8 Ansichten (Hbf, Kettwiger Straße, Rathaus, Limbecker Platz, Münster, Rüttenscheid, Norden mit Zechensiedlung, Rand mit Kleingärten/Feldern). Ummo beurteilt Essen auf dem iPhone, **bevor Phase 2 startet**.

## Phase 2: Top 20 (mehrere Chats)
Die 20 Städte mit dem meisten eigenen Umsatz bekommen dasselbe wie Essen: Kartendaten (Claude liefert in Paketen), Viertelzuordnung, 2 bis 4 Wahrzeichen je Stadt, Startansicht. Wahrzeichenliste je Stadt in `q01-stand.md`, vor dem Bau mit Ummo abstimmen lassen (Claude legt sie vor).

## Phase 3: alle übrigen Städte
Kartendaten plus Viertelzuordnung aus der Region, je Stadt mindestens ein Wahrzeichen (Rathaus, Kirche oder Bahnhof in der echten Lage).

## Verhältnis zu laufenden Aufträgen
- `massstab-staedte.md` (`feat/massstab-staedte`, läuft) baut Städte über Archetypen. Q01 ersetzt für Städte mit Kartendatei den Planweg; die Standortlogik und die Prüfungen aus `massstab-staedte.md` bleiben. Q01 startet auf `main` nach dessen Merge.
- Fingerabdruck (Q03): Jede Stadt, die Q01 umstellt, bekommt im selben PR einen neuen Fingerabdruck. Andere Städte dürfen sich nicht ändern.

## Leistung und Prüfung
- Je Stadt Dreiecke, Draw Calls und Aufbauzeit vorher/nachher in die PR. Ziel für Metropolen auf dem iPhone aus `massstab-leistung.md`: unter 1,5 Mio. Dreiecke, unter 300 Draw Calls.
- `pruef-staedte` 0, Gestaltungsprüfung 0 (neue Regeln aus Q02 eingeschlossen), `spiel-render.js` 0 Abweichungen außer den umgestellten Städten.
- Lizenzhinweis OpenStreetMap im Spiel unter Einstellungen/Über.
