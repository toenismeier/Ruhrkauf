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
