# N08: Der Handelsbote als Archiv

## Ziel
Der Wochenabschluss (`spiel-reise-und-wochenabschluss.md`) zeigt eine Zeitungskarte. Dieser Auftrag macht daraus eine richtige Zeitung mit Archiv, wie „The Cafe Street Journal“ in Coffee Inc 2.

## Umfang
1. **Engine** `engine/src/zeitung.ts`:
   - Erzeugt je Woche eine Ausgabe `{ woche, aufmacher, meldungen[], reiter }` aus den Meldungen (Presse, Konkurrenz, Insolvenz, Makro).
   - Aus festen Textbausteinen: Schlagzeile, Unterzeile und 2 bis 3 Sätze je Artikelart. Rund 40 Artikelarten:
     - Wettbewerber eröffnet oder schließt,
     - Hartwig schließt ein Haus,
     - Gläubigerversammlung,
     - Betriebsrat,
     - Quartalszahlen,
     - Branche (Textilumsatz, Innenstadtfrequenz),
     - Leute (Vorstandswechsel).
   - Zufall nur über den RNG der Engine, ohne Wirkung auf die Simulation (eigener abgeleiteter RNG, damit `main`-Läufe gleich bleiben).
   - Archiv der letzten 104 Ausgaben im Spielstand.
2. **Oberfläche** `render/src/ui/zeitung.js`:
   - Zeitungslayout mit Kopf „Der Handelsbote“ (Serifenschrift aus dem System, Linien, Datum, Ausgabe-Nummer) und Reitern Top / Handel / Konzern / Markt / Politik.
   - Aufmacher mit Bild aus dem Kit (Iso-Ausschnitt des Hauses oder Wettbewerbers) und Spaltensatz.
   - Archiv durchblättern mit Wischgeste.
3. **Interviews als Entscheidung:** Alle 8 bis 12 Wochen fragt die Zeitung ein Interview an (neuer Entscheidungstyp `interview`):
   - drei Antworten (offensiv / sachlich / ausweichend) mit Wirkung auf Image, Betriebsrat und Gläubigerstimmung (klein, ±1 bis 3 Punkte),
   - die Antwort erscheint in der nächsten Ausgabe als Zitat.
   - Das ist die einzige Spielwirkung dieses Auftrags. Kalibrierung prüfen, Bot C antwortet sachlich.

## Abnahme
- Bilder von drei Ausgaben (normale Woche, Gläubigerversammlung, Weihnachtsquartal) und vom Archiv.
- Tests: gleiche Ausgabe bei gleichem Seed, Simulationsergebnis mit und ohne Zeitung gleich (außer Interviews).
