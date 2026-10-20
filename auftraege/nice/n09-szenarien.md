# N09: Szenarien und Herausforderungen

## Ziel
Wiederspielwert. Die Engine kennt bereits `Szenario` (`welt.ts`). Daraus wird ein Auswahlbildschirm mit vorbereiteten Lagen.

## Szenarien (je ein Objekt in `engine/src/szenarien.ts`)
| Schlüssel | Name | Lage | Ziel |
|---|---|---|---|
| `standard` | Die Sanierung | heutige Ausgangslage | 5 Jahre überleben |
| `schutzschirm` | Schutzschirm | Start direkt im Schutzschirmverfahren, Frist 12 Wochen für den Plan | Plan annehmen lassen |
| `lockdown` | Geschlossene Innenstädte | ab Woche 8 für 10 Wochen Frequenz −70 %, Staatshilfe als Angebot | Liquidität halten |
| `fusion` | Die Fusion | Hartwig und Volkskauf gerade zusammengelegt, doppelte Standorte in 30 Städten | Doppelstandorte bereinigen ohne Streik |
| `investor` | Der neue Eigentümer | Investor mit Immobilienfokus, will jährlich Häuser verkaufen | Unternehmenswert verdoppeln |
| `aufbruch` | Aufbruch | gesunde Kette, viel Cash, starke Konkurrenz | Marktführer nach Umsatz in 3 Jahren |
| `sandkasten` | Sandkasten | unbegrenzt Cash, keine Insolvenz, keine Wertung | frei spielen |

- Jedes Szenario setzt nur Startwerte und Sonderregeln über Schalter im `Szenario` (keine Sonderzweige quer durch die Engine). Fehlt ein Schalter, wird er in `welt.ts` bzw. `engine.ts` eingeführt und ist im Standard aus.
- Ziele als Funktion, ausgewertet wie das Spielende (N02, falls gemergt).

## Oberfläche
- Startbildschirm: „Neues Spiel“ → Auswahl Szenario (Karte mit Bild aus dem Kit, Kurztext, Schwierigkeit, Bestwert) → Schwierigkeit → Stadt.
- Während des Spiels in der Kopfleiste ein kleines Zielsymbol mit Fortschritt.

## Abnahme
- Je Szenario ein Bot-Lauf (Bot C und ohne Eingriff, Seeds 1 bis 3) mit Ergebnis in einer Tabelle in der PR. Ein Szenario ist spielbar, wenn Bot C es auf mindestens einem Seed schafft und „ohne Eingriff“ auf keinem.
- `standard` liefert exakt die heutigen Werte (Test).
