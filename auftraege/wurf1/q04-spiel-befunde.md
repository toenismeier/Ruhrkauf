# Q04: Spiel-Befunde aus Wurf 1

Branch `feat/q04-spiel-befunde`. 1 Chat. Bilder in `testflight/wurf-1/`.

## Punkte
1. **FUNDUS anklickbar:** FUNDUS-Häuser lassen sich in der Stadt nicht antippen, Warenhäuser und Sport schon. FUNDUS (und Volkskauf, falls gleich betroffen) öffnen beim Antippen dasselbe Haus-Sheet wie Hartwig, mit den formattypischen Reitern.
2. **Entwicklungsschalter weg:** „Bot-Strategie C“ (`render/spiel.html` `#bot`) ist im Spiel sichtbar. Ummo hat ihn einmal an- und wieder ausgeschaltet; ein einziger Bot-Lauf in KW 3 stellt unumkehrbar den Insolvenzantrag, schließt 50 Häuser, baut Personal ab und kürzt Zentrale und Marketing, ohne dass das Spiel es meldet. Schalter nur noch mit `?dev=1` bzw. über N14 Werkzeuge einblenden; dort vor dem ersten Bot-Lauf bestätigen lassen und danach im Posteingang auflisten, was der Bot getan hat.
3. **Stadtname abgeschnitten:** Die Stadtkachel unten links zeigt „Chem…“, „Ha…“. Name vollständig (Schrift verkleinern oder Regionsetikett in zweite Zeile), getestet mit dem längsten Stadtnamen.
4. **Regionsetikett falsch:** Chemnitz steht unter „Lausitz“, Hannover unter „Unterweser“. Zuordnung Stadt → Region (`engine/src/daten.ts`) nach echter Geografie, nicht nach Reihenfolge oder Zufall; Liste aller Städte mit Region in die PR.
5. **Premium & Flagships** (`08-organisation.png`): Kopf sagt „4 Häuser“, die Liste zeigt 3 Premium als „fest“ (Palais Hartwig, Hartwig am Hofgarten, Alsterhaus Hartwig). Alle vier Premium-Häuser (Berlin, München, Hamburg, Düsseldorf) müssen erscheinen. „Hartwig Berlin Marktplatz“ steht doppelt: Dubletten entfernen bzw. gleichnamige Häuser unterscheidbar benennen.
6. **Cluster-Umsatz 0 €:** Vor der ersten abgeschlossenen Woche „noch offen“ statt „0 €“, wie in der Kopfzeile.
7. **Reiseauswahl:** Zeilenumbruch in den Formatzeilen („FUNDUS“ / „1“) vermeiden (nicht umbrechende Einheiten), Deutschlandkarte größer (mindestens halbe Breite). Vorschaubilder „?“ sind Teil von `nachbesserung-reise-woche.md` und hier nicht zu bauen.

## Abnahme
- Bilder je Punkt vorher/nachher im 390 × 844-Profil.
- Engine-Tests grün, `spiel-render.js` 0 Abweichungen.
