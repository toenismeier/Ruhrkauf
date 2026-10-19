# Ladenbau: Stand

Übergabedatei für `auftraege/workstream-ladenbau.md`. Vor jedem neuen Chat vollständig lesen und am Ende fortschreiben.

## Aktuelle Phase
**Phase 1 offen (Merge-Blocker), Phasen 2 und 3 vorgezogen als Drafts.** Stand: 19.10.2026.

Phase 1: `feat/ladenbau`, Draft-PR #6. Phase 2: `feat/ladenbau-p2`, Draft-PR #8 gegen Phase 1. Phase 3: `feat/ladenbau-p3`, Draft-PR #9 gegen Phase 2. **Keinen PR mergen**, bevor die technische und visuelle Abnahme grün ist; Abhängigkeiten in der Reihenfolge Phase 1 → 2 → 3 auf `main` bringen.

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

## Fortsetzung vom 19.10.2026: Phasen 2 und 3 vorgezogen

### Phase 2 (Draft-PR #8)
- `render/LADENBAU.md`: verbindliche Gänge 3,0 / 1,8 m, Wandbelegung 85 %, Dichte 35–50 %, Akzentboden höchstens 10 %, Deko 2 %, Inszenierung höchstens eine je Abteilung, Kasse/Vorfeld und drei Profile.
- `render/src/kit/ladenbau-regeln.js`: zentrale Kennzahlen, Formatprofile und Möbel-IDs der 147er Bibliothek. Die Profilreferenzen wurden auf vorhandene IDs abgeglichen.
- **Offen:** Node/Render-Abnahme, Prüfung der Auswirkungen auf vorhandene Module, Rebase nach Phase 1. Kein Merge.

### Phase 3 (Draft-PR #9)
- `render/src/kit/ladenplan.js`: Plan-Datenmodell für Hindernisse, Eingang, Gänge, Abteilungsrechtecke, Wandband, Gondelreihen, Kasse und Böden; Bibliotheks-Renderer `baueLadenplan`.
- `render/src/kit/ladenbau-sport.js`: Adapter für Sporthaus-Maße, Bestands-Hindernisse und `haus.flaechen`.
- `render/src/kit/ladenbau-pruefung.js` und `render/pruef-ladenbau.js`: Wegesuche auf 0,625-m-Raster, Flächen-, Wand-, Möbel-, Deko- und Budgetprüfung. CLI `--teile` zählt die tatsächlichen Geometrieteile.
- `render/src/kataloge/ladenplan-diagnose.js`: Draufsicht neben 3D; Katalogkamera in `render/src/kit/katalog.js` optional ergänzt.
- `render/tests/ladenbau-smoke.cjs` und npm-Skripte für Smoke, Prüfung und Diagnose hinzugefügt.
- **Isolierter Logiktest (nicht: Node/npm oder Browser):** vier künstliche Grundrisse von 30×30 bis 75×55 m mit sechs Abteilungen; 147 Möbel-IDs abgeglichen. Modell generiert 32–232 Möbel und je eine Kasse, keine fehlenden Möbel-IDs. **Rot:** Möbeldichte rund 16–25 % statt 35–50 %, größte freie quadratische Prüffläche 8,75–11,25 m statt höchstens 6 m. Insbesondere Flächendichte und Leerfläche müssen konstruktiv nachgebessert werden.
- **Nicht ausgeführt:** `npm ci`, `npm run build`, `node spiel-render.js`, `node pruef-ladenbau.js --teile`, vollständiger Sporthaus-Lauf, Chromium-Kataloge und PNG-Sichtprüfung. Der Chat-Zugriff auf dieses private Repository erfolgt über den GitHub-Connector; ein lokal testbarer Repository-Checkout stand in der Sitzung nicht zur Verfügung.
- Phase 3 deshalb **nicht abgenommen, nicht mergefähig**. Phase 4 ist nach Sport-Merge grundsätzlich frei, darf aber nicht vor grünem Planer beginnen.

