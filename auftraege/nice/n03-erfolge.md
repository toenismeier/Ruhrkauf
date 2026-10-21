# N03: Erfolge und Abzeichen

## Ziel
Kleine Ziele neben dem großen Ziel, wie in Coffee Inc 2.

## Engine
1. `engine/src/erfolge.ts` mit rund 30 Erfolgen in fünf Gruppen:
   - Sanierung: Insolvenzplan angenommen, erstes positives Quartal, 52 Wochen ohne Schließung.
   - Handel: Lagerumschlag über 4, Altware unter 10 %, Eigenmarkenanteil 25 %.
   - Menschen: Vorstand komplett, Betriebsrat über 70, kein Streik in einem Jahr.
   - Formate: FUNDUS profitabel, Volkskauf saniert, Premium-Haus verkauft.
   - Kurios: Weihnachtsquartal über Plan um 20 %, ein Haus mit Bibliothek als Untermieter, alle 16 Bereiche einmal gezielt beworben.
   - Je Erfolg Bedingung als Funktion auf `GameState`, geprüft einmal je Woche. Freigeschaltet mit Woche in `s.erfolge`.
2. Keine Spielwirkung. Test: Bot C auf Seed 1 schaltet mindestens 8 frei. Prüfung ist deterministisch.

## Oberfläche
1. **Abzeichen** als kleine Kit-Grafik (`render/src/kit/abzeichen.js`): rundes Emblem, Motiv je Gruppe, Bronze, Silber oder Gold je Schwierigkeit. Als PNG-Daten-URL im Cache.
2. **Meldung beim Freischalten:** Toast oben, 2,5 s, Abzeichen dreht einmal um die Hochachse (CSS 3D, 600 ms). Im Wochenbericht eine Zeile „Neu: …“.
3. **Seite „Erfolge“** im Menü: Raster mit Fortschritt, gesperrte Erfolge grau mit Hinweis, geheime als „?“ (höchstens 5).

## Abnahme
Bilder der Seite, des Toasts und eines Wochenberichts mit Erfolg. Tests grün.
