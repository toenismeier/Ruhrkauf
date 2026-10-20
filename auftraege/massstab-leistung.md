# Workstream Leistung: iPhone mit rund 560 Häusern und 180 Städten

Branch `feat/massstab-leistung`. Ein bis zwei Chats. Übergabedatei `auftraege/massstab-stand.md` (Abschnitt Leistung).

**Start nach Phase 2 von `massstab-staedte.md`** (dann gibt es dichte Städte mit mehreren eigenen Häusern).

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
