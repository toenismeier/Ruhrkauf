# Nachbesserung: Wettbewerber-Engine (PR #5)

Branch `feat/engine-wettbewerber` (weiterarbeiten). Grundlage bleibt `auftraege/engine-wettbewerber.md`.

## Befund (CI vom 19.10., 07:05)
- `tests/wettbewerb.test.ts` scheitert: Bot C geht auf Seed 3 in Woche 23 in die Zerschlagung (Insolvenzplan von der Bank abgelehnt, „Integrierte Planung: EBITDA der nächsten 52 Wochen −28,3 Mio. €“).
- `tests/einkauf.test.ts` scheitert: „Bot C mit Standard-Einkauf läuft durch die Gläubigerversammlung“ endet mit `zerschlagen`.
- Die letzten Commits sind nur noch Diagnosetests. Die Ursache ist aber klar: Das Wettbewerbsmodell verschlechtert die Ausgangslage. Die Kommits „lokale Verdrängung nach Verkaufsfläche gewichten“ und „lokale Wettbewerbswirkung auf Baseline-EBITDA kalibrieren“ verschieben die Nachfrage schon in Woche 0.

## Regel, die gilt
**Woche 0 und alle Wochen ohne Wettbewerbsereignis müssen exakt das alte Spiel ergeben.** Der Korrekturfaktor in `simuliereHaus` ist in Woche 0 für jedes Haus und jede Gruppe genau 1,0. Er weicht nur ab, wenn sich der Wettbewerberbestand einer Stadt gegenüber dem Start ändert (Eröffnung, Schließung, Aktion, Nachnutzung).

## Vorgehen
1. Den Korrekturfaktor relativ zum Startzustand derselben Stadt rechnen:
   - Formel: `faktor_g = (1 − 0.25 · w_g(jetzt)) / (1 − 0.25 · w_g(start))`
   - `w_g(start)` wird beim Spielstart je Haus und Gruppe gespeichert.
   - Keine Gewichtung nach Verkaufsfläche, keine zusätzliche „lokale Verdrängung“ im Grundzustand.
2. `attraktivitaet()` in `ereignisse.ts` ebenso relativ zum Start rechnen.
3. Offprice-Flächen: Faktor in Woche 0 ebenfalls 1,0.
4. Ereignisstärke so kalibrieren, dass über 260 Wochen ohne Spielereingriff der mittlere Wettbewerbsfaktor aller Häuser bei 0,97 bis 1,00 liegt. Wettbewerb soll spürbar sein, aber nicht die Ausgangslage kippen.
5. Kontrolltest ergänzen: Seed 1 bis 3, Woche 0 bis 12 mit abgeschaltetem Wettbewerbsmodul gegen eingeschaltetes Modul ohne Ereignisse. `historie` identisch.
6. Diagnosetests, die nur zur Fehlersuche dienten, entfernen oder in `scripts/` verschieben.

## Abnahme
- `cd engine && npm run typecheck && npm test` grün, inklusive `einkauf.test.ts` und `wettbewerb.test.ts`.
- `npx tsx scripts/kalibrierung.ts 1`: Umsatz und EBITDA der Ausgangslage innerhalb ±0,2 % gegen `main`.
- `npx tsx scripts/bot.ts <seed> 260 --tief` für Seeds 1, 2, 3: Bot C überlebt 5 Jahre. Tabelle in `engine/README.md` aktualisieren.
- CI auf PR #5 grün.
