# N01: Verläufe und Diagramme

## Ziel
Coffee Inc 2 zeigt jede Kennzahl auch als Verlauf. Hartwig hat heute nur Momentwerte und die Konzernhistorie (`s.historie`, 520 Wochen) ohne Darstellung.

## Engine
1. **Hausverlauf:** `Haus.verlauf?: { woche, umsatz, db, frequenz, personalFte }[]`, je Woche angehängt in `engine.ts` nach `simuliereHaus`, höchstens 156 Wochen je Haus. Speicherbedarf bei 560 Häusern messen und in der PR nennen. Bei über 2 MB Spielstand: nur alle 4 Wochen ein Punkt nach Woche 52.
2. **Abfrage** `verlauf(s, { ebene: 'konzern'|'format'|'region'|'stadt'|'haus', id?, kennzahl, wochen })` in `abfragen.ts`. Sie liefert Punkte plus Vorjahreslinie und Plan, wo vorhanden (Quartalsplan des Eigentümers).
3. Keine Änderung an Ergebnissen. Test: zwei Läufe mit Seed 1, einer mit und einer ohne Verlauf, gleiche Endwerte.

## Oberfläche
1. Modul `render/src/ui/statistik.js`, Menükachel „Zahlen“.
2. **Diagramme als SVG ohne Bibliothek:**
   - Linie für Verläufe, Balken für Wochen und Quartale, Wasserfall für die EBITDA-Brücke (Umsatz → Rohertrag → Personal → Miete → … → EBITDA).
   - Antippen zeigt den Wert, Ziehen zeigt einen Fadenkreuzwert.
   - Zeiträume 13 / 52 / alle Wochen.
3. **Seiten:**
   - Konzern: Umsatz, EBITDA, Cash mit Insolvenzlinie, Stakeholder-Stimmung.
   - Formate: Hartwig, Volkskauf, Sport, FUNDUS übereinander.
   - Regionen.
   - Rangliste der Häuser nach EBITDA-Marge mit kleinem Verlauf je Zeile.
4. **Im Hausdetail** ein Diagramm „Letzte 52 Wochen“ unter den Kennzahlen.
5. Farben aus `GESTALTUNG.md`, Formatfarben wie auf der Karte. Achsen in Mio. € über `ui/format.js`.

## Abnahme
- Bilder aller Seiten nach 104 Wochen Bot C (Seed 1).
- Prüfung in `spiel-render.js`: Endpunkt jeder Linie gleich dem Cockpitwert, 0 Abweichungen.
- 60 Bilder je Sekunde beim Ziehen (iPhone, `spiel.performanceMessen`).