### Relevante PRs und letzte Messwerte
| Gegenstand | Wert / Beleg |
|---|---|
| Phase 1 | PR #6, 147 Möbel, 0 Fehler im früheren vollständig ausgeführten CI-Lauf 39233091971; HEAD-Abnahme und versionierte Bilder offen |
| Phase 2 | Draft-PR https://github.com/toenismeier/Ruhrkauf/pull/8, keine Endabnahme |
| Phase 3 | Draft-PR https://github.com/toenismeier/Ruhrkauf/pull/9, künstliche Logiktestfälle noch rot |
| `pruef-ladenbau` alle Sporthäuser | offen / nicht ausgeführt |
| `spiel-render.js` neuer HEAD | offen / nicht ausgeführt |
| Diagnosebild | Katalogcode vorhanden, keine erzeugte/gesichtete PNG |
| Neu versionierte Möbel-PNGs in `bilder/` | weiterhin offen |

## Nächster Schritt
1. **Phase 1 lokal abschließen:** aktuellen `main` integrieren, `npm ci`, Engine- und Render-Prüfungen, Möbelprüfung, Browser-Smoke und Katalogbilder tatsächlich lokal ausführen; finale PNGs nach `bilder/` committen. Erst bei grünem Lauf PR #6 mergen.
2. **Phase 2:** auf gemergtem `main` rebasen, zentrale Regeln und Referenz-IDs automatisiert prüfen, lokalen Build/Smoke durchführen, dann PR #8 mergen.
3. **Phase 3:** Reihenplanung und Freiflächen optimieren, bis Dichte 35–50 % und größte Leerfläche ≤6 m erreicht werden; alle 50 bzw. nach aktuellem Stamm 44 Sporthäuser samt Etagen prüfen und Teile tatsächlich zählen. Weitere Prüflücken (insbesondere Wegesuche, Randband und kassenfreier Plan) nachbessern, Diagnosekataloge rendern/ansehen, grünen Render-Build und Browser-Smoke nachweisen. Dann PR #9 mergen.
4. **Phase 4 Sport:** erst nach Phase-3-Abnahme beginnen; Sport-Außenfamilien und Spiel-Logik beibehalten.


## Fortsetzung 19.10.2026: Produktionsdaten-Regressionscheck (Phase 3)

### Durchgeführt und committed auf `feat/ladenbau-p3`
- Das Programm erzeugt für echte Sporthausdaten einen durchgängigen Hauptgang, der rückwärtige Treppen- und Lagerraster berücksichtigt; unpassierbare Querwege werden nicht erzeugt. Kassen weichen Hindernissen aus.
- Sortimentstrennung: pro Abteilung rechteckige Fläche im 1,25-m-Raster; maximal ein durchgängiger 2,5-m-Querweg je Seite, statt eines Gangs nach jeder Abteilung.
- Möbel: beidseitige Gondelreihen (2 × 1,25 m Rücken an Rücken) mit 1,875-m-Laufgängen, kurze Restmodule und begrenzte Waren-/Kopfinseln zum Schließen von Leerflächen. Max. eine **Erlebnisinszenierung** pro Abteilung bleibt erhalten; normale Kopf-/Wareninseln sind keine Erlebnisinszenierungen.
- Rück- und Westwand: Modul auf 2,5 m reduzieren, wenn 5 m wegen Hindernis nicht passt; nach 5-m-Treppenrastern wieder modular bestücken. Wandprüfung berechnet belegte vs. *nutzbare* Wandintervalle korrekt; Treppen, Rolltreppen, Aufzüge und Lagerräume sind Ausnahmen.
- `render/tests/ladenbau-smoke.cjs`: jetzt harte Assertions für alle vier synthetischen Fälle **und alle 50 Sporthäuser / 101 Verkaufsetagen** aus `render/haeuser.json`. Bis zur Node-Ausführung sind das neu geschriebene Tests, **keine bestandenen Node-Tests**.

