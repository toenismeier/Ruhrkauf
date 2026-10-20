# N14: Testwerkzeuge für Ummo

## Ziel
Ummo testet das Spiel auf dem iPhone. Er braucht ein verstecktes Werkzeugpanel, um schnell an interessante Stellen zu kommen und Fehler mitzuschicken.

## Umfang
1. **Öffnen:** fünfmal schnell auf das Datum in der Kopfleiste tippen, oder `?werkzeuge=1` in der Adresse. Modul `render/src/ui/werkzeuge.js`.
2. **Funktionen** (alle über neue `SpielerAktion`-Typen mit Präfix `test`, damit die Engine deterministisch bleibt; im Spielstand wird `s.testGenutzt = true` gesetzt und im Spielende als „Testspiel“ gezeigt):
   - Woche springen: 1, 4, 13, 52 Wochen mit Bot C oder ohne Eingriff, mit Fortschrittsbalken.
   - Cash setzen, Insolvenz eröffnen, Stakeholder-Werte setzen.
   - Ereignis auslösen: Liste aller Angebotstypen und Ereignisse aus `ereignisse.ts` und `wettbewerb.ts`, je einer Schaltfläche.
   - Schwierigkeit umstellen.
3. **Messen:**
   - Bildrate live (Mittel und schlechteste der letzten 2 s), Teile in der Szene, Engine-ms der letzten Woche.
   - Speicher (`performance.memory`, falls vorhanden).
4. **Fehlerbericht:** Knopf „Bericht kopieren“. Er kopiert Seed, Woche, Version, Gerät (`navigator.userAgent`), die letzten 20 Konsolenfehler und den Spielstand als komprimierten Text (`CompressionStream` gzip + Base64). Gegenstück: „Bericht laden“ fügt so einen Text ein und stellt den Stand her. Damit kann Ummo Claude oder GPT einen Fehlerfall schicken.
5. **Konsolenfehler mitschreiben:** `window.onerror` und `unhandledrejection` in einen Ringspeicher (50 Einträge). Bei einem Fehler im Spiel erscheint ein kleiner roter Punkt am Datum.

## Abnahme
- Test in `spiel-render.js`: Werkzeuge öffnen, 13 Wochen springen, Bericht kopieren, in ein neues Spiel laden, gleiche Woche und gleicher Cash.
- Ohne Freischaltung ist nichts davon sichtbar.
