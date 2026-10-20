# Nachbesserung: Engine-Maßstab Phase 1 (PR #7)

Branch `feat/engine-massstab` (weiterarbeiten). Grundlage bleibt `auftraege/engine-massstab.md`, Stand in `auftraege/massstab-stand.md`.

## Befund (19.10., lokal geprüft, weil die CI wegen des Actions-Kontingents nicht läuft)
- Typecheck: drei Fehler in `welt.ts` (Belegungs-Map als `readonly` typisiert). **Behoben** in Commit `23d1278` auf diesem Branch.
- Tests: 80 grün, 9 rot.
  - `massstab.test.ts` › „S001–S044 behalten ihre IDs; nur zwei Überhang-Standorte ziehen um“: Es ziehen 3 statt 2 um.
  - `hq.test.ts` (5), `einkauf.test.ts` (1), `marketing.test.ts` (1), `vorstand.test.ts` (1): Kalibrierwerte der alten 130er-Welt. Das ist in Phase 1 erwartbar.
- Export der Hausdateien fehlt noch.
- **Fachlicher Fehler:** 53 Städte sind als `metropole` eingestuft, damit die 560 Häuser unter die Obergrenzen passen. Das ist falsch. Deutschland hat 4 Millionenstädte; im Spiel gibt es 7 Metropolen.

## 1. Stadtklassen nach echter Größe
- `metropole` genau 7: Berlin, Hamburg, München, Köln, Frankfurt, Düsseldorf, Stuttgart.
- `grossstadt`: alle übrigen Städte ab 100.000 Einwohnern (in Deutschland rund 75).
- `mittelstadt`: alle übrigen.
- Gesamtzahl der Städte bleibt bei höchstens 220.

## 2. Neue Obergrenzen (ersetzen die Tabelle in `engine-massstab.md`)
| Cluster | alle Häuser zusammen | Hartwig | Volkskauf | Sport | FUNDUS | Premium |
|---|---:|---:|---:|---:|---:|---:|
| Metropole | höchstens 9 | höchstens 5 | höchstens 2 | höchstens 2 | höchstens 2 | höchstens 1 |
| Großstadt | höchstens 6 | höchstens 3 | höchstens 1 | höchstens 1 | höchstens 1 | 0 |
| Mittelstadt | höchstens 2 | höchstens 1 | höchstens 1 | höchstens 1 | 0 | 0 |

- Hartwig und Volkskauf zusammen in einer Mittelstadt höchstens 15 Fälle.
- Mit 7 Metropolen, rund 75 Großstädten und rund 140 Mittelstädten passen die Mengen hinein. Die Hartwig-Kapazität liegt dann bei 35 + 225 + 140 = 400 für 360 benötigte Häuser.
- Größe folgt der Stadt:
  - A-Häuser nur in Metropolen und den 20 größten Großstädten,
  - B-Häuser in Großstädten,
  - C-Häuser überwiegend in Mittelstädten und als Zweit- oder Dritthaus in Großstädten.
- Mehrere Hartwig-Häuser einer Stadt: ein 1a-Haus, die übrigen in b-Lage oder Stadtteilzentrum (`lage`).

## 3. Test zu Sport-IDs
Entweder die Verteilung so ändern, dass wirklich nur die zwei Überhang-Häuser aus Berlin und München umziehen, oder den Test begründet auf die tatsächliche Zahl anpassen, wenn ein dritter Umzug aus der neuen Obergrenze zwingend folgt. Begründung in `massstab-stand.md`.

## 4. Export
```
cd engine && npx tsx scripts/haeuser-export.ts
```
- Zweimal laufen lassen, der zweite Lauf ohne Git-Diff.
- Die drei JSON-Dateien committen.
- Danach `cd render && npm run build && node pruef-staedte.js` lokal für eine Stichprobe von 20 Städten, auch neue.