### Gemessen (isolierte V8-Ausführung mit den tatsächlichen Funktionen und Produktionsdaten)
| Kennzahl | Neuer Stand |
|---|---|
| Sporthäuser | **50** |
| Verkaufsetagen | **101** |
| Ohne Planabbruch | **101 / 101** |
| Ohne Ladenbau-Regelverstoß im isolierten Logiktest | **101 / 101** |
| Möbeldichte, Minimum / Maximum | **35,12 % / 46,03 %**, Ziel 35–50 % |
| Wandbelegung / Kasse / Wege / Leerfläche | **0 Verstöße** in 101 Datenplänen |
| Geplante Möbelobjekte über alle 101 Etagen | **14.976** |
| Vier synthetische Grundrisse (30×30, 45×40, 55×40, 75×55 m) | **jeweils 0 Verstöße** |

**Testabgrenzung:** Für diese Prüfung wurden die konkreten JavaScript-Funktionen und Möbel-Metadaten über den GitHub-Connector geladen und in isolierter V8-Laufzeit ausgewertet. Die originalen Eingabedaten `render/haeuser.json`, `sportRaster`, `masseSport`, `familieSport` und die echte Plan-Prüflogik wurden verwendet; Modulimporte und Three.js-Build wurden nicht ausgeführt. Das Ergebnis ist **kein** Nachweis für `npm ci`, `esbuild`, `pruef-ladenbau.js --teile`, Chromium-Rendering oder `spiel-render.js`.

### Offene Abnahme- und Merge-Blocker
1. **Phase 1 (PR #6):** `feat/ladenbau` hängt hinter dem aktuellen `main`, Merge-Konflikte. Erforderlich: Rebase, vollständiger lokaler Build/Engine/Render-Smoke, `pruef-moebel`, vier Katalog-PNGs tatsächlich in `bilder/` aufnehmen und prüfen. Letzter CI-Lauf auf einem älteren Commit grün; aktueller HEAD hat wegen GitHub-Runner-Provisionierung kein grünes CI.
2. **Phase 2 (PR #8):** `feat/ladenbau-p2` als Entwurf; Regeln/Konstanten vorhanden, es fehlen Integrationstest, Review und Merge nach Phase 1.
3. **Phase 3 (PR #9):** Plan-Datenregression nun isoliert grün. Zwingend offen: vollständige Node-`ladenbau:smoke` und `ladenbau:pruefen:teile` mit echten Sammler-Teilen, Render-Build, alle Bilder erstellen und **visuell inspizieren**, Regression `spiel-render.js`, Kompatibilität mit jüngstem `main`. Erst nach grüner Abnahme in Abhängigkeitsreihenfolge mergen.
4. **Phase 4 Sport:** fachlich freigegeben, aber noch nicht begonnen. Abhängig von abgenommener Phase 3. Die bestehende Sport-Innengeometrie wurde **nicht** umgestellt.
5. **Umgebung:** Lokaler Checkout des privaten GitHub-Repos ist derzeit nicht möglich: Shell-Netzwerkauflösung für github.com fehlgeschlagen. Die hier dokumentierten Commits wurden über die authentifizierte GitHub-Verbindung erstellt. **Nichts nach `main` gemergt.**

### Letzter Stand und nächste konkrete Aktion
- Letzte Codekorrekturen: `render/src/kit/ladenplan.js`, `render/src/kit/ladenbau-pruefung.js`, `render/tests/ladenbau-smoke.cjs` auf Branch `feat/ladenbau-p3`.
- Die älteren Zeilen im Abschnitt „Fortsetzung ... Phasen 2 und 3 vorgezogen“ beschreiben den **damaligen Zwischenstand**; die Werte „rot“ werden durch die obigen 101/101-Prüfwerte ersetzt.
- **Priorität:** Phase 1 auf aktuellen `main` bringen und lokal abnehmen, Bilddateien versionieren, PR #6 mergen; danach Phase 2 und Phase 3 mit echtem Node/Three.js/Browsertest abnehmen und mergen. `main` bis dahin unverändert lassen.
