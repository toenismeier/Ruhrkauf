# Nachbesserung: Ladenbau Phase 4 (PR #13)

Branch `feat/ladenbau-p4` (weiterarbeiten). Grundlage bleibt `auftraege/workstream-ladenbau.md`, Phase 4.

## Befund (20.10. früh, lokal geprüft)
- Technik grün: Typecheck, 100/100 Tests, `spiel-render.js` 0 Abweichungen, `pruef-ladenbau` 0 Verstöße in 101 Plänen.
- **Optik nicht abgenommen, Rückschritt gegenüber Phase 3.** Katalog `sport-etagen-vergleich` angesehen:
  - Aus dem Sporthaus ist ein Supermarkt geworden. Die ganze Etage besteht aus parallelen dunklen Gondelreihen in einer Farbe.
  - Abteilungen sind nicht mehr erkennbar: keine Bodenfarben je Abteilung, keine Abteilungsschilder, keine Kleiderständer, keine Rundständer, keine Puppen, keine Schuhwand, keine Fahrradzone, keine Inszenierung (Laufband, Kletterwand, Rundbühne).
  - Teile je Etage gestiegen (S002 EG 10.916 statt 7.564). Laut Workstream dürfen sie nicht höher sein als vorher.
  - Der Planer hält die Regeln ein (Dichte, Gänge), füllt aber nur mit einem Möbeltyp. Die Regeln sind erfüllt, der Sinn nicht.

## 1. Abteilungen zuerst, dann Möbel
1. Jede Etage wird zuerst in Abteilungsrechtecke geteilt (Sportschuhe, Sportbekleidung, Outdoor, Fahrrad, Fitness, Ballsport, Wintersport nach `haus.flaechen`). Jede Abteilung bekommt ihren Bodenbelag und ihr Hängeschild aus `sportabteilung.js`, wie in Phase 3 (siehe `bilder/` bzw. Katalog `sport-etagen` auf `main`).
2. Je Abteilung gilt ein **Möbelmix** aus dem Formatprofil statt einer einzigen Gondel. Mindestens vier Möbeltypen je Abteilung, kein Typ über 40 % der Möbel einer Abteilung:
   - Sportschuhe: Schuhwand an der Wand, Sitzbänke, Tischinseln, Anprobe-Spiegel.
   - Bekleidung: Rundständer, Kleiderstangen, Puppengruppen, Tische, Wandregale.
   - Outdoor: Zelt-Inszenierung, Rucksackwand, Ständer, Tische.
   - Fahrrad: Fahrradreihen, Werkstatttheke, Wandhaken.
   - Fitness: Geräte-Ausstellung, Hantelregal, Matten.
   - Gondeln nur für Ballsport, Zubehör und Abverkauf.
3. Die Familien-Eigenheiten aus Phase 4, Schritt 1 (Kletterwand, Mall-Front, Portalfenster, Rundbühne) und genau eine Inszenierung je Abteilung (Laufanalyse, Fitness-Bühne) bleiben sichtbar erhalten.

## 2. Teilebudget
- Teile je Etage höchstens wie vorher (Spalte „Vorher“ im Vergleichskatalog). Wenn der Möbelmix mehr kostet: Gondeln vereinfachen (weniger Fachböden, Waren als ein Block je Fach), nicht die Abteilungsausstattung streichen.

## 3. Abnahme
- `sport-etagen-vergleich` für alle 8 Häuser rendern, jedes Bild ansehen, nach `bilder/` legen.
- Sichtfrage: Erkennt man auf dem Nachher-Bild ohne Beschriftung, welche Abteilung wo ist, und sieht es nach Sporthaus aus statt nach Supermarkt? Ist es ruhiger als Vorher?
- `pruef-ladenbau` 0 Verstöße, Dichte 35 bis 50 %, Typecheck, Tests, Build, `spiel-render.js` 0 Abweichungen. Ohne CI arbeiten wie in `auftraege/README.md`.

## 4. Zweite Prüfung und Merge (20.10. vormittags)
- Gemergt in `main`. Die Abteilungen haben jetzt Bodenfarben, an den Wänden stehen Regale, die Teile sind gegenüber vorher halbiert (S002 EG 4.127 statt 7.564), 0 Verstöße in 101 Plänen.
- **Restpunkte, in Phase 5 mit erledigen** (gleicher Planer):
  - Hängeschilder je Abteilung (wie vorher aus `sportabteilung.js`: „Sportschuhe“, „Sportbekleidung“, „Outdoor“ …) über der Abteilungsmitte.
  - Bekleidung braucht sichtbar Rundständer und Puppengruppen. Heute überwiegen Gondeln und Tische.
  - Je Abteilung genau eine Inszenierung (Laufanalyse mit Laufband, Fitness-Bühne, Zelt im Outdoor) aus Phase 4, Schritt 3.
