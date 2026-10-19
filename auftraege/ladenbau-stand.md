# Ladenbau: Stand

Übergabedatei für `auftraege/workstream-ladenbau.md`. Vor jedem neuen Chat vollständig lesen und am Ende fortschreiben.

## Aktuelle Phase
**Phase 1: Möbelbibliothek – implementiert, technische und visuelle Abnahme größtenteils erfolgt; Merge-Freigabe noch offen (19.10.2026).**

Branch: `feat/ladenbau`, Draft-PR: https://github.com/toenismeier/Ruhrkauf/pull/6. **Nicht mergen**, bevor die aktuelle HEAD-CI grün und die Bilder im Repository bestätigt sind. Phase 2 ist noch nicht begonnen.

## Erledigt
- Neuer Ordner `render/src/kit/moebel/` mit `index.js`, `basis.js`, `wand.js`, `gondel.js`, `insel.js`, `kasse.js`, `deko.js`, `sport.js`, `outlet.js`, `service.js` sowie Katalog- und Prüfhelfern.
- Einheitliches Möbelobjekt `{ id, titel, bereich, rasterB, rasterT, hoehe, typ, budget, bau(L, r, d, ctx) }`. Maße im 1,25-m-Raster, Wandtiefe 0,6 m mit Sockel 0,12 m und 0,6-m-Schildband über 2,4-m-Korpus, Gondeltiefe 1,25 m / Höhe 1,4 m, Inselhöhe höchstens 1,5 m.
- **147 Möbeldefinitionen** im Index: **86 Sport, 15 Outlet, 46 allgemein**. Sport enthält Wandmodule, Gondeln, Schaufensterpuppen, Inszenierungen, Service und Kassen. Off-Price enthält u. a. dicht gehängte Doppelstangen mit Größenkennzeichnung, Rundständer, Wandware, Gondeln, Kassenzeile und Schlangenführung. Allgemein enthält Holzregale, klassische Vitrine, Treppe, Aufzug, Spiegelstütze und Rasterleuchten.
- Deterministische Warenfarben über `rng(seed)` und Bereichspaletten, keine realen Marken, Text über `basis.js`. In LOD `fern` vereinfachte Korpusse/Farbflächen.
- `render/pruef-moebel.js`: prüft tatsächliche Three.js-Bounding-Boxen, Stellflächen und negative z-Grenze, Höhen, Budgets (Wand 220, Gondel 120, Insel 260, Deko 80), gleiche Geometrie bei gleichem Seed sowie Fernstufe. Die ersten zwei gemessenen Überschreitungen (Pflanzkübel, Beflockung) sind korrigiert.
- Kataloge: `moebel-sport`, `moebel-outlet`, `moebel-allgemein`, `moebel-reihen` sowie `moebel-sport-fern` (zusätzlich angelegt). Reihenkatalog zeigt fünf 20-m-Wandbänder und zwei Gondelreihen mit bündigen Modulanschlüssen.
- **Drei Bildfassungen** erfolgreich gerendert und gegengeprüft: Läufe [39232357906](https://github.com/toenismeier/Ruhrkauf/actions/runs/39232357906), [39232587806](https://github.com/toenismeier/Ruhrkauf/actions/runs/39232587806), [39233091971](https://github.com/toenismeier/Ruhrkauf/actions/runs/39233091971). Visuelle Korrekturen: differenzierte Schuhwand-Markierung, Puppenhaltungen, doppelten Rasterleuchten-Katalogeintrag in einen Wegweiser geändert. Letzte Fassung wurde auf sichtbare Fehler sowie Reihenanschlüsse geprüft.
- `.github/workflows/quality.yml`: Möbelprüfung und automatisches Rendern der vier Kernkataloge ergänzt; Artefakt-Upload und Übernahme nach `bilder/` vorbereitet. `render/render-katalog.js` funktioniert sowohl mit bisher festem als auch Playwright-installiertem Chromium. `render/package.json`, `render/KIT.md`, Projekt-`README.md` aktualisiert.
- Vorhandene Aufrufer in `innen.js` und `sportabteilung.js` **nicht verändert**. `render/src/kit/basis.js` **nicht verändert**.

## Offen in Phase 1 (verhindert Merge)
1. **GitHub Actions/Runner:** Seit den CI-Konfigurations-/Dokumentationscommits scheitern die aktuellen Läufe beim Provisionieren der Runner, **bevor ein einzelner Jobschritt startet** (z. B. [39234031724](https://github.com/toenismeier/Ruhrkauf/actions/runs/39234031724)); der zuletzt vollständig ausgeführte Lauf ist grün, aber der aktuelle HEAD ist nicht mit grüner CI abgenommen. Runner-/Actions-Zugang prüfen und für aktuellen HEAD erneut ausführen.
2. **PNG-Dateien in `bilder/`:** Vier finale Kataloge wurden als CI-Artefakt erzeugt (letzter grüner Kataloglauf 39233091971, Artifact-ID **12177337329**, Name `ladenbau-kataloge`), **noch nicht** als `bilder/katalog-moebel-{sport,outlet,allgemein,reihen}.png` im Repository nachgewiesen. Der CI-Upload-Commit-Schritt ist eingebaut, lief aber wegen der Runner-Ausfälle nicht durch. Nach erfolgreichem Lauf die vier Dateien und ihre Sichtbarkeit im Branch prüfen.
3. `moebel-sport-fern` optional zusätzlich als Bild rendern. Abschließende Sichtprüfung der tatsächlich versionierten `bilder/`-Dateien und grüne Gesamt-CI bestätigen; danach Draft-PR für Review freigeben.

## Letzte Messwerte
| Prüfung | Wert | Datum / Beleg |
|---|---|---|
| Möbeldefinitionen | 147 (Sport 86, Outlet 15, allgemein 46) | 19.10.2026, `pruef-moebel.js` |
| `pruef-moebel` | **0 Fehler** im letzten vollständig ausgeführten CI-Lauf | 19.10.2026, Run 39233091971 |
| Maximale Teile, nah | Sport 73 / Outlet 88 / allgemein 73 | 19.10.2026, Möbel-Job |
| Maximale Teile, fern | Sport 5 / Outlet 8 / allgemein 5 | 19.10.2026, Möbel-Job |
| Engine `typecheck` + Tests | grün | 19.10.2026, Run 39233091971 |
| Render-Build + Browser-Smoke | grün | 19.10.2026, Run 39233091971 |
| Vier Möbelkataloge | erfolgreich, 3 Fassungen / Sichtprüfung | 19.10.2026, Runs oben |
| Gesamt-CI des neuesten HEAD | **offen: Runner-Vergabe scheitert vor Jobstart** | 19.10.2026, Run 39234031724 |
| `pruef-ladenbau` | nicht vorhanden, gehört zu Phase 3 | 19.10.2026 |

## Letzte Bilder
Letzte geprüfte Katalogfassung: GitHub Actions Run [39233091971](https://github.com/toenismeier/Ruhrkauf/actions/runs/39233091971), Artefakt `ladenbau-kataloge` (ID `12177337329`).
- `render/out/katalog-moebel-sport.png`: 86 Sportmodule einzeln auf Bodenplatten, einschließlich Schuhwände, Inseln und Service.
- `render/out/katalog-moebel-outlet.png`: 15 Off-Price-Möbel, getrennte Größen-Stangen, Kassenführung und Nachräumwagen.
- `render/out/katalog-moebel-allgemein.png`: 46 allgemeine/klassische Ladenbaumöbel mit Altbau-Treppe, Aufzug und Vitrine; doppeltes Leuchtenlabel in letzter Fassung entfernt.
- `render/out/katalog-moebel-reihen.png`: 20-m-Wandbänder aus bündig anschließenden Modulen und Gondelreihen.
- `bilder/katalog-moebel-*.png`: **noch ausstehend**, nicht mit obigen `render/out/`-Dateien verwechseln.

## Entscheidungen und Abweichungen
- Möbel wurden in eine gemeinsame, maßhaltige Geometriesprache **neu parametrisiert** statt sämtliche alten Spezialfunktionen unverändert als Wrapper zu übernehmen. Grund: viele Altmodule überschreiten die strengeren Maße der Bibliothek. Bestehende Etagengeometrie bleibt vorerst unberührt; tatsächliche Umstellung ist Phase 4–6.
- Off-Price bewusst ohne Wühltisch, Gitterbox, Palette oder Lagerregal.
- `pruef-ladenbau` nicht vorgezogen; Gänge, Flächendichte und Raumplanung gehören erst zu Phase 2 und 3.
- Eigenständige Möbel-CI und automatischer Bild-Commit hinzugefügt. Der letzte Schritt benötigt eine funktionsfähige GitHub-Runner-Bereitstellung. Bis dahin keine Merge-Freigabe.
- Keine Änderungen an den Außenbauten, Stadtplänen, Engine-Kalibrierung und Basis-API.

## Nächster Schritt
**Phase 1 abschließen:** GitHub-Runner-Ausfall untersuchen, neuesten HEAD vollständig grün testen, vier final gerenderte PNGs unter `bilder/` tatsächlich versionieren und prüfen, dann Draft-PR #6 freigeben. **Erst danach Phase 2**: `render/LADENBAU.md` und `render/src/kit/ladenbau-regeln.js` mit verbindlichen Flächen-, Gang-, Wand- und Dichte-Grenzen.
