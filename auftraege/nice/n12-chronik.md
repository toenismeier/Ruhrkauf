# N12: Konzernchronik und Archiv im HQ

## Ziel
Hartwig ist ein Traditionshaus. Eine Chronik gibt der Kette Geschichte und dem Spieler Kontext, und das Archiv sammelt, was im Spiel passiert ist.

## Umfang
1. **Gründungsgeschichte** (fiktiv, `engine/src/chronik.ts`, nur Daten): rund 15 Stationen von der Gründung (Tuchhandlung Hartwig in Essen, 1880er) über Expansion, Kriegszerstörung und Wiederaufbau, Wirtschaftswunder, Kaufhauskrise und Fusion mit Volkskauf bis zur Insolvenzreife 2027. Je Station: Jahr, Titel, 2 bis 3 Sätze, Motiv. Keine echten Firmen oder Personen, keine Anlehnung an echte Unternehmensgeschichten über allgemeine Branchenentwicklungen hinaus.
2. **Spielchronik:** Ab Spielstart schreibt die Engine Meilensteine in `s.chronik`:
   - Insolvenzantrag, Plan angenommen, Haus geschlossen oder verkauft, neuer Vorstand, Erfolg (N03), bestes Quartal.
   - Je Eintrag Woche, Text, Bezug.
3. **Oberfläche:**
   - Im HQ eine Etage „Archiv“ (neues Etagenmotiv in `hq.js`: Regale, Vitrinen mit alten Tüten und Schildern) als freiwillige Abteilung ohne Wirkung, kostet etwas Miete.
   - Antippen öffnet die Zeitleiste: oben die Gründungsgeschichte mit Bildern aus dem Kit (alte Fassaden-Familien aus `warenhaus.js` passend zum Jahrzehnt), darunter die Spielchronik.
4. Ohne Archiv-Etage ist die Chronik über das Menü erreichbar.

## Abnahme
- Bilder der Zeitleiste und der Archiv-Etage.
- Tests: Chronik deterministisch, keine Wirkung auf die Simulation außer der Miete der Etage.
