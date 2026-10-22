# Workstream Leistung: iPhone mit 560 Häusern und 220 Städten

Branch `feat/massstab-leistung`, **abgezweigt von `feat/massstab-staedte` (PR #31, Stand `ed226e7`)**, nicht von `main`. Ein bis zwei Chats. Übergabedatei `auftraege/massstab-stand.md` (Abschnitt Leistung).

## Neustart 22.10.2026: Leistung vor dem Merge von #31 (Ummo)
#31 ist fachlich abgenommen (220 Städte, Städteprüfung 0, Standortregeln 0, Kopien 0, Gestaltung nicht schlechter als `main`, 220 Fingerabdrücke). **#31 wird erst zusammen mit diesem Workstream gemergt**, weil die Städte mit dem 560er-Bestand schwerer geworden sind und die Regel gilt: Leistung je Stadt nicht schlechter als `main`.

**Befund Claude (Fingerabdruck-Messung, Chrome 130, Startbild 512 × 1024, LOD fern):** 91 der 112 bisherigen Städte haben auf #31 mehr Draw Calls oder Dreiecke als auf `main`, am stärksten Gütersloh (Dreiecke +78 %, Draw Calls +36 %), Recklinghausen (+74 % / +36 %), Kaiserslautern, Hanau, Erlangen, Moers, Neuss (je rund +50 % Dreiecke). Im Spiel (iPhone-Viewport, Start, Kacheln fertig) Gütersloh 2,74 → 3,76 Mio. Dreiecke, 1.397 → 1.608 Draw Calls. Ursache sind mehr eigene Häuser und Blöcke je Stadt, kein einzelner Fehler. Aufschlüsselung Gütersloh im Spiel (sichtbare Meshes): InstancedMesh mit 80 Dreiecken je Instanz 4.254 → 7.077 Instanzen (+226 Tsd. Dreiecke), 12 Dreiecke 11.077 → 17.769, 96 Dreiecke 757 → 2.060, 576 Dreiecke 176 → 298; die zusammengeführten Meshes sind gleich geblieben. Der Zuwachs steckt also in den Instanzen (Fenster, Dachaufbauten, Bäume, Autos, Figuren) der zusätzlichen Blöcke.

**Messtabelle je Stadt:** `auftraege/massstab-leistung-basis.csv` (Draw Calls und Dreiecke `main` und #31 für alle 220 Städte).

### Abnahme Neustart (zusätzlich zu den Zielen unten)
1. **Jede der 112 bisherigen Städte**: Draw Calls und Render-Dreiecke in der Fingerabdruck-Messung höchstens so hoch wie die Spalte `main` in `massstab-leistung-basis.csv`.
2. **Jede der 108 neuen Städte**: höchstens der Höchstwert von `main` für ihren Stadttyp: Metropole 1.233 Draw Calls / 10.148.022 Dreiecke, Großstadt 1.022 / 7.322.207, Mittelstadt 826 / 4.224.050.
3. **Spiel** (iPhone-Viewport 390 × 844, Pixelratio 2, Start, Kacheln fertig) für Berlin, Essen, Gütersloh, Recklinghausen, Hamburg, München: Draw Calls und Dreiecke höchstens wie auf `main`.
4. Kein Hebel verändert das Bild sichtbar. Wo sich Fingerabdrücke ändern, nennt der PR je Stadt den Grund (z. B. Instanzen außerhalb des Startbilds nicht mehr gebaut); Claude vergleicht Vorher/Nachher-Bilder.
5. #31-Prüfungen bleiben 0: `pruef-staedte`, `massstab:standorte`, `massstab:kopien`, Gestaltung nicht schlechter als `main`.

### Hebel in dieser Reihenfolge (jeweils danach messen lassen)
1. **Instanzen nach Sichtbereich und Entfernung**: Instanzen (Fenster, Markisen, Dachaufbauten, Bäume, Autos, Figuren) nur für Kacheln im Kamerabereich plus Rand; ferne Kacheln ohne Kleinteile. Grundlage Kachelsystem `KA` in `render/src/spiel.js`, `Instanzer` in `render/src/kit/stadt.js`.
2. **Billigere Instanz-Geometrie in `fern`**: das 80-Dreiecke-Objekt (häufigste Instanz) und das 96-Dreiecke-Objekt in einer Fern-Variante mit höchstens einem Viertel der Dreiecke.
3. **Detailstufe `mittel`** zwischen `nah` und `fern` für Kacheln am Bildrand.
4. **Blockfüllung**: Höfe und Rückseiten großer Blöcke im Fernbild als einfache Baukörper statt Einzelhäuser.
5. Danach die bisherigen Hebel unten (Zusammenführen je Haus, Engine-Hotpaths, Spielstand).

### Messung
GPT kann nichts ausführen. Claude misst: `node pruef-fingerabdruck.js --neu <stadt …>` (Ausgabe Draw Calls und Render-Dreiecke je Stadt), Spielmessung über die Performance-Kachel. GPT legt je Hebel einen Commit an und schreibt in die PR-Beschreibung, welche Städte und welche Instanzarten betroffen sein sollen.

## Bisheriger Auftrag (Stand 20.10.2026)

## Ausgangslage
- Heute: Stadtaufbau 1,7 bis 2,9 s, rund 42.000 Teile beim Start, „Woche weiter“ rund 17 ms Engine plus 54 ms Neubau (README, Stand 18.10.).
- Messwerkzeuge im Repo: Performance-Kachel im Prototyp (`render/src/ui/diagnose.js`), `MOBIL-TEST.md` (Grafikprofile `?grafik=hoch` und `?grafik=sparsam`), `node pruef-render.js` (Teile, Dreiecke, Zeit je Stadt), `pruef-render.js --zeit` (Zeit je Slot-Bauer).
- Detailstufen `nah`/`fern` über `setzeLod`, `KompaktSammler`, Instancing in `stadt.js`.

## Ziele (gemessen im Chromium-Mobilprofil der CI und, sobald möglich, auf dem echten iPhone)
| Messgröße | Ziel |
|---|---|
| Stadtaufbau Metropole | unter 3,0 s |
| Stadtaufbau Großstadt | unter 2,0 s |
| Bildrate beim Verschieben | mindestens 30 fps, Ziel 50 |
| „Woche weiter“ Engine | unter 60 ms |
| „Woche weiter“ Neubau sichtbarer Häuser | unter 80 ms im Mittel, Spitze unter 200 ms |
| Speicher nach 3 Stadtwechseln | kein Anstieg über 15 % gegen den ersten Aufbau |

## Vorgehen
1. Messen vor jeder Änderung: alle Städte über `pruef-render.js`, die 10 teuersten Städte im Prototyp mit Performance-Kachel. Ergebnisse in `massstab-stand.md`.
2. Hebel in dieser Reihenfolge, jeweils mit Messung danach:
   1. Häuser außerhalb des Sichtbereichs erst bauen, wenn die Kamera sich nähert (Kacheln nachladen, Grundlage ist das vorhandene Kachelsystem `KA` in `spiel.js`).
   2. Mehr Instancing für wiederkehrende Bauteile (Fenster, Markisen, Dachaufbauten) in den Hausbauern.
   3. Dritte Detailstufe `mittel` zwischen `nah` und `fern`.
   4. Geometrie je Haus nach dem Bau zu einem Puffer zusammenführen (gleiche Farbe), Neubau nur für geänderte Häuser.
   5. Engine-Hotpaths (Nachfrage je Haus, Einkauf je WG) profilieren und ohne Logikänderung beschleunigen. Gleiche Ergebnisse prüfen über einen Vergleichslauf 260 Wochen Seed 1: `historie` bitgleich.
3. Kein Hebel darf das Bild sichtbar verändern: Vorher-Nachher-Kataloge für 6 Städte, Nahausschnitt und Stadtansicht.

## Abnahme
- Zieltabelle erfüllt in der CI-Messung, Werte in `massstab-stand.md` und `MOBIL-TEST.md`.
- `pruef-staedte` 0, Gestaltungsprüfung 0, `spiel-render.js` 0 Abweichungen.
- Engine-Vergleichslauf bitgleich.

## Erste Messung auf dem echten iPhone (TestFlight-Wurf 1, 20.10.2026)
Berlin, KW 1, Grafikprofil `sparsam`, Canvas 502 × 1092, Pixelratio 1,25, App-Hülle (WKWebView):

| Messgröße | Wert |
|---|---|
| Bildrate | 30 fps |
| Framezeit 95. Perzentil | 34 ms |
| Renderaufruf 95. Perzentil | 9 ms |
| Frames über 33 ms | 31 / 89 |
| Draw Calls | 965 |
| Dreiecke | 4.480.868 |
| Geometrien / Texturen | 4872 / 114 |
| Teile der Stadt | 228.599 |

Befund: Der Renderaufruf (9 ms) ist nicht der Engpass, die GPU ist es (4,5 Mio. Dreiecke, 965 Draw Calls). Zusätzliche Zielwerte für Metropolen auf dem iPhone: **Dreiecke unter 1,5 Mio., Draw Calls unter 300, Frames über 33 ms unter 5 / 89.** Hebel 2 (Instancing) und 3 (Detailstufe `mittel`) haben damit Vorrang vor Hebel 1. Messung immer auch in der App (TestFlight), nicht nur im Chromium-Mobilprofil.

## Spielstand-Größe (Befund 20.10.2026 abends, nach Merge O04/O05/N01–N14)
Nach 104 Wochen ist der Spielstand rund 7,5 MB groß, vor allem durch die Verlaufsdaten je Haus aus O02 (`treiberVerlauf`) und O07. Gespeichert wird nach jeder Woche komplett in IndexedDB.
Ziele: Spielstand nach 260 Wochen unter 3 MB, Speichern nach „Woche weiter“ unter 50 ms auf dem iPhone, Laden eines 5-Jahres-Stands unter 1 s.
Hebel in dieser Reihenfolge: (1) Verläufe je Haus verdichten (letzte 13 Wochen wöchentlich, davor Monats- bzw. Quartalswerte; Vorjahr bleibt vollständig für Q07), (2) Kennzahlen als typisierte Zahlenreihen statt Objektlisten, (3) inkrementell speichern (nur geänderte Teile), (4) Kompression vor dem Schreiben. Engine-Ergebnisse bitgleich (Vergleichslauf 260 Wochen Seed 1).
