# Q01: Essen aus Kartendaten – Stand 21.10.2026

## Umfang und Abgrenzung
- Branch: `feat/q01-essen`, direkt von `main`; eigener Draft-PR, unabhängig von `feat/massstab-staedte` / PR #31.
- **Nur Essen** nutzt `render/karten/essen.json` und `planAusKarte`. Die 111 anderen bisherigen Städte nutzen weiterhin `stadtplan`; ihre Referenzdateien werden nicht geändert.
- OpenStreetMap-Datenstand: 20.10.2026, © OpenStreetMap-Mitwirkende, ODbL. Lizenzangabe unter Einstellungen → Über.
- Quelle `render/karten/essen.json` bleibt unverändert; die Engine-Hausdaten und Spielstand-IDs bleiben maßgeblich.

## Umgesetzte Bausteine
| Teil | Umsetzung | Erwartete Wirkung |
|---|---|---|
| Kartenplan | `render/src/kit/karten/plan.js`, Export `planAusKarte` aus `stadtplan.js` | Essen erhält die reale OSM-Lage und einen eigenen Plan; ohne `kartenstadt: 'essen'` läuft der alte Generator unverändert. |
| Grafik | `render/src/kit/karten/bauer.js` mit Anbindung in `stadt.js` | OSM-Straßen als echte Polylinien einschließlich Schrägen, Flächen, Wasser und realer Gebäudelagen. Bahngleise aus Originalpolylinien, Oberleitung nur bei entsprechender OSM-Eigenschaft, Züge auf Bahnhofsgleisen neben Bahnsteigen. |
| Viertel | `render/src/kit/karten/essen.js` | Zentrum als Einkaufszone, Rüttenscheid als Gründerzeitbereich, Essener Norden als Zechensiedlung, Wohn-/Gewerbe- und Randbereiche unterscheidbar. |
| Wahrzeichen | `render/src/kit/wahrzeichen/essen.js` | Rathaus mit 106-m-Turm, Hbf-Gebäude und Halle, Münster, Marktkirche, Limbecker Platz, Kettwiger Fußgängerzone mit Möblierung, weitere Leitbauten. |
| Spiel | `render/src/spiel.js` | Im Echtspiel und bei Bahnreisen ausschließlich für Essen den Kartenweg verwenden; Startkamera bei Hbf mit Blick auf die Einkaufslage. Spiel-Bauer und Engine-Standort-IDs bleiben integriert. |
| Fingerabdruck | `render/src/fingerabdruck-inhalt.js` | Essens Referenz wird künftig vom neuen OSM-Plan erzeugt. Die übrigen 111 Messpfade bleiben unverändert. |
| Katalog | `render/src/kataloge/karte-essen.js` | Acht verlangte Nahansichten auf einem Abnahmeblatt. |
| Datenprüfung | `render/pruef-karte-essen.js` | Datenstruktur, Hbf-Gleise, wichtige Wahrzeichen und acht Ansichtsnamen werden überprüfbar. |

## Katalog: acht Ansichten
1. Essen Hauptbahnhof mit Gleisharfe und Zügen
2. Kettwiger Straße mit Fußgängerzone
3. Rathaus
4. Limbecker Platz
5. Münster und Marktkirche
6. Rüttenscheid
7. Norden mit Zechensiedlung
8. Rand mit Kleingärten und gestalteten Feldstreifen

Der OSM-Ausschnitt (±1.700 m um die Kartenmitte) enthält **keine als Feld kartierten Agrarflächen**. Für die achte Ansicht sind deshalb stilisierte Feldstreifen als ausdrücklich handgesetzte Kulisse ergänzt. Diese sind nicht als OSM-Geometrie zu interpretieren.

## Prüfung durch Claude – noch offen
In diesem Chat wurden **keine Builds, Tests, Messungen oder Renderings ausgeführt**. GitHub Actions sind laut `auftraege/README.md` kontingentbedingt blockiert. Claude muss lokal prüfen:

```bash
cd render
npm ci
node pruef-karte-essen.js
npm run build
node render-katalog.js karte-essen
node pruef-staedte.js
node pruef-gestaltung.js Essen
node pruef-alle-gestaltung.js
node spiel-render.js
node pruef-fingerabdruck.js --neu essen
node pruef-fingerabdruck.js
```

Danach `render/fingerabdruck/essen.json` **und** `render/fingerabdruck/bilder/essen.png` aus dem echten Lauf einchecken. **Diese beiden Essen-Dateien sind auf dem Branch noch die alten Referenzen.** Referenzen anderer Städte nicht anfassen. Ohne neuen Essen-Fingerabdruck, ohne grünen Vergleich der 111 anderen Fingerabdrücke und ohne lokale Bildabnahme **kein Merge**.

In der PR nachtragen: Vorher/Nachher-Dreiecke, Draw Calls, Aufbauzeit für Essen; iPhone-Ziel <1,5 Mio. Dreiecke, <300 Draw Calls; realen Zustand der Zugpositionen, Gleise und acht Bilder. Vorher-/Nachher-Zahlen werden nicht geschätzt oder erfunden.

## Abnahme
Ummo beurteilt die acht Ansichten auf dem iPhone, **bevor Phase 2 (Top 20)** begonnen wird. Laufende PR #31 übernimmt den Essen-Kartenweg später; Q01 macht keine Änderungen in PR #31.
