# Nachbesserung: Ladenbau Phase 3 (PR #9, stapelt auf #6 und #8)

Branch `feat/ladenbau-p3` (weiterarbeiten). Grundlage bleibt `auftraege/workstream-ladenbau.md`.

## Befund (19.10., lokal geprüft)
- Typecheck, 82 Tests und `spiel-render.js` (0 Abweichungen) sind grün. Damit sind #6 und #8 technisch mitgeprüft.
- **Grenzwerte nicht erfüllt** (eigene Angabe im PR):
  - Möbeldichte 16 bis 25 %, Soll 35 bis 50 %.
  - Größte Leerfläche 8,75 bis 11,25 m, Soll höchstens 6 m.
- `auftraege/ladenbau-stand.md` auf `main` steht noch auf „Phase 1 nicht begonnen“. Den Stand auf dem Branch fortschreiben, mit den lokalen Messwerten.
- Nach Ummos Eindruck wirkt der Sport-Innenraum „zerklüftet“. Das passt zur Messung: zu wenige Möbel, große Löcher.
- `main` enthält inzwischen Sport, Volkskauf und Wettbewerber im Spiel. #6, #8 und #9 nacheinander auf `main` rebasen.

## 1. Planer füllt die Fläche
Der Planer stellt heute Möbel, bis die Pflichtliste erfüllt ist, und hört dann auf. Neu ist ein zweiter Durchgang „Auffüllen“:
1. Rastersuche (0,625 m) nach freien Rechtecken größer als 3 × 3 m, die nicht zu Gängen, Kassenzone oder Eingangszone gehören.
2. Jede Lücke wird nach Formatprofil gefüllt:
   - Sport: Gondel, Rundständer, Schuhwand, Tischinsel.
   - Warenhaus: Gondel, Tisch, Ständer.
   - FUNDUS: Rundständer und Kleiderstangen in Reihen.
   - Die Ausrichtung folgt dem Hauptgang, das Abstandsraster folgt `LADENBAU.md`.
3. Abbrechen, wenn die Dichte 45 % erreicht oder keine Lücke über 3 × 3 m mehr frei ist.
4. Gänge bleiben frei: Hauptgang mindestens 2,5 m, Nebengang mindestens 1,5 m. Die Prüfung schlägt fehl, wenn das Auffüllen einen Gang schließt.

## 2. Weniger „zerklüftet“
- Möbel einer Abteilung in Reihen bzw. Blöcken ausrichten, nicht einzeln gedreht. Dafür eine Blockbildung je Abteilung: gleiche Richtung, gleiche Abstände, gemeinsame Fluchtlinie.
- Wände der Abteilung zuerst mit Wandregalen belegen, erst danach die Mitte füllen.
- Keine Einzelmöbel diagonal, außer Deko-Inseln an Gangkreuzungen (höchstens eine je Kreuzung).

## 3. Prüfung
- `node pruef-ladenbau.js` über alle Sporthäuser: Dichte 35 bis 50 %, größte Leerfläche höchstens 6 m, 0 Gangverstöße. Ergebnis je Haus als Tabelle in `ladenbau-stand.md`.
- Diagnose-Katalog (Draufsicht) und den Sport-Innenkatalog für 6 Häuser rendern, vorher und nachher nebeneinander nach `bilder/`.
- Lokal: Typecheck, Tests, Build, `spiel-render.js` 0 Abweichungen. Ohne CI arbeiten wie in `auftraege/README.md`.

## 4. Merge-Reihenfolge
Erst wenn #9 die Grenzwerte erfüllt, werden #6, #8 und #9 in dieser Reihenfolge gemergt. Vorher keinen der drei mergen.