## 5. Kalibrierungstests
- Die alten Kalibrierwerte in `hq.test.ts`, `einkauf.test.ts`, `marketing.test.ts` und `vorstand.test.ts` **nicht** auf die neue Welt umschreiben, nur um sie grün zu bekommen.
- Stattdessen mit `test.skip` und dem Kommentar `// Maßstab Phase 2: neu kalibrieren` markieren und in `massstab-stand.md` auflisten. Phase 2 nimmt sie wieder rein.

## 6. Ohne CI arbeiten
Die GitHub-Actions-Läufe starten derzeit nicht (Kontingent). Bis das geklärt ist, alle Prüfungen lokal ausführen und die Ausgaben (Tests, Export-Diff, `pruef-staedte`) in `massstab-stand.md` festhalten. Ein lokaler grüner Lauf mit Protokoll gilt als Abnahme für Phase 1.

## 7. Zweite Prüfung (19.10. abends)
- Nach dem Merge der Wettbewerber-Engine waren 23 Tests rot und `spiel-render.js` brach ab („Cannot read properties of undefined (reading 'name')“ in `wettbewerb.ts neuEroeffnet`). Ursache: Volkskauf- und FUNDUS-Häuser mit `nurDaten` liefen durch die Wettbewerbslogik. **Behoben** in Commit `f51ae63` auf diesem Branch: Hilfsfunktion `aktive(s)` in `wettbewerb.ts`.
- Danach sind noch 6 Tests rot. Alle hängen an der Kalibrierung der alten Welt:
  - `abnahme.test.ts`: Ausgangslage 0,2 %, Bot C fünf Jahre,
  - `hq.test.ts`: Aktion „controlling“,
  - `kalibrierung.test.ts`: Bot C Gläubigerversammlung,
  - `engine.test.ts`: tiefe Sanierung fünf Jahre,
  - `wettbewerber.test.ts`: Startkalibrierung exakt.
- Vorgehen wie in Abschnitt 5: diese Tests mit `test.skip` und dem Kommentar `// Maßstab Phase 2: neu kalibrieren` markieren, in `massstab-stand.md` auflisten, **nicht** umschreiben.
- Ausnahme: Ist ein Test wegen eines echten Fehlers rot (NaN, Absturz, Determinismus), wird er nicht übersprungen, sondern der Fehler wird behoben.
- Danach die Punkte 1 bis 4 dieses Auftrags (7 Metropolen, Obergrenzen, Sport-IDs, Export). Sie sind weiterhin offen.
- `spiel-render.js` muss mit dem Branch 0 Abweichungen liefern, bevor Phase 1 als abgenommen gilt.

## 8. Dritte Prüfung (20.10. früh)
- **Phase-1-Daten abgenommen:** 220 Städte (7 Metropolen, 73 Großstädte, 140 Mittelstädte), 360 Hartwig + 4 Premium + 86 Volkskauf + 44 Sport + 66 FUNDUS, höchstens 9 Häuser je Metropole. Typecheck grün, 95 Tests grün, 14 sauber als Phase 2 übersprungen.
- **Offen:**
  - `render/haeuser-outlet.json` fehlt im Branch. Den Export für FUNDUS nachziehen (Abschnitt 4).
  - `spiel-render.js` bricht ab mit „Wochenstreifen enthält nicht die aktuelle Kalenderwoche“. Das Spiel ist mit Bot C in Woche 23 zerschlagen, und die Woche läuft nicht weiter. Mit der neuen Welt überlebt der Bot die Insolvenz nicht.
- **Folge:** Phase 1 wird **nicht allein** in `main` gemergt, weil das Spiel dort sonst nach 23 Wochen endet. **Phase 2 (Kalibrierung) direkt auf diesem Branch anschließen.** Gemergt wird nach Phase 2, wenn Bot C auf Seeds 1 bis 3 fünf Jahre überlebt und `spiel-render.js` 0 Abweichungen liefert.
- Die Grafik-Aufträge `massstab-staedte.md` und `massstab-oberflaeche.md` dürfen schon jetzt von `feat/engine-massstab` abzweigen statt von `main`.
