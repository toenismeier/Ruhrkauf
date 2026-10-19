# Nachbesserung Grafik: Schwesterkette (Volkskauf)

Branch: `feat/grafik-schwesterkette` (weiterarbeiten, kein neuer Branch). Grundlage bleibt `auftraege/grafik-schwesterkette.md`.
Technik und Prüfungen sind abgenommen (Plätze in 112 Städten, 80-%-Regel, Blocksperre, CI grün). Offen ist die Optik: Die 24 Häuser lesen sich als Bürogebäude, nicht als Warenhäuser.

## 0. Name
Die Kette heißt ab jetzt **Volkskauf** (entschieden). `NAME_SCHWESTER = 'Volkskauf'`, Schriftzug `VOLKSKAUF`. Alle Texte, Zustandsbeschriftungen („Volkskauf schließt“, „Danke für … Jahre Volkskauf“, Modernisierungsplane) und Katalogtitel umstellen. Kein „Wendt“ mehr im Code (`grep -rn Wendt render` muss leer sein).

## 1. Als Warenhaus lesbar machen (Hauptpunkt)
- EG als echte Ladenzone: helle, beleuchtete Schaufenster mit sichtbarer Ware und Puppen (Helfer aus `zustaende.js ladenInhalt` bzw. `innen.js` nutzen), nicht das durchgehende dunkle Band. Schaufensterhöhe wie bei Hartwig F3/F4, Sockel und Kämpfer sichtbar.
- Markisen auf beiden sichtbaren Seiten (+x und +z), über jedem Schaufenster bzw. jeder zweiten Achse, nicht nur jeder dritten Achse auf +z. Farbe ausgeblichenes Petrol, bei Substanz unter 46 einzelne Markisen eingerollt oder fehlend.
- Eingang als erkennbare Eingangsachse: zwei schmale Türen mit Vordach oder Rücksprung, davor Fußmatte, Aufsteller.
- Über dem EG ein durchgehendes Gesims bzw. Kragdach, damit Laden und Obergeschosse klar getrennt sind.
- Mindestens ein warenhaustypisches Element je Familie: Familie 1 Werbepylon oder Uhr an der Ecke, Familie 2 geschlossenes Wandfeld mit großem Schriftzug, Familie 3 auskragendes Treppenhaus oder Eckerker.
- Vergleichsmaßstab: `bilder/katalog-warenhaus.png` F3 Nachkrieg und F4 Kachelfassade. Volkskauf ist schlichter und müder, aber in derselben Detailtiefe.

## 2. Schriftzug lesbar
- `VOLKSKAUF` als Kastenbuchstaben auf dem Petrolband, Buchstabenhöhe 1,2 bis 1,6 m (heute 0,57 bis 0,68 m). Im Katalog (Kachel 350 px) muss der Name lesbar sein, im Spielzoom auf dem iPhone ebenfalls.
- Auf beiden sichtbaren Seiten. Zusätzlich ein Dachschriftzug oder Wandschild bei Familie 2.
- Matter als Hartwig (kein Leuchten, Farbe `#e4e5db` darf bleiben), aber gleich gut lesbar.
- Bei Substanz unter 30 darf, wie bei Hartwig, höchstens ein Buchstabe fehlen.

## 3. Keine kopierten Häuser
- Dachtechnik heute bei allen 24 Häusern an derselben Stelle. Lage, Anzahl und Größe der Aufbauten über `rng(seed)` frei streuen (2 bis 5 Aufbauten, dazu Aufzugsüberfahrt, Treppenhauskopf, Lüftungsrohre, bei einigen Häusern Werbeträger auf dem Dach).
- Innerhalb einer Familie müssen sich die vier Varianten in mehr als der Farbe unterscheiden: Achsbreite, Geschosszahl (3 oder 4 OG), Eckausbildung (abgerundet, gefast, scharf), Lage der Treppenhausachse, Sockelmaterial. Zielbild: K001, K007, K013, K019 nebeneinander sind klar vier verschiedene Häuser.
- Neue Prüfung in `pruef-schwester-inhalt.js`: kein Paar der 24 Häuser mit gleicher Kombination aus Familie, Geschosszahl, Achsbreite und Dachlayout.

## 4. Etagen
- Keine Abteilung doppelt auf einer Etage (heute im EG „Schuhe“ und „Beauty & Parfümerie“ je zweimal, im 1. OG „Wäsche & Dessous“ und „Damenmode“ je zweimal). Jede Fläche einer Etage bekommt eine eigene Warengruppe aus `haeuser-schwester.json`; reichen die Gruppen nicht, wird die Fläche größer statt doppelt.
- In `pruef-schwester-inhalt.js` prüfen: keine Abteilungsbezeichnung doppelt je Etage.
- UG bleibt Lager und Anlieferung.

## 5. Patina
- Patina-Zustand mit Bäumen auf dem Dach und Ranken über die ganze Fassade ist zu stark für eine Kette im laufenden Betrieb. Für Volkskauf: Ranken höchstens an einer Gebäudeecke, Dachbewuchs nur Moosflächen, keine Bäume. Der volle Verfall bleibt dem Zustand „geschlossen“ bzw. „leer“ vorbehalten.

## Abnahme
1. Kataloge `schwesterhaeuser`, `schwester-stichprobe`, `schwester-etagen` neu rendern. Zusätzlich ein Vergleichskatalog `schwester-vergleich.js`: je Familie ein Volkskauf-Haus neben einem Hartwig F3 und F4 in derselben Kachelgröße.
2. Jedes Bild ansehen, mindestens drei Runden Nachbessern.
3. Prüfungen: `node pruef-staedte.js` 0 Fehler, `node pruef-alle-gestaltung.js` 0 Verstöße, `pruef-schwester` 0 Fehler, höchstens 8.000 Teile je Haus.
4. Erfolgskriterium: Wer den Vergleichskatalog sieht, erkennt Volkskauf sofort als Warenhaus, liest den Namen und hält es für älter und kleiner als Hartwig. Kein Haus wirkt wie ein Bürobau.
5. Bilder nach `bilder/` (überschreiben).
