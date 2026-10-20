# Nachbesserung: Reise und Wochenabschluss (nach Merge von #14)

Branch `feat/spiel-reise-woche-2` von `main`. #14 ist am 20.10. gemergt. Claude hat dabei lokal behoben:
- Der Kreis der Reise lag bei einem Bahnhofs-Pin außerhalb des Bildes ebenfalls außerhalb, das Panel war unsichtbar. Jetzt: Pin außerhalb → Start am Stadtchip, Radius bis zur entferntesten Ecke (`--rr`).
- Die Reisemotive waren Katalogblätter mit Überschriften und Beschriftungen. Jetzt drei saubere Iso-Ansichten aus dem Kit als JPEG: `render/bilder/reise-{ruhr,altstadt,hafen}.jpg`, erzeugt mit `render/reise-motive.sh` aus `src/kataloge/_reise-*.js`. GPT kann keine Bilder rendern. Neue Motive deshalb als Katalogmodul anlegen, Claude rendert sie.
- Die Zeitungsprüfung verglich alle Meldungen, gezeigt werden höchstens drei.

## Offene Punkte
1. **Bestätigungsdialog „Woche abschließen?“** ist halbtransparent und über der Stadt kaum lesbar. Wie im Vorbild: Hintergrund auf rund 60 % abdunkeln, die Karte selbst deckend (Panelfarbe), Porträt rechts. Bild: `bilder/reise-woche/` nach der Korrektur.
2. **Kapitalfluss:** Heute steht dreimal „nicht separat erfasst“ mit einem Erklärsatz. Neue Abfrage in `engine/src/abfragen.ts`, `kapitalfluss(s)`, für die letzte Woche:
   - operativ (EBITDA, Zinsen, Steuern, Veränderung Warenbestand und Lieferantenverbindlichkeiten, soweit die Engine sie führt),
   - Investitionen (Umbauten, Instandhaltung, Premium-Investitionen),
   - Finanzierung (Kreditziehung, Tilgung, Massekredit, Eigentümer).
   - Die Summe muss exakt der Cash-Veränderung entsprechen (Test über 104 Wochen, Seeds 1 bis 3). Was die Engine wirklich nicht führt, kommt in „Sonstiges“, damit die Summe stimmt.
3. **Porträts im Vorfall:** Das Sheet zeigt einen Buchstaben statt eines Porträts. Zuständige Person je Vorgangsart (Vorstand nach Ressort, Betriebsrat, Bank, Vermieter, Lieferant) mit `kit/portraet.js`, wie im Vorstandspanel.
4. **Reiseziele sortieren:** Heute alphabetisch. Laut Auftrag zuerst die zuletzt besuchten, dann nach Umsatz der Stadt (Summe aller eigenen Häuser).
5. **Vorschaubilder der Ziele:** Alle Städte zeigen eines von drei Motiven. Stattdessen den Kartenausschnitt der Stadt (kleines Bild aus dem Stadtplan, 96 × 96, beim ersten Öffnen erzeugt und im Speicher gehalten). Wenn das zu teuer ist: Motiv nach Region und Stadtgröße und eine Kennfarbe je Stadt.
6. **Stadtaufbau während der Fahrt:** `ctx.bauen(ziel)` läuft synchron und blockiert den Hauptthread 2 bis 3 s. CSS-Transforms laufen weiter, Text und Zähler aber nicht. Den Aufbau in Kacheln über mehrere Bilder verteilen (es gibt schon `kachelnPlanen`/`naechsteKachel`): zuerst Plan und Grundkacheln, Detailkacheln nach der Ankunft.
7. **Wochenstreifen** erscheint nach dem Abschluss noch kurz, wenn der Bericht geschlossen wird (Bild `00-bestaetigung` zeigt „KW 2: 0 neue Angebote …“). Im normalen Spiel ganz weglassen.

## Abnahme
- `node spiel-render.js --nur-reise-woche --mit-animation` grün.
- Bilder der Punkte 1, 2, 3, 5 in `bilder/reise-woche/`.
- Tests grün, Kapitalfluss-Test grün.
