# Q01: Essen aus Kartendaten – Stand 21.10.2026 (Claude, nach Abnahme GPT-Stand)

## Entscheidung im Umbau (Claude, 21.10.2026 abends)
GPTs erster Stand baute Essen direkt aus den OSM-Polylinien und Gebäudeumrissen (`karten/plan.js`, `karten/bauer.js`):
nackte graue Klötze ohne Hausbauer, Klötze auf den Gleisen, kein Stadtrandgürtel (Blick über den Kartenrand),
Kameragrenze ohne Herauszoomen. Nicht vorzeigbar, daher entfernt.

Neuer Weg wie Coffee Inc 2: **Lage nach OpenStreetMap, Bebauung und Straßen im Kit-Raster.** Essen läuft über den
Ruhr-Archetyp (`archetypen/west.js`, `Essen: { essen: true, … }`), alle Gestaltungsregeln, Hausbauer, Stadtrand und
Prüfungen gelten weiter. Aus `render/karten/essen.json` übernommen ist die Anordnung (wie alle Ruhrstädte des Kits um
180° gedreht: Gleise oben, Kanal unten):
- Hauptbahnhof mit Gleisharfe (64 m Gleisband mit Bahnsteigen und Zügen), großes Empfangsgebäude, Vorplatz.
- Kettwiger Straße als Fußgängerzone vom Hbf bis zum Markt mit der Marktkirche (`kreuzWunsch`).
- Limbecker Straße quer vom Markt bis zum Einkaufszentrum am Limbecker Platz (`centerWunsch`, Hartwig Einkaufszentrum
  und Hartwig Sport Arkaden).
- Münster an der Kettwiger Straße, Rathaus als Hochhaus (26 Geschosse) mit Porscheplatz östlich des Markts.
- Ring (Schützenbahn mit Straßenbahn, Hindenburgstraße), Zeche, Halde, Siedlungen und Kanal im Norden.
- Spielstart am Hbf mit Blick die Kettwiger Straße hinunter (`plan.startBlick = 'hbf'`, `stadtrand.js nahMitte`).

Planer-Haken (`stadtplan.js`, nur wirksam, wenn gesetzt; alle anderen Städte unverändert, Fingerabdrücke 111/111 gleich):
`E.kreuzWunsch`, `E.centerWunsch`, `b.band` (Gleisband-Breite), `b.essenHbf`, `E.startBlick`; `rathausStil`/`rathausGeschosse`
in `sonderbauten.js rathaus()`.

## Abnahme
- Katalog `render/src/kataloge/karte-essen.js` (8 Ansichten: Hbf, Kettwiger, Markt/Limbecker/Rathaus, Münster,
  Rathaus, Limbecker Platz, Spielstart, Nordrand), Standorte aus der Engine wie im Spiel.
- `pruef-staedte` 0 Fehler; `pruef-gestaltung Essen` wie main (2 bestehende Verstöße), Gleisharfe als Essen-Ausnahme
  in GESTALTUNG.md.
- Fingerabdruck Essen neu (Grund: Stadtplan Essen geändert), übrige Städte unverändert.
- **Ummo beurteilt Essen auf dem iPhone, bevor Phase 2 startet.**

## Für Phase 2
Gleiches Muster je Stadt: Archetyp-Option (`<stadt>: true`) mit Lage der Wahrzeichen und Einkaufsachsen aus den
Kartendaten, Wahrzeichen als Slot-Bauer, Startblick. Kartendaten liefert Claude.
